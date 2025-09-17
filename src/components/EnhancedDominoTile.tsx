import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createParticleBurst } from './ParticleEffects';
import '../styles/enhanced-ui.css';

interface EnhancedDominoTileProps {
  leftValue: number;
  rightValue: number;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onPlace?: () => void;
  animateEntry?: boolean;
  index?: number;
  rotation?: number;
  scale?: number;
}

export const EnhancedDominoTile: React.FC<EnhancedDominoTileProps> = ({
  leftValue,
  rightValue,
  isPlayable = true,
  isSelected = false,
  onClick,
  onPlace,
  animateEntry = true,
  index = 0,
  rotation = 0,
  scale = 1
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent) => {
    if (!isPlayable) return;

    // Create ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { x, y, id: Date.now() };
    setRipples([...ripples, newRipple]);

    // Create particle burst
    createParticleBurst(e.clientX, e.clientY, isSelected ? '#ffd700' : '#00d4ff');

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);

    if (onClick) onClick(e);
    if (onPlace && isSelected) onPlace();
  };

  const renderDots = (value: number) => {
    const dotPositions: { [key: number]: Array<{ x: number; y: number }> } = {
      0: [],
      1: [{ x: 50, y: 50 }],
      2: [{ x: 30, y: 30 }, { x: 70, y: 70 }],
      3: [{ x: 30, y: 30 }, { x: 50, y: 50 }, { x: 70, y: 70 }],
      4: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
      5: [{ x: 30, y: 30 }, { x: 70, y: 30 }, { x: 50, y: 50 }, { x: 30, y: 70 }, { x: 70, y: 70 }],
      6: [{ x: 30, y: 25 }, { x: 70, y: 25 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 75 }, { x: 70, y: 75 }]
    };

    return (dotPositions[value] || []).map((pos, i) => (
      <motion.div
        key={i}
        className="domino-dot"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: animateEntry ? 0.1 * i + index * 0.05 : 0,
          type: "spring",
          stiffness: 500,
          damping: 15
        }}
        style={{
          position: 'absolute',
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '8px',
          background: 'radial-gradient(circle at 30% 30%, #ffffff, #e0e0e0)',
          borderRadius: '50%',
          boxShadow: 'inset -1px -1px 2px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.5)'
        }}
      />
    ));
  };

  return (
    <motion.div
      className={`domino-tile-3d ${isPlayable ? 'playable' : 'disabled'} ${isSelected ? 'selected' : ''}`}
      initial={animateEntry ? {
        scale: 0,
        rotate: -180,
        opacity: 0,
        y: -50
      } : false}
      animate={{
        scale: scale,
        rotate: rotation,
        opacity: 1,
        y: 0,
        filter: isPlayable ? 'brightness(1)' : 'brightness(0.5)'
      }}
      exit={{
        scale: 0,
        rotate: 180,
        opacity: 0,
        y: 50
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: animateEntry ? index * 0.05 : 0
      }}
      whileHover={isPlayable ? {
        scale: scale * 1.1,
        rotate: rotation + 5,
        transition: { duration: 0.2 }
      } : {}}
      whileTap={isPlayable ? {
        scale: scale * 0.95,
        rotate: rotation - 5
      } : {}}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isPlayable ? 'pointer' : 'not-allowed',
        userSelect: 'none',
        background: isSelected
          ? 'linear-gradient(145deg, #ffd700, #ffed4e)'
          : isHovered
          ? 'linear-gradient(145deg, #3a3a4e, #2a2a3e)'
          : 'linear-gradient(145deg, #2e2e42, #1a1a2e)',
        boxShadow: isSelected
          ? '0 0 30px rgba(255,215,0,0.6), inset 0 2px 4px rgba(255,255,255,0.3)'
          : isHovered
          ? '0 10px 30px rgba(0,212,255,0.4), inset 0 2px 4px rgba(255,255,255,0.2)'
          : '0 4px 20px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.1)',
        border: isSelected
          ? '2px solid #ffd700'
          : '1px solid rgba(0,212,255,0.3)',
        width: '80px',
        height: '40px',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* Divider Line */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: animateEntry ? index * 0.05 + 0.2 : 0 }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '10%',
          bottom: '10%',
          width: '2px',
          background: isSelected
            ? 'linear-gradient(180deg, transparent, #ffed4e, transparent)'
            : 'linear-gradient(180deg, transparent, #00d4ff, transparent)',
          transform: 'translateX(-50%)',
          opacity: 0.6
        }}
      />

      {/* Left Half */}
      <div style={{
        position: 'relative',
        width: '50%',
        height: '100%'
      }}>
        {renderDots(leftValue)}
      </div>

      {/* Right Half */}
      <div style={{
        position: 'relative',
        width: '50%',
        height: '100%'
      }}>
        {renderDots(rightValue)}
      </div>

      {/* Ripple Effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          />
        ))}
      </AnimatePresence>

      {/* Shine Effect */}
      {isHovered && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
            transform: 'rotate(45deg)',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Glow Effect for Selected */}
      {isSelected && (
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            inset: -2,
            background: 'radial-gradient(circle, rgba(255,215,0,0.3), transparent)',
            borderRadius: '8px',
            pointerEvents: 'none'
          }}
        />
      )}
    </motion.div>
  );
};