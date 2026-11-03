import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';
import { Sparkles } from 'lucide-react';

describe('Button Design System Component', () => {
  it('renders with default props (variant="secondary", size="md", shape="rounded")', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveStyle({
      background: '#ffffff',
      color: '#172033',
      borderRadius: '10px',
      height: '40px',
    });
  });

  it('renders primary variant with #0798B5 cyan background', () => {
    render(<Button variant="primary">Explore Karnataka</Button>);
    const button = screen.getByRole('button', { name: /explore karnataka/i });
    expect(button).toHaveStyle({
      background: '#0798B5',
      color: '#ffffff',
    });
  });

  it('renders warning variant with #F59E0B background', () => {
    render(<Button variant="warning">Warning Action</Button>);
    const button = screen.getByRole('button', { name: /warning action/i });
    expect(button).toHaveStyle({
      background: '#F59E0B',
    });
  });

  it('renders destructive variant with #DC2626 background', () => {
    render(<Button variant="destructive">Delete Item</Button>);
    const button = screen.getByRole('button', { name: /delete item/i });
    expect(button).toHaveStyle({
      background: '#DC2626',
      color: '#ffffff',
    });
  });

  it('renders tertiary variant with transparent background', () => {
    render(<Button variant="tertiary">Tertiary Action</Button>);
    const button = screen.getByRole('button', { name: /tertiary action/i });
    expect(button).toHaveStyle({
      background: 'transparent',
    });
  });

  it('supports sizes: sm, md, lg, icon', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ height: '32px' });

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ height: '48px' });

    rerender(<Button size="icon" aria-label="Icon only" prefixIcon={<Sparkles size={16} />} />);
    expect(screen.getByRole('button')).toHaveStyle({ width: '40px', height: '40px' });
  });

  it('supports shapes: square, rounded, circle', () => {
    const { rerender } = render(<Button shape="square">Square</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ borderRadius: '6px' });

    rerender(<Button shape="circle">Circle</Button>);
    expect(screen.getByRole('button')).toHaveStyle({ borderRadius: '9999px' });
  });

  it('handles click events and disallows clicks when disabled', () => {
    const handleClick = vi.fn();
    const { rerender } = render(<Button onClick={handleClick}>Enabled</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(<Button onClick={handleClick} disabled>Disabled</Button>);
    const disabledBtn = screen.getByRole('button');
    expect(disabledBtn).toBeDisabled();
    fireEvent.click(disabledBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders loading state with disabled attribute and without triggering onClick', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Generating Plan</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders prefix and suffix icons correctly', () => {
    render(
      <Button
        prefixIcon={<span data-testid="prefix-icon">🌟</span>}
        suffixIcon={<span data-testid="suffix-icon">➡️</span>}
      >
        With Icons
      </Button>
    );
    expect(screen.getByTestId('prefix-icon')).toBeInTheDocument();
    expect(screen.getByTestId('suffix-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icons')).toBeInTheDocument();
  });

  it('forwards ref properly to DOM button', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

