import React from 'react';
import { Language } from '../../types';

interface FooterProps {
  language: Language;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-content">
        <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
          <img
            src="/brand/namma-karnataka-logo.png"
            alt="Namma Karnataka"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#17243A' }}>
            Namma Karnataka
          </span>
        </div>
        <p className="footer-tagline">
          {language === 'kn'
            ? 'ಕರ್ನಾಟಕದ ಸಂಸ್ಕೃತಿ, ಇತಿಹಾಸ ಮತ್ತು ನೈಸರ್ಗಿಕ ಸೌಂದರ್ಯವನ್ನು ಪ್ರಸ್ತುತಪಡಿಸುವ ಅಧಿಕೃತ ವೇದಿಕೆ.'
            : 'Authentic Karnataka travel discovery grounded in verified cultural and geographic data.'}
        </p>
        <p className="footer-tech">
          Decoupled React 18 SPA • FastAPI Backend • Supabase PostgreSQL • PostGIS • Independent AI Adapters
        </p>
      </div>
    </footer>
  );
};
