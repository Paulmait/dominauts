/**
 * Avatar Service
 * Manages player avatars and AI opponent identities
 */

export interface Avatar {
  id: string;
  name: string;
  imageUrl?: string;
  color: string;
  emoji: string;
}

export interface AIOpponent {
  name: string;
  avatar: Avatar;
  personality: 'aggressive' | 'defensive' | 'balanced' | 'random';
  taunt?: string;
}

class AvatarService {
  // Preset avatar options for players
  private readonly playerAvatars: Avatar[] = [
    { id: 'avatar_1', name: 'Ace', color: '#FF6B6B', emoji: '🎯' },
    { id: 'avatar_2', name: 'Blaze', color: '#FFA500', emoji: '🔥' },
    { id: 'avatar_3', name: 'Storm', color: '#4ECDC4', emoji: '⚡' },
    { id: 'avatar_4', name: 'Nova', color: '#A855F7', emoji: '✨' },
    { id: 'avatar_5', name: 'Shadow', color: '#6366F1', emoji: '🌙' },
    { id: 'avatar_6', name: 'Phoenix', color: '#EF4444', emoji: '🦅' },
    { id: 'avatar_7', name: 'Frost', color: '#06B6D4', emoji: '❄️' },
    { id: 'avatar_8', name: 'Titan', color: '#84CC16', emoji: '💪' },
    { id: 'avatar_9', name: 'Mystic', color: '#EC4899', emoji: '🔮' },
    { id: 'avatar_10', name: 'Viper', color: '#10B981', emoji: '🐍' }
  ];

  // Pool of AI opponent names with personalities
  private readonly aiOpponents: Omit<AIOpponent, 'avatar'>[] = [
    // Aggressive Players
    { name: 'DominoDestroyer', personality: 'aggressive', taunt: "You're going down!" },
    { name: 'TileTerminator', personality: 'aggressive', taunt: "Resistance is futile!" },
    { name: 'BoneBreaker', personality: 'aggressive', taunt: "Time to crush some tiles!" },
    { name: 'ChainChampion', personality: 'aggressive', taunt: "I'll break your streak!" },
    { name: 'BlockBuster', personality: 'aggressive', taunt: "Prepare to be blocked!" },

    // Defensive Players
    { name: 'DefenseBot3000', personality: 'defensive', taunt: "Can't touch this!" },
    { name: 'TileGuardian', personality: 'defensive', taunt: "My defense is impenetrable!" },
    { name: 'SafetyFirst', personality: 'defensive', taunt: "Slow and steady wins!" },
    { name: 'WallBuilder', personality: 'defensive', taunt: "Building my fortress!" },
    { name: 'CautiousCarl', personality: 'defensive', taunt: "Patience is key!" },

    // Balanced Players
    { name: 'StrategicSam', personality: 'balanced', taunt: "Every move is calculated!" },
    { name: 'CleverClara', personality: 'balanced', taunt: "Mind over matter!" },
    { name: 'TacticalTom', personality: 'balanced', taunt: "Strategy beats luck!" },
    { name: 'SmartSally', personality: 'balanced', taunt: "Think before you play!" },
    { name: 'BalancedBob', personality: 'balanced', taunt: "Perfect balance!" },

    // Random/Fun Players
    { name: 'LuckyLuke', personality: 'random', taunt: "Feeling lucky today!" },
    { name: 'ChaosCat', personality: 'random', taunt: "Embrace the chaos!" },
    { name: 'RandomRita', personality: 'random', taunt: "Who needs a plan?" },
    { name: 'WildCard', personality: 'random', taunt: "Expect the unexpected!" },
    { name: 'DiceRoller', personality: 'random', taunt: "Let fate decide!" },

    // Themed Names
    { name: 'MidnightMarauder', personality: 'aggressive', taunt: "The night is mine!" },
    { name: 'SunsetStrategist', personality: 'balanced', taunt: "Planning at dusk!" },
    { name: 'DawnDefender', personality: 'defensive', taunt: "Morning protection!" },
    { name: 'TwilightTactician', personality: 'balanced', taunt: "Between light and dark!" },
    { name: 'NoonNinja', personality: 'aggressive', taunt: "Strike at high noon!" },

    // Professional Names
    { name: 'GrandMasterGary', personality: 'balanced', taunt: "Years of experience!" },
    { name: 'ProPlayerPete', personality: 'aggressive', taunt: "Going pro!" },
    { name: 'ChampionChris', personality: 'aggressive', taunt: "Champion mode activated!" },
    { name: 'MasterMaria', personality: 'balanced', taunt: "Mastery in motion!" },
    { name: 'ExpertEva', personality: 'defensive', taunt: "Expert defense!" },

    // Funny Names
    { name: 'TileMcTileface', personality: 'random', taunt: "I'm a tile!" },
    { name: 'DominoEffector', personality: 'aggressive', taunt: "Feel the effect!" },
    { name: 'SixLoveSender', personality: 'aggressive', taunt: "Six-Love incoming!" },
    { name: 'BlockParty', personality: 'defensive', taunt: "Party's blocked!" },
    { name: 'TileWhisperer', personality: 'balanced', taunt: "The tiles speak to me!" },

    // Intimidating Names
    { name: 'TheBoneyard', personality: 'aggressive', taunt: "Welcome to the boneyard!" },
    { name: 'TileReaper', personality: 'aggressive', taunt: "Reaping tiles!" },
    { name: 'DominoOverlord', personality: 'aggressive', taunt: "Bow to the overlord!" },
    { name: 'EndGameEnforcer', personality: 'defensive', taunt: "This is the endgame!" },
    { name: 'FinalBoss', personality: 'balanced', taunt: "Final boss fight!" }
  ];

  // Difficulty-based name pools
  private readonly difficultyNames = {
    easy: [
      'BeginnerBot', 'NewPlayer', 'LearningLily', 'StarterSteve', 'RookieRob',
      'NoviceNancy', 'TrainingTom', 'PracticePat', 'TutorialTina', 'BasicBen'
    ],
    medium: [
      'AverageAlex', 'StandardSue', 'RegularRay', 'NormalNick', 'MediumMike',
      'CommonCarol', 'UsualUrsula', 'TypicalTyler', 'OrdinaryOllie', 'StandardStan'
    ],
    hard: [
      'ToughTony', 'HardcoreHank', 'DifficultDiana', 'ChallengingChad', 'TrickyTracy',
      'ComplexCody', 'AdvancedAmy', 'SkilledSean', 'ExperiencedElla', 'VeteranVic'
    ],
    expert: [
      'EliteEthan', 'MasterfulMaya', 'LegendaryLeo', 'UltimatUma', 'SupremeSara',
      'PerfectPaul', 'FlawlessFelix', 'UnbeatableUna', 'InvincibleIvan', 'GodlikeGrace'
    ]
  };

  // Used names tracker to avoid duplicates in same session
  private usedAINames: Set<string> = new Set();

  /**
   * Get a player avatar by ID
   */
  public getAvatar(avatarId: string): Avatar | undefined {
    return this.playerAvatars.find(a => a.id === avatarId);
  }

  /**
   * Get all available player avatars
   */
  public getAllAvatars(): Avatar[] {
    return [...this.playerAvatars];
  }

  /**
   * Generate a random avatar ID
   */
  public getRandomAvatarId(): string {
    const randomIndex = Math.floor(Math.random() * this.playerAvatars.length);
    return this.playerAvatars[randomIndex].id;
  }

  /**
   * Get a random AI opponent with unique name
   */
  public getRandomAIOpponent(difficulty?: 'easy' | 'medium' | 'hard' | 'expert'): AIOpponent {
    let availableOpponents = [...this.aiOpponents];

    // Add difficulty-specific names if provided
    if (difficulty && this.difficultyNames[difficulty]) {
      const difficultySpecific = this.difficultyNames[difficulty].map(name => ({
        name,
        personality: this.getPersonalityForDifficulty(difficulty),
        taunt: this.getTauntForDifficulty(difficulty)
      }));
      availableOpponents = [...difficultySpecific, ...availableOpponents];
    }

    // Filter out used names
    availableOpponents = availableOpponents.filter(op => !this.usedAINames.has(op.name));

    // If all names are used, reset the pool
    if (availableOpponents.length === 0) {
      this.usedAINames.clear();
      availableOpponents = [...this.aiOpponents];
    }

    // Select random opponent
    const randomIndex = Math.floor(Math.random() * availableOpponents.length);
    const selectedOpponent = availableOpponents[randomIndex];

    // Mark as used
    this.usedAINames.add(selectedOpponent.name);

    // Generate random avatar for AI
    const randomAvatar = this.playerAvatars[Math.floor(Math.random() * this.playerAvatars.length)];

    return {
      ...selectedOpponent,
      avatar: randomAvatar
    };
  }

  /**
   * Get multiple unique AI opponents
   */
  public getMultipleAIOpponents(count: number, difficulty?: 'easy' | 'medium' | 'hard' | 'expert'): AIOpponent[] {
    const opponents: AIOpponent[] = [];
    for (let i = 0; i < count; i++) {
      opponents.push(this.getRandomAIOpponent(difficulty));
    }
    return opponents;
  }

  /**
   * Generate avatar URL from DiceBear API
   */
  public generateAvatarUrl(seed: string, style: 'avataaars' | 'bottts' | 'identicon' = 'avataaars'): string {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
  }

  /**
   * Generate custom avatar based on user preferences
   */
  public generateCustomAvatar(options: {
    seed: string;
    backgroundColor?: string;
    radius?: number;
  }): string {
    const params = new URLSearchParams({
      seed: options.seed,
      backgroundColor: options.backgroundColor || 'transparent',
      radius: (options.radius || 0).toString()
    });

    return `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
  }

  /**
   * Reset used AI names (for new session)
   */
  public resetUsedNames(): void {
    this.usedAINames.clear();
  }

  /**
   * Helper: Get personality based on difficulty
   */
  private getPersonalityForDifficulty(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): AIOpponent['personality'] {
    switch (difficulty) {
      case 'easy':
        return 'random';
      case 'medium':
        return 'balanced';
      case 'hard':
        return Math.random() > 0.5 ? 'aggressive' : 'defensive';
      case 'expert':
        return 'aggressive';
      default:
        return 'balanced';
    }
  }

  /**
   * Helper: Get taunt based on difficulty
   */
  private getTauntForDifficulty(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): string {
    const taunts = {
      easy: [
        "Let's have fun!",
        "Good luck!",
        "May the best player win!",
        "Here we go!",
        "Let's play!"
      ],
      medium: [
        "Let's see what you've got!",
        "This should be interesting!",
        "Game on!",
        "Ready for a challenge?",
        "Show me your skills!"
      ],
      hard: [
        "You're in for a tough game!",
        "Hope you're ready!",
        "This won't be easy!",
        "Prepare yourself!",
        "Let's see if you can keep up!"
      ],
      expert: [
        "You don't stand a chance!",
        "Prepare to lose!",
        "I never lose!",
        "This is my domain!",
        "You're about to get schooled!"
      ]
    };

    const difficultyTaunts = taunts[difficulty];
    return difficultyTaunts[Math.floor(Math.random() * difficultyTaunts.length)];
  }
}

// Export singleton instance
export const avatarService = new AvatarService();
export default avatarService;