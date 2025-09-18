import React, { useState, useEffect } from 'react';
import { GameHistoryRecord, Achievement, GameVariant, WinType, gameHistoryService } from '../services/game-history-service';
import { firebaseAuth, UserProfile, LeaderboardEntry } from '../services/firebase-auth';
import { SignUpCTA } from './SignUpCTA';
import { VictoryAnimations } from './VictoryAnimations';

interface EnhancedVictoryScreenProps {
  gameResult: GameHistoryRecord;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onViewStats: () => void;
  isVisible: boolean;
}

interface PlayerRank {
  global: number | null;
  variant: number | null;
  difficulty: number | null;
  totalPlayers: number;
}

export const EnhancedVictoryScreen: React.FC<EnhancedVictoryScreenProps> = ({
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
  const [playerRank, setPlayerRank] = useState<PlayerRank | null>(null);
  const [showAnimations, setShowAnimations] = useState(true);

  useEffect(() => {
    setUserProfile(firebaseAuth.getUserProfile());

    // Load player ranking
    loadPlayerRank();

    // Check if should show sign-up CTA for guests
    if (!firebaseAuth.isAuthenticated() && gameResult.result === 'win') {
      setTimeout(() => setShowSignUpCTA(true), 4000);
    }
  }, [gameResult]);

  useEffect(() => {
    if (isVisible) {
      // Animate elements in sequence
      const timers = [
        setTimeout(() => setAnimationStage(1), 100),
        setTimeout(() => setAnimationStage(2), 500),
        setTimeout(() => setAnimationStage(3), 900),
        setTimeout(() => setAnimationStage(4), 1300),
        setTimeout(() => setAnimationStage(5), 1700)
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      setAnimationStage(0);
    }
  }, [isVisible]);

  const loadPlayerRank = async () => {
    if (!firebaseAuth.isAuthenticated()) return;

    try {
      const leaderboard = await firebaseAuth.getLeaderboard('global', 1000);
      const currentUserId = firebaseAuth.getCurrentUser()?.uid;

      if (currentUserId) {
        const globalRank = leaderboard.findIndex(entry => entry.uid === currentUserId) + 1;

        setPlayerRank({
          global: globalRank > 0 ? globalRank : null,
          variant: await getVariantRank(gameResult.variant),
          difficulty: await getDifficultyRank(gameResult.difficulty),
          totalPlayers: leaderboard.length
        });
      }
    } catch (error) {
      console.error('Failed to load player rank:', error);
    }
  };

  const getVariantRank = async (variant: string): Promise<number | null> => {
    // In a real implementation, this would query variant-specific leaderboards
    return Math.floor(Math.random() * 100) + 1;
  };

  const getDifficultyRank = async (difficulty: string): Promise<number | null> => {
    // In a real implementation, this would query difficulty-specific leaderboards
    return Math.floor(Math.random() * 50) + 1;
  };

  const getVictoryMessage = (winType: WinType, result: string): { title: string; subtitle: string; color: string } => {
    if (result === 'loss') {
      return {
        title: "Better Luck Next Time!",
        subtitle: "Don't give up! Every master was once a beginner.",
        color: '#ef4444'
      };
    }

    if (result === 'draw') {
      return {
        title: "It's a Draw!",
        subtitle: "Evenly matched! Try again to break the tie.",
        color: '#f59e0b'
      };
    }

    // Victory messages based on win type
    const messages: Record<WinType, { title: string; subtitle: string; color: string }> = {
      normal: {
        title: "Victory!",
        subtitle: "You reached the target score!",
        color: '#10b981'
      },
      block: {
        title: "Blocked Win!",
        subtitle: "Won by blocked game – fewer remaining pips!",
        color: '#3b82f6'
      },
      'six-love': {
        title: "Six-Love Domination!",
        subtitle: "You gave a Six-Love skunk! Total domination!",
        color: '#ffd700'
      },
      domination: {
        title: "Complete Domination!",
        subtitle: "You crushed your opponent!",
        color: '#dc2626'
      },
      comeback: {
        title: "Epic Comeback!",
        subtitle: "What a turnaround! Never give up!",
        color: '#8b5cf6'
      },
      perfect: {
        title: "Perfect Victory!",
        subtitle: "Flawless execution! Not a single mistake!",
        color: '#ec4899'
      },
      timeout: {
        title: "Time's Up!",
        subtitle: "Won by timeout - your opponent ran out of time!",
        color: '#64748b'
      },
      forfeit: {
        title: "Opponent Forfeited",
        subtitle: "Your opponent gave up!",
        color: '#6b7280'
      }
    };

    return messages[winType];
  };

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

  const calculateLevelProgress = (): { current: number; next: number; progress: number; justLeveled: boolean } => {
    if (!userProfile) {
      return { current: 0, next: 1000, progress: 0, justLeveled: false };
    }

    const oldXP = userProfile.xp - gameResult.xpEarned;
    const oldLevel = Math.floor(oldXP / 1000);
    const currentLevel = Math.floor(userProfile.xp / 1000);
    const currentLevelXP = currentLevel * 1000;
    const nextLevelXP = (currentLevel + 1) * 1000;
    const progress = ((userProfile.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    return {
      current: userProfile.xp,
      next: nextLevelXP,
      progress,
      justLeveled: currentLevel > oldLevel
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
    const message = getVictoryMessage(gameResult.winType, gameResult.result);

    let text = `🎮 Dominauts - ${message.title}\n\n`;
    text += `${badge.icon} ${badge.text}\n`;
    text += `📊 Score: ${gameResult.finalScoreUser} - ${gameResult.finalScoreAI}\n`;
    text += `⏱️ Time: ${formatTime(gameResult.timePlayed)}\n`;

    if (gameResult.streakCount > 0) {
      text += `🔥 Streak: ${gameResult.streakCount}\n`;
    }

    text += `⭐ XP Earned: +${gameResult.xpEarned}\n`;

    if (playerRank?.global) {
      text += `🏆 Global Rank: #${playerRank.global}\n`;
    }

    text += `\nPlay now at ${window.location.origin}`;

    return text;
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

  const victoryMessage = getVictoryMessage(gameResult.winType, gameResult.result);
  const badge = getVariantBadge(gameResult.variant);
  const levelProgress = calculateLevelProgress();

  return (
    <div className="victory-overlay" onClick={(e) => e.stopPropagation()}>
      <div className={`victory-screen ${gameResult.result}`}>
        {/* Victory Animations */}
        {showAnimations && (
          <VictoryAnimations
            winType={gameResult.winType}
            result={gameResult.result}
            variant={gameResult.variant}
            streak={gameResult.streakCount}
          />
        )}

        {/* Victory Header with Dynamic Messages */}
        <div className={`victory-header ${animationStage >= 1 ? 'animate-in' : ''}`}>
          <div className="result-badge" style={{ color: victoryMessage.color }}>
            {gameResult.result === 'win' && (
              <div className={`trophy-icon ${gameResult.winType === 'six-love' ? 'gold-spin' : 'spin'}`}>
                🏆
              </div>
            )}
            {gameResult.result === 'loss' && <div className="defeat-icon">😔</div>}
            {gameResult.result === 'draw' && <div className="draw-icon">🤝</div>}

            <h1 className="result-title" style={{ color: victoryMessage.color }}>
              {victoryMessage.title}
            </h1>
            <p className="result-subtitle">{victoryMessage.subtitle}</p>
          </div>

          <div className="variant-badge pulse" style={{ backgroundColor: badge.color }}>
            <span className="badge-icon">{badge.icon}</span>
            <span className="badge-text">{badge.text}</span>
          </div>

          {/* Streak Display */}
          {gameResult.streakCount > 2 && (
            <div className="streak-display flame">
              <span className="streak-icon">🔥</span>
              <span className="streak-count">{gameResult.streakCount} WIN STREAK!</span>
            </div>
          )}
        </div>

        {/* Scoreboard Summary */}
        <div className={`scoreboard-summary ${animationStage >= 2 ? 'animate-in' : ''}`}>
          <div className="score-display">
            <div className={`player-score ${gameResult.result === 'win' ? 'winner' : ''}`}>
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
              <div className="pips-remaining">
                <span className="pips-label">Pips left:</span>
                <span className="pips-value">{gameResult.pipsUser}</span>
              </div>
            </div>

            <div className="vs-separator">
              <span className="vs-text">VS</span>
              {gameResult.winType === 'block' && (
                <div className="block-animation">🔒</div>
              )}
            </div>

            <div className={`ai-score ${gameResult.result === 'loss' ? 'winner' : ''}`}>
              <div className="player-info">
                <div className="player-avatar ai">🤖</div>
                <span className="player-name">AI ({gameResult.difficulty})</span>
              </div>
              <div className="score-value">{gameResult.finalScoreAI}</div>
              <div className="pips-remaining">
                <span className="pips-label">Pips left:</span>
                <span className="pips-value">{gameResult.pipsAI}</span>
              </div>
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
              <span className="stat-label">Difficulty</span>
              <span className="stat-value">{gameResult.difficulty}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Variant</span>
              <span className="stat-value">{gameResult.variant}</span>
            </div>
          </div>
        </div>

        {/* Player Ranking */}
        {playerRank && (gameResult.result === 'win') && (
          <div className={`ranking-section ${animationStage >= 3 ? 'animate-in' : ''}`}>
            <h3 className="ranking-title">📊 Your Rankings</h3>
            <div className="ranking-grid">
              {playerRank.global && (
                <div className="rank-card">
                  <div className="rank-number">#{playerRank.global}</div>
                  <div className="rank-label">Global Rank</div>
                  <div className="rank-context">of {playerRank.totalPlayers} players</div>
                </div>
              )}
              {playerRank.variant && (
                <div className="rank-card">
                  <div className="rank-number">#{playerRank.variant}</div>
                  <div className="rank-label">{gameResult.variant} Rank</div>
                </div>
              )}
              {playerRank.difficulty && (
                <div className="rank-card">
                  <div className="rank-number">#{playerRank.difficulty}</div>
                  <div className="rank-label">{gameResult.difficulty} {gameResult.variant}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Achievements Section */}
        {gameResult.achievements.length > 0 && (
          <div className={`achievements-section ${animationStage >= 4 ? 'animate-in' : ''}`}>
            <h3 className="section-title">🎖️ Achievements Unlocked</h3>
            <div className="achievements-grid">
              {gameResult.achievements.map((achievement, index) => (
                <div
                  key={achievement.id}
                  className={`achievement-card ${achievement.rarity} pop-in`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="achievement-icon bounce">{achievement.icon}</div>
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
        <div className={`xp-section ${animationStage >= 5 ? 'animate-in' : ''}`}>
          <div className="xp-earned">
            <span className="xp-label">XP Earned</span>
            <span className="xp-value count-up">+{gameResult.xpEarned}</span>
            {gameResult.coinsEarned > 0 && (
              <span className="coins-earned">
                <span className="coin-icon rotate">💰</span>
                +{gameResult.coinsEarned}
              </span>
            )}
          </div>

          {userProfile ? (
            <div className="level-progress">
              {levelProgress.justLeveled && (
                <div className="level-up-banner">
                  🎉 LEVEL UP! You're now level {Math.floor(userProfile.xp / 1000)}!
                </div>
              )}
              <div className="progress-info">
                <span className="level-label">Level {Math.floor(userProfile.xp / 1000)}</span>
                <span className="xp-label">
                  {levelProgress.current} / {levelProgress.next} XP
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill animate-fill"
                  style={{ width: `${levelProgress.progress}%` }}
                >
                  <div className="progress-glow pulse" />
                </div>
              </div>
            </div>
          ) : (
            <div className="guest-xp-notice">
              <p>⚠️ Sign up to save your {gameResult.xpEarned} XP and rank on leaderboards!</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="victory-actions">
          <button
            className="victory-btn primary pulse-on-hover"
            onClick={onPlayAgain}
          >
            <span className="btn-icon">🎮</span>
            {gameResult.result === 'loss' ? 'Try Again' : 'Play Again'}
          </button>

          <button
            className="victory-btn secondary"
            onClick={onViewStats}
          >
            <span className="btn-icon">📊</span>
            View Full Stats
          </button>

          <button
            className="victory-btn secondary"
            onClick={onMainMenu}
          >
            <span className="btn-icon">🏠</span>
            Main Menu
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
              <div className="share-menu slide-up">
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
            <p>💡 Sign up to save progress, unlock achievements, and compete on leaderboards!</p>
            <button
              className="sign-up-btn glow"
              onClick={() => setShowSignUpCTA(true)}
            >
              Sign Up Free & Claim Rewards
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Import avatar service
import { avatarService } from '../services/avatar-service';