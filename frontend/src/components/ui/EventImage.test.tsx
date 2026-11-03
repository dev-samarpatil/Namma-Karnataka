import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EventImage } from './EventImage';

describe('EventImage Component', () => {
  it('renders generic remote image with proxy URL and loading skeleton', () => {
    render(
      <EventImage
        src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Generic_Procession.jpg"
        alt="Karnataka Procession"
        category="major_festival"
      />
    );

    // Initial state: image element is present with proxy src
    const img = screen.getByTestId('event-card-image');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('/destinations/media/proxy?url=');

    // Skeleton is displayed while loading
    expect(screen.getByTestId('event-image-skeleton')).toBeInTheDocument();

    // Trigger load event
    fireEvent.load(img);
    expect(screen.queryByTestId('event-image-skeleton')).not.toBeInTheDocument();
  });

  it('resolves known festival eventId to verified local asset path', () => {
    render(
      <EventImage
        eventId="karnataka-rajyotsava"
        alt="Karnataka Rajyotsava Celebrations"
        category="major_festival"
      />
    );

    const img = screen.getByTestId('event-card-image');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('/assets/festivals/karnataka-rajyotsava.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('renders graceful category fallback illustration on image failure without broken image icon', () => {
    render(
      <EventImage
        src="https://invalid-url.example.com/broken.jpg"
        alt="Bengaluru Karaga"
        category="cultural_festival"
      />
    );

    const img = screen.getByTestId('event-card-image');
    // First error triggers direct URL fallback
    fireEvent.error(img);
    // Second error triggers permanent graceful category illustration
    fireEvent.error(img);

    expect(screen.getByTestId('event-image-fallback')).toBeInTheDocument();
    expect(screen.getByText(/cultural festival/i)).toBeInTheDocument();
  });

  it('immediately displays designed fallback placeholder when src is missing or empty', () => {
    render(
      <EventImage
        src={null}
        alt="Basavanagudi Groundnut Fair"
        category="regional_festival"
      />
    );

    expect(screen.queryByTestId('event-card-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('event-image-fallback')).toBeInTheDocument();
    expect(screen.getByText(/regional festival/i)).toBeInTheDocument();
  });
});
