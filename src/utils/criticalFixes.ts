// Critical Production Fixes - Implement Immediately
// This file contains quick fixes for critical issues

// 1. Environment Variable Checker
export const checkCriticalEnvVars = (): boolean => {
  const criticalVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_URL'
  ];

  const missing = criticalVars.filter(v => !import.meta.env[v]);

  if (missing.length > 0) {
    console.error('🚨 Critical environment variables missing:', missing);
    console.warn('App running in degraded mode - some features disabled');

    // Show user-friendly error
    if (typeof window !== 'undefined') {
      const banner = document.createElement('div');
      banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff4444;
        color: white;
        padding: 10px;
        text-align: center;
        z-index: 9999;
        font-family: sans-serif;
      `;
      banner.innerHTML = '⚠️ Game is running in offline mode. Some features unavailable.';
      document.body.appendChild(banner);

      setTimeout(() => banner.remove(), 5000);
    }
    return false;
  }
  return true;
};

// 2. Fallback Configuration
export const getFallbackConfig = () => ({
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://offline-mode',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'offline-key'
  },
  app: {
    url: import.meta.env.VITE_APP_URL || window.location.origin,
    version: import.meta.env.VITE_APP_VERSION || '2.0.0',
    name: import.meta.env.VITE_APP_NAME || 'Dominauts'
  },
  features: {
    multiplayer: import.meta.env.VITE_ENABLE_MULTIPLAYER === 'true' && checkCriticalEnvVars(),
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    ads: import.meta.env.VITE_ENABLE_ADS === 'true',
    iap: import.meta.env.VITE_ENABLE_IAP === 'true'
  }
});

// 3. Analytics Fallback
export const trackEvent = (eventName: string, properties?: any) => {
  try {
    // Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }

    // Fallback to console in development
    if (import.meta.env.DEV) {
      console.log('📊 Event:', eventName, properties);
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

// 4. Error Boundary Setup
export const setupErrorTracking = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      trackEvent('error', {
        message: event.error?.message,
        stack: event.error?.stack,
        url: window.location.href
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      trackEvent('unhandled_rejection', {
        reason: event.reason,
        url: window.location.href
      });
    });
  }
};

// 5. Performance Monitoring
export const setupPerformanceMonitoring = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Monitor page load
    window.addEventListener('load', () => {
      const perfData = performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;

      trackEvent('performance', {
        page_load_time: pageLoadTime,
        connect_time: connectTime,
        render_time: renderTime,
        url: window.location.href
      });

      // Log slow loads
      if (pageLoadTime > 3000) {
        console.warn(`⚠️ Slow page load: ${pageLoadTime}ms`);
      }
    });

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              console.warn('Long task detected:', entry);
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }
  }
};

// 6. Network Status Handler
export const setupNetworkHandling = () => {
  if (typeof window !== 'undefined') {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      document.body.classList.toggle('offline', !isOnline);

      if (!isOnline) {
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #333;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 9999;
          animation: slideIn 0.3s ease;
        `;
        toast.textContent = '📵 You are offline. Game saved locally.';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }

      trackEvent(isOnline ? 'online' : 'offline');
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }
};

// 7. Local Storage Fallback for Database
export class LocalStorageFallback {
  private prefix = 'dominauts_';

  async save(key: string, data: any): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(data));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  async load(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }
}

// 8. Initialize All Fixes
export const initializeCriticalFixes = () => {
  console.log('🔧 Initializing critical fixes...');

  // Check environment
  const hasRequiredVars = checkCriticalEnvVars();

  // Setup error tracking
  setupErrorTracking();

  // Setup performance monitoring
  setupPerformanceMonitoring();

  // Setup network handling
  setupNetworkHandling();

  // Log configuration
  const config = getFallbackConfig();
  console.log('📋 Running with configuration:', {
    mode: hasRequiredVars ? 'production' : 'degraded',
    features: config.features
  });

  return {
    isHealthy: hasRequiredVars,
    config,
    storage: new LocalStorageFallback()
  };
};

// Auto-initialize on import
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initializeCriticalFixes);
}