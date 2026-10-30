import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';

describe('Compact Header Component', () => {
  const defaultProps = {
    onTabChange: vi.fn(),
    language: 'en' as const,
    onLanguageChange: vi.fn(),
  };

  it('renders brand logo, title, and tagline in English', () => {
    render(<Header {...defaultProps} />);

    expect(screen.getByText('Namma Karnataka')).toBeInTheDocument();
    expect(screen.getByText('(ನಮ್ಮ ಕರ್ನಾಟಕ)')).toBeInTheDocument();
    expect(screen.getByText(/Discover Karnataka\. Plan your journey\./i)).toBeInTheDocument();
  });

  it('renders brand title in Kannada when language is kn', () => {
    render(<Header {...defaultProps} language="kn" />);

    expect(screen.getByText('ನಮ್ಮ ಕರ್ನಾಟಕ')).toBeInTheDocument();
  });

  it('navigates home when brand container is clicked', () => {
    const onTabChange = vi.fn();
    render(<Header {...defaultProps} onTabChange={onTabChange} />);

    const brand = screen.getByLabelText(/Namma Karnataka Home/i);
    fireEvent.click(brand);
    expect(onTabChange).toHaveBeenCalledWith('home');
  });

  it('renders floating menu button directly beside language switcher without old nav bar', () => {
    const { container } = render(<Header {...defaultProps} />);

    expect(screen.getByTestId('floating-menu-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('language-toggle-btn')).toBeInTheDocument();
    expect(container.querySelector('.header-nav')).toBeNull();
    expect(container.querySelector('.desktop-nav')).toBeNull();
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
