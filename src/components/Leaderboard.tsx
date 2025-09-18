import React, { useState, useEffect } from 'react';
import { firebaseAuth, LeaderboardEntry } from '../services/firebase-auth';
import { avatarService } from '../services/avatar-service';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose }) => {
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'friends'>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen, leaderboardType, timeFilter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const leaderboardData = await firebaseAuth.getLeaderboard(leaderboardType);
      setEntries(leaderboardData);

      // Find current user's rank
      const currentUser = firebaseAuth.getCurrentUser();
      if (currentUser) {
        const userIndex = leaderboardData.findIndex(entry => entry.uid === currentUser.uid);
        setUserRank(userIndex >= 0 ? userIndex + 1 : null);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      // Use mock data for demo
      setEntries(getMockLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  const getMockLeaderboard = (): LeaderboardEntry[] => {
    const mockEntries: LeaderboardEntry[] = [];
    const aiNames = [
      'DominoMaster', 'TileChampion', 'BlockBuster', 'ChainKing', 'ScoreHero',
      'WinStreak', 'ProPlayer', 'EliteGamer', 'TopTiler', 'GrandMaster'
    ];

    for (let i = 0; i < 10; i++) {
      const totalGames = Math.floor(Math.random() * 500) + 100;
      const wins = Math.floor(totalGames * (0.4 + Math.random() * 0.5));
      const xp = (wins * 100) + Math.floor(Math.random() * 5000);

      mockEntries.push({
        uid: `user_${i}`,
        displayName: aiNames[i],
        photoURL: avatarService.generateAvatarUrl(aiNames[i]),
        xp: xp,
        level: Math.floor(xp / 1000) + 1,
        wins: wins,
        winRate: (wins / totalGames) * 100,
        rank: i + 1
      });
    }

    return mockEntries.sort((a, b) => b.xp - a.xp);
  };

  const getRankBadge = (rank: number): { icon: string; color: string } => {
    switch (rank) {
      case 1:
        return { icon: '🥇', color: '#FFD700' };
      case 2:
        return { icon: '🥈', color: '#C0C0C0' };
      case 3:
        return { icon: '🥉', color: '#CD7F32' };
      default:
        if (rank <= 10) return { icon: '⭐', color: '#FFA500' };
        if (rank <= 50) return { icon: '✨', color: '#87CEEB' };
        return { icon: '🎯', color: '#888888' };
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h1 className="leaderboard-title">Leaderboard</h1>
          <button className="leaderboard-close" onClick={onClose}>×</button>
        </div>

        <div className="leaderboard-controls">
          <div className="leaderboard-tabs">
            <button
              className={`tab-btn ${leaderboardType === 'global' ? 'active' : ''}`}
              onClick={() => setLeaderboardType('global')}
            >
              🌍 Global
            </button>
            <button
              className={`tab-btn ${leaderboardType === 'friends' ? 'active' : ''}`}
              onClick={() => setLeaderboardType('friends')}
            >
              👥 Friends
            </button>
          </div>

          <div className="time-filters">
            <button
              className={`filter-btn ${timeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTimeFilter('all')}
            >
              All Time
            </button>
            <button
              className={`filter-btn ${timeFilter === 'week' ? 'active' : ''}`}
              onClick={() => setTimeFilter('week')}
            >
              This Week
            </button>
            <button
              className={`filter-btn ${timeFilter === 'month' ? 'active' : ''}`}
              onClick={() => setTimeFilter('month')}
            >
              This Month
            </button>
          </div>
        </div>

        {userRank && (
          <div className="user-rank-banner">
            <span className="rank-label">Your Rank:</span>
            <span className="rank-value">#{userRank}</span>
            <span className="rank-badge">{getRankBadge(userRank).icon}</span>
          </div>
        )}

        <div className="leaderboard-content">
          {loading ? (
            <div className="leaderboard-loading">
              <div className="loading-spinner">Loading rankings...</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="leaderboard-empty">
              <p>No players found</p>
              {leaderboardType === 'friends' && (
                <p className="empty-hint">Add friends to see their rankings!</p>
              )}
            </div>
          ) : (
            <div className="leaderboard-list">
              {entries.map((entry, index) => {
                const rankBadge = getRankBadge(entry.rank);
                const isCurrentUser = entry.uid === firebaseAuth.getCurrentUser()?.uid;

                return (
                  <div
                    key={entry.uid}
                    className={`leaderboard-entry ${isCurrentUser ? 'current-user' : ''}`}
                  >
                    <div className="entry-rank" style={{ color: rankBadge.color }}>
                      <span className="rank-number">#{entry.rank}</span>
                      <span className="rank-icon">{rankBadge.icon}</span>
                    </div>

                    <div className="entry-player">
                      <div className="player-avatar">
                        {entry.photoURL ? (
                          <img src={entry.photoURL} alt={entry.displayName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {entry.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="level-indicator">{entry.level}</div>
                      </div>

                      <div className="player-info">
                        <div className="player-name">
                          {entry.displayName}
                          {isCurrentUser && <span className="you-badge">YOU</span>}
                        </div>
                        <div className="player-stats">
                          <span className="stat">
                            <span className="stat-icon">🏆</span>
                            {entry.wins} wins
                          </span>
                          <span className="stat">
                            <span className="stat-icon">📊</span>
                            {entry.winRate.toFixed(1)}% WR
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="entry-score">
                      <div className="xp-amount">{formatNumber(entry.xp)}</div>
                      <div className="xp-label">XP</div>
                    </div>

                    {index < 3 && (
                      <div className="top-player-glow" style={{
                        background: `radial-gradient(circle, ${rankBadge.color}20, transparent)`
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="leaderboard-footer">
          <div className="leaderboard-stats">
            <div className="stat-item">
              <span className="stat-label">Total Players:</span>
              <span className="stat-value">{entries.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Level:</span>
              <span className="stat-value">
                {entries.length > 0
                  ? Math.round(entries.reduce((sum, e) => sum + e.level, 0) / entries.length)
                  : 0}
              </span>
            </div>
          </div>

          {!firebaseAuth.isAuthenticated() && (
            <div className="leaderboard-cta">
              <p>Sign in to appear on the leaderboard and compete with others!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};