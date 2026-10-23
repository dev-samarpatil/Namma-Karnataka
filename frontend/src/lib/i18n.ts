/**
 * Bilingual Internationalization (i18n) Engine for Namma Karnataka.
 * Preserves language selection in localStorage across navigation, refresh, and errors.
 */

import { Language } from '../types';

export const LANGUAGE_STORAGE_KEY = 'nk_user_language';

export function getSavedLanguage(): Language {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'kn' || saved === 'en') {
      return saved;
    }
  }
  return 'en';
}

export function saveLanguage(lang: Language): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }
}

export const translations = {
  en: {
    // App Header & Branding
    appTitle: 'Namma Karnataka',
    appTitleKannada: 'ನಮ್ಮ ಕರ್ನಾಟಕ',
    appSubtitle: 'Discover Karnataka. Plan your journey.',
    navExplore: 'Explore Destinations',
    navPlan: 'Plan Trip',
    navItinerary: 'Your Itinerary',
    navSavedTrips: 'Saved Trips',
    switchLanguage: 'ಕನ್ನಡ',

    // Discovery & Filters
    searchPlaceholder: 'Search destinations by name or keyword...',
    allDistricts: 'All Districts',
    allCategories: 'All Categories',
    offbeatOnly: 'Offbeat Gems Only',
    offbeatBadge: 'Offbeat',
    filterReset: 'Reset Filters',
    destinationsFound: 'Destinations',
    loadingDestinations: 'Loading curated destinations...',
    noDestinationsFound: 'No destinations match your filters.',
    clearFiltersToSeeMore: 'Try clearing some filters or searching for something else.',
    viewDetails: 'View Details',
    planWithThis: 'Plan Trip with This',
    backToCatalog: '← Back to Destinations',

    // Categories
    cat_nature: 'Nature',
    cat_waterfall: 'Waterfall',
    cat_hill_station: 'Hill Station',
    cat_viewpoint: 'Viewpoint',
    cat_heritage: 'Heritage',
    cat_architecture: 'Architecture',
    cat_beach: 'Beach',
    cat_wildlife: 'Wildlife',
    cat_food_culture: 'Food & Culture',
    cat_spiritual_cultural: 'Spiritual & Cultural',
    cat_adventure: 'Adventure',
    cat_museum: 'Museum',
    cat_town_city: 'Town / City',
    cat_other: 'Other',

    // Destination Details
    district: 'District',
    category: 'Category',
    estimatedTime: 'Estimated Visit Time',
    entryFee: 'Entry Fee',
    feeFree: 'Free Entry',
    feeUnknown: 'Not specified (Confirmed on-site)',
    accessStatus: 'Access Status',
    howToReach: 'How to Reach',
    accessibilityNotes: 'Accessibility & Physical Suitability',
    verifiedSources: 'Curated Verification Sources',
    close: 'Close',
    minutes: 'mins',

    // Access Statuses
    access_open_reported: 'Reported Open',
    access_restricted: 'Restricted Access',
    access_seasonal: 'Seasonal Access',
    access_closed_reported: 'Reported Closed',
    access_unknown: 'Status Unverified',

    // Trip Planner Form
    planYourTripTitle: 'AI-Powered Itinerary Planner',
    planYourTripDesc: 'Tell us your travel preferences and our grounded engine will craft a custom Karnataka itinerary.',
    originLabel: 'Starting Location',
    originPlaceholder: 'e.g., Bengaluru, Mysuru, Hubballi...',
    durationLabel: 'Trip Duration (Days)',
    paceLabel: 'Travel Pace',
    paceRelaxed: 'Relaxed (2 stops / day)',
    paceBalanced: 'Balanced (3 stops / day)',
    pacePacked: 'Packed (4 stops / day)',
    selectCategories: 'Select Preferred Categories (Up to 5)',
    selectDistricts: 'Select Specific Districts (Optional, Up to 5)',
    prioritizeOffbeat: 'Prioritize offbeat and lesser-known destinations',
    notesLabel: 'Additional Notes or Interests',
    notesPlaceholder: 'e.g., traveling with family, interested in temple architecture, morning hikes...',
    generateButton: 'Generate Itinerary',
    generatingButton: 'Crafting Your Itinerary...',
    formValidationError: 'Please fix the highlighted errors before submitting.',

    // Itinerary & Results
    itineraryTitle: 'Your Karnataka Itinerary',
    modeAi: 'AI Curated',
    modeFallback: 'Deterministic Fallback',
    providerUsed: 'Provider',
    day: 'Day',
    stop: 'Stop',
    whyThisStop: 'Why Visit:',
    viewOnMap: 'View on Map',
    hideMap: 'Hide Map',
    adjustPreferences: 'Adjust Preferences',
    saveItinerary: 'Save Itinerary',
    itinerarySaved: 'Itinerary saved to your device!',
    replan: 'Plan New Trip',

    // Budget Breakdown
    budgetTitle: 'Estimated Entry & Activity Fees',
    totalEstimatedFees: 'Estimated Ticket Cost',
    destinationsWithFees: 'destinations have known entrance fees',
    destinationsWithUnknownFees: 'destinations have unconfirmed fees',
    budgetDisclaimer: 'Note: Excludes transport, fuel, food, and lodging. Unconfirmed entry fees are not estimated as ₹0 to avoid false budget guarantees.',

    // Map Exploration
    mapTitle: 'Destination Map (Curated Coordinates)',
    mapNote: 'Markers represent verified geographic coordinates. Lines represent straight-line sequencing, not real-time road driving navigation.',
    toggleListView: 'Switch to List View',
    toggleMapView: 'Switch to Map View',

    // Saved Trips
    savedTripsTitle: 'Your Saved Trips',
    noSavedTrips: 'You have not saved any itineraries yet.',
    noSavedTripsDesc: 'Generate a trip in the planner and click "Save Itinerary" to bookmark it for later.',
    savedOn: 'Saved on',
    viewSavedTrip: 'View Itinerary',
    deleteTrip: 'Remove',
    supabaseNoticeTitle: 'Cloud Account Persistence Status',
    supabaseNoticeDesc: 'Offline guest bookmarking is active in your browser. Cloud multi-device synchronization will activate once live Supabase migrations are applied.',

    // Error & Resilience States
    errorTitle: 'Something Went Wrong',
    retryButton: 'Try Again',
    networkError: 'Unable to reach the Namma Karnataka server. Please ensure the backend is running.',
    timeoutError: 'The request took longer than expected. Please try again or simplify your filters.',
    validationError: 'Invalid request parameters. Please verify your inputs.',
  },
  kn: {
    // App Header & Branding
    appTitle: 'ನಮ್ಮ ಕರ್ನಾಟಕ',
    appTitleKannada: 'ನಮ್ಮ ಕರ್ನಾಟಕ',
    appSubtitle: 'ಕರ್ನಾಟಕವನ್ನು ಅನ್ವೇಷಿಸಿ. ನಿಮ್ಮ ಪ್ರವಾಸವನ್ನು ಯೋಜಿಸಿ.',
    navExplore: 'ತಾಣಗಳ ಅನ್ವೇಷಣೆ',
    navPlan: 'ಪ್ರವಾಸ ಯೋಜನೆ',
    navItinerary: 'ನಿಮ್ಮ ಪ್ರವಾಸ ಪಟ್ಟಿ',
    navSavedTrips: 'ಉಳಿಸಿದ ಪ್ರವಾಸಗಳು',
    switchLanguage: 'English',

    // Discovery & Filters
    searchPlaceholder: 'ಹೆಸರು ಅಥವಾ ಕೀವರ್ಡ್ ಮೂಲಕ ತಾಣಗಳನ್ನು ಹುಡುಕಿ...',
    allDistricts: 'ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳು',
    allCategories: 'ಎಲ್ಲಾ ವಿಭಾಗಗಳು',
    offbeatOnly: 'ವಿಶಿಷ್ಟ (ಆಫ್‌ಬೀಟ್) ತಾಣಗಳು ಮಾತ್ರ',
    offbeatBadge: 'ವಿಶಿಷ್ಟ ತಾಣ',
    filterReset: 'ಫಿಲ್ಟರ್ ಮರುಹೊಂದಿಸಿ',
    destinationsFound: 'ತಾಣಗಳು',
    loadingDestinations: 'ತಾಣಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...',
    noDestinationsFound: 'ನಿಮ್ಮ ಆಯ್ಕೆಗೆ ತಕ್ಕ ತಾಣಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
    clearFiltersToSeeMore: 'ದಯವಿಟ್ಟು ಫಿಲ್ಟರ್‌ಗಳನ್ನು ಬದಲಾಯಿಸಿ ಅಥವಾ ಬೇರೆ ಪದವನ್ನು ಹುಡುಕಿ.',
    viewDetails: 'ವಿವರಗಳನ್ನು ನೋಡಿ',
    planWithThis: 'ಇದರೊಂದಿಗೆ ಪ್ರವಾಸ ಯೋಜಿಸಿ',
    backToCatalog: '← ಎಲ್ಲಾ ತಾಣಗಳಿಗೆ ಹಿಂತಿರುಗಿ',

    // Categories
    cat_nature: 'ಪ್ರಕೃತಿ',
    cat_waterfall: 'ಜಲಪಾತ',
    cat_hill_station: 'ಗಿರಿಧಾಮ',
    cat_viewpoint: 'ವೀಕ್ಷಣಾ ತಾಣ',
    cat_heritage: 'ಪರಂಪರೆ',
    cat_architecture: 'ವಾಸ್ತುಶಿಲ್ಪ',
    cat_beach: 'ಕಡಲತೀರ',
    cat_wildlife: 'ವನ್ಯಜೀವಿ',
    cat_food_culture: 'ಆಹಾರ ಮತ್ತು ಸಂಸ್ಕೃತಿ',
    cat_spiritual_cultural: 'ಧಾರ್ಮಿಕ ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ',
    cat_adventure: 'ಸಾಹಸ',
    cat_museum: 'ವಸ್ತುಸಂಗ್ರಹಾಲಯ',
    cat_town_city: 'ನಗರ / ಪಟ್ಟಣ',
    cat_other: 'ಇತರೆ',

    // Destination Details
    district: 'ಜಿಲ್ಲೆ',
    category: 'ವಿಭಾಗ',
    estimatedTime: 'ಅಂದಾಜು ವೀಕ್ಷಣಾ ಸಮಯ',
    entryFee: 'ಪ್ರವೇಶ ಶುಲ್ಕ',
    feeFree: 'ಉಚಿತ ಪ್ರವೇಶ',
    feeUnknown: 'ಖಚಿತವಾಗಿಲ್ಲ (ಸ್ಥಳದಲ್ಲೇ ನಿರ್ಧರಿಸಲಾಗುತ್ತದೆ)',
    accessStatus: 'ಪ್ರವೇಶ ಸ್ಥಿತಿ',
    howToReach: 'ತಲುಪುವುದು ಹೇಗೆ',
    accessibilityNotes: 'ಪ್ರವೇಶಿಸುವಿಕೆ ಮತ್ತು ದೈಹಿಕ ಸೂಕ್ತತೆ',
    verifiedSources: 'ದೃಢೀಕೃತ ಮೂಲಗಳು',
    close: 'ಮುಚ್ಚಿ',
    minutes: 'ನಿಮಿಷಗಳು',

    // Access Statuses
    access_open_reported: 'ತೆರೆದಿದೆ',
    access_restricted: 'ನಿರ್ಬಂಧಿತ ಪ್ರವೇಶ',
    access_seasonal: 'ಋತುಮಾನಕ್ಕೆ ಅನುಗುಣವಾಗಿ',
    access_closed_reported: 'ಮುಚ್ಚಲಾಗಿದೆ',
    access_unknown: 'ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ',

    // Trip Planner Form
    planYourTripTitle: 'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಆಧಾರಿತ ಪ್ರವಾಸ ಯೋಜನೆ',
    planYourTripDesc: 'ನಿಮ್ಮ ಪ್ರಯಾಣದ ಆದ್ಯತೆಗಳನ್ನು ತಿಳಿಸಿ, ನಮ್ಮ ಎಂಜಿನ್ ನಿಮಗಾಗಿ ಸೂಕ್ತ ಪ್ರವಾಸ ಪಟ್ಟಿಯನ್ನು ಸಿದ್ಧಪಡಿಸುತ್ತದೆ.',
    originLabel: 'ಪ್ರಾರಂಭದ ಸ್ಥಳ',
    originPlaceholder: 'ಉದಾ: ಬೆಂಗಳೂರು, ಮೈಸೂರು, ಹುಬ್ಬಳ್ಳಿ...',
    durationLabel: 'ಪ್ರವಾಸದ ದಿನಗಳು',
    paceLabel: 'ಪ್ರವಾಸದ ವೇಗ',
    paceRelaxed: 'ನಿರಾಳ (ದಿನಕ್ಕೆ ೨ ತಾಣಗಳು)',
    paceBalanced: 'ಸಮತೋಲಿತ (ದಿನಕ್ಕೆ ೩ ತಾಣಗಳು)',
    pacePacked: 'ವೇಗದ ಸಂಚಾರ (ದಿನಕ್ಕೆ ೪ ತಾಣಗಳು)',
    selectCategories: 'ಆದ್ಯತೆಯ ವಿಭಾಗಗಳು (ಗರಿಷ್ಠ ೫)',
    selectDistricts: 'ಆದ್ಯತೆಯ ಜಿಲ್ಲೆಗಳು (ಐಚ್ಛಿಕ, ಗರಿಷ್ಠ ೫)',
    prioritizeOffbeat: 'ಕಡಿಮೆ ಜನಸಂದಣಿ ಇರುವ ವಿಶಿಷ್ಟ ತಾಣಗಳಿಗೆ ಆದ್ಯತೆ ನೀಡಿ',
    notesLabel: 'ಹೆಚ್ಚುವರಿ ಟಿಪ್ಪಣಿ ಅಥವಾ ಆಸಕ್ತಿಗಳು',
    notesPlaceholder: 'ಉದಾ: ಕುಟುಂಬದೊಂದಿಗೆ ಪ್ರಯಾಣ, ದೇವಾಲಯಗಳ ವಾಸ್ತುಶಿಲ್ಪ, ಬೆಳಗಿನ ಚಾರಣ...',
    generateButton: 'ಪ್ರವಾಸ ಪಟ್ಟಿ ತಯಾರಿಸಿ',
    generatingButton: 'ಪ್ರವಾಸ ಪಟ್ಟಿ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...',
    formValidationError: 'ದಯವಿಟ್ಟು ಅಗತ್ಯವಿರುವ ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಸರಿಯಾಗಿ ಭರ್ತಿ ಮಾಡಿ.',

    // Itinerary & Results
    itineraryTitle: 'ನಿಮ್ಮ ಕರ್ನಾಟಕ ಪ್ರವಾಸ ಪಟ್ಟಿ',
    modeAi: 'ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ರಚಿತ',
    modeFallback: 'ನಿಯಮ ಆಧಾರಿತ ಪರ್ಯಾಯ',
    providerUsed: 'ಮಾದರಿ',
    day: 'ದಿನ',
    stop: 'ತಾಣ',
    whyThisStop: 'ಏಕೆ ಭೇಟಿ ನೀಡಬೇಕು:',
    viewOnMap: 'ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ',
    hideMap: 'ನಕ್ಷೆ ಮರೆಮಾಡಿ',
    adjustPreferences: 'ಆದ್ಯತೆಗಳನ್ನು ಬದಲಾಯಿಸಿ',
    saveItinerary: 'ಪ್ರವಾಸ ಪಟ್ಟಿ ಉಳಿಸಿ',
    itinerarySaved: 'ಪ್ರವಾಸ ಪಟ್ಟಿಯನ್ನು ನಿಮ್ಮ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ!',
    replan: 'ಹೊಸ ಪ್ರವಾಸ ಯೋಜಿಸಿ',

    // Budget Breakdown
    budgetTitle: 'ಅಂದಾಜು ಪ್ರವೇಶ ಮತ್ತು ಚಟುವಟಿಕೆ ಶುಲ್ಕ',
    totalEstimatedFees: 'ಅಂದಾಜು ಟಿಕೆಟ್ ವೆಚ್ಚ',
    destinationsWithFees: 'ತಾಣಗಳಿಗೆ ನಿಶ್ಚಿತ ಪ್ರವೇಶ ಶುಲ್ಕವಿದೆ',
    destinationsWithUnknownFees: 'ತಾಣಗಳ ಶುಲ್ಕ ಖಚಿತವಾಗಿಲ್ಲ',
    budgetDisclaimer: 'ಗಮನಿಸಿ: ಪ್ರಯಾಣ, ಇಂಧನ, ಊಟ ಮತ್ತು ವಾಸ್ತವ್ಯದ ವೆಚ್ಚಗಳು ಇದರಲ್ಲಿ ಒಳಗೊಂಡಿಲ್ಲ. ಖಚಿತವಿಲ್ಲದ ಶುಲ್ಕಗಳನ್ನು ₹0 ಎಂದು ಸುಳ್ಳು ಲೆಕ್ಕ ಮಾಡಲಾಗಿಲ್ಲ.',

    // Map Exploration
    mapTitle: 'ತಾಣಗಳ ನಕ್ಷೆ (ದೃಢೀಕೃತ ನಿರ್ದೇಶಾಂಕಗಳು)',
    mapNote: 'ಗುರುತುಗಳು ಭೌಗೋಳಿಕ ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ತೋರಿಸುತ್ತವೆ. ಸರಳ ರೇಖೆಗಳು ತಾಣಗಳ ಅನುಕ್ರಮವನ್ನು ಸೂಚಿಸುತ್ತವೆ, ರಸ್ತೆ ಮಾರ್ಗವನ್ನಲ್ಲ.',
    toggleListView: 'ಪಟ್ಟಿ ರೂಪಕ್ಕೆ ಬದಲಾಯಿಸಿ',
    toggleMapView: 'ನಕ್ಷೆ ರೂಪಕ್ಕೆ ಬದಲಾಯಿಸಿ',

    // Saved Trips
    savedTripsTitle: 'ಉಳಿಸಿದ ಪ್ರವಾಸಗಳು',
    noSavedTrips: 'ನೀವು ಇನ್ನೂ ಯಾವುದೇ ಪ್ರವಾಸ ಪಟ್ಟಿಯನ್ನು ಉಳಿಸಿಲ್ಲ.',
    noSavedTripsDesc: 'ಪ್ಲಾನರ್‌ನಲ್ಲಿ ಹೊಸ ಪ್ರವಾಸ ರಚಿಸಿ "ಪ್ರವಾಸ ಪಟ್ಟಿ ಉಳಿಸಿ" ಕ್ಲಿಕ್ ಮಾಡಿ.',
    savedOn: 'ಉಳಿಸಿದ ದಿನಾಂಕ',
    viewSavedTrip: 'ಪ್ರವಾಸ ಪಟ್ಟಿ ವೀಕ್ಷಿಸಿ',
    deleteTrip: 'ತೆಗೆದುಹಾಕಿ',
    supabaseNoticeTitle: 'ಕ್ಲೌಡ್ ಖಾತೆ ಸಿಂಕ್ ಸ್ಥಿತಿ',
    supabaseNoticeDesc: 'ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಸ್ಥಳೀಯ ಉಳಿಸುವಿಕೆ ಸಕ್ರಿಯವಾಗಿದೆ. ಸುಪಾಬೇಸ್ ಡೇಟಾಬೇಸ್ ಮೈಗ್ರೇಶನ್ ಪೂರ್ಣಗೊಂಡ ನಂತರ ಕ್ಲೌಡ್ ಸಿಂಕ್ ಲಭ್ಯವಾಗಲಿದೆ.',

    // Error & Resilience States
    errorTitle: 'ದೋಷ ಸಂಭವಿಸಿದೆ',
    retryButton: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    networkError: 'ಸರ್ವರ್ ಸಂಪರ್ಕ ಸಾಧಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ಬ್ಯಾಕೆಂಡ್ ಚಾಲನೆಯಲ್ಲಿದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ.',
    timeoutError: 'ವಿನಂತಿ ಪ್ರಕ್ರಿಯೆಗೆ ಹೆಚ್ಚು ಸಮಯ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.',
    validationError: 'ಅಮಾನ್ಯ ವಿನಂತಿ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ನಮೂದುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
  },
};

export type TranslationKey = keyof typeof translations.en;

export function useTranslation(language: Language) {
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };
  return { t, language };
}
