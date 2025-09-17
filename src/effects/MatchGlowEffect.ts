/**
 * Match Glow Effect System
 * Provides visual feedback for successful tile placements
 */

export class MatchGlowEffect {
  private readonly GLOW_DURATION = 600; // ms
  private readonly GLOW_COLOR = '#4CAF50'; // Success green
  private readonly PERFECT_MATCH_COLOR = '#FFD700'; // Gold for perfect matches
  private readonly COMBO_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

  /**
   * Apply glow effect to matched tile
   */
  public applyMatchGlow(
    element: HTMLElement,
    matchQuality: 'good' | 'perfect' | 'combo',
    score?: number
  ): void {
    // Remove any existing animations
    element.style.animation = '';

    // Choose color based on match quality
    const glowColor = this.getGlowColor(matchQuality);

    // Apply the glow effect
    element.style.boxShadow = `
      0 0 20px ${glowColor},
      0 0 40px ${glowColor}80,
      0 0 60px ${glowColor}40,
      inset 0 0 15px ${glowColor}20
    `;

    // Add pulsing animation
    element.style.animation = `matchGlow ${this.GLOW_DURATION}ms ease-out`;

    // Show score popup if provided
    if (score) {
      this.showScorePopup(element, score, matchQuality);
    }

    // Add haptic feedback for mobile
    this.triggerHaptic(matchQuality);

    // Clean up after animation
    setTimeout(() => {
      element.style.boxShadow = '';
      element.style.animation = '';
    }, this.GLOW_DURATION);
  }

  /**
   * Create ripple effect at match point
   */
  public createRippleEffect(x: number, y: number, color?: string): void {
    const ripple = document.createElement('div');
    ripple.className = 'match-ripple';
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${color || this.GLOW_COLOR};
      transform: translate(-50%, -50%) scale(0);
      opacity: 0.8;
      pointer-events: none;
      z-index: 1000;
    `;

    document.body.appendChild(ripple);

    // Animate ripple
    requestAnimationFrame(() => {
      ripple.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      ripple.style.transform = 'translate(-50%, -50%) scale(10)';
      ripple.style.opacity = '0';
    });

    // Remove after animation
    setTimeout(() => ripple.remove(), 600);
  }

  /**
   * Show floating score indicator
   */
  private showScorePopup(
    element: HTMLElement,
    score: number,
    quality: string
  ): void {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${score}`;

    // Style based on quality
    const colors = {
      good: '#4CAF50',
      perfect: '#FFD700',
      combo: '#FF6B6B'
    };

    popup.style.cssText = `
      position: absolute;
      color: ${colors[quality] || colors.good};
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      animation: floatUp 1s ease-out forwards;
      pointer-events: none;
      z-index: 1001;
    `;

    // Position above element
    const rect = element.getBoundingClientRect();
    popup.style.left = `${rect.left + rect.width / 2}px`;
    popup.style.top = `${rect.top}px`;

    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
  }

  /**
   * Trigger haptic feedback on supported devices
   */
  private triggerHaptic(quality: string): void {
    if ('vibrate' in navigator) {
      const patterns = {
        good: [10, 20, 10], // Light double tap
        perfect: [20, 10, 20, 10, 30], // Celebratory pattern
        combo: [15, 10, 15, 10, 15, 10, 20] // Rapid succession
      };

      navigator.vibrate(patterns[quality] || patterns.good);
    }

    // iOS Haptic Feedback (if available)
    if (window.webkit?.messageHandlers?.haptic) {
      window.webkit.messageHandlers.haptic.postMessage(quality);
    }
  }

  /**
   * Get glow color based on match quality
   */
  private getGlowColor(quality: string): string {
    switch (quality) {
      case 'perfect': return this.PERFECT_MATCH_COLOR;
      case 'combo': return this.COMBO_COLORS[Math.floor(Math.random() * this.COMBO_COLORS.length)];
      default: return this.GLOW_COLOR;
    }
  }

  /**
   * Initialize CSS animations
   */
  public initializeStyles(): void {
    if (document.getElementById('match-glow-styles')) return;

    const style = document.createElement('style');
    style.id = 'match-glow-styles';
    style.textContent = `
      @keyframes matchGlow {
        0% {
          filter: brightness(1) saturate(1);
          transform: scale(1);
        }
        50% {
          filter: brightness(1.3) saturate(1.5);
          transform: scale(1.05);
        }
        100% {
          filter: brightness(1) saturate(1);
          transform: scale(1);
        }
      }

      @keyframes floatUp {
        0% {
          transform: translateY(0) scale(0.5);
          opacity: 0;
        }
        50% {
          transform: translateY(-30px) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateY(-60px) scale(0.8);
          opacity: 0;
        }
      }

      .match-highlight {
        animation: matchGlow 0.6s ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        .match-highlight,
        .match-ripple,
        .score-popup {
          animation: none !important;
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

// Singleton instance
export const matchGlowEffect = new MatchGlowEffect();