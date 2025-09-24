/**
 * Analytics Service
 * Centralized analytics tracking for game events and user behavior
 */

import { ENV } from '../config/environment';

export interface AnalyticsEvent {
  name: string;
  category: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp?: number;
}

export interface UserProperties {
  userId?: string;
  username?: string;
  level?: number;
  gamesPlayed?: number;
  isPremium?: boolean;
  deviceType?: string;
  [key: string]: any;
}

export interface GameMetrics {
  sessionDuration: number;
  gamesCompleted: number;
  averageGameTime: number;
  winRate: number;
  favoriteMode: string;
  totalScore: number;
}

class AnalyticsService {
  private initialized = false;
  private userId: string | null = null;
  private sessionStartTime: number = Date.now();
  private eventQueue: AnalyticsEvent[] = [];

  constructor() {
    this.initializeAnalytics();
  }

  /**
   * Initialize analytics providers
   */
  private async initializeAnalytics(): Promise<void> {
    if (!ENV.ANALYTICS.enabled) {
      console.log('Analytics disabled');
      return;
    }

    try {
      // Initialize Google Analytics
      if (ENV.ANALYTICS.GA_ID) {
        this.initializeGA();
      }

      // Initialize Mixpanel
      if (ENV.ANALYTICS.MIXPANEL_TOKEN) {
        this.initializeMixpanel();
      }

      // Initialize Sentry for error tracking
      if (ENV.ANALYTICS.SENTRY_DSN) {
        this.initializeSentry();
      }

      this.initialized = true;
      this.processQueuedEvents();
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Initialize Google Analytics
   */
  private initializeGA(): void {
    if (typeof window !== 'undefined' && !window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ENV.ANALYTICS.GA_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', ENV.ANALYTICS.GA_ID);
    }
  }

  /**
   * Initialize Mixpanel
   */
  private initializeMixpanel(): void {
    // Mixpanel initialization would go here
    // Skipping actual implementation to avoid external dependencies
  }

  /**
   * Initialize Sentry
   */
  private initializeSentry(): void {
    // Sentry initialization would go here
    // Skipping actual implementation to avoid external dependencies
  }

  /**
   * Track an event
   */
  public trackEvent(event: AnalyticsEvent): void {
    if (!ENV.ANALYTICS.enabled) return;

    const enrichedEvent: AnalyticsEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      metadata: {
        ...event.metadata,
        sessionDuration: this.getSessionDuration(),
        userId: this.userId
      }
    };

    if (!this.initialized) {
      this.eventQueue.push(enrichedEvent);
      return;
    }

    this.sendEvent(enrichedEvent);
  }

  /**
   * Send event to analytics providers
   */
  private sendEvent(event: AnalyticsEvent): void {
    // Google Analytics
    if (window.gtag) {
      window.gtag('event', event.name, {
        event_category: event.category,
        event_value: event.value,
        ...event.metadata
      });
    }

    // Custom backend analytics
    if (ENV.API.baseUrl) {
      this.sendToBackend(event);
    }
  }

  /**
   * Send analytics to backend
   */
  private async sendToBackend(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch(`${ENV.API.baseUrl}/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  /**
   * Process queued events
   */
  private processQueuedEvents(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.sendEvent(event);
      }
    }
  }

  /**
   * Set user properties
   */
  public setUserProperties(properties: UserProperties): void {
    this.userId = properties.userId || this.userId;

    if (window.gtag) {
      window.gtag('set', { user_properties: properties });
    }
  }

  /**
   * Track page view
   */
  public trackPageView(pageName: string, pageUrl?: string): void {
    this.trackEvent({
      name: 'page_view',
      category: 'navigation',
      metadata: {
        page_name: pageName,
        page_url: pageUrl || window.location.href
      }
    });
  }

  /**
   * Track game start
   */
  public trackGameStart(gameMode: string, playerCount: number): void {
    this.trackEvent({
      name: 'game_start',
      category: 'game',
      metadata: {
        game_mode: gameMode,
        player_count: playerCount
      }
    });
  }

  /**
   * Track game end
   */
  public trackGameEnd(gameMode: string, winner: string, duration: number, score: number): void {
    this.trackEvent({
      name: 'game_end',
      category: 'game',
      value: score,
      metadata: {
        game_mode: gameMode,
        winner,
        duration,
        score
      }
    });
  }

  /**
   * Track purchase
   */
  public trackPurchase(productId: string, amount: number, currency: string): void {
    this.trackEvent({
      name: 'purchase',
      category: 'monetization',
      value: amount,
      metadata: {
        product_id: productId,
        currency
      }
    });
  }

  /**
   * Track error
   */
  public trackError(error: Error, context?: Record<string, any>): void {
    this.trackEvent({
      name: 'error',
      category: 'technical',
      metadata: {
        error_message: error.message,
        error_stack: error.stack,
        ...context
      }
    });
  }

  /**
   * Get session duration
   */
  public getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  /**
   * Get game metrics
   */
  public async getGameMetrics(userId: string): Promise<GameMetrics> {
    try {
      const response = await fetch(`${ENV.API.baseUrl}/analytics/metrics/${userId}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch game metrics:', error);
      return {
        sessionDuration: 0,
        gamesCompleted: 0,
        averageGameTime: 0,
        winRate: 0,
        favoriteMode: 'allfives',
        totalScore: 0
      };
    }
  }

  /**
   * Track custom metric
   */
  public trackMetric(name: string, value: number, unit?: string): void {
    this.trackEvent({
      name: 'custom_metric',
      category: 'metrics',
      value,
      metadata: {
        metric_name: name,
        unit
      }
    });
  }
}

// Window types are defined in src/types/global.d.ts

export const analyticsService = new AnalyticsService();
export default analyticsService;