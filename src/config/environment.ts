/**
 * Environment Configuration
 * Centralized configuration with type safety
 */

export const ENV = {
  // Deployment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  APP_URL: process.env.VITE_APP_URL || 'http://localhost:3000',
  APP_VERSION: process.env.VITE_APP_VERSION || '2.0.0',

  // Supabase (Primary Database)
  SUPABASE: {
    URL: process.env.VITE_SUPABASE_URL || '',
    ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
    enabled: !!process.env.VITE_SUPABASE_URL
  },

  // Firebase (Optional - for specific features)
  FIREBASE: {
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    enabled: !!process.env.VITE_FIREBASE_API_KEY
  },

  // Stripe
  STRIPE: {
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    enabled: !!process.env.VITE_STRIPE_PUBLISHABLE_KEY
  },

  // Analytics
  ANALYTICS: {
    GA_ID: process.env.VITE_GA_MEASUREMENT_ID || '',
    SENTRY_DSN: process.env.VITE_SENTRY_DSN || '',
    MIXPANEL_TOKEN: process.env.VITE_MIXPANEL_TOKEN || '',
    enabled: process.env.VITE_ENABLE_ANALYTICS === 'true'
  },

  // Feature Flags
  FEATURES: {
    multiplayer: process.env.VITE_ENABLE_MULTIPLAYER === 'true',
    tournaments: process.env.VITE_ENABLE_TOURNAMENTS === 'true',
    ads: process.env.VITE_ENABLE_ADS === 'true',
    iap: process.env.VITE_ENABLE_IAP === 'true',
    pushNotifications: process.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',
    ai: process.env.VITE_ENABLE_AI !== 'false',
    hints: process.env.VITE_ENABLE_HINTS !== 'false'
  },

  // Game Settings
  GAME: {
    maxPlayers: parseInt(process.env.VITE_MAX_PLAYERS || '4'),
    defaultMode: process.env.VITE_DEFAULT_GAME_MODE || 'allfives'
  },

  // API
  API: {
    baseUrl: process.env.VITE_API_BASE_URL || '/api',
    websocketUrl: process.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001'
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