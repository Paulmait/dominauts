import React, { useState, useEffect } from 'react';
import { GameHistoryRecord, Achievement, GameVariant, WinType } from '../services/game-history-service';
import { firebaseAuth, UserProfile } from '../services/firebase-auth';
import { SignUpCTA } from './SignUpCTA';

interface VictoryScreenProps {
  gameResult: GameHistoryRecord;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onViewStats: () => void;
  isVisible: boolean;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  gameResult,
  onPlayAgain,
  onMainMenu,
  onViewStats,
  isVisible
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [showSignUpCTA, setShowSignUpCTA] = useState(false);
  const [animationStage, setAnimationStage] = useState(0);

  useEffect(() => {
    setUserProfile(firebaseAuth.getUserProfile());

    // Check if should show sign-up CTA for guests
    if (!firebaseAuth.isAuthenticated() && gameResult.result === 'win') {
      setTimeout(() => setShowSignUpCTA(true), 3000);
    }
  }, [gameResult]);

  useEffect(() => {
    if (isVisible) {
      // Animate elements in sequence
      const timers = [
        setTimeout(() => setAnimationStage(1), 100),
        setTimeout(() => setAnimationStage(2), 500),
        setTimeout(() => setAnimationStage(3), 900),
        setTimeout(() => setAnimationStage(4), 1300)
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      setAnimationStage(0);
    }
  }, [isVisible]);

  const getVariantBadge = (variant: GameVariant): { text: string; color: string; icon: string } => {
    const badges: Record<GameVariant, { text: string; color: string; icon: string }> = {
      classic: { text: 'Classic Victory', color: '#00d4ff', icon: '🎯' },
      allfives: { text: 'All Fives Master', color: '#ffd700', icon: '⭐' },
      block: { text: 'Block Champion', color: '#ff6b6b', icon: '🛡️' },
      draw: { text: 'Draw Winner', color: '#4ecdc4', icon: '🎴' },
      mexican: { text: 'Mexican Train Conductor', color: '#ff9f43', icon: '🚂' },
      cutthroat: { text: 'Cutthroat Dominator', color: '#ee5a6f', icon: '⚔️' },
      partner: { text: 'Perfect Partnership', color: '#a855f7', icon: '🤝' }
    };
    return badges[variant];
  };

  const getWinTypeMessage = (winType: WinType): string => {
    const messages: Record<WinType, string> = {
      normal: 'Victory!',
      block: 'Blocked to Victory!',
      'six-love': 'Six-Love Domination!',
      domination: 'Total Domination!',
      comeback: 'Epic Comeback!',
      perfect: 'Perfect Game!',
      timeout: 'Won by Timeout',
      forfeit: 'Opponent Forfeited'
    };
    return messages[winType];
  };

  const getResultColor = (result: string): string => {
    switch (result) {
      case 'win': return '#10b981';
      case 'loss': return '#ef4444';
      case 'draw': return '#f59e0b';
      default: return '#888';
    }
  };

  const calculateLevelProgress = (): { current: number; next: number; progress: number } => {
    if (!userProfile) {
      return { current: 0, next: 1000, progress: 0 };
    }

    const currentLevel = Math.floor(userProfile.xp / 1000);
    const currentLevelXP = currentLevel * 1000;
    const nextLevelXP = (currentLevel + 1) * 1000;
    const progress = ((userProfile.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    return {
      current: userProfile.xp,
      next: nextLevelXP,
      progress
    };
  };

  const shareMatch = async (method: 'copy' | 'screenshot') => {
    if (method === 'copy') {
      const shareText = generateShareText();
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    } else if (method === 'screenshot') {
      // In a real implementation, this would capture canvas and share
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Dominauts Victory!',
            text: generateShareText(),
            url: window.location.href
          });
        } catch (err) {
          console.error('Share failed:', err);
        }
      }
    }
    setShowShareMenu(false);
  };

  const generateShareText = (): string => {
    const badge = getVariantBadge(gameResult.variant);
    return `🎮 Dominauts ${badge.text}!\n\n` +
           `${badge.icon} ${getWinTypeMessage(gameResult.winType)}\n` +
           `📊 Score: ${gameResult.finalScoreUser} - ${gameResult.finalScoreAI}\n` +
           `⏱️ Time: ${formatTime(gameResult.timePlayed)}\n` +
           `🔥 Streak: ${gameResult.streakCount}\n` +
           `⭐ XP Earned: +${gameResult.xpEarned}\n\n` +
           `Play now at ${window.location.origin}`;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (showSignUpCTA && !userProfile) {
    return (
      <SignUpCTA
        isOpen={true}
        onClose={() => setShowSignUpCTA(false)}
        onSignUp={(profile) => {
          setUserProfile(profile);
          setShowSignUpCTA(false);
        }}
        trigger="game-end"
      />
    );
  }

  if (!isVisible) return null;

  const badge = getVariantBadge(gameResult.variant);
  const levelProgress = calculateLevelProgress();

  return (
    <div className="victory-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="victory-screen">
        {/* Confetti Background Effect */}
        {gameResult.result === 'win' && (
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: ['#ffd700', '#00d4ff', '#ff6b6b', '#4ecdc4'][i % 4]
                }}
              />
            ))}
          </div>
        )}

        {/* Victory Header */}
        <div className={`victory-header ${animationStage >= 1 ? 'animate-in' : ''}`}>
          <div className="result-badge" style={{ color: getResultColor(gameResult.result) }}>
            {gameResult.result === 'win' ? '🏆' : gameResult.result === 'loss' ? '😔' : '🤝'}
            <span className="result-text">
              {gameResult.result === 'win' ? 'VICTORY!' : gameResult.result === 'loss' ? 'DEFEAT' : 'DRAW'}
            </span>
          </div>

          <div className="variant-badge" style={{ backgroundColor: badge.color }}>
            <span className="badge-icon">{badge.icon}</span>
            <span className="badge-text">{badge.text}</span>
          </div>

          {gameResult.winType !== 'normal' && (
            <div className="win-type-badge">
              {getWinTypeMessage(gameResult.winType)}
            </div>
          )}
        </div>

        {/* Scoreboard Summary */}
        <div className={`scoreboard-summary ${animationStage >= 2 ? 'animate-in' : ''}`}>
          <div className="score-display">
            <div className="player-score">
              <div className="player-info">
                {userProfile ? (
                  <>
                    <img
                      src={userProfile.photoURL || avatarService.generateAvatarUrl(userProfile.displayName)}
                      alt="You"
                      className="player-avatar"
                    />
                    <span className="player-name">{userProfile.displayName}</span>
                  </>
                ) : (
                  <>
                    <div className="player-avatar guest">👤</div>
                    <span className="player-name">You</span>
                  </>
                )}
              </div>
              <div className="score-value">{gameResult.finalScoreUser}</div>
            </div>

            <div className="vs-separator">VS</div>

            <div className="ai-score">
              <div className="player-info">
                <div className="player-avatar ai">🤖</div>
                <span className="player-name">AI ({gameResult.difficulty})</span>
              </div>
              <div className="score-value">{gameResult.finalScoreAI}</div>
            </div>
          </div>

          <div className="match-stats">
            <div className="stat-item">
              <span className="stat-label">Time</span>
              <span className="stat-value">{formatTime(gameResult.timePlayed)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Moves</span>
              <span className="stat-value">{gameResult.movesMade}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Streak</span>
              <span className="stat-value">🔥 {gameResult.streakCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pips Left</span>
              <span className="stat-value">{gameResult.pipsAI}</span>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        {gameResult.achievements.length > 0 && (
          <div className={`achievements-section ${animationStage >= 3 ? 'animate-in' : ''}`}>
            <h3 className="section-title">🎖️ Achievements Unlocked</h3>
            <div className="achievements-grid">
              {gameResult.achievements.map((achievement, index) => (
                <div
                  key={achievement.id}
                  className={`achievement-card ${achievement.rarity}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-info">
                    <div className="achievement-name">{achievement.name}</div>
                    <div className="achievement-desc">{achievement.description}</div>
                    <div className="achievement-reward">+{achievement.xpReward} XP</div>
                  </div>
                  <div className={`rarity-badge ${achievement.rarity}`}>
                    {achievement.rarity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* XP Progress Bar */}
        <div className={`xp-section ${animationStage >= 4 ? 'animate-in' : ''}`}>
          <div className="xp-earned">
            <span className="xp-label">XP Earned</span>
            <span className="xp-value">+{gameResult.xpEarned}</span>
            {gameResult.coinsEarned > 0 && (
              <span className="coins-earned">
                <span className="coin-icon">💰</span>
                +{gameResult.coinsEarned}
              </span>
            )}
          </div>

          {userProfile ? (
            <div className="level-progress">
              <div className="progress-info">
                <span className="level-label">Level {Math.floor(userProfile.xp / 1000)}</span>
                <span className="xp-label">
                  {levelProgress.current} / {levelProgress.next} XP
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${levelProgress.progress}%` }}
                >
                  <div className="progress-glow" />
                </div>
              </div>
            </div>
          ) : (
            <div className="guest-xp-notice">
              <p>⚠️ Sign up to save your {gameResult.xpEarned} XP!</p>
            </div>
          )}
        </div>

        {/* Bonuses Section */}
        {gameResult.bonuses && gameResult.bonuses.length > 0 && (
          <div className="bonuses-section">
            <h4>Bonuses Applied</h4>
            {gameResult.bonuses.map((bonus, index) => (
              <div key={index} className="bonus-item">
                <span>{bonus.description}</span>
                <span className="bonus-value">×{bonus.multiplier}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="victory-actions">
          <button
            className="victory-btn primary"
            onClick={onPlayAgain}
          >
            <span className="btn-icon">🎮</span>
            Play Again
          </button>

          <button
            className="victory-btn secondary"
            onClick={onMainMenu}
          >
            <span className="btn-icon">🏠</span>
            Main Menu
          </button>

          <button
            className="victory-btn secondary"
            onClick={onViewStats}
          >
            <span className="btn-icon">📊</span>
            View Stats
          </button>

          <div className="share-container">
            <button
              className="victory-btn share"
              onClick={() => setShowShareMenu(!showShareMenu)}
            >
              <span className="btn-icon">📤</span>
              Share
            </button>

            {showShareMenu && (
              <div className="share-menu">
                <button onClick={() => shareMatch('copy')}>
                  {copiedToClipboard ? '✅ Copied!' : '📋 Copy Result'}
                </button>
                {navigator.share && (
                  <button onClick={() => shareMatch('screenshot')}>
                    📸 Share Screenshot
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Guest CTA */}
        {!userProfile && (
          <div className="guest-cta-footer">
            <p>💡 Sign up to save your progress and compete on leaderboards!</p>
            <button
              className="sign-up-btn"
              onClick={() => setShowSignUpCTA(true)}
            >
              Sign Up Free
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Import avatar service
import { avatarService } from '../services/avatar-service';