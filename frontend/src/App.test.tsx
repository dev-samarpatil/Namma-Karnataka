import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as api from './lib/api';

describe('App Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the core title, subtitle, and foundation readiness notice', async () => {
    // Mock checkHealth to resolve successfully
    vi.spyOn(api, 'checkHealth').mockResolvedValue({
      status: 'ok',
      service: 'namma-karnataka-api',
      version: '0.1.0',
      environment: 'test',
      timestamp: new Date().toISOString(),
    });

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Namma Karnataka/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Discover Karnataka\. Plan your journey\./i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Application foundation is ready for feature development\./i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('status-connected')).toBeInTheDocument();
      expect(screen.getByText(/Connected \(v0\.1\.0\)/i)).toBeInTheDocument();
    });
  });

  it('handles backend unavailable state gracefully without crashing', async () => {
    // Mock checkHealth to fail
    vi.spyOn(api, 'checkHealth').mockRejectedValue(
      new api.ApiClientError('Connection refused', 0, 'NETWORK_ERROR')
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('status-disconnected')).toBeInTheDocument();
      expect(screen.getByText(/Disconnected \(Offline Mode\)/i)).toBeInTheDocument();
      expect(screen.getByTestId('offline-notice')).toBeInTheDocument();
    });
  });
});
