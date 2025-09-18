import React, { useState, useEffect } from 'react';
import { firebaseAuth, UserProfile } from '../services/firebase-auth';
import { avatarService } from '../services/avatar-service';
import { EnhancedAuthModal } from './EnhancedAuthModal';
import { UserProfileCard } from './UserProfileCard';

interface GameVariant {
  id: string;
  name: string;
  description: string;
  icon: string;
  preview: string;
  locked: boolean;
  requiredLevel?: number;
}

interface EnhancedMainMenuProps {
  onStartGame: (variant: string, difficulty: string) => void;
  onShowLeaderboard: () => void;
  onShowSettings: () => void;
}

export const EnhancedMainMenu: React.FC<EnhancedMainMenuProps> = ({
  onStartGame,
  onShowLeaderboard,
  onShowSettings
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>('allfives');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [isLoading, setIsLoading] = useState(true);

  // Game variants with previews
  const gameVariants: GameVariant[] = [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Traditional domino rules',
      icon: '🎯',
      preview: 'classic-preview',
      locked: false
    },
    {
      id: 'allfives',
      name: 'All Fives',
      description: 'Score points when ends sum to multiples of 5',
      icon: '⭐',
      preview: 'allfives-preview',
      locked: false
    },
    {
      id: 'block',
      name: 'Block',
      description: 'Strategic blocking gameplay',
      icon: '🛡️',
      preview: 'block-preview',
      locked: false, // Available for guests too
      requiredLevel: 0
    },
    {
      id: 'draw',
      name: 'Draw',
      description: 'Draw from boneyard when blocked',
      icon: '🎴',
      preview: 'draw-preview',
      locked: !userProfile || userProfile.level < 10,
      requiredLevel: 10
    },
    {
      id: 'mexican',
      name: 'Mexican Train',
      description: 'Build your own train line',
      icon: '🚂',
      preview: 'mexican-preview',
      locked: !userProfile || userProfile.level < 15,
      requiredLevel: 15
    },
    {
      id: 'cutthroat',
      name: 'Cutthroat',
      description: 'Three player free-for-all',
      icon: '⚔️',
      preview: 'cutthroat-preview',
      locked: !userProfile || userProfile.level < 20,
      requiredLevel: 20
    },
    {
      id: 'partner',
      name: 'Partner',
      description: '2v2 team gameplay',
      icon: '🤝',
      preview: 'partner-preview',
      locked: !userProfile || userProfile.level < 25,
      requiredLevel: 25
    }
  ];

  const difficulties = [
    { id: 'easy', name: 'Easy', icon: '😊', color: '#10B981' },
    { id: 'medium', name: 'Medium', icon: '😐', color: '#F59E0B' },
    { id: 'hard', name: 'Hard', icon: '😤', color: '#EF4444' },
    { id: 'expert', name: 'Expert', icon: '💀', color: '#7C3AED' }
  ];

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = firebaseAuth.onAuthStateChange((user) => {
      if (user) {
        const profile = firebaseAuth.getUserProfile();
        setUserProfile(profile);
        if (profile) {
          setSelectedVariant(profile.preferredVariant || 'allfives');
          setSelectedDifficulty(profile.difficultyTier || 'medium');
        }
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleStartGame = () => {
    const variant = gameVariants.find(v => v.id === selectedVariant);

    // Allow guests to play classic and allfives modes
    const isGuestAllowedVariant = ['classic', 'allfives', 'block'].includes(selectedVariant);

    if (!userProfile && !isGuestAllowedVariant) {
      // Show sign-up prompt for locked variants
      alert('Sign up free to unlock more game modes and save your progress!');
      setShowAuthModal(true);
      return;
    }

    if (variant?.locked && !userProfile) {
      alert('Sign up free to unlock this game mode!');
      setShowAuthModal(true);
      return;
    }

    if (variant?.locked && userProfile) {
      alert(`Reach level ${variant.requiredLevel} to unlock ${variant.name}!`);
      return;
    }

    onStartGame(selectedVariant, selectedDifficulty);
  };

  const handleSignOut = async () => {
    await firebaseAuth.signOut();
    setUserProfile(null);
    setShowProfileMenu(false);
  };

  const getVariantPreview = (variant: GameVariant) => {
    // Generate simple ASCII preview of game variant
    const previews: { [key: string]: React.ReactElement } = {
      'classic-preview': (
        <div className="variant-preview">
          <div className="domino-row">
            <span className="domino-tile">[6|6]</span>
            <span className="domino-tile">[6|5]</span>
            <span className="domino-tile">[5|4]</span>
          </div>
        </div>
      ),
      'allfives-preview': (
        <div className="variant-preview">
          <div className="domino-row">
            <span className="domino-tile highlight">[5|0]</span>
            <span className="domino-tile">[0|2]</span>
            <span className="domino-tile highlight">[2|3]</span>
          </div>
          <div className="score-indicator">+10 pts</div>
        </div>
      ),
      'block-preview': (
        <div className="variant-preview">
          <div className="domino-row">
            <span className="domino-tile blocked">[3|3]</span>
            <span className="domino-tile">❌</span>
            <span className="domino-tile blocked">[4|4]</span>
          </div>
        </div>
      ),
      'draw-preview': (
        <div className="variant-preview">
          <div className="domino-row">
            <span className="domino-tile">[?|?]</span>
            <span className="arrow">→</span>
            <span className="domino-tile">[2|3]</span>
          </div>
        </div>
      ),
      'mexican-preview': (
        <div className="variant-preview">
          <div className="train-layout">
            <div className="train-line player">🚂 You</div>
            <div className="train-line center">🎯 Center</div>
            <div className="train-line ai">🤖 AI</div>
          </div>
        </div>
      ),
      'cutthroat-preview': (
        <div className="variant-preview">
          <div className="players-triangle">
            <span className="player p1">P1</span>
            <span className="player p2">P2</span>
            <span className="player p3">P3</span>
          </div>
        </div>
      ),
      'partner-preview': (
        <div className="variant-preview">
          <div className="team-layout">
            <div className="team team-1">Team A</div>
            <span className="vs">VS</span>
            <div className="team team-2">Team B</div>
          </div>
        </div>
      )
    };

    return previews[variant.preview] || <div className="variant-preview">Preview</div>;
  };

  if (isLoading) {
    return (
      <div className="main-menu loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="enhanced-main-menu">
      {/* Header with User Profile */}
      <div className="menu-header">
        <div className="menu-logo">
          <h1 className="menu-title">Dominauts</h1>
          <p className="menu-tagline">Master the Art of Dominoes</p>
        </div>

        <div className="menu-user-section">
          {userProfile ? (
            <div className="user-info-container">
              <UserProfileCard
                profile={userProfile}
                compact={true}
                onSettingsClick={() => setShowProfileMenu(!showProfileMenu)}
              />

              {showProfileMenu && (
                <div className="profile-dropdown">
                  <button onClick={() => onShowSettings()}>
                    <span>⚙️</span> Settings
                  </button>
                  <button onClick={() => onShowLeaderboard()}>
                    <span>🏆</span> Leaderboard
                  </button>
                  <button onClick={handleSignOut}>
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="guest-info">
              <div className="guest-avatar">
                <span>👤</span>
              </div>
              <div className="guest-details">
                <p className="guest-label">Playing as Guest</p>
                <p className="guest-warning">⚠️ Progress won't be saved</p>
              </div>
              <button
                className="sign-in-btn pulse"
                onClick={() => setShowAuthModal(true)}
              >
                <span className="btn-icon">🚀</span>
                Sign Up Free
                <span className="btn-badge">Save Progress</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Game Variants Selection */}
      <div className="menu-content">
        <div className="variants-section">
          <h2 className="section-title">Choose Game Mode</h2>
          <div className="variants-grid">
            {gameVariants.map((variant) => (
              <div
                key={variant.id}
                className={`variant-card ${selectedVariant === variant.id ? 'selected' : ''} ${variant.locked ? 'locked' : ''}`}
                onClick={() => !variant.locked && setSelectedVariant(variant.id)}
              >
                <div className="variant-header">
                  <span className="variant-icon">{variant.icon}</span>
                  <h3 className="variant-name">{variant.name}</h3>
                  {variant.locked && (
                    <div className="lock-badge">
                      <span>🔒</span>
                      <span className="lock-level">Lv.{variant.requiredLevel}</span>
                    </div>
                  )}
                </div>

                <div className="variant-preview-container">
                  {getVariantPreview(variant)}
                </div>

                <p className="variant-description">{variant.description}</p>

                {selectedVariant === variant.id && !variant.locked && (
                  <div className="variant-selected-badge">✓ Selected</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="difficulty-section">
          <h2 className="section-title">Select Difficulty</h2>
          <div className="difficulty-options">
            {difficulties.map((diff) => (
              <button
                key={diff.id}
                className={`difficulty-btn ${selectedDifficulty === diff.id ? 'selected' : ''}`}
                onClick={() => setSelectedDifficulty(diff.id)}
                style={{ borderColor: diff.color }}
              >
                <span className="diff-icon">{diff.icon}</span>
                <span className="diff-name">{diff.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="menu-actions">
          <button
            className="play-btn primary"
            onClick={handleStartGame}
          >
            {userProfile ? '🎮 Start Ranked Game' : '🎮 Play as Guest'}
          </button>

          {!userProfile && (
            <div className="guest-benefits-preview">
              <p className="auth-hint">
                <strong>🎯 Playing as Guest - Limited Features</strong>
              </p>
              <div className="benefits-comparison">
                <div className="guest-features">
                  <h4>Guest (Current)</h4>
                  <ul>
                    <li>✅ 3 game modes</li>
                    <li>❌ Progress not saved</li>
                    <li>❌ No leaderboard</li>
                    <li>❌ No achievements</li>
                  </ul>
                </div>
                <div className="member-features">
                  <h4>Free Account</h4>
                  <ul>
                    <li>✅ All 7 game modes</li>
                    <li>✅ Save progress</li>
                    <li>✅ Global leaderboard</li>
                    <li>✅ 50+ achievements</li>
                    <li>✅ Daily challenges</li>
                    <li>✅ Friend battles</li>
                  </ul>
                </div>
              </div>
              <button
                className="upgrade-btn"
                onClick={() => setShowAuthModal(true)}
              >
                🚀 Sign Up Free - Takes 30 Seconds
              </button>
            </div>
          )}

          <div className="secondary-actions">
            <button
              className="action-btn"
              onClick={() => onShowLeaderboard()}
            >
              <span>🏆</span> Leaderboard
            </button>

            {userProfile && (
              <button
                className="action-btn"
                onClick={() => {
                  // Show achievements
                  alert(`You have ${userProfile.achievements.length} achievements!`);
                }}
              >
                <span>🎖️</span> Achievements
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Daily Challenge Banner */}
      {userProfile && (
        <div className="daily-challenge-banner">
          <div className="challenge-content">
            <span className="challenge-icon">🎯</span>
            <div className="challenge-text">
              <h4>Daily Challenge</h4>
              <p>Win 3 games in All Fives mode</p>
            </div>
            <div className="challenge-reward">
              <span>Reward: 500 XP</span>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <EnhancedAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(profile) => {
          setUserProfile(profile);
          setShowAuthModal(false);
        }}
      />
    </div>
  );
};