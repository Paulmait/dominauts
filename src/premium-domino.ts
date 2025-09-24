import { PremiumDominoGame } from './game/PremiumDominoGame';
import './styles/premium-game.css';

// Initialize the premium domino game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  // Initialize game
  const game = new PremiumDominoGame('game-canvas');

  // Handle window resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  // Prevent context menu on right click
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Handle page visibility changes (for pausing)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Pause game when tab is hidden
      (game as any).gameEngine?.pause();
    } else {
      // Resume game when tab is visible
      (game as any).gameEngine?.resume();
    }
  });

  // Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful');
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  }

  // Add to global for debugging
  (window as any).dominoGame = game;
});