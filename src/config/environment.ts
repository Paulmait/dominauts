/**
 * Environment Configuration - SUPABASE ONLY
 * All services consolidated to Supabase
 */

export const ENV = {
  // Deployment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  APP_URL: process.env.VITE_APP_URL || 'http://localhost:3000',
  APP_VERSION: process.env.VITE_APP_VERSION || '2.0.0',

  // Supabase (ONLY Backend Service)
  SUPABASE: {
    URL: process.env.VITE_SUPABASE_URL || '',
    ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Server-side only
    enabled: true // Always enabled
  },

  // Stripe
  STRIPE: {
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    enabled: !!process.env.VITE_STRIPE_PUBLISHABLE_KEY
  },

  // Analytics
  ANALYTICS: {
    GA_ID: process.env.VITE_GA_MEASUREMENT_ID || '',
    SENTRY_DSN: process.env.VITE_SENTRY_DSN || '',
    MIXPANEL_TOKEN: process.env.VITE_MIXPANEL_TOKEN || '',
    enabled: process.env.VITE_ENABLE_ANALYTICS !== 'false'
  },

  // Feature Flags
  FEATURES: {
    multiplayer: process.env.VITE_ENABLE_MULTIPLAYER !== 'false',
    tournaments: process.env.VITE_ENABLE_TOURNAMENTS === 'true',
    ads: process.env.VITE_ENABLE_ADS === 'true',
    iap: process.env.VITE_ENABLE_IAP !== 'false',
    ai: process.env.VITE_ENABLE_AI !== 'false',
    hints: process.env.VITE_ENABLE_HINTS !== 'false'
  },

  // Game Settings
  GAME: {
    maxPlayers: parseInt(process.env.VITE_MAX_PLAYERS || '4'),
    defaultMode: process.env.VITE_DEFAULT_GAME_MODE || 'allfives',
    turnTimeout: parseInt(process.env.VITE_TURN_TIMEOUT || '30000'),
    maxGamesPerDay: parseInt(process.env.VITE_MAX_GAMES_PER_DAY || '100')
  },

  // Security
  SECURITY: {
    jwtSecret: process.env.JWT_SECRET || '',
    sessionSecret: process.env.SESSION_SECRET || '',
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100'),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    strictRateLimit: parseInt(process.env.STRICT_RATE_LIMIT || '5') // 5 requests per minute for sensitive endpoints
  },

  // API (Supabase Edge Functions)
  API: {
    baseUrl: process.env.VITE_API_BASE_URL || '/api',
    edgeFunctionsUrl: process.env.VITE_SUPABASE_URL ?
      `${process.env.VITE_SUPABASE_URL}/functions/v1` : ''
  }
};

// Type-safe config getter
export function getConfig<T extends keyof typeof ENV>(key: T): typeof ENV[T] {
  return ENV[key];
}

// Validate required configurations
export function validateEnvironment(): void {
  const errors: string[] = [];

  // Check required Supabase config
  if (!ENV.SUPABASE.URL || !ENV.SUPABASE.ANON_KEY) {
    errors.push('Supabase URL and Anon Key are required');
  }

  // Check required configs for production
  if (ENV.IS_PRODUCTION) {
    if (!ENV.SECURITY.jwtSecret || ENV.SECURITY.jwtSecret.length < 32) {
      errors.push('JWT Secret must be at least 32 characters in production');
    }

    if (ENV.FEATURES.iap && !ENV.STRIPE.publishableKey) {
      errors.push('Stripe configuration required for in-app purchases');
    }

    if (!ENV.STRIPE.webhookSecret && ENV.STRIPE.enabled) {
      errors.push('Stripe webhook secret required for payment processing');
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