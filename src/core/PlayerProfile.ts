// Player Profile System with Stats, Achievements, and Progression

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  winStreak: number;
  bestWinStreak: number;
  totalScore: number;
  highestScore: number;
  tilesPlayed: number;
  perfectGames: number;
  totalPlayTime: number;
  favoriteMode: string;
  modeStats: Record<string, {
    played: number;
    won: number;
    avgScore: number;
  }>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'gameplay' | 'social' | 'mastery' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  xpReward: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  mode?: string;
  requirement: string;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
  expiresAt: Date;
}

export interface PlayerProfile {
  id: string;
  username: string;
  avatar: string;
  avatarFrame?: string;
  title?: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  gems: number;
  stats: PlayerStats;
  achievements: Achievement[];
  dailyChallenges: DailyChallenge[];
  weeklyChallenge?: DailyChallenge;
  unlockedAvatars: string[];
  unlockedThemes: string[];
  unlockedTiles: string[];
  preferences: {
    theme: string;
    soundEnabled: boolean;
    musicEnabled: boolean;
    vibrationEnabled: boolean;
    hintsEnabled: boolean;
    language: string;
  };
  createdAt: Date;
  lastSeen: Date;
  badges: string[];
  friends: string[];
}

export class PlayerProfileManager {
  private static instance: PlayerProfileManager;
  private profile: PlayerProfile | null = null;
  private readonly STORAGE_KEY = 'dominauts_player_profile';

  // Avatar options
  public static readonly AVATARS = [
    { id: 'domino-master', name: 'Domino Master', icon: '🎯', locked: false },
    { id: 'lucky-seven', name: 'Lucky Seven', icon: '🎰', locked: false },
    { id: 'speed-demon', name: 'Speed Demon', icon: '⚡', locked: false },
    { id: 'strategist', name: 'The Strategist', icon: '🧠', locked: false },
    { id: 'champion', name: 'Champion', icon: '🏆', locked: true, unlockLevel: 10 },
    { id: 'legend', name: 'Legend', icon: '⭐', locked: true, unlockLevel: 20 },
    { id: 'grandmaster', name: 'Grandmaster', icon: '👑', locked: true, unlockLevel: 30 },
    { id: 'dominator', name: 'The Dominator', icon: '💀', locked: true, unlockLevel: 50 },
    { id: 'phoenix', name: 'Phoenix', icon: '🔥', locked: true, achievement: 'comeback-king' },
    { id: 'ninja', name: 'Shadow Ninja', icon: '🥷', locked: true, achievement: 'stealth-master' },
    { id: 'pirate', name: 'Pirate King', icon: '🏴‍☠️', locked: true, coins: 10000 },
    { id: 'astronaut', name: 'Space Cadet', icon: '🚀', locked: true, special: true }
  ];

  // Achievement definitions
  public static readonly ACHIEVEMENTS: Achievement[] = [
    // Gameplay Achievements
    {
      id: 'first-win',
      name: 'First Victory',
      description: 'Win your first game',
      icon: '🏆',
      category: 'gameplay',
      rarity: 'common',
      unlocked: false,
      progress: 0,
      maxProgress: 1,
      xpReward: 100
    },
    {
      id: 'winning-streak-5',
      name: 'On Fire',
      description: 'Win 5 games in a row',
      icon: '🔥',
      category: 'gameplay',
      rarity: 'rare',
      unlocked: false,
      progress: 0,
      maxProgress: 5,
      xpReward: 500
    },
    {
      id: 'perfect-game',
      name: 'Flawless Victory',
      description: 'Win without opponent scoring',
      icon: '💎',
      category: 'gameplay',
      rarity: 'epic',
      unlocked: false,
      progress: 0,
      maxProgress: 1,
      xpReward: 750
    },
    {
      id: 'domino-slammer',
      name: 'Domino Slammer',
      description: 'Play 100 double tiles',
      icon: '💥',
      category: 'mastery',
      rarity: 'common',
      unlocked: false,
      progress: 0,
      maxProgress: 100,
      xpReward: 300
    },
    {
      id: 'speed-player',
      name: 'Lightning Fast',
      description: 'Complete a game in under 5 minutes',
      icon: '⚡',
      category: 'gameplay',
      rarity: 'rare',
      unlocked: false,
      progress: 0,
      maxProgress: 1,
      xpReward: 400
    },
    {
      id: 'comeback-king',
      name: 'Comeback King',
      description: 'Win from 50+ points behind',
      icon: '👑',
      category: 'gameplay',
      rarity: 'legendary',
      unlocked: false,
      progress: 0,
      maxProgress: 1,
      xpReward: 1000
    },
    {
      id: 'tile-master',
      name: 'Tile Master',
      description: 'Play 1000 tiles',
      icon: '🎮',
      category: 'mastery',
      rarity: 'rare',
      unlocked: false,
      progress: 0,
      maxProgress: 1000,
      xpReward: 600
    },
    {
      id: 'all-modes',
      name: 'Versatile Player',
      description: 'Win in all 8 game modes',
      icon: '🎯',
      category: 'mastery',
      rarity: 'epic',
      unlocked: false,
      progress: 0,
      maxProgress: 8,
      xpReward: 1500
    },
    {
      id: 'high-scorer',
      name: 'High Roller',
      description: 'Score 500 points in a single game',
      icon: '💰',
      category: 'gameplay',
      rarity: 'epic',
      unlocked: false,
      progress: 0,
      maxProgress: 500,
      xpReward: 800
    },
    {
      id: 'veteran',
      name: 'Veteran Player',
      description: 'Play 100 games',
      icon: '🎖️',
      category: 'mastery',
      rarity: 'rare',
      unlocked: false,
      progress: 0,
      maxProgress: 100,
      xpReward: 1000
    }
  ];

  private constructor() {
    this.loadProfile();
  }

  public static getInstance(): PlayerProfileManager {
    if (!PlayerProfileManager.instance) {
      PlayerProfileManager.instance = new PlayerProfileManager();
    }
    return PlayerProfileManager.instance;
  }

  private loadProfile(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.profile = JSON.parse(stored);
        this.profile!.lastSeen = new Date();
        this.checkDailyChallenges();
      } catch (e) {
        this.createNewProfile();
      }
    } else {
      this.createNewProfile();
    }
  }

  private createNewProfile(): void {
    this.profile = {
      id: this.generateId(),
      username: `Player${Math.floor(Math.random() * 9999)}`,
      avatar: 'domino-master',
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      coins: 100,
      gems: 10,
      stats: this.createEmptyStats(),
      achievements: [...PlayerProfileManager.ACHIEVEMENTS],
      dailyChallenges: this.generateDailyChallenges(),
      unlockedAvatars: ['domino-master', 'lucky-seven', 'speed-demon', 'strategist'],
      unlockedThemes: ['classic'],
      unlockedTiles: ['standard'],
      preferences: {
        theme: 'classic',
        soundEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true,
        hintsEnabled: true,
        language: 'en'
      },
      createdAt: new Date(),
      lastSeen: new Date(),
      badges: [],
      friends: []
    };
    this.saveProfile();
  }

  private createEmptyStats(): PlayerStats {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      gamesDraw: 0,
      winStreak: 0,
      bestWinStreak: 0,
      totalScore: 0,
      highestScore: 0,
      tilesPlayed: 0,
      perfectGames: 0,
      totalPlayTime: 0,
      favoriteMode: 'classic',
      modeStats: {}
    };
  }

  private generateDailyChallenges(): DailyChallenge[] {
    const challenges = [
      {
        id: 'daily-wins',
        title: 'Victory Road',
        description: 'Win 3 games today',
        icon: '🏆',
        requirement: 'wins',
        progress: 0,
        target: 3,
        xpReward: 200,
        completed: false,
        expiresAt: this.getTomorrowMidnight()
      },
      {
        id: 'daily-score',
        title: 'Score Master',
        description: 'Score 200 total points',
        icon: '💯',
        requirement: 'score',
        progress: 0,
        target: 200,
        xpReward: 150,
        completed: false,
        expiresAt: this.getTomorrowMidnight()
      },
      {
        id: 'daily-tiles',
        title: 'Tile Placer',
        description: 'Play 50 tiles',
        icon: '🎲',
        requirement: 'tiles',
        progress: 0,
        target: 50,
        xpReward: 100,
        completed: false,
        expiresAt: this.getTomorrowMidnight()
      }
    ];

    // Pick 2 random challenges for the day
    return challenges.sort(() => Math.random() - 0.5).slice(0, 2);
  }

  private getTomorrowMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private checkDailyChallenges(): void {
    if (!this.profile) return;

    const now = new Date();
    const expired = this.profile.dailyChallenges.some(c => new Date(c.expiresAt) < now);

    if (expired) {
      this.profile.dailyChallenges = this.generateDailyChallenges();
      this.saveProfile();
    }
  }

  private generateId(): string {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  public saveProfile(): void {
    if (this.profile) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.profile));
    }
  }

  public getProfile(): PlayerProfile | null {
    return this.profile;
  }

  public addXP(amount: number): void {
    if (!this.profile) return;

    this.profile.xp += amount;

    // Check for level up
    while (this.profile.xp >= this.profile.xpToNextLevel) {
      this.profile.xp -= this.profile.xpToNextLevel;
      this.profile.level++;
      this.profile.xpToNextLevel = this.calculateXPRequired(this.profile.level);

      // Rewards for leveling up
      this.profile.coins += 50 * this.profile.level;
      this.profile.gems += 5;

      // Check for avatar unlocks
      this.checkAvatarUnlocks();

      // Trigger level up notification
      this.onLevelUp(this.profile.level);
    }

    this.saveProfile();
  }

  private calculateXPRequired(level: number): number {
    return 100 * level + (level - 1) * 50;
  }

  private checkAvatarUnlocks(): void {
    if (!this.profile) return;

    PlayerProfileManager.AVATARS.forEach(avatar => {
      if (avatar.locked && avatar.unlockLevel && this.profile!.level >= avatar.unlockLevel) {
        if (!this.profile!.unlockedAvatars.includes(avatar.id)) {
          this.profile!.unlockedAvatars.push(avatar.id);
        }
      }
    });
  }

  private onLevelUp(level: number): void {
    // This will be called from the game to show level up animation
    console.log(`Level up! You are now level ${level}`);
  }

  public updateStats(gameResult: {
    won: boolean;
    score: number;
    mode: string;
    tilesPlayed: number;
    gameTime: number;
    perfectGame?: boolean;
  }): void {
    if (!this.profile) return;

    const stats = this.profile.stats;
    stats.gamesPlayed++;

    if (gameResult.won) {
      stats.gamesWon++;
      stats.winStreak++;
      stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.winStreak);

      // Update mode stats
      if (!stats.modeStats[gameResult.mode]) {
        stats.modeStats[gameResult.mode] = { played: 0, won: 0, avgScore: 0 };
      }
      stats.modeStats[gameResult.mode].won++;
    } else {
      stats.gamesLost++;
      stats.winStreak = 0;
    }

    // Update mode stats
    if (!stats.modeStats[gameResult.mode]) {
      stats.modeStats[gameResult.mode] = { played: 0, won: 0, avgScore: 0 };
    }
    const modeStats = stats.modeStats[gameResult.mode];
    modeStats.played++;
    modeStats.avgScore = (modeStats.avgScore * (modeStats.played - 1) + gameResult.score) / modeStats.played;

    stats.totalScore += gameResult.score;
    stats.highestScore = Math.max(stats.highestScore, gameResult.score);
    stats.tilesPlayed += gameResult.tilesPlayed;
    stats.totalPlayTime += gameResult.gameTime;

    if (gameResult.perfectGame) {
      stats.perfectGames++;
    }

    // Update favorite mode
    let maxPlayed = 0;
    let favMode = 'classic';
    Object.entries(stats.modeStats).forEach(([mode, data]) => {
      if (data.played > maxPlayed) {
        maxPlayed = data.played;
        favMode = mode;
      }
    });
    stats.favoriteMode = favMode;

    // Check achievements
    this.checkAchievements(gameResult);

    // Update daily challenges
    this.updateDailyChallenges(gameResult);

    this.saveProfile();
  }

  private checkAchievements(gameResult: any): void {
    if (!this.profile) return;

    this.profile.achievements.forEach(achievement => {
      if (achievement.unlocked) return;

      switch (achievement.id) {
        case 'first-win':
          if (gameResult.won) {
            achievement.progress = 1;
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            this.addXP(achievement.xpReward);
          }
          break;

        case 'winning-streak-5':
          achievement.progress = this.profile!.stats.winStreak;
          if (achievement.progress >= achievement.maxProgress) {
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            this.addXP(achievement.xpReward);
          }
          break;

        case 'perfect-game':
          if (gameResult.perfectGame) {
            achievement.progress = 1;
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            this.addXP(achievement.xpReward);
          }
          break;

        case 'tile-master':
          achievement.progress = this.profile!.stats.tilesPlayed;
          if (achievement.progress >= achievement.maxProgress) {
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            this.addXP(achievement.xpReward);
          }
          break;

        case 'veteran':
          achievement.progress = this.profile!.stats.gamesPlayed;
          if (achievement.progress >= achievement.maxProgress) {
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            this.addXP(achievement.xpReward);
          }
          break;

        case 'high-scorer':
          achievement.progress = Math.max(achievement.progress, gameResult.score);
          if (achievement.progress >= achievement.maxProgress) {
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            this.addXP(achievement.xpReward);
          }
          break;

        case 'speed-player':
          if (gameResult.gameTime < 300 && gameResult.won) { // Under 5 minutes
            achievement.progress = 1;
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
            this.addXP(achievement.xpReward);
          }
          break;
      }
    });
  }

  private updateDailyChallenges(gameResult: any): void {
    if (!this.profile) return;

    this.profile.dailyChallenges.forEach(challenge => {
      if (challenge.completed) return;

      switch (challenge.requirement) {
        case 'wins':
          if (gameResult.won) {
            challenge.progress++;
          }
          break;
        case 'score':
          challenge.progress += gameResult.score;
          break;
        case 'tiles':
          challenge.progress += gameResult.tilesPlayed;
          break;
      }

      if (challenge.progress >= challenge.target) {
        challenge.completed = true;
        this.addXP(challenge.xpReward);
        this.profile!.coins += 50;
      }
    });
  }

  public setUsername(username: string): void {
    if (this.profile) {
      this.profile.username = username;
      this.saveProfile();
    }
  }

  public setAvatar(avatarId: string): void {
    if (this.profile && this.profile.unlockedAvatars.includes(avatarId)) {
      this.profile.avatar = avatarId;
      this.saveProfile();
    }
  }

  public getAvatarIcon(): string {
    if (!this.profile) return '🎮';
    const avatar = PlayerProfileManager.AVATARS.find(a => a.id === this.profile!.avatar);
    return avatar ? avatar.icon : '🎮';
  }

  public getWinRate(): number {
    if (!this.profile || this.profile.stats.gamesPlayed === 0) return 0;
    return (this.profile.stats.gamesWon / this.profile.stats.gamesPlayed) * 100;
  }

  public getLevel(): number {
    return this.profile?.level || 1;
  }

  public getUsername(): string {
    return this.profile?.username || 'Player';
  }
}