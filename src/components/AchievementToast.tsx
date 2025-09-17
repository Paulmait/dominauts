import React, { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

// Achievement types and configurations
export const ACHIEVEMENTS = {
  FIRST_WIN: {
    id: 'first_win',
    title: 'First Victory!',
    description: 'You won your first game!',
    icon: '🏆',
    points: 100,
    rarity: 'common'
  },
  PERFECT_GAME: {
    id: 'perfect_game',
    title: 'Perfect Game!',
    description: 'Won without letting opponent score!',
    icon: '💎',
    points: 500,
    rarity: 'epic'
  },
  DOMINO_MASTER: {
    id: 'domino_master',
    title: 'Domino Master',
    description: 'Won 10 games in a row!',
    icon: '👑',
    points: 1000,
    rarity: 'legendary'
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Won a game in under 2 minutes!',
    icon: '⚡',
    points: 250,
    rarity: 'rare'
  },
  COMEBACK_KING: {
    id: 'comeback_king',
    title: 'Comeback King',
    description: 'Won after being down by 50+ points!',
    icon: '🔥',
    points: 300,
    rarity: 'rare'
  },
  DOUBLE_TROUBLE: {
    id: 'double_trouble',
    title: 'Double Trouble',
    description: 'Played 5 doubles in one game!',
    icon: '♊',
    points: 150,
    rarity: 'common'
  },
  STRATEGIST: {
    id: 'strategist',
    title: 'Strategic Genius',
    description: 'Blocked opponent 5 times in one game!',
    icon: '🧠',
    points: 200,
    rarity: 'rare'
  },
  LUCKY_SEVEN: {
    id: 'lucky_seven',
    title: 'Lucky Seven',
    description: 'Won with exactly 77 points!',
    icon: '🎰',
    points: 777,
    rarity: 'epic'
  },
  DAILY_PLAYER: {
    id: 'daily_player',
    title: 'Daily Dedication',
    description: 'Played 7 days in a row!',
    icon: '📅',
    points: 100,
    rarity: 'common'
  },
  HIGH_SCORER: {
    id: 'high_scorer',
    title: 'High Scorer',
    description: 'Scored over 150 points in one game!',
    icon: '📈',
    points: 350,
    rarity: 'rare'
  }
};

// Rarity colors
const RARITY_COLORS = {
  common: { bg: '#9CA3AF', border: '#6B7280', glow: 'rgba(156, 163, 175, 0.5)' },
  rare: { bg: '#3B82F6', border: '#2563EB', glow: 'rgba(59, 130, 246, 0.5)' },
  epic: { bg: '#A855F7', border: '#9333EA', glow: 'rgba(168, 85, 247, 0.5)' },
  legendary: { bg: '#F59E0B', border: '#D97706', glow: 'rgba(245, 158, 11, 0.5)' }
};

interface AchievementData {
  title: string;
  description: string;
  icon: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Custom achievement toast component
const AchievementNotification: React.FC<{ achievement: AchievementData }> = ({ achievement }) => {
  const colors = RARITY_COLORS[achievement.rarity];

  return (
    <motion.div
      initial={{ x: 100, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.8 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        background: `linear-gradient(135deg, ${colors.bg}22, ${colors.bg}44)`,
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        boxShadow: `0 10px 30px ${colors.glow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
        backdropFilter: 'blur(10px)',
        minWidth: '300px',
        maxWidth: '400px'
      }}
    >
      {/* Icon with animation */}
      <motion.div
        animate={{
          rotate: [0, -10, 10, -10, 10, 0],
          scale: [1, 1.1, 1, 1.1, 1, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3
        }}
        style={{
          fontSize: '2.5rem',
          marginRight: '16px',
          filter: `drop-shadow(0 0 10px ${colors.glow})`
        }}
      >
        {achievement.icon}
      </motion.div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 'bold',
          fontSize: '1.1rem',
          color: '#fff',
          marginBottom: '4px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {achievement.title}
        </div>
        <div style={{
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '6px'
        }}>
          {achievement.description}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            background: colors.bg,
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            {achievement.rarity}
          </span>
          <span style={{
            color: '#ffd700',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.5))'
          }}>
            +{achievement.points} XP
          </span>
        </div>
      </div>

      {/* Sparkle animation */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: [0, (Math.random() - 0.5) * 50],
            y: [0, (Math.random() - 0.5) * 50]
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
            repeatDelay: 1
          }}
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: '#fff',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        />
      ))}
    </motion.div>
  );
};

// Main component to show achievement toasts
export const AchievementToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerStyle={{
          top: 20,
          right: 20
        }}
        toastOptions={{
          duration: 5000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
            margin: 0
          }
        }}
      />
    </>
  );
};

// Function to show achievement notification
export const showAchievement = (achievementKey: keyof typeof ACHIEVEMENTS) => {
  const achievement = ACHIEVEMENTS[achievementKey];

  toast.custom((t) => (
    <AchievementNotification achievement={achievement} />
  ), {
    duration: 5000,
    position: 'top-right'
  });

  // Play sound effect (if available)
  try {
    const audio = new Audio('/sounds/achievement.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Fallback if sound doesn't exist
      console.log('Achievement sound not found');
    });
  } catch (e) {
    // Silent fail for audio
  }

  // Store achievement in localStorage
  const unlockedAchievements = JSON.parse(localStorage.getItem('achievements') || '[]');
  if (!unlockedAchievements.includes(achievementKey)) {
    unlockedAchievements.push(achievementKey);
    localStorage.setItem('achievements', JSON.stringify(unlockedAchievements));
  }
};

// Progress toast for ongoing actions
export const showProgress = (message: string, progress: number) => {
  toast.custom((t) => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        background: 'linear-gradient(135deg, rgba(26,26,46,0.95), rgba(22,33,62,0.95))',
        border: '1px solid rgba(0,212,255,0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        minWidth: '250px'
      }}
    >
      <div style={{ color: '#fff', marginBottom: '8px', fontSize: '0.9rem' }}>
        {message}
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '4px',
        height: '6px',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #00d4ff, #00a8cc)',
            boxShadow: '0 0 10px rgba(0,212,255,0.5)'
          }}
        />
      </div>
    </motion.div>
  ), {
    duration: Infinity,
    id: 'progress-toast'
  });
};

// Success notification
export const showSuccess = (message: string) => {
  toast.success(message, {
    style: {
      background: 'linear-gradient(135deg, #10B981, #059669)',
      color: '#fff',
      border: '1px solid #047857',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 10px 30px rgba(16,185,129,0.3)'
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981'
    }
  });
};

// Error notification
export const showError = (message: string) => {
  toast.error(message, {
    style: {
      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
      color: '#fff',
      border: '1px solid #B91C1C',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 10px 30px rgba(239,68,68,0.3)'
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444'
    }
  });
};

// Info notification
export const showInfo = (message: string) => {
  toast(message, {
    style: {
      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      color: '#fff',
      border: '1px solid #1D4ED8',
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 10px 30px rgba(59,130,246,0.3)'
    },
    icon: 'ℹ️'
  });
};