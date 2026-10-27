import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

const MOCK_DESTINATION_MULTI_PHOTO: DestinationRead = {
  ...MOCK_DESTINATION,
  primary_image_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Mysore_Palace_Morning.jpg',
  media: [
    {
      id: 'media-mysore-palace-1',
      destination_id: '11111111-1111-4111-8111-111111111101',
      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Mysore_Palace_Morning.jpg',
      thumbnail_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mysore_Palace_Morning.jpg/400px-Mysore_Palace_Morning.jpg',
      caption_en: 'Morning view of Mysuru Palace exterior facade',
      caption_kn: 'ಮೈಸೂರು ಅರಮನೆಯ ಮುಂಜಾನೆಯ ನೋಟ',
      alt_en: 'Mysore Palace facade in the morning',
      source_name: 'Wikimedia Commons',
      source_url: 'https://commons.wikimedia.org/wiki/File:Mysore_Palace_Morning.jpg',
      license_type: 'CC BY-SA 4.0',
      attribution: 'Ramesh Photos',
      is_primary: true,
      verification_status: 'verified_authentic',
    },
    {
      id: 'media-mysore-palace-2',
      destination_id: '11111111-1111-4111-8111-111111111101',
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Mysore_Palace_Illuminated.jpg',
      thumbnail_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Mysore_Palace_Illuminated.jpg/400px-Mysore_Palace_Illuminated.jpg',
      caption_en: 'Illuminated Mysuru Palace during Dasara festival',
      caption_kn: 'ದಸರಾ ಹಬ್ಬದ ಸಮಯದಲ್ಲಿ ದೀಪಾಲಂಕೃತ ಮೈಸೂರು ಅರಮನೆ',
      alt_en: 'Mysore Palace illuminated with golden lights',
      source_name: 'Wikimedia Commons',
      source_url: 'https://commons.wikimedia.org/wiki/File:Mysore_Palace_Illuminated.jpg',
      license_type: 'CC BY-SA 3.0',
      attribution: 'Muhammad Mahdi Karim',
      is_primary: false,
      verification_status: 'verified_authentic',
    },
    {
      id: 'media-mysore-palace-3',
      destination_id: '11111111-1111-4111-8111-111111111101',
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Durbar_Hall_Mysore_Palace.jpg',
      thumbnail_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Durbar_Hall_Mysore_Palace.jpg/400px-Durbar_Hall_Mysore_Palace.jpg',
      caption_en: 'Intricate ornate pillars inside the Durbar Hall',
      caption_kn: 'ದರ್ಬಾರ್ ಸಭಾಂಗಣದ ಸುಂದರ ಕಂಬಗಳು',
      alt_en: 'Durbar Hall ornate arches and stained glass',
      source_name: 'Wikimedia Commons',
      source_url: 'https://commons.wikimedia.org/wiki/File:Durbar_Hall_Mysore_Palace.jpg',
      license_type: 'CC BY 4.0',
      attribution: 'Anand Heritage Archives',
      is_primary: false,
      verification_status: 'verified_authentic',
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

    expect(screen.getByText('Mysuru Palace')).toBeInTheDocument();
    expect(screen.getByText(/₹100/)).toBeInTheDocument();
    expect(screen.getByText('⏱️ 120 mins')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Original Hotel Vinayaka Mylari')).toBeInTheDocument();
      expect(screen.getByText('KSTDC Hotel Mayura Hoysala')).toBeInTheDocument();
    });

    expect(screen.getByText(/📍 0.8 km/)).toBeInTheDocument();
    expect(screen.getByText(/📍 1.5 km/)).toBeInTheDocument();
  });

  it('renders complete uncropped multi-photo gallery with thumbnail strip, navigation, and synchronized attribution', async () => {
    render(
      <DestinationModal
        destination={MOCK_DESTINATION_MULTI_PHOTO}
        language="en"
        onClose={vi.fn()}
        onPlanAround={vi.fn()}
      />
    );

    // Verify Hero Banner and Uncropped Styling
    const heroBanner = screen.getByTestId('destination-hero-banner');
    expect(heroBanner).toBeInTheDocument();

    const mainImg = screen.getByTestId('destination-gallery-main-image');
    expect(mainImg).toBeInTheDocument();
    expect(mainImg.style.objectFit).toBe('contain');

    // Initial Photo 1
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    expect(screen.getByText(/Morning view of Mysuru Palace exterior facade/i)).toBeInTheDocument();
    expect(screen.getByText(/Ramesh Photos/i)).toBeInTheDocument();
    expect(screen.getByText(/CC BY-SA 4.0/i)).toBeInTheDocument();

    // Verify Dedicated Thumbnail Strip with 3 thumbnails
    const thumbStrip = screen.getByTestId('gallery-thumbnail-strip');
    expect(thumbStrip).toBeInTheDocument();
    expect(screen.getByTestId('gallery-thumb-0')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-thumb-1')).toBeInTheDocument();
    expect(screen.getByTestId('gallery-thumb-2')).toBeInTheDocument();

    // Select Thumbnail 2 (photo index 1: illuminated palace)
    fireEvent.click(screen.getByTestId('gallery-thumb-1'));

    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
    expect(screen.getByText(/Illuminated Mysuru Palace during Dasara festival/i)).toBeInTheDocument();
    expect(screen.getByText(/Muhammad Mahdi Karim/i)).toBeInTheDocument();
    expect(screen.getByText(/CC BY-SA 3.0/i)).toBeInTheDocument();

    // Select Thumbnail 3 (photo index 2: durbar hall)
    fireEvent.click(screen.getByTestId('gallery-thumb-2'));

    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();
    expect(screen.getByText(/Intricate ornate pillars inside the Durbar Hall/i)).toBeInTheDocument();
    expect(screen.getByText(/Anand Heritage Archives/i)).toBeInTheDocument();
    expect(screen.getByText(/CC BY 4.0/i)).toBeInTheDocument();

    // Previous Button Navigation
    const prevBtn = screen.getByTestId('gallery-prev-button');
    fireEvent.click(prevBtn);
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();

    // Next Button Navigation
    const nextBtn = screen.getByTestId('gallery-next-button');
    fireEvent.click(nextBtn);
    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();

    // Keyboard Navigation (ArrowLeft / ArrowRight)
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();
  });

  it('renders graceful fallback banner for destinations without photographs', () => {
    const destinationWithoutMedia: DestinationRead = {
      ...MOCK_DESTINATION,
      slug: 'kondajji-lake',
      name_en: 'Kondajji Lake & Nature Sanctuary',
      primary_image_url: undefined,
      media: [],
    };

    render(
      <DestinationModal
        destination={destinationWithoutMedia}
        language="en"
        onClose={vi.fn()}
        onPlanAround={vi.fn()}
      />
    );

    const fallbackBanner = screen.getByTestId('destination-hero-fallback');
    expect(fallbackBanner).toBeInTheDocument();
    expect(screen.getByText(/Media Verification Pending/i)).toBeInTheDocument();
  });

  it('handles image error by showing fallback placeholder without crashing modal', () => {
    render(
      <DestinationModal
        destination={MOCK_DESTINATION_MULTI_PHOTO}
        language="en"
        onClose={vi.fn()}
        onPlanAround={vi.fn()}
      />
    );

    const mainImg = screen.getByTestId('destination-gallery-main-image');
    fireEvent.error(mainImg);
    // If both proxy and direct fallback fail, modal renders fallback placeholder
    fireEvent.error(mainImg);

    expect(screen.getByText(/Photograph temporarily unavailable/i)).toBeInTheDocument();
    // Modal controls remain functional
    expect(screen.getByTestId('gallery-thumbnail-strip')).toBeInTheDocument();
  });

  it('renders Kannada captions and text accurately when language is kn', () => {
    render(
      <DestinationModal
        destination={MOCK_DESTINATION_MULTI_PHOTO}
        language="kn"
        onClose={vi.fn()}
        onPlanAround={vi.fn()}
      />
    );

    expect(screen.getByText('ಮೈಸೂರು ಅರಮನೆ')).toBeInTheDocument();
    expect(screen.getByText(/ಮೈಸೂರು ಅರಮನೆಯ ಮುಂಜಾನೆಯ ನೋಟ/i)).toBeInTheDocument();
  });

  it('closes on Escape key press and close button click', () => {
    const handleClose = vi.fn();
    render(
      <DestinationModal
        destination={MOCK_DESTINATION}
        language="en"
        onClose={handleClose}
        onPlanAround={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByTestId('modal-close-button');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('opens and closes uncropped full-size image in lightbox overlay', () => {
    render(
      <DestinationModal
        destination={MOCK_DESTINATION_MULTI_PHOTO}
        language="en"
        onClose={vi.fn()}
        onPlanAround={vi.fn()}
      />
    );

    const inspectBtn = screen.getByTestId('gallery-inspect-button');
    expect(inspectBtn).toBeInTheDocument();
    fireEvent.click(inspectBtn);

    const lightboxOverlay = screen.getByTestId('gallery-lightbox-overlay');
    expect(lightboxOverlay).toBeInTheDocument();
    expect(screen.getByTestId('lightbox-full-image')).toBeInTheDocument();

    const lightboxClose = screen.getByTestId('lightbox-close-button');
    fireEvent.click(lightboxClose);
    expect(screen.queryByTestId('gallery-lightbox-overlay')).not.toBeInTheDocument();
  });
});
