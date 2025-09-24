/**
 * Global Type Definitions
 * Centralized window interface extensions
 */

export {};

declare global {
  interface Window {
    // Google Analytics
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];

    // Google AdSense
    adsbygoogle?: any[];
    googletag?: any;

    // Game state
    gameState?: string;

    // Stripe (for webhook handling - server-side only)
    Stripe?: any;
  }
}

// Extend process.env types for environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_APP_URL?: string;
    VITE_APP_VERSION?: string;
    VITE_APP_NAME?: string;
    VITE_GA_MEASUREMENT_ID?: string;
    VITE_SENTRY_DSN?: string;
    VITE_SENTRY_DEBUG?: string;
    VITE_STRIPE_PUBLISHABLE_KEY?: string;
    VITE_STRIPE_PRICE_PREMIUM_MONTHLY?: string;
    VITE_STRIPE_PRICE_PREMIUM_YEARLY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    VITE_ADSENSE_CLIENT_ID?: string;
    VITE_AD_BANNER_TOP?: string;
    VITE_AD_BANNER_BOTTOM?: string;
    VITE_AD_INTERSTITIAL?: string;
    VITE_AD_REWARDED?: string;
    VITE_AD_NATIVE?: string;
    VITE_ENABLE_MULTIPLAYER?: string;
    VITE_ENABLE_ANALYTICS?: string;
    VITE_ENABLE_ADS?: string;
    VITE_ENABLE_IAP?: string;
  }
}