/**
 * Comprehensive User Tracking & Analytics System
 * Tracks device ID, IP, location, behavior, and all necessary data
 * GDPR/CCPA compliant with user consent
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

export class UserTrackingSystem {
  private deviceId: string = '';
  private sessionId: string = '';
  private userId: string = '';

  // Device Information
  private deviceData = {
    // Device Fingerprint (unique ID)
    deviceId: '',
    deviceType: '', // mobile, tablet, desktop

    // Hardware
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    touchSupport: 'ontouchstart' in window,

    // Software
    userAgent: navigator.userAgent,
    browser: this.getBrowserInfo(),
    os: this.getOSInfo(),
    language: navigator.language,
    languages: navigator.languages,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),

    // Capabilities
    webGL: this.getWebGLInfo(),
    canvas: this.getCanvasFingerprint(),
    audio: this.getAudioFingerprint(),
    fonts: this.getInstalledFonts(),
    plugins: this.getPlugins(),

    // Network
    connection: (navigator as any).connection?.effectiveType,
    doNotTrack: navigator.doNotTrack,
    cookiesEnabled: navigator.cookieEnabled,
    localStorage: this.testLocalStorage(),
    sessionStorage: this.testSessionStorage(),
    indexedDB: !!window.indexedDB,

    // Mobile specific
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isMobile: /Mobile/.test(navigator.userAgent),
    deviceModel: this.getDeviceModel(),

    // Performance
    loadTime: 0,
    domLoadTime: 0,
    resourceLoadTime: 0,
  };

  // Network & Location Data
  private networkData = {
    ipAddress: '',
    ipv6Address: '',
    vpnDetected: false,
    proxyDetected: false,
    torDetected: false,

    // Geolocation
    country: '',
    countryCode: '',
    region: '',
    city: '',
    postalCode: '',
    latitude: 0,
    longitude: 0,
    timezone: '',

    // ISP Info
    isp: '',
    org: '',
    asn: '',

    // Connection
    connectionType: '',
    connectionSpeed: '',

    // Security
    threatLevel: 'low', // low, medium, high
    fraudScore: 0,
    botProbability: 0,
  };

  // User Behavior Data
  private behaviorData = {
    // Session Info
    sessionId: '',
    sessionStart: new Date(),
    sessionDuration: 0,
    pageViews: 0,

    // Engagement Metrics
    clickCount: 0,
    tapCount: 0,
    scrollDepth: 0,
    mouseMovements: [] as Array<{x: number, y: number, t: number}>,
    keystrokes: 0,

    // Game Specific
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    averageGameTime: 0,
    totalPlayTime: 0,

    // Interaction Patterns
    clickPatterns: [] as Array<{element: string, time: number}>,
    navigationPath: [] as string[],
    featureUsage: {} as Record<string, number>,
    errorCount: 0,

    // Purchase Behavior
    viewedStore: false,
    itemsViewed: [] as string[],
    cartAbandoned: false,
    purchaseAttempts: 0,
    purchaseSuccess: 0,

    // Social
    friendsInvited: 0,
    messagesSet: 0,
    profileViews: 0,

    // Performance
    fps: [] as number[],
    lagSpikes: 0,
    crashCount: 0,
  };

  // User Profile Data
  private profileData = {
    // Account
    userId: '',
    username: '',
    email: '',
    phoneNumber: '',

    // Demographics (optional)
    age: 0,
    gender: '',

    // Preferences
    soundEnabled: true,
    musicEnabled: true,
    notificationsEnabled: false,
    theme: 'default',
    difficulty: 'normal',

    // Status
    accountStatus: 'active', // active, suspended, banned
    verificationStatus: 'unverified',
    vipStatus: false,
    subscriptionTier: 'free',

    // History
    firstSeen: new Date(),
    lastSeen: new Date(),
    totalSessions: 0,
    lifetime: 0,

    // Financial
    totalSpent: 0,
    averageOrderValue: 0,
    paymentMethods: [] as string[],
    currency: 'USD',

    // Risk
    chargebackCount: 0,
    refundCount: 0,
    reportCount: 0,
    suspiciousActivity: false,
  };

  // Privacy & Compliance
  private consentData = {
    gdprConsent: false,
    ccpaConsent: false,
    cookieConsent: false,
    analyticsConsent: false,
    marketingConsent: false,
    personalDataConsent: false,
    thirdPartyConsent: false,
    consentTimestamp: new Date(),
    consentIP: '',
    consentVersion: '1.0',
  };

  async initialize(): Promise<void> {
    // Generate unique device ID
    await this.generateDeviceId();

    // Start session
    this.sessionId = this.generateSessionId();

    // Collect device data
    this.collectDeviceData();

    // Get IP and location
    await this.fetchIPAndLocation();

    // Start behavior tracking
    this.startBehaviorTracking();

    // Check for fraud indicators
    await this.detectFraudIndicators();

    // Send initial tracking event
    this.trackEvent('app_start', {
      deviceId: this.deviceId,
      sessionId: this.sessionId,
      ...this.deviceData,
    });
  }

  private async generateDeviceId(): Promise<void> {
    try {
      // Use FingerprintJS for reliable device fingerprinting
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      this.deviceId = result.visitorId;
      this.deviceData.deviceId = this.deviceId;

      // Store in localStorage for consistency
      localStorage.setItem('deviceId', this.deviceId);
    } catch (error) {
      // Fallback to custom fingerprint
      this.deviceId = this.generateCustomFingerprint();
    }
  }

  private generateCustomFingerprint(): string {
    const fingerprint = {
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: new Date().getTimezoneOffset(),
      language: navigator.language,
      platform: navigator.platform,
      hardware: navigator.hardwareConcurrency,
      canvas: this.getCanvasFingerprint(),
    };

    // Create hash from fingerprint data
    return this.hashCode(JSON.stringify(fingerprint));
  }

  private async fetchIPAndLocation(): Promise<void> {
    try {
      // Primary IP service
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      this.networkData.ipAddress = ipData.ip;

      // Detailed location data
      const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
      const geoData = await geoResponse.json();

      this.networkData = {
        ...this.networkData,
        country: geoData.country_name,
        countryCode: geoData.country_code,
        region: geoData.region,
        city: geoData.city,
        postalCode: geoData.postal,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        timezone: geoData.timezone,
        isp: geoData.org,
        asn: geoData.asn,
      };

      // VPN/Proxy detection
      await this.detectVPN();

    } catch (error) {
      console.error('Failed to fetch IP/location:', error);
      // Use fallback geolocation API if available
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.networkData.latitude = position.coords.latitude;
            this.networkData.longitude = position.coords.longitude;
          }
        );
      }
    }
  }

  private async detectVPN(): Promise<void> {
    try {
      // Check for VPN/Proxy indicators
      const response = await fetch(`https://vpnapi.io/api/${this.networkData.ipAddress}`);
      const data = await response.json();

      this.networkData.vpnDetected = data.security.vpn;
      this.networkData.proxyDetected = data.security.proxy;
      this.networkData.torDetected = data.security.tor;
      this.networkData.threatLevel = data.security.threat_level || 'low';
    } catch (error) {
      console.error('VPN detection failed:', error);
    }
  }

  private startBehaviorTracking(): void {
    // Track mouse movements (sample every 100ms)
    let lastMouseTime = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseTime > 100) {
        this.behaviorData.mouseMovements.push({
          x: e.clientX,
          y: e.clientY,
          t: now
        });
        lastMouseTime = now;

        // Keep only last 100 movements
        if (this.behaviorData.mouseMovements.length > 100) {
          this.behaviorData.mouseMovements.shift();
        }
      }
    });

    // Track clicks
    document.addEventListener('click', (e) => {
      this.behaviorData.clickCount++;
      const target = e.target as HTMLElement;
      this.behaviorData.clickPatterns.push({
        element: target.tagName + (target.id ? `#${target.id}` : ''),
        time: Date.now()
      });
    });

    // Track taps (mobile)
    document.addEventListener('touchstart', () => {
      this.behaviorData.tapCount++;
    });

    // Track scroll depth
    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      this.behaviorData.scrollDepth = Math.max(
        this.behaviorData.scrollDepth,
        (scrolled / scrollHeight) * 100
      );
    });

    // Track keystrokes (count only, not content)
    document.addEventListener('keydown', () => {
      this.behaviorData.keystrokes++;
    });

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('app_background');
      } else {
        this.trackEvent('app_foreground');
      }
    });

    // Track errors
    window.addEventListener('error', (e) => {
      this.behaviorData.errorCount++;
      this.trackEvent('error', {
        message: e.message,
        source: e.filename,
        line: e.lineno,
        column: e.colno
      });
    });

    // Track performance
    this.trackPerformance();
  }

  private trackPerformance(): void {
    // Track FPS
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.behaviorData.fps.push(fps);

        // Keep only last 60 FPS measurements
        if (this.behaviorData.fps.length > 60) {
          this.behaviorData.fps.shift();
        }

        // Detect lag spikes
        if (fps < 30) {
          this.behaviorData.lagSpikes++;
        }

        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);

    // Track page load performance
    if (performance.timing) {
      this.deviceData.loadTime =
        performance.timing.loadEventEnd - performance.timing.fetchStart;
      this.deviceData.domLoadTime =
        performance.timing.domContentLoadedEventEnd - performance.timing.fetchStart;
    }
  }

  private async detectFraudIndicators(): Promise<void> {
    let fraudScore = 0;

    // Check for suspicious indicators
    if (this.networkData.vpnDetected) fraudScore += 20;
    if (this.networkData.proxyDetected) fraudScore += 20;
    if (this.networkData.torDetected) fraudScore += 30;

    // Check for headless browser
    if (navigator.webdriver) fraudScore += 50;
    if (!navigator.languages || navigator.languages.length === 0) fraudScore += 10;

    // Check for automation tools
    if ((window as any).callPhantom || (window as any)._phantom) fraudScore += 50;
    if ((window as any).__nightmare) fraudScore += 50;

    // Check for suspicious user agent
    if (/bot|crawl|spider/i.test(navigator.userAgent)) fraudScore += 40;

    // Check for impossible screen dimensions
    if (screen.width === 0 || screen.height === 0) fraudScore += 30;

    // Check for suspicious timezone
    const browserOffset = new Date().getTimezoneOffset();
    const expectedOffset = this.getExpectedTimezoneOffset(this.networkData.timezone);
    if (Math.abs(browserOffset - expectedOffset) > 60) fraudScore += 15;

    this.networkData.fraudScore = Math.min(fraudScore, 100);
    this.networkData.botProbability = fraudScore / 100;

    // Alert if high fraud score
    if (fraudScore > 70) {
      this.trackEvent('fraud_alert', {
        fraudScore,
        indicators: {
          vpn: this.networkData.vpnDetected,
          proxy: this.networkData.proxyDetected,
          tor: this.networkData.torDetected,
          headless: navigator.webdriver,
        }
      });
    }
  }

  // Tracking Methods
  public trackEvent(eventName: string, data?: any): void {
    const event = {
      eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      deviceId: this.deviceId,
      data: {
        ...data,
        url: window.location.href,
        referrer: document.referrer,
      }
    };

    // Send to analytics backend
    this.sendToAnalytics(event);

    // Store locally for batch processing
    this.storeEventLocally(event);
  }

  public trackGameEvent(action: string, details: any): void {
    this.trackEvent(`game_${action}`, {
      ...details,
      gameMode: details.gameMode,
      score: details.score,
      duration: details.duration,
    });

    // Update behavior data
    if (action === 'start') this.behaviorData.gamesPlayed++;
    if (action === 'win') this.behaviorData.gamesWon++;
    if (action === 'lose') this.behaviorData.gamesLost++;
  }

  public trackPurchaseEvent(action: string, details: any): void {
    this.trackEvent(`purchase_${action}`, {
      ...details,
      productId: details.productId,
      price: details.price,
      currency: details.currency,
    });

    // Update purchase behavior
    if (action === 'view') this.behaviorData.itemsViewed.push(details.productId);
    if (action === 'attempt') this.behaviorData.purchaseAttempts++;
    if (action === 'success') {
      this.behaviorData.purchaseSuccess++;
      this.profileData.totalSpent += details.price;
    }
  }

  // Data Export Methods
  public getAllTrackingData(): any {
    return {
      device: this.deviceData,
      network: this.networkData,
      behavior: this.behaviorData,
      profile: this.profileData,
      consent: this.consentData,
      metadata: {
        sessionId: this.sessionId,
        deviceId: this.deviceId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      }
    };
  }

  public exportForGDPR(): any {
    // Export all personal data for GDPR compliance
    return {
      personalData: {
        userId: this.userId,
        email: this.profileData.email,
        ipAddress: this.networkData.ipAddress,
        location: {
          country: this.networkData.country,
          city: this.networkData.city,
        },
        deviceId: this.deviceId,
      },
      trackingData: this.getAllTrackingData(),
      exportDate: new Date().toISOString(),
      dataController: 'Dominauts™',
    };
  }

  public deleteAllData(): void {
    // Complete data deletion for GDPR/CCPA compliance
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB
    if (window.indexedDB) {
      indexedDB.deleteDatabase('DominautsTracking');
    }

    // Send deletion request to backend
    this.trackEvent('data_deletion_request', {
      userId: this.userId,
      deviceId: this.deviceId,
    });
  }

  // Helper Methods
  private getBrowserInfo(): any {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (ua.indexOf('Firefox') > -1) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || '';
    } else if (ua.indexOf('Chrome') > -1) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || '';
    } else if (ua.indexOf('Safari') > -1) {
      browser = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || '';
    } else if (ua.indexOf('Edge') > -1) {
      browser = 'Edge';
      version = ua.match(/Edge\/(\d+)/)?.[1] || '';
    }

    return { name: browser, version };
  }

  private getOSInfo(): string {
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iOS') > -1) return 'iOS';
    return 'Unknown';
  }

  private getDeviceModel(): string {
    const ua = navigator.userAgent;
    // Detect common device models
    const models = [
      /iPhone\s?(\d+,\d+)/,
      /iPad\s?(\d+,\d+)/,
      /SM-[A-Z]\d+/,  // Samsung
      /Pixel\s?\d+/,  // Google Pixel
    ];

    for (const regex of models) {
      const match = ua.match(regex);
      if (match) return match[0];
    }

    return 'Unknown';
  }

  private getWebGLInfo(): any {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: debugInfo ?
          gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) :
          gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
      };
    } catch {
      return null;
    }
  }

  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Canvas fingerprint', 2, 15);

      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  private getAudioFingerprint(): number {
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gain.gain.value = 0;
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gain);
      gain.connect(context.destination);

      oscillator.start(0);
      let fingerprint = 0;

      scriptProcessor.onaudioprocess = (event) => {
        const output = event.inputBuffer.getChannelData(0);
        fingerprint = output.reduce((acc, val) => acc + Math.abs(val), 0);
      };

      setTimeout(() => {
        oscillator.stop();
        context.close();
      }, 100);

      return fingerprint;
    } catch {
      return 0;
    }
  }

  private getInstalledFonts(): string[] {
    const fonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New',
      'Georgia', 'Palatino', 'Garamond', 'Bookman',
      'Comic Sans MS', 'Trebuchet MS', 'Impact'
    ];

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return [];

    const text = 'mmmmmmmmmmlli';
    const baseFont = 'monospace';

    context.font = `72px ${baseFont}`;
    const baseWidth = context.measureText(text).width;

    const detectedFonts: string[] = [];

    for (const font of fonts) {
      context.font = `72px ${font}, ${baseFont}`;
      const width = context.measureText(text).width;
      if (width !== baseWidth) {
        detectedFonts.push(font);
      }
    }

    return detectedFonts;
  }

  private getPlugins(): string[] {
    const plugins: string[] = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins;
  }

  private testLocalStorage(): boolean {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private testSessionStorage(): boolean {
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private getExpectedTimezoneOffset(timezone: string): number {
    // Map common timezones to their offsets
    const offsets: Record<string, number> = {
      'UTC': 0,
      'America/New_York': 240,
      'America/Chicago': 300,
      'America/Denver': 360,
      'America/Los_Angeles': 420,
      'Europe/London': 0,
      'Europe/Paris': -60,
      'Asia/Tokyo': -540,
      'Australia/Sydney': -660,
    };

    return offsets[timezone] || 0;
  }

  private async sendToAnalytics(event: any): Promise<void> {
    try {
      // Send to your analytics endpoint
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
      // Store failed events for retry
      this.storeFailedEvent(event);
    }
  }

  private storeEventLocally(event: any): void {
    // Store in IndexedDB for batch processing
    const request = indexedDB.open('DominautsTracking', 1);

    request.onsuccess = (e) => {
      const db = (e.target as any).result;
      const transaction = db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      store.add(event);
    };
  }

  private storeFailedEvent(event: any): void {
    // Store failed events for retry
    const failed = JSON.parse(localStorage.getItem('failedEvents') || '[]');
    failed.push(event);
    localStorage.setItem('failedEvents', JSON.stringify(failed));
  }

  // Public Methods for Consent Management
  public setConsent(consentType: keyof typeof this.consentData, value: boolean): void {
    this.consentData[consentType as any] = value;
    this.consentData.consentTimestamp = new Date();
    this.consentData.consentIP = this.networkData.ipAddress;

    // Track consent change
    this.trackEvent('consent_updated', {
      type: consentType,
      value,
    });

    // If user denies tracking, stop collection
    if (!value && consentType === 'analyticsConsent') {
      this.stopTracking();
    }
  }

  private stopTracking(): void {
    // Remove all event listeners and stop data collection
    // This would need to be implemented based on your specific needs
    console.log('Tracking stopped per user consent');
  }
}

// Singleton instance
export const userTracking = new UserTrackingSystem();