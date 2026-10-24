import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DestinationDiscovery } from './DestinationDiscovery';
import { DestinationModal } from './DestinationModal';
import * as api from '../../lib/api';
import { DestinationListResponse, DestinationRead } from '../../types';

const MOCK_DESTINATIONS: DestinationRead[] = [
  {
    id: 'mysore-palace-id',
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
    description_en: 'Magnificent Indo-Saracenic palace in the heart of Mysuru.',
    district: { code: 'KA-MYS', name_en: 'Mysuru', name_kn: 'ಮೈಸೂರು' },
    media: [
      {
        id: 'med-mys-1',
        destination_id: 'mysore-palace-id',
        url: 'https://upload.wikimedia.org/wikipedia/commons/mysore_palace.jpg',
        thumbnail_url: 'https://upload.wikimedia.org/wikipedia/commons/mysore_palace_thumb.jpg',
        caption_en: 'Mysuru Palace illuminated during Dasara',
        alt_en: 'Mysuru Palace grand facade with illumination',
        source_name: 'Karnataka Tourism Board',
        license_type: 'CC BY-SA 4.0',
        attribution: 'Photo by Tourism Board, Karnataka',
        is_primary: true,
      },
    ],
    primary_image_url: 'https://upload.wikimedia.org/wikipedia/commons/mysore_palace_thumb.jpg',
  },
  {
    id: 'chamundi-hills-id',
    slug: 'chamundi-hills',
    district_code: 'KA-MYS',
    category: 'spiritual_cultural',
    coordinates: { lat: 12.2725, lon: 76.6710 },
    access_status: 'open_reported',
    verification_status: 'source_checked',
    content_status: 'published',
    is_offbeat: false,
    estimated_visit_minutes: 45,
    entry_fee_min_inr: 0,
    entry_fee_max_inr: 0,
    currency_code: 'INR',
    active: true,
    name_en: 'Chamundi Hills & Temple',
    name_kn: 'ಚಾಮುಂಡಿ ಬೆಟ್ಟ ಮತ್ತು ದೇವಾಲಯ',
    summary_en: 'Revered hilltop temple overlooking Mysuru',
    summary_kn: 'ಮೈಸೂರನ್ನು ವೀಕ್ಷಿಸುವ ಪವಿತ್ರ ಬೆಟ್ಟದ ದೇವಾಲಯ',
    description_en: 'Sacred temple dedicated to Goddess Chamundeshwari.',
    district: { code: 'KA-MYS', name_en: 'Mysuru', name_kn: 'ಮೈಸೂರು' },
    media: [],
  },
];

const MOCK_LIST_RESPONSE: DestinationListResponse = {
  items: MOCK_DESTINATIONS,
  total: 2,
  limit: 50,
  offset: 0,
  has_more: false,
};

describe('DestinationDiscovery — Phase 6 Advanced Discovery & Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'listDestinations').mockResolvedValue(MOCK_LIST_RESPONSE);
  });

  it('renders fee type, duration range, and sorting filters', async () => {
    render(<DestinationDiscovery language="en" onPlanWithDestination={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Mysuru Palace')).toBeInTheDocument();
    });

    // Check presence of Phase 6 filter controls
    expect(screen.getByTestId('fee-filter-select')).toBeInTheDocument();
    expect(screen.getByTestId('duration-filter-select')).toBeInTheDocument();
    expect(screen.getByTestId('sort-filter-select')).toBeInTheDocument();
  });

  it('queries backend with selected fee_type and duration filters', async () => {
    const listSpy = vi.spyOn(api, 'listDestinations').mockResolvedValue(MOCK_LIST_RESPONSE);

    render(<DestinationDiscovery language="en" onPlanWithDestination={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Mysuru Palace')).toBeInTheDocument();
    });

    const feeSelect = screen.getByTestId('fee-filter-select');
    fireEvent.change(feeSelect, { target: { value: 'free' } });

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fee_type: 'free',
        }),
        expect.anything()
      );
    });

    // Verify reset filter button appears
    expect(screen.getByTestId('reset-filters-btn')).toBeInTheDocument();
  });

  it('renders primary image preview on destination card when available', async () => {
    render(<DestinationDiscovery language="en" onPlanWithDestination={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Mysuru Palace')).toBeInTheDocument();
    });

    const palaceImg = screen.getByAltText('Mysuru Palace grand facade with illumination');
    expect(palaceImg).toBeInTheDocument();
    expect(palaceImg).toHaveAttribute('src', 'https://upload.wikimedia.org/wikipedia/commons/mysore_palace_thumb.jpg');
  });

  it('opens rich detail modal with gallery and nearby transit when destination card is clicked', async () => {
    vi.spyOn(api, 'getDestinationNearby').mockResolvedValue({
      destination_id: 'mysore-palace-id',
      destination_slug: 'mysore-palace',
      radius_km: 30,
      nearby_attractions: [],
      nearby_transit: [
        {
          hub_id: 'hub-mys-rail',
          name: 'Mysuru Junction Railway Station',
          hub_type: 'rail',
          distance_km: 2.1,
          connectivity_summary: 'Major railway junction on Bengaluru-Mysuru corridor',
        },
      ],
      nearby_restaurants: [],
      nearby_accommodations: [],
    });
    vi.spyOn(api, 'fetchRestaurantsNear').mockResolvedValue([]);
    vi.spyOn(api, 'fetchAccommodationsNear').mockResolvedValue([]);

    render(
      <DestinationModal
        destination={MOCK_DESTINATIONS[0]}
        language="en"
        onClose={vi.fn()}
        onPlanAround={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('destination-modal-overlay')).toBeInTheDocument();
      expect(screen.getByText(/Mysuru Junction Railway Station/i)).toBeInTheDocument();
      expect(screen.getByText(/Photo by Tourism Board/i)).toBeInTheDocument();
    });
  });
});
