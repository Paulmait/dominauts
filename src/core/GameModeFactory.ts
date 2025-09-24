import { GameMode } from './modes/GameMode';
import { BlockDominoes } from '../modes/BlockDominoes';
import { AllFives } from '../modes/AllFives';
import { ChickenFoot } from '../modes/ChickenFoot';
import { CutthroatDominoes } from '../modes/CutthroatDominoes';
import { PartnerDominoes } from '../modes/PartnerDominoes';
import { SixLoveDominoes } from '../modes/SixLoveDominoes';
import { CrossDominoes } from '../modes/CrossDominoes';
import { DrawDominoes } from '../modes/DrawDominoes';
import { EventEmitter } from './utils/EventEmitter';

export class GameModeFactory {
  static createGameMode(modeId: string, events?: EventEmitter): GameMode {
    switch (modeId.toLowerCase()) {
      case 'block':
        return new BlockDominoes();

      case 'cuba':
        return new BlockDominoes('cuba');

      case 'allfives':
      case 'all-fives':
      case 'muggins':
        return new AllFives();

      case 'chicken':
      case 'chickenfoot':
      case 'chicken-foot':
        return new ChickenFoot();

      case 'cutthroat':
      case 'three-hand':
        return new CutthroatDominoes();

      case 'partner':
      case 'four-hand':
      case 'partnership':
        return new PartnerDominoes();

      case 'sixlove':
      case 'six-love':
      case '6-love':
        return new SixLoveDominoes(events);

      case 'cross':
      case 'cross-dominoes':
        return new CrossDominoes();

      case 'draw':
      case 'draw-dominoes':
        return new DrawDominoes();

      default:
        console.warn(`Unknown game mode: ${modeId}, defaulting to Block Dominoes`);
        return new BlockDominoes();
    }
  }

  static getAvailableModes(): string[] {
    return [
      'block',
      'cutthroat',
      'partner',
      'sixlove',
      'cross',
      'draw',
      'cuba',
      'allfives',
      'chicken'
    ];
  }

  static getModeInfo(modeId: string): {
    name: string;
    description: string;
    playerCount: string;
    difficulty: string;
    canDraw: boolean;
    maxScore?: number;
  } {
    switch (modeId.toLowerCase()) {
      case 'block':
        return {
          name: 'Block Dominoes',
          description: 'Classic dominoes - no drawing, pass if you cannot play',
          playerCount: '2-4 players',
          difficulty: 'Easy',
          canDraw: false
        };

      case 'cutthroat':
        return {
          name: 'Cutthroat Dominoes',
          description: 'Three-player individual competition - no partnerships',
          playerCount: '3 players',
          difficulty: 'Medium',
          canDraw: false
        };

      case 'partner':
        return {
          name: 'Partner Dominoes',
          description: 'Traditional four-player format with two teams of two',
          playerCount: '4 players (2 teams)',
          difficulty: 'Medium',
          canDraw: false,
          maxScore: 150
        };

      case 'sixlove':
        return {
          name: 'Six-Love Dominoes',
          description: 'Jamaican rules - win six games straight for a "six love"',
          playerCount: '4 players (2 teams)',
          difficulty: 'Hard',
          canDraw: false,
          maxScore: 150
        };

      case 'cross':
        return {
          name: 'Cross Dominoes',
          description: 'Play extends in four directions from the center double',
          playerCount: '2-4 players',
          difficulty: 'Hard',
          canDraw: false
        };

      case 'draw':
        return {
          name: 'Draw Dominoes',
          description: 'Fast-paced variant - draw from boneyard until you can play',
          playerCount: '2-4 players',
          difficulty: 'Easy',
          canDraw: true
        };

      case 'cuba':
        return {
          name: 'Cuban Block Dominoes',
          description: 'Team-based block dominoes with double-nine set',
          playerCount: '4 players (2 teams)',
          difficulty: 'Medium',
          canDraw: false
        };

      case 'allfives':
        return {
          name: 'All Fives (Muggins)',
          description: 'Score points when the board ends add up to multiples of 5',
          playerCount: '2-4 players',
          difficulty: 'Medium',
          canDraw: true,
          maxScore: 150
        };

      case 'chicken':
        return {
          name: 'Chicken Foot',
          description: 'Create a chicken foot pattern with special double tile rules',
          playerCount: '2-8 players',
          difficulty: 'Hard',
          canDraw: true
        };

      default:
        return {
          name: 'Block Dominoes',
          description: 'Classic dominoes',
          playerCount: '2-4 players',
          difficulty: 'Easy',
          canDraw: false
        };
    }
  }

  static getPlayerCountForMode(modeId: string): number {
    switch (modeId.toLowerCase()) {
      case 'cutthroat':
        return 3;
      case 'partner':
      case 'sixlove':
      case 'cuba':
        return 4;
      default:
        return 4;
    }
  }

  static isTeamMode(modeId: string): boolean {
    return ['partner', 'sixlove', 'cuba'].includes(modeId.toLowerCase());
  }
}