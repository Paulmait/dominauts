/**
 * Comprehensive Analytics Service
 * Advanced tracking system for investor metrics and legal compliance
 */

import { supabase } from './SupabaseService';
import { User } from '@supabase/supabase-js';

// Core tracking interfaces
export interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  session_id: string;
  properties?: Record<string, any>;
  timestamp: string;
  // Enhanced tracking fields
  device_info?: DeviceInfo;
  location_info?: LocationInfo;
  referrer?: string;
  utm_params?: UTMParams;
  page_url?: string;
  interaction_type?: string;
}

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  os_version: string;
  browser: string;
  browser_version: string;
  screen_resolution: string;
  viewport_size: string;
  device_memory?: number;
  hardware_concurrency?: number;
  connection_type?: string;
  language: string;
  timezone: string;
}

interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  ip_address?: string; // Hashed for privacy
}

interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface UserSession {
  session_id: string;
  user_id?: string;
  started_at: string;
  last_active: string;
  page_views: number;
  events_count: number;
  duration_seconds: number;
  bounce: boolean;
  conversion: boolean;
  revenue: number;
}

// Comprehensive investor metrics
export interface InvestorMetrics {
  // Growth Metrics
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  growth_rate_week: number;
  growth_rate_month: number;

  // Engagement Metrics
  avg_session_duration: number;
  avg_sessions_per_user: number;
  bounce_rate: number;
  retention_d1: number;
  retention_d7: number;
  retention_d30: number;
  stickiness: number; // DAU/MAU

  // Monetization Metrics
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  revenue_ytd: number;
  arpu: number; // Average Revenue Per User
  arppu: number; // Average Revenue Per Paying User
  conversion_rate: number;
  ltv: number; // Lifetime Value
  cac: number; // Customer Acquisition Cost
  payback_period: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churn_rate: number;

  // Game-Specific Metrics
  games_played_today: number;
  avg_game_duration: number;
  completion_rate: number;
  multiplayer_rate: number;
  virality_coefficient: number;
  avg_moves_per_game: number;
  win_rate: number;

  // Platform Metrics
  mobile_users_pct: number;
  desktop_users_pct: number;
  ios_users_pct: number;
  android_users_pct: number;
  web_users_pct: number;
  pwa_installs: number;

  // Geographic Distribution
  top_countries: Array<{country: string; users: number; revenue: number}>;
  top_cities: Array<{city: string; users: number; revenue: number}>;

  // Technical Metrics
  avg_load_time: number;
  crash_rate: number;
  error_rate: number;
  api_latency: number;
  server_uptime: number;

  // Funnel Metrics
  acquisition_funnel: {
    visitors: number;
    signups: number;
    activated: number;
    paying: number;
    retained: number;
  };

  // Cohort Metrics
  cohorts: Array<{
    cohort: string;
    users: number;
    retention_d1: number;
    retention_d7: number;
    retention_d30: number;
    ltv: number;
  }>;

  // Social Metrics
  shares_today: number;
  invites_sent: number;
  invites_accepted: number;
  viral_coefficient: number;

  // Content Metrics
  feature_adoption: Record<string, number>;
  most_used_features: Array<{feature: string; usage: number}>;

  // Customer Satisfaction
  nps_score: number; // Net Promoter Score
  csat_score: number; // Customer Satisfaction Score
  support_tickets: number;
  avg_resolution_time: number;
}

export class ComprehensiveAnalytics {
  private static instance: ComprehensiveAnalytics;
  private session: UserSession | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private pageLoadTime: number = 0;
  private interactionCount: number = 0;
  private errorCount: number = 0;
  private abTests: Map<string, string> = new Map();

  private constructor() {
    this.initializeSession();
    this.startFlushInterval();
    this.setupPageTracking();
    this.setupPerformanceTracking();
    this.setupErrorTracking();
    this.trackInstallation();
    this.setupPrivacyCompliance();
  }

  public static getInstance(): ComprehensiveAnalytics {
    if (!ComprehensiveAnalytics.instance) {
      ComprehensiveAnalytics.instance = new ComprehensiveAnalytics();
    }
    return ComprehensiveAnalytics.instance;
  }

  private initializeSession(): void {
    const sessionId = this.generateSessionId();
    const startTime = new Date().toISOString();

    this.session = {
      session_id: sessionId,
      user_id: undefined,
      started_at: startTime,
      last_active: startTime,
      page_views: 0,
      events_count: 0,
      duration_seconds: 0,
      bounce: true,
      conversion: false,
      revenue: 0
    };

    // Store session in localStorage for persistence
    localStorage.setItem('analytics_session', JSON.stringify(this.session));

    // Track session start
    this.trackEvent('session_start', {
      entry_page: window.location.pathname,
      referrer: document.referrer,
      utm_params: this.getUTMParams(),
      screen_size: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      user_agent: navigator.userAgent
    });
  }

  private setupPageTracking(): void {
    // Track page views
    window.addEventListener('popstate', () => this.trackPageView());

    // Track time spent on page
    let lastActivity = Date.now();
    let totalActiveTime = 0;
    let isActive = true;

    const trackActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity < 30000) { // 30 seconds of inactivity
        this.updateSession();
        if (isActive) {
          totalActiveTime += timeSinceLastActivity;
        }
      }

      lastActivity = now;
      isActive = true;
      this.interactionCount++;

      // Update bounce status (user engaged with content)
      if (this.session && this.interactionCount > 3) {
        this.session.bounce = false;
      }
    };

    // Track various user activities
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, trackActivity, { passive: true });
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      isActive = !document.hidden;
      if (!isActive) {
        this.trackEvent('page_hidden', { total_active_time: totalActiveTime });
      } else {
        this.trackEvent('page_visible');
      }
    });

    // Track when user leaves
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        duration_seconds: this.session?.duration_seconds,
        page_views: this.session?.page_views,
        events_count: this.session?.events_count,
        bounce: this.session?.bounce,
        total_active_time: totalActiveTime,
        conversion: this.session?.conversion,
        revenue: this.session?.revenue
      });
      this.flushEvents();
    });
  }

  private setupPerformanceTracking(): void {
    // Track page load performance
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        const timing = window.performance.timing;
        this.pageLoadTime = timing.loadEventEnd - timing.navigationStart;

        this.trackEvent('performance_metrics', {
          page_load_time: this.pageLoadTime,
          dns_time: timing.domainLookupEnd - timing.domainLookupStart,
          tcp_time: timing.connectEnd - timing.connectStart,
          request_time: timing.responseStart - timing.requestStart,
          response_time: timing.responseEnd - timing.responseStart,
          dom_processing_time: timing.domComplete - timing.domLoading,
          dom_content_loaded_time: timing.domContentLoadedEventEnd - timing.navigationStart,
          first_paint: this.getFirstPaintTime(),
          first_contentful_paint: this.getFirstContentfulPaintTime()
        });
      });
    }

    // Track Core Web Vitals
    this.trackCoreWebVitals();
  }

  private setupErrorTracking(): void {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.errorCount++;
      this.trackEvent('javascript_error', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        type: 'uncaught_error'
      });
    });

    // Track promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.errorCount++;
      this.trackEvent('promise_rejection', {
        reason: event.reason,
        type: 'unhandled_rejection'
      });
    });
  }

  private trackInstallation(): void {
    // Track PWA installation
    window.addEventListener('beforeinstallprompt', (e: any) => {
      this.trackEvent('pwa_install_prompt_shown');

      e.userChoice.then((choiceResult: any) => {
        this.trackEvent('pwa_install_prompt_response', {
          outcome: choiceResult.outcome
        });
      });
    });

    // Track successful installation
    window.addEventListener('appinstalled', () => {
      this.trackEvent('pwa_installed');
    });
  }

  private setupPrivacyCompliance(): void {
    // Check for GDPR/CCPA compliance
    const gdprConsent = localStorage.getItem('gdpr_consent');
    const ccpaOptOut = localStorage.getItem('ccpa_opt_out');

    if (!gdprConsent) {
      this.trackEvent('privacy_consent_shown', { type: 'GDPR' });
    }

    if (!ccpaOptOut) {
      this.trackEvent('privacy_consent_shown', { type: 'CCPA' });
    }
  }

  public trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.session) return;

    // Check privacy settings
    if (this.isTrackingOptedOut()) return;

    const event: AnalyticsEvent = {
      event_name: eventName,
      user_id: this.session.user_id,
      session_id: this.session.session_id,
      properties: {
        ...properties,
        timestamp_unix: Date.now(),
        interaction_count: this.interactionCount,
        error_count: this.errorCount,
        ab_tests: Object.fromEntries(this.abTests)
      },
      timestamp: new Date().toISOString(),
      device_info: this.getDeviceInfo(),
      location_info: this.getLocationInfo(),
      referrer: document.referrer,
      utm_params: this.getUTMParams(),
      page_url: window.location.href,
      interaction_type: this.getInteractionType(eventName)
    };

    this.eventQueue.push(event);
    this.session.events_count++;

    // Update session duration
    if (this.session) {
      const duration = Date.now() - new Date(this.session.started_at).getTime();
      this.session.duration_seconds = Math.floor(duration / 1000);
    }

    // Track conversion events
    if (['purchase', 'subscription', 'premium_upgrade'].includes(eventName)) {
      this.session.conversion = true;
      if (properties?.amount) {
        this.session.revenue += properties.amount;
      }
    }

    // Flush if queue is getting large
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  public trackPageView(page?: string): void {
    const currentPage = page || window.location.pathname;

    this.trackEvent('page_view', {
      page: currentPage,
      title: document.title,
      referrer: document.referrer,
      load_time: this.pageLoadTime,
      viewport_height: window.innerHeight,
      viewport_width: window.innerWidth,
      screen_height: window.screen.height,
      screen_width: window.screen.width,
      pixel_ratio: window.devicePixelRatio,
      connection_type: this.getConnectionType(),
      battery_level: this.getBatteryLevel()
    });

    if (this.session) {
      this.session.page_views++;
    }
  }

  // Enhanced tracking methods for investor metrics
  public trackRevenue(amount: number, currency: string = 'USD', type: string = 'purchase', metadata?: any): void {
    this.trackEvent('revenue', {
      amount,
      currency,
      type,
      user_lifetime_value: this.calculateUserLTV(),
      payment_method: metadata?.payment_method,
      subscription_tier: metadata?.subscription_tier,
      discount_applied: metadata?.discount,
      referral_code: metadata?.referral_code
    });
  }

  public trackGameMetrics(gameData: any): void {
    this.trackEvent('game_completed', {
      duration: gameData.duration,
      score: gameData.score,
      mode: gameData.mode,
      players_count: gameData.players?.length,
      is_multiplayer: gameData.players?.length > 1,
      completion_rate: gameData.completed ? 1 : 0,
      quit_reason: gameData.quitReason,
      moves_count: gameData.movesCount,
      power_ups_used: gameData.powerUpsUsed,
      achievements_earned: gameData.achievementsEarned,
      difficulty_level: gameData.difficulty,
      win_streak: gameData.winStreak
    });
  }

  public trackSocialAction(action: string, target?: string, value?: any): void {
    this.trackEvent('social_action', {
      action,
      target,
      value,
      viral_coefficient: this.calculateViralCoefficient(),
      referred_users: this.getReferredUsersCount(),
      share_platform: value?.platform
    });
  }

  public trackABTest(testName: string, variant: string): void {
    this.abTests.set(testName, variant);
    this.trackEvent('ab_test_exposure', {
      test_name: testName,
      variant,
      conversion: false // Updated when user converts
    });
  }

  public trackFunnelStep(funnelName: string, step: string, stepNumber: number): void {
    this.trackEvent('funnel_step', {
      funnel_name: funnelName,
      step_name: step,
      step_number: stepNumber,
      time_on_step: Date.now()
    });
  }

  public trackFeatureUsage(featureName: string, usage: any): void {
    this.trackEvent('feature_usage', {
      feature: featureName,
      usage_count: usage.count,
      usage_duration: usage.duration,
      success: usage.success
    });
  }

  public trackUserSatisfaction(score: number, feedback?: string): void {
    this.trackEvent('user_satisfaction', {
      nps_score: score,
      feedback,
      would_recommend: score >= 9,
      satisfaction_level: score >= 7 ? 'satisfied' : 'unsatisfied'
    });
  }

  public setUser(user: User | null): void {
    if (this.session && user) {
      this.session.user_id = user.id;

      // Track user identification with enhanced properties
      this.trackEvent('user_identified', {
        email: user.email,
        created_at: user.created_at,
        days_since_signup: this.getDaysSince(user.created_at),
        user_agent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        cookies_enabled: navigator.cookieEnabled,
        do_not_track: navigator.doNotTrack,
        online: navigator.onLine
      });

      // Track user cohort
      this.trackUserCohort(user);
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert(events);

      if (error) {
        console.error('Failed to flush analytics events:', error);
        // Re-add events to queue on failure
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      this.eventQueue.unshift(...events);
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000); // Flush every 30 seconds
  }

  private updateSession(): void {
    if (!this.session) return;

    this.session.last_active = new Date().toISOString();
    localStorage.setItem('analytics_session', JSON.stringify(this.session));
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo(): DeviceInfo {
    const ua = navigator.userAgent;
    const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    const tablet = /iPad|Android.*Tablet/i.test(ua);

    return {
      type: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop',
      os: this.detectOS(),
      os_version: this.getOSVersion(),
      browser: this.detectBrowser(),
      browser_version: this.getBrowserVersion(),
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      device_memory: (navigator as any).deviceMemory,
      hardware_concurrency: navigator.hardwareConcurrency,
      connection_type: this.getConnectionType(),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private getLocationInfo(): LocationInfo {
    // This would be populated by server-side IP geolocation
    return {
      country: undefined,
      region: undefined,
      city: undefined,
      postal_code: undefined,
      latitude: undefined,
      longitude: undefined,
      ip_address: undefined // Hashed on backend
    };
  }

  private getUTMParams(): UTMParams {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      term: params.get('utm_term') || undefined,
      content: params.get('utm_content') || undefined
    };
  }

  private getInteractionType(eventName: string): string {
    const interactionMap: Record<string, string> = {
      click: 'engagement',
      page_view: 'navigation',
      purchase: 'conversion',
      signup: 'conversion',
      game_start: 'core_action',
      game_end: 'core_action',
      error: 'technical',
      share: 'viral'
    };

    for (const [key, type] of Object.entries(interactionMap)) {
      if (eventName.includes(key)) return type;
    }

    return 'other';
  }

  private detectOS(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  private getOSVersion(): string {
    const ua = navigator.userAgent;
    let version = 'Unknown';

    if (ua.includes('Windows NT')) {
      const match = ua.match(/Windows NT ([\d.]+)/);
      if (match) version = match[1];
    } else if (ua.includes('Mac OS X')) {
      const match = ua.match(/Mac OS X ([\d_]+)/);
      if (match) version = match[1].replace(/_/g, '.');
    } else if (ua.includes('Android')) {
      const match = ua.match(/Android ([\d.]+)/);
      if (match) version = match[1];
    }

    return version;
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private getBrowserVersion(): string {
    const ua = navigator.userAgent;
    const browser = this.detectBrowser();
    const regex = new RegExp(`${browser}\/([\\d.]+)`);
    const match = ua.match(regex);
    return match ? match[1] : 'Unknown';
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection;
    if (!connection) return 'Unknown';
    return connection.effectiveType || connection.type || 'Unknown';
  }

  private getBatteryLevel(): number | undefined {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        return battery.level;
      });
    }
    return undefined;
  }

  private getDaysSince(date: string): number {
    const then = new Date(date).getTime();
    const now = Date.now();
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }

  private trackUserCohort(user: User): void {
    const signupDate = new Date(user.created_at || '');
    const cohortWeek = this.getWeekNumber(signupDate);
    const cohortMonth = signupDate.toISOString().slice(0, 7);

    this.trackEvent('user_cohort', {
      cohort_week: cohortWeek,
      cohort_month: cohortMonth,
      days_since_signup: this.getDaysSince(user.created_at || '')
    });
  }

  private getWeekNumber(date: Date): string {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  private getFirstPaintTime(): number | undefined {
    const entries = performance.getEntriesByType('paint');
    const firstPaint = entries.find(entry => entry.name === 'first-paint');
    return firstPaint?.startTime;
  }

  private getFirstContentfulPaintTime(): number | undefined {
    const entries = performance.getEntriesByType('paint');
    const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
    return fcp?.startTime;
  }

  private trackCoreWebVitals(): void {
    // Track Largest Contentful Paint (LCP)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.trackEvent('core_web_vital', {
        metric: 'LCP',
        value: lastEntry.startTime
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Track First Input Delay (FID)
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.trackEvent('core_web_vital', {
          metric: 'FID',
          value: entry.processingStart - entry.startTime
        });
      });
    }).observe({ entryTypes: ['first-input'] });

    // Track Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.trackEvent('core_web_vital', {
        metric: 'CLS',
        value: clsValue
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private calculateUserLTV(): number {
    // This would be calculated based on historical user data
    return 0; // Placeholder - implement with actual calculation
  }

  private calculateViralCoefficient(): number {
    // K-factor calculation
    return 0; // Placeholder - implement with actual calculation
  }

  private getReferredUsersCount(): number {
    // Count of users referred by this user
    return 0; // Placeholder - implement with actual calculation
  }

  private isTrackingOptedOut(): boolean {
    // Check for opt-out preferences
    return localStorage.getItem('analytics_opt_out') === 'true';
  }

  // Method to get comprehensive investor metrics
  public async getInvestorMetrics(): Promise<InvestorMetrics> {
    const { data } = await supabase
      .from('analytics_summary')
      .select('*')
      .single();

    return data as InvestorMetrics;
  }

  // Export analytics data for investors
  public async exportAnalyticsData(startDate: string, endDate: string, format: 'csv' | 'json' = 'json'): Promise<any> {
    const { data } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(value =>
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }
}

export const comprehensiveAnalytics = ComprehensiveAnalytics.getInstance();
export default comprehensiveAnalytics;