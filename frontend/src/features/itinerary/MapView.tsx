import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RecommendedDestination, DayPlan, Language, DirectionsResponse, DirectionsRequest, Waypoint } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { fetchRoadDirections } from '../../lib/api';

interface MapViewProps {
  stops: RecommendedDestination[];
  dayPlans?: DayPlan[];
  language: Language;
  originLabel?: string;
  travelMode?: string;
  activeDayFilter?: number | null;
}

// Major Karnataka origin hub coordinates registry
const ORIGIN_HUB_COORDINATES: Record<string, [number, number]> = {
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  mysuru: [12.3051, 76.6551],
  mysore: [12.3051, 76.6551],
  mangaluru: [12.9141, 74.8560],
  mangalore: [12.9141, 74.8560],
  hubballi: [15.3647, 75.1240],
  hubli: [15.3647, 75.1240],
  dharwad: [15.4589, 75.0078],
  belagavi: [15.8497, 74.4977],
  belgaum: [15.8497, 74.4977],
  shivamogga: [13.9299, 75.5681],
  shimoga: [13.9299, 75.5681],
  hassan: [13.0033, 76.1004],
  chikkamagaluru: [13.3161, 75.7720],
  chikmagalur: [13.3161, 75.7720],
  madikeri: [12.4244, 75.7382],
  coorg: [12.4244, 75.7382],
  udupi: [13.3409, 74.7421],
  gokarna: [14.5433, 74.3167],
  karwar: [14.8136, 74.1297],
  hampi: [15.3350, 76.4600],
  hosapete: [15.2689, 76.3909],
  ballari: [15.1394, 76.9214],
  badami: [15.9189, 75.6833],
  bagalkote: [16.1817, 75.6958],
  vijayapura: [16.8319, 75.7289],
  kalaburagi: [17.3297, 76.8343],
  bidar: [17.9104, 77.5199],
  chitradurga: [14.2251, 76.3980],
  davanagere: [14.4644, 75.9218],
  tumakuru: [13.3379, 77.1010],
  kolar: [13.1367, 78.1292],
  ramanagara: [12.7209, 77.2799],
  chamarajanagar: [11.9261, 76.9437],
};

function getOriginCoords(label: string): [number, number] {
  const clean = label.trim().toLowerCase();
  for (const [key, coords] of Object.entries(ORIGIN_HUB_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return coords;
    }
  }
  return [12.9716, 77.5946];
}

// Karnataka default center
const DEFAULT_CENTER: [number, number] = [14.0, 75.8];
const DEFAULT_ZOOM = 7;

export const MapView: React.FC<MapViewProps> = ({
  stops,
  dayPlans = [],
  language,
  originLabel = 'Bengaluru',
  travelMode = 'driving',
  activeDayFilter: initialDayFilter = null,
}) => {
  const { t } = useTranslation(language);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedDay, setSelectedDay] = useState<number | null>(initialDayFilter);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  // Synchronize internal day selection when parent activeDayFilter changes
  useEffect(() => {
    setSelectedDay(initialDayFilter);
  }, [initialDayFilter]);

  // Road Routing Data State
  const [directionsData, setDirectionsData] = useState<DirectionsResponse | null>(null);
  const [loadingDirections, setLoadingDirections] = useState<boolean>(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(0);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const activeRouteKeyRef = useRef<string>('');

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

  // Current day plan details if single day selected
  const currentDayPlan = useMemo(() => {
    if (selectedDay === null) return null;
    return dayPlans.find((dp) => dp.day_number === selectedDay) || null;
  }, [dayPlans, selectedDay]);

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

  // Derive authentic ordered waypoints for the current selection (including true start and stay/return endpoints)
  const dayWaypoints = useMemo<{
    startWaypoint: Waypoint | null;
    attractionWaypoints: Waypoint[];
    endWaypoint: Waypoint | null;
    allOrderedWaypoints: Waypoint[];
  }>(() => {
    if (validStops.length === 0) {
      return { startWaypoint: null, attractionWaypoints: [], endWaypoint: null, allOrderedWaypoints: [] };
    }

    const originCoords = getOriginCoords(originLabel);

    if (selectedDay !== null) {
      // Single Day View
      let startWp: Waypoint;
      const currPlan = dayPlans.find((dp) => dp.day_number === selectedDay);
      if (selectedDay === 1) {
        const startLat = currPlan?.start_coordinates?.lat ?? originCoords[0];
        const startLon = currPlan?.start_coordinates?.lon ?? originCoords[1];
        startWp = {
          name: currPlan?.start_location_name || originLabel,
          lat: startLat,
          lon: startLon,
          stop_id: 'trip-origin',
          stop_order: 0,
          day_number: 1,
        };
      } else {
        const prevPlan = dayPlans.find((dp) => dp.day_number === selectedDay - 1);
        const prevStay = prevPlan?.stops.find((s) => s.stop_type === 'accommodation');
        if (currPlan?.start_coordinates) {
          startWp = {
            name: currPlan.start_location_name || prevStay?.name || `Overnight Stay (Day ${selectedDay - 1})`,
            lat: currPlan.start_coordinates.lat,
            lon: currPlan.start_coordinates.lon,
            stop_id: prevStay?.stop_id || `start-day-${selectedDay}`,
            stop_order: 0,
            day_number: selectedDay,
          };
        } else if (prevStay?.coordinates) {
          startWp = {
            name: prevStay.name || `Overnight Stay (Day ${selectedDay - 1})`,
            lat: prevStay.coordinates.lat,
            lon: prevStay.coordinates.lon,
            stop_id: prevStay.stop_id,
            stop_order: 0,
            day_number: selectedDay,
          };
        } else {
          startWp = {
            name: currPlan?.start_location_name || originLabel,
            lat: originCoords[0],
            lon: originCoords[1],
            stop_id: `start-day-${selectedDay}`,
            stop_order: 0,
            day_number: selectedDay,
          };
        }
      }

      const attrWps: Waypoint[] = validStops.map((s, idx) => ({
        name: s.name,
        lat: s.coordinates!.lat,
        lon: s.coordinates!.lon,
        stop_id: s.id,
        stop_order: idx + 1,
        day_number: s.day_number,
      }));

      let endWp: Waypoint | null = null;
      const currStay = currPlan?.stops.find((s) => s.stop_type === 'accommodation');
      const hasReturnTransit = currPlan?.stops.some((s) => s.stop_type === 'transport');

      if (currStay?.coordinates) {
        endWp = {
          name: currStay.name || `Overnight Stay (Day ${selectedDay})`,
          lat: currStay.coordinates.lat,
          lon: currStay.coordinates.lon,
          stop_id: currStay.stop_id,
          stop_order: attrWps.length + 1,
          day_number: selectedDay,
        };
      } else if (hasReturnTransit) {
        endWp = {
          name: `Return to ${originLabel}`,
          lat: originCoords[0],
          lon: originCoords[1],
          stop_id: 'return-origin',
          stop_order: attrWps.length + 1,
          day_number: selectedDay,
        };
      } else if (attrWps.length > 1) {
        endWp = attrWps[attrWps.length - 1];
      }

      const allOrdered: Waypoint[] = [startWp];
      for (const a of attrWps) {
        if (!endWp || a.stop_id !== endWp.stop_id) {
          allOrdered.push(a);
        }
      }
      if (endWp && endWp.stop_id !== startWp.stop_id) {
        allOrdered.push(endWp);
      }

      return {
        startWaypoint: startWp,
        attractionWaypoints: attrWps,
        endWaypoint: endWp,
        allOrderedWaypoints: allOrdered,
      };
    } else {
      // All Days Overview
      const startWp: Waypoint = {
        name: originLabel,
        lat: originCoords[0],
        lon: originCoords[1],
        stop_id: 'trip-origin',
        stop_order: 0,
      };

      const attrWps: Waypoint[] = validStops.map((s, idx) => ({
        name: s.name,
        lat: s.coordinates!.lat,
        lon: s.coordinates!.lon,
        stop_id: s.id,
        stop_order: idx + 1,
        day_number: s.day_number,
      }));

      const endWp: Waypoint = {
        name: `Return to ${originLabel}`,
        lat: originCoords[0],
        lon: originCoords[1],
        stop_id: 'return-origin',
        stop_order: attrWps.length + 1,
      };

      return {
        startWaypoint: startWp,
        attractionWaypoints: attrWps,
        endWaypoint: endWp,
        allOrderedWaypoints: [startWp, ...attrWps, endWp],
      };
    }
  }, [validStops, selectedDay, dayPlans, originLabel]);

  // Compute authoritative active origin label for current day view
  const activeOriginName = useMemo(() => {
    if (selectedDay === null) {
      return originLabel;
    }
    const currPlan = dayPlans.find((dp) => dp.day_number === selectedDay);
    if (selectedDay === 1) {
      return currPlan?.start_location_name || originLabel;
    }
    return dayWaypoints.startWaypoint?.name || currPlan?.start_location_name || originLabel;
  }, [selectedDay, dayPlans, dayWaypoints, originLabel]);

  // Build directions request payload
  const directionsRequest = useMemo<DirectionsRequest | null>(() => {
    const { allOrderedWaypoints } = dayWaypoints;
    if (allOrderedWaypoints.length < 2) return null;

    const originWp = allOrderedWaypoints[0];
    const destWp = allOrderedWaypoints[allOrderedWaypoints.length - 1];
    const interWps = allOrderedWaypoints.slice(1, -1);

    const normalizedMode =
      travelMode === 'driving_car' || travelMode === 'cab_taxi' || travelMode === 'car' || travelMode === 'driving'
        ? 'driving'
        : travelMode === 'public_transit' || travelMode === 'transit'
        ? 'transit'
        : travelMode === 'walking'
        ? 'walking'
        : 'driving';

    return {
      origin: originWp,
      destination: destWp,
      waypoints: interWps,
      travel_mode: normalizedMode,
      day_number: selectedDay || undefined,
    };
  }, [dayWaypoints, travelMode, selectedDay]);

  // Fetch real road route directions from backend with race-condition prevention
  useEffect(() => {
    if (!directionsRequest) {
      setDirectionsData(null);
      setLoadingDirections(false);
      return;
    }

    const currentKey = `${selectedDay ?? 'all'}-${activeOriginName}-${validStops.map((s) => s.id).join('-')}-${travelMode}`;
    activeRouteKeyRef.current = currentKey;

    // Clear previous directions immediately to prevent stale day routes from showing
    setDirectionsData(null);
    setLoadingDirections(true);
    setDirectionsError(null);

    fetchRoadDirections(directionsRequest)
      .then((res) => {
        if (activeRouteKeyRef.current === currentKey) {
          setDirectionsData(res);
          setLoadingDirections(false);
        }
      })
      .catch((err) => {
        if (activeRouteKeyRef.current === currentKey) {
          console.warn('Road routing request error:', err);
          setDirectionsError('Unable to fetch live road network geometry. Showing regional estimates.');
          setLoadingDirections(false);
        }
      });
  }, [directionsRequest, selectedDay, originLabel, validStops, travelMode]);

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
      } else if (dayWaypoints.allOrderedWaypoints.length > 1) {
        const directCoords: [number, number][] = dayWaypoints.allOrderedWaypoints.map((w) => [w.lat, w.lon]);
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

      // 2. Add Start Waypoint Marker ("S")
      if (dayWaypoints.startWaypoint) {
        const sWp = dayWaypoints.startWaypoint;
        const startIcon = L.divIcon({
          className: 'custom-route-marker',
          html: `
            <div
              data-testid="map-marker-start"
              style="
              width: 32px;
              height: 32px;
              background: #10b981;
              color: #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 0.85rem;
              border: 2px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              S
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const startMarker = L.marker([sWp.lat, sWp.lon], { icon: startIcon });
        startMarker.bindPopup(`
          <div style="font-size: 0.75rem; color: #10b981; font-weight: 700; text-transform: uppercase;">
            ${selectedDay ? `Day ${selectedDay} Starting Point` : 'Trip Starting Point'}
          </div>
          <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a; margin: 2px 0;">
            🚩 ${sWp.name}
          </div>
        `);
        layerGroup.addLayer(startMarker);
        latLngsToFit.push([sWp.lat, sWp.lon]);
      }

      // 3. Add Destination Sightseeing Markers (Numbered 1, 2, 3...)
      validStops.forEach((stop, index) => {
        const pinColor = '#0284c7';
        const badgeLabel = `${index + 1}`;

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

      // 4. Add End Waypoint Marker ("E" or "🏨")
      if (dayWaypoints.endWaypoint && dayWaypoints.endWaypoint.stop_id !== dayWaypoints.startWaypoint?.stop_id) {
        const eWp = dayWaypoints.endWaypoint;
        const isHotel = eWp.name.toLowerCase().includes('stay') || eWp.name.toLowerCase().includes('hotel');
        const endIcon = L.divIcon({
          className: 'custom-route-marker',
          html: `
            <div
              data-testid="map-marker-end"
              style="
              width: 32px;
              height: 32px;
              background: #8b5cf6;
              color: #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 0.85rem;
              border: 2px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              ${isHotel ? '🏨' : 'E'}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16],
        });

        const endMarker = L.marker([eWp.lat, eWp.lon], { icon: endIcon });
        endMarker.bindPopup(`
          <div style="font-size: 0.75rem; color: #8b5cf6; font-weight: 700; text-transform: uppercase;">
            ${isHotel ? 'Overnight Accommodation' : 'Day Endpoint'}
          </div>
          <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a; margin: 2px 0;">
            🏁 ${eWp.name}
          </div>
        `);
        layerGroup.addLayer(endMarker);
        latLngsToFit.push([eWp.lat, eWp.lon]);
      }

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
  }, [viewMode, validStops, directionsData, dayWaypoints, selectedDay]);

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
              ? selectedDay !== null
                ? `Day ${selectedDay}: Starting from ${activeOriginName} • ${directionsData.total_distance_km} km • ~${Math.floor(directionsData.total_duration_minutes / 60)}h ${directionsData.total_duration_minutes % 60}m travel time`
                : `Complete journey from ${originLabel}: ${directionsData.total_distance_km} km • ~${Math.floor(directionsData.total_duration_minutes / 60)}h ${directionsData.total_duration_minutes % 60}m travel time`
              : selectedDay !== null
                ? `Day ${selectedDay}: Starting from ${activeOriginName}`
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

      {/* Day Corridor & Continuity Banner */}
      {currentDayPlan && (currentDayPlan.start_location_name || currentDayPlan.driving_distance_km) && (
        <div
          data-testid="map-day-corridor-banner"
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.85rem',
            marginBottom: '10px',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>🚩 {currentDayPlan.start_location_name || originLabel}</span>
            <span style={{ margin: '0 6px', color: '#64748b' }}>➔</span>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>🏁 {currentDayPlan.end_location_name || 'Destination'}</span>
            {currentDayPlan.accommodation_name && (
              <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
                🏨 {currentDayPlan.accommodation_name}
              </span>
            )}
          </div>
          {currentDayPlan.driving_distance_km && currentDayPlan.driving_distance_km > 0 ? (
            <div style={{ color: '#38bdf8', fontWeight: 500, fontSize: '0.8rem' }}>
              🚗 ~{currentDayPlan.driving_distance_km} km ({Math.round(currentDayPlan.transit_minutes || 0)} mins driving)
            </div>
          ) : null}
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
