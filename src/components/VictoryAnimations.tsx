import React, { useEffect, useState } from 'react';

interface VictoryAnimationsProps {
  winType: string;
  result: string;
  variant: string;
  streak: number;
}

export const VictoryAnimations: React.FC<VictoryAnimationsProps> = ({
  winType,
  result,
  variant,
  streak
}) => {
  const [showFireworks, setShowFireworks] = useState(false);
  const [showDominoChain, setShowDominoChain] = useState(false);
  const [showStreakFire, setShowStreakFire] = useState(false);

  useEffect(() => {
    // Trigger animations based on win type
    if (winType === 'six-love') {
      setShowFireworks(true);
    }

    if (winType === 'block') {
      setShowDominoChain(true);
    }

    if (streak >= 5) {
      setShowStreakFire(true);
    }
  }, [winType, streak]);

  // Standard confetti for wins
  if (result === 'win') {
    return (
      <>
        {/* Lightweight Confetti */}
        <div className="confetti-container">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                backgroundColor: ['#ffd700', '#00d4ff', '#ff6b6b', '#4ecdc4', '#a855f7'][i % 5]
              }}
            />
          ))}
        </div>

        {/* Six-Love Fireworks */}
        {showFireworks && (
          <>
            <div className="fireworks-container">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="firework"
                  style={{
                    left: `${20 + i * 15}%`,
                    animationDelay: `${i * 0.3}s`
                  }}
                >
                  <div className="explosion">
                    {[...Array(12)].map((_, j) => (
                      <span
                        key={j}
                        className="spark"
                        style={{
                          transform: `rotate(${j * 30}deg) translateX(100px)`
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="six-love-banner">
              <div className="banner-text">
                <span className="banner-icon">💀</span>
                SIX-LOVE!
                <span className="banner-icon">💀</span>
              </div>
              <div className="banner-subtitle">TOTAL DOMINATION!</div>
            </div>
          </>
        )}

        {/* Block Win Animation */}
        {showDominoChain && (
          <div className="block-animation-container">
            <div className="domino-chain">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="domino-tile-anim"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    left: `${10 + i * 12}%`
                  }}
                >
                  <div className="domino-lock">🔒</div>
                </div>
              ))}
            </div>
            <div className="block-message">BLOCKED!</div>
          </div>
        )}

        {/* Streak Fire Animation */}
        {showStreakFire && (
          <div className="streak-fire-container">
            <div className="fire-trail">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="flame"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random()}s`
                  }}
                >
                  🔥
                </div>
              ))}
            </div>
            <div className="streak-banner">
              <span className="streak-number">{streak}</span>
              <span className="streak-text">WIN STREAK!</span>
            </div>
          </div>
        )}

        {/* Trophy Spin Animation */}
        <div className="trophy-celebration">
          <div className="trophy-spin">🏆</div>
        </div>

        {/* Stars Animation */}
        <div className="stars-container">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="star"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            >
              ⭐
            </div>
          ))}
        </div>
      </>
    );
  }

  // Defeat animation
  if (result === 'loss') {
    return (
      <div className="defeat-animation">
        <div className="rain-container">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="raindrop"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
        <div className="defeat-overlay" />
      </div>
    );
  }

  // Draw animation
  if (result === 'draw') {
    return (
      <div className="draw-animation">
        <div className="handshake-icon">🤝</div>
      </div>
    );
  }

  return null;
};