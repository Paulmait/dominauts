/**
 * Sentry Error Tracking Service
 * Complete error monitoring and performance tracking
 */

import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';
import { CaptureConsole } from '@sentry/integrations';

export class SentryErrorTracking {
  private static instance: SentryErrorTracking;
  private isInitialized: boolean = false;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): SentryErrorTracking {
    if (!SentryErrorTracking.instance) {
      SentryErrorTracking.instance = new SentryErrorTracking();
    }
    return SentryErrorTracking.instance;
  }

  /**
   * Initialize Sentry
   */
  initialize(): void {
    const dsn = process.env.VITE_SENTRY_DSN;

    if (!dsn) {
      console.warn('Sentry DSN not configured - error tracking disabled');
      return;
    }

    if (this.isInitialized) {
      console.warn('Sentry already initialized');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.VITE_APP_VERSION || '2.0.0',

        integrations: [
          new BrowserTracing({
            // Set tracingOrigins to control what URLs are traced
            tracingOrigins: ['localhost', 'dominauts.com', /^\//],
            // Capture interactions like clicks and navigation
            routingInstrumentation: Sentry.browserTracingIntegration(),
          }),
          new CaptureConsole({
            levels: ['error', 'warn']
          })
        ],

        // Performance Monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev

        // Session Replay
        replaysSessionSampleRate: 0.1, // 10% of sessions
        replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

        // Filtering
        ignoreErrors: [
          // Browser extensions
          'top.GLOBALS',
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          // Network errors
          'NetworkError',
          'Network request failed',
          // User canceled
          'AbortError'
        ],

        beforeSend(event, hint) {
          // Filter out sensitive data
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }

          // Don't send events in development unless explicitly enabled
          if (process.env.NODE_ENV === 'development' && !process.env.VITE_SENTRY_DEBUG) {
            console.log('Sentry event (dev mode):', event);
            return null;
          }

          return event;
        },

        // Breadcrumbs configuration
        beforeBreadcrumb(breadcrumb, hint) {
          // Filter out noisy breadcrumbs
          if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
            return null;
          }

          // Add game-specific context to breadcrumbs
          if (breadcrumb.category === 'ui.click') {
            breadcrumb.data = {
              ...breadcrumb.data,
              gameState: window.gameState || 'unknown'
            };
          }

          return breadcrumb;
        }
      });

      this.isInitialized = true;
      console.log('✅ Sentry error tracking initialized');

      // Set initial user context
      this.setUserContext();

    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Set user context for better error tracking
   */
  setUser(userId: string | null, userData?: {
    email?: string;
    username?: string;
    subscription?: string;
  }): void {
    this.userId = userId;

    if (!this.isInitialized) return;

    if (userId) {
      Sentry.setUser({
        id: userId,
        ...userData
      });
    } else {
      Sentry.setUser(null);
    }
  }

  /**
   * Set additional context
   */
  setContext(key: string, context: Record<string, any>): void {
    if (!this.isInitialized) return;
    Sentry.setContext(key, context);
  }

  /**
   * Set tags for categorization
   */
  setTag(key: string, value: string | number | boolean): void {
    if (!this.isInitialized) return;
    Sentry.setTag(key, value);
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category?: string, level?: Sentry.SeverityLevel, data?: any): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      level: level || 'info',
      data,
      timestamp: Date.now() / 1000
    });
  }

  /**
   * Capture exception
   */
  captureException(error: Error | string, context?: Record<string, any>): void {
    if (!this.isInitialized) return;

    if (context) {
      Sentry.withScope((scope) => {
        scope.setContext('additional', context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    if (!this.isInitialized) return;
    Sentry.captureMessage(message, level);
  }

  /**
   * Track transaction for performance monitoring
   */
  startTransaction(name: string, op: string = 'navigation'): any {
    if (!this.isInitialized) return null;

    return Sentry.startTransaction({
      name,
      op,
      tags: {
        userId: this.userId
      }
    });
  }

  /**
   * Track game-specific errors
   */
  captureGameError(error: Error, gameData: {
    mode?: string;
    difficulty?: string;
    score?: number;
    turn?: number;
  }): void {
    if (!this.isInitialized) return;

    Sentry.withScope((scope) => {
      scope.setTag('error.type', 'game');
      scope.setContext('game', gameData);
      Sentry.captureException(error);
    });
  }

  /**
   * Track payment errors
   */
  capturePaymentError(error: Error, paymentData: {
    amount?: number;
    currency?: string;
    method?: string;
    itemId?: string;
  }): void {
    if (!this.isInitialized) return;

    Sentry.withScope((scope) => {
      scope.setTag('error.type', 'payment');
      scope.setLevel('error');
      scope.setContext('payment', paymentData);
      Sentry.captureException(error);
    });
  }

  /**
   * Track API errors
   */
  captureAPIError(error: Error, apiData: {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
  }): void {
    if (!this.isInitialized) return;

    Sentry.withScope((scope) => {
      scope.setTag('error.type', 'api');
      scope.setContext('api', apiData);
      Sentry.captureException(error);
    });
  }

  /**
   * Profile performance
   */
  profilePerformance(name: string, callback: () => void | Promise<void>): void {
    if (!this.isInitialized) {
      callback();
      return;
    }

    const transaction = this.startTransaction(name, 'task');
    const span = transaction?.startChild({
      op: 'function',
      description: name
    });

    try {
      const result = callback();
      if (result instanceof Promise) {
        result.finally(() => {
          span?.finish();
          transaction?.finish();
        });
      } else {
        span?.finish();
        transaction?.finish();
      }
    } catch (error) {
      span?.setStatus('internal_error');
      span?.finish();
      transaction?.finish();
      throw error;
    }
  }

  /**
   * Set user context from browser
   */
  private setUserContext(): void {
    if (!this.isInitialized) return;

    // Set browser context
    const context: Record<string, any> = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: window.screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: navigator.onLine
    };

    // Check device type
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);

    this.setTag('device.type', isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop');
    this.setContext('browser', context);
  }

  /**
   * Flush all pending events
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.isInitialized) return true;
    return Sentry.flush(timeout);
  }

  /**
   * Close Sentry client
   */
  async close(timeout: number = 2000): Promise<boolean> {
    if (!this.isInitialized) return true;
    return Sentry.close(timeout);
  }
}

// Export singleton instance
export const errorTracking = SentryErrorTracking.getInstance();

// Auto-initialize
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    errorTracking.initialize();
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorTracking.captureException(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      { promise: event.promise }
    );
  });
}