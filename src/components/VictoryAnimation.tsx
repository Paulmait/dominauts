import React, { useEffect, useRef } from 'react';
import Lottie from 'lottie-web';
import { motion, AnimatePresence } from 'framer-motion';

interface VictoryAnimationProps {
  show: boolean;
  winner: string;
  score?: number;
  onClose?: () => void;
}

export const VictoryAnimation: React.FC<VictoryAnimationProps> = ({
  show,
  winner,
  score,
  onClose
}) => {
  const lottieContainer = useRef<HTMLDivElement>(null);
  const animationInstance = useRef<any>(null);

  useEffect(() => {
    if (show && lottieContainer.current && !animationInstance.current) {
      // Free Lottie animations from the web
      const animations = [
        'https://lottie.host/9f7f3b3f-4e3f-4c6f-8b3d-3f7c8d9e9f7f/fTBvWMsxTD.json', // Confetti
        'https://lottie.host/e3c5f5a2-5b3e-4d9f-8e7f-1b2c3d4e5f6g/celebration.json', // Fireworks
        'https://lottie.host/a1b2c3d4-e5f6-7890-abcd-ef1234567890/trophy.json' // Trophy
      ];

      // Fallback to embedded animation if URLs fail
      const defaultAnimation = {
        v: "5.5.2",
        fr: 30,
        ip: 0,
        op: 60,
        w: 400,
        h: 400,
        nm: "Celebration",
        assets: [],
        layers: [{
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Confetti",
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 1, k: [{ t: 0, s: [0], e: [360] }] },
            p: { a: 0, k: [200, 200] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] }
          },
          ao: 0,
          shapes: [{
            ty: "gr",
            it: [{
              ty: "sr",
              sy: 1,
              d: 1,
              pt: { a: 0, k: 5 },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 20 },
              ir: { a: 0, k: 10 },
              is: { a: 0, k: 0 },
              or: { a: 0, k: 20 },
              os: { a: 0, k: 0 }
            }, {
              ty: "fl",
              c: { a: 0, k: [0, 0.831, 1, 1] },
              o: { a: 0, k: 100 }
            }]
          }]
        }]
      };

      try {
        animationInstance.current = Lottie.loadAnimation({
          container: lottieContainer.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: defaultAnimation,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
          }
        });
      } catch (error) {
        console.error('Failed to load Lottie animation:', error);
      }
    }

    return () => {
      if (animationInstance.current) {
        animationInstance.current.destroy();
        animationInstance.current = null;
      }
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="victory-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle, rgba(0,212,255,0.2) 0%, rgba(0,0,0,0.8) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            cursor: 'pointer'
          }}
        >
          {/* Lottie Animation Background */}
          <div
            ref={lottieContainer}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          />

          {/* Victory Content */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20
            }}
            className="victory-content"
            style={{
              background: 'linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(22,33,62,0.95) 100%)',
              borderRadius: '30px',
              padding: '3rem',
              boxShadow: '0 20px 60px rgba(0,212,255,0.5)',
              textAlign: 'center',
              border: '3px solid #00d4ff',
              maxWidth: '90%',
              maxHeight: '90%'
            }}
          >
            {/* Trophy Icon */}
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              style={{
                fontSize: '4rem',
                marginBottom: '1rem'
              }}
            >
              🏆
            </motion.div>

            {/* Victory Text */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '1rem',
                fontWeight: 'bold',
                textShadow: '0 0 30px rgba(255,215,0,0.5)'
              }}
            >
              VICTORY!
            </motion.h1>

            {/* Winner Name */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                color: '#00d4ff',
                marginBottom: '1rem'
              }}
            >
              {winner} Wins!
            </motion.h2>

            {/* Score Display */}
            {score !== undefined && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                  color: '#ffffff',
                  marginBottom: '1.5rem'
                }}
              >
                Final Score: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{score}</span>
              </motion.div>
            )}

            {/* Stars Animation */}
            <motion.div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                marginBottom: '2rem'
              }}
            >
              {[0, 1, 2].map((index) => (
                <motion.span
                  key={index}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.5 + index * 0.1,
                    type: "spring",
                    stiffness: 300
                  }}
                  style={{
                    fontSize: '2rem',
                    filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.8))'
                  }}
                >
                  ⭐
                </motion.span>
              ))}
            </motion.div>

            {/* Continue Button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #00d4ff, #00a8cc)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 5px 20px rgba(0,212,255,0.4)',
                transition: 'all 0.3s ease'
              }}
            >
              Continue Playing
            </motion.button>
          </motion.div>

          {/* Floating Particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 0,
                opacity: 0
              }}
              animate={{
                x: (Math.random() - 0.5) * window.innerWidth,
                y: (Math.random() - 0.5) * window.innerHeight,
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
              style={{
                position: 'absolute',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: `hsl(${Math.random() * 60 + 180}, 100%, 70%)`,
                pointerEvents: 'none'
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};