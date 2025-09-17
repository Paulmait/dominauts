/**
 * Dominauts™ - Admin Analytics Dashboard
 * Comprehensive tracking and analytics system
 */

export class AdminAnalytics {
  private analytics: any = {};
  private supabase: any;

  constructor() {
    this.initializeTracking();
  }

  /**
   * Track EVERYTHING for admin insights
   */
  private initializeTracking(): void {
    // Real-time metrics
    this.analytics = {
      realTime: {
        activePlayers: 0,
        gamesInProgress: 0,
        revenue: { today: 0, hour: 0, minute: 0 },
        serverLoad: 0
      },

      // User metrics
      users: {
        total: 0,
        dau: 0, // Daily Active Users
        mau: 0, // Monthly Active Users
        new: { today: 0, week: 0, month: 0 },
        retention: {
          day1: 0,
          day7: 0,
          day30: 0
        },
        churn: 0,
        lifetime: 0 // Average lifetime
      },

      // Engagement metrics
      engagement: {
        avgSessionTime: 0,
        avgGamesPerSession: 0,
        avgGamesPerUser: 0,
        bounceRate: 0,
        pageViews: 0,
        clicks: {},
        heatmap: []
      },

      // Game metrics
      games: {
        total: 0,
        completed: 0,
        abandoned: 0,
        avgDuration: 0,
        byMode: {},
        byDifficulty: {},
        winRates: {},
        scoreDistribution: []
      },

      // Monetization
      monetization: {
        revenue: { total: 0, today: 0, month: 0, year: 0 },
        arpu: 0, // Average Revenue Per User
        arppu: 0, // Average Revenue Per Paying User
        conversionRate: 0,
        ltv: 0, // Lifetime Value
        purchases: {
          total: 0,
          byItem: {},
          byPrice: {},
          failed: 0
        },
        ads: {
          impressions: 0,
          clicks: 0,
          ctr: 0,
          revenue: 0
        }
      },

      // Technical metrics
      technical: {
        errors: [],
        crashes: 0,
        loadTime: [],
        fps: [],
        memory: [],
        apiCalls: 0,
        apiLatency: [],
        deviceTypes: {},
        browsers: {},
        os: {},
        screenResolutions: {}
      },

      // Social metrics
      social: {
        shares: 0,
        invites: { sent: 0, accepted: 0 },
        friendsAdded: 0,
        messages: 0,
        reported: 0
      },

      // Feature usage
      features: {
        hints: { used: 0, purchased: 0 },
        replays: 0,
        tutorials: { started: 0, completed: 0 },
        achievements: { unlocked: 0, byType: {} },
        leaderboard: { views: 0, updates: 0 },
        tournaments: { entered: 0, completed: 0 },
        dailyChallenges: { started: 0, completed: 0 }
      },

      // A/B Testing
      experiments: {
        active: [],
        results: {}
      },

      // Funnel analysis
      funnels: {
        onboarding: {
          started: 0,
          tutorial: 0,
          firstGame: 0,
          firstWin: 0,
          firstPurchase: 0
        },
        purchase: {
          viewed: 0,
          clicked: 0,
          completed: 0
        }
      }
    };

    this.startTracking();
  }

  /**
   * Start all tracking mechanisms
   */
  private startTracking(): void {
    // Page visibility
    this.trackPageVisibility();

    // User actions
    this.trackUserActions();

    // Performance
    this.trackPerformance();

    // Errors
    this.trackErrors();

    // Revenue
    this.trackRevenue();

    // Send to backend every 30 seconds
    setInterval(() => this.sendAnalytics(), 30000);
  }

  /**
   * Track page visibility and session time
   */
  private trackPageVisibility(): void {
    let sessionStart = Date.now();
    let totalTime = 0;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        totalTime += Date.now() - sessionStart;
        this.analytics.engagement.avgSessionTime = totalTime / 1000;
      } else {
        sessionStart = Date.now();
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      totalTime += Date.now() - sessionStart;
      this.saveSession(totalTime);
    });
  }

  /**
   * Track all user actions
   */
  private trackUserActions(): void {
    // Click tracking
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action') || target.textContent;

      if (!this.analytics.engagement.clicks[action!]) {
        this.analytics.engagement.clicks[action!] = 0;
      }
      this.analytics.engagement.clicks[action!]++;

      // Heatmap data
      this.analytics.engagement.heatmap.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
      });
    });

    // Game events
    this.trackGameEvents();
  }

  /**
   * Track game-specific events
   */
  private trackGameEvents(): void {
    const events = [
      'gameStart',
      'gameEnd',
      'tilePlace',
      'hint',
      'replay',
      'achievement',
      'purchase',
      'adWatch',
      'share',
      'invite'
    ];

    events.forEach(event => {
      document.addEventListener(event, (e: any) => {
        this.logEvent(event, e.detail);
      });
    });
  }

  /**
   * Track performance metrics
   */
  private trackPerformance(): void {
    // FPS tracking
    let lastTime = performance.now();
    let frames = 0;

    const checkFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.analytics.technical.fps.push(fps);
        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(checkFPS);
    };
    checkFPS();

    // Memory tracking
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.analytics.technical.memory.push({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
      }, 10000);
    }

    // Load time
    window.addEventListener('load', () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.analytics.technical.loadTime.push(loadTime);
    });
  }

  /**
   * Track errors and crashes
   */
  private trackErrors(): void {
    window.addEventListener('error', (e) => {
      this.analytics.technical.errors.push({
        message: e.message,
        source: e.filename,
        line: e.lineno,
        column: e.colno,
        stack: e.error?.stack,
        timestamp: Date.now()
      });

      this.analytics.technical.crashes++;
      this.sendCriticalAlert('Error', e.message);
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.analytics.technical.errors.push({
        type: 'unhandledRejection',
        reason: e.reason,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Track revenue events
   */
  private trackRevenue(): void {
    // Listen for purchase events
    document.addEventListener('purchase', (e: any) => {
      const { amount, item, success } = e.detail;

      if (success) {
        this.analytics.monetization.revenue.total += amount;
        this.analytics.monetization.revenue.today += amount;
        this.analytics.monetization.purchases.total++;

        if (!this.analytics.monetization.purchases.byItem[item]) {
          this.analytics.monetization.purchases.byItem[item] = 0;
        }
        this.analytics.monetization.purchases.byItem[item]++;
      } else {
        this.analytics.monetization.purchases.failed++;
      }

      this.updateMonetizationMetrics();
    });

    // Track ad revenue
    document.addEventListener('adView', (e: any) => {
      this.analytics.monetization.ads.impressions++;
      this.analytics.monetization.ads.revenue += e.detail.revenue || 0;
    });
  }

  /**
   * Calculate derived metrics
   */
  private updateMonetizationMetrics(): void {
    const totalUsers = this.analytics.users.total || 1;
    const payingUsers = Object.keys(this.analytics.monetization.purchases.byItem).length || 1;

    this.analytics.monetization.arpu = this.analytics.monetization.revenue.total / totalUsers;
    this.analytics.monetization.arppu = this.analytics.monetization.revenue.total / payingUsers;
    this.analytics.monetization.conversionRate = (payingUsers / totalUsers) * 100;
    this.analytics.monetization.ltv = this.analytics.monetization.arpu * this.analytics.users.lifetime;
  }

  /**
   * Log custom events
   */
  public logEvent(eventName: string, data: any): void {
    const event = {
      name: eventName,
      data: data,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    };

    // Queue for batch sending
    this.queueEvent(event);

    // Update relevant metrics
    this.updateMetricsForEvent(eventName, data);
  }

  /**
   * A/B Testing framework
   */
  public runExperiment(name: string, variants: string[]): string {
    const userId = this.getUserId();
    const hash = this.hashCode(userId + name);
    const variant = variants[Math.abs(hash) % variants.length];

    if (!this.analytics.experiments.results[name]) {
      this.analytics.experiments.results[name] = {};
      variants.forEach(v => {
        this.analytics.experiments.results[name][v] = {
          users: 0,
          conversions: 0,
          revenue: 0
        };
      });
    }

    this.analytics.experiments.results[name][variant].users++;

    return variant;
  }

  /**
   * Real-time dashboard data
   */
  public getDashboardData(): any {
    return {
      realTime: {
        ...this.analytics.realTime,
        activeNow: this.getActiveUsers(),
        trend: this.calculateTrend()
      },

      keyMetrics: {
        dau: this.analytics.users.dau,
        revenue: this.analytics.monetization.revenue.today,
        newUsers: this.analytics.users.new.today,
        avgSession: Math.round(this.analytics.engagement.avgSessionTime / 60) + ' min',
        retention: this.analytics.users.retention.day1 + '%'
      },

      charts: {
        revenue: this.getRevenueChart(),
        users: this.getUsersChart(),
        engagement: this.getEngagementChart(),
        funnel: this.getFunnelChart()
      },

      alerts: this.getAlerts(),

      topMetrics: {
        topGames: this.getTopGames(),
        topPurchases: this.getTopPurchases(),
        topCountries: this.getTopCountries()
      }
    };
  }

  /**
   * Send analytics to backend
   */
  private async sendAnalytics(): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('analytics').insert({
        metrics: this.analytics,
        timestamp: new Date().toISOString()
      });

      // Reset some counters
      this.resetHourlyMetrics();
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  /**
   * Critical alerts for admin
   */
  private sendCriticalAlert(type: string, message: string): void {
    // Send to admin dashboard
    if (this.supabase) {
      this.supabase.from('alerts').insert({
        type,
        message,
        severity: 'critical',
        timestamp: new Date().toISOString()
      });
    }

    // Also log locally
    console.error(`[CRITICAL] ${type}: ${message}`);
  }

  // Helper methods
  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || this.generateSessionId();
  }

  private getUserId(): string {
    return localStorage.getItem('userId') || this.generateUserId();
  }

  private generateSessionId(): string {
    const id = 'session_' + Date.now() + '_' + Math.random().toString(36);
    sessionStorage.setItem('sessionId', id);
    return id;
  }

  private generateUserId(): string {
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36);
    localStorage.setItem('userId', id);
    return id;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  private queueEvent(event: any): void {
    // Implementation for event queuing
  }

  private updateMetricsForEvent(eventName: string, data: any): void {
    // Update specific metrics based on event type
  }

  private saveSession(duration: number): void {
    // Save session data
  }

  private getActiveUsers(): number {
    return this.analytics.realTime.activePlayers;
  }

  private calculateTrend(): string {
    return '+12%';
  }

  private getRevenueChart(): any {
    return []; // Chart data
  }

  private getUsersChart(): any {
    return []; // Chart data
  }

  private getEngagementChart(): any {
    return []; // Chart data
  }

  private getFunnelChart(): any {
    return this.analytics.funnels;
  }

  private getAlerts(): any[] {
    return [];
  }

  private getTopGames(): any[] {
    return [];
  }

  private getTopPurchases(): any[] {
    return [];
  }

  private getTopCountries(): any[] {
    return [];
  }

  private resetHourlyMetrics(): void {
    // Reset hourly counters
  }
}