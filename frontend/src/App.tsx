import React, { useState, useEffect } from 'react';
import {
  Language,
  DestinationRead,
  PlanningRequest,
  PlanningRecommendationResponse,
  SavedTrip,
  SavedTripDetail,
} from './types';
import { getSavedLanguage, saveLanguage, useTranslation } from './lib/i18n';
import {
  generatePlanningRecommendations,
  saveCloudTrip,
  updateCloudTrip,
  getSharedTrip,
  ApiClientError,
} from './lib/api';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Header, ActiveTab } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { DestinationDiscovery } from './features/discovery/DestinationDiscovery';
import { TripPlannerForm } from './features/planner/TripPlannerForm';
import { ItineraryView } from './features/itinerary/ItineraryView';
import { SavedTripsView } from './features/saved-trips/SavedTripsView';

const SAVED_TRIPS_STORAGE_KEY = 'nk_saved_trips';
const AUTH_TOKEN_STORAGE_KEY = 'nk_auth_token';

export const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(getSavedLanguage());
  const { t } = useTranslation(language);
  const { isOnline, wasOffline } = useOnlineStatus();
  const [currentTab, setCurrentTab] = useState<ActiveTab>('discovery');

  // Preselected destination from discovery card
  const [preselectedDest, setPreselectedDest] = useState<DestinationRead | null>(null);

  // Active generated plan
  const [activePlan, setActivePlan] = useState<PlanningRecommendationResponse | null>(null);
  const [activeRequest, setActiveRequest] = useState<PlanningRequest | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);

  // Cloud auth token state
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const handleAuthTokenChange = (token: string | null) => {
    setAuthToken(token);
    try {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // localStorage fallback
    }
  };

  // Saved trips (Guest / Local device)
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_TRIPS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Active saved trip IDs for syncing edits
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [activeCloudTripId, setActiveCloudTripId] = useState<string | null>(null);

  // Phase 6 Sharing & Collaboration state
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);
  const [activeUserRole, setActiveUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  const [activeTripVersion, setActiveTripVersion] = useState<number>(1);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check URL query parameters for ?share_token= on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share_token');
    if (token) {
      getSharedTrip(token)
        .then((detail) => {
          setActivePlan(detail.snapshot);
          setActiveShareToken(token);
          setActiveUserRole(detail.role);
          setActiveTripVersion(detail.version);
          setActiveCloudTripId(detail.id);
          setCurrentTab('itinerary');
          setToastMessage(
            detail.role === 'editor'
              ? '✏️ Loaded shared trip with editor permissions!'
              : '👁️ Loaded shared trip with read-only viewer permissions.'
          );
          setTimeout(() => setToastMessage(null), 4000);
        })
        .catch(() => {
          setToastMessage('⚠️ Unable to load shared trip. The link may be expired or revoked.');
          setTimeout(() => setToastMessage(null), 5000);
        });
    }
  }, []);

  const handleReloadSharedTrip = async () => {
    if (!activeShareToken) return;
    try {
      const detail = await getSharedTrip(activeShareToken);
      setActivePlan(detail.snapshot);
      setActiveTripVersion(detail.version);
      setActiveUserRole(detail.role);
      setToastMessage('🔄 Reloaded latest plan version from server.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      setToastMessage('⚠️ Failed to reload shared trip.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

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
    setActiveTripId(null);
    setActiveCloudTripId(null);

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

  const handleSaveTrip = async (plan: PlanningRecommendationResponse) => {
    if (!activeRequest) return;

    const newTripId = `trip-${Date.now()}`;
    const newTrip: SavedTrip = {
      id: newTripId,
      title: `${activeRequest.duration_days}-Day ${activeRequest.origin_label} Itinerary`,
      saved_at: new Date().toISOString(),
      request: activeRequest,
      plan,
    };

    const updated = [newTrip, ...savedTrips];
    setSavedTrips(updated);
    setActiveTripId(newTripId);
    try {
      localStorage.setItem(SAVED_TRIPS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage fallback
    }

    if (authToken) {
      try {
        const cloudTrip = await saveCloudTrip(
          {
            title: newTrip.title,
            origin_label: activeRequest.origin_label,
            duration_days: activeRequest.duration_days,
            pace: activeRequest.pace || 'balanced',
            is_offbeat_preferred: activeRequest.is_offbeat_preferred,
            budget_min_inr: plan.items.reduce((sum, item) => sum + (item.entry_fee_min_inr || 0), 0),
            budget_max_inr: plan.items.reduce((sum, item) => sum + (item.entry_fee_max_inr || 0), 0),
            currency_code: 'INR',
            itinerary: plan,
          },
          authToken
        );
        setActiveCloudTripId(cloudTrip.id);
        setToastMessage('💾 Trip saved locally and synced to cloud!');
      } catch {
        setToastMessage('💾 Trip saved locally (cloud sync unavailable).');
      }
    } else {
      setToastMessage('💾 Trip saved to your device!');
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdatePlan = async (updatedPlan: PlanningRecommendationResponse) => {
    setActivePlan(updatedPlan);

    // Update in local savedTrips if this trip is saved locally
    if (activeTripId) {
      const updated = savedTrips.map((t) =>
        t.id === activeTripId ? { ...t, plan: updatedPlan } : t
      );
      setSavedTrips(updated);
      try {
        localStorage.setItem(SAVED_TRIPS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage fallback
      }
    }

    // Sync to cloud if active cloud trip exists and user is authenticated
    if (activeCloudTripId && authToken) {
      try {
        await updateCloudTrip(
          activeCloudTripId,
          { itinerary: updatedPlan },
          authToken
        );
      } catch {
        // cloud sync error, local state preserved
      }
    }

    setToastMessage('✨ Itinerary updated and schedule recalculated!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteTrip = (id: string) => {
    const updated = savedTrips.filter((t) => t.id !== id);
    setSavedTrips(updated);
    if (activeTripId === id) {
      setActiveTripId(null);
    }
    try {
      localStorage.setItem(SAVED_TRIPS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage fallback
    }
  };

  const handleSelectSavedTrip = (trip: SavedTrip) => {
    setActivePlan(trip.plan);
    setActiveRequest(trip.request);
    setActiveTripId(trip.id);
    setActiveCloudTripId(null);
    setCurrentTab('itinerary');
  };

  const handleSelectCloudTrip = (tripDetail: SavedTripDetail) => {
    setActivePlan(tripDetail.snapshot);
    setActiveTripId(null);
    setActiveCloudTripId(tripDetail.id);
    const validPace: 'relaxed' | 'balanced' | 'packed' =
      tripDetail.pace === 'relaxed' || tripDetail.pace === 'packed'
        ? tripDetail.pace
        : 'balanced';

    setActiveRequest({
      language,
      origin_label: tripDetail.origin_label,
      duration_days: tripDetail.duration_days,
      pace: validPace,
      is_offbeat_preferred: tripDetail.is_offbeat_preferred ?? false,
      categories: [],
    });
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

      {!isOnline && (
        <div
          className="offline-banner"
          role="status"
          aria-live="polite"
          data-testid="offline-status-banner"
          style={{
            background: '#fffbeb',
            borderBottom: '2px solid #f59e0b',
            color: '#92400e',
            padding: '10px 16px',
            textAlign: 'center',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          📶 {t('offlineBanner')}
        </div>
      )}

      {wasOffline && isOnline && (
        <div
          className="toast-notification"
          role="status"
          aria-live="polite"
          style={{ background: '#0f766e', color: '#fff' }}
        >
          🌐 Back online! Connected to Namma Karnataka server.
        </div>
      )}

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
            request={activeRequest || undefined}
            language={language}
            onReplan={() => setCurrentTab('planner')}
            onSaveTrip={handleSaveTrip}
            onUpdatePlan={handleUpdatePlan}
            tripId={activeTripId || undefined}
            cloudTripId={activeCloudTripId || undefined}
            authToken={authToken || undefined}
            shareToken={activeShareToken || undefined}
            userRole={activeUserRole || (activeCloudTripId || activeTripId ? 'owner' : undefined)}
            version={activeTripVersion}
            onReloadSharedTrip={handleReloadSharedTrip}
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
            authToken={authToken}
            onAuthTokenChange={handleAuthTokenChange}
            onSelectCloudTrip={handleSelectCloudTrip}
          />
        )}
      </main>

      <Footer language={language} />
    </div>
  );
};

export default App;
