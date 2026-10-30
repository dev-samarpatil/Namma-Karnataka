import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  ArrowDown,
} from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from '../../lib/i18n';

export interface ScrollExpansionHeroProps {
  language: Language;
  onExploreClick?: () => void;
  onPlanClick?: () => void;
}

export const ScrollExpansionHero: React.FC<ScrollExpansionHeroProps> = ({
  language,
  onExploreClick,
  onPlanClick,
}) => {
  const { t } = useTranslation(language);
  const containerRef = useRef<HTMLDivElement>(null);
  const frontVideoRef = useRef<HTMLVideoElement>(null);

  // Audio state: default to gentle low volume (approx 22%)
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Scroll progress from 0 (compact) to 1 (expanded)
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Dynamic window dimensions for smooth interpolation
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Video assets: back.mp4 for rich cinematic background, front-.mp4 for sharp center focus
  const backgroundVideoSrc = '/back.mp4';
  const frontVideoSrc = '/front-.mp4';

  // Initialize gentle audio volume on front-.mp4 with browser autoplay resilience
  useEffect(() => {
    const video = frontVideoRef.current;
    if (!video) return;

    video.volume = 0.22;
    video.muted = false;
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsMuted(false);
        })
        .catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});

          const unmuteOnInteraction = () => {
            if (video) {
              video.muted = false;
              video.volume = 0.22;
              setIsMuted(false);
            }
            window.removeEventListener('click', unmuteOnInteraction);
            window.removeEventListener('scroll', unmuteOnInteraction);
            window.removeEventListener('touchstart', unmuteOnInteraction);
            window.removeEventListener('keydown', unmuteOnInteraction);
          };

          window.addEventListener('click', unmuteOnInteraction, { once: true, passive: true });
          window.addEventListener('scroll', unmuteOnInteraction, { once: true, passive: true });
          window.addEventListener('touchstart', unmuteOnInteraction, { once: true, passive: true });
          window.addEventListener('keydown', unmuteOnInteraction, { once: true, passive: true });
        });
    }
  }, []);

  // Update window dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll tracking across the runway container
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const totalScrollable = rect.height - windowHeight;

    if (totalScrollable <= 0) {
      setScrollProgress(0);
      return;
    }

    // rect.top goes from 0 down to -totalScrollable as the user scrolls
    const scrolled = -rect.top;
    const progress = Math.min(1, Math.max(0, scrolled / totalScrollable));
    setScrollProgress(progress);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [handleScroll]);

  const handleSkipToExplore = () => {
    if (containerRef.current) {
      const bottom = containerRef.current.offsetTop + containerRef.current.offsetHeight;
      window.scrollTo({ top: bottom, behavior: 'smooth' });
    } else if (onExploreClick) {
      onExploreClick();
    }
  };

  const isMobile = windowDimensions.width < 768;
  const easeProgress = Math.pow(scrollProgress, 0.85);

  // Compact initial dimensions at scrollProgress = 0
  const initialWidth = isMobile ? 290 : 400;
  const initialHeight = isMobile ? 180 : 240;

  // Fully expanded dimensions at scrollProgress = 1
  const maxTargetWidth = isMobile
    ? Math.round(windowDimensions.width * 0.92)
    : Math.min(1160, Math.round(windowDimensions.width * 0.94));
  const maxTargetHeight = isMobile
    ? Math.round(windowDimensions.height * 0.62)
    : Math.min(560, Math.round(windowDimensions.height * 0.72));

  const panelWidth = Math.round(initialWidth + (maxTargetWidth - initialWidth) * easeProgress);
  const panelHeight = Math.round(initialHeight + (maxTargetHeight - initialHeight) * easeProgress);
  const panelRadius = Math.round(20 - easeProgress * 10);

  // Heading split translations (DISCOVER moves up-left, KARNATAKA moves down-right)
  const textTranslateX1 = -easeProgress * (isMobile ? 16 : 42);
  const textTranslateX2 = easeProgress * (isMobile ? 16 : 42);
  const textTranslateY1 = -easeProgress * (isMobile ? 10 : 20);
  const textTranslateY2 = easeProgress * (isMobile ? 10 : 20);

  return (
    <div
      ref={containerRef}
      className="scroll-hero-runway hero-section"
      style={{
        position: 'relative',
        width: '100%',
        height: isMobile ? '160vh' : '185vh',
        background: '#FAFCFF',
      }}
    >
      {/* Sticky Cinematic Viewport */}
      <div
        className="scroll-hero-viewport"
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAFCFF',
          padding: isMobile ? '24px 16px' : '40px 24px',
        }}
      >
        {/* 1. Cinematic Background Video (back.mp4) — Crisp, Rich, Recognizable */}
        <div
          className="scroll-hero-background-layer"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <video
            data-testid="hero-background-video"
            src={backgroundVideoSrc}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              opacity: 0.96,
              filter: `brightness(${0.94 - easeProgress * 0.12}) contrast(1.02)`,
              transform: `scale(${1.02 + easeProgress * 0.04})`,
              transition: 'opacity 0.2s ease-out, filter 0.2s ease-out',
            }}
          />
        </div>

        {/* 2. Restrained Vignette & Edge Blend (NO white fog!) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 95% 85% at center, transparent 72%, rgba(250, 252, 255, 0.25) 90%, rgba(250, 252, 255, 0.75) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* 3. Subtle bottom edge fade into light theme canvas (48px) */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '48px',
            background: 'linear-gradient(to bottom, transparent 0%, #FAFCFF 100%)',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        />

        {/* 4. Central Cinematic Composition */}
        <div
          className="hero-center-stage"
          style={{
            position: 'relative',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 16px',
          }}
        >
          {/* Top Heading Line (e.g. "DISCOVER" / "ಕರ್ನಾಟಕವನ್ನು") */}
          <div
            className="hero-heading-line-top"
            style={{
              fontFamily:
                language === 'kn'
                  ? 'var(--font-kannada, "Noto Sans Kannada", sans-serif)'
                  : 'var(--font-display, "Space Grotesk", sans-serif)',
              fontSize: isMobile ? 'clamp(2.6rem, 11vw, 4rem)' : 'clamp(4.2rem, 7.8vw, 6.4rem)',
              fontWeight: 800,
              letterSpacing: language === 'kn' ? '-0.01em' : '-0.03em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textShadow:
                '0 4px 20px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.9)',
              transform: `translateY(${18 + textTranslateY1}px) translateX(${textTranslateX1}px)`,
              transition: 'transform 0.1s linear',
              lineHeight: 0.95,
              userSelect: 'none',
              zIndex: 10,
              textAlign: 'center',
            }}
          >
            {language === 'kn' ? t('heroDiscover') : 'DISCOVER'}
          </div>

          {/* Central Expanding Media Panel (front-.mp4 in sharp focus) */}
          <div
            className="hero-central-media-panel"
            style={{
              width: `${panelWidth}px`,
              height: `${panelHeight}px`,
              borderRadius: `${panelRadius}px`,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.22)',
              zIndex: 15,
              background: 'transparent',
              transition: 'border-radius 0.15s ease-out, box-shadow 0.2s ease-out',
            }}
          >
            <video
              ref={frontVideoRef}
              data-testid="hero-front-video"
              src={frontVideoSrc}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                transform: 'scale(1.33)',
                transformOrigin: 'center center',
              }}
            />

            {/* Discreet Sound Control (tuned to 22% gentle volume) */}
            <button
              type="button"
              data-testid="video-sound-toggle"
              onClick={(e) => {
                e.stopPropagation();
                if (frontVideoRef.current) {
                  const nextMuted = !isMuted;
                  frontVideoRef.current.muted = nextMuted;
                  frontVideoRef.current.volume = 0.22;
                  setIsMuted(nextMuted);
                }
              }}
              aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                zIndex: 25,
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '9999px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#f8fafc',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                transition: 'background 0.2s ease, transform 0.15s ease',
              }}
            >
              {isMuted ? <VolumeX size={17} strokeWidth={2.2} /> : <Volume2 size={17} strokeWidth={2.2} />}
            </button>
          </div>

          {/* Bottom Heading Line (e.g. "KARNATAKA" / "ಅನ್ವೇಷಿಸಿ") */}
          <div
            className="hero-heading-line-bottom"
            style={{
              fontFamily:
                language === 'kn'
                  ? 'var(--font-kannada, "Noto Sans Kannada", sans-serif)'
                  : 'var(--font-display, "Space Grotesk", sans-serif)',
              fontSize: isMobile ? 'clamp(2.6rem, 11vw, 4rem)' : 'clamp(4.2rem, 7.8vw, 6.4rem)',
              fontWeight: 800,
              letterSpacing: language === 'kn' ? '-0.01em' : '-0.03em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              textShadow:
                '0 4px 20px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.9)',
              transform: `translateY(${-18 + textTranslateY2}px) translateX(${textTranslateX2}px)`,
              transition: 'transform 0.1s linear',
              lineHeight: 0.95,
              userSelect: 'none',
              zIndex: 10,
              textAlign: 'center',
            }}
          >
            {language === 'kn' ? t('heroKarnataka') : 'KARNATAKA'}
          </div>

          {/* Supporting Line (Fades out gracefully as panel expands) */}
          <div
            className="hero-supporting-line"
            style={{
              fontFamily: 'var(--font-family)',
              maxWidth: '680px',
              textAlign: 'center',
              marginTop: isMobile ? '10px' : '16px',
              fontSize: isMobile ? '0.88rem' : '1.05rem',
              color: '#FFFFFF',
              lineHeight: 1.5,
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
              opacity: Math.max(0, 1 - easeProgress * 1.5),
              transition: 'opacity 0.2s ease-out',
              pointerEvents: easeProgress > 0.6 ? 'none' : 'auto',
            }}
          >
            {t('heroSupportingLine')}
          </div>

          {/* Direct Action Buttons (Fade out as video panel takes full stage) */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              zIndex: 20,
              opacity: Math.max(0, 1 - easeProgress * 1.5),
              transition: 'opacity 0.2s ease-out',
              pointerEvents: easeProgress > 0.6 ? 'none' : 'auto',
            }}
          >
            {onExploreClick && (
              <button
                type="button"
                onClick={onExploreClick}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  background: '#0891B2',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(8, 145, 178, 0.35)',
                  cursor: 'pointer',
                }}
              >
                <Compass size={17} strokeWidth={2.2} />
                <span>{t('landingBtnExplore')}</span>
              </button>
            )}
            {onPlanClick && (
              <button
                type="button"
                onClick={onPlanClick}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.92)',
                  color: '#172033',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={17} strokeWidth={2.2} />
                <span>{t('landingBtnPlan')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Scroll Indicator Cue (Bottom-Center) */}
        <div
          className="scroll-cue"
          style={{
            position: 'absolute',
            bottom: '12px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            color: '#475569',
            fontSize: '0.78rem',
            zIndex: 25,
            opacity: Math.max(0, 1 - easeProgress * 2),
            pointerEvents: easeProgress > 0.5 ? 'none' : 'auto',
          }}
        >
          <button
            type="button"
            onClick={handleSkipToExplore}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'inherit',
              padding: '4px 8px',
            }}
            aria-label={t('heroSkipCue')}
          >
            <span>{t('heroScrollCue')}</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                animation: 'bounceSlow 2s infinite',
              }}
            >
              <ArrowDown size={14} strokeWidth={2.2} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
