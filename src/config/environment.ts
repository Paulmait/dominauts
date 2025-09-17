/**
 * Environment Configuration
 * Centralized configuration with type safety
 */

export const ENV = {
  // Deployment
  NODE_ENV: import.meta.env.MODE || 'development',
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
  APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:3000',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '2.0.0',

  // Supabase (Primary Database)
  SUPABASE: {
    URL: import.meta.env.VITE_SUPABASE_URL || '',
    ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    enabled: !!import.meta.env.VITE_SUPABASE_URL
  },

  // Firebase (Optional - for specific features)
  FIREBASE: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    enabled: !!import.meta.env.VITE_FIREBASE_API_KEY
  },

  // Stripe
  STRIPE: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    enabled: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  },

  // Analytics
  ANALYTICS: {
    GA_ID: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
    SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || '',
    MIXPANEL_TOKEN: import.meta.env.VITE_MIXPANEL_TOKEN || '',
    enabled: import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
  },

  // Feature Flags
  FEATURES: {
    multiplayer: import.meta.env.VITE_ENABLE_MULTIPLAYER === 'true',
    tournaments: import.meta.env.VITE_ENABLE_TOURNAMENTS === 'true',
    ads: import.meta.env.VITE_ENABLE_ADS === 'true',
    iap: import.meta.env.VITE_ENABLE_IAP === 'true',
    pushNotifications: import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',
    ai: import.meta.env.VITE_ENABLE_AI !== 'false',
    hints: import.meta.env.VITE_ENABLE_HINTS !== 'false'
  },

  // Game Settings
  GAME: {
    maxPlayers: parseInt(import.meta.env.VITE_MAX_PLAYERS || '4'),
    defaultMode: import.meta.env.VITE_DEFAULT_GAME_MODE || 'allfives'
  },

  // API
  API: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001'
  }
};

// Type-safe config getter
export function getConfig<T extends keyof typeof ENV>(key: T): typeof ENV[T] {
  return ENV[key];
}

// Validate required configurations
export function validateEnvironment(): void {
  const errors: string[] = [];

  // Check required configs for production
  if (ENV.IS_PRODUCTION) {
    if (!ENV.SUPABASE.URL && !ENV.FIREBASE.apiKey) {
      errors.push('Either Supabase or Firebase must be configured');
    }

    if (ENV.FEATURES.iap && !ENV.STRIPE.publishableKey) {
      errors.push('Stripe configuration required for IAP');
    }

    if (ENV.ANALYTICS.enabled && !ENV.ANALYTICS.GA_ID) {
      errors.push('Google Analytics ID required when analytics enabled');
    }
  }

  if (errors.length > 0) {
    console.error('Environment configuration errors:', errors);
    if (ENV.IS_PRODUCTION) {
      throw new Error('Invalid environment configuration');
    }
  }
}

// Initialize on load
validateEnvironment();