import React, { useState, useEffect } from 'react';
import {
  Language,
  DestinationRead,
  PlanningRequest,
  PlanningRecommendationResponse,
  SavedTrip,
} from './types';
import { getSavedLanguage, saveLanguage } from './lib/i18n';
import { generatePlanningRecommendations, ApiClientError } from './lib/api';
import { Header, ActiveTab } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { DestinationDiscovery } from './features/discovery/DestinationDiscovery';
import { TripPlannerForm } from './features/planner/TripPlannerForm';
import { ItineraryView } from './features/itinerary/ItineraryView';
import { SavedTripsView } from './features/saved-trips/SavedTripsView';

const SAVED_TRIPS_STORAGE_KEY = 'nk_saved_trips';

export const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(getSavedLanguage());
  const [currentTab, setCurrentTab] = useState<ActiveTab>('discovery');

  // Preselected destination from discovery card
  const [preselectedDest, setPreselectedDest] = useState<DestinationRead | null>(null);

  // Active generated plan
  const [activePlan, setActivePlan] = useState<PlanningRecommendationResponse | null>(null);
  const [activeRequest, setActiveRequest] = useState<PlanningRequest | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);

  // Saved trips
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_TRIPS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
  };

  const handlePlanWithDestination = (dest: DestinationRead) => {
    setPreselectedDest(dest);
    setCurrentTab('planner');
  };

  const handleGeneratePlan = async (request: PlanningRequest) => {
    setIsGenerating(true);
    setPlannerError(null);
    setActiveRequest(request);

    try {
      const response = await generatePlanningRecommendations(request);
      setActivePlan(response);
      setCurrentTab('itinerary');
      setToastMessage('🎉 Itinerary generated successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setPlannerError(err.message);
      } else {
        setPlannerError(
          'Failed to generate itinerary. Please verify your connection to the server.'
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTrip = (plan: PlanningRecommendationResponse) => {
    if (!activeRequest) return;

    const newTrip: SavedTrip = {
      id: `trip-${Date.now()}`,
      title: `${activeRequest.duration_days}-Day ${activeRequest.origin_label} Itinerary`,
      saved_at: new Date().toISOString(),
      request: activeRequest,
      plan,
    };

    const updated = [newTrip, ...savedTrips];
    setSavedTrips(updated);
    try {
      localStorage.setItem(SAVED_TRIPS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage fallback
    }

    setToastMessage('💾 Trip saved to your device!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteTrip = (id: string) => {
    const updated = savedTrips.filter((t) => t.id !== id);
    setSavedTrips(updated);
    try {
      localStorage.setItem(SAVED_TRIPS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage fallback
    }
  };

  const handleSelectSavedTrip = (trip: SavedTrip) => {
    setActivePlan(trip.plan);
    setActiveRequest(trip.request);
    setCurrentTab('itinerary');
  };

  return (
    <div className="app-layout">
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        language={language}
        onLanguageChange={handleLanguageChange}
        hasActivePlan={Boolean(activePlan)}
        savedTripsCount={savedTrips.length}
      />

      {toastMessage && (
        <div className="toast-notification" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      {plannerError && currentTab === 'planner' && (
        <div className="app-error-banner" role="alert">
          <span>⚠️ {plannerError}</span>
          <button type="button" onClick={() => setPlannerError(null)}>
            ✕
          </button>
        </div>
      )}

      <main className="app-main">
        {currentTab === 'discovery' && (
          <DestinationDiscovery
            language={language}
            onPlanWithDestination={handlePlanWithDestination}
          />
        )}

        {currentTab === 'planner' && (
          <TripPlannerForm
            language={language}
            onSubmit={handleGeneratePlan}
            isSubmitting={isGenerating}
            preselectedDestination={preselectedDest}
            onClearPreselected={() => setPreselectedDest(null)}
          />
        )}

        {currentTab === 'itinerary' && (
          <ItineraryView
            plan={activePlan}
            language={language}
            onReplan={() => setCurrentTab('planner')}
            onSaveTrip={handleSaveTrip}
            isSaved={
              Boolean(
                activePlan &&
                  savedTrips.some(
                    (t) =>
                      t.plan.items.length === activePlan.items.length &&
                      t.plan.items[0]?.id === activePlan.items[0]?.id
                  )
              )
            }
          />
        )}

        {currentTab === 'saved-trips' && (
          <SavedTripsView
            savedTrips={savedTrips}
            language={language}
            onSelectTrip={handleSelectSavedTrip}
            onDeleteTrip={handleDeleteTrip}
            onNavigatePlanner={() => setCurrentTab('planner')}
          />
        )}
      </main>

      <Footer language={language} />
    </div>
  );
};

export default App;
