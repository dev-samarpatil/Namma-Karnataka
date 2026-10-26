import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TripPlannerForm } from './TripPlannerForm';

describe('TripPlannerForm Numeric Inputs & Transport Mode (Workstreams A, C, D)', () => {
  it('renders editable numeric inputs for trip duration and travelers with correct defaults', () => {
    const handleSubmit = vi.fn();
    render(
      <TripPlannerForm
        language="en"
        onSubmit={handleSubmit}
        isSubmitting={false}
      />
    );

    const durationInput = screen.getByTestId('planner-duration-input') as HTMLInputElement;
    const travelersInput = screen.getByTestId('planner-travelers-input') as HTMLInputElement;

    expect(durationInput).toBeInTheDocument();
    expect(durationInput.value).toBe('2');
    expect(durationInput.getAttribute('min')).toBe('1');
    expect(durationInput.getAttribute('max')).toBe('7');

    expect(travelersInput).toBeInTheDocument();
    expect(travelersInput.value).toBe('2');
    expect(travelersInput.getAttribute('min')).toBe('1');
    expect(travelersInput.getAttribute('max')).toBe('20');
  });

  it('allows typing direct numeric duration and enforces 1-7 days bounds', () => {
    const handleSubmit = vi.fn();
    render(
      <TripPlannerForm
        language="en"
        onSubmit={handleSubmit}
        isSubmitting={false}
      />
    );

    const durationInput = screen.getByTestId('planner-duration-input') as HTMLInputElement;
    const submitBtn = screen.getByTestId('submit-plan-button');

    // Type 5 days
    fireEvent.change(durationInput, { target: { value: '5' } });
    expect(durationInput.value).toBe('5');
    expect(submitBtn).not.toBeDisabled();

    // Type 0 days (invalid)
    fireEvent.change(durationInput, { target: { value: '0' } });
    expect(screen.getByText(/Trip duration must be between 1 and 7 days/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Type 9 days (invalid)
    fireEvent.change(durationInput, { target: { value: '9' } });
    expect(screen.getByText(/Trip duration must be between 1 and 7 days/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Revert to valid 3 days
    fireEvent.change(durationInput, { target: { value: '3' } });
    expect(screen.queryByText(/Trip duration must be between 1 and 7 days/i)).not.toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();
  });

  it('allows typing custom traveler counts up to 20 and rejects invalid numbers', () => {
    const handleSubmit = vi.fn();
    render(
      <TripPlannerForm
        language="en"
        onSubmit={handleSubmit}
        isSubmitting={false}
      />
    );

    const travelersInput = screen.getByTestId('planner-travelers-input') as HTMLInputElement;
    const submitBtn = screen.getByTestId('submit-plan-button');

    // Type 15 travelers
    fireEvent.change(travelersInput, { target: { value: '15' } });
    expect(travelersInput.value).toBe('15');
    expect(submitBtn).not.toBeDisabled();

    // Type 0 travelers (invalid)
    fireEvent.change(travelersInput, { target: { value: '0' } });
    expect(screen.getByText(/Travelers count must be between 1 and 20 people/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Type 25 travelers (invalid)
    fireEvent.change(travelersInput, { target: { value: '25' } });
    expect(screen.getByText(/Travelers count must be between 1 and 20 people/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });

  it('submits mixed transportation mode when selected by user', () => {
    const handleSubmit = vi.fn();
    render(
      <TripPlannerForm
        language="en"
        onSubmit={handleSubmit}
        isSubmitting={false}
      />
    );

    // Select mixed mode
    const modeSelect = screen.getByTestId('planner-travel-mode');
    fireEvent.change(modeSelect, { target: { value: 'mixed' } });

    // Submit form
    const submitBtn = screen.getByTestId('submit-plan-button');
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        travel_mode: 'mixed',
        duration_days: 2,
        travelers_count: 2,
      })
    );
  });

  it('provides bilingual Kannada labels and error messages', () => {
    const handleSubmit = vi.fn();
    render(
      <TripPlannerForm
        language="kn"
        onSubmit={handleSubmit}
        isSubmitting={false}
      />
    );

    expect(screen.getByText(/ಪ್ರವಾಸದ ದಿನಗಳು/i)).toBeInTheDocument();
    expect(screen.getByText(/ಪ್ರಯಾಣಿಕರ ಸಂಖ್ಯೆ/i)).toBeInTheDocument();

    const durationInput = screen.getByTestId('planner-duration-input');
    fireEvent.change(durationInput, { target: { value: '10' } });

    expect(screen.getByText(/ಪ್ರವಾಸದ ದಿನಗಳು ೧ ರಿಂದ ೭ ದಿನಗಳ ನಡುವೆ ಇರಬೇಕು/i)).toBeInTheDocument();
  });
});
