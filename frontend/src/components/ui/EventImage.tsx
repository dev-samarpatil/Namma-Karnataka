import React, { useState } from 'react';
import { Ticket, Landmark, Leaf, Sparkles, Calendar } from 'lucide-react';
import { getApiBaseUrl } from '../../lib/api';
import { getLocalFestivalImage } from '../../lib/festivalImages';

export interface EventImageProps {
  src?: string | null;
  eventId?: string | null;
  alt: string;
  category?: string;
  className?: string;
  style?: React.CSSProperties;
  aspectRatio?: string;
  loading?: 'lazy' | 'eager';
}

export const EventImage: React.FC<EventImageProps> = ({
  src,
  eventId,
  alt,
  category,
  className = '',
  style,
  aspectRatio,
  loading = 'lazy',
}) => {
  // Resolve local image path if available for the given event ID or src
  const localImage = getLocalFestivalImage(eventId) || getLocalFestivalImage(src);
  const initialUrl = localImage || (src ? src.trim() : '');

  const [isLoading, setIsLoading] = useState<boolean>(Boolean(initialUrl));
  const [hasError, setHasError] = useState<boolean>(!initialUrl);
  const [useDirectFallback, setUseDirectFallback] = useState<boolean>(false);

  const getEffectiveSrc = (): string => {
    if (!initialUrl) return '';
    // If it's a local asset or data URL, load directly
    if (initialUrl.startsWith('/') || initialUrl.startsWith('data:')) {
      return initialUrl;
    }
    // If we've already tried proxy and it failed, retry direct URL
    if (useDirectFallback) {
      return initialUrl;
    }
    // Otherwise use backend media proxy
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    return `${baseUrl}/destinations/media/proxy?url=${encodeURIComponent(initialUrl)}`;
  };

  const handleImageError = () => {
    if (!useDirectFallback && initialUrl && !initialUrl.startsWith('/') && !initialUrl.startsWith('data:')) {
      // First retry with direct URL
      setUseDirectFallback(true);
    } else {
      // Fallback permanently: shows clean designed placeholder
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const renderCategoryIcon = () => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('nature') || cat.includes('monsoon') || cat.includes('flower') || cat.includes('seasonal')) {
      return <Leaf size={24} color="#059669" />;
    }
    if (cat.includes('heritage') || cat.includes('temple') || cat.includes('dance') || cat.includes('history')) {
      return <Landmark size={24} color="#B45309" />;
    }
    if (cat.includes('major') || cat.includes('dasara') || cat.includes('karaga') || cat.includes('rajyotsava')) {
      return <Sparkles size={24} color="#D97706" />;
    }
    return <Ticket size={24} color="#0891B2" />;
  };

  return (
    <div
      className={`event-image-container ${className}`}
      data-testid="event-image-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        aspectRatio: aspectRatio || undefined,
        overflow: 'hidden',
        borderRadius: '8px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Loading Skeleton */}
      {isLoading && !hasError && (
        <div
          data-testid="event-image-skeleton"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear',
            zIndex: 1,
          }}
        />
      )}

      {/* Actual Image (hidden on error to avoid browser broken icon or alt text spill) */}
      {!hasError && initialUrl && (
        <img
          src={getEffectiveSrc()}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
          data-testid="event-card-image"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: hasError ? 'none' : 'block',
            transition: 'opacity 0.25s ease',
            opacity: isLoading ? 0 : 1,
            zIndex: 2,
          }}
        />
      )}

      {/* Designed Neutral Fallback Placeholder (Never displays broken image icon or raw alt text) */}
      {(hasError || !initialUrl) && (
        <div
          data-testid="event-image-fallback"
          className="event-image-fallback"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F8FAFC',
            color: '#64748B',
            padding: '16px 12px',
            textAlign: 'center',
            gap: '8px',
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {renderCategoryIcon()}
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#334155',
              lineHeight: 1.2,
            }}
          >
            {category ? category.replace(/_/g, ' ') : 'Cultural Festival'}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
            }}
          >
            <Calendar size={11} color="#94A3B8" /> Official Event
          </span>
        </div>
      )}
    </div>
  );
};

export default EventImage;
