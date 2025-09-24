import { Tile } from '../core/models/Tile';
import { Board } from '../core/models/Board';
import { GameState } from '../core/GameEngine';
import { ValidMove } from '../core/modes/GameMode';
import { EventEmitter } from '../core/utils/EventEmitter';

export interface AIPersonality {
  name: string;
  avatar: string;
  skillLevel: number; // 0-100
  aggressiveness: number; // 0-100
  defensiveness: number; // 0-100
  speed: number; // milliseconds per move
  mistakeRate: number; // 0-100
  phrases: {
    greeting: string[];
    thinking: string[];
    goodMove: string[];
    badMove: string[];
    winning: string[];
    losing: string[];
    blocked: string[];
  };
  emotes: string[];
  thinkingPattern: 'quick' | 'methodical' | 'erratic';
}

export class AdvancedAISystem extends EventEmitter {
  private personalities: Map<string, AIPersonality> = new Map();
  private currentPersonality: AIPersonality;
  private moveHistory: any[] = [];
  private opponentMoves: Map<string, any[]> = new Map();
  private learningData: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializePersonalities();
    this.currentPersonality = this.personalities.get('rookie')!;
  }

  private initializePersonalities(): void {
    // Rookie Ron - Beginner AI
    this.personalities.set('rookie', {
      name: 'Rookie Ron',
      avatar: '🤓',
      skillLevel: 20,
      aggressiveness: 30,
      defensiveness: 20,
      speed: 1500,
      mistakeRate: 40,
      phrases: {
        greeting: [
          "Hi! I'm new here!",
          "Let's have fun!",
          "Hope I don't mess up too much!"
        ],
        thinking: [
          "Hmm...",
          "Let me think...",
          "Which one should I play?"
        ],
        goodMove: [
          "Did I do that right?",
          "Lucky me!",
          "Yay!"
        ],
        badMove: [
          "Oops!",
          "That wasn't smart...",
          "Oh no!"
        ],
        winning: [
          "I'm actually winning!",
          "Beginner's luck!",
          "Wow!"
        ],
        losing: [
          "You're good at this!",
          "I need more practice...",
          "Good game!"
        ],
        blocked: [
          "I'm stuck!",
          "No moves left...",
          "Help!"
        ]
      },
      emotes: ['😊', '😅', '🤔', '😮'],
      thinkingPattern: 'quick'
    });

    // Careful Carol - Defensive Player
    this.personalities.set('carol', {
      name: 'Careful Carol',
      avatar: '🧐',
      skillLevel: 60,
      aggressiveness: 20,
      defensiveness: 80,
      speed: 3000,
      mistakeRate: 15,
      phrases: {
        greeting: [
          "Let's play strategically",
          "I'll be watching your moves",
          "Defense wins games"
        ],
        thinking: [
          "Analyzing...",
          "Calculating risks...",
          "What's your plan?"
        ],
        goodMove: [
          "Blocked!",
          "Try getting past that",
          "Defense secured"
        ],
        badMove: [
          "I should have seen that",
          "Miscalculated",
          "Adjusting strategy..."
        ],
        winning: [
          "Patience pays off",
          "Slow and steady",
          "As planned"
        ],
        losing: [
          "Well played",
          "You found my weakness",
          "Good offensive strategy"
        ],
        blocked: [
          "Interesting position",
          "Time to adapt",
          "Challenge accepted"
        ]
      },
      emotes: ['🤓', '🎯', '🛡️', '📊'],
      thinkingPattern: 'methodical'
    });

    // Aggressive Alex - Point Hunter
    this.personalities.set('alex', {
      name: 'Aggressive Alex',
      avatar: '😤',
      skillLevel: 70,
      aggressiveness: 90,
      defensiveness: 30,
      speed: 1000,
      mistakeRate: 20,
      phrases: {
        greeting: [
          "Let's make this quick!",
          "Going for the win!",
          "Full speed ahead!"
        ],
        thinking: [
          "Where's the points?",
          "Attack mode!",
          "Going in!"
        ],
        goodMove: [
          "BOOM!",
          "Points!",
          "That's what I'm talking about!"
        ],
        badMove: [
          "Too aggressive...",
          "Should've scored there",
          "Next time!"
        ],
        winning: [
          "Dominating!",
          "Can't stop me!",
          "Victory!"
        ],
        losing: [
          "How?!",
          "I was so close!",
          "Rematch!"
        ],
        blocked: [
          "Come on!",
          "Need to break through!",
          "Frustrating!"
        ]
      },
      emotes: ['💪', '🔥', '⚡', '💥'],
      thinkingPattern: 'erratic'
    });

    // Strategic Sam - Advanced Player
    this.personalities.set('sam', {
      name: 'Strategic Sam',
      avatar: '♟️',
      skillLevel: 85,
      aggressiveness: 60,
      defensiveness: 70,
      speed: 2500,
      mistakeRate: 8,
      phrases: {
        greeting: [
          "Excellent, a worthy opponent",
          "Let's see your strategy",
          "May the best player win"
        ],
        thinking: [
          "Interesting position...",
          "Multiple possibilities...",
          "Planning ahead..."
        ],
        goodMove: [
          "According to plan",
          "Checkmate in 5",
          "Optimal play"
        ],
        badMove: [
          "Suboptimal",
          "Recalculating...",
          "Minor setback"
        ],
        winning: [
          "Well calculated",
          "The outcome was predictable",
          "Good game"
        ],
        losing: [
          "Impressive strategy",
          "I underestimated you",
          "Well deserved"
        ],
        blocked: [
          "Forced position",
          "Limited options",
          "Endgame scenario"
        ]
      },
      emotes: ['🎯', '📈', '🧮', '⚖️'],
      thinkingPattern: 'methodical'
    });

    // Master Maya - Expert AI
    this.personalities.set('maya', {
      name: 'Master Maya',
      avatar: '👑',
      skillLevel: 95,
      aggressiveness: 75,
      defensiveness: 85,
      speed: 2000,
      mistakeRate: 3,
      phrases: {
        greeting: [
          "Welcome to the master class",
          "Show me your best",
          "Let the lesson begin"
        ],
        thinking: [
          "...",
          "Calculating variations...",
          "Evaluating..."
        ],
        goodMove: [
          "Precision",
          "As expected",
          "Perfect execution"
        ],
        badMove: [
          "Interesting choice",
          "Unexpected",
          "Adjusting..."
        ],
        winning: [
          "Inevitable",
          "Experience matters",
          "Study this game"
        ],
        losing: [
          "Exceptional play",
          "You've earned this",
          "Respect"
        ],
        blocked: [
          "Tactical position",
          "Complex endgame",
          "Fascinating"
        ]
      },
      emotes: ['♔', '🏆', '💎', '✨'],
      thinkingPattern: 'methodical'
    });

    // Fun personalities
    this.personalities.set('joker', {
      name: 'Joker Jake',
      avatar: '🃏',
      skillLevel: 50,
      aggressiveness: 100,
      defensiveness: 0,
      speed: 500,
      mistakeRate: 50,
      phrases: {
        greeting: [
          "Why so serious?",
          "Let's shuffle things up!",
          "Chaos is my middle name!"
        ],
        thinking: [
          "Eeny, meeny, miny...",
          "Random mode activated!",
          "YOLO!"
        ],
        goodMove: [
          "HAHAHA!",
          "Didn't see that coming!",
          "Wild card!"
        ],
        badMove: [
          "All part of the plan!",
          "Or was it?",
          "Plot twist!"
        ],
        winning: [
          "The joke's on you!",
          "Comedy gold!",
          "Ta-da!"
        ],
        losing: [
          "The house always wins!",
          "You got me!",
          "What a punchline!"
        ],
        blocked: [
          "Now that's funny!",
          "Plot thickens!",
          "Intermission!"
        ]
      },
      emotes: ['🎭', '🎪', '🎨', '🎲'],
      thinkingPattern: 'erratic'
    });
  }

  public setPersonality(name: string): void {
    const personality = this.personalities.get(name);
    if (personality) {
      this.currentPersonality = personality;
      this.emit('personalityChanged', personality);
      this.sayPhrase('greeting');
    }
  }

  public async makeMove(
    validMoves: ValidMove[],
    board: Board,
    state: GameState
  ): Promise<ValidMove | null> {
    if (validMoves.length === 0) return null;

    // Show thinking animation
    this.emit('thinking', {
      duration: this.currentPersonality.speed,
      pattern: this.currentPersonality.thinkingPattern
    });

    // Say thinking phrase
    this.sayPhrase('thinking');

    // Simulate thinking time
    await this.delay(this.currentPersonality.speed);

    // Calculate best move based on personality
    const move = this.selectMove(validMoves, board, state);

    // Record move for learning
    this.recordMove(move, state);

    // React to move quality
    if (move) {
      const moveQuality = this.evaluateMoveQuality(move, validMoves);
      if (moveQuality > 0.7) {
        this.sayPhrase('goodMove');
      } else if (moveQuality < 0.3) {
        this.sayPhrase('badMove');
      }
    }

    return move;
  }

  private selectMove(
    validMoves: ValidMove[],
    board: Board,
    state: GameState
  ): ValidMove | null {
    // Apply mistake rate
    if (Math.random() * 100 < this.currentPersonality.mistakeRate) {
      return this.makeRandomMove(validMoves);
    }

    // Score each move based on personality
    const scoredMoves = validMoves.map(move => ({
      move,
      score: this.scoreMove(move, board, state)
    }));

    // Sort by score
    scoredMoves.sort((a, b) => b.score - a.score);

    // Apply skill level variance
    const skillVariance = (100 - this.currentPersonality.skillLevel) / 100;
    const maxIndex = Math.min(
      Math.floor(validMoves.length * skillVariance) + 1,
      validMoves.length
    );

    // Select from top moves based on skill
    const selectedIndex = Math.floor(Math.random() * maxIndex);
    return scoredMoves[selectedIndex]?.move || null;
  }

  private scoreMove(move: ValidMove, board: Board, state: GameState): number {
    let score = move.score || 0;

    // Apply personality modifiers
    const aggMod = this.currentPersonality.aggressiveness / 100;
    const defMod = this.currentPersonality.defensiveness / 100;

    // Aggressive players prefer high-scoring moves
    score += score * aggMod;

    // Defensive players prefer blocking moves
    const blockingPotential = this.calculateBlockingPotential(move, state);
    score += blockingPotential * defMod * 50;

    // Add pattern recognition bonus
    const patternBonus = this.recognizePattern(move, board);
    score += patternBonus * (this.currentPersonality.skillLevel / 100);

    // Consider opponent's previous moves
    const counterPlayBonus = this.analyzeOpponentStyle(move, state);
    score += counterPlayBonus * (this.currentPersonality.skillLevel / 100);

    // Endgame awareness
    if (this.isEndgame(state)) {
      const endgameBonus = this.evaluateEndgamePosition(move, state);
      score += endgameBonus * (this.currentPersonality.skillLevel / 50);
    }

    return score;
  }

  private calculateBlockingPotential(move: ValidMove, state: GameState): number {
    // Simplified blocking calculation
    // In real implementation, would check opponent's tiles
    return Math.random() * 30;
  }

  private recognizePattern(move: ValidMove, board: Board): number {
    // Pattern recognition for experienced players
    // Would implement actual pattern matching
    return Math.random() * 20 * (this.currentPersonality.skillLevel / 100);
  }

  private analyzeOpponentStyle(move: ValidMove, state: GameState): number {
    // Analyze opponent's playing style from history
    // Adapt strategy accordingly
    const opponentId = 'player'; // Would get actual opponent ID
    const history = this.opponentMoves.get(opponentId) || [];

    if (history.length < 5) return 0;

    // Simple analysis - would be more complex
    const aggressiveCount = history.filter(m => m.score > 10).length;
    const defensiveCount = history.filter(m => m.blocking).length;

    if (aggressiveCount > defensiveCount) {
      // Opponent is aggressive, play defensive
      return this.currentPersonality.defensiveness / 5;
    } else {
      // Opponent is defensive, play aggressive
      return this.currentPersonality.aggressiveness / 5;
    }
  }

  private isEndgame(state: GameState): boolean {
    const totalTiles = state.players.reduce((sum, p) => sum + p.hand.length, 0);
    return totalTiles < 10;
  }

  private evaluateEndgamePosition(move: ValidMove, state: GameState): number {
    // Endgame evaluation
    // Prioritize moves that lead to winning
    return Math.random() * 30;
  }

  private makeRandomMove(validMoves: ValidMove[]): ValidMove {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  private evaluateMoveQuality(move: ValidMove, allMoves: ValidMove[]): number {
    const maxScore = Math.max(...allMoves.map(m => m.score || 0));
    const moveScore = move.score || 0;
    return maxScore > 0 ? moveScore / maxScore : 0.5;
  }

  private recordMove(move: ValidMove | null, state: GameState): void {
    if (!move) return;

    this.moveHistory.push({
      move,
      gameState: this.compressGameState(state),
      timestamp: Date.now()
    });

    // Learn from patterns
    this.updateLearningData(move, state);
  }

  private compressGameState(state: GameState): any {
    // Compress game state for storage
    return {
      round: state.round,
      scores: state.players.map(p => p.score),
      handSizes: state.players.map(p => p.hand.length)
    };
  }

  private updateLearningData(move: ValidMove, state: GameState): void {
    // Simple learning - track successful patterns
    const pattern = this.extractPattern(move, state);
    const currentValue = this.learningData.get(pattern) || 0;
    this.learningData.set(pattern, currentValue + (move.score || 0));
  }

  private extractPattern(move: ValidMove, state: GameState): string {
    // Extract pattern from move and state
    return `${move.tile.left}-${move.tile.right}-${move.position}`;
  }

  public sayPhrase(category: keyof AIPersonality['phrases']): void {
    const phrases = this.currentPersonality.phrases[category];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    this.emit('speak', {
      text: phrase,
      emotion: category,
      avatar: this.currentPersonality.avatar
    });
  }

  public sendEmote(): void {
    const emotes = this.currentPersonality.emotes;
    const emote = emotes[Math.floor(Math.random() * emotes.length)];

    this.emit('emote', {
      emote,
      avatar: this.currentPersonality.avatar
    });
  }

  public reactToOpponentMove(move: any, isGoodForOpponent: boolean): void {
    // React to opponent's moves
    if (isGoodForOpponent) {
      if (Math.random() > 0.7) {
        this.emit('speak', {
          text: 'Nice move!',
          emotion: 'impressed',
          avatar: this.currentPersonality.avatar
        });
      }
    }
  }

  public updateGameStatus(isWinning: boolean): void {
    // React to game status
    const category = isWinning ? 'winning' : 'losing';
    if (Math.random() > 0.8) {
      this.sayPhrase(category);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getPersonalities(): AIPersonality[] {
    return Array.from(this.personalities.values());
  }

  public getCurrentPersonality(): AIPersonality {
    return this.currentPersonality;
  }

  public getStats(): any {
    return {
      movesPlayed: this.moveHistory.length,
      patternsLearned: this.learningData.size,
      personality: this.currentPersonality.name,
      skillLevel: this.currentPersonality.skillLevel
    };
  }
}