import React, { useState } from 'react';
import { UserProfile } from '../services/firebase-auth';

interface UserProfileCardProps {
  profile: UserProfile | null;
  compact?: boolean;
  onAvatarClick?: () => void;
  onSettingsClick?: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  compact = false,
  onAvatarClick,
  onSettingsClick
}) => {
  const [imageError, setImageError] = useState(false);

  if (!profile) {
    return (
      <div className="user-profile-card guest">
        <div className="profile-avatar guest-avatar">
          <span>?</span>
        </div>
        <div className="profile-info">
          <div className="profile-name">Guest Player</div>
          <div className="profile-status">Sign in to save progress</div>
        </div>
      </div>
    );
  }

  const winRate = profile.totalGamesPlayed > 0
    ? Math.round((profile.wins / profile.totalGamesPlayed) * 100)
    : 0;

  const getLevelTitle = (level: number) => {
    if (level >= 100) return 'Domino Legend';
    if (level >= 75) return 'Grand Master';
    if (level >= 50) return 'Master';
    if (level >= 30) return 'Expert';
    if (level >= 20) return 'Advanced';
    if (level >= 10) return 'Intermediate';
    if (level >= 5) return 'Beginner';
    return 'Novice';
  };

  const getStreakBadge = (streak: number) => {
    if (streak >= 20) return { icon: '🔥', label: 'ON FIRE!' };
    if (streak >= 10) return { icon: '⚡', label: 'Electric!' };
    if (streak >= 5) return { icon: '✨', label: 'Hot Streak!' };
    if (streak >= 3) return { icon: '🌟', label: 'Winning!' };
    return null;
  };

  const streakBadge = getStreakBadge(profile.streak);

  if (compact) {
    return (
      <div className="user-profile-card compact">
        <div
          className="profile-avatar"
          onClick={onAvatarClick}
          style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
        >
          {profile.photoURL && !imageError ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`avatar-placeholder avatar-${profile.avatarId || '1'}`}>
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="level-badge">{profile.level}</div>
        </div>
        <div className="profile-info">
          <div className="profile-name">
            {profile.displayName}
            {streakBadge && (
              <span className="streak-badge" title={streakBadge.label}>
                {streakBadge.icon}
              </span>
            )}
          </div>
          <div className="profile-stats-compact">
            <span className="stat-item">
              <span className="stat-icon">🏆</span>
              {profile.wins}
            </span>
            <span className="stat-item">
              <span className="stat-icon">⭐</span>
              {profile.xp.toLocaleString()}
            </span>
          </div>
        </div>
        {onSettingsClick && (
          <button className="profile-settings-btn" onClick={onSettingsClick}>
            ⚙️
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="user-profile-card full">
      <div className="profile-header">
        <div
          className="profile-avatar large"
          onClick={onAvatarClick}
          style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
        >
          {profile.photoURL && !imageError ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`avatar-placeholder avatar-${profile.avatarId || '1'}`}>
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="level-badge large">
            <span className="level-number">{profile.level}</span>
            <span className="level-title">{getLevelTitle(profile.level)}</span>
          </div>
        </div>

        <div className="profile-main-info">
          <h2 className="profile-name">
            {profile.displayName}
            {streakBadge && (
              <span className="streak-badge large" title={streakBadge.label}>
                {streakBadge.icon} {streakBadge.label}
              </span>
            )}
          </h2>
          <div className="profile-email">{profile.email}</div>

          <div className="profile-xp-bar">
            <div className="xp-progress" style={{ width: `${(profile.xp % 1000) / 10}%` }}>
              <span className="xp-text">{profile.xp.toLocaleString()} XP</span>
            </div>
            <span className="xp-next">Next: {((Math.floor(profile.xp / 1000) + 1) * 1000).toLocaleString()}</span>
          </div>

          <div className="profile-coins">
            <span className="coin-icon">💰</span>
            <span className="coin-amount">{profile.coins.toLocaleString()}</span>
            <span className="coin-label">Coins</span>
          </div>
        </div>
      </div>

      <div className="profile-stats-grid">
        <div className="stat-card">
          <div className="stat-value">{profile.totalGamesPlayed}</div>
          <div className="stat-label">Games Played</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{profile.wins}</div>
          <div className="stat-label">Wins</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{winRate}%</div>
          <div className="stat-label">Win Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{profile.maxStreak}</div>
          <div className="stat-label">Best Streak</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{profile.sixLoveStreaks}</div>
          <div className="stat-label">Six-Love Wins</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{profile.achievements.length}</div>
          <div className="stat-label">Achievements</div>
        </div>
      </div>

      <div className="profile-preferences">
        <div className="pref-item">
          <span className="pref-label">Preferred Variant:</span>
          <span className="pref-value">{profile.preferredVariant}</span>
        </div>
        <div className="pref-item">
          <span className="pref-label">Difficulty:</span>
          <span className="pref-value">{profile.difficultyTier}</span>
        </div>
      </div>

      {profile.matchHistory.length > 0 && (
        <div className="recent-matches">
          <h3>Recent Matches</h3>
          <div className="match-list">
            {profile.matchHistory.slice(0, 5).map((match) => (
              <div key={match.id} className={`match-item ${match.result}`}>
                <div className="match-variant">{match.variant}</div>
                <div className="match-opponent">vs {match.opponentName}</div>
                <div className="match-score">
                  {match.playerScore} - {match.opponentScore}
                </div>
                <div className={`match-result ${match.result}`}>
                  {match.result.toUpperCase()}
                </div>
                <div className="match-xp">+{match.xpEarned} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {onSettingsClick && (
        <button className="profile-settings-btn full" onClick={onSettingsClick}>
          <span>⚙️</span> Settings
        </button>
      )}
    </div>
  );
};