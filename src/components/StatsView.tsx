import React, { useState, useEffect } from 'react';
import { gameHistoryService, GameHistoryRecord, GameStats } from '../services/game-history-service';
import { firebaseAuth, UserProfile } from '../services/firebase-auth';

interface StatsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<GameHistoryRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'achievements'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const profile = firebaseAuth.getUserProfile();
      setUserProfile(profile);

      const userId = profile?.uid || 'guest';
      const [gameStats, history] = await Promise.all([
        gameHistoryService.getGameStats(userId),
        gameHistoryService.getMatchHistory(userId, 10)
      ]);

      setStats(gameStats);
      setRecentMatches(history);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getVariantIcon = (variant: string): string => {
    const icons: Record<string, string> = {
      classic: '🎯',
      allfives: '⭐',
      block: '🛡️',
      draw: '🎴',
      mexican: '🚂',
      cutthroat: '⚔️',
      partner: '🤝'
    };
    return icons[variant] || '🎮';
  };

  const getResultColor = (result: string): string => {
    switch (result) {
      case 'win': return '#10b981';
      case 'loss': return '#ef4444';
      case 'draw': return '#f59e0b';
      default: return '#888';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stats-header">
          <h1 className="stats-title">📊 Player Statistics</h1>
          <button className="stats-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="stats-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Match History
          </button>
          <button
            className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
          >
            Achievements
          </button>
        </div>

        {loading ? (
          <div className="stats-loading">
            <div className="loading-spinner">Loading statistics...</div>
          </div>
        ) : (
          <div className="stats-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="overview-tab">
                {/* Main Stats Grid */}
                <div className="main-stats-grid">
                  <div className="stat-card large">
                    <div className="stat-icon">🎮</div>
                    <div className="stat-value">{stats.totalGames}</div>
                    <div className="stat-label">Total Games</div>
                  </div>

                  <div className="stat-card large">
                    <div className="stat-icon">📈</div>
                    <div className="stat-value">{stats.winRate.toFixed(1)}%</div>
                    <div className="stat-label">Win Rate</div>
                    <div className="stat-breakdown">
                      <span className="win">{stats.wins}W</span>
                      <span className="loss">{stats.losses}L</span>
                      <span className="draw">{stats.draws}D</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">🏆</div>
                    <div className="stat-value">{stats.bestScore}</div>
                    <div className="stat-label">Best Score</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-value">{Math.round(stats.averageScore)}</div>
                    <div className="stat-label">Avg Score</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-value">{stats.longestStreak}</div>
                    <div className="stat-label">Best Streak</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-value">{stats.totalXP.toLocaleString()}</div>
                    <div className="stat-label">Total XP</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">💀</div>
                    <div className="stat-value">{stats.sixLoveCount}</div>
                    <div className="stat-label">Six-Loves</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon">✨</div>
                    <div className="stat-value">{stats.perfectGames}</div>
                    <div className="stat-label">Perfect Games</div>
                  </div>
                </div>

                {/* Favorite Variant */}
                {stats.favoriteVariant && (
                  <div className="favorite-variant">
                    <h3>Favorite Game Mode</h3>
                    <div className="variant-display">
                      <span className="variant-icon">{getVariantIcon(stats.favoriteVariant)}</span>
                      <span className="variant-name">{stats.favoriteVariant}</span>
                    </div>
                  </div>
                )}

                {/* Performance Chart (Placeholder) */}
                <div className="performance-chart">
                  <h3>Recent Performance</h3>
                  <div className="chart-placeholder">
                    <div className="chart-bars">
                      {recentMatches.slice(0, 7).map((match, index) => (
                        <div key={index} className="chart-bar-container">
                          <div
                            className={`chart-bar ${match.result}`}
                            style={{
                              height: `${(match.finalScoreUser / 200) * 100}%`,
                              background: getResultColor(match.result)
                            }}
                          />
                          <span className="bar-label">{match.result.charAt(0).toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="history-tab">
                {recentMatches.length === 0 ? (
                  <div className="no-matches">
                    <p>No matches played yet</p>
                    <p className="hint">Start playing to see your history!</p>
                  </div>
                ) : (
                  <div className="matches-list">
                    {recentMatches.map((match) => (
                      <div key={match.id} className={`match-card ${match.result}`}>
                        <div className="match-header">
                          <span className="match-variant">
                            {getVariantIcon(match.variant)} {match.variant}
                          </span>
                          <span className="match-time">
                            {new Date(match.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="match-body">
                          <div className="match-score">
                            <span className="score-user">{match.finalScoreUser}</span>
                            <span className="vs">vs</span>
                            <span className="score-ai">{match.finalScoreAI}</span>
                          </div>

                          <div
                            className="match-result"
                            style={{ color: getResultColor(match.result) }}
                          >
                            {match.result === 'win' ? '✅' : match.result === 'loss' ? '❌' : '🤝'}
                            {match.result.toUpperCase()}
                          </div>
                        </div>

                        <div className="match-footer">
                          <span className="match-stat">
                            <span className="stat-icon">⏱️</span>
                            {formatTime(match.timePlayed)}
                          </span>
                          <span className="match-stat">
                            <span className="stat-icon">🎯</span>
                            {match.movesMade} moves
                          </span>
                          <span className="match-stat">
                            <span className="stat-icon">⭐</span>
                            +{match.xpEarned} XP
                          </span>
                        </div>

                        {match.achievements.length > 0 && (
                          <div className="match-achievements">
                            {match.achievements.map(achievement => (
                              <span
                                key={achievement.id}
                                className="achievement-badge"
                                title={achievement.name}
                              >
                                {achievement.icon}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <div className="achievements-tab">
                <div className="achievements-summary">
                  <h3>Achievement Progress</h3>
                  {userProfile ? (
                    <p>{userProfile.achievements.length} / 50 Unlocked</p>
                  ) : (
                    <p>Sign in to track achievements</p>
                  )}
                </div>

                <div className="achievements-categories">
                  <div className="achievement-category">
                    <h4>🏆 Victory Achievements</h4>
                    <div className="achievement-list">
                      {[
                        { icon: '🥇', name: 'First Win', desc: 'Win your first game', unlocked: stats?.wins ? stats.wins >= 1 : false },
                        { icon: '🏅', name: 'Centurion', desc: 'Win 100 games', unlocked: stats?.wins ? stats.wins >= 100 : false },
                        { icon: '👑', name: 'Champion', desc: 'Win 500 games', unlocked: stats?.wins ? stats.wins >= 500 : false }
                      ].map((achievement, index) => (
                        <div
                          key={index}
                          className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                        >
                          <span className="achievement-icon">{achievement.icon}</span>
                          <div className="achievement-details">
                            <div className="achievement-name">{achievement.name}</div>
                            <div className="achievement-desc">{achievement.desc}</div>
                          </div>
                          {achievement.unlocked && <span className="check">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="achievement-category">
                    <h4>🔥 Streak Achievements</h4>
                    <div className="achievement-list">
                      {[
                        { icon: '🔥', name: 'Hot Streak', desc: '3 wins in a row', unlocked: stats?.longestStreak ? stats.longestStreak >= 3 : false },
                        { icon: '🚀', name: 'Unstoppable', desc: '5 wins in a row', unlocked: stats?.longestStreak ? stats.longestStreak >= 5 : false },
                        { icon: '⚡', name: 'Legendary', desc: '10 wins in a row', unlocked: stats?.longestStreak ? stats.longestStreak >= 10 : false }
                      ].map((achievement, index) => (
                        <div
                          key={index}
                          className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                        >
                          <span className="achievement-icon">{achievement.icon}</span>
                          <div className="achievement-details">
                            <div className="achievement-name">{achievement.name}</div>
                            <div className="achievement-desc">{achievement.desc}</div>
                          </div>
                          {achievement.unlocked && <span className="check">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="achievement-category">
                    <h4>💀 Special Victories</h4>
                    <div className="achievement-list">
                      {[
                        { icon: '💀', name: 'Six-Love Master', desc: 'Win with opponent at 0', unlocked: stats?.sixLoveCount ? stats.sixLoveCount >= 1 : false },
                        { icon: '✨', name: 'Perfectionist', desc: 'Win a perfect game', unlocked: stats?.perfectGames ? stats.perfectGames >= 1 : false },
                        { icon: '🎯', name: 'High Scorer', desc: 'Score 200+ in a game', unlocked: stats?.bestScore ? stats.bestScore >= 200 : false }
                      ].map((achievement, index) => (
                        <div
                          key={index}
                          className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                        >
                          <span className="achievement-icon">{achievement.icon}</span>
                          <div className="achievement-details">
                            <div className="achievement-name">{achievement.name}</div>
                            <div className="achievement-desc">{achievement.desc}</div>
                          </div>
                          {achievement.unlocked && <span className="check">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!userProfile && (
          <div className="guest-notice">
            <p>📊 Sign in to save your stats permanently!</p>
          </div>
        )}
      </div>
    </div>
  );
};