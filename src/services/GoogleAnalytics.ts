/**
 * Google Analytics GA4 Integration
 * Complete analytics tracking for user behavior and revenue
 */

// Types are defined in src/types/global.d.ts

export class GoogleAnalytics {
  private static instance: GoogleAnalytics;
  private measurementId: string;
  private isInitialized: boolean = false;
  private userId: string | null = null;

  private constructor() {
    this.measurementId = process.env.VITE_GA_MEASUREMENT_ID || '';
  }

  static getInstance(): GoogleAnalytics {
    if (!GoogleAnalytics.instance) {
      GoogleAnalytics.instance = new GoogleAnalytics();
    }
    return GoogleAnalytics.instance;
  }

  /**
   * Initialize Google Analytics
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.measurementId) {
      console.warn('GA4 not initialized:', !this.measurementId ? 'Missing measurement ID' : 'Already initialized');
      return;
    }

    try {
      // Add gtag script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      document.head.appendChild(script);

      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };

      window.gtag('js', new Date());
      window.gtag('config', this.measurementId, {
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure'
      });

      this.isInitialized = true;
      console.log('✅ Google Analytics GA4 initialized');

      // Track initial page view
      this.trackPageView();

    } catch (error) {
      console.error('Failed to initialize GA4:', error);
    }
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
    if (this.isInitialized && userId) {
      window.gtag('config', this.measurementId, {
        user_id: userId
      });
    }
  }

  /**
   * Track page views
   */
  trackPageView(pagePath?: string, pageTitle?: string): void {
    if (!this.isInitialized) return;

    window.gtag('event', 'page_view', {
      page_path: pagePath || window.location.pathname,
      page_title: pageTitle || document.title,
      page_location: window.location.href
    });
  }

  /**
   * Track custom events
   */
  trackEvent(eventName: string, parameters?: Record<string, any>): void {
    if (!this.isInitialized) return;

    window.gtag('event', eventName, {
      ...parameters,
      user_id: this.userId
    });
  }

  /**
   * Track game events
   */
  trackGameEvent(action: string, parameters?: Record<string, any>): void {
    this.trackEvent('game_action', {
      action,
      game_mode: parameters?.gameMode,
      difficulty: parameters?.difficulty,
      ...parameters
    });
  }

  /**
   * Track revenue events (purchases)
   */
  trackPurchase(transactionData: {
    transactionId: string;
    value: number;
    currency?: string;
    items: Array<{
      id: string;
      name: string;
      category: string;
      quantity: number;
      price: number;
    }>;
  }): void {
    if (!this.isInitialized) return;

    window.gtag('event', 'purchase', {
      transaction_id: transactionData.transactionId,
      value: transactionData.value,
      currency: transactionData.currency || 'USD',
      items: transactionData.items
    });
  }

  /**
   * Track in-app purchase
   */
  trackIAP(itemName: string, itemId: string, value: number, currency: string = 'USD'): void {
    this.trackPurchase({
      transactionId: `iap_${Date.now()}_${itemId}`,
      value,
      currency,
      items: [{
        id: itemId,
        name: itemName,
        category: 'in_app_purchase',
        quantity: 1,
        price: value
      }]
    });
  }

  /**
   * Track ad revenue
   */
  trackAdRevenue(adType: string, revenue: number, adNetwork?: string): void {
    this.trackEvent('ad_impression', {
      ad_type: adType,
      value: revenue,
      currency: 'USD',
      ad_network: adNetwork || 'unknown'
    });
  }

  /**
   * Track user engagement
   */
  trackEngagement(engagementType: string, duration?: number): void {
    this.trackEvent('user_engagement', {
      engagement_type: engagementType,
      engagement_time_msec: duration,
      session_id: this.getSessionId()
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(conversionType: string, value?: number): void {
    this.trackEvent('conversion', {
      conversion_type: conversionType,
      value: value || 0,
      currency: 'USD'
    });
  }

  /**
   * Track errors
   */
  trackError(errorMessage: string, fatal: boolean = false): void {
    this.trackEvent('exception', {
      description: errorMessage,
      fatal: fatal
    });
  }

  /**
   * Track social interactions
   */
  trackSocial(action: string, network: string, target?: string): void {
    this.trackEvent('share', {
      method: network,
      content_type: action,
      item_id: target
    });
  }

  /**
   * Track search
   */
  trackSearch(searchTerm: string, resultsCount?: number): void {
    this.trackEvent('search', {
      search_term: searchTerm,
      results_count: resultsCount
    });
  }

  /**
   * Track timing
   */
  trackTiming(category: string, variable: string, value: number, label?: string): void {
    this.trackEvent('timing_complete', {
      name: variable,
      value: value,
      event_category: category,
      event_label: label
    });
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('ga_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('ga_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Track custom dimensions
   */
  setCustomDimension(index: number, value: string): void {
    if (!this.isInitialized) return;

    window.gtag('config', this.measurementId, {
      custom_map: {[`dimension${index}`]: value}
    });
  }

  /**
   * Track user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized) return;

    window.gtag('set', 'user_properties', properties);
  }
}

// Export singleton instance
export const analytics = GoogleAnalytics.getInstance();

// Auto-initialize
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    analytics.initialize();
  });
}