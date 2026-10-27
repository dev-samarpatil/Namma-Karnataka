import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisualDiscoveryCard } from './VisualDiscoveryCard';
import * as api from '../../lib/api';
import { VisualDiscoveryResponse } from '../../types';

describe('VisualDiscoveryCard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-image-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  const MOCK_SUCCESS_RESPONSE: VisualDiscoveryResponse = {
    query_type: 'image',
    is_confident: true,
    message_en: 'Grounded destination matches found.',
    message_kn: 'ದೃಢೀಕೃತ ತಾಣದ ಹೊಂದಾಣಿಕೆಗಳು ಕಂಡುಬಂದಿವೆ.',
    candidates: [
      {
        destination_id: 'mysore-palace',
        slug: 'mysore-palace',
        name_en: 'Mysuru Palace',
        name_kn: 'ಮೈಸೂರು ಅರಮನೆ',
        match_score: 94,
        confidence_label: 'strong_match',
        matching_reasons: [
          'Indo-Saracenic royal palace with ornate domes',
          'Three-story stone facade with ornate arches',
        ],
        district_code: 'KA-MYS',
        category: 'architecture',
      },
    ],
    analysis_engine: 'visual_similarity_engine',
    analyzed_at: '2026-10-24T18:00:00Z',
    privacy_notice: 'Processed ephemerally in memory.',
  };

  it('renders card with heading, description, privacy notice, and tab controls', () => {
    render(
      <VisualDiscoveryCard
        language="en"
        onSelectCandidate={vi.fn()}
        onOpenDestinationDetailsBySlug={vi.fn()}
      />
    );

    expect(screen.getByText('Identify a Place from a Photo or Video')).toBeInTheDocument();
    expect(screen.getByTestId('tab-photo-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tab-video-toggle')).toBeInTheDocument();
    expect(screen.getByText(/Ephemeral & Private/i)).toBeInTheDocument();
  });

  it('validates file upload, displays preview, and executes identification upon user action', async () => {
    const analyzeSpy = vi.spyOn(api, 'analyzeImageVisualDiscovery').mockResolvedValue(MOCK_SUCCESS_RESPONSE);
    const handleOpenDetails = vi.fn();

    render(
      <VisualDiscoveryCard
        language="en"
        onSelectCandidate={vi.fn()}
        onOpenDestinationDetailsBySlug={handleOpenDetails}
      />
    );

    const file = new File(['dummy photo data'], 'IMG_1234.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('visual-discovery-card-input');

    fireEvent.change(fileInput, { target: { files: [file] } });

    // File name and preview should be displayed
    expect(screen.getByText('IMG_1234.jpg')).toBeInTheDocument();
    expect(screen.getByAltText('Selected preview')).toBeInTheDocument();

    // Verify analyze button requires explicit click
    const identifyBtn = screen.getByTestId('identify-place-btn');
    expect(identifyBtn).toBeInTheDocument();
    expect(analyzeSpy).not.toHaveBeenCalled();

    fireEvent.click(identifyBtn);

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledTimes(1);
    });

    // Check candidate results rendered
    expect(await screen.findByText('Mysuru Palace')).toBeInTheDocument();
    expect(screen.getByText(/Strong Match \(94%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Indo-Saracenic royal palace with ornate domes/i)).toBeInTheDocument();

    // Verify Visual Similarity Engine badge
    expect(screen.getByTestId('visual-engine-badge')).toHaveTextContent('Visual Similarity Engine');

    // Test details button callback
    const detailsBtn = screen.getByText('View Destination Details');
    fireEvent.click(detailsBtn);
    expect(handleOpenDetails).toHaveBeenCalledWith('mysore-palace');
  });

  it('displays validation error when unsupported file format is uploaded', () => {
    render(
      <VisualDiscoveryCard
        language="en"
        onSelectCandidate={vi.fn()}
        onOpenDestinationDetailsBySlug={vi.fn()}
      />
    );

    const invalidFile = new File(['some text'], 'notes.txt', { type: 'text/plain' });
    const fileInput = screen.getByTestId('visual-discovery-card-input');

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByText(/Unsupported image format/i)).toBeInTheDocument();
  });

  it('displays honest no-match recovery state when no candidates found', async () => {
    const emptyResponse: VisualDiscoveryResponse = {
      query_type: 'image',
      is_confident: false,
      message_en: 'Could not identify place.',
      message_kn: 'ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
      candidates: [],
      analysis_engine: 'deterministic_fallback',
      analyzed_at: '2026-10-24T18:00:00Z',
      privacy_notice: 'Processed ephemerally in memory without persistent retention.',
    };
    vi.spyOn(api, 'analyzeImageVisualDiscovery').mockResolvedValue(emptyResponse);

    render(
      <VisualDiscoveryCard
        language="en"
        onSelectCandidate={vi.fn()}
        onOpenDestinationDetailsBySlug={vi.fn()}
      />
    );

    const file = new File(['random bytes'], 'random.png', { type: 'image/png' });
    const fileInput = screen.getByTestId('visual-discovery-card-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByTestId('identify-place-btn'));

    expect(await screen.findByText(/No confident match found in the verified Karnataka destination catalogue/i)).toBeInTheDocument();
  });

  it('renders Path B external place recognition with honesty disclosure', async () => {
    const externalResponse: VisualDiscoveryResponse = {
      query_type: 'image',
      is_confident: true,
      message_en: 'Recognized landmark outside Karnataka catalog.',
      message_kn: 'ಕರ್ನಾಟಕ ಕ್ಯಾಟಲಾಗ್ ಹೊರಗಿನ ಸ್ಥಳ ಗುರುತಿಸಲಾಗಿದೆ.',
      candidates: [],
      external_place: {
        place_name: 'Taj Mahal',
        location_summary: 'Agra, Uttar Pradesh, India',
        confidence_label: 'strong_match',
        match_score: 0.95,
        summary: 'World-famous Mughal ivory-white marble mausoleum on the Yamuna riverbank.',
        visual_evidence: ['White marble dome and minarets', 'Charbagh Mughal garden setting'],
        is_karnataka: false,
        catalogue_status: 'outside_catalogue',
        source_url: 'https://whc.unesco.org/en/list/252',
        unverified_disclosure: 'This place is recognized outside our curated Karnataka destination catalogue. It cannot be used directly in Karnataka itinerary planning.',
      },
      analysis_engine: 'open_world_landmark_registry',
      analyzed_at: '2026-10-24T18:00:00Z',
      privacy_notice: 'Processed ephemerally in memory.',
    };
    vi.spyOn(api, 'analyzeImageVisualDiscovery').mockResolvedValue(externalResponse);

    render(
      <VisualDiscoveryCard
        language="en"
        onSelectCandidate={vi.fn()}
        onOpenDestinationDetailsBySlug={vi.fn()}
      />
    );

    const file = new File(['taj bytes'], 'taj.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('visual-discovery-card-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByTestId('identify-place-btn'));

    expect(await screen.findByTestId('external-place-recognition')).toBeInTheDocument();
    expect(screen.getByText('Taj Mahal')).toBeInTheDocument();
    expect(screen.getByText(/Outside Curated Catalogue/i)).toBeInTheDocument();
    expect(screen.getByText(/This place is recognized outside our curated Karnataka destination catalogue/i)).toBeInTheDocument();
    expect(screen.getByText(/White marble dome and minarets/i)).toBeInTheDocument();
  });
});

