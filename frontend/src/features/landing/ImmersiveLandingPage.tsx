import React, { useEffect, useState } from 'react';
import { DestinationRead, Language } from '../../types';
import { ActiveTab } from '../../components/layout/Header';
import { useTranslation } from '../../lib/i18n';
import { listDestinations } from '../../lib/api';
import { ScrollExpansionHero } from './ScrollExpansionHero';
import { DestinationCard } from '../discovery/DestinationCard';
import { DestinationModal } from '../discovery/DestinationModal';

export interface ImmersiveLandingPageProps {
  language: Language;
  onNavigateTab: (tab: ActiveTab) => void;
  onPlanWithDestination: (dest: DestinationRead) => void;
}

export const ImmersiveLandingPage: React.FC<ImmersiveLandingPageProps> = ({
  language,
  onNavigateTab,
  onPlanWithDestination,
}) => {
  const { t } = useTranslation(language);

  const [featuredDestinations, setFeaturedDestinations] = useState<DestinationRead[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalDestination, setModalDestination] = useState<DestinationRead | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchFeatured = async () => {
      try {
        setLoadingDestinations(true);
        setErrorMessage(null);
        const res = await listDestinations({ limit: 6, lang: language });
        if (isMounted && res.items) {
          setFeaturedDestinations(res.items);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Backend connection failed';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) setLoadingDestinations(false);
      }
    };

    fetchFeatured();
    return () => {
      isMounted = false;
    };
  }, [language]);

  return (
    <div
      className="immersive-landing-page landing-light-theme"
      style={{
        width: '100%',
        background: 'transparent',
        color: '#172033',
        position: 'relative',
        overflowX: 'clip',
      }}
    >
      {/* 1. CINEMATIC SCROLL EXPANSION HERO */}
      <ScrollExpansionHero
        language={language}
        onExploreClick={() => onNavigateTab('discovery')}
        onPlanClick={() => onNavigateTab('planner')}
      />

      {/* EDITORIAL CONTENT FLOW */}
      <div
        className="landing-content-flow"
        style={{
          position: 'relative',
          width: '100%',
          zIndex: 1,
        }}
      >
        {/* 2. REGIONAL LANDSCAPES & GEOGRAPHIC DIVERSITY */}
        <section
          className="landing-regions-section"
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '56px 24px 36px 24px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#0891B2',
              }}
            >
              {language === 'kn' ? 'ಕರ್ನಾಟಕದ ಮೂರು ಮುಖಗಳು' : 'The Three Geographical Realms'}
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                fontWeight: 800,
                margin: '8px 0 12px 0',
                color: '#172033',
              }}
            >
              {language === 'kn' ? 'ಪ್ರಕೃತಿ ಮತ್ತು ಪರಂಪರೆಯ ಸಂಗಮ' : 'Where Ancient Empires Meet Primeval Wilderness'}
            </h2>
            <p
              style={{
                fontSize: '1rem',
                color: '#64748B',
                maxWidth: '680px',
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              {language === 'kn'
                ? 'ಅರಬ್ಬೀ ಸಮುದ್ರದ ತೀರದಿಂದ ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ಮಂಜಿನ ಶಿಖರಗಳು ಹಾಗೂ ದಕ್ಕನ್ ಪ್ರಸ್ಥಭೂಮಿಯ ಭವ್ಯ ಸಾಮ್ರಾಜ್ಯಗಳವರೆಗೆ ಕರ್ನಾಟಕದ ಅಪ್ರತಿಮ ಸೌಂದರ್ಯವನ್ನು ಅನ್ವೇಷಿಸಿ.'
                : 'Spanning from the azure waves of the Arabian Sea to the mist-laden summits of the Western Ghats and the boulder-strewn Deccan plateau.'}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Karavali */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(8, 145, 178, 0.25)',
                borderRadius: '16px',
                padding: '28px 24px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(8, 145, 178, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: '16px',
                  }}
                >
                  🌊
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#172033' }}>
                  {t('landingKaravali')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                  {t('landingKaravaliDesc')}
                </p>
              </div>
              <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#0891B2', fontWeight: 600 }}>
                Gokarna · Murudeshwar · Karwar · Malpe
              </div>
            </div>

            {/* Malnad */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '16px',
                padding: '28px 24px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: '16px',
                  }}
                >
                  🌲
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#172033' }}>
                  {t('landingMalnad')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                  {t('landingMalnadDesc')}
                </p>
              </div>
              <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                Coorg · Chikkamagaluru · Jog Falls · Agumbe
              </div>
            </div>

            {/* Bayaluseeme */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '16px',
                padding: '28px 24px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    marginBottom: '16px',
                  }}
                >
                  🏰
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 700, color: '#172033' }}>
                  {t('landingBayaluseeme')}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                  {t('landingBayaluseemeDesc')}
                </p>
              </div>
              <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#D97706', fontWeight: 600 }}>
                Hampi · Mysuru · Badami · Pattadakal · Belur
              </div>
            </div>
          </div>
        </section>

        {/* 3. FEATURED DESTINATIONS SHOWCASE */}
        <section
          className="landing-featured-section"
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '40px 24px 60px 24px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '36px' }}>
            <div>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#F59E0B',
                }}
              >
                {language === 'kn' ? 'ಆಯ್ದ ತಾಣಗಳು' : 'Curated Highlights'}
              </span>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, margin: '6px 0 0 0', color: '#172033' }}>
                {t('landingFeaturedHeading')}
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#64748B', margin: '6px 0 0 0' }}>
                {t('landingFeaturedSub')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('discovery')}
              className="btn-secondary"
              style={{
                padding: '8px 18px',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                color: '#172033',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              }}
            >
              <span>{language === 'kn' ? 'ಎಲ್ಲಾ ತಾಣಗಳನ್ನು ನೋಡಿ' : 'View Full Catalogue'}</span>
              <span>→</span>
            </button>
          </div>

          {/* Error message or Featured Destination Cards Grid */}
          {errorMessage ? (
            <div
              data-testid="discovery-error"
              style={{
                padding: '24px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#b91c1c',
                textAlign: 'center',
                margin: '20px 0',
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>{errorMessage}</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                {language === 'kn'
                  ? 'ಸರ್ವರ್ ಸಂಪರ್ಕ ಸಾಧಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ನಂತರ ಪ್ರಯತ್ನಿಸಿ.'
                  : 'Unable to reach the destination service. Please verify your connection or try again.'}
              </p>
            </div>
          ) : loadingDestinations ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
              <span>{t('loadingDestinations')}</span>
            </div>
          ) : (
            <div
              className="destination-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
              }}
            >
              {featuredDestinations.map((destination) => (
                <DestinationCard
                  key={destination.id || destination.slug}
                  destination={destination}
                  language={language}
                  onSelect={(dest) => setModalDestination(dest)}
                  onPlanAround={(dest) => onPlanWithDestination(dest)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 4. APPLICATION CAPABILITIES (HOW IT WORKS) */}
        <section
          className="landing-capabilities-section"
          style={{
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            padding: '80px 24px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#0891B2',
                }}
              >
                {language === 'kn' ? 'ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ಪ್ರವಾಸ ಸಂಯೋಜನೆ' : 'Intelligent Architecture'}
              </span>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)', fontWeight: 800, margin: '8px 0 12px 0', color: '#172033' }}>
                {t('landingHowItWorks')}
              </h2>
              <p style={{ fontSize: '0.98rem', color: '#64748B', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
                {t('landingHowItWorksSub')}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '24px',
              }}
            >
              {/* Step 1: Discover */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔍</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#172033', fontWeight: 700 }}>
                  {t('landingStepDiscover')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                  {t('landingStepDiscoverDesc')}
                </p>
              </div>

              {/* Step 2: Plan */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>✨</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#172033', fontWeight: 700 }}>
                  {t('landingStepPlan')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                  {t('landingStepPlanDesc')}
                </p>
              </div>

              {/* Step 3: Navigate */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🗺️</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#172033', fontWeight: 700 }}>
                  {t('landingStepNavigate')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                  {t('landingStepNavigateDesc')}
                </p>
              </div>

              {/* Step 4: Save */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💾</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: '#172033', fontWeight: 700 }}>
                  {t('landingStepSave')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                  {t('landingStepSaveDesc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. PRIMARY CALL TO ACTION BANNER */}
        <section
          className="landing-cta-banner"
          style={{
            maxWidth: '1080px',
            margin: '60px auto 80px auto',
            padding: '48px 32px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.95) 100%)',
            border: '1px solid rgba(8, 145, 178, 0.25)',
            borderRadius: '20px',
            boxShadow: '0 20px 45px -10px rgba(8, 145, 178, 0.12), 0 0 1px 1px rgba(226, 232, 240, 0.8)',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span style={{ fontSize: '2rem', display: 'inline-block', marginBottom: '8px' }}>🏛️</span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)', fontWeight: 800, margin: '0 0 12px 0', color: '#172033' }}>
            {t('landingCtaHeading')}
          </h2>
          <p style={{ fontSize: '1rem', color: '#64748B', maxWidth: '580px', margin: '0 auto 28px auto', lineHeight: 1.6 }}>
            {t('landingCtaSub')}
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigateTab('discovery')}
              className="btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 700,
                background: '#0891B2',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0 4px 14px rgba(8, 145, 178, 0.25)',
                cursor: 'pointer',
              }}
            >
              🔍 {t('landingBtnExplore')}
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('planner')}
              className="btn-secondary"
              style={{
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: '#ffffff',
                color: '#172033',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                cursor: 'pointer',
              }}
            >
              ✨ {t('landingBtnPlan')}
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('saved-trips')}
              className="btn-secondary"
              style={{
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: '#ffffff',
                color: '#172033',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                cursor: 'pointer',
              }}
            >
              💾 {t('landingBtnSaved')}
            </button>
          </div>
        </section>
      </div>

      {/* DESTINATION DETAIL MODAL (Opens seamlessly when viewing featured destinations) */}
      {modalDestination && (
        <DestinationModal
          destination={modalDestination}
          language={language}
          onClose={() => setModalDestination(null)}
          onPlanAround={(dest) => {
            setModalDestination(null);
            onPlanWithDestination(dest);
          }}
        />
      )}
    </div>
  );
};
