import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="scaffold-card">
      <span className="badge">Phase 1A — Scaffold Baseline</span>
      <h1>Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)</h1>
      <p>
        The application scaffold and clean directory structure have been established.
        Feature implementation, bilingual UI components, and planner modules will proceed in subsequent phases.
      </p>
      <div className="info-box">
        Repository layout: monorepo (frontend + backend + supabase + data)
      </div>
    </div>
  );
};

export default App;
