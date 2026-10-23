import React, { useState } from 'react';
import { RecommendedDestination, Language } from '../../types';
import { useTranslation } from '../../lib/i18n';

interface MapViewProps {
  stops: RecommendedDestination[];
  language: Language;
}

// Karnataka Geographic Bounds
const MIN_LAT = 11.5;
const MAX_LAT = 18.5;
const MIN_LON = 74.0;
const MAX_LON = 78.6;

const SVG_WIDTH = 600;
const SVG_HEIGHT = 700;
const PADDING = 40;

function projectToSvg(lat: number, lon: number): { x: number; y: number } {
  const normX = (lon - MIN_LON) / (MAX_LON - MIN_LON);
  const normY = (MAX_LAT - lat) / (MAX_LAT - MIN_LAT);

  const x = PADDING + normX * (SVG_WIDTH - 2 * PADDING);
  const y = PADDING + normY * (SVG_HEIGHT - 2 * PADDING);
  return { x, y };
}

export const MapView: React.FC<MapViewProps> = ({ stops, language }) => {
  const { t } = useTranslation(language);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Filter stops that have valid coordinates
  const validStops = stops.filter(
    (s) =>
      s.coordinates &&
      s.coordinates.lat >= MIN_LAT &&
      s.coordinates.lat <= MAX_LAT &&
      s.coordinates.lon >= MIN_LON &&
      s.coordinates.lon <= MAX_LON
  );

  const missingCoordsCount = stops.length - validStops.length;

  const activeStop = stops.find((s) => s.id === activeStopId);

  return (
    <div className="map-view-container" data-testid="itinerary-map-view">
      <div className="map-header">
        <div>
          <h4 className="map-title">🗺️ {t('mapTitle')}</h4>
          <p className="map-subtitle">{t('mapNote')}</p>
        </div>

        <div className="map-controls">
          <button
            type="button"
            className="btn-toggle-view"
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            data-testid="toggle-map-list-view"
          >
            {viewMode === 'map' ? `📋 ${t('toggleListView')}` : `🗺️ ${t('toggleMapView')}`}
          </button>
        </div>
      </div>

      {missingCoordsCount > 0 && (
        <div className="map-warning-banner">
          ⚠️ {missingCoordsCount} stop(s) do not have verified GPS coordinates and are listed in text view only.
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="map-list-alternative" data-testid="map-list-alternative">
          <h5>Destination Location Coordinates (List Alternative)</h5>
          <ul className="coord-list">
            {stops.map((stop) => (
              <li key={stop.id} className="coord-item">
                <span className="coord-stop-badge">Day {stop.day_number} · #{stop.order}</span>
                <strong>{stop.name}</strong> ({stop.district_name || stop.district_code})
                {stop.coordinates ? (
                  <span className="coord-text">
                    📍 {stop.coordinates.lat.toFixed(4)}° N, {stop.coordinates.lon.toFixed(4)}° E
                  </span>
                ) : (
                  <span className="coord-unavailable">Coordinates not available</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="svg-map-wrapper">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="karnataka-map-svg"
            role="img"
            aria-label="Karnataka Destination Sequence Map"
          >
            {/* Background Map Frame */}
            <rect
              x="10"
              y="10"
              width={SVG_WIDTH - 20}
              height={SVG_HEIGHT - 20}
              rx="12"
              className="map-bg"
            />

            {/* Grid references */}
            <text x="20" y="30" className="map-grid-text">18.5° N (North Karnataka)</text>
            <text x="20" y={SVG_HEIGHT - 20} className="map-grid-text">11.5° N (South Karnataka)</text>
            <text x={SVG_WIDTH - 160} y={SVG_HEIGHT - 20} className="map-grid-text">78.5° E (East)</text>
            <text x="20" y="50" className="map-grid-text">74.0° E (West / Arabian Sea)</text>

            {/* Straight-line connection paths */}
            {validStops.length > 1 && (
              <path
                d={validStops
                  .map((stop, i) => {
                    const { x, y } = projectToSvg(stop.coordinates!.lat, stop.coordinates!.lon);
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                className="sequence-line"
              />
            )}

            {/* Markers */}
            {validStops.map((stop) => {
              const { x, y } = projectToSvg(stop.coordinates!.lat, stop.coordinates!.lon);
              const isActive = stop.id === activeStopId;

              return (
                <g
                  key={stop.id}
                  transform={`translate(${x}, ${y})`}
                  className={`map-marker ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveStopId(stop.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${stop.name}, Day ${stop.day_number} Stop ${stop.order}`}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveStopId(stop.id)}
                  data-testid={`map-marker-${stop.id}`}
                >
                  <circle r={isActive ? 16 : 12} className="marker-circle" />
                  <text textAnchor="middle" dy=".3em" className="marker-number">
                    {stop.day_number}.{stop.order}
                  </text>
                  <text y="-18" textAnchor="middle" className="marker-label">
                    {stop.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {activeStop && (
            <div className="active-marker-card" data-testid="active-marker-card">
              <div className="active-marker-header">
                <span className="badge">Day {activeStop.day_number} · Stop #{activeStop.order}</span>
                <button
                  type="button"
                  className="close-sm"
                  onClick={() => setActiveStopId(null)}
                >
                  ✕
                </button>
              </div>
              <h4>{activeStop.name}</h4>
              <p className="active-marker-district">📍 {activeStop.district_name || activeStop.district_code}</p>
              <p className="active-marker-rationale">{activeStop.rationale}</p>
              {activeStop.coordinates && (
                <p className="active-marker-coords">
                  {activeStop.coordinates.lat.toFixed(4)}° N, {activeStop.coordinates.lon.toFixed(4)}° E
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
