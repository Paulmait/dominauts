/**
 * Web Ads Service
 * Google AdSense and custom ad integration for web monetization
 */

import { analytics } from './GoogleAnalytics';
import { coinEconomy } from './CoinEconomyService';

declare global {
  interface Window {
    adsbygoogle: any[];
    googletag: any;
  }
}

export interface AdConfig {
  type: 'banner' | 'interstitial' | 'rewarded' | 'native';
  position: 'top' | 'bottom' | 'sidebar' | 'inline' | 'modal';
  size: string;
  adUnitId: string;
}

export class WebAdsService {
  private static instance: WebAdsService;
  private isInitialized: boolean = false;
  private adBlockDetected: boolean = false;
  private userHasPremium: boolean = false;
  private rewardedAdReady: boolean = false;
  private interstitialCooldown: number = 0;

  // Ad configuration
  private readonly AD_UNITS = {
    BANNER_TOP: process.env.VITE_AD_BANNER_TOP || 'ca-pub-xxx/xxx',
    BANNER_BOTTOM: process.env.VITE_AD_BANNER_BOTTOM || 'ca-pub-xxx/xxx',
    INTERSTITIAL: process.env.VITE_AD_INTERSTITIAL || 'ca-pub-xxx/xxx',
    REWARDED: process.env.VITE_AD_REWARDED || 'ca-pub-xxx/xxx',
    NATIVE: process.env.VITE_AD_NATIVE || 'ca-pub-xxx/xxx'
  };

  private constructor() {}

  static getInstance(): WebAdsService {
    if (!WebAdsService.instance) {
      WebAdsService.instance = new WebAdsService();
    }
    return WebAdsService.instance;
  }

  /**
   * Initialize ad service
   */
  async initialize(userPremiumStatus: boolean = false): Promise<void> {
    this.userHasPremium = userPremiumStatus;

    // Don't initialize if user has premium
    if (this.userHasPremium) {
      console.log('Ads disabled for premium user');
      return;
    }

    if (this.isInitialized) return;

    try {
      // Check for ad blocker
      await this.detectAdBlock();

      if (this.adBlockDetected) {
        this.showAdBlockMessage();
        return;
      }

      // Load Google AdSense
      this.loadAdSenseScript();

      // Initialize ad slots
      await this.initializeAdSlots();

      this.isInitialized = true;
      console.log('✅ Web ads service initialized');

    } catch (error) {
      console.error('Failed to initialize ads:', error);
    }
  }

  /**
   * Load AdSense script
   */
  private loadAdSenseScript(): void {
    if (document.getElementById('google-adsense-script')) return;

    const script = document.createElement('script');
    script.id = 'google-adsense-script';
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.setAttribute('data-ad-client', process.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-xxx');
    document.head.appendChild(script);

    // Initialize adsbygoogle array
    window.adsbygoogle = window.adsbygoogle || [];
  }

  /**
   * Detect ad blocker
   */
  private async detectAdBlock(): Promise<void> {
    try {
      const testAd = document.createElement('div');
      testAd.innerHTML = '&nbsp;';
      testAd.className = 'adsbox';
      testAd.style.position = 'absolute';
      testAd.style.left = '-9999px';
      document.body.appendChild(testAd);

      await new Promise(resolve => setTimeout(resolve, 100));

      if (testAd.offsetHeight === 0) {
        this.adBlockDetected = true;
      }

      document.body.removeChild(testAd);

    } catch (error) {
      this.adBlockDetected = false;
    }
  }

  /**
   * Show ad block detection message
   */
  private showAdBlockMessage(): void {
    const message = document.createElement('div');
    message.id = 'adblock-message';
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        text-align: center;
      ">
        <h3 style="margin: 0 0 10px 0;">Ad Blocker Detected</h3>
        <p style="margin: 0 0 15px 0;">
          Please consider disabling your ad blocker or purchasing premium to support the game!
        </p>
        <button onclick="this.parentElement.remove()" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        ">OK</button>
      </div>
    `;
    document.body.appendChild(message);

    analytics.trackEvent('adblock_detected');
  }

  /**
   * Initialize ad slots
   */
  private async initializeAdSlots(): Promise<void> {
    // Create banner ad containers if they don't exist
    if (!document.getElementById('top-banner-ad')) {
      this.createBannerAd('top');
    }

    if (!document.getElementById('bottom-banner-ad')) {
      this.createBannerAd('bottom');
    }
  }

  /**
   * Create banner ad
   */
  createBannerAd(position: 'top' | 'bottom'): void {
    if (this.userHasPremium || this.adBlockDetected) return;

    const containerId = `${position}-banner-ad`;
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.cssText = `
        position: fixed;
        ${position}: 0;
        left: 0;
        right: 0;
        background: rgba(0,0,0,0.1);
        padding: 10px;
        text-align: center;
        z-index: 1000;
      `;

      document.body.appendChild(container);
    }

    // Create ad element
    const ad = document.createElement('ins');
    ad.className = 'adsbygoogle';
    ad.style.cssText = 'display:block;width:100%;height:90px;';
    ad.setAttribute('data-ad-client', process.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-xxx');
    ad.setAttribute('data-ad-slot', this.AD_UNITS[`BANNER_${position.toUpperCase()}`]);
    ad.setAttribute('data-ad-format', 'horizontal');
    ad.setAttribute('data-full-width-responsive', 'true');

    container.innerHTML = '';
    container.appendChild(ad);

    // Push ad
    try {
      (window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('Failed to push ad:', e);
    }

    analytics.trackEvent('ad_shown', {
      type: 'banner',
      position
    });
  }

  /**
   * Show interstitial ad
   */
  async showInterstitialAd(): Promise<boolean> {
    if (this.userHasPremium || this.adBlockDetected) return false;

    // Check cooldown (1 ad per 3 minutes)
    const now = Date.now();
    if (now - this.interstitialCooldown < 180000) {
      console.log('Interstitial on cooldown');
      return false;
    }

    try {
      // Create modal overlay
      const modal = document.createElement('div');
      modal.id = 'interstitial-ad-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const adContainer = document.createElement('div');
      adContainer.style.cssText = `
        position: relative;
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 500px;
        width: 90%;
      `;

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close Ad';
      closeBtn.style.cssText = `
        position: absolute;
        top: -10px;
        right: -10px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        font-weight: bold;
      `;
      closeBtn.onclick = () => {
        modal.remove();
        analytics.trackEvent('ad_closed', { type: 'interstitial' });
      };

      // Ad content
      const ad = document.createElement('ins');
      ad.className = 'adsbygoogle';
      ad.style.cssText = 'display:block;width:100%;height:400px;';
      ad.setAttribute('data-ad-client', process.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-xxx');
      ad.setAttribute('data-ad-slot', this.AD_UNITS.INTERSTITIAL);

      adContainer.appendChild(closeBtn);
      adContainer.appendChild(ad);
      modal.appendChild(adContainer);
      document.body.appendChild(modal);

      // Push ad
      (window.adsbygoogle || []).push({});

      this.interstitialCooldown = now;

      analytics.trackEvent('ad_shown', { type: 'interstitial' });

      // Auto close after 15 seconds
      setTimeout(() => {
        if (document.getElementById('interstitial-ad-modal')) {
          modal.remove();
        }
      }, 15000);

      return true;

    } catch (error) {
      console.error('Failed to show interstitial:', error);
      return false;
    }
  }

  /**
   * Show rewarded ad
   */
  async showRewardedAd(): Promise<{ watched: boolean; reward: number }> {
    if (this.userHasPremium) {
      // Premium users get reward without watching ad
      const reward = 10;
      await coinEconomy.addCoins(reward, 'bonus', 'premium_reward', 'Premium user reward');
      return { watched: true, reward };
    }

    if (this.adBlockDetected) {
      this.showAdBlockMessage();
      return { watched: false, reward: 0 };
    }

    return new Promise((resolve) => {
      // Create rewarded ad modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        max-width: 400px;
      `;

      content.innerHTML = `
        <h2 style="color: #333; margin: 0 0 20px 0;">Watch Ad for Coins!</h2>
        <p style="color: #666; margin: 0 0 20px 0;">
          Watch a short video to earn 5 coins
        </p>
        <div id="rewarded-ad-container" style="min-height: 250px; margin: 20px 0;">
          <!-- Ad will load here -->
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="watch-ad-btn" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
          ">Watch Ad</button>
          <button id="skip-ad-btn" style="
            background: #666;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          ">Skip</button>
        </div>
      `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      // Load ad
      const adContainer = document.getElementById('rewarded-ad-container');
      if (adContainer) {
        const ad = document.createElement('ins');
        ad.className = 'adsbygoogle';
        ad.style.cssText = 'display:block;width:100%;height:250px;';
        ad.setAttribute('data-ad-client', process.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-xxx');
        ad.setAttribute('data-ad-slot', this.AD_UNITS.REWARDED);
        adContainer.appendChild(ad);

        try {
          (window.adsbygoogle || []).push({});
        } catch (e) {
          console.error('Failed to load rewarded ad:', e);
        }
      }

      // Handle buttons
      document.getElementById('watch-ad-btn')?.addEventListener('click', async () => {
        // Simulate watching ad (in production, this would be actual video completion)
        const watchBtn = document.getElementById('watch-ad-btn') as HTMLButtonElement;
        watchBtn.disabled = true;
        watchBtn.textContent = 'Watching...';

        // Simulate ad duration
        await new Promise(r => setTimeout(r, 5000));

        // Grant reward
        const reward = 5;
        await coinEconomy.rewardForAd('rewarded');

        analytics.trackEvent('rewarded_ad_completed');

        modal.remove();
        resolve({ watched: true, reward });
      });

      document.getElementById('skip-ad-btn')?.addEventListener('click', () => {
        analytics.trackEvent('rewarded_ad_skipped');
        modal.remove();
        resolve({ watched: false, reward: 0 });
      });
    });
  }

  /**
   * Remove all ads (for premium users)
   */
  removeAllAds(): void {
    this.userHasPremium = true;

    // Remove all ad containers
    const adElements = [
      'top-banner-ad',
      'bottom-banner-ad',
      'interstitial-ad-modal',
      'adblock-message'
    ];

    adElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });

    console.log('All ads removed for premium user');
  }

  /**
   * Check if ads are enabled
   */
  areAdsEnabled(): boolean {
    return this.isInitialized && !this.userHasPremium && !this.adBlockDetected;
  }

  /**
   * Track ad revenue
   */
  trackAdRevenue(adType: string, estimatedRevenue: number = 0.01): void {
    analytics.trackAdRevenue(adType, estimatedRevenue);
  }
}

// Export singleton instance
export const webAds = WebAdsService.getInstance();