/**
 * UserEngagementService - Enhanced user engagement features
 * Includes haptic feedback, sound effects, animations, and gamification
 */

export class UserEngagementService {
  private static instance: UserEngagementService;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private vibrationEnabled: boolean = true;
  private soundEnabled: boolean = true;
  private particlesEnabled: boolean = true;
  private achievementQueue: Array<any> = [];
  private comboCount: number = 0;
  private lastActionTime: number = 0;

  private constructor() {
    this.initAudioContext();
    this.loadSettings();
    this.initEngagementFeatures();
  }

  static getInstance(): UserEngagementService {
    if (!UserEngagementService.instance) {
      UserEngagementService.instance = new UserEngagementService();
    }
    return UserEngagementService.instance;
  }

  private initAudioContext(): void {
    try {
      // @ts-ignore - AudioContext compatibility
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.createSoundEffects();
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  }

  private createSoundEffects(): void {
    if (!this.audioContext) return;

    // Create simple sound effects using Web Audio API
    const sounds = {
      'tile-place': this.createTileSound(440, 0.1),
      'tile-pickup': this.createTileSound(550, 0.08),
      'win': this.createWinSound(),
      'lose': this.createLoseSound(),
      'combo': this.createComboSound(),
      'achievement': this.createAchievementSound(),
      'button-click': this.createClickSound(),
      'error': this.createErrorSound(),
      'notification': this.createNotificationSound()
    };

    // Store sounds for later use
    Object.entries(sounds).forEach(([key, buffer]) => {
      if (buffer) this.sounds.set(key, buffer);
    });
  }

  private createTileSound(frequency: number, duration: number): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * frequency * t) *
                Math.exp(-3 * t) * // Decay
                (1 - t / duration); // Fade out
    }

    return buffer;
  }

  private createWinSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a pleasant ascending chord
    const frequencies = [523.25, 659.25, 783.99]; // C, E, G

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      frequencies.forEach((freq, index) => {
        const delay = index * 0.1;
        if (t >= delay) {
          sample += Math.sin(2 * Math.PI * freq * (t - delay)) *
                   Math.exp(-2 * (t - delay)) * 0.3;
        }
      });

      data[i] = sample;
    }

    return buffer;
  }

  private createLoseSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Descending tone
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 440 * Math.pow(0.5, t * 2); // Descending frequency
      data[i] = Math.sin(2 * Math.PI * frequency * t) *
                Math.exp(-3 * t) * 0.3;
    }

    return buffer;
  }

  private createComboSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Quick ascending arpeggio
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 440 * Math.pow(2, t * 4);
      data[i] = Math.sin(2 * Math.PI * frequency * t) *
                Math.exp(-5 * t) * 0.2;
    }

    return buffer;
  }

  private createAchievementSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.8;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Triumphant fanfare
    const notes = [
      { freq: 523.25, start: 0, duration: 0.2 },    // C
      { freq: 659.25, start: 0.1, duration: 0.2 },  // E
      { freq: 783.99, start: 0.2, duration: 0.2 },  // G
      { freq: 1046.5, start: 0.3, duration: 0.3 }   // High C
    ];

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      notes.forEach(note => {
        if (t >= note.start && t < note.start + note.duration) {
          const noteTime = t - note.start;
          sample += Math.sin(2 * Math.PI * note.freq * noteTime) *
                   Math.exp(-2 * noteTime) * 0.25;
        }
      });

      data[i] = sample;
    }

    return buffer;
  }

  private createClickSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.05;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Short click
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-50 * t) * 0.2;
    }

    return buffer;
  }

  private createErrorSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Buzzer sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.sin(2 * Math.PI * 200 * t) +
                 Math.sin(2 * Math.PI * 250 * t) * 0.5) *
                Math.exp(-5 * t) * 0.2;
    }

    return buffer;
  }

  private createNotificationSound(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Pleasant notification chime
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = (Math.sin(2 * Math.PI * 880 * t) +
                 Math.sin(2 * Math.PI * 1320 * t) * 0.5) *
                Math.exp(-4 * t) * 0.15;
    }

    return buffer;
  }

  private loadSettings(): void {
    this.vibrationEnabled = localStorage.getItem('vibrationEnabled') !== 'false';
    this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    this.particlesEnabled = localStorage.getItem('particlesEnabled') !== 'false';
  }

  private initEngagementFeatures(): void {
    // Initialize streak tracking
    this.trackDailyStreak();

    // Initialize idle detection
    this.setupIdleDetection();

    // Initialize performance monitoring
    this.monitorPerformance();
  }

  // Public methods for game events
  playSound(soundName: string, volume: number = 0.5): void {
    if (!this.soundEnabled || !this.audioContext) return;

    const buffer = this.sounds.get(soundName);
    if (!buffer) return;

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start(0);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }

  triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
    if (!this.vibrationEnabled || !('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
      success: [10, 20, 10, 20, 50],
      error: [50, 20, 50]
    };

    try {
      navigator.vibrate(patterns[type] || patterns.light);
    } catch (error) {
      console.warn('Vibration not supported:', error);
    }
  }

  // Combo system
  registerAction(points: number): void {
    const now = Date.now();
    const timeSinceLastAction = now - this.lastActionTime;

    // If action is within 5 seconds, increase combo
    if (timeSinceLastAction < 5000 && this.lastActionTime > 0) {
      this.comboCount++;

      if (this.comboCount >= 3) {
        this.playSound('combo');
        this.triggerHapticFeedback('success');
        this.showComboNotification(this.comboCount);
      }
    } else {
      this.comboCount = 1;
    }

    this.lastActionTime = now;
  }

  private showComboNotification(combo: number): void {
    const messages = [
      '', '', '',
      'Nice Combo! 3x',
      'Great Combo! 4x',
      'Amazing Combo! 5x',
      'Incredible! 6x',
      'Unstoppable! 7x',
      'Legendary! 8x',
      'GODLIKE! 9x',
      'PERFECT! 10x+'
    ];

    const message = messages[Math.min(combo, 10)] || `INSANE! ${combo}x`;
    this.showToast(message, 'combo');
  }

  // Achievement system integration
  unlockAchievement(achievementId: string, data: any): void {
    this.achievementQueue.push({ id: achievementId, data, timestamp: Date.now() });
    this.processAchievementQueue();
  }

  private processAchievementQueue(): void {
    if (this.achievementQueue.length === 0) return;

    const achievement = this.achievementQueue.shift();
    if (!achievement) return;

    // Play achievement sound and haptic
    this.playSound('achievement');
    this.triggerHapticFeedback('success');

    // Show achievement notification
    this.showAchievementBanner(achievement);

    // Process next achievement after delay
    setTimeout(() => this.processAchievementQueue(), 3000);
  }

  private showAchievementBanner(achievement: any): void {
    // This would integrate with your achievement toast system
    console.log('Achievement Unlocked:', achievement);
  }

  // Daily streak tracking
  private trackDailyStreak(): void {
    const today = new Date().toDateString();
    const lastPlayDate = localStorage.getItem('lastPlayDate');
    let streak = parseInt(localStorage.getItem('dailyStreak') || '0');

    if (lastPlayDate) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (lastPlayDate === yesterday) {
        // Continue streak
        streak++;
        this.showToast(`Daily Streak: ${streak} days! 🔥`, 'streak');
      } else if (lastPlayDate !== today) {
        // Streak broken
        if (streak > 0) {
          this.showToast('Streak broken! Start a new one today.', 'info');
        }
        streak = 1;
      }
    } else {
      streak = 1;
      this.showToast('Welcome! Start your daily streak!', 'welcome');
    }

    localStorage.setItem('lastPlayDate', today);
    localStorage.setItem('dailyStreak', streak.toString());

    // Award streak achievements
    if (streak === 7) this.unlockAchievement('week_streak', { streak });
    if (streak === 30) this.unlockAchievement('month_streak', { streak });
    if (streak === 100) this.unlockAchievement('century_streak', { streak });
  }

  // Idle detection
  private setupIdleDetection(): void {
    let idleTimer: NodeJS.Timeout;
    const idleTimeout = 60000; // 1 minute

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        this.showToast('Still there? Your turn is waiting!', 'reminder');
        this.playSound('notification');
      }, idleTimeout);
    };

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    resetIdleTimer();
  }

  // Performance monitoring
  private monitorPerformance(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Log slow interactions
          if (entry.duration > 100) {
            console.warn('Slow interaction detected:', entry.name, entry.duration);
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  // Toast notification system
  private showToast(message: string, type: string = 'info'): void {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Tutorial system
  showTutorial(step: number = 0): void {
    const tutorials = [
      {
        title: 'Welcome to Dominauts!',
        content: 'Match dominoes by their pip count. Place tiles with matching ends!',
        position: 'center'
      },
      {
        title: 'Scoring',
        content: 'Score points by making the sum of open ends a multiple of 5!',
        position: 'top'
      },
      {
        title: 'Special Moves',
        content: 'Play doubles perpendicular for bonus points!',
        position: 'center'
      }
    ];

    if (step < tutorials.length) {
      this.showTutorialStep(tutorials[step]);

      setTimeout(() => {
        this.showTutorial(step + 1);
      }, 5000);
    }
  }

  private showTutorialStep(tutorial: any): void {
    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    overlay.innerHTML = `
      <div class="tutorial-content">
        <h3>${tutorial.title}</h3>
        <p>${tutorial.content}</p>
        <button onclick="this.parentElement.parentElement.remove()">Got it!</button>
      </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
  }

  // Settings management
  toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('soundEnabled', this.soundEnabled.toString());
    return this.soundEnabled;
  }

  toggleVibration(): boolean {
    this.vibrationEnabled = !this.vibrationEnabled;
    localStorage.setItem('vibrationEnabled', this.vibrationEnabled.toString());
    return this.vibrationEnabled;
  }

  toggleParticles(): boolean {
    this.particlesEnabled = !this.particlesEnabled;
    localStorage.setItem('particlesEnabled', this.particlesEnabled.toString());
    return this.particlesEnabled;
  }

  // Game state celebrations
  celebrateWin(): void {
    this.playSound('win');
    this.triggerHapticFeedback('success');
    this.showConfetti();
  }

  celebrateLoss(): void {
    this.playSound('lose');
    this.triggerHapticFeedback('error');
  }

  private showConfetti(): void {
    if (!this.particlesEnabled) return;

    // This would trigger your particle effects
    const event = new CustomEvent('showParticles', {
      detail: { type: 'celebration' }
    });
    window.dispatchEvent(event);
  }

  // Analytics tracking
  trackEvent(category: string, action: string, label?: string, value?: number): void {
    // Integrate with your analytics service
    const event = {
      category,
      action,
      label,
      value,
      timestamp: Date.now()
    };

    // Store locally for now
    const events = JSON.parse(localStorage.getItem('gameEvents') || '[]');
    events.push(event);

    // Keep only last 100 events
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }

    localStorage.setItem('gameEvents', JSON.stringify(events));
  }

  // Get engagement stats
  getEngagementStats(): any {
    return {
      dailyStreak: parseInt(localStorage.getItem('dailyStreak') || '0'),
      totalGames: parseInt(localStorage.getItem('totalGames') || '0'),
      winRate: parseFloat(localStorage.getItem('winRate') || '0'),
      averageScore: parseFloat(localStorage.getItem('averageScore') || '0'),
      achievements: JSON.parse(localStorage.getItem('unlockedAchievements') || '[]'),
      lastCombo: this.comboCount
    };
  }
}

// Export singleton instance
export const userEngagement = UserEngagementService.getInstance();