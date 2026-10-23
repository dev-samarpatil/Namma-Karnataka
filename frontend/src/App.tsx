import React, { useEffect, useState } from 'react';
import { checkHealth, HealthResponse, ApiClientError, getApiBaseUrl } from './lib/api';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const testConnection = async () => {
    setStatus('checking');
    setErrorMessage(null);
    try {
      const data = await checkHealth();
      setHealthData(data);
      setStatus('connected');
    } catch (err) {
      setStatus('disconnected');
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to reach backend API.');
      }
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="scaffold-card">
      <div className="badge-row">
        <span className="badge">Phase 1 — Project Foundation</span>
      </div>

      <header>
        <h1>Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)</h1>
        <p className="subtitle">Discover Karnataka. Plan your journey.</p>
      </header>

      <section className="status-banner" aria-label="Development status">
        <p className="status-text">
          Application foundation is ready for feature development.
        </p>
      </section>

      <section className="connectivity-card" aria-label="Backend connectivity">
        <div className="connectivity-header">
          <span className="connectivity-title">API Connection Status:</span>
          {status === 'checking' && (
            <span className="pill pill-warning" data-testid="status-checking">
              Checking...
            </span>
          )}
          {status === 'connected' && (
            <span className="pill pill-success" data-testid="status-connected">
              Connected (v{healthData?.version})
            </span>
          )}
          {status === 'disconnected' && (
            <span className="pill pill-danger" data-testid="status-disconnected">
              Disconnected (Offline Mode)
            </span>
          )}
        </div>

        <div className="connectivity-body">
          <p className="api-url">
            Target Endpoint: <code>{getApiBaseUrl()}/health</code>
          </p>

          {status === 'connected' && healthData && (
            <div className="connection-details" data-testid="connection-details">
              <span>Service: <code>{healthData.service}</code></span> | 
              <span> Environment: <code>{healthData.environment}</code></span>
            </div>
          )}

          {status === 'disconnected' && (
            <div className="offline-notice" data-testid="offline-notice">
              <p className="error-hint">
                Backend server is not running locally or unreachable.
                {errorMessage && <em> ({errorMessage})</em>}
              </p>
              <button
                type="button"
                className="btn-retry"
                onClick={testConnection}
              >
                Retry Connection
              </button>
            </div>
          )}
        </div>
      </section>

      <footer>
        <p className="architecture-note">
          Architecture: Decoupled React SPA + FastAPI Backend + Supabase PostgreSQL
        </p>
      </footer>
    </div>
  );
};

export default App;
