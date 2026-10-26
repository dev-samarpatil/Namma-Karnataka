/**
 * DestinationInteractiveMap Component
 *
 * Interactive geographical exploration of Karnataka using Leaflet and OpenStreetMap.
 * Features destination markers, district focusing, nearby dining/stays/transit overlays,
 * accessible List Alternative, and resilient offline status disclosure.
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DestinationRead, Language } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import {
  fetchRestaurantsNear,
  fetchAccommodationsNear,
  fetchTransitStopsNear,
} from '../../lib/api';

interface DestinationInteractiveMapProps {
  destinations: DestinationRead[];
  selectedDistrict?: string;
  language: Language;
  activeDestinationId?: string | null;
  onSelectDestination: (dest: DestinationRead) => void;
  onOpenDetails?: (dest: DestinationRead) => void;
  onPlanWithDestination?: (dest: DestinationRead) => void;
}

const KARNATAKA_CENTER: [number, number] = [14.5, 75.8];
const DEFAULT_ZOOM = 7;

// Category icon map for map pins
const CATEGORY_ICONS: Record<string, string> = {
  architecture: '🏛️',
  heritage: '🏰',
  nature: '🌲',
  waterfall: '🌊',
  hill_station: '⛰️',
  beach: '🏖️',
  wildlife: '🐅',
  spiritual_cultural: '🛕',
  adventure: '🧗',
  viewpoint: '🔭',
  museum: '🏛️',
  town_city: '🏙️',
  food_culture: '🍱',
  other: '📍',
};

export const DestinationInteractiveMap: React.FC<DestinationInteractiveMapProps> = ({
  destinations,
  selectedDistrict,
  language,
  activeDestinationId,
  onSelectDestination,
  onOpenDetails,
  onPlanWithDestination,
}) => {
  const { t } = useTranslation(language);
  const isOnline = useOnlineStatus();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const nearbyLayerRef = useRef<L.LayerGroup | null>(null);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showDining, setShowDining] = useState(false);
  const [showStays, setShowStays] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: KARNATAKA_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 6,
      maxZoom: 16,
    });

    // Standard OpenStreetMap TileLayer with strict mandatory attribution
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const nearbyGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    nearbyLayerRef.current = nearbyGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Render Destination Markers with Zoom-Aware Clustering & Rich Popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    const validDestinations = destinations.filter(
      (d) => d.coordinates && typeof d.coordinates.lat === 'number' && typeof d.coordinates.lon === 'number'
    );

    const latLngs: L.LatLngExpression[] = [];

    const renderMarkers = () => {
      layer.clearLayers();
      const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : DEFAULT_ZOOM;

      // Group by district when zoomed out to state overview (zoom <= 7)
      if (currentZoom <= 7 && !selectedDistrict && !activeDestinationId) {
        const districtGroups: Record<string, DestinationRead[]> = {};
        validDestinations.forEach((d) => {
          const dCode = d.district?.code || d.district_code || 'KA';
          if (!districtGroups[dCode]) districtGroups[dCode] = [];
          districtGroups[dCode].push(d);
        });

        Object.entries(districtGroups).forEach(([code, group]) => {
          if (group.length === 0) return;
          const avgLat = group.reduce((sum, d) => sum + (d.coordinates?.lat || 0), 0) / group.length;
          const avgLon = group.reduce((sum, d) => sum + (d.coordinates?.lon || 0), 0) / group.length;
          const first = group[0];
          const distName =
            language === 'kn' && first.district?.name_kn
              ? first.district.name_kn
              : first.district?.name_en || code;

          const clusterHtml = `
            <div class="map-district-cluster" role="button" aria-label="${distName}: ${group.length} destinations">
              <span class="cluster-count">${group.length}</span>
              <span class="cluster-label">${distName}</span>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: 'custom-cluster-icon',
            iconSize: [120, 32],
            iconAnchor: [60, 16],
          });

          const clusterMarker = L.marker([avgLat, avgLon], { icon: clusterIcon });
          clusterMarker.on('click', () => {
            if (typeof map.setView === 'function') {
              map.setView([avgLat, avgLon], 9, { animate: true });
            }
          });
          clusterMarker.addTo(layer);
        });
        return;
      }

      // Detailed pins for zoom >= 8 or active selection
      validDestinations.forEach((dest) => {
        if (!dest.coordinates) return;
        const isSelected = dest.id === activeDestinationId;
        const categoryIcon = CATEGORY_ICONS[dest.category] || '📍';
        const name = language === 'kn' && dest.name_kn ? dest.name_kn : dest.name_en;
        const distName =
          language === 'kn' && dest.district?.name_kn
            ? dest.district.name_kn
            : dest.district?.name_en || dest.district_code;
        const lat = dest.coordinates.lat;
        const lon = dest.coordinates.lon;

        // Clean pin without permanent text clutter
        const pinHtml = `
          <div class="custom-leaflet-marker ${isSelected ? 'selected' : ''}" role="button" aria-label="${name}">
            <span class="marker-emoji">${categoryIcon}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: pinHtml,
          className: 'custom-div-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([lat, lon], { icon });

        if (typeof marker.bindTooltip === 'function') {
          marker.bindTooltip(name, { direction: 'top', offset: [0, -18] });
        }

        const thumb = dest.primary_image_url || (dest.media && dest.media[0]?.thumbnail_url) || '';
        const fee =
          dest.entry_fee_min_inr === 0
            ? language === 'kn'
              ? 'ಉಚಿತ'
              : 'Free'
            : dest.entry_fee_min_inr
            ? `₹${dest.entry_fee_min_inr}`
            : language === 'kn'
            ? 'ಮಾಹಿತಿಯಿಲ್ಲ'
            : 'N/A';
        const duration = dest.estimated_visit_minutes
          ? `${Math.round(dest.estimated_visit_minutes / 60)}h`
          : '1-2h';

        const popupHtml = `
          <div class="map-rich-popup" data-dest-id="${dest.id}">
            ${thumb ? `<div class="map-popup-thumb"><img src="${thumb}" alt="${name}" onerror="this.parentElement.style.display='none'" /></div>` : ''}
            <div class="map-popup-body">
              <div class="map-popup-badge-row">
                <span class="map-popup-cat">${categoryIcon} ${dest.category}</span>
                <span class="map-popup-dist">📍 ${distName}</span>
              </div>
              <h4 class="map-popup-title">${name}</h4>
              <div class="map-popup-meta">
                <span>🎟️ ${fee}</span>
                <span>⏱️ ${duration}</span>
              </div>
              <div class="map-popup-actions">
                <button type="button" class="btn-popup-details" data-action="details">ℹ️ ${language === 'kn' ? 'ವಿವರಗಳು' : 'Details'}</button>
                <button type="button" class="btn-popup-plan" data-action="plan">🧭 ${language === 'kn' ? 'ಯೋಜಿಸಿ' : 'Plan'}</button>
              </div>
            </div>
          </div>
        `;

        if (typeof marker.bindPopup === 'function') {
          marker.bindPopup(popupHtml, { maxWidth: 260 });
          marker.on('popupopen', (e: any) => {
            const el = e.popup?.getElement ? e.popup.getElement() : null;
            if (el) {
              const detailsBtn = el.querySelector('[data-action="details"]');
              if (detailsBtn) {
                detailsBtn.onclick = () => onOpenDetails && onOpenDetails(dest);
              }
              const planBtn = el.querySelector('[data-action="plan"]');
              if (planBtn) {
                planBtn.onclick = () => onPlanWithDestination && onPlanWithDestination(dest);
              }
            }
          });
        }

        marker.on('click', () => {
          onSelectDestination(dest);
        });

        marker.addTo(layer);
        latLngs.push([lat, lon]);
      });
    };

    renderMarkers();

    if (typeof map.on === 'function') {
      map.on('zoomend', renderMarkers);
    }

    // Pan / zoom focus according to filter or selection
    if (activeDestinationId) {
      const activeDest = destinations.find((d) => d.id === activeDestinationId);
      if (activeDest?.coordinates && typeof map.setView === 'function') {
        map.setView([activeDest.coordinates.lat, activeDest.coordinates.lon], 12, { animate: true });
      }
    } else if (selectedDistrict && latLngs.length > 0) {
      if (typeof map.fitBounds === 'function' && typeof L.latLngBounds === 'function') {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
      }
    } else if (latLngs.length > 0 && selectedDistrict === '' && typeof map.setView === 'function') {
      map.setView(KARNATAKA_CENTER, DEFAULT_ZOOM, { animate: true });
    }

    return () => {
      if (typeof map.off === 'function') {
        map.off('zoomend', renderMarkers);
      }
    };
  }, [destinations, selectedDistrict, activeDestinationId, language, onSelectDestination, onOpenDetails, onPlanWithDestination]);

  // 3. Render Nearby Overlays (Dining, Accommodations, Transit Hubs)
  useEffect(() => {
    const nearbyLayer = nearbyLayerRef.current;
    if (!nearbyLayer) return;

    nearbyLayer.clearLayers();

    const activeDest = destinations.find((d) => d.id === activeDestinationId);
    if (!activeDest?.coordinates || (!showDining && !showStays && !showTransit)) {
      return;
    }

    setLoadingNearby(true);

    const loadOverlays = async () => {
      try {
        if (!activeDest.coordinates) return;
        const lat = activeDest.coordinates.lat;
        const lon = activeDest.coordinates.lon;

        if (showDining) {
          const rests = await fetchRestaurantsNear(lat, lon, 25.0);
          rests.forEach((rest) => {
            const restName = language === 'kn' && rest.name_kn ? rest.name_kn : rest.name_en;
            const restIcon = L.divIcon({
              html: `<div class="nearby-poi-marker dining" title="${restName}">🍴</div>`,
              className: 'nearby-div-icon',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
            L.marker([rest.latitude, rest.longitude], { icon: restIcon })
              .bindPopup(`<strong>🍴 ${restName}</strong><br/>${rest.address_en || ''}<br/>Tier: ${rest.price_tier}`)
              .addTo(nearbyLayer);
          });
        }

        if (showStays) {
          const stays = await fetchAccommodationsNear(lat, lon, 30.0);
          stays.forEach((stay) => {
            const stayName = language === 'kn' && stay.name_kn ? stay.name_kn : stay.name_en;
            const isGovt = stay.source_name.includes('KSTDC') || stay.source_name.includes('Jungle Lodges');
            const stayIcon = L.divIcon({
              html: `<div class="nearby-poi-marker stay ${isGovt ? 'govt' : ''}" title="${stayName}">🏨</div>`,
              className: 'nearby-div-icon',
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
            const bookingUrl = stay.official_booking_url || stay.booking_reference_url;
            const bookingHtml = bookingUrl
              ? `<br/><a href="${bookingUrl}" target="_blank" rel="noopener noreferrer" class="link-sm">Official Booking Portal ↗</a>`
              : '';
            L.marker([stay.latitude, stay.longitude], { icon: stayIcon })
              .bindPopup(`<strong>🏨 ${stayName}</strong><br/>${stay.address_en || ''}${bookingHtml}`)
              .addTo(nearbyLayer);
          });
        }

        if (showTransit) {
          const stops = await fetchTransitStopsNear(lat, lon, 25.0);
          stops.forEach((stop) => {
            const orgIcon = L.divIcon({
              html: `<div class="nearby-poi-marker transit" title="${stop.name_en}">🚉</div>`,
              className: 'nearby-div-icon',
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            });
            L.marker([stop.latitude, stop.longitude], { icon: orgIcon })
              .bindPopup(`<strong>🚉 ${stop.name_en}</strong><br/>${stop.operator || 'Transit Hub'}`)
              .addTo(nearbyLayer);
          });
        }
      } catch {
        // Graceful handling of network / nearby load failures
      } finally {
        setLoadingNearby(false);
      }
    };

    loadOverlays();
  }, [activeDestinationId, showDining, showStays, showTransit, destinations, language]);

  const activeDest = destinations.find((d) => d.id === activeDestinationId);

  return (
    <div className="interactive-map-root" data-testid="interactive-map-container">
      {/* Map Control Bar */}
      <div className="interactive-map-header">
        <div className="map-title-group">
          <h3 className="interactive-map-title">🗺️ {t('interactiveMapTitle')}</h3>
          <p className="interactive-map-subtitle">
            {destinations.length} {t('destinationsFound')}
          </p>
        </div>

        <div className="map-view-actions">
          <button
            type="button"
            className="btn-toggle-map-view"
            onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            data-testid="toggle-map-list-mode"
          >
            {viewMode === 'map' ? `📋 ${t('toggleListView')}` : `🗺️ ${t('toggleMapView')}`}
          </button>
          <button
            type="button"
            className="btn-reset-map"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView(KARNATAKA_CENTER, DEFAULT_ZOOM, { animate: true });
              }
            }}
          >
            🔄 {t('centerStateBtn')}
          </button>
        </div>
      </div>

      {/* Layer Controls for Nearby Places */}
      {viewMode === 'map' && (
        <div className="map-layer-toggles">
          <span className="layer-label">Overlays:</span>
          <label className="layer-checkbox-label">
            <input
              type="checkbox"
              checked={showDining}
              onChange={(e) => setShowDining(e.target.checked)}
            />
            🍴 {t('layerDining')}
          </label>
          <label className="layer-checkbox-label">
            <input
              type="checkbox"
              checked={showStays}
              onChange={(e) => setShowStays(e.target.checked)}
            />
            🏨 {t('layerStays')}
          </label>
          <label className="layer-checkbox-label">
            <input
              type="checkbox"
              checked={showTransit}
              onChange={(e) => setShowTransit(e.target.checked)}
            />
            🚉 {t('layerTransit')}
          </label>
          {loadingNearby && <span className="loading-nearby-spinner">⏳ Loading layer...</span>}
        </div>
      )}

      {/* Offline Status Warning */}
      {!isOnline && (
        <div className="map-offline-banner" data-testid="map-offline-warning">
          ⚠️ {t('mapOfflineWarning')}
        </div>
      )}

      {/* Main View Area */}
      {viewMode === 'map' ? (
        <div className="leaflet-map-wrapper">
          <div ref={mapContainerRef} className="leaflet-actual-map" data-testid="leaflet-map" />

          {/* Synchronized Selected Destination Flyout Card */}
          {activeDest && (
            <div className="map-selected-flyout-card" data-testid="map-selected-card">
              <div className="flyout-header">
                <span className="badge badge-category">
                  {CATEGORY_ICONS[activeDest.category] || '📍'} {activeDest.category}
                </span>
                <span className="badge badge-district">{activeDest.district_code}</span>
              </div>
              <h4 className="flyout-title">
                {language === 'kn' && activeDest.name_kn ? activeDest.name_kn : activeDest.name_en}
              </h4>
              <p className="flyout-summary">
                {language === 'kn' && activeDest.summary_kn ? activeDest.summary_kn : activeDest.summary_en}
              </p>
              {activeDest.coordinates && (
                <p className="flyout-coords">
                  📍 {activeDest.coordinates.lat.toFixed(4)}° N, {activeDest.coordinates.lon.toFixed(4)}° E
                </p>
              )}
              <div className="flyout-actions">
                <button
                  type="button"
                  className="btn-flyout-details"
                  onClick={() => onOpenDetails && onOpenDetails(activeDest)}
                  data-testid="map-flyout-open-details"
                >
                  ℹ️ {t('viewDetails')}
                </button>
                {onPlanWithDestination && (
                  <button
                    type="button"
                    className="btn-flyout-plan"
                    onClick={() => onPlanWithDestination(activeDest)}
                  >
                    ✨ {t('planWithThis')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Accessible List Alternative for Screen Readers and Low-Connectivity */
        <div className="map-list-alternative-view" data-testid="map-list-alternative-view">
          <ul className="map-list-items">
            {destinations.map((dest) => {
              const name = language === 'kn' && dest.name_kn ? dest.name_kn : dest.name_en;
              const lat = dest.coordinates?.lat;
              const lon = dest.coordinates?.lon;
              return (
                <li
                  key={dest.id}
                  className={`map-list-row ${dest.id === activeDestinationId ? 'active' : ''}`}
                >
                  <div className="row-info">
                    <strong>{name}</strong> ({dest.district_code})
                    {lat !== undefined && lon !== undefined && (
                      <span className="row-coords">
                        📍 {lat.toFixed(4)}° N, {lon.toFixed(4)}° E
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-row-action"
                    onClick={() => {
                      onSelectDestination(dest);
                      if (onOpenDetails) onOpenDetails(dest);
                    }}
                  >
                    {t('viewDetails')}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Attribution Footer */}
      <div className="map-footer-attribution">
        <small>{t('mapAttributionNotice')}</small>
      </div>
    </div>
  );
};
