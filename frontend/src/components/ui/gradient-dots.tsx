import React, { useId, useRef, useEffect, useState, useCallback } from 'react';

export interface GradientDotsProps {
  dotSize?: number;
  spacing?: number;
  duration?: number;
  colorCycleDuration?: number;
  backgroundColor?: string;
  className?: string;
  style?: React.CSSProperties;
  interactive?: boolean;
  children?: React.ReactNode;
}

/**
 * GradientDots - A premium light-theme animated pastel gradient background
 * with a delicate repeating dot grid pattern that responds smoothly to pointer
 * and touch interaction.
 *
 * Base palette: Warm white (#FAFCFF), pale blue (#DCEBFF), soft cyan (#CFFAFE),
 * pale mint (#DCFCE7), soft lavender (#EDE9FE), subtle amber (#FEF3C7).
 */
export const GradientDots: React.FC<GradientDotsProps> = ({
  dotSize = 1.5,
  spacing = 20,
  duration = 36,
  colorCycleDuration = 18,
  backgroundColor = '#FAFCFF',
  className = '',
  style,
  interactive = true,
  children,
}) => {
  const patternId = useId();
  const highlightPatternId = `${patternId}-highlight`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  // Check prefers-reduced-motion on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(motionQuery.matches);
      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      motionQuery.addEventListener('change', listener);
      return () => motionQuery.removeEventListener('change', listener);
    }
  }, []);

  // Pointer position coordinates & lerp state
  const targetX = useRef<number>(-999);
  const targetY = useRef<number>(-999);
  const currentX = useRef<number>(-999);
  const currentY = useRef<number>(-999);
  const targetOpacity = useRef<number>(0);
  const currentOpacity = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const touchTimer = useRef<number | null>(null);

  // RAF Lerp loop for silky, fluid pointer-following movement without sudden jumps
  const updatePointer = useCallback(() => {
    if (!containerRef.current) return;

    // Linear interpolation for smooth trailing
    currentX.current += (targetX.current - currentX.current) * 0.16;
    currentY.current += (targetY.current - currentY.current) * 0.16;
    currentOpacity.current += (targetOpacity.current - currentOpacity.current) * 0.14;

    const el = containerRef.current;
    el.style.setProperty('--pointer-x', `${Math.round(currentX.current)}px`);
    el.style.setProperty('--pointer-y', `${Math.round(currentY.current)}px`);
    el.style.setProperty('--pointer-opacity', `${Math.max(0, Math.min(1, currentOpacity.current)).toFixed(3)}`);

    // Continue loop if still moving or fading
    const dist = Math.hypot(targetX.current - currentX.current, targetY.current - currentY.current);
    const opDelta = Math.abs(targetOpacity.current - currentOpacity.current);

    if (dist > 0.5 || opDelta > 0.005) {
      rafId.current = window.requestAnimationFrame(updatePointer);
    } else {
      rafId.current = null;
    }
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (rafId.current === null) {
      rafId.current = window.requestAnimationFrame(updatePointer);
    }
  }, [updatePointer]);

  useEffect(() => {
    if (!interactive || isReducedMotion || typeof window === 'undefined') return;

    const onPointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only activate when pointer is within or reasonably close to container bounds
      if (x >= -60 && y >= -60 && x <= rect.width + 60 && y <= rect.height + 60) {
        targetX.current = x;
        targetY.current = y;
        targetOpacity.current = 1;

        // If initial position was unset (-999), initialize directly so it doesn't fly from far away
        if (currentX.current < -500) {
          currentX.current = x;
          currentY.current = y;
        }

        if (e.pointerType === 'touch') {
          // On touch, illuminate gently and fade naturally after gesture
          if (touchTimer.current) window.clearTimeout(touchTimer.current);
          touchTimer.current = window.setTimeout(() => {
            targetOpacity.current = 0;
            scheduleUpdate();
          }, 850);
        }
        scheduleUpdate();
      } else {
        targetOpacity.current = 0;
        scheduleUpdate();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      onPointerMove(e);
    };

    const onPointerLeave = () => {
      targetOpacity.current = 0;
      scheduleUpdate();
    };

    // Attach passive listeners to window to ensure smooth tracking across all page areas
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerleave', onPointerLeave);
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
      if (touchTimer.current) window.clearTimeout(touchTimer.current);
    };
  }, [interactive, isReducedMotion, scheduleUpdate]);

  return (
    <div
      ref={containerRef}
      className={`gradient-dots-wrapper pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
      data-testid="gradient-dots-background"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor,
        zIndex: 0,
        ...style,
      }}
    >
      {/* 1. Slowly Shifting Soft Pastel Gradient Fields */}
      <div
        className="gradient-dots-blobs-layer"
        style={{
          position: 'absolute',
          inset: '-20%',
          width: '140%',
          height: '140%',
          filter: 'blur(80px)',
          opacity: 0.82,
          animation: isReducedMotion ? 'none' : `pastelCycle ${colorCycleDuration}s ease-in-out infinite alternate`,
        }}
      >
        {/* Blob 1: Soft Cyan & Pale Blue (Upper Left) */}
        <div
          className="gradient-blob blob-cyan"
          style={{
            position: 'absolute',
            top: '12%',
            left: '8%',
            width: '55vw',
            height: '55vw',
            maxWidth: '680px',
            maxHeight: '680px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #CFFAFE 0%, #DCEBFF 65%, transparent 100%)',
            animation: isReducedMotion ? 'none' : `floatSlow1 ${duration}s ease-in-out infinite alternate`,
          }}
        />

        {/* Blob 2: Pale Mint (Upper Right) */}
        <div
          className="gradient-blob blob-mint"
          style={{
            position: 'absolute',
            top: '22%',
            right: '8%',
            width: '50vw',
            height: '50vw',
            maxWidth: '620px',
            maxHeight: '620px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #DCFCE7 0%, #CFFAFE 70%, transparent 100%)',
            animation: isReducedMotion ? 'none' : `floatSlow2 ${duration * 1.25}s ease-in-out infinite alternate`,
          }}
        />

        {/* Blob 3: Soft Lavender (Mid / Lower Left) */}
        <div
          className="gradient-blob blob-lavender"
          style={{
            position: 'absolute',
            bottom: '18%',
            left: '18%',
            width: '56vw',
            height: '56vw',
            maxWidth: '640px',
            maxHeight: '640px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #EDE9FE 0%, #DCEBFF 65%, transparent 100%)',
            animation: isReducedMotion ? 'none' : `floatSlow3 ${duration * 0.9}s ease-in-out infinite alternate`,
          }}
        />

        {/* Blob 4: Subtle Warm Amber (Lower Right) */}
        <div
          className="gradient-blob blob-amber"
          style={{
            position: 'absolute',
            bottom: '14%',
            right: '12%',
            width: '46vw',
            height: '46vw',
            maxWidth: '540px',
            maxHeight: '540px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #FEF3C7 0%, #DCFCE7 70%, transparent 100%)',
            animation: isReducedMotion ? 'none' : `floatSlow4 ${duration * 1.15}s ease-in-out infinite alternate`,
          }}
        />
      </div>

      {/* 2. Interactive Soft Pastel Pointer Glow */}
      {interactive && !isReducedMotion && (
        <div
          className="gradient-dots-pointer-glow"
          data-testid="gradient-dots-pointer-glow"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(360px circle at var(--pointer-x, -999px) var(--pointer-y, -999px), rgba(199, 245, 252, 0.6) 0%, rgba(220, 235, 255, 0.38) 35%, rgba(237, 233, 254, 0.22) 65%, transparent 100%)',
            opacity: 'var(--pointer-opacity, 0)',
            transition: 'opacity 0.3s ease-out',
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* 3. Base Repeating Dot Grid Overlay */}
      <svg
        className="gradient-dots-pattern-svg"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.72,
        }}
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={spacing / 2}
              cy={spacing / 2}
              r={dotSize}
              fill="#BFD5EE"
              fillOpacity="0.65"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* 4. Interactive Illuminated Dot Layer (revealed only around pointer) */}
      {interactive && !isReducedMotion && (
        <div
          className="gradient-dots-pointer-highlight"
          data-testid="gradient-dots-pointer-highlight"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 'var(--pointer-opacity, 0)',
            transition: 'opacity 0.25s ease-out',
            WebkitMaskImage:
              'radial-gradient(260px circle at var(--pointer-x, -999px) var(--pointer-y, -999px), black 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
            maskImage:
              'radial-gradient(260px circle at var(--pointer-x, -999px) var(--pointer-y, -999px), black 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          }}
        >
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <pattern
                id={highlightPatternId}
                x="0"
                y="0"
                width={spacing}
                height={spacing}
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx={spacing / 2}
                  cy={spacing / 2}
                  r={dotSize * 1.5}
                  fill="#0891B2"
                  fillOpacity="0.85"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${highlightPatternId})`} />
          </svg>
        </div>
      )}

      {/* Optional decorative children */}
      {children}
    </div>
  );
};
