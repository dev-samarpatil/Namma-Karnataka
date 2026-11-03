import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Compass } from 'lucide-react';
import { Language } from '../../types';
import '../../features/itinerary/DayWiseItinerary.css';

export interface PolaroidSlide {
  id?: string;
  image?: string;
  rawImageUrl?: string;
  title: string;
  caption?: string;
  polaroidCaption?: string;
  destinationId?: string | null;
  dayNumber?: number;
  stopOrder?: number;
  district?: string;
  category?: string;
  destinationsCount?: number;
}

export interface PolaroidLineCarouselProps {
  slides: PolaroidSlide[];
  activeIndex?: number; // 0-based index of the destination slide within the day
  onChange?: (index: number) => void;
  dayTitle?: string;
  daySubtitle?: string;
  dayNumber?: number;
  autoplay?: number | boolean;
  autoplayInterval?: number;
  className?: string;
  cardWidth?: number;
  emptyStateTitle?: string;
  emptyStateSubtitle?: string;
  language?: Language;
}

export const PolaroidLineCarousel: React.FC<PolaroidLineCarouselProps> = ({
  slides,
  activeIndex = 0,
  onChange,
  dayTitle,
  daySubtitle,
  dayNumber = 1,
  autoplay = 0,
  autoplayInterval = 5000,
  className = '',
  cardWidth: customCardWidth,
  emptyStateTitle,
  emptyStateSubtitle,
  language = 'en',
}) => {
  const [internalIndex, setInternalIndex] = useState<number>(activeIndex);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dragVelocity, setDragVelocity] = useState<number>(0);
  const [imageFallbacks, setImageFallbacks] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const isKn = language === 'kn';

  // Responsive dimensions detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const cardWidth = customCardWidth || (isMobile ? 180 : 230);
  const cardGap = isMobile ? 20 : 36;
  const pitch = cardWidth + cardGap;

  // Sync internalIndex when activeIndex prop changes or slides change
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < slides.length && activeIndex !== internalIndex) {
      setInternalIndex(activeIndex);
    } else if (slides.length > 0 && internalIndex >= slides.length) {
      setInternalIndex(0);
    }
  }, [activeIndex, slides.length, internalIndex]);

  // Reset image fallbacks and errors when switching days or destination count changes
  useEffect(() => {
    setImageFallbacks({});
    setImageErrors({});
  }, [dayNumber, slides.length]);

  // Autoplay support (disabled by default when autoplay === 0 or false)
  const isAutoplayActive = Boolean(autoplay && Number(autoplay) > 0 && slides.length > 1);
  const effectiveInterval = typeof autoplay === 'number' && autoplay > 0 ? autoplay : autoplayInterval;

  useEffect(() => {
    if (!isAutoplayActive || isDragging || slides.length <= 1) return;

    const timer = setInterval(() => {
      setInternalIndex((prev) => {
        const next = (prev + 1) % slides.length;
        if (onChange) onChange(next);
        return next;
      });
    }, effectiveInterval);

    return () => clearInterval(timer);
  }, [isAutoplayActive, isDragging, slides.length, effectiveInterval, onChange]);

  const selectIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= slides.length) return;
      setInternalIndex(index);
      if (onChange) {
        onChange(index);
      }
    },
    [slides.length, onChange]
  );

  const handlePrev = useCallback(() => {
    if (internalIndex > 0) {
      selectIndex(internalIndex - 1);
    }
  }, [internalIndex, selectIndex]);

  const handleNext = useCallback(() => {
    if (internalIndex < slides.length - 1) {
      selectIndex(internalIndex + 1);
    }
  }, [internalIndex, slides.length, selectIndex]);

  // Drag interaction handlers
  const handleDragStart = (clientX: number) => {
    if (slides.length <= 1) return;
    setIsDragging(true);
    startXRef.current = clientX;
    lastXRef.current = clientX;
    lastTimeRef.current = Date.now();
    setDragOffset(0);
    setDragVelocity(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startXRef.current;
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      const v = (clientX - lastXRef.current) / dt;
      setDragVelocity(v);
    }
    lastXRef.current = clientX;
    lastTimeRef.current = now;
    setDragOffset(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = cardWidth * 0.22;
    if (dragOffset > threshold || dragVelocity > 0.3) {
      if (internalIndex > 0) {
        selectIndex(internalIndex - 1);
      }
    } else if (dragOffset < -threshold || dragVelocity < -0.3) {
      if (internalIndex < slides.length - 1) {
        selectIndex(internalIndex + 1);
      }
    }
    setDragOffset(0);
    setDragVelocity(0);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  // Full Viewport-Width Hanging Twine Rope (100vw, extreme left to extreme right)
  const renderFullViewportRope = () => (
    <div className="nk-viewport-rope-layer" aria-hidden="true">
      <svg viewBox="0 0 2000 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="full-twine-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B38E65" stopOpacity="0.8" />
            <stop offset="15%" stopColor="#C6A77D" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#DFCAAC" stopOpacity="1" />
            <stop offset="50%" stopColor="#C6A77D" stopOpacity="1" />
            <stop offset="65%" stopColor="#DFCAAC" stopOpacity="1" />
            <stop offset="85%" stopColor="#C6A77D" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#B38E65" stopOpacity="0.8" />
          </linearGradient>
          <filter id="soft-twine-shadow" x="-5%" y="-30%" width="110%" height="180%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#8B693E" floodOpacity="0.32" />
          </filter>
        </defs>
        <path
          d="M 0 38 Q 1000 64 2000 38"
          stroke="url(#full-twine-grad)"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
          filter="url(#soft-twine-shadow)"
        />
      </svg>
    </div>
  );

  // Dynamic Horizontal Track Transform
  // 1 card: perfectly centred horizontally
  // 2 cards: centred together as a balanced pair
  // 3, 4, 5+ cards: active card is ALWAYS centred at 50% of the viewport width
  const trackTransform = useMemo(() => {
    if (!slides || slides.length === 0) return 'translateX(0px)';
    if (slides.length === 1) {
      return `translateX(calc(50% - ${cardWidth / 2}px))`;
    }
    if (slides.length === 2) {
      return `translateX(calc(50% - ${cardWidth + cardGap / 2}px + ${dragOffset}px))`;
    }
    return `translateX(calc(50% - ${internalIndex * pitch + cardWidth / 2}px + ${dragOffset}px))`;
  }, [slides, cardWidth, cardGap, dragOffset, internalIndex, pitch]);

  // Tasteful Empty State for Days with no Sightseeing Stops
  if (!slides || slides.length === 0) {
    return (
      <div className={`nk-gallery-section-wrapper ${className}`}>
        {renderFullViewportRope()}

        <div
          ref={galleryRef}
          className="nk-day-gallery"
          data-testid="polaroid-line-carousel"
          role="region"
          aria-roledescription="carousel"
          aria-label="Daily Sightseeing Destination Gallery"
        >
          <div className="nk-polaroid-viewport">
            <div className="nk-gallery-empty-state" data-testid="gallery-empty-state">
              <div className="nk-gallery-empty-icon">
                <Compass size={28} strokeWidth={2.2} />
              </div>
              <h4 className="nk-gallery-empty-title">
                {emptyStateTitle || (isKn ? 'ಈ ದಿನಕ್ಕೆ ಯಾವುದೇ ದೃಶ್ಯವೀಕ್ಷಣೆಯ ತಾಣಗಳು ನಿಗದಿಯಾಗಿಲ್ಲ.' : 'No sightseeing destinations scheduled for this day.')}
              </h4>
              <p className="nk-gallery-empty-subtitle">
                {emptyStateSubtitle || (isKn ? 'ನಿಮ್ಮ ವಾಸ್ತವ್ಯ ಮತ್ತು ಪ್ರಯಾಣದ ವಿವರಗಳು ಕೆಳಗಿನ ವಿವರಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ.' : 'Your accommodation and travel details are available in View Details.')}
              </p>
            </div>
          </div>

          {/* Bottom Area: Selected Day Information */}
          <div className="nk-gallery-navigation">
            <div className="nk-gallery-nav-info">
              <h3 className="nk-gallery-nav-title">
                {dayTitle || (isKn ? `ದಿನ ${dayNumber}` : `Day ${dayNumber}`)}
              </h3>
              <p className="nk-gallery-nav-subtitle">
                {daySubtitle || (isKn ? 'ಪ್ರಯಾಣ ಮತ್ತು ವಿಶ್ರಾಂತಿ ವೇಳಾಪಟ್ಟಿ' : 'Rest and travel schedule')}
              </p>
            </div>
            <div className="nk-gallery-nav-controls">
              <span className="nk-gallery-nav-counter">00 / 00</span>
              <button
                type="button"
                className="nk-gallery-nav-btn polaroid-prev-btn"
                disabled
                data-testid="polaroid-prev-btn"
                aria-label="Previous destination slide"
              >
                <ChevronLeft size={18} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                className="nk-gallery-nav-btn polaroid-next-btn"
                disabled
                data-testid="polaroid-next-btn"
                aria-label="Next destination slide"
              >
                <ChevronRight size={18} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeSlide = slides[internalIndex] || slides[0];

  return (
    <div className={`nk-gallery-section-wrapper ${className}`}>
      {/* 1. Full Viewport-Width Hanging Twine Rope (100vw, extreme left to extreme right) */}
      {renderFullViewportRope()}

      {/* 2. Destination Polaroid Gallery Container (transparent floating scrapbook, zero rectangular box) */}
      <div
        ref={galleryRef}
        className="nk-day-gallery"
        data-testid="polaroid-line-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="Daily Sightseeing Destination Gallery"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Upper Viewport: Interactive 3D Clothesline */}
        <div
          className={`nk-polaroid-viewport ${isDragging ? 'is-dragging' : ''}`}
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
          style={{ cursor: slides.length > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {/* Animated Polaroid Track */}
          <div
            className="nk-polaroid-track"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: `${cardGap}px`,
              transform: trackTransform,
              transition: isDragging ? 'none' : 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)',
              width: 'max-content',
            }}
          >
            {slides.map((slide, idx) => {
              const isActive = idx === internalIndex;
              const diff = idx - internalIndex;
              const cardKey = `d${slide.dayNumber || dayNumber}-${slide.id || slide.destinationId || slide.title}-${idx}`;
              const key = slide.id || slide.destinationId || String(idx);

              // Clean, upright modern cards without disruptive tilt or sagging
              let scale = 1;
              const dynamicTilt = 0;
              let opacity = 1;
              const sagOffset = 0;
              let zIndex = 15;

              if (slides.length === 1) {
                scale = 1.02;
                opacity = 1;
                zIndex = 25;
              } else if (slides.length === 2) {
                scale = isActive ? 1.03 : 0.96;
                opacity = isActive ? 1 : 0.88;
                zIndex = isActive ? 25 : 15;
              } else {
                // 3, 4, 5+ destinations: clean horizontal timeline flow
                scale = isActive ? 1.04 : Math.abs(diff) === 1 ? 0.95 : 0.88;
                opacity = isActive ? 1 : Math.abs(diff) === 1 ? 0.9 : Math.max(0.65, 0.85 - Math.abs(diff) * 0.1);
                zIndex = isActive ? 25 : 18 - Math.min(10, Math.abs(diff));
              }

              // Two-tier image resolution:
              // 1. First attempt: backend media proxy URL
              // 2. Fallback attempt on error: direct canonical Wikimedia Commons URL
              // 3. Fallback placeholder if both fail
              const useFallbackUrl = Boolean(imageFallbacks[key]);
              const effectiveSrc = useFallbackUrl
                ? (slide.rawImageUrl || slide.image)
                : (slide.image || slide.rawImageUrl);
              const hasError = Boolean(imageErrors[key]);
              const showImage = Boolean(effectiveSrc && !hasError);

              return (
                <motion.div
                  key={cardKey}
                  data-testid={`polaroid-slide-${idx + 1}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={slide.title}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => selectIndex(idx)}
                  className={`nk-polaroid-card ${isActive ? 'is-active' : 'is-inactive'}`}
                  animate={{
                    scale,
                    rotate: dynamicTilt,
                    opacity,
                    y: sagOffset,
                    zIndex,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 340,
                    damping: 28,
                  }}
                  style={{
                    width: `${cardWidth}px`,
                    minWidth: `${cardWidth}px`,
                    maxWidth: `${cardWidth}px`,
                  }}
                >
                  {/* Wooden Clothespin / Peg clipping card to the rope */}
                  <div className="nk-polaroid-clip" aria-hidden="true">
                    <div className="nk-polaroid-clip-wire" />
                  </div>

                  {/* Photograph Area (Strict Fixed Square Frame) */}
                  <div className="nk-polaroid-image-frame">
                    {showImage ? (
                      <img
                        src={effectiveSrc}
                        alt={slide.title}
                        loading="eager"
                        decoding="async"
                        className="nk-polaroid-image"
                        onError={() => {
                          if (!useFallbackUrl && slide.rawImageUrl && slide.image !== slide.rawImageUrl) {
                            setImageFallbacks((prev) => ({ ...prev, [key]: true }));
                          } else {
                            setImageErrors((prev) => ({ ...prev, [key]: true }));
                          }
                        }}
                      />
                    ) : (
                      /* Clean Branded Fallback Placeholder */
                      <div
                        className="nk-polaroid-placeholder"
                        data-testid={`polaroid-placeholder-day-${slide.dayNumber || idx + 1}`}
                      >
                        <div className="nk-placeholder-icon-wrap">
                          <Compass size={18} strokeWidth={2.2} />
                        </div>
                        <span className="nk-placeholder-district">
                          {slide.district || slide.title}
                        </span>
                        <span className="nk-placeholder-category">
                          {slide.category || 'Sightseeing'}
                        </span>
                      </div>
                    )}

                    {/* Stop Order or Day Badge */}
                    <div className="nk-polaroid-stop-badge">
                      <MapPin size={10} strokeWidth={2.4} />
                      <span>
                        {slide.stopOrder
                          ? `Stop ${slide.stopOrder}`
                          : slide.dayNumber
                          ? `Day ${slide.dayNumber}`
                          : `Stop ${idx + 1}`}
                      </span>
                    </div>

                    {/* Subtle District / City Pill */}
                    {slide.district && (
                      <div className="nk-polaroid-district-badge">
                        <span>{slide.district}</span>
                      </div>
                    )}
                  </div>

                  {/* Polaroid White Chin (Classical serif caption) */}
                  <div className="nk-polaroid-caption">
                    <h4
                      className="nk-polaroid-caption-title"
                      title={slide.polaroidCaption || slide.title}
                    >
                      {slide.polaroidCaption || slide.title}
                    </h4>
                    <span className="nk-polaroid-caption-subtitle">
                      {slide.district ? `${slide.district}${slide.category ? ' · ' : ''}` : ''}{slide.category || ''}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom Area: Selected Day Information & Destination Controls (floating transparently) */}
        <div className="nk-gallery-navigation">
          {/* Left Side: Day Title & Sightseeing Cluster */}
          <div className="nk-gallery-nav-info">
            <h3 className="nk-gallery-nav-title" title={dayTitle || activeSlide.title}>
              {dayTitle || activeSlide.title}
            </h3>
            <p className="nk-gallery-nav-subtitle" title={daySubtitle || activeSlide.caption}>
              {daySubtitle || activeSlide.caption || (activeSlide.district ? `${activeSlide.district} sightseeing` : '')}
            </p>
          </div>

          {/* Right Side: Destination Counter & Navigation Buttons */}
          <div className="nk-gallery-nav-controls">
            <span className="nk-gallery-nav-counter">
              {String(internalIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>

            <button
              type="button"
              className="nk-gallery-nav-btn polaroid-prev-btn"
              onClick={handlePrev}
              disabled={internalIndex === 0}
              data-testid="polaroid-prev-btn"
              aria-label="Previous destination slide"
            >
              <ChevronLeft size={18} strokeWidth={2.4} />
            </button>

            <button
              type="button"
              className="nk-gallery-nav-btn polaroid-next-btn"
              onClick={handleNext}
              disabled={internalIndex === slides.length - 1}
              data-testid="polaroid-next-btn"
              aria-label="Next destination slide"
            >
              <ChevronRight size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolaroidLineCarousel;
