/**
 * Dominauts™ - Statistics Dashboard
 * Comprehensive player analytics and performance metrics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  Award,
  Target,
  Clock,
  Zap,
  Users,
  Trophy,
  Star,
  Activity
} from 'lucide-react';
import { GameMode, UserProfile, UserStats } from '../types';
import './StatisticsDashboard.css';

interface StatisticsDashboardProps {
  userProfile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

interface GameModeStats {
  mode: GameMode;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageScore: number;
  bestScore: number;
  totalPlayTime: number;
  favoriteOpponent?: string;
}

interface PerformanceMetrics {
  last7Days: DailyStats[];
  last30Days: DailyStats[];
  allTime: {
    peakRating: number;
    totalGames: number;
    totalWins: number;
    totalPlayTime: number;
    averageGameDuration: number;
  };
}

interface DailyStats {
  date: Date;
  gamesPlayed: number;
  wins: number;
  xpEarned: number;
  coinsEarned: number;
}

interface AchievementProgress {
  id: string;
  name: string;
  description: string;
  progress: number;
  maxProgress: number;
  reward: string;
  icon: string;
}

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ 
  userProfile, 
  isOpen, 
  onClose 
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'games' | 'achievements' | 'analysis'>('overview');
  const [selectedMode, setSelectedMode] = useState<GameMode | 'all'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [loading, setLoading] = useState(false);
  
  // Calculate derived statistics
  const stats = useMemo(() => calculateStatistics(userProfile), [userProfile]);
  
  if (!isOpen) return null;
  
  return (
    <div className="stats-dashboard-overlay" onClick={onClose}>
      <div className="stats-dashboard" onClick={(e) => e.stopPropagation()}>
        <div className="stats-header">
          <div className="stats-user-info">
            <img src={userProfile.avatar} alt={userProfile.username} className="stats-avatar" />
            <div>
              <h2>{userProfile.displayName}</h2>
              <p className="stats-username">@{userProfile.username}</p>
            </div>
          </div>
          
          <div className="stats-level-badge">
            <div className="level-number">Level {userProfile.level}</div>
            <div className="xp-progress">
              <div 
                className="xp-bar" 
                style={{ width: `${(userProfile.xp % 1000) / 10}%` }}
              />
            </div>
            <div className="xp-text">{userProfile.xp % 1000} / 1000 XP</div>
          </div>
          
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="stats-tabs">
          <button
            className={selectedTab === 'overview' ? 'active' : ''}
            onClick={() => setSelectedTab('overview')}
          >
            <Activity size={18} /> Overview
          </button>
          <button
            className={selectedTab === 'games' ? 'active' : ''}
            onClick={() => setSelectedTab('games')}
          >
            <BarChart size={18} /> Games
          </button>
          <button
            className={selectedTab === 'achievements' ? 'active' : ''}
            onClick={() => setSelectedTab('achievements')}
          >
            <Trophy size={18} /> Achievements
          </button>
          <button
            className={selectedTab === 'analysis' ? 'active' : ''}
            onClick={() => setSelectedTab('analysis')}
          >
            <LineChart size={18} /> Analysis
          </button>
        </div>
        
        <div className="stats-content">
          {selectedTab === 'overview' && (
            <OverviewTab userProfile={userProfile} stats={stats} />
          )}
          
          {selectedTab === 'games' && (
            <GamesTab userProfile={userProfile} stats={stats} selectedMode={selectedMode} setSelectedMode={setSelectedMode} />
          )}
          
          {selectedTab === 'achievements' && (
            <AchievementsTab userProfile={userProfile} />
          )}
          
          {selectedTab === 'analysis' && (
            <AnalysisTab userProfile={userProfile} stats={stats} timeRange={timeRange} setTimeRange={setTimeRange} />
          )}
        </div>
      </div>
    </div>
  );
};

const OverviewTab: React.FC<{ userProfile: UserProfile; stats: any }> = ({ userProfile, stats }) => {
  return (
    <div className="overview-tab">
      <div className="stats-grid">
        <StatCard
          icon={<Trophy />}
          title="Total Wins"
          value={userProfile.wins}
          subtitle={`${stats.winRate}% win rate`}
          trend={stats.recentWinRate > stats.winRate ? 'up' : 'down'}
        />
        
        <StatCard
          icon={<Target />}
          title="Best Streak"
          value={userProfile.bestWinStreak}
          subtitle={`Current: ${userProfile.winStreak}`}
          trend={userProfile.winStreak > 0 ? 'up' : 'neutral'}
        />
        
        <StatCard
          icon={<Zap />}
          title="Total Score"
          value={userProfile.totalScore.toLocaleString()}
          subtitle={`Avg: ${stats.averageScore}`}
          trend="up"
        />
        
        <StatCard
          icon={<Clock />}
          title="Play Time"
          value={formatPlayTime(userProfile.stats.totalPlayTime)}
          subtitle={`${stats.gamesPerDay} games/day`}
          trend="neutral"
        />
      </div>
      
      <div className="recent-performance">
        <h3>Recent Performance</h3>
        <div className="performance-chart">
          <MiniLineChart data={stats.last7Days} />
        </div>
      </div>
      
      <div className="favorite-stats">
        <h3>Favorites</h3>
        <div className="favorite-items">
          <div className="favorite-item">
            <span className="favorite-label">Game Mode:</span>
            <span className="favorite-value">{formatGameMode(userProfile.stats.favoriteGameMode)}</span>
          </div>
          <div className="favorite-item">
            <span className="favorite-label">Most Played With:</span>
            <span className="favorite-value">
              {userProfile.stats.mostPlayedWith[0] || 'No regular opponent'}
            </span>
          </div>
          <div className="favorite-item">
            <span className="favorite-label">Nemesis:</span>
            <span className="favorite-value">
              {userProfile.stats.nemesis || 'No nemesis yet'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="quick-stats">
        <QuickStat label="Perfect Games" value={userProfile.stats.perfectGames} />
        <QuickStat label="Comebacks" value={userProfile.stats.comebacks} />
        <QuickStat label="Dominoes Placed" value={userProfile.stats.dominoesPlaced} />
        <QuickStat label="Coins Earned" value={userProfile.coins} />
      </div>
    </div>
  );
};

const GamesTab: React.FC<{ userProfile: UserProfile; stats: any; selectedMode: any; setSelectedMode: any }> = ({ 
  userProfile, 
  stats, 
  selectedMode, 
  setSelectedMode 
}) => {
  const gameModeStats = calculateGameModeStats(userProfile, selectedMode);
  
  return (
    <div className="games-tab">
      <div className="mode-selector">
        <button
          className={selectedMode === 'all' ? 'active' : ''}
          onClick={() => setSelectedMode('all')}
        >
          All Modes
        </button>
        {Object.values(GameMode).map(mode => (
          <button
            key={mode}
            className={selectedMode === mode ? 'active' : ''}
            onClick={() => setSelectedMode(mode)}
          >
            {formatGameMode(mode)}
          </button>
        ))}
      </div>
      
      <div className="game-stats-grid">
        <div className="win-loss-chart">
          <h3>Win/Loss Distribution</h3>
          <PieChartComponent data={[
            { label: 'Wins', value: gameModeStats.wins, color: '#4CAF50' },
            { label: 'Losses', value: gameModeStats.losses, color: '#F44336' },
            { label: 'Draws', value: gameModeStats.draws, color: '#FFC107' }
          ]} />
        </div>
        
        <div className="game-metrics">
          <h3>Performance Metrics</h3>
          <div className="metric-list">
            <Metric label="Games Played" value={gameModeStats.gamesPlayed} />
            <Metric label="Win Rate" value={`${gameModeStats.winRate}%`} />
            <Metric label="Average Score" value={gameModeStats.averageScore} />
            <Metric label="Best Score" value={gameModeStats.bestScore} />
            <Metric label="Avg. Duration" value={formatDuration(gameModeStats.avgDuration)} />
          </div>
        </div>
      </div>
      
      <div className="score-distribution">
        <h3>Score Distribution</h3>
        <BarChartComponent data={gameModeStats.scoreDistribution} />
      </div>
      
      <div className="opponent-stats">
        <h3>Top Opponents</h3>
        <OpponentList opponents={gameModeStats.topOpponents} />
      </div>
    </div>
  );
};

const AchievementsTab: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const achievements = getAchievementProgress(userProfile);
  const completedCount = achievements.filter(a => a.progress >= a.maxProgress).length;
  
  return (
    <div className="achievements-tab">
      <div className="achievements-summary">
        <div className="achievement-progress-circle">
          <svg width="120" height="120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#e0e0e0"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#667eea"
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${(completedCount / achievements.length) * 314} 314`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="achievement-count">
            {completedCount}/{achievements.length}
          </div>
        </div>
        
        <div className="achievement-stats">
          <h3>Achievement Progress</h3>
          <p>{Math.round((completedCount / achievements.length) * 100)}% Complete</p>
          <p className="achievement-rewards">
            Total Rewards: {calculateTotalRewards(achievements)}
          </p>
        </div>
      </div>
      
      <div className="achievements-grid">
        {achievements.map(achievement => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  );
};

const AnalysisTab: React.FC<{ userProfile: UserProfile; stats: any; timeRange: any; setTimeRange: any }> = ({ 
  userProfile, 
  stats, 
  timeRange, 
  setTimeRange 
}) => {
  const analyticsData = getAnalyticsData(userProfile, timeRange);
  
  return (
    <div className="analysis-tab">
      <div className="time-range-selector">
        <button
          className={timeRange === '7d' ? 'active' : ''}
          onClick={() => setTimeRange('7d')}
        >
          Last 7 Days
        </button>
        <button
          className={timeRange === '30d' ? 'active' : ''}
          onClick={() => setTimeRange('30d')}
        >
          Last 30 Days
        </button>
        <button
          className={timeRange === 'all' ? 'active' : ''}
          onClick={() => setTimeRange('all')}
        >
          All Time
        </button>
      </div>
      
      <div className="analytics-charts">
        <div className="chart-container">
          <h3>Performance Trend</h3>
          <LineChartComponent data={analyticsData.performanceTrend} />
        </div>
        
        <div className="chart-container">
          <h3>Game Activity</h3>
          <HeatmapComponent data={analyticsData.activityHeatmap} />
        </div>
        
        <div className="chart-container">
          <h3>Score Progression</h3>
          <AreaChartComponent data={analyticsData.scoreProgression} />
        </div>
        
        <div className="chart-container">
          <h3>Win Rate by Mode</h3>
          <RadarChartComponent data={analyticsData.winRateByMode} />
        </div>
      </div>
      
      <div className="insights">
        <h3>Key Insights</h3>
        <InsightsList insights={analyticsData.insights} />
      </div>
    </div>
  );
};

// Helper Components
const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: number | string;
  subtitle: string;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ icon, title, value, subtitle, trend }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <h4>{title}</h4>
      <div className="stat-value">
        {value}
        {trend && (
          <span className={`trend-indicator ${trend}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : 
             trend === 'down' ? <TrendingDown size={16} /> : null}
          </span>
        )}
      </div>
      <p className="stat-subtitle">{subtitle}</p>
    </div>
  </div>
);

const QuickStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="quick-stat">
    <span className="quick-stat-label">{label}</span>
    <span className="quick-stat-value">{value.toLocaleString()}</span>
  </div>
);

const Metric: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="metric">
    <span className="metric-label">{label}</span>
    <span className="metric-value">{value}</span>
  </div>
);

const AchievementCard: React.FC<{ achievement: AchievementProgress }> = ({ achievement }) => {
  const isComplete = achievement.progress >= achievement.maxProgress;
  const progressPercent = (achievement.progress / achievement.maxProgress) * 100;
  
  return (
    <div className={`achievement-card ${isComplete ? 'complete' : ''}`}>
      <div className="achievement-icon">
        {isComplete ? <Star size={24} /> : <Award size={24} />}
      </div>
      <h4>{achievement.name}</h4>
      <p>{achievement.description}</p>
      <div className="achievement-progress-bar">
        <div 
          className="achievement-progress-fill" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="achievement-progress-text">
        {achievement.progress} / {achievement.maxProgress}
      </div>
      {isComplete && (
        <div className="achievement-reward">{achievement.reward}</div>
      )}
    </div>
  );
};

// Chart Components (simplified representations)
const MiniLineChart: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="mini-line-chart">
    {/* Simplified chart visualization */}
    <svg width="100%" height="60">
      {/* Chart implementation */}
    </svg>
  </div>
);

const PieChartComponent: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="pie-chart">
    {/* Pie chart implementation */}
  </div>
);

const BarChartComponent: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="bar-chart">
    {/* Bar chart implementation */}
  </div>
);

const LineChartComponent: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="line-chart">
    {/* Line chart implementation */}
  </div>
);

const HeatmapComponent: React.FC<{ data: any }> = ({ data }) => (
  <div className="heatmap">
    {/* Heatmap implementation */}
  </div>
);

const AreaChartComponent: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="area-chart">
    {/* Area chart implementation */}
  </div>
);

const RadarChartComponent: React.FC<{ data: any }> = ({ data }) => (
  <div className="radar-chart">
    {/* Radar chart implementation */}
  </div>
);

const OpponentList: React.FC<{ opponents: any[] }> = ({ opponents }) => (
  <div className="opponent-list">
    {opponents?.map((opponent, index) => (
      <div key={index} className="opponent-item">
        <span className="opponent-rank">#{index + 1}</span>
        <span className="opponent-name">{opponent.name}</span>
        <span className="opponent-stats">
          W: {opponent.wins} L: {opponent.losses}
        </span>
      </div>
    ))}
  </div>
);

const InsightsList: React.FC<{ insights: string[] }> = ({ insights }) => (
  <div className="insights-list">
    {insights?.map((insight, index) => (
      <div key={index} className="insight-item">
        <Zap size={16} />
        <span>{insight}</span>
      </div>
    ))}
  </div>
);

// Utility Functions
function calculateStatistics(userProfile: UserProfile): any {
  return {
    winRate: Math.round((userProfile.wins / Math.max(1, userProfile.totalGamesPlayed)) * 100),
    averageScore: Math.round(userProfile.totalScore / Math.max(1, userProfile.totalGamesPlayed)),
    recentWinRate: 65, // Would calculate from recent games
    gamesPerDay: 3.5,
    last7Days: [] // Would fetch from database
  };
}

function calculateGameModeStats(userProfile: UserProfile, mode: GameMode | 'all'): any {
  // Would calculate from actual game history
  return {
    gamesPlayed: userProfile.totalGamesPlayed,
    wins: userProfile.wins,
    losses: userProfile.losses,
    draws: userProfile.draws,
    winRate: Math.round((userProfile.wins / Math.max(1, userProfile.totalGamesPlayed)) * 100),
    averageScore: 45,
    bestScore: 150,
    avgDuration: 900000,
    scoreDistribution: [],
    topOpponents: []
  };
}

function getAchievementProgress(userProfile: UserProfile): AchievementProgress[] {
  // Would fetch from achievements system
  return [
    {
      id: 'first_win',
      name: 'First Victory',
      description: 'Win your first game',
      progress: userProfile.wins > 0 ? 1 : 0,
      maxProgress: 1,
      reward: '100 Coins',
      icon: 'trophy'
    },
    {
      id: 'win_streak_5',
      name: 'On Fire',
      description: 'Win 5 games in a row',
      progress: Math.min(userProfile.bestWinStreak, 5),
      maxProgress: 5,
      reward: '500 Coins + Title',
      icon: 'fire'
    }
  ];
}

function getAnalyticsData(userProfile: UserProfile, timeRange: string): any {
  // Would fetch analytics data
  return {
    performanceTrend: [],
    activityHeatmap: {},
    scoreProgression: [],
    winRateByMode: {},
    insights: [
      'Your win rate has improved by 15% this month',
      'You perform best in All Fives mode',
      'Peak playing time is 8-10 PM'
    ]
  };
}

function calculateTotalRewards(achievements: AchievementProgress[]): string {
  let coins = 0;
  let gems = 0;
  
  achievements.forEach(a => {
    if (a.progress >= a.maxProgress) {
      // Parse rewards
      if (a.reward.includes('Coins')) {
        coins += parseInt(a.reward.match(/\d+/)?.[0] || '0');
      }
    }
  });
  
  return `${coins} Coins, ${gems} Gems`;
}

function formatGameMode(mode: GameMode): string {
  return mode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatPlayTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function formatDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}