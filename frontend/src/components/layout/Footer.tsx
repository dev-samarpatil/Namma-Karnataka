import React from 'react';
import { Language } from '../../types';

interface FooterProps {
  language: Language;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-content">
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
