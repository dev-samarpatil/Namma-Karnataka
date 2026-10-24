import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DestinationModal } from './DestinationModal';
import { DestinationRead } from '../../types';
import * as api from '../../lib/api';

const MOCK_DESTINATION: DestinationRead = {
  id: '11111111-1111-4111-8111-111111111101',
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
  summary_en: 'Historic royal residence',
  summary_kn: 'ಒಡೆಯರ್ ರಾಜವಂಶದ ಐತಿಹಾಸಿಕ ಆಸ್ಥಾನ',
  description_en: 'Magnificent Indo-Saracenic palace',
  sources: [
    {
      source_type: 'government_official',
      title: 'Mysore Palace Board Official Portal',
      url: 'https://www.mysorepalace.gov.in',
    },
  ],
};

describe('DestinationModal', () => {
  it('renders destination details, entry fees, and nearby food and stay recommendations', async () => {
    vi.spyOn(api, 'fetchRestaurantsNear').mockResolvedValue([
      {
        id: 'original-mylari-mysuru',
        name_en: 'Original Hotel Vinayaka Mylari',
        name_kn: 'ಒರಿಜಿನಲ್ ಹೋಟೆಲ್ ವಿನಾಯಕ ಮೈಲಾರಿ',
        place_type: 'restaurant',
        district_code: 'KA-MYS',
        nearby_destination_slug: 'mysore-palace',
        latitude: 12.3087,
        longitude: 76.6612,
        address_en: 'Nazarbad, Mysuru',
        cuisines: ['south_indian'],
        is_vegetarian: true,
        price_tier: 'budget',
        estimated_cost_per_person_inr: 100,
        price_status: 'verified',
        source_name: 'Mysuru Tourism Heritage Directory',
        source_type: 'curated_verified',
        verified_at: '2026-10-23T12:00:00Z',
        distance_km: 0.8,
      },
    ]);

    vi.spyOn(api, 'fetchAccommodationsNear').mockResolvedValue([
      {
        id: 'kstdc-mayura-hoysala-mysuru',
        name_en: 'KSTDC Hotel Mayura Hoysala',
        name_kn: 'ಕೆಎಸ್‌ಟಿಡಿಸಿ ಹೋಟೆಲ್ ಮಯೂರ ಹೊಯ್ಸಳ',
        place_type: 'accommodation',
        accommodation_type: 'hotel',
        district_code: 'KA-MYS',
        nearby_destination_slug: 'mysore-palace',
        latitude: 12.3122,
        longitude: 76.6439,
        address_en: 'Jhansi Rani Lakshmi Bai Road, Mysuru',
        price_tier: 'mid_range',
        estimated_cost_per_night_inr: 2200,
        price_status: 'verified',
        amenities: ['Restaurant', 'Free Parking'],
        booking_reference_url: 'https://kstdc.co/hotels/hotel-mayura-hoysala-mysuru/',
        source_name: 'KSTDC',
        source_type: 'curated_verified',
        verified_at: '2026-10-23T12:00:00Z',
        distance_km: 1.5,
      },
    ]);

    render(
      <DestinationModal
        destination={MOCK_DESTINATION}
        language="en"
        onClose={vi.fn()}
        onPlanAround={vi.fn()}
      />
    );

    // Verify Title & Details
    expect(screen.getByText('Mysuru Palace')).toBeInTheDocument();
    expect(screen.getByText(/₹100/)).toBeInTheDocument();
    expect(screen.getByText('⏱️ 120 mins')).toBeInTheDocument();

    // Verify Nearby Places Section
    await waitFor(() => {
      expect(screen.getByText('Original Hotel Vinayaka Mylari')).toBeInTheDocument();
      expect(screen.getByText('KSTDC Hotel Mayura Hoysala')).toBeInTheDocument();
    });

    expect(screen.getByText(/📍 0.8 km/)).toBeInTheDocument();
    expect(screen.getByText(/📍 1.5 km/)).toBeInTheDocument();
    expect(screen.getByText('🏛️ KSTDC')).toBeInTheDocument();
  });
});
