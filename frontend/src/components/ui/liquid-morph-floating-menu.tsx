import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  House,
  Compass,
  Sparkles,
  Map,
  Bookmark,
  Check,
} from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from '../../lib/i18n';
import { ActiveTab } from '../layout/Header';

export interface LiquidMorphFloatingMenuProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  hasActivePlan?: boolean;
  savedTripsCount?: number;
}

interface NavItemConfig {
  id: ActiveTab;
  labelKey: 'navHome' | 'navExplore' | 'navPlan' | 'navItinerary' | 'navSavedTrips';
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
  testId: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'home', labelKey: 'navHome', icon: House, testId: 'nav-tab-home' },
  { id: 'discovery', labelKey: 'navExplore', icon: Compass, testId: 'nav-tab-discovery' },
  { id: 'planner', labelKey: 'navPlan', icon: Sparkles, testId: 'nav-tab-planner' },
  { id: 'itinerary', labelKey: 'navItinerary', icon: Map, testId: 'nav-tab-itinerary' },
  { id: 'saved-trips', labelKey: 'navSavedTrips', icon: Bookmark, testId: 'nav-tab-saved' },
];

export const LiquidMorphFloatingMenu: React.FC<LiquidMorphFloatingMenuProps> = ({
  currentTab,
  onTabChange,
  language,
  hasActivePlan = false,
  savedTripsCount = 0,
}) => {
  const { t } = useTranslation(language);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTab = useCallback(
    (tab: ActiveTab) => {
      onTabChange(tab);
      setIsOpen(false);
    },
    [onTabChange]
  );

  const menuLabel = language === 'kn' ? 'ಮೆನು' : 'Menu';
  const navigationHeading = language === 'kn' ? 'ನ್ಯಾವಿಗೇಷನ್' : 'Navigation';

  return (
    <div
      ref={containerRef}
      className="liquid-morph-menu-container"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {/* Menu Pill Button in Header */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        data-testid="floating-menu-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="liquid-morph-nav-menu"
        aria-label={`${menuLabel} - ${t('appTitle')}`}
        className="header-menu-pill-btn"
        style={{
          height: '38px',
          padding: '0 16px',
          borderRadius: '9999px',
          border: '1px solid #CBD5E1',
          background: isOpen ? '#F1F5F9' : '#FFFFFF',
          color: '#0891B2',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: 'var(--font-family)',
          fontSize: '0.88rem',
          fontWeight: 600,
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          transition: 'all 0.2s ease',
          outline: 'none',
          userSelect: 'none',
        }}
      >
        {/* Animated Hamburger Icon (3 Bars) */}
        <div
          aria-hidden="true"
          style={{
            width: '16px',
            height: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              display: 'block',
              width: '100%',
              height: '2px',
              background: '#0891B2',
              borderRadius: '2px',
              transformOrigin: 'left center',
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(35deg) translate(0px, -1px)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: isOpen ? '0%' : '75%',
              height: '2px',
              background: '#0891B2',
              borderRadius: '2px',
              opacity: isOpen ? 0 : 1,
              transition: 'all 0.15s ease',
            }}
          />
          <span
            style={{
              display: 'block',
              width: '100%',
              height: '2px',
              background: '#0891B2',
              borderRadius: '2px',
              transformOrigin: 'left center',
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(-35deg) translate(0px, 1px)' : 'none',
            }}
          />
        </div>

        <span>{menuLabel}</span>
      </button>

      {/* Expanded Liquid-Morph Dropdown Panel */}
      <motion.div
        id="liquid-morph-nav-menu"
        role="menu"
        aria-label={navigationHeading}
        aria-hidden={!isOpen}
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.94,
          y: isOpen ? 0 : -8,
        }}
        transition={{
          type: 'spring',
          damping: 26,
          stiffness: 340,
          mass: 0.7,
        }}
        style={{
          display: isOpen ? 'flex' : 'none',
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '280px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(226, 232, 240, 0.95)',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(8, 145, 178, 0.12)',
          padding: '14px',
          flexDirection: 'column',
          boxSizing: 'border-box',
          zIndex: 1000,
          transformOrigin: 'top right',
        }}
      >
        {/* Header Bar inside Dropdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '10px',
            marginBottom: '6px',
            borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#64748B',
              fontFamily: 'var(--font-family)',
            }}
          >
            {navigationHeading}
          </span>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={language === 'kn' ? 'ನ್ಯಾವಿಗೇಷನ್ ಮುಚ್ಚಿ' : 'Close navigation menu'}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        {/* 5 Navigation Items */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <motion.button
                key={item.id}
                role="menuitem"
                type="button"
                data-testid={item.testId}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleSelectTab(item.id)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.02 * (index + 1),
                  type: 'spring',
                  stiffness: 400,
                  damping: 28,
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isActive
                    ? 'rgba(8, 145, 178, 0.12)'
                    : 'transparent',
                  color: isActive ? '#0891B2' : '#172033',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-family)',
                  fontSize: '0.90rem',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'background 0.15s ease, color 0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(241, 245, 249, 0.85)';
                    e.currentTarget.style.color = '#0891B2';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#172033';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: isActive
                        ? '#0891B2'
                        : 'rgba(241, 245, 249, 0.9)',
                      color: isActive ? '#ffffff' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.3 : 2} />
                  </div>
                  <span>{t(item.labelKey)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item.id === 'itinerary' && hasActivePlan && (
                    <span
                      title="Active Plan Available"
                      style={{
                        color: '#10B981',
                        fontSize: '1rem',
                        lineHeight: 1,
                      }}
                    >
                      ●
                    </span>
                  )}

                  {item.id === 'saved-trips' && savedTripsCount > 0 && (
                    <span
                      className="tab-count-badge"
                      style={{
                        background: '#0891B2',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        fontWeight: 700,
                      }}
                    >
                      {savedTripsCount}
                    </span>
                  )}

                  {isActive && (
                    <Check
                      size={15}
                      strokeWidth={2.4}
                      color="#0891B2"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
