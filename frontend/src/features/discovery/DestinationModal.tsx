import React, { useEffect, useState } from 'react';
import {
  DestinationRead,
  DestinationMedia,
  Language,
  RestaurantRead,
  AccommodationRead,
  NearbyAttractionItem,
  NearbyTransitItem,
  DestinationNearbyResponse,
  CulturalEvent,
} from '../../types';
import { useTranslation, TranslationKey } from '../../lib/i18n';
import {
  fetchRestaurantsNear,
  fetchAccommodationsNear,
  getDestinationNearby,
  getApiBaseUrl,
  fetchDestinationImages,
} from '../../lib/api';

interface DestinationModalProps {
  destination: DestinationRead;
  language: Language;
  onClose: () => void;
  onPlanAround: (dest: DestinationRead) => void;
}

export const DestinationModal: React.FC<DestinationModalProps> = ({
  destination,
  language,
  onClose,
  onPlanAround,
}) => {
  const { t } = useTranslation(language);
  const [activeModalTab, setActiveModalTab] = useState<'all' | 'overview' | 'visit_info' | 'nearby' | 'events' | 'sources'>('all');
  const [destinationEvents, setDestinationEvents] = useState<CulturalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false);
  const [restaurants, setRestaurants] = useState<RestaurantRead[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationRead[]>([]);
  const [nearbyAttractions, setNearbyAttractions] = useState<NearbyAttractionItem[]>([]);
  const [nearbyTransit, setNearbyTransit] = useState<NearbyTransitItem[]>([]);
  const [nearbyResponse, setNearbyResponse] = useState<DestinationNearbyResponse | null>(null);
  const [loadingPlaces, setLoadingPlaces] = useState<boolean>(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [modalImageError, setModalImageError] = useState<boolean>(false);
  const [modalDirectFallback, setModalDirectFallback] = useState<boolean>(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(true);
  const [isVisitorGuidanceExpanded, setIsVisitorGuidanceExpanded] = useState<boolean>(true);

  // Dynamic Image Gallery State
  const [dynamicMedia, setDynamicMedia] = useState<DestinationMedia[]>(() => {
    return destination.media && destination.media.length > 0 ? destination.media : [];
  });
  const [loadingImages, setLoadingImages] = useState<boolean>(false);
  const [imagesError, setImagesError] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  const mediaList = dynamicMedia.length > 0
    ? dynamicMedia
    : (destination.media && destination.media.length > 0 ? destination.media : []);

  const loadImages = React.useCallback(async (slugOrId: string) => {
    setLoadingImages(true);
    setImagesError(false);
    try {
      const fetched = await fetchDestinationImages(slugOrId, 8);
      if (fetched && fetched.length > 0) {
        const seen = new Set<string>();
        const merged: DestinationMedia[] = [];
        for (const item of [...(destination.media || []), ...fetched]) {
          const key = (item.url || item.thumbnail_url || item.id).split('?')[0].toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
        setDynamicMedia(merged);
      }
    } catch {
      setImagesError(true);
    } finally {
      setLoadingImages(false);
    }
  }, [destination.media]);

  // Close on Escape key and navigate gallery on ArrowLeft / ArrowRight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft' && mediaList.length > 1) {
        setModalImageError(false);
        setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
      } else if (e.key === 'ArrowRight' && mediaList.length > 1) {
        setModalImageError(false);
        setActiveMediaIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, mediaList.length, lightboxOpen]);

  // Reset modal state on destination change & trigger image search
  useEffect(() => {
    setActiveMediaIndex(0);
    setModalImageError(false);
    setModalDirectFallback(false);
    setLightboxOpen(false);
    setIsHistoryExpanded(true);
    setIsVisitorGuidanceExpanded(true);
    setDynamicMedia(destination.media && destination.media.length > 0 ? destination.media : []);
    loadImages(destination.slug);
  }, [destination, loadImages]);

  // Fetch nearby verified places & transit
  useEffect(() => {
    if (destination.coordinates) {
      setLoadingPlaces(true);
      Promise.all([
        fetchRestaurantsNear(destination.coordinates.lat, destination.coordinates.lon, 35.0).catch(
          () => []
        ),
        fetchAccommodationsNear(
          destination.coordinates.lat,
          destination.coordinates.lon,
          45.0
        ).catch(() => []),
        getDestinationNearby(destination.slug, 35.0).catch(() => null),
      ]).then(([rests, accs, nearbyRes]) => {
        setRestaurants(rests);
        setAccommodations(accs);
        setNearbyResponse(nearbyRes);
        if (nearbyRes) {
          setNearbyAttractions(nearbyRes.nearby_attractions || []);
          setNearbyTransit(nearbyRes.nearby_transit || []);
          // If fallback nearby endpoint returned restaurants/accommodations when direct search didn't
          if (rests.length === 0 && nearbyRes.nearby_restaurants?.length > 0) {
            setRestaurants(nearbyRes.nearby_restaurants as unknown as RestaurantRead[]);
          }
          if (accs.length === 0 && nearbyRes.nearby_accommodations?.length > 0) {
            setAccommodations(nearbyRes.nearby_accommodations as unknown as AccommodationRead[]);
          }
        }
        setLoadingPlaces(false);
      });
    } else {
      setRestaurants([]);
      setAccommodations([]);
      setNearbyAttractions([]);
      setNearbyTransit([]);
      setNearbyResponse(null);
    }
  }, [destination]);

  // Fetch cultural festivals for destination district
  useEffect(() => {
    if (destination.district_code) {
      let active = true;
      setLoadingEvents(true);
      fetch(`${getApiBaseUrl()}/events?district_code=${encodeURIComponent(destination.district_code)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (active && Array.isArray(data)) {
            setDestinationEvents(data);
          }
        })
        .catch(() => {
          if (active) setDestinationEvents([]);
        })
        .finally(() => {
          if (active) setLoadingEvents(false);
        });
      return () => {
        active = false;
      };
    } else {
      setDestinationEvents([]);
    }
  }, [destination.district_code]);

  const name = language === 'kn' && destination.name_kn ? destination.name_kn : destination.name_en;
  const summary =
    language === 'kn' && destination.summary_kn ? destination.summary_kn : destination.summary_en;
  const description =
    language === 'kn' && destination.description_kn
      ? destination.description_kn
      : destination.description_en;
  const howToReach =
    language === 'kn' && destination.how_to_reach_kn
      ? destination.how_to_reach_kn
      : destination.how_to_reach_en;
  const accessibility =
    language === 'kn' && destination.accessibility_notes_kn
      ? destination.accessibility_notes_kn
      : destination.accessibility_notes_en;

  const districtName =
    language === 'kn' && destination.district?.name_kn
      ? destination.district.name_kn
      : destination.district?.name_en || destination.district_code;

  const categoryTranslationKey = `cat_${destination.category}` as TranslationKey;
  const categoryLabel = t(categoryTranslationKey) || destination.category;

  const accessStatusKey = `access_${destination.access_status}` as TranslationKey;
  const accessStatusLabel = t(accessStatusKey) || destination.access_status;

  const renderFeeDetails = () => {
    if (destination.entry_fee_min_inr === 0 && destination.entry_fee_max_inr === 0) {
      return <strong className="text-free">{t('feeFree')}</strong>;
    }
    if (destination.entry_fee_min_inr !== undefined && destination.entry_fee_min_inr !== null) {
      const min = destination.entry_fee_min_inr;
      const max = destination.entry_fee_max_inr;
      if (max && max > min) {
        return <strong>₹{min} – ₹{max} ({destination.currency_code})</strong>;
      }
      return <strong>₹{min} ({destination.currency_code})</strong>;
    }
    return <span className="text-unknown">{t('feeUnknown')}</span>;
  };

  const primaryFallbackMedia: DestinationMedia | null = destination.primary_image_url
    ? {
        id: `primary-${destination.id}`,
        destination_id: destination.id,
        url: destination.primary_image_url,
        thumbnail_url: destination.primary_image_url,
        alt_en: destination.name_en,
        alt_kn: destination.name_kn,
        source_name: 'Official Wikimedia / Karnataka Tourism',
        license_type: 'Creative Commons / Public Domain',
        attribution: 'Official Wikimedia Commons / Karnataka Tourism',
        is_primary: true,
        verification_status: 'verified_authentic',
      }
    : null;
  const currentMedia = (mediaList.length > 0 ? mediaList[activeMediaIndex] : null) || primaryFallbackMedia;

  const handlePrevMedia = () => {
    if (mediaList.length <= 1) return;
    setModalImageError(false);
    setModalDirectFallback(false);
    setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNextMedia = () => {
    if (mediaList.length <= 1) return;
    setModalImageError(false);
    setModalDirectFallback(false);
    setActiveMediaIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-dest-title" data-testid="destination-modal-overlay">
      <div className="modal-container destination-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Universal Top-Right Close Button */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label={t('close')}
          data-testid="modal-close-button"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            zIndex: 60,
          }}
        >
          ✕
        </button>

        {/* Section A: Hero Image & Gallery Controls */}
        {currentMedia ? (
          (() => {
            const rawModalImg = currentMedia.thumbnail_url || currentMedia.url;
            const cleanModalUrl = rawModalImg
              ? rawModalImg.replace('thumb.wikimedia.org', 'upload.wikimedia.org').split('?')[0]
              : undefined;
            const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
            const isLocalUrl = Boolean(cleanModalUrl && (cleanModalUrl.startsWith('/') || cleanModalUrl.startsWith('data:')));
            const proxyModalUrl = cleanModalUrl
              ? (isLocalUrl ? cleanModalUrl : `${baseUrl}/destinations/media/proxy?url=${encodeURIComponent(cleanModalUrl)}`)
              : undefined;
            const modalImgUrl = modalDirectFallback && cleanModalUrl && !isLocalUrl ? cleanModalUrl : proxyModalUrl;
            const isVerified = currentMedia.verification_status === 'verified_authentic';

            return (
              <div className="destination-gallery-section" data-testid="destination-gallery-section" style={{ width: '100%' }}>
                {/* Main Image Viewport */}
                <div
                  className="modal-hero-banner"
                  data-testid="destination-hero-banner"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '200px',
                    overflow: 'hidden',
                    background: '#090d16',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Softly blurred backdrop to prevent dark voids and maintain cinematic aesthetic */}
                  {modalImgUrl && !modalImageError && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: -12,
                        backgroundImage: `url(${modalImgUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(24px) brightness(0.32)',
                        transform: 'scale(1.15)',
                        zIndex: 0,
                      }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Contained principal landmark image ensuring full structure visibility without aggressive cropping */}
                  {modalImgUrl && !modalImageError ? (
                    <img
                      data-testid="destination-gallery-main-image"
                      src={modalImgUrl}
                      alt={language === 'kn' && currentMedia.alt_kn ? currentMedia.alt_kn : currentMedia.alt_en || name}
                      referrerPolicy="no-referrer"
                      onError={() => {
                        if (!modalDirectFallback && cleanModalUrl && !isLocalUrl) {
                          setModalDirectFallback(true);
                        } else {
                          setModalImageError(true);
                        }
                      }}
                      style={{
                        position: 'relative',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        objectPosition: (currentMedia as unknown as { object_position?: string }).object_position || 'center center',
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        color: '#94a3b8',
                        textAlign: 'center',
                        padding: '24px',
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📷</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {language === 'kn' ? 'ಚಿತ್ರ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ' : 'Photograph temporarily unavailable'}
                      </div>
                    </div>
                  )}

                  {/* Verification Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(6px)',
                      color: isVerified ? '#34d399' : '#fbbf24',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${isVerified ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      zIndex: 10,
                    }}
                  >
                    <span>
                      {isVerified
                        ? language === 'kn'
                          ? '✓ ಪರಿಶೀಲಿಸಿದ ನೈಜ ಛಾಯಾಚಿತ್ರ'
                          : '✓ Verified Authentic Photograph'
                        : language === 'kn'
                        ? 'ℹ️ ಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ'
                        : 'ℹ️ Editorial Record (Verification Pending)'}
                    </span>
                  </div>

                  {/* Gallery Counter */}
                  {mediaList.length > 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(6px)',
                        color: '#f8fafc',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 12px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        zIndex: 10,
                      }}
                    >
                      📷 {activeMediaIndex + 1} / {mediaList.length}
                    </div>
                  )}

                  {/* Inspect Full-Size Image Button */}
                  {modalImgUrl && !modalImageError && (
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label="Inspect photograph in full size"
                      data-testid="gallery-inspect-button"
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        color: '#f8fafc',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 10,
                      }}
                    >
                      🔍 {language === 'kn' ? 'ಪೂರ್ಣ ನೋಟ' : 'Full Image'}
                    </button>
                  )}

                  {/* Loading Dynamic Photos Indicator */}
                  {loadingImages && (
                    <div
                      data-testid="gallery-loading-indicator"
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(6px)',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        zIndex: 10,
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      ⏳ {language === 'kn' ? 'ಹೆಚ್ಚಿನ ಚಿತ್ರಗಳನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...' : 'Searching authentic photos...'}
                    </div>
                  )}

                  {/* Retry Button if Search Errored */}
                  {imagesError && mediaList.length <= 1 && (
                    <button
                      type="button"
                      onClick={() => loadImages(destination.slug)}
                      data-testid="gallery-retry-button"
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        background: 'rgba(239, 68, 68, 0.85)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        cursor: 'pointer',
                        zIndex: 10,
                      }}
                    >
                      🔄 {language === 'kn' ? 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ' : 'Retry photo search'}
                    </button>
                  )}



                  {/* Carousel Navigation Buttons */}
                  {mediaList.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevMedia}
                        aria-label="Previous photograph"
                        data-testid="gallery-prev-button"
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          zIndex: 10,
                        }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMedia}
                        aria-label="Next photograph"
                        data-testid="gallery-next-button"
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          fontWeight: 'bold',
                          zIndex: 10,
                        }}
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* Gallery Info Bar: Caption, Attribution & Source Link */}
                <div
                  className="modal-gallery-footer"
                  data-testid="modal-gallery-footer"
                  style={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '10px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0', maxWidth: '65%' }}>
                      {language === 'kn' && currentMedia.caption_kn ? currentMedia.caption_kn : currentMedia.caption_en || name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      📷 {currentMedia.attribution} • <span style={{ color: '#93c5fd' }}>{currentMedia.license_type}</span>
                      {currentMedia.source_url && (
                        <a
                          href={currentMedia.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#38bdf8', marginLeft: '8px', textDecoration: 'underline', fontWeight: 600 }}
                          aria-label={`Open media source page for ${name}`}
                        >
                          {language === 'kn' ? 'ಮೂಲ ↗' : 'Source ↗'}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Clickable Thumbnail Strip */}
                  {mediaList.length > 1 && (
                    <div
                      className="modal-thumbnail-strip"
                      data-testid="gallery-thumbnail-strip"
                      style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        padding: '4px 0',
                        alignItems: 'center',
                      }}
                    >
                      {mediaList.map((m, idx) => {
                        const rawThumb = m.thumbnail_url || m.url;
                        const cleanThumb = rawThumb
                          ? rawThumb.replace('thumb.wikimedia.org', 'upload.wikimedia.org').split('?')[0]
                          : undefined;
                        const thumbUrl = cleanThumb
                          ? (cleanThumb.startsWith('/') || cleanThumb.startsWith('data:')
                              ? cleanThumb
                              : `${baseUrl}/destinations/media/proxy?url=${encodeURIComponent(cleanThumb)}`)
                          : undefined;
                        const isSelected = idx === activeMediaIndex;

                        return (
                          <button
                            key={m.id || `thumb-${idx}`}
                            type="button"
                            data-testid={`gallery-thumb-${idx}`}
                            onClick={() => {
                              setActiveMediaIndex(idx);
                              setModalImageError(false);
                              setModalDirectFallback(false);
                            }}
                            aria-label={`Select photo ${idx + 1}: ${m.caption_en || name}`}
                            style={{
                              flex: '0 0 auto',
                              width: '64px',
                              height: '46px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              padding: 0,
                              cursor: 'pointer',
                              background: '#0f172a',
                              border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
                              boxShadow: isSelected ? '0 0 8px rgba(56, 189, 248, 0.6)' : 'none',
                              opacity: isSelected ? 1 : 0.65,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt={m.alt_en || `Thumbnail ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  if (cleanThumb && !cleanThumb.startsWith('/') && !img.src.includes('upload.wikimedia.org/wikipedia')) {
                                    img.src = cleanThumb;
                                  }
                                }}
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.75rem', color: '#94a3b8' }}>
                                #{idx + 1}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div
            className="modal-hero-banner modal-hero-fallback"
            data-testid="destination-hero-fallback"
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              color: '#94a3b8',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >

            <span style={{ fontSize: '2.5rem' }}>📷</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '8px', color: '#e2e8f0' }}>
              {language === 'kn' ? 'ಛಾಯಾಚಿತ್ರ ಪರಿಶೀಲನೆ ಬಾಕಿಯಿದೆ' : 'Editorial Record — Media Verification Pending'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', maxWidth: '440px' }}>
              {language === 'kn'
                ? `${districtName} ಜಿಲ್ಲೆಯ ಈ ತಾಣದ ಅಧಿಕೃತ ಪರವಾನಗಿ ಹೊಂದಿದ ಛಾಯಾಚಿತ್ರ ಪರಿಶೀಲನೆ ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ.`
                : `Authentic CC-licensed photograph verification is in progress for this destination in ${districtName}.`}
            </span>
            {destination.sources && destination.sources.length > 0 && destination.sources[0].url && (
              <a
                href={destination.sources[0].url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: '10px', color: '#38bdf8', fontSize: '0.75rem', textDecoration: 'underline' }}
              >
                {language === 'kn' ? 'ಅಧಿಕೃತ ಉಲ್ಲೇಖ ಪುಟ ↗' : 'Official Reference Source ↗'}
              </a>
            )}
          </div>
        )}

        {/* Section B: Scrollable Content Area */}
        <div className="modal-scroll-area">
          <div className="modal-header-section">
            <div className="modal-badges">
              <span className="card-category-pill">{categoryLabel}</span>
              <span className="card-district-pill">📍 {districtName}</span>
              {destination.is_offbeat && (
                <span className="card-offbeat-badge">⭐ {t('offbeatBadge')}</span>
              )}
            </div>
            <h2 id="modal-dest-title" className="modal-title">
              {name}
            </h2>
            {summary && <p className="modal-summary">{summary}</p>}
          </div>

          {/* Tab Navigation Bar */}
          <div
            className="modal-tabs-bar"
            role="tablist"
            style={{
              display: 'flex',
              gap: '4px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.9)',
              padding: '0 1.5rem',
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeModalTab === 'all'}
              onClick={() => setActiveModalTab('all')}
              className={`modal-tab-btn ${activeModalTab === 'all' ? 'active' : ''}`}
              data-testid="tab-btn-all"
            >
              📑 {language === 'kn' ? 'ಎಲ್ಲವೂ' : 'All Sections'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeModalTab === 'overview'}
              onClick={() => setActiveModalTab('overview')}
              className={`modal-tab-btn ${activeModalTab === 'overview' ? 'active' : ''}`}
              data-testid="tab-btn-overview"
            >
              📜 {language === 'kn' ? 'ಅವಲೋಕನ' : 'Overview'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeModalTab === 'visit_info'}
              onClick={() => setActiveModalTab('visit_info')}
              className={`modal-tab-btn ${activeModalTab === 'visit_info' ? 'active' : ''}`}
              data-testid="tab-btn-visit-info"
            >
              🧭 {language === 'kn' ? 'ಪ್ರಯಾಣ ಮಾಹಿತಿ' : 'Visit Info'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeModalTab === 'nearby'}
              onClick={() => setActiveModalTab('nearby')}
              className={`modal-tab-btn ${activeModalTab === 'nearby' ? 'active' : ''}`}
              data-testid="tab-btn-nearby"
            >
              🏛️ {language === 'kn' ? 'ಸಮೀಪದ ಸ್ಥಳಗಳು' : 'Nearby'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeModalTab === 'events'}
              onClick={() => setActiveModalTab('events')}
              className={`modal-tab-btn ${activeModalTab === 'events' ? 'active' : ''}`}
              data-testid="tab-btn-events"
            >
              🎪 {language === 'kn' ? 'ಹಬ್ಬಗಳು ಮತ್ತು ಉತ್ಸವಗಳು' : 'Festivals & Events'} {destinationEvents.length > 0 && `(${destinationEvents.length})`}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeModalTab === 'sources'}
              onClick={() => setActiveModalTab('sources')}
              className={`modal-tab-btn ${activeModalTab === 'sources' ? 'active' : ''}`}
              data-testid="tab-btn-sources"
            >
              🏛️ {language === 'kn' ? 'ಮೂಲಗಳು' : 'Sources'}
            </button>
          </div>

          <div className="modal-body">
            {/* Section D: Photo Gallery Thumbnails */}
            {mediaList.length > 1 && (
              <div className="modal-section gallery-section" style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#38bdf8' }}>
                  📸 {t('photoGallery')} ({mediaList.length})
                </h4>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {mediaList.map((m, idx) => (
                    <button
                      key={m.id || idx}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      style={{
                        border: idx === activeMediaIndex ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        padding: '2px',
                        background: '#1e293b',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={m.thumbnail_url || m.url}
                        alt={m.alt_en || name}
                        referrerPolicy="no-referrer"
                        style={{ width: '68px', height: '46px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Section C: Practical Information Grid */}
            {(activeModalTab === 'all' || activeModalTab === 'overview' || activeModalTab === 'visit_info') && (
              <div className="modal-info-grid">
                <div className="info-block">
                  <span className="info-label">{t('entryFee')}</span>
                  <div className="info-value">{renderFeeDetails()}</div>
                </div>

                <div className="info-block">
                  <span className="info-label">{t('estimatedTime')}</span>
                  <div className="info-value">
                    {destination.estimated_visit_minutes
                      ? `⏱️ ${destination.estimated_visit_minutes} ${t('minutes')}`
                      : 'N/A'}
                  </div>
                </div>

                <div className="info-block">
                  <span className="info-label">{t('accessStatus')}</span>
                  <div className="info-value">ℹ️ {accessStatusLabel}</div>
                </div>

                {destination.coordinates && (
                  <div className="info-block">
                    <span className="info-label">Coordinates (WGS84)</span>
                    <div className="info-value text-mono">
                      {destination.coordinates.lat.toFixed(4)}° N, {destination.coordinates.lon.toFixed(4)}° E
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section E: Overview & History */}
            {(activeModalTab === 'all' || activeModalTab === 'overview') && description && (
              <div className="modal-section" data-testid="destination-overview-section">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                >
                  <h4 style={{ margin: 0 }}>📜 {t('culturalSignificance')}</h4>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {isHistoryExpanded ? '▲' : '▼'}
                  </button>
                </div>
                {isHistoryExpanded && (
                  <p style={{ marginTop: '8px', lineHeight: 1.6, color: '#e2e8f0' }}>{description}</p>
                )}
              </div>
            )}

            {/* Section F: Visitor Guidance & Accessibility */}
            {(activeModalTab === 'all' || activeModalTab === 'visit_info') && (accessibility || howToReach) && (
              <div className="modal-section">
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setIsVisitorGuidanceExpanded(!isVisitorGuidanceExpanded)}
                >
                  <h4 style={{ margin: 0 }}>🧭 {t('visitorGuidance')}</h4>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {isVisitorGuidanceExpanded ? '▲' : '▼'}
                  </button>
                </div>
                {isVisitorGuidanceExpanded && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {accessibility && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.85rem' }}>♿ {t('accessibilityNotes')}:</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>{accessibility}</p>
                      </div>
                    )}
                    {howToReach && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.85rem' }}>🚌 {t('howToReach')}:</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>{howToReach}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Section G: Nearby Attractions */}
            {(activeModalTab === 'all' || activeModalTab === 'nearby') && nearbyAttractions.length > 0 && (
              <div className="modal-section" style={{ marginTop: '16px' }} data-testid="nearby-attractions-section">
                <h4>🏛️ {t('nearbyAttractions')} ({nearbyAttractions.length})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '8px' }}>
                  {nearbyAttractions.map((attr) => (
                    <div
                      key={attr.id}
                      style={{
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '10px',
                        background: 'rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>{attr.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                        <span>📍 {attr.distance_km} {t('distanceKm')}</span>
                        {attr.estimated_visit_minutes && <span>⏱️ {attr.estimated_visit_minutes}m</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section H: Nearby Transit Facilities */}
            {(activeModalTab === 'all' || activeModalTab === 'nearby') && nearbyTransit.length > 0 && (
              <div className="modal-section" style={{ marginTop: '16px' }} data-testid="nearby-transit-section">
                <h4>🚌 {t('nearbyTransit')} ({nearbyTransit.length})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '8px' }}>
                  {nearbyTransit.map((hub, idx) => {
                    const hubName = hub.name || (language === 'kn' ? (hub as unknown as { name_kn?: string }).name_kn : (hub as unknown as { name_en?: string }).name_en) || '';
                    return (
                      <div
                        key={hub.hub_id || (hub as unknown as { station_id?: string }).station_id || idx}
                        style={{
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '10px',
                          background: 'rgba(16, 185, 129, 0.08)',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#34d399' }}>
                          {hub.hub_type === 'rail' ? '🚆' : '🚏'} {hubName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#a7f3d0', marginTop: '4px' }}>
                          {hub.hub_type === 'rail' ? t('hubRail') : t('hubBus')} • {hub.distance_km} {t('distanceKm')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section I: Nearby Verified Food & Stays (NK-FIX-03) */}
            {(activeModalTab === 'all' || activeModalTab === 'nearby') && (
              <div className="modal-section nearby-places-section" data-testid="nearby-places-section" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ margin: 0 }}>🍽️ {t('nearbyPlaces')}</h4>
                  {nearbyResponse?.radius_expanded && (
                    <span style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                      🔍 {language === 'kn' ? 'ವಿಸ್ತೃತ ತ್ರಿಜ್ಯ' : 'Expanded Search Radius'} (~{nearbyResponse.effective_radius_km} km)
                    </span>
                  )}
                </div>
                <p className="text-muted text-sm" style={{ marginTop: '4px' }}>{t('nearbyPlacesSub')}</p>

                {/* Radius expansion transparency note */}
                {nearbyResponse?.radius_note && (
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      color: '#bae6fd',
                      marginBottom: '12px',
                    }}
                  >
                    ℹ️ {nearbyResponse.radius_note}
                  </div>
                )}

                {loadingPlaces ? (
                  <div className="places-loading-indicator">
                    <span className="spinner-icon">🔄</span> {t('loadingPlaces')}
                  </div>
                ) : restaurants.length === 0 && accommodations.length === 0 ? (
                  <div className="places-empty-state" style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                    <span className="text-muted text-sm">{t('noPlacesFound')}</span>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0 0' }}>
                      {language === 'kn'
                        ? 'ಈ ಪ್ರದೇಶದ ಸುತ್ತಮುತ್ತ ಯಾವುದೇ ಅಧಿಕೃತ ಊಟೋಪಹಾರ ಅಥವಾ ವಸತಿ ನೋಂದಾಯಿತವಾಗಿಲ್ಲ. ಸಮೀಪದ ತಾಲ್ಲೂಕು ಅಥವಾ ಜಿಲ್ಲಾ ಕೇಂದ್ರದಲ್ಲಿ ವ್ಯವಸ್ಥೆ ಮಾಡಿಕೊಳ್ಳಲು ಶಿಫಾರಸು ಮಾಡುತ್ತೇವೆ.'
                        : 'No curated dining or accommodation records within search radius of this remote destination. We recommend arranging meals and stays at the nearest district center.'}
                    </p>
                  </div>
                ) : (
                  <div className="places-cards-grid">
                    {/* Food Section */}
                    {restaurants.length > 0 && (
                      <div className="places-category-group">
                        <h5 className="places-subheading">🍴 {t('placesToEat')} ({restaurants.length})</h5>
                        <div className="places-subgrid">
                          {restaurants.map((rest) => (
                            <div key={rest.id} className="place-item-card" data-testid={`nearby-rest-${rest.id}`}>
                              <div className="place-item-header">
                                <span className="place-item-name">
                                  {language === 'kn' ? rest.name_kn : rest.name_en}
                                </span>
                                {rest.distance_km !== undefined && (
                                  <span className="place-distance-badge">📍 {rest.distance_km} km</span>
                                )}
                              </div>
                              <p className="place-item-desc">
                                {language === 'kn'
                                  ? rest.user_notes_kn || rest.address_kn || rest.address_en
                                  : rest.user_notes_en || rest.address_en}
                              </p>
                              <div className="place-item-meta">
                                {rest.is_vegetarian && (
                                  <span className="place-pill-veg">🌱 {t('pureVeg')}</span>
                                )}
                                {rest.estimated_cost_per_person_inr && (
                                  <span className="place-pill-cost">
                                    ₹{rest.estimated_cost_per_person_inr} {t('perPersonEst')}
                                  </span>
                                )}
                                <span className="place-pill-source">🏛️ {rest.source_name}</span>
                                {rest.latitude && rest.longitude && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${rest.latitude},${rest.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="place-booking-link"
                                    style={{ color: '#38bdf8', textDecoration: 'underline' }}
                                  >
                                    🗺️ {language === 'kn' ? 'ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ ↗' : 'Maps ↗'}
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accommodation Section */}
                    {accommodations.length > 0 && (
                      <div className="places-category-group">
                        <h5 className="places-subheading">🏨 {t('placesToStay')} ({accommodations.length})</h5>
                        <div className="places-subgrid">
                          {accommodations.map((acc) => (
                            <div key={acc.id} className="place-item-card" data-testid={`nearby-acc-${acc.id}`}>
                              <div className="place-item-header">
                                <span className="place-item-name">
                                  {language === 'kn' ? acc.name_kn : acc.name_en}
                                </span>
                                {acc.distance_km !== undefined && (
                                  <span className="place-distance-badge">📍 {acc.distance_km} km</span>
                                )}
                              </div>
                              <p className="place-item-desc">
                                {language === 'kn'
                                  ? acc.user_notes_kn || acc.address_kn || acc.address_en
                                  : acc.user_notes_en || acc.address_en}
                              </p>
                              <div className="place-item-meta">
                                <span className="place-pill-tier">{acc.accommodation_type.toUpperCase()}</span>
                                {acc.estimated_cost_per_night_inr && (
                                  <span className="place-pill-cost">
                                    ₹{acc.estimated_cost_per_night_inr} {t('perNightEst')}
                                  </span>
                                )}
                                {acc.link_status === 'verified' || acc.official_booking_url ? (
                                  <span className="place-pill-source" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                                    🏛️ {t('officialGovtProperty')}
                                  </span>
                                ) : (
                                  <span className="place-pill-source">🏛️ {acc.source_name}</span>
                                )}
                                {(acc.official_booking_url || acc.booking_reference_url) && (
                                  <a
                                    href={acc.official_booking_url || acc.booking_reference_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="place-booking-link"
                                    style={acc.official_booking_url ? { background: '#15803d', color: '#ffffff', fontWeight: 600, padding: '3px 8px', borderRadius: '4px' } : undefined}
                                    title={t('bookingDisclaimer')}
                                  >
                                    {acc.official_booking_url ? `🏛️ ${t('officialBookingAction')}` : `🔗 ${t('viewBookingRef')}`}
                                  </a>
                                )}
                                {acc.official_website_url && (
                                  <a
                                    href={acc.official_website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="place-booking-link"
                                  >
                                    🌐 {t('officialWebsiteAction')}
                                  </a>
                                )}
                                {acc.latitude && acc.longitude && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${acc.latitude},${acc.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="place-booking-link"
                                    style={{ color: '#38bdf8', textDecoration: 'underline' }}
                                  >
                                    🗺️ {language === 'kn' ? 'ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ ↗' : 'Maps ↗'}
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Workstream 6: Destination Festivals & Events Section */}
            {(activeModalTab === 'all' || activeModalTab === 'events') && (
              <div
                className="modal-section destination-events-section"
                data-testid="destination-events-section"
                style={{ marginTop: '16px' }}
              >
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', margin: '0 0 8px 0' }}>
                  <span>🎪</span>
                  <span>{language === 'kn' ? 'ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವಗಳು ಮತ್ತು ಹಬ್ಬಗಳು' : 'Festivals & Cultural Celebrations'}</span>
                  {destinationEvents.length > 0 && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>({destinationEvents.length})</span>}
                </h4>

                {loadingEvents ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '12px' }}>
                    ⏳ {language === 'kn' ? 'ಉತ್ಸವಗಳ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Checking verified cultural events...'}
                  </div>
                ) : destinationEvents.length === 0 ? (
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '14px', borderRadius: '8px', color: '#94a3b8', fontSize: '0.82rem' }}>
                    ℹ️ {language === 'kn'
                      ? 'ಈ ತಾಣದ ಜಿಲ್ಲೆಯಲ್ಲಿ ಪ್ರಸ್ತುತ ಯಾವುದೇ ಪ್ರಮುಖ ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವಗಳು ನಿಗದಿಯಾಗಿಲ್ಲ.'
                      : 'No major cultural events currently catalogued specifically for this destination district.'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                    {destinationEvents.map((ev) => (
                      <div
                        key={ev.id}
                        data-testid={`dest-event-${ev.id}`}
                        style={{
                          background: 'rgba(15, 23, 42, 0.65)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>
                              {ev.event_category?.replace('_', ' ') || 'Festival'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {ev.typical_start_date ? `📅 ${ev.typical_start_date}` : `Month ${ev.start_month}`}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc', marginTop: '2px' }}>
                            {language === 'kn' && ev.name_kn ? ev.name_kn : ev.name_en}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                            📍 {ev.location_name}
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                            {language === 'kn' && ev.description_kn ? ev.description_kn : ev.description_en}
                          </p>
                        </div>
                        {ev.source_url && (
                          <div style={{ marginTop: '6px' }}>
                            <a
                              href={ev.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#38bdf8', fontSize: '0.74rem', textDecoration: 'underline', fontWeight: 600 }}
                            >
                              🔗 {language === 'kn' ? 'ಅಧಿಕೃತ ಮೂಲ ↗' : 'Official Source ↗'}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section J: Provenance and Verified Sources (NK-SOURCES-01) */}
            {(activeModalTab === 'all' || activeModalTab === 'sources') && destination.sources && destination.sources.length > 0 && (() => {
              // Deduplicate sources by URL or name
              const seenSources = new Set<string>();
              const deduplicatedSources = destination.sources.filter((src) => {
                const key = (src.source_url || src.url || src.source_name || src.title || '').trim().toLowerCase();
                if (!key || seenSources.has(key)) return false;
                seenSources.add(key);
                return true;
              });

              if (deduplicatedSources.length === 0) return null;

              const formatSourceType = (type?: string) => {
                switch (type) {
                  case 'government_official':
                    return language === 'kn' ? 'ಅಧಿಕೃತ ಸರ್ಕಾರಿ ದಾಖಲೆ' : 'Archaeological Survey / Official Govt Dept';
                  case 'tourism_board':
                    return language === 'kn' ? 'ಕರ್ನಾಟಕ ಪ್ರವಾಸೋದ್ಯಮ ಇಲಾಖೆ' : 'Department of Tourism, Govt of Karnataka';
                  case 'verified_editorial':
                    return language === 'kn' ? 'ಪರಿಶೀಲಿತ ಪ್ರಾದೇಶಿಕ ಗೆಜೆಟಿಯರ್' : 'Verified Regional Gazette & Historical Archives';
                  case 'academic':
                    return language === 'kn' ? 'ಶೈಕ್ಷಣಿಕ ಮತ್ತು ಪುರಾತತ್ವ ಸಂಶೋಧನೆ' : 'Academic & Archaeological Research';
                  default:
                    return language === 'kn' ? 'ಅಧಿಕೃತ ದಾಖಲೆ' : 'Official Protected Record';
                }
              };

              const formatClaimScope = (scope?: string) => {
                switch (scope) {
                  case 'all':
                    return language === 'kn' ? 'ಸಂಪೂರ್ಣ ಮಾಹಿತಿ ಮತ್ತು ದರಗಳು' : 'Comprehensive Visitor & Tariff Record';
                  case 'fees_and_timings':
                    return language === 'kn' ? 'ಪ್ರವೇಶ ಶುಲ್ಕ ಮತ್ತು ಸಮಯ' : 'Public Tariffs & Operating Hours';
                  case 'history':
                    return language === 'kn' ? 'ಐತಿಹಾಸಿಕ ವಿವರ' : 'Heritage & Architectural Provenance';
                  default:
                    return scope || (language === 'kn' ? 'ಪರಿಶೀಲಿತ ಮಾಹಿತಿ' : 'Verified Details');
                }
              };

              return (
                <div className="modal-section" style={{ marginTop: '20px' }} data-testid="verified-sources-section">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                    <span>🏛️</span> {t('verifiedSources')}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {deduplicatedSources.map((src, idx) => {
                      const title = src.source_name || src.title || (language === 'kn' ? 'ಅಧಿಕೃತ ಪ್ರವಾಸೋದ್ಯಮ ಉಲ್ಲೇಖ' : 'Official Tourism Reference');
                      const linkUrl = src.source_url || src.url;
                      const hasLink = Boolean(linkUrl && linkUrl.startsWith('http'));

                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '220px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                }}
                              >
                                {formatSourceType(src.source_type)}
                              </span>
                              {src.claim_scope && (
                                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                  • {formatClaimScope(src.claim_scope)}
                                </span>
                              )}
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc', marginTop: '4px' }}>
                              {title}
                            </div>
                            {src.checked_at && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                {language === 'kn' ? 'ಪರಿಶೀಲಿಸಿದ ದಿನಾಂಕ' : 'Verified'}: {new Date(src.checked_at).toLocaleDateString(language === 'kn' ? 'kn-IN' : 'en-IN', { year: 'numeric', month: 'short' })}
                              </div>
                            )}
                          </div>

                          <div>
                            {hasLink ? (
                              <a
                                href={linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                }}
                                aria-label={`Open external verified source for ${title}`}
                              >
                                {language === 'kn' ? 'ಮೂಲ ಪರಿಶೀಲಿಸಿ ↗' : 'Verify Source ↗'}
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                                {language === 'kn' ? 'ಲಿಂಕ್ ಲಭ್ಯವಿಲ್ಲ' : 'Source details unavailable'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Section K: Pinned Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button
            type="button"
            className="btn-primary"
            data-testid="modal-plan-trip-btn"
            onClick={() => {
              onClose();
              onPlanAround(destination);
            }}
          >
            {t('planWithThis')}
          </button>
        </div>
      </div>

      {/* Lightbox Full Photograph Modal */}
      {lightboxOpen && currentMedia && (
        <div
          className="modal-backdrop lightbox-modal-backdrop"
          data-testid="gallery-lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
          style={{
            zIndex: 9999,
            backgroundColor: 'rgba(5, 10, 20, 0.94)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            data-testid="lightbox-close-button"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              fontSize: '1.2rem',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
            }}
          >
            ✕
          </button>
          <img
            src={
              (() => {
                const raw = currentMedia.url || currentMedia.thumbnail_url;
                const clean = raw ? raw.replace('thumb.wikimedia.org', 'upload.wikimedia.org').split('?')[0] : '';
                return clean.startsWith('/') || clean.startsWith('data:')
                  ? clean
                  : `${getApiBaseUrl().replace(/\/+$/, '')}/destinations/media/proxy?url=${encodeURIComponent(clean)}`;
              })()
            }
            alt={language === 'kn' && currentMedia.alt_kn ? currentMedia.alt_kn : currentMedia.alt_en || name}
            data-testid="lightbox-full-image"
            style={{
              maxWidth: '92vw',
              maxHeight: '82vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
            }}
          />
          <div style={{ marginTop: '16px', color: '#f8fafc', fontSize: '0.9rem', textAlign: 'center', maxWidth: '800px' }}>
            <strong>{language === 'kn' && currentMedia.caption_kn ? currentMedia.caption_kn : currentMedia.caption_en || name}</strong>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              📷 {currentMedia.attribution} • <span style={{ color: '#38bdf8' }}>{currentMedia.license_type}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
