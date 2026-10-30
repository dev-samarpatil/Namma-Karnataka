import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LiquidMorphFloatingMenu } from './liquid-morph-floating-menu';

describe('LiquidMorphFloatingMenu Component', () => {
  const defaultProps = {
    currentTab: 'home' as const,
    onTabChange: vi.fn(),
    language: 'en' as const,
    hasActivePlan: false,
    savedTripsCount: 0,
  };

  it('renders collapsed menu trigger with Menu label and accessibility attributes', () => {
    render(<LiquidMorphFloatingMenu {...defaultProps} />);

    const trigger = screen.getByTestId('floating-menu-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Menu');
  });

  it('renders in Kannada bilingually when language is kn', () => {
    render(<LiquidMorphFloatingMenu {...defaultProps} language="kn" />);

    const trigger = screen.getByTestId('floating-menu-trigger');
    expect(trigger).toHaveTextContent('ಮೆನು');
  });

  it('expands menu when trigger is clicked, showing all 5 navigation options', () => {
    render(<LiquidMorphFloatingMenu {...defaultProps} />);

    fireEvent.click(screen.getByTestId('floating-menu-trigger'));

    expect(screen.getByTestId('nav-tab-home')).toBeInTheDocument();
    expect(screen.getByTestId('nav-tab-discovery')).toBeInTheDocument();
    expect(screen.getByTestId('nav-tab-planner')).toBeInTheDocument();
    expect(screen.getByTestId('nav-tab-itinerary')).toBeInTheDocument();
    expect(screen.getByTestId('nav-tab-saved')).toBeInTheDocument();
  });

  it('calls onTabChange and closes menu when a navigation item is selected', () => {
    const onTabChange = vi.fn();
    render(<LiquidMorphFloatingMenu {...defaultProps} onTabChange={onTabChange} />);

    // Open menu
    fireEvent.click(screen.getByTestId('floating-menu-trigger'));

    // Select Explore Destinations
    fireEvent.click(screen.getByTestId('nav-tab-discovery'));
    expect(onTabChange).toHaveBeenCalledWith('discovery');

    // Menu closes, trigger reappears
    expect(screen.getByTestId('floating-menu-trigger')).toBeInTheDocument();
  });

  it('displays active plan indicator when hasActivePlan is true', () => {
    render(<LiquidMorphFloatingMenu {...defaultProps} hasActivePlan={true} />);

    fireEvent.click(screen.getByTestId('floating-menu-trigger'));

    const itineraryTab = screen.getByTestId('nav-tab-itinerary');
    expect(itineraryTab.textContent).toContain('●');
  });

  it('displays saved trips count badge when savedTripsCount > 0', () => {
    render(<LiquidMorphFloatingMenu {...defaultProps} savedTripsCount={4} />);

    fireEvent.click(screen.getByTestId('floating-menu-trigger'));

    const savedTab = screen.getByTestId('nav-tab-saved');
    expect(savedTab.textContent).toContain('4');
  });

  it('closes menu when Escape key is pressed', () => {
    render(<LiquidMorphFloatingMenu {...defaultProps} />);

    fireEvent.click(screen.getByTestId('floating-menu-trigger'));
    expect(screen.getByTestId('nav-tab-planner')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('floating-menu-trigger')).toBeInTheDocument();
  });

  it('closes menu when clicking close X button', () => {
    render(<LiquidMorphFloatingMenu {...defaultProps} />);

    fireEvent.click(screen.getByTestId('floating-menu-trigger'));
    const closeBtn = screen.getByLabelText(/Close navigation menu/i);
    fireEvent.click(closeBtn);

    expect(screen.getByTestId('floating-menu-trigger')).toBeInTheDocument();
  });
});
