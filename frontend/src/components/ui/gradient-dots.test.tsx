import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GradientDots } from './gradient-dots';

describe('GradientDots Component', () => {
  it('renders with aria-hidden="true" and decorative background role', () => {
    render(<GradientDots />);
    const el = screen.getByTestId('gradient-dots-background');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveClass('pointer-events-none');
    expect(el).toHaveClass('overflow-hidden');
  });

  it('applies custom background color and class names', () => {
    render(
      <GradientDots
        backgroundColor="#FFFEFA"
        className="custom-dots-test opacity-80"
      />
    );
    const el = screen.getByTestId('gradient-dots-background');
    expect(el).toHaveClass('custom-dots-test');
    expect(el).toHaveClass('opacity-80');
    expect(el).toHaveStyle({ backgroundColor: '#FFFEFA' });
  });

  it('renders SVG repeating pattern with correct dotSize and spacing', () => {
    const { container } = render(
      <GradientDots dotSize={2} spacing={24} />
    );
    const pattern = container.querySelector('pattern');
    expect(pattern).not.toBeNull();
    expect(pattern).toHaveAttribute('width', '24');
    expect(pattern).toHaveAttribute('height', '24');

    const circle = container.querySelector('pattern circle');
    expect(circle).not.toBeNull();
    expect(circle).toHaveAttribute('r', '2');
    expect(circle).toHaveAttribute('cx', '12');
    expect(circle).toHaveAttribute('cy', '12');
  });

  it('renders four pastel gradient blobs for smooth multi-color ambiance', () => {
    const { container } = render(<GradientDots duration={30} />);
    const blobs = container.querySelectorAll('.gradient-blob');
    expect(blobs.length).toBe(4);

    expect(container.querySelector('.blob-cyan')).toBeInTheDocument();
    expect(container.querySelector('.blob-mint')).toBeInTheDocument();
    expect(container.querySelector('.blob-lavender')).toBeInTheDocument();
    expect(container.querySelector('.blob-amber')).toBeInTheDocument();
  });

  it('renders interactive pointer glow and highlight layers when interactive is enabled', () => {
    render(<GradientDots interactive={true} />);
    expect(screen.getByTestId('gradient-dots-pointer-glow')).toBeInTheDocument();
    expect(screen.getByTestId('gradient-dots-pointer-highlight')).toBeInTheDocument();
  });

  it('does not render pointer interactive layers when interactive is false', () => {
    render(<GradientDots interactive={false} />);
    expect(screen.queryByTestId('gradient-dots-pointer-glow')).toBeNull();
    expect(screen.queryByTestId('gradient-dots-pointer-highlight')).toBeNull();
  });

  it('handles window pointermove without error and updates pointer coordinates', () => {
    const { container } = render(<GradientDots interactive={true} />);
    const el = container.querySelector('.gradient-dots-wrapper') as HTMLElement;
    expect(el).not.toBeNull();

    fireEvent.pointerMove(window, { clientX: 250, clientY: 180, pointerType: 'mouse' });
    fireEvent.pointerDown(window, { clientX: 250, clientY: 180, pointerType: 'touch' });
    fireEvent.pointerLeave(document);
  });

  it('renders optional decorative children when passed', () => {
    render(
      <GradientDots>
        <div data-testid="decorative-child">Custom Overlay</div>
      </GradientDots>
    );
    expect(screen.getByTestId('decorative-child')).toBeInTheDocument();
  });
});
