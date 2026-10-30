import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PolaroidLineCarousel, PolaroidSlide } from './polaroid-line-carousel';

const MOCK_SLIDES: PolaroidSlide[] = [
  {
    dayNumber: 1,
    title: 'Bengaluru Heritage',
    district: 'Bengaluru Urban',
    caption: 'City exploration and botanical gardens',
    destinationsCount: 3,
    image: 'https://example.com/bengaluru.jpg',
  },
  {
    dayNumber: 2,
    title: 'Mysuru Palaces',
    district: 'Mysuru',
    caption: 'Palaces, silk weaving and royal art',
    destinationsCount: 4,
    image: 'https://example.com/mysuru.jpg',
  },
  {
    dayNumber: 3,
    title: 'Coorg Hills & Coffee',
    district: 'Kodagu (Coorg)',
    caption: 'Waterfalls, coffee estates and viewpoints',
    destinationsCount: 3,
    image: '', // Test branded placeholder
  },
];

describe('PolaroidLineCarousel Component', () => {
  it('renders all day slides with titles, day numbers, and districts', () => {
    render(<PolaroidLineCarousel slides={MOCK_SLIDES} activeIndex={0} />);

    expect(screen.getByTestId('polaroid-line-carousel')).toBeInTheDocument();
    expect(screen.getAllByText('Bengaluru Heritage').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mysuru Palaces')).toBeInTheDocument();
    expect(screen.getByText('Coorg Hills & Coffee')).toBeInTheDocument();

    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Day 2')).toBeInTheDocument();
    expect(screen.getByText('Day 3')).toBeInTheDocument();

    expect(screen.getAllByText('Bengaluru Urban').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mysuru').length).toBeGreaterThanOrEqual(1);
  });

  it('renders clean branded placeholder when no authentic photograph is available', () => {
    render(<PolaroidLineCarousel slides={MOCK_SLIDES} activeIndex={2} />);

    const placeholder = screen.getByTestId('polaroid-placeholder-day-3');
    expect(placeholder).toBeInTheDocument();
    expect(screen.getAllByText('Kodagu (Coorg)').length).toBeGreaterThanOrEqual(1);
  });

  it('fires onChange when a slide card is clicked', () => {
    const handleChange = vi.fn();
    render(<PolaroidLineCarousel slides={MOCK_SLIDES} activeIndex={0} onChange={handleChange} />);

    const slide2 = screen.getByTestId('polaroid-slide-2');
    fireEvent.click(slide2);

    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('navigates next and previous using arrow buttons', () => {
    const handleChange = vi.fn();
    render(<PolaroidLineCarousel slides={MOCK_SLIDES} activeIndex={0} onChange={handleChange} />);

    const nextBtn = screen.getByTestId('polaroid-next-btn');
    const prevBtn = screen.getByTestId('polaroid-prev-btn');

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('supports keyboard navigation with arrow keys', () => {
    const handleChange = vi.fn();
    render(<PolaroidLineCarousel slides={MOCK_SLIDES} activeIndex={0} onChange={handleChange} />);

    const carousel = screen.getByTestId('polaroid-line-carousel');
    fireEvent.keyDown(carousel, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it('handles image error by showing branded placeholder fallback without crashing', () => {
    render(<PolaroidLineCarousel slides={MOCK_SLIDES} activeIndex={0} />);

    const img = screen.getByAltText('Bengaluru Heritage');
    fireEvent.error(img);

    expect(screen.getByTestId('polaroid-placeholder-day-1')).toBeInTheDocument();
  });
});
