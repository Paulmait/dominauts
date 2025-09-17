/**
 * Dominauts™ - Addictive UI System
 * Psychological mechanics to maximize engagement and retention
 */

import { EventEmitter } from '../utils/EventEmitter';

export class AddictiveUISystem extends EventEmitter {
  private streakCounter: number = 0;
  private dailyLoginStreak: number = 0;
  private lastLoginDate: string;
  private dopamineTimer: NodeJS.Timeout | null = null;

  // Psychological triggers
  private readonly REWARDS = {
    INSTANT_GRATIFICATION: {
      winAnimation: 'confetti-explosion',
      sound: 'victory-fanfare',
      coins: [10, 25, 50, 100],
      duration: 3000
    },
    NEAR_MISS: {
      message: 'So close! One more try!',
      bonusMultiplier: 1.5,
      retryBonus: true
    },
    STREAK_REWARDS: {
      3: { coins: 50, badge: 'On Fire!' },
      5: { coins: 100, badge: 'Unstoppable!' },
      7: { coins: 200, badge: 'Legendary!', specialEffect: true },
      10: { coins: 500, badge: 'Domino Master!', unlock: 'golden-tiles' }
    },
    DAILY_REWARDS: [
      { day: 1, coins: 50, gems: 0 },
      { day: 2, coins: 75, gems: 1 },
      { day: 3, coins: 100, gems: 2 },
      { day: 4, coins: 150, gems: 3 },
      { day: 5, coins: 200, gems: 5 },
      { day: 6, coins: 300, gems: 7 },
      { day: 7, coins: 500, gems: 10, bonus: 'mystery-box' }
    ]
  };

  // Color psychology for engagement
  private readonly COLORS = {
    SUCCESS: '#00FF00', // Green - positive reinforcement
    GOLD: '#FFD700', // Gold - premium feeling
    URGENT: '#FF4444', // Red - creates urgency
    RARE: '#9B59B6', // Purple - rarity and value
    ENERGY: '#00D4FF', // Cyan - energy and excitement
  };

  // Addiction mechanics
  private readonly MECHANICS = {
    VARIABLE_RATIO_REWARDS: true, // Random rewards (most addictive)
    LOSS_AVERSION: true, // Fear of losing progress
    SOCIAL_PROOF: true, // Show others playing
    FOMO: true, // Fear of missing out
    SUNK_COST: true, // Investment protection
    ENDOWED_PROGRESS: true, // Start with progress
    ARTIFICIAL_SCARCITY: true, // Limited time offers
    ANTICIPATION: true, // Coming soon features
  };

  constructor() {
    super();
    this.initializeAddictiveMechanics();
  }

  /**
   * Initialize all psychological hooks
   */
  private initializeAddictiveMechanics(): void {
    this.setupDailyRewards();
    this.setupStreakSystem();
    this.setupNotifications();
    this.setupVariableRewards();
    this.setupSocialProof();
    this.setupProgressBars();
    this.setupSoundEffects();
    this.startDopamineCycle();
  }

  /**
   * Daily login rewards (builds habit)
   */
  private setupDailyRewards(): void {
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem('lastLogin');

    if (lastLogin !== today) {
      this.dailyLoginStreak = this.calculateLoginStreak(lastLogin);
      this.showDailyReward();
      localStorage.setItem('lastLogin', today);
    }

    // Show countdown to next daily reward
    this.startDailyRewardTimer();
  }

  /**
   * Streak system (loss aversion)
   */
  private setupStreakSystem(): void {
    const streak = parseInt(localStorage.getItem('winStreak') || '0');
    this.streakCounter = streak;

    // Show streak in danger if about to lose it
    if (this.streakCounter > 0) {
      this.showStreakWarning();
    }
  }

  /**
   * Push-like notifications (re-engagement)
   */
  private setupNotifications(): void {
    // In-game notifications
    const notifications = [
      { delay: 300000, message: "🎯 Daily challenge available!" }, // 5 min
      { delay: 600000, message: "👥 Your friend just beat your score!" }, // 10 min
      { delay: 900000, message: "⚡ Energy full! Come back to play!" }, // 15 min
      { delay: 1800000, message: "🎁 Mystery box waiting!" }, // 30 min
    ];

    notifications.forEach(notif => {
      setTimeout(() => this.showNotification(notif.message), notif.delay);
    });
  }

  /**
   * Variable ratio rewards (gambling psychology)
   */
  private setupVariableRewards(): void {
    // Random rewards on certain actions
    this.on('tilePlace', () => {
      if (Math.random() < 0.1) { // 10% chance
        this.triggerRandomReward();
      }
    });

    this.on('gameWin', () => {
      const multiplier = 1 + Math.random() * 3; // 1x to 4x random
      this.showWinReward(multiplier);
    });
  }

  /**
   * Social proof elements
   */
  private setupSocialProof(): void {
    // Fake live player count
    const playerCount = 1000 + Math.floor(Math.random() * 500);
    this.showPlayerCount(playerCount);

    // Periodic updates
    setInterval(() => {
      const change = Math.floor(Math.random() * 100) - 50;
      this.updatePlayerCount(change);
    }, 30000);

    // Show recent winners
    this.showRecentWinners();
  }

  /**
   * Progress bars everywhere (endowed progress effect)
   */
  private setupProgressBars(): void {
    const progressElements = [
      { id: 'level-progress', start: 15, total: 100 }, // Start at 15%
      { id: 'daily-progress', start: 1, total: 7 },
      { id: 'achievement-progress', start: 3, total: 50 },
      { id: 'battle-pass', start: 5, total: 100 }
    ];

    progressElements.forEach(elem => {
      this.createProgressBar(elem);
    });
  }

  /**
   * Satisfying sound effects (dopamine triggers)
   */
  private setupSoundEffects(): void {
    const sounds = {
      tilePlace: new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAACAP//gAA='),
      combo: new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAACAP//gAA='),
      levelUp: new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAACAP//gAA='),
      reward: new Audio('data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAACAP//gAA='),
    };

    // Escalating pitch for combos
    let comboCount = 0;
    this.on('combo', () => {
      comboCount++;
      sounds.combo.playbackRate = 1 + (comboCount * 0.1);
      sounds.combo.play();
    });
  }

  /**
   * Dopamine release cycle
   */
  private startDopamineCycle(): void {
    // Micro-rewards every few seconds
    this.dopamineTimer = setInterval(() => {
      this.microReward();
    }, 3000);

    // Anticipation builder
    this.buildAnticipation();
  }

  /**
   * Micro-rewards (constant dopamine)
   */
  private microReward(): void {
    const rewards = [
      () => this.showFloatingPoints('+1'),
      () => this.sparkleEffect(),
      () => this.pulseGlow(),
      () => this.showEncouragement(),
    ];

    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    reward();
  }

  /**
   * Build anticipation (pre-reward dopamine)
   */
  private buildAnticipation(): void {
    // Show "almost there" messages
    this.on('progress', (percent: number) => {
      if (percent > 80) {
        this.showMessage('Almost there! 🎯');
      } else if (percent > 60) {
        this.showMessage('Keep going! 💪');
      }
    });

    // Countdown timers for everything
    this.showCountdowns();
  }

  /**
   * Limited time offers (FOMO)
   */
  createLimitedOffer(): void {
    const offer = {
      title: '⚡ FLASH SALE ⚡',
      discount: '70% OFF',
      timer: 3600, // 1 hour
      items: ['Golden Tiles', 'Extra Hints', 'Double XP'],
      originalPrice: 999,
      salePrice: 299
    };

    this.showLimitedOffer(offer);
    this.startOfferCountdown(offer.timer);
  }

  /**
   * Battle pass system (sunk cost + progress)
   */
  createBattlePass(): void {
    const battlePass = {
      free: [
        { level: 1, reward: '50 coins' },
        { level: 5, reward: '100 coins' },
        { level: 10, reward: 'New theme' }
      ],
      premium: [
        { level: 1, reward: '200 coins + Exclusive tile' },
        { level: 5, reward: '500 coins + Avatar' },
        { level: 10, reward: '1000 coins + Golden dominoes' }
      ]
    };

    this.showBattlePass(battlePass);
  }

  /**
   * Energy system (appointment mechanics)
   */
  createEnergySystem(): void {
    let energy = parseInt(localStorage.getItem('energy') || '5');
    const maxEnergy = 5;
    const rechargeTime = 900000; // 15 minutes

    // Lose energy on play
    this.on('gameStart', () => {
      if (energy > 0) {
        energy--;
        this.updateEnergyDisplay(energy, maxEnergy);

        if (energy === 0) {
          this.showEnergyDepleted();
          this.startEnergyTimer(rechargeTime);
        }
      }
    });

    // Recharge energy
    setInterval(() => {
      if (energy < maxEnergy) {
        energy++;
        this.updateEnergyDisplay(energy, maxEnergy);

        if (energy === maxEnergy) {
          this.showNotification('⚡ Energy Full! Come play!');
        }
      }
    }, rechargeTime);
  }

  /**
   * Loot boxes (variable rewards + anticipation)
   */
  openLootBox(): void {
    // Build anticipation with animation
    this.showLootBoxAnimation();

    setTimeout(() => {
      const rarity = Math.random();
      let rewards;

      if (rarity < 0.01) { // 1% legendary
        rewards = { tier: 'LEGENDARY', coins: 1000, item: 'Rainbow Dominoes' };
        this.epicWinAnimation();
      } else if (rarity < 0.1) { // 9% rare
        rewards = { tier: 'RARE', coins: 250, item: 'Silver Theme' };
        this.rareWinAnimation();
      } else if (rarity < 0.4) { // 30% uncommon
        rewards = { tier: 'UNCOMMON', coins: 100, item: 'Extra Hints' };
      } else { // 60% common
        rewards = { tier: 'COMMON', coins: 50 };
      }

      this.showLootBoxRewards(rewards);
    }, 3000);
  }

  /**
   * Tournament pressure (competition + time pressure)
   */
  createTournament(): void {
    const tournament = {
      name: 'Weekend Warriors',
      endTime: Date.now() + 172800000, // 48 hours
      prizes: {
        1: { coins: 10000, title: 'Champion' },
        2: { coins: 5000, title: 'Master' },
        3: { coins: 2500, title: 'Expert' },
        '4-10': { coins: 1000 },
        '11-50': { coins: 500 },
        '51-100': { coins: 250 }
      },
      currentRank: 42,
      participants: 1543
    };

    this.showTournament(tournament);
    this.updateLeaderboard();
  }

  /**
   * VIP system (status + exclusivity)
   */
  createVIPSystem(): void {
    const vipLevels = [
      { level: 0, name: 'Bronze', perks: ['5% coin bonus'] },
      { level: 1, name: 'Silver', perks: ['10% coin bonus', 'Free hint daily'] },
      { level: 2, name: 'Gold', perks: ['20% coin bonus', '3 free hints', 'Exclusive themes'] },
      { level: 3, name: 'Platinum', perks: ['50% coin bonus', 'Unlimited hints', 'VIP tournaments'] },
      { level: 4, name: 'Diamond', perks: ['100% coin bonus', 'Everything unlocked', 'Custom avatar'] }
    ];

    const currentVIP = parseInt(localStorage.getItem('vipLevel') || '0');
    const nextVIP = vipLevels[Math.min(currentVIP + 1, 4)];

    this.showVIPProgress(currentVIP, nextVIP);
  }

  // UI Update methods
  private showFloatingPoints(text: string): void {
    this.emit('floatingText', { text, color: this.COLORS.SUCCESS });
  }

  private sparkleEffect(): void {
    this.emit('sparkle', { duration: 1000 });
  }

  private pulseGlow(): void {
    this.emit('pulse', { color: this.COLORS.ENERGY });
  }

  private showEncouragement(): void {
    const messages = [
      'Great move! 🎯',
      'You\'re on fire! 🔥',
      'Brilliant! ✨',
      'Amazing! 🌟',
      'Perfect! 💎'
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    this.emit('encouragement', msg);
  }

  private showMessage(text: string): void {
    this.emit('message', { text, duration: 2000 });
  }

  private showDailyReward(): void {
    const day = (this.dailyLoginStreak % 7) + 1;
    const reward = this.REWARDS.DAILY_REWARDS[day - 1];
    this.emit('dailyReward', reward);
  }

  private showStreakWarning(): void {
    this.emit('streakWarning', {
      message: `Don't lose your ${this.streakCounter} day streak!`,
      color: this.COLORS.URGENT
    });
  }

  private showNotification(message: string): void {
    this.emit('notification', { message, sound: true });
  }

  private triggerRandomReward(): void {
    const coins = this.REWARDS.INSTANT_GRATIFICATION.coins[
      Math.floor(Math.random() * this.REWARDS.INSTANT_GRATIFICATION.coins.length)
    ];
    this.emit('randomReward', { coins });
  }

  private showWinReward(multiplier: number): void {
    this.emit('winReward', {
      multiplier,
      animation: this.REWARDS.INSTANT_GRATIFICATION.winAnimation
    });
  }

  private showPlayerCount(count: number): void {
    this.emit('playerCount', { count, text: `${count.toLocaleString()} playing now!` });
  }

  private updatePlayerCount(change: number): void {
    this.emit('playerCountUpdate', change);
  }

  private showRecentWinners(): void {
    const winners = [
      { name: 'Player123', prize: '500 coins', time: '2 min ago' },
      { name: 'DominoKing', prize: '1000 coins', time: '5 min ago' },
      { name: 'Lucky7', prize: 'Golden Tiles', time: '8 min ago' }
    ];
    this.emit('recentWinners', winners);
  }

  private createProgressBar(elem: any): void {
    this.emit('createProgress', elem);
  }

  private showCountdowns(): void {
    this.emit('countdowns', {
      dailyChallenge: 3600,
      tournament: 7200,
      energy: 900
    });
  }

  private showLimitedOffer(offer: any): void {
    this.emit('limitedOffer', offer);
  }

  private startOfferCountdown(timer: number): void {
    this.emit('offerCountdown', timer);
  }

  private showBattlePass(battlePass: any): void {
    this.emit('battlePass', battlePass);
  }

  private updateEnergyDisplay(energy: number, max: number): void {
    this.emit('energyUpdate', { current: energy, max });
  }

  private showEnergyDepleted(): void {
    this.emit('energyDepleted', {
      message: 'Out of energy! Wait or buy more!',
      options: ['Wait 15 min', 'Watch Ad', 'Buy Energy']
    });
  }

  private startEnergyTimer(time: number): void {
    this.emit('energyTimer', time);
  }

  private showLootBoxAnimation(): void {
    this.emit('lootBoxOpening', { duration: 3000 });
  }

  private epicWinAnimation(): void {
    this.emit('epicWin', {
      effects: ['confetti', 'fireworks', 'goldRain'],
      sound: 'epic_fanfare'
    });
  }

  private rareWinAnimation(): void {
    this.emit('rareWin', {
      effects: ['sparkles', 'glow'],
      sound: 'rare_chime'
    });
  }

  private showLootBoxRewards(rewards: any): void {
    this.emit('lootBoxRewards', rewards);
  }

  private showTournament(tournament: any): void {
    this.emit('tournament', tournament);
  }

  private updateLeaderboard(): void {
    this.emit('leaderboardUpdate');
  }

  private showVIPProgress(current: number, next: any): void {
    this.emit('vipProgress', { current, next });
  }

  private calculateLoginStreak(lastLogin: string | null): number {
    if (!lastLogin) return 1;

    const last = new Date(lastLogin);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      return (parseInt(localStorage.getItem('loginStreak') || '0') + 1);
    } else if (diffDays === 0) {
      return parseInt(localStorage.getItem('loginStreak') || '1');
    } else {
      return 1; // Streak broken
    }
  }

  private startDailyRewardTimer(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilReset = tomorrow.getTime() - now.getTime();

    this.emit('dailyRewardTimer', timeUntilReset);
  }

  destroy(): void {
    if (this.dopamineTimer) {
      clearInterval(this.dopamineTimer);
    }
  }
}