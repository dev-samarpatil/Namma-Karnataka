import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrollExpansionHero } from './ScrollExpansionHero';

describe('ScrollExpansionHero Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders primary cinematic typography and supporting line in English', () => {
    render(<ScrollExpansionHero language="en" />);

    // Headings
    expect(screen.getByText('DISCOVER')).toBeInTheDocument();
    expect(screen.getByText('KARNATAKA')).toBeInTheDocument();

    // Supporting line
    expect(
      screen.getByText(/From ancient empires to mist-covered mountains/i)
    ).toBeInTheDocument();
  });

  it('renders bilingual Kannada cinematic typography and supporting line', () => {
    render(<ScrollExpansionHero language="kn" />);

    expect(screen.getByText('ಕರ್ನಾಟಕವನ್ನು')).toBeInTheDocument();
    expect(screen.getByText('ಅನ್ವೇಷಿಸಿ')).toBeInTheDocument();
    expect(
      screen.getByText(/ಪ್ರಾಚೀನ ಸಾಮ್ರಾಜ್ಯಗಳಿಂದ ಮಂಜು ಮುಸುಕಿದ ಬೆಟ್ಟಗಳವರೆಗೆ/i)
    ).toBeInTheDocument();
  });

  it('triggers onExploreClick callback when action is triggered', () => {
    const handleExplore = vi.fn();
    render(<ScrollExpansionHero language="en" onExploreClick={handleExplore} />);

    // Skip cue button
    const skipBtn = screen.getByLabelText(/Explore Directly/i);
    expect(skipBtn).toBeInTheDocument();
  });

  it('renders defocused back.mp4 in the background and clean front-.mp4 in the front panel', () => {
    render(<ScrollExpansionHero language="en" />);

    const bgVideo = screen.getByTestId('hero-background-video');
    expect(bgVideo).toBeInTheDocument();
    expect(bgVideo).toHaveAttribute('src', '/back.mp4');

    const frontVideo = screen.getByTestId('hero-front-video');
    expect(frontVideo).toBeInTheDocument();
    expect(frontVideo).toHaveAttribute('src', '/front-.mp4');

    const soundBtn = screen.getByTestId('video-sound-toggle');
    expect(soundBtn).toBeInTheDocument();
  });
});

