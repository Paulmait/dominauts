import React, { useState, useEffect } from 'react';
import './CookieConsent.css';

interface ConsentOptions {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentOptions>({
    necessary: true, // Always enabled
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    // Check if consent was already given
    const storedConsent = localStorage.getItem('cookieConsent');
    if (!storedConsent) {
      // Show banner after 2 seconds for better UX
      setTimeout(() => setShowBanner(true), 2000);
    } else {
      // Apply stored consent
      const parsedConsent = JSON.parse(storedConsent);
      applyConsent(parsedConsent);
    }
  }, []);

  const applyConsent = (consentOptions: ConsentOptions) => {
    // Apply consent settings to tracking systems
    if (typeof window !== 'undefined' && (window as any).gtag) {
      // Google Analytics
      if (consentOptions.analytics) {
        (window as any).gtag('consent', 'update', {
          'analytics_storage': 'granted'
        });
      } else {
        (window as any).gtag('consent', 'update', {
          'analytics_storage': 'denied'
        });
      }

      // Marketing/Ads
      if (consentOptions.marketing) {
        (window as any).gtag('consent', 'update', {
          'ad_storage': 'granted',
          'ad_user_data': 'granted',
          'ad_personalization': 'granted'
        });
      } else {
        (window as any).gtag('consent', 'update', {
          'ad_storage': 'denied',
          'ad_user_data': 'denied',
          'ad_personalization': 'denied'
        });
      }
    }

    // Apply to user tracking system if available
    if (typeof window !== 'undefined' && (window as any).userTracking) {
      (window as any).userTracking.setConsent('analyticsConsent', consentOptions.analytics);
      (window as any).userTracking.setConsent('marketingConsent', consentOptions.marketing);
    }
  };

  const handleAcceptAll = () => {
    const fullConsent: ConsentOptions = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };

    localStorage.setItem('cookieConsent', JSON.stringify(fullConsent));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyConsent(fullConsent);
    setShowBanner(false);

    // Track consent event
    trackConsentEvent('accept_all', fullConsent);
  };

  const handleRejectAll = () => {
    const minimalConsent: ConsentOptions = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };

    localStorage.setItem('cookieConsent', JSON.stringify(minimalConsent));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyConsent(minimalConsent);
    setShowBanner(false);

    // Track consent event
    trackConsentEvent('reject_all', minimalConsent);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    applyConsent(consent);
    setShowBanner(false);
    setShowDetails(false);

    // Track consent event
    trackConsentEvent('custom', consent);
  };

  const trackConsentEvent = (action: string, consentOptions: ConsentOptions) => {
    // Send consent information to backend
    fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        consent: consentOptions,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    }).catch(console.error);
  };

  const toggleConsent = (type: keyof ConsentOptions) => {
    if (type === 'necessary') return; // Necessary cookies cannot be disabled
    setConsent(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="cookie-consent-overlay" />
      <div className="cookie-consent-banner">
        <div className="cookie-content">
          <div className="cookie-header">
            <h3>🍪 Cookie Preferences</h3>
            <p>
              We use cookies and similar technologies to enhance your gaming experience.
              Universal Domino™ respects your privacy and complies with GDPR, CCPA, and COPPA regulations.
            </p>
          </div>

          {!showDetails ? (
            <div className="cookie-simple">
              <p className="cookie-message">
                We use cookies for game functionality, to analyze usage, and with your consent,
                for personalized content and ads. You can customize your preferences or accept all cookies.
              </p>
              <div className="cookie-actions">
                <button onClick={handleRejectAll} className="btn-reject">
                  Reject All
                </button>
                <button onClick={() => setShowDetails(true)} className="btn-customize">
                  Customize
                </button>
                <button onClick={handleAcceptAll} className="btn-accept">
                  Accept All
                </button>
              </div>
            </div>
          ) : (
            <div className="cookie-details">
              <div className="cookie-category">
                <div className="category-header">
                  <input
                    type="checkbox"
                    id="necessary"
                    checked={consent.necessary}
                    disabled
                  />
                  <label htmlFor="necessary">
                    <strong>Necessary Cookies</strong> (Always Active)
                  </label>
                </div>
                <p>
                  Essential for the website to function properly. These cookies ensure basic
                  functionalities like game saving, security features, and session management.
                </p>
              </div>

              <div className="cookie-category">
                <div className="category-header">
                  <input
                    type="checkbox"
                    id="analytics"
                    checked={consent.analytics}
                    onChange={() => toggleConsent('analytics')}
                  />
                  <label htmlFor="analytics">
                    <strong>Analytics Cookies</strong>
                  </label>
                </div>
                <p>
                  Help us understand how players use our game, which features are popular,
                  and how to improve the gaming experience. No personal data is shared.
                </p>
              </div>

              <div className="cookie-category">
                <div className="category-header">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={consent.marketing}
                    onChange={() => toggleConsent('marketing')}
                  />
                  <label htmlFor="marketing">
                    <strong>Marketing Cookies</strong>
                  </label>
                </div>
                <p>
                  Used to show relevant ads and measure ad campaign effectiveness.
                  These cookies may be set by our advertising partners to build a profile
                  of your interests.
                </p>
              </div>

              <div className="cookie-category">
                <div className="category-header">
                  <input
                    type="checkbox"
                    id="preferences"
                    checked={consent.preferences}
                    onChange={() => toggleConsent('preferences')}
                  />
                  <label htmlFor="preferences">
                    <strong>Preference Cookies</strong>
                  </label>
                </div>
                <p>
                  Remember your settings and preferences like language, theme, sound settings,
                  and game difficulty to provide a personalized experience.
                </p>
              </div>

              <div className="cookie-actions">
                <button onClick={handleRejectAll} className="btn-reject">
                  Reject All
                </button>
                <button onClick={handleSavePreferences} className="btn-save">
                  Save Preferences
                </button>
                <button onClick={handleAcceptAll} className="btn-accept">
                  Accept All
                </button>
              </div>
            </div>
          )}

          <div className="cookie-footer">
            <p>
              By using our game, you agree to our{' '}
              <a href="/privacy" target="_blank">Privacy Policy</a> and{' '}
              <a href="/terms" target="_blank">Terms of Service</a>.
              For users under 13, parental consent is required.
            </p>
            <p className="cookie-company">
              © 2025 Cien Rios LLC • Universal Domino™
            </p>
          </div>
        </div>
      </div>
    </>
  );
};