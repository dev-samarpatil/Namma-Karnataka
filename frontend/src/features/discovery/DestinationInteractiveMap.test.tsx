import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DestinationInteractiveMap } from './DestinationInteractiveMap';
import { DestinationRead } from '../../types';

// Mock Leaflet methods that rely on real browser DOM rendering & canvas
vi.mock('leaflet', () => {
  return {
    default: {
      map: () => ({
        setView: vi.fn(),
        fitBounds: vi.fn(),
        remove: vi.fn(),
      }),
      tileLayer: () => ({
        addTo: vi.fn(),
      }),
      layerGroup: () => ({
        addTo: vi.fn().mockReturnThis(),
        clearLayers: vi.fn().mockReturnThis(),
        addLayer: vi.fn().mockReturnThis(),
      }),
      divIcon: vi.fn().mockReturnValue({}),
      marker: () => ({
        addTo: vi.fn().mockReturnThis(),
        bindPopup: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        setLatLng: vi.fn().mockReturnThis(),
      }),
      latLngBounds: () => ({
        extend: vi.fn(),
        isValid: () => true,
      }),
    },
  };
});

const MOCK_DESTINATIONS: DestinationRead[] = [
  {
    id: 'mysore-palace',
    slug: 'mysore-palace',
    district_code: 'KA-MYS',
    category: 'architecture',
    coordinates: { lat: 12.3051, lon: 76.6551 },
    access_status: 'open_reported',
    verification_status: 'source_checked',
    content_status: 'published',
    is_offbeat: false,
    estimated_visit_minutes: 120,
    entry_fee_min_inr: 100,
    entry_fee_max_inr: 100,
    currency_code: 'INR',
    active: true,
    name_en: 'Mysuru Palace',
    name_kn: 'ಮೈಸೂರು ಅರಮನೆ',
    summary_en: 'Historic royal residence of Wodeyars',
    summary_kn: 'ಒಡೆಯರ್ ರಾಜವಂಶದ ಐತಿಹಾಸಿಕ ಆಸ್ಥಾನ',
    district: { code: 'KA-MYS', name_en: 'Mysuru', name_kn: 'ಮೈಸೂರು' },
  },
  {
    id: 'hampi-monuments',
    slug: 'hampi-monuments',
    district_code: 'KA-VJN',
    category: 'heritage',
    coordinates: { lat: 15.3350, lon: 76.4600 },
    access_status: 'open_reported',
    verification_status: 'source_checked',
    content_status: 'published',
    is_offbeat: false,
    estimated_visit_minutes: 240,
    entry_fee_min_inr: 40,
    entry_fee_max_inr: 40,
    currency_code: 'INR',
    active: true,
    name_en: 'Group of Monuments at Hampi',
    name_kn: 'ಹಂಪಿಯ ಸ್ಮಾರಕಗಳ ಗುಂಪು',
    summary_en: 'UNESCO World Heritage Capital of Vijayanagara Empire',
    summary_kn: 'ಯುನೆಸ್ಕೋ ವಿಶ್ವ ಪರಂಪರೆ ತಾಣ',
    district: { code: 'KA-VJN', name_en: 'Vijayanagara', name_kn: 'ವಿಜಯನಗರ' },
  },
];

describe('DestinationInteractiveMap Component', () => {
  it('renders interactive map container, destination count, and OpenStreetMap attribution', () => {
    render(
      <DestinationInteractiveMap
        destinations={MOCK_DESTINATIONS}
        language="en"
        onSelectDestination={vi.fn()}
      />
    );

    expect(screen.getByTestId('interactive-map-container')).toBeDefined();
    expect(screen.getByTestId('leaflet-map')).toBeDefined();
    expect(screen.getByText(/OpenStreetMap contributors/i)).toBeDefined();
    expect(screen.getByText(/2 Destinations/i)).toBeDefined();
  });

  it('toggles accessible list view alternative and displays destination details', () => {
    const handleSelect = vi.fn();
    render(
      <DestinationInteractiveMap
        destinations={MOCK_DESTINATIONS}
        language="en"
        onSelectDestination={handleSelect}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-map-list-mode');
    expect(toggleBtn).toBeDefined();

    // Switch to List mode
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('map-list-alternative-view')).toBeDefined();
    expect(screen.getByText('Group of Monuments at Hampi')).toBeDefined();
    expect(screen.getByText(/15.3350° N, 76.4600° E/i)).toBeDefined();
  });

  it('supports nearby layer overlay checkboxes for dining, stays, and transit', () => {
    render(
      <DestinationInteractiveMap
        destinations={MOCK_DESTINATIONS}
        language="en"
        onSelectDestination={vi.fn()}
      />
    );

    expect(screen.getByText(/Dining/i)).toBeDefined();
    expect(screen.getByText(/Accommodations/i)).toBeDefined();
    expect(screen.getByText(/Transit Hubs/i)).toBeDefined();

    const diningCheckbox = screen.getByLabelText(/Dining/i);
    fireEvent.click(diningCheckbox);
    expect((diningCheckbox as HTMLInputElement).checked).toBe(true);
  });

  it('resets state view on center button click', () => {
    render(
      <DestinationInteractiveMap
        destinations={MOCK_DESTINATIONS}
        language="en"
        onSelectDestination={vi.fn()}
      />
    );

    const resetBtn = screen.getByText(/Reset State View/i);
    expect(resetBtn).toBeDefined();
    fireEvent.click(resetBtn);
  });
});
