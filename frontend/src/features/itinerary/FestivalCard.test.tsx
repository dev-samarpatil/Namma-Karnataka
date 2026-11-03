import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FestivalCard } from './FestivalCard';
import { CulturalEvent, FestivalEvent } from '../../types';

const MOCK_CULTURAL_EVENT: CulturalEvent = {
  id: 'mysuru-dasara',
  name_en: 'Mysuru Dasara (Nada Habba)',
  name_kn: 'ಮೈಸೂರು ದಸರಾ (ನಾಡಹಬ್ಬ)',
  description_en: 'Karnataka grand state festival with illuminated Mysore Palace and Jumboo Savari.',
  description_kn: 'ನಾಡಹಬ್ಬ ಎಂದೇ ಖ್ಯಾತವಾದ ಮೈಸೂರು ದಸರಾ. ವಿದ್ಯುದ್ದೀಪಗಳಿಂದ ಕಂಗೊಳಿಸುವ ಅರಮನೆ.',
  location_name: 'Mysuru Palace, Mysuru',
  district_code: 'KA-MYS',
  latitude: 12.3051,
  longitude: 76.6551,
  start_month: 10,
  end_month: 10,
  typical_start_date: '10-11',
  typical_end_date: '10-20',
  date_status: 'confirmed',
  source_name: 'Karnataka Tourism & District Administration Mysuru',
  source_url: 'https://mysoredasara.gov.in/',
  verification_status: 'verified_authentic',
  ticket_cost_min_inr: 0,
  ticket_cost_max_inr: 500,
  ticket_cost_status: 'free',
  event_category: 'major_festival',
  travel_advisory: 'Peak tourist period. Advance booking for transit is strongly advised.',
  image_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Mysore_Dasara_procession.jpg',
};

const MOCK_FESTIVAL_EVENT: FestivalEvent = {
  id: 'bengaluru-karaga',
  name: 'Bengaluru Karaga Shaktyotsava',
  imageUrl: '/assets/festivals/bengaluru-karaga.jpg',
  imageAlt: 'Bengaluru Karaga Shaktyotsava — Chickpet Bengaluru',
  category: 'major_festival',
  location: 'Chickpet, Bengaluru',
  startDate: '04-14',
  endDate: '04-23',
  description: 'Centuries-old nocturnal ritual and street festival honoring Draupadi.',
  entryFee: 0,
  verificationSource: 'BBMP Heritage Cell',
  officialUrl: 'https://bengaluruurban.nic.in/',
  travelAdvisory: 'All-night cultural procession through historic Chickpet.',
};

describe('FestivalCard Component', () => {
  it('renders complete horizontal card with title, badges, metadata, and advisory', () => {
    render(<FestivalCard event={MOCK_CULTURAL_EVENT} language="en" />);

    // Title
    expect(screen.getByText('Mysuru Dasara (Nada Habba)')).toBeInTheDocument();

    // Category badge
    expect(screen.getByText('major festival')).toBeInTheDocument();

    // Free entry badge
    expect(screen.getByText('Free Entry')).toBeInTheDocument();

    // Location & Date range
    expect(screen.getByText('Mysuru Palace, Mysuru')).toBeInTheDocument();
    expect(screen.getByText('10-11 – 10-20')).toBeInTheDocument();

    // Description & Advisory
    expect(
      screen.getByText('Karnataka grand state festival with illuminated Mysore Palace and Jumboo Savari.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Peak tourist period. Advance booking for transit is strongly advised.')
    ).toBeInTheDocument();

    // Verification and Official Portal link
    expect(
      screen.getByText(/Verified by Karnataka Tourism & District Administration Mysuru/i)
    ).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Official website for Mysuru Dasara/i });
    expect(link).toHaveAttribute('href', 'https://mysoredasara.gov.in/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders image with loading="lazy" and resolves to verified local asset path', () => {
    render(<FestivalCard event={MOCK_CULTURAL_EVENT} language="en" />);

    const img = screen.getByTestId('event-card-image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('loading', 'lazy');
    // Checks that it resolves to local verified asset
    expect(img).toHaveAttribute('src', '/assets/festivals/mysuru-dasara.jpg');
  });

  it('gracefully switches to designed category placeholder if image loading fails without showing broken icon', () => {
    const brokenEvent: CulturalEvent = {
      ...MOCK_CULTURAL_EVENT,
      id: 'unknown-rural-fair',
      image_url: 'https://example.com/broken-festival-image.jpg',
    };

    render(<FestivalCard event={brokenEvent} language="en" />);

    const img = screen.getByTestId('event-card-image');
    // Simulate image load error
    fireEvent.error(img);

    // Fallback is rendered with category icon and label
    const fallback = screen.getByTestId('event-image-fallback');
    expect(fallback).toBeInTheDocument();
    expect(screen.getByText('Official Event')).toBeInTheDocument();
  });

  it('supports direct FestivalEvent model and formats admission fees correctly', () => {
    const paidEvent: FestivalEvent = {
      ...MOCK_FESTIVAL_EVENT,
      entryFee: 150,
    };

    render(<FestivalCard event={paidEvent} language="en" />);

    expect(screen.getByText('Bengaluru Karaga Shaktyotsava')).toBeInTheDocument();
    expect(screen.getByText('₹150')).toBeInTheDocument();
    expect(screen.getByText(/Verified by BBMP Heritage Cell/i)).toBeInTheDocument();
  });

  it('renders Kannada bilingual text when language is kn', () => {
    render(<FestivalCard event={MOCK_CULTURAL_EVENT} language="kn" />);

    expect(screen.getByText('ಮೈಸೂರು ದಸರಾ (ನಾಡಹಬ್ಬ)')).toBeInTheDocument();
    expect(screen.getByText('ಉಚಿತ ಪ್ರವೇಶ')).toBeInTheDocument();
    expect(screen.getByText('ಅಧಿಕೃತ ಪುಟ')).toBeInTheDocument();
    expect(screen.getByText(/ಅಧಿಕೃತ ಮೂಲದಿಂದ ಪರಿಶೀಲಿಸಲಾಗಿದೆ/i)).toBeInTheDocument();
  });
});
