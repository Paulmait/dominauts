/**
 * Device Compatibility & Feature Detection
 * Ensures game works across all browsers and devices
 */

export class DeviceCompatibility {
  private features: Map<string, boolean> = new Map();
  private deviceInfo: DeviceInfo;

  constructor() {
    this.deviceInfo = this.detectDevice();
    this.detectFeatures();
    this.applyPolyfills();
    this.setupTouchHandlers();
  }

  /**
   * Comprehensive browser compatibility check
   */
  public checkCompatibility(): CompatibilityReport {
    const report: CompatibilityReport = {
      supported: true,
      warnings: [],
      criticalIssues: [],
      features: {}
    };

    // Check critical features
    const critical = ['canvas', 'localStorage', 'audio'];
    critical.forEach(feature => {
      if (!this.features.get(feature)) {
        report.criticalIssues.push(`Missing ${feature} support`);
        report.supported = false;
      }
    });

    // Check enhanced features
    const enhanced = [
      'touchEvents',
      'vibration',
      'fullscreen',
      'webGL',
      'serviceWorker',
      'notifications',
      'geolocation',
      'deviceOrientation',
      'pointerEvents',
      'intersectionObserver'
    ];

    enhanced.forEach(feature => {
      const supported = this.features.get(feature);
      report.features[feature] = supported || false;
      if (!supported) {
        report.warnings.push(`${feature} not available`);
      }
    });

    return report;
  }

  /**
   * Device detection and categorization
   */
  private detectDevice(): DeviceInfo {
    const ua = navigator.userAgent;
    const platform = navigator.platform;

    return {
      // Device type
      isMobile: /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua),
      isTablet: /iPad|Android(?!.*Mobile)|Tablet/i.test(ua),
      isDesktop: !(/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)),

      // OS detection
      isIOS: /iPhone|iPad|iPod/i.test(ua),
      isAndroid: /Android/i.test(ua),
      isWindows: /Windows/i.test(platform),
      isMac: /Mac/i.test(platform),

      // Browser detection
      browser: this.detectBrowser(),

      // Screen info
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,

      // Touch capability
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,

      // Performance
      hardwareConcurrency: navigator.hardwareConcurrency || 2,
      deviceMemory: (navigator as any).deviceMemory || 4,
      connection: (navigator as any).connection || null
    };
  }

  /**
   * Browser detection with version
   */
  private detectBrowser(): BrowserInfo {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = '0';

    if (ua.includes('Firefox/')) {
      name = 'Firefox';
      version = ua.split('Firefox/')[1].split(' ')[0];
    } else if (ua.includes('Edg/')) {
      name = 'Edge';
      version = ua.split('Edg/')[1].split(' ')[0];
    } else if (ua.includes('Chrome/')) {
      name = 'Chrome';
      version = ua.split('Chrome/')[1].split(' ')[0];
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      name = 'Safari';
      version = ua.split('Version/')[1]?.split(' ')[0] || '0';
    } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
      name = 'Opera';
      version = ua.split(/Opera\/|OPR\//)[1].split(' ')[0];
    }

    return {
      name,
      version,
      isModern: this.checkModernBrowser(name, version)
    };
  }

  /**
   * Check if browser is modern enough
   */
  private checkModernBrowser(name: string, version: string): boolean {
    const minVersions = {
      Chrome: 90,
      Firefox: 88,
      Safari: 14,
      Edge: 90,
      Opera: 76
    };

    const majorVersion = parseInt(version.split('.')[0]);
    return majorVersion >= (minVersions[name] || 0);
  }

  /**
   * Feature detection
   */
  private detectFeatures(): void {
    // Core features
    this.features.set('canvas', !!document.createElement('canvas').getContext);
    this.features.set('webGL', this.checkWebGL());
    this.features.set('audio', !!window.AudioContext || !!(window as any).webkitAudioContext);
    this.features.set('localStorage', this.checkLocalStorage());
    this.features.set('sessionStorage', this.checkSessionStorage());

    // Touch & Input
    this.features.set('touchEvents', 'ontouchstart' in window);
    this.features.set('pointerEvents', 'PointerEvent' in window);
    this.features.set('mouseEvents', 'onmousedown' in window);

    // Device features
    this.features.set('vibration', 'vibrate' in navigator);
    this.features.set('geolocation', 'geolocation' in navigator);
    this.features.set('deviceOrientation', 'DeviceOrientationEvent' in window);
    this.features.set('deviceMotion', 'DeviceMotionEvent' in window);

    // Enhanced features
    this.features.set('fullscreen', this.checkFullscreen());
    this.features.set('notifications', 'Notification' in window);
    this.features.set('serviceWorker', 'serviceWorker' in navigator);
    this.features.set('webWorker', 'Worker' in window);

    // Modern APIs
    this.features.set('intersectionObserver', 'IntersectionObserver' in window);
    this.features.set('mutationObserver', 'MutationObserver' in window);
    this.features.set('resizeObserver', 'ResizeObserver' in window);

    // Network
    this.features.set('onLine', 'onLine' in navigator);
    this.features.set('connection', 'connection' in navigator);
  }

  /**
   * Check WebGL support
   */
  private checkWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  /**
   * Check localStorage support
   */
  private checkLocalStorage(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check sessionStorage support
   */
  private checkSessionStorage(): boolean {
    try {
      const test = '__sessionStorage_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check fullscreen support
   */
  private checkFullscreen(): boolean {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }

  /**
   * Apply necessary polyfills
   */
  private applyPolyfills(): void {
    // RequestAnimationFrame polyfill
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (callback) => {
        return window.setTimeout(callback, 1000 / 60);
      };
    }

    // Performance.now polyfill
    if (!performance.now) {
      performance.now = () => Date.now();
    }

    // CustomEvent polyfill for IE
    if (typeof window.CustomEvent !== 'function') {
      (window as any).CustomEvent = function(event: string, params: any) {
        params = params || { bubbles: false, cancelable: false, detail: null };
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
      };
    }
  }

  /**
   * Setup touch event handlers with proper support
   */
  private setupTouchHandlers(): void {
    // Prevent default touch behaviors that interfere with game
    document.addEventListener('touchmove', (e) => {
      if (e.target instanceof HTMLElement && e.target.classList.contains('game-board')) {
        e.preventDefault();
      }
    }, { passive: false });

    // Add touch-action CSS for better performance
    const style = document.createElement('style');
    style.textContent = `
      .game-board {
        touch-action: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }

      .domino-tile {
        touch-action: manipulation;
      }

      /* iOS specific fixes */
      @supports (-webkit-touch-callout: none) {
        .game-container {
          -webkit-tap-highlight-color: transparent;
          -webkit-overflow-scrolling: touch;
        }
      }

      /* Prevent zoom on double tap */
      * {
        touch-action: manipulation;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Request haptic feedback
   */
  public triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error'): void {
    // Standard Vibration API
    if (this.features.get('vibration')) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 20, 10],
        error: [50, 100, 50]
      };

      navigator.vibrate(patterns[type] || patterns.light);
    }

    // iOS Haptic Engine (through webkit)
    if (this.deviceInfo.isIOS && window.webkit?.messageHandlers?.haptic) {
      window.webkit.messageHandlers.haptic.postMessage(type);
    }

    // Android Chrome Haptic
    if (this.deviceInfo.isAndroid && 'HapticFeedback' in window) {
      (window as any).HapticFeedback.perform(type);
    }
  }

  /**
   * Get device-specific optimizations
   */
  public getOptimizations(): DeviceOptimizations {
    const opts: DeviceOptimizations = {
      useWebGL: false,
      maxParticles: 100,
      enableShadows: true,
      enableBlur: true,
      enableAnimations: true,
      textureQuality: 'high',
      soundQuality: 'high',
      enableHaptics: false
    };

    // Mobile optimizations
    if (this.deviceInfo.isMobile) {
      opts.maxParticles = 50;
      opts.enableShadows = false;
      opts.enableBlur = false;
      opts.textureQuality = 'medium';
      opts.enableHaptics = this.features.get('vibration') || false;
    }

    // Low-end device detection
    if (this.deviceInfo.deviceMemory < 4 || this.deviceInfo.hardwareConcurrency < 4) {
      opts.maxParticles = 25;
      opts.enableAnimations = false;
      opts.textureQuality = 'low';
      opts.soundQuality = 'low';
    }

    // High-end features
    if (this.features.get('webGL') && this.deviceInfo.pixelRatio >= 2) {
      opts.useWebGL = true;
    }

    // Battery saving mode
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then(battery => {
        if (battery.level < 0.2) {
          opts.enableAnimations = false;
          opts.maxParticles = 0;
        }
      });
    }

    return opts;
  }

  /**
   * Check if PWA is installed
   */
  public isPWAInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  }
}

// Type definitions
interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMac: boolean;
  browser: BrowserInfo;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  hasTouch: boolean;
  maxTouchPoints: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  connection: any;
}

interface BrowserInfo {
  name: string;
  version: string;
  isModern: boolean;
}

interface CompatibilityReport {
  supported: boolean;
  warnings: string[];
  criticalIssues: string[];
  features: Record<string, boolean>;
}

interface DeviceOptimizations {
  useWebGL: boolean;
  maxParticles: number;
  enableShadows: boolean;
  enableBlur: boolean;
  enableAnimations: boolean;
  textureQuality: 'low' | 'medium' | 'high';
  soundQuality: 'low' | 'medium' | 'high';
  enableHaptics: boolean;
}

// Extend Window interface for vendor-specific APIs
declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        haptic?: {
          postMessage: (message: string) => void;
        };
      };
    };
  }
}

export const deviceCompatibility = new DeviceCompatibility();