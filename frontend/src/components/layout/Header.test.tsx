import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';

describe('Header & Navigation Component (Phase 9)', () => {
  const defaultProps = {
    currentTab: 'discovery' as const,
    onTabChange: vi.fn(),
    language: 'en' as const,
    onLanguageChange: vi.fn(),
    hasActivePlan: false,
    savedTripsCount: 0,
  };

  it('renders desktop navigation tabs with correct active state and accessibility attributes', () => {
    render(<Header {...defaultProps} currentTab="discovery" />);

    const discoveryTab = screen.getByTestId('nav-tab-discovery');
    const plannerTab = screen.getByTestId('nav-tab-planner');
    const itineraryTab = screen.getByTestId('nav-tab-itinerary');
    const savedTab = screen.getByTestId('nav-tab-saved');

    expect(discoveryTab).toHaveAttribute('aria-current', 'page');
    expect(discoveryTab.className).toContain('active');
    expect(plannerTab).not.toHaveAttribute('aria-current');
    expect(itineraryTab).not.toHaveAttribute('aria-current');
    expect(savedTab).not.toHaveAttribute('aria-current');
  });

  it('renders mobile bottom navigation tabs with correct active state and accessibility attributes', () => {
    render(<Header {...defaultProps} currentTab="planner" />);

    const mobileDiscovery = screen.getByTestId('mobile-nav-tab-discovery');
    const mobilePlanner = screen.getByTestId('mobile-nav-tab-planner');
    const mobileItinerary = screen.getByTestId('mobile-nav-tab-itinerary');
    const mobileSaved = screen.getByTestId('mobile-nav-tab-saved');

    expect(mobilePlanner).toHaveAttribute('aria-current', 'page');
    expect(mobilePlanner.className).toContain('active');
    expect(mobileDiscovery).not.toHaveAttribute('aria-current');
    expect(mobileItinerary).not.toHaveAttribute('aria-current');
    expect(mobileSaved).not.toHaveAttribute('aria-current');
  });

  it('calls onTabChange when desktop navigation tabs are clicked', () => {
    const onTabChange = vi.fn();
    render(<Header {...defaultProps} onTabChange={onTabChange} />);

    fireEvent.click(screen.getByTestId('nav-tab-planner'));
    expect(onTabChange).toHaveBeenCalledWith('planner');

    fireEvent.click(screen.getByTestId('nav-tab-itinerary'));
    expect(onTabChange).toHaveBeenCalledWith('itinerary');

    fireEvent.click(screen.getByTestId('nav-tab-saved'));
    expect(onTabChange).toHaveBeenCalledWith('saved-trips');
  });

  it('calls onTabChange when mobile bottom navigation tabs are clicked', () => {
    const onTabChange = vi.fn();
    render(<Header {...defaultProps} onTabChange={onTabChange} />);

    fireEvent.click(screen.getByTestId('mobile-nav-tab-discovery'));
    expect(onTabChange).toHaveBeenCalledWith('discovery');

    fireEvent.click(screen.getByTestId('mobile-nav-tab-planner'));
    expect(onTabChange).toHaveBeenCalledWith('planner');

    fireEvent.click(screen.getByTestId('mobile-nav-tab-itinerary'));
    expect(onTabChange).toHaveBeenCalledWith('itinerary');

    fireEvent.click(screen.getByTestId('mobile-nav-tab-saved'));
    expect(onTabChange).toHaveBeenCalledWith('saved-trips');
  });

  it('displays active plan indicators when hasActivePlan is true', () => {
    render(<Header {...defaultProps} hasActivePlan={true} />);

    const desktopTab = screen.getByTestId('nav-tab-itinerary');
    expect(desktopTab.textContent).toContain('●');

    const mobileTab = screen.getByTestId('mobile-nav-tab-itinerary');
    expect(mobileTab.textContent).toContain('●');
  });

  it('displays saved trips badge count when savedTripsCount > 0', () => {
    render(<Header {...defaultProps} savedTripsCount={3} />);

    const desktopTab = screen.getByTestId('nav-tab-saved');
    expect(desktopTab.textContent).toContain('3');

    const mobileTab = screen.getByTestId('mobile-nav-tab-saved');
    expect(mobileTab.textContent).toContain('3');
  });

  it('toggles language when language button is clicked bilingually', () => {
    const onLanguageChange = vi.fn();
    const { rerender } = render(
      <Header {...defaultProps} language="en" onLanguageChange={onLanguageChange} />
    );

    const langBtn = screen.getByTestId('language-toggle-btn');
    fireEvent.click(langBtn);
    expect(onLanguageChange).toHaveBeenCalledWith('kn');

    rerender(
      <Header {...defaultProps} language="kn" onLanguageChange={onLanguageChange} />
    );
    fireEvent.click(langBtn);
    expect(onLanguageChange).toHaveBeenCalledWith('en');
  });
});
