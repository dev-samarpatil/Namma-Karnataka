import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RecommendedDestination, Language, DirectionsResponse, DirectionsRequest, Waypoint } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { fetchRoadDirections } from '../../lib/api';

interface MapViewProps {
  stops: RecommendedDestination[];
  language: Language;
  originLabel?: string;
  travelMode?: string;
  activeDayFilter?: number | null;
}

// Karnataka default center
const DEFAULT_CENTER: [number, number] = [14.0, 75.8];
const DEFAULT_ZOOM = 7;

export const MapView: React.FC<MapViewProps> = ({
  stops,
  language,
  originLabel = 'Bengaluru',
  travelMode = 'driving',
  activeDayFilter: initialDayFilter = null,
}) => {
  const { t } = useTranslation(language);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedDay, setSelectedDay] = useState<number | null>(initialDayFilter);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  // Road Routing Data State
  const [directionsData, setDirectionsData] = useState<DirectionsResponse | null>(null);
  const [loadingDirections, setLoadingDirections] = useState<boolean>(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(0);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Group days present in stops
  const availableDays = useMemo(() => {
    const daysSet = new Set<number>();
    for (const s of stops) {
      if (s.day_number) daysSet.add(s.day_number);
    }
    return Array.from(daysSet).sort((a, b) => a - b);
  }, [stops]);

  // Filter stops by selected day if specified
  const effectiveStops = useMemo(() => {
    if (selectedDay === null) return stops;
    return stops.filter((s) => s.day_number === selectedDay);
  }, [stops, selectedDay]);

  // Filter stops with valid coordinates
  const validStops = useMemo(() => {
    return effectiveStops.filter(
      (s) =>
        s.coordinates &&
        s.coordinates.lat >= 11.0 &&
        s.coordinates.lat <= 19.0 &&
        s.coordinates.lon >= 73.0 &&
        s.coordinates.lon <= 79.5
    );
  }, [effectiveStops]);

  const missingCoordsCount = effectiveStops.length - validStops.length;

  // Build directions request payload
  const directionsRequest = useMemo<DirectionsRequest | null>(() => {
    if (validStops.length === 0) return null;

    // Origin: first stop or starting location
    const firstStop = validStops[0];
    const lastStop = validStops[validStops.length - 1];

    const originWaypoint: Waypoint = {
      name: firstStop.name,
      lat: firstStop.coordinates!.lat,
      lon: firstStop.coordinates!.lon,
      stop_id: firstStop.id,
      stop_order: firstStop.order,
      day_number: firstStop.day_number,
    };

    const destWaypoint: Waypoint = {
      name: lastStop.name,
      lat: lastStop.coordinates!.lat,
      lon: lastStop.coordinates!.lon,
      stop_id: lastStop.id,
      stop_order: lastStop.order,
      day_number: lastStop.day_number,
    };

    const intermediateWaypoints: Waypoint[] = validStops.slice(1, -1).map((s) => ({
      name: s.name,
      lat: s.coordinates!.lat,
      lon: s.coordinates!.lon,
      stop_id: s.id,
      stop_order: s.order,
      day_number: s.day_number,
    }));

    return {
      origin: originWaypoint,
      destination: destWaypoint,
      waypoints: intermediateWaypoints,
      travel_mode: travelMode,
      day_number: selectedDay || undefined,
    };
  }, [validStops, travelMode, selectedDay]);

  // Fetch real road route directions from backend
  useEffect(() => {
    if (!directionsRequest) {
      setDirectionsData(null);
      return;
    }

    let isMounted = true;
    setLoadingDirections(true);
    setDirectionsError(null);

    fetchRoadDirections(directionsRequest)
      .then((res) => {
        if (isMounted) {
          setDirectionsData(res);
          setLoadingDirections(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Road routing request error:', err);
          setDirectionsError('Unable to fetch live road network geometry. Showing regional estimates.');
          setLoadingDirections(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [directionsRequest]);

  // Leaflet Map Initialization & Rendering
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        routeLayerGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const layerGroup = routeLayerGroupRef.current;
      if (!map || !layerGroup) return;

      layerGroup.clearLayers();

      // Invalidate size in next frame to handle tab switches and container resizing
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          // ignore in testing environments
        }
      }, 50);

      const latLngsToFit: L.LatLngExpression[] = [];

      // 1. Draw Road Route Polylines
      if (directionsData && directionsData.all_coordinates && directionsData.all_coordinates.length > 0) {
        const polyCoords: [number, number][] = directionsData.all_coordinates.map((pt) => [pt[0], pt[1]]);
        const polyline = L.polyline(polyCoords, {
          color: '#0284c7',
          weight: 5,
          opacity: 0.85,
          smoothFactor: 1.0,
          lineJoin: 'round',
        });
        layerGroup.addLayer(polyline);

        for (const pt of polyCoords) {
          latLngsToFit.push([pt[0], pt[1]]);
        }
      } else if (validStops.length > 1) {
        // Fallback straight-line polyline if geometry not returned yet
        const directCoords: [number, number][] = validStops.map((s) => [s.coordinates!.lat, s.coordinates!.lon]);
        const polyline = L.polyline(directCoords, {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.7,
          dashArray: '8, 8',
        });
        layerGroup.addLayer(polyline);
        for (const pt of directCoords) {
          latLngsToFit.push(pt);
        }
      }

      // 2. Add Numbered Markers for each destination
      validStops.forEach((stop, index) => {
        const isStart = index === 0;
        const isEnd = index === validStops.length - 1 && validStops.length > 1;

        const pinColor = isStart ? '#10b981' : isEnd ? '#8b5cf6' : '#0284c7';
        const badgeLabel = isStart ? 'S' : isEnd ? 'E' : `${index + 1}`;

        const customIcon = L.divIcon({
          className: 'custom-route-marker',
          html: `
            <div
              data-testid="map-marker-${stop.id}"
              style="
              width: 30px;
              height: 30px;
              background: ${pinColor};
              color: #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 0.8rem;
              border: 2px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              cursor: pointer;
            ">
              ${badgeLabel}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15],
        });

        const marker = L.marker([stop.coordinates!.lat, stop.coordinates!.lon], { icon: customIcon });

        const popupContent = document.createElement('div');
        popupContent.style.minWidth = '180px';
        popupContent.style.fontFamily = 'inherit';
        popupContent.innerHTML = `
          <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">
            Day ${stop.day_number} · Stop #${stop.order}
          </div>
          <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a; margin: 2px 0;">
            ${stop.name}
          </div>
          <div style="font-size: 0.8rem; color: #475569;">
            📍 ${stop.district_name || stop.district_code} • ${stop.category}
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => setActiveStopId(stop.id));

        layerGroup.addLayer(marker);
        latLngsToFit.push([stop.coordinates!.lat, stop.coordinates!.lon]);
      });

      // Fit map bounds to encompass all waypoints & route
      if (latLngsToFit.length > 0) {
        try {
          map.fitBounds(L.latLngBounds(latLngsToFit), { padding: [40, 40], maxZoom: 14 });
        } catch {
          // ignore in headless environments
        }
      }
    } catch (e) {
      console.warn('Leaflet map initialization skipped or not supported:', e);
    }
  }, [viewMode, validStops, directionsData]);

  // Clean up Leaflet instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="map-view-container" data-testid="itinerary-map-view">
      {/* Map Header & Controls */}
      <div className="map-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div>
          <h4 className="map-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🗺️</span> {t('mapTitle')}
            {directionsData && (
              <span style={{ fontSize: '0.75rem', background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                🛣️ {directionsData.provider.toUpperCase()} Road Route
              </span>
            )}
          </h4>
          <p className="map-subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            {directionsData
              ? `Real road routing from ${originLabel}: ${directionsData.total_distance_km} km • ~${Math.floor(directionsData.total_duration_minutes / 60)}h ${directionsData.total_duration_minutes % 60}m travel time`
              : `${t('mapNote')} (${originLabel})`}
          </p>
        </div>

        <div className="map-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {loadingDirections && (
            <span style={{ fontSize: '0.78rem', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>🔄</span> {language === 'kn' ? 'ಮಾರ್ಗ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತಿದೆ...' : 'Routing...'}
            </span>
          )}

          {directionsData?.google_maps_url && (
            <a
              href={directionsData.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-google-maps-nav"
              data-testid="open-google-maps-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #38bdf8',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span>🧭</span> {language === 'kn' ? 'ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್‌ನಲ್ಲಿ ತೆರೆಯಿರಿ ↗' : 'Open in Google Maps ↗'}
            </a>
          )}

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

      {/* Selected Marker Detail Card */}
      {activeStopId && (
        <div
          className="active-marker-card"
          style={{
            background: 'var(--bg-card, #182238)',
            border: '1px solid var(--accent-cyan, #38bdf8)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Selected Map Destination</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #f8fafc)' }}>
              {validStops.find((s) => s.id === activeStopId)?.name || 'Destination'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveStopId(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Day Filter Tabs */}
      {availableDays.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              border: selectedDay === null ? '2px solid #38bdf8' : '1px solid #334155',
              background: selectedDay === null ? '#0284c7' : '#1e293b',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {language === 'kn' ? 'ಎಲ್ಲಾ ದಿನಗಳು' : 'All Days'} ({stops.length} stops)
          </button>
          {availableDays.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                border: selectedDay === d ? '2px solid #38bdf8' : '1px solid #334155',
                background: selectedDay === d ? '#0284c7' : '#1e293b',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Day {d}
            </button>
          ))}
        </div>
      )}

      {/* Warnings & Notices */}
      {missingCoordsCount > 0 && (
        <div className="map-warning-banner" style={{ marginBottom: '10px' }}>
          ⚠️ {missingCoordsCount} stop(s) do not have verified GPS coordinates and are listed in text view only.
        </div>
      )}

      {directionsError && (
        <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', color: '#fef08a', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '10px' }}>
          ℹ️ {directionsError}
        </div>
      )}

      {/* Main View Area: Map or List Alternative */}
      {viewMode === 'list' ? (
        <div className="map-list-alternative" data-testid="map-list-alternative">
          <h5>Destination Location Coordinates (List Alternative)</h5>
          <ul className="coord-list">
            {effectiveStops.map((stop) => (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Leaflet Interactive Road Map Container */}
          <div
            ref={mapContainerRef}
            id="road-route-leaflet-map"
            style={{
              width: '100%',
              height: '420px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid #334155',
              background: '#0f172a',
            }}
          />

          {/* Turn-by-Turn Leg Directions Panel */}
          {directionsData && directionsData.legs && directionsData.legs.length > 0 && (
            <div
              className="directions-panel"
              data-testid="route-directions-panel"
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <h5 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🧭</span> {language === 'kn' ? 'ಪ್ರವಾಸ ಮಾರ್ಗ ಸೂಚಿಗಳು' : 'Leg-by-Leg Road Directions'} ({directionsData.legs.length} legs)
              </h5>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {directionsData.legs.map((leg, legIdx) => {
                  const isExpanded = expandedLegIndex === legIdx;
                  return (
                    <div
                      key={legIdx}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedLegIndex(isExpanded ? null : legIdx)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'transparent',
                          border: 'none',
                          color: '#f1f5f9',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div>
                          <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: '8px' }}>Leg {legIdx + 1}:</span>
                          <span style={{ fontWeight: 600 }}>{leg.origin.name} → {leg.destination.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {leg.distance_km} km • {leg.duration_minutes} mins
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isExpanded && leg.steps.length > 0 && (
                        <div style={{ padding: '8px 14px 12px 14px', borderTop: '1px solid #1e293b', background: '#0a0f1d' }}>
                          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                            {leg.steps.map((st, stepIdx) => (
                              <li key={stepIdx} style={{ margin: '4px 0' }}>
                                {st.instruction}
                                {st.distance_meters > 0 && (
                                  <span style={{ color: '#64748b', marginLeft: '6px' }}>
                                    ({st.distance_meters > 1000 ? `${(st.distance_meters / 1000).toFixed(1)} km` : `${Math.round(st.distance_meters)} m`})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
