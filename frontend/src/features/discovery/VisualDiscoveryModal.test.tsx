import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VisualDiscoveryModal } from './VisualDiscoveryModal';
import * as api from '../../lib/api';
import { VisualDiscoveryResponse } from '../../types';

describe('VisualDiscoveryModal Component', () => {
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
        district_code: 'KA-MYS',
        category: 'architecture',
        summary_en: 'Historic royal residence of Wodeyars',
        summary_kn: 'ಒಡೆಯರ್ ರಾಜವಂಶದ ಐತಿಹಾಸಿಕ ಆಸ್ಥಾನ',
        match_score: 95,
        confidence_label: 'strong_match',
        visual_evidence: {
          architectural_style: 'Indo-Saracenic royal palace with ornate domes',
          landscape_clues: ['Sprawling palace courtyards'],
          observed_features: ['Three-story stone facade with ornate arches'],
          detected_signage: 'Mysore Palace entrance',
        },
        matching_reasons: ['Distinctive central gold dome', 'Three-story stone palace facade'],
        uncertainty_notes: 'Visual evidence strongly corroborates Mysuru Palace architecture.',
      },
    ],
    analyzed_at: '2026-10-24T18:00:00Z',
    privacy_notice: 'Processed ephemerally in memory.',
  };

  const MOCK_NO_MATCH_RESPONSE: VisualDiscoveryResponse = {
    query_type: 'image',
    is_confident: false,
    message_en: 'We could not reliably identify a specific Karnataka destination from this image.',
    message_kn: 'ಈ ಚಿತ್ರದಿಂದ ನಿರ್ದಿಷ್ಟ ಕರ್ನಾಟಕ ತಾಣವನ್ನು ವಿಶ್ವಾಸಾರ್ಹವಾಗಿ ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    candidates: [],
    analyzed_at: '2026-10-24T18:00:00Z',
    privacy_notice: 'Processed ephemerally in memory.',
  };

  it('renders modal with privacy badge, upload controls, and tabs', () => {
    render(
      <VisualDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        language="en"
        onSelectCandidate={vi.fn()}
        onOpenDestinationDetailsBySlug={vi.fn()}
      />
    );

    expect(screen.getByTestId('visual-discovery-modal')).toBeDefined();
    expect(screen.getByTestId('privacy-disclosure-notice')).toBeDefined();
    expect(screen.getByText(/Ephemeral & Private/i)).toBeDefined();
    expect(screen.getByTestId('tab-upload-photo')).toBeDefined();
    expect(screen.getByTestId('tab-upload-video')).toBeDefined();
  });

  it('analyzes photo and renders grounded candidate destination card with confidence badge', async () => {
    const analyzeSpy = vi.spyOn(api, 'analyzeImageVisualDiscovery').mockResolvedValue(MOCK_SUCCESS_RESPONSE);
    const handleSelectCandidate = vi.fn();
    const handleOpenDetails = vi.fn();

    render(
      <VisualDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        language="en"
        onSelectCandidate={handleSelectCandidate}
        onOpenDestinationDetailsBySlug={handleOpenDetails}
      />
    );

    // Simulate file selection
    const file = new File(['mock-image-bytes'], 'mysore_gate.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('visual-file-input') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // The analyze button appears after a file is selected
    const analyzeBtn = screen.getByTestId('btn-analyze-media');
    expect(analyzeBtn).toBeDefined();
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('candidate-card-mysore-palace')).toBeDefined();
      expect(screen.getByText('Mysuru Palace')).toBeDefined();
      expect(screen.getByText('Historic royal residence of Wodeyars')).toBeDefined();
      expect(screen.getByText(/Indo-Saracenic royal palace/i)).toBeDefined();
    });

    // Test View Details trigger
    const detailsBtn = screen.getByTestId('view-candidate-details-mysore-palace');
    fireEvent.click(detailsBtn);
    expect(handleOpenDetails).toHaveBeenCalledWith('mysore-palace');

    // Test Plan With This trigger
    const planBtn = screen.getByTestId('plan-candidate-mysore-palace');
    fireEvent.click(planBtn);
    expect(handleSelectCandidate).toHaveBeenCalledWith(MOCK_SUCCESS_RESPONSE.candidates[0]);
  });

  it('displays honest uncertainty message when no confident match is identified', async () => {
    vi.spyOn(api, 'analyzeImageVisualDiscovery').mockResolvedValue(MOCK_NO_MATCH_RESPONSE);

    render(
      <VisualDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        language="en"
        onSelectCandidate={vi.fn()}
        onOpenDestinationDetailsBySlug={vi.fn()}
      />
    );

    const file = new File(['mock-image-bytes'], 'random_trees.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByTestId('visual-file-input') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const analyzeBtn = screen.getByTestId('btn-analyze-media');
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('no-confident-match-alert')).toBeDefined();
    });
  });

  it('switches between photograph and video tabs', () => {
    render(
      <VisualDiscoveryModal
        isOpen={true}
        onClose={vi.fn()}
        language="en"
        onSelectCandidate={vi.fn()}
        onOpenDestinationDetailsBySlug={vi.fn()}
      />
    );

    const videoTab = screen.getByTestId('tab-upload-video');
    fireEvent.click(videoTab);

    expect(screen.getByText(/Select a short travel video/i)).toBeDefined();
  });
});
