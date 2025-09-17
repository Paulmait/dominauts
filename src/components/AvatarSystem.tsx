import React, { useState, useEffect } from 'react';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import { motion } from 'framer-motion';

interface AvatarProps {
  seed?: string;
  size?: number;
  isOnline?: boolean;
  showLevel?: boolean;
  level?: number;
  showStatus?: boolean;
  status?: 'idle' | 'playing' | 'thinking' | 'celebrating' | 'upset';
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  seed = 'default',
  size = 60,
  isOnline = false,
  showLevel = false,
  level = 1,
  showStatus = false,
  status = 'idle',
  onClick
}) => {
  const [avatarSvg, setAvatarSvg] = useState<string>('');

  useEffect(() => {
    // Generate avatar based on seed
    const avatar = createAvatar(avataaars, {
      seed: seed,
      backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
      radius: 10,
      scale: 90
    });
    setAvatarSvg(avatar.toString());
  }, [seed]);

  const getStatusEmoji = () => {
    switch (status) {
      case 'playing': return '🎮';
      case 'thinking': return '🤔';
      case 'celebrating': return '🎉';
      case 'upset': return '😔';
      default: return '';
    }
  };

  const getStatusAnimation = () => {
    switch (status) {
      case 'thinking':
        return {
          rotate: [0, -5, 5, -5, 5, 0],
          transition: { duration: 2, repeat: Infinity }
        };
      case 'celebrating':
        return {
          y: [-2, 2, -2],
          rotate: [0, -10, 10, -10, 10, 0],
          transition: { duration: 0.5, repeat: Infinity }
        };
      case 'upset':
        return {
          y: [0, 1, 0],
          transition: { duration: 2, repeat: Infinity }
        };
      default:
        return {};
    }
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {/* Avatar Container with Animation */}
      <motion.div
        animate={getStatusAnimation()}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${isOnline ? '#10B981' : '#6B7280'}`,
          boxShadow: `0 0 20px ${isOnline ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.2)'}`,
          background: 'white'
        }}
        dangerouslySetInnerHTML={{ __html: avatarSvg }}
      />

      {/* Online Indicator */}
      {isOnline && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: size * 0.25,
            height: size * 0.25,
            background: '#10B981',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity
            }}
            style={{
              width: '100%',
              height: '100%',
              background: '#10B981',
              borderRadius: '50%'
            }}
          />
        </motion.div>
      )}

      {/* Level Badge */}
      {showLevel && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            borderRadius: '12px',
            padding: '2px 6px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(102,126,234,0.5)',
            border: '2px solid white'
          }}
        >
          Lv.{level}
        </motion.div>
      )}

      {/* Status Emoji */}
      {showStatus && status !== 'idle' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: -8,
            left: -8,
            fontSize: '1.2rem',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}
        >
          {getStatusEmoji()}
        </motion.div>
      )}
    </motion.div>
  );
};

// Avatar Selection Modal
interface AvatarSelectorProps {
  currentSeed: string;
  onSelect: (seed: string) => void;
  onClose: () => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  currentSeed,
  onSelect,
  onClose
}) => {
  const [selectedSeed, setSelectedSeed] = useState(currentSeed);
  const [customSeed, setCustomSeed] = useState('');

  const presetSeeds = [
    'Alex', 'Jordan', 'Casey', 'Morgan', 'Riley',
    'Avery', 'Quinn', 'Sage', 'River', 'Sky',
    'Phoenix', 'Storm', 'Blaze', 'Nova', 'Luna'
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '2px solid #00d4ff',
          boxShadow: '0 20px 60px rgba(0,212,255,0.3)'
        }}
      >
        <h2 style={{
          color: '#00d4ff',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          Choose Your Avatar
        </h2>

        {/* Current Avatar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <Avatar seed={selectedSeed} size={120} />
          <p style={{
            color: '#fff',
            marginTop: '1rem',
            fontSize: '0.9rem'
          }}>
            Current: {selectedSeed}
          </p>
        </div>

        {/* Preset Avatars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {presetSeeds.map(seed => (
            <motion.div
              key={seed}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedSeed(seed)}
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '0.5rem',
                borderRadius: '12px',
                background: selectedSeed === seed
                  ? 'rgba(0,212,255,0.2)'
                  : 'rgba(255,255,255,0.05)',
                border: selectedSeed === seed
                  ? '2px solid #00d4ff'
                  : '2px solid transparent'
              }}
            >
              <Avatar seed={seed} size={60} />
              <p style={{
                color: '#fff',
                fontSize: '0.7rem',
                marginTop: '0.5rem'
              }}>
                {seed}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Custom Seed Input */}
        <div style={{
          marginBottom: '2rem'
        }}>
          <label style={{
            color: '#00d4ff',
            display: 'block',
            marginBottom: '0.5rem'
          }}>
            Or create a custom avatar:
          </label>
          <div style={{
            display: 'flex',
            gap: '1rem'
          }}>
            <input
              type="text"
              placeholder="Enter any text..."
              value={customSeed}
              onChange={(e) => setCustomSeed(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
            <button
              onClick={() => customSeed && setSelectedSeed(customSeed)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #00d4ff, #00a8cc)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              padding: '0.75rem 2rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onSelect(selectedSeed);
              onClose();
            }}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
            }}
          >
            Save Avatar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Player Profile Card with Avatar
interface PlayerCardProps {
  playerName: string;
  avatarSeed: string;
  level: number;
  score: number;
  wins: number;
  isCurrentTurn?: boolean;
  isOnline?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  playerName,
  avatarSeed,
  level,
  score,
  wins,
  isCurrentTurn = false,
  isOnline = false
}) => {
  return (
    <motion.div
      animate={isCurrentTurn ? {
        boxShadow: [
          '0 0 20px rgba(0,212,255,0.3)',
          '0 0 40px rgba(0,212,255,0.5)',
          '0 0 20px rgba(0,212,255,0.3)'
        ]
      } : {}}
      transition={{
        duration: 2,
        repeat: isCurrentTurn ? Infinity : 0
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        background: isCurrentTurn
          ? 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,168,204,0.1))'
          : 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        border: isCurrentTurn
          ? '2px solid #00d4ff'
          : '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <Avatar
        seed={avatarSeed}
        size={60}
        isOnline={isOnline}
        showLevel
        level={level}
        status={isCurrentTurn ? 'thinking' : 'idle'}
      />
      <div style={{ flex: 1 }}>
        <h3 style={{
          color: '#fff',
          marginBottom: '0.25rem',
          fontSize: '1.1rem'
        }}>
          {playerName}
        </h3>
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.7)'
        }}>
          <span>Score: {score}</span>
          <span>Wins: {wins}</span>
        </div>
      </div>
      {isCurrentTurn && (
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity
          }}
          style={{
            padding: '0.25rem 0.75rem',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            borderRadius: '20px',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}
        >
          YOUR TURN
        </motion.div>
      )}
    </motion.div>
  );
};