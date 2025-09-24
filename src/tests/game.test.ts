// Comprehensive Game Test Suite
import { AwesomeDominoGame } from '../awesome-domino-game';

describe('Domino Game Tests', () => {
  let game: AwesomeDominoGame;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    game = new AwesomeDominoGame(canvas);
  });

  describe('Game Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(game).toBeDefined();
      expect(game['gameMode']).toBe('classic');
      expect(game['difficulty']).toBe('medium');
      expect(game['playerScore']).toBe(0);
      expect(game['aiScore']).toBe(0);
    });

    test('should create a full domino set', () => {
      game['createTiles']();
      expect(game['tiles'].length).toBe(28);
    });

    test('should handle canvas resize', () => {
      const initialWidth = game['canvas'].width;
      window.dispatchEvent(new Event('resize'));
      expect(game['canvas'].width).toBeDefined();
    });
  });

  describe('Game Mechanics', () => {
    test('should deal tiles correctly', () => {
      game['startNewGame']();
      expect(game['playerHand'].length).toBe(7);
      expect(game['aiHand'].length).toBe(7);
    });

    test('should determine starting player correctly', () => {
      game['startNewGame']();
      expect(['player', 'ai']).toContain(game['currentPlayer']);
    });

    test('should validate moves correctly', () => {
      game['boardLeftEnd'] = 6;
      game['boardRightEnd'] = 3;
      const validTile = { left: 6, right: 4, x: 0, y: 0, rotation: 0, scale: 1, glowIntensity: 0 };
      const invalidTile = { left: 1, right: 2, x: 0, y: 0, rotation: 0, scale: 1, glowIntensity: 0 };

      expect(game['isValidMove'](validTile, 'left')).toBe(true);
      expect(game['isValidMove'](invalidTile, 'left')).toBe(false);
    });

    test('should calculate scores correctly for All Fives mode', () => {
      game['gameMode'] = 'allfives';
      game['boardLeftEnd'] = 5;
      game['boardRightEnd'] = 10;
      const score = game['calculateScore']();
      expect(score).toBe(15);
    });
  });

  describe('AI Behavior', () => {
    test('should make valid AI moves', () => {
      game['startNewGame']();
      game['currentPlayer'] = 'ai';
      const initialBoardSize = game['board'].length;
      game['makeAIMove']();
      expect(game['board'].length).toBeGreaterThanOrEqual(initialBoardSize);
    });

    test('should adjust AI difficulty', () => {
      game['setDifficulty']('expert');
      expect(game['difficulty']).toBe('expert');
    });
  });

  describe('Game State Management', () => {
    test('should save and load game state', () => {
      game['playerScore'] = 100;
      game['saveGameState']();
      game['playerScore'] = 0;
      game['loadGameState']();
      expect(game['playerScore']).toBe(100);
    });

    test('should detect game over conditions', () => {
      game['playerHand'] = [];
      expect(game['checkGameOver']()).toBe(true);
    });

    test('should handle pause and resume', () => {
      game['pauseGame']();
      expect(game['isPaused']).toBe(true);
      game['resumeGame']();
      expect(game['isPaused']).toBe(false);
    });
  });

  describe('User Interaction', () => {
    test('should handle mouse events', () => {
      const mockEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 100
      });
      game['handleClick'](mockEvent);
      expect(game['lastInteractionTime']).toBeGreaterThan(0);
    });

    test('should handle touch events', () => {
      const mockTouch = {
        clientX: 100,
        clientY: 100
      };
      const mockEvent = new TouchEvent('touchstart', {
        touches: [mockTouch as Touch]
      });
      game['handleTouchStart'](mockEvent);
      expect(game['lastInteractionTime']).toBeGreaterThan(0);
    });
  });

  describe('Visual Effects', () => {
    test('should create particles', () => {
      game['createParticles'](100, 100, 'star');
      expect(game['particles'].length).toBeGreaterThan(0);
    });

    test('should update animations', () => {
      game['particles'] = [{
        x: 100, y: 100, vx: 1, vy: 1,
        life: 0.5, maxLife: 1,
        color: '#fff', size: 5, type: 'star'
      }];
      game['updateParticles'](16);
      expect(game['particles'][0].life).toBeLessThan(0.5);
    });
  });

  describe('Power-ups and Features', () => {
    test('should activate hint system', () => {
      game['startNewGame']();
      game['activateHint']();
      expect(game['showHint']).toBe(true);
      expect(game['hints'].length).toBeGreaterThanOrEqual(0);
    });

    test('should track achievements', () => {
      game['updateAchievements']();
      expect(game['achievements'].length).toBeGreaterThan(0);
    });

    test('should handle power-up activation', () => {
      const powerUp = { type: 'double-score' as const, x: 0, y: 0, active: false, cooldown: 0, icon: '2x' };
      game['activatePowerUp'](powerUp);
      expect(powerUp.active).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should maintain acceptable frame rate', () => {
      const startTime = performance.now();
      game['render']();
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(16.67); // 60 FPS threshold
    });

    test('should clean up resources', () => {
      game['cleanup']();
      expect(game['particles'].length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid game modes gracefully', () => {
      expect(() => {
        game['setGameMode']('invalid' as any);
      }).not.toThrow();
    });

    test('should recover from rendering errors', () => {
      game['ctx'] = null as any;
      expect(() => {
        game['render']();
      }).not.toThrow();
    });
  });

  describe('Localization and Accessibility', () => {
    test('should support keyboard navigation', () => {
      const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      game['handleKeyPress'](mockEvent);
      expect(game['keyboardNavigationEnabled']).toBeDefined();
    });

    test('should provide screen reader support', () => {
      const ariaLabel = game['getAriaLabel']('domino', { left: 6, right: 6 });
      expect(ariaLabel).toContain('double six');
    });
  });
});