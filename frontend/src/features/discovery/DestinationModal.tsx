import React, { useEffect, useState } from 'react';
import {
  DestinationRead,
  Language,
  RestaurantRead,
  AccommodationRead,
  NearbyAttractionItem,
  NearbyTransitItem,
} from '../../types';
import { useTranslation, TranslationKey } from '../../lib/i18n';
import {
  fetchRestaurantsNear,
  fetchAccommodationsNear,
  getDestinationNearby,
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
  const [restaurants, setRestaurants] = useState<RestaurantRead[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationRead[]>([]);
  const [nearbyAttractions, setNearbyAttractions] = useState<NearbyAttractionItem[]>([]);
  const [nearbyTransit, setNearbyTransit] = useState<NearbyTransitItem[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState<boolean>(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
        if (nearbyRes) {
          setNearbyAttractions(nearbyRes.nearby_attractions || []);
          setNearbyTransit(nearbyRes.nearby_transit || []);
        }
        setLoadingPlaces(false);
      });
    } else {
      setRestaurants([]);
      setAccommodations([]);
      setNearbyAttractions([]);
      setNearbyTransit([]);
    }
  }, [destination]);

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

  const mediaList = destination.media || [];
  const currentMedia = mediaList[activeMediaIndex] || null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-dest-title" data-testid="destination-modal-overlay">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        {/* Section A: Hero Image */}
        {currentMedia ? (
          <div className="modal-hero-banner" style={{ position: 'relative', width: '100%', height: '260px', overflow: 'hidden', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', background: '#0f172a' }}>
            <img
              src={currentMedia.url}
              alt={language === 'kn' && currentMedia.alt_kn ? currentMedia.alt_kn : currentMedia.alt_en || name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
            />
            <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)', color: '#34d399', fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(52, 211, 153, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✓ {language === 'kn' ? 'ಪರಿಶೀಲಿಸಿದ ನೈಜ ಛಾಯಾಚಿತ್ರ' : 'Verified Authentic Photograph'}</span>
            </div>
            <div style={{ position: 'absolute', bottom: '8px', right: '12px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)', color: '#cbd5e1', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', maxWidth: '90%' }}>
              📷 {currentMedia.attribution} • <span style={{ color: '#93c5fd' }}>{currentMedia.license_type}</span>
              {currentMedia.source_url && (
                <a href={currentMedia.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', marginLeft: '6px', textDecoration: 'underline' }}>
                  Source ↗
                </a>
              )}
            </div>
          </div>
        ) : null}

        <div className="modal-header">
          <div className="modal-badges">
            <span className="card-category-pill">{categoryLabel}</span>
            <span className="card-district-pill">📍 {districtName}</span>
            {destination.is_offbeat && (
              <span className="card-offbeat-badge">⭐ {t('offbeatBadge')}</span>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t('close')}
            data-testid="modal-close-button"
          >
            ✕
          </button>
        </div>

        <h2 id="modal-dest-title" className="modal-title">
          {name}
        </h2>
        {summary && <p className="modal-summary">{summary}</p>}

        <div className="modal-body">
          {/* Section D: Photo Gallery thumbnails */}
          {mediaList.length > 1 && (
            <div className="modal-section gallery-section" style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>📸 {t('photoGallery')} ({mediaList.length})</h4>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                {mediaList.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    type="button"
                    onClick={() => setActiveMediaIndex(idx)}
                    style={{
                      border: idx === activeMediaIndex ? '2px solid #4f46e5' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '2px',
                      background: '#fff',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={m.thumbnail_url || m.url}
                      alt={m.alt_en || name}
                      style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </button>
                ))}
              </div>
              {currentMedia && (
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                  {language === 'kn' && currentMedia.caption_kn ? currentMedia.caption_kn : currentMedia.caption_en}
                </p>
              )}
            </div>
          )}

          {/* Section C: Practical Information Grid */}
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

          {/* Section B: Overview */}
          {description && (
            <div className="modal-section">
              <h4>{t('overview')}</h4>
              <p>{description}</p>
            </div>
          )}

          {howToReach && (
            <div className="modal-section">
              <h4>{t('howToReach')}</h4>
              <p>{howToReach}</p>
            </div>
          )}

          {accessibility && (
            <div className="modal-section">
              <h4>{t('accessibilityNotes')}</h4>
              <p>{accessibility}</p>
            </div>
          )}

          {/* Section E: Nearby Attractions */}
          {nearbyAttractions.length > 0 && (
            <div className="modal-section" style={{ marginTop: '16px' }} data-testid="nearby-attractions-section">
              <h4>🏛️ {t('nearbyAttractions')} ({nearbyAttractions.length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '8px' }}>
                {nearbyAttractions.map((attr) => (
                  <div
                    key={attr.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                      background: '#f9fafb',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{attr.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                      <span>📍 {attr.distance_km} {t('distanceKm')}</span>
                      {attr.estimated_visit_minutes && <span>⏱️ {attr.estimated_visit_minutes}m</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Transit Facilities */}
          {nearbyTransit.length > 0 && (
            <div className="modal-section" style={{ marginTop: '16px' }} data-testid="nearby-transit-section">
              <h4>🚌 {t('nearbyTransit')} ({nearbyTransit.length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '8px' }}>
                {nearbyTransit.map((hub, idx) => {
                  const hubName = hub.name || (language === 'kn' ? (hub as unknown as { name_kn?: string }).name_kn : (hub as unknown as { name_en?: string }).name_en) || '';
                  return (
                    <div
                      key={hub.hub_id || (hub as unknown as { station_id?: string }).station_id || idx}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '10px',
                        background: '#f0fdf4',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#166534' }}>
                        {hub.hub_type === 'rail' ? '🚆' : '🚏'} {hubName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '4px' }}>
                        {hub.hub_type === 'rail' ? t('hubRail') : t('hubBus')} • {hub.distance_km} {t('distanceKm')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nearby Verified Food & Stays */}
          <div className="modal-section nearby-places-section" data-testid="nearby-places-section" style={{ marginTop: '16px' }}>
            <h4>🍽️ {t('nearbyPlaces')}</h4>
            <p className="text-muted text-sm">{t('nearbyPlacesSub')}</p>

            {loadingPlaces ? (
              <div className="places-loading-indicator">
                <span className="spinner-icon">🔄</span> {t('loadingPlaces')}
              </div>
            ) : restaurants.length === 0 && accommodations.length === 0 ? (
              <div className="places-empty-state">
                <span className="text-muted text-sm">{t('noPlacesFound')}</span>
              </div>
            ) : (
              <div className="places-cards-grid">
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section G: Provenance and Verified Sources */}
          {destination.sources && destination.sources.length > 0 && (
            <div className="modal-section" style={{ marginTop: '16px' }}>
              <h4>{t('verifiedSources')}</h4>
              <ul className="source-list">
                {destination.sources.map((src, idx) => (
                  <li key={idx}>
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer">
                        {src.title} ({src.source_type})
                      </a>
                    ) : (
                      <span>{src.title} ({src.source_type})</span>
                    )}
                  </li>
                ))}
              </ul>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px', background: '#f3f4f6', padding: '6px 10px', borderRadius: '4px' }}>
                ℹ️ {t('verifiedDataNotice')}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('close')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              onPlanAround(destination);
            }}
          >
            {t('planWithThis')}
          </button>
        </div>
      </div>
    </div>
  );
};
