import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface DynamicBackgroundProps {
  theme?: 'miami' | 'cyber' | 'space' | 'ocean' | 'forest' | 'sunset';
  animated?: boolean;
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
  theme = 'miami',
  animated = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!animated || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation variables
    let animationId: number;
    let time = 0;

    // Particle system for all themes
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 3 + 1;
        this.life = 1;

        // Theme-specific colors
        const colors = {
          miami: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
          cyber: ['#00D4FF', '#00A8CC', '#FF00FF', '#8A2BE2'],
          space: ['#FFFFFF', '#FFD700', '#87CEEB', '#DDA0DD'],
          ocean: ['#006994', '#00CED1', '#40E0D0', '#AFEEEE'],
          forest: ['#228B22', '#32CD32', '#90EE90', '#8FBC8F'],
          sunset: ['#FF6347', '#FF7F50', '#FFA07A', '#FFB6C1']
        };

        const themeColors = colors[theme] || colors.miami;
        this.color = themeColors[Math.floor(Math.random() * themeColors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.003;

        // Wrap around screen
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        if (this.life <= 0) {
          this.reset();
        }
      }

      draw() {
        ctx!.save();
        ctx!.globalAlpha = this.life;
        ctx!.fillStyle = this.color;
        ctx!.shadowBlur = 10;
        ctx!.shadowColor = this.color;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }

    // Create particles
    const particles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push(new Particle());
    }

    // Theme-specific render functions
    const renderTheme = {
      miami: () => {
        // Miami Vice gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Neon grid
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvas.width, i);
          ctx.stroke();
        }
      },

      cyber: () => {
        // Cyberpunk gradient
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width
        );
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(0.5, '#151a3d');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Matrix rain effect
        ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
        ctx.font = '10px monospace';
        for (let i = 0; i < canvas.width; i += 20) {
          const text = Math.random() > 0.5 ? '1' : '0';
          const y = (time * 50 + i * 10) % canvas.height;
          ctx.fillText(text, i, y);
        }
      },

      space: () => {
        // Deep space gradient
        const gradient = ctx.createRadialGradient(
          canvas.width * 0.3, canvas.height * 0.3, 0,
          canvas.width * 0.3, canvas.height * 0.3, canvas.width
        );
        gradient.addColorStop(0, '#0a0033');
        gradient.addColorStop(0.5, '#000022');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars
        ctx.fillStyle = 'white';
        for (let i = 0; i < 100; i++) {
          const x = (i * 137.5 + time * 10) % canvas.width;
          const y = (i * 99.7) % canvas.height;
          const size = Math.sin(time + i) * 0.5 + 1;
          ctx.globalAlpha = Math.sin(time * 2 + i) * 0.5 + 0.5;
          ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
      },

      ocean: () => {
        // Ocean gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#001830');
        gradient.addColorStop(0.5, '#003060');
        gradient.addColorStop(1, '#004080');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Waves
        ctx.strokeStyle = 'rgba(64, 224, 208, 0.2)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          for (let x = 0; x < canvas.width; x += 10) {
            const y = canvas.height / 2 +
                     Math.sin((x + time * 100) / 100) * 30 +
                     i * 40;
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      },

      forest: () => {
        // Forest gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a2e0a');
        gradient.addColorStop(0.5, '#0d3d0d');
        gradient.addColorStop(1, '#061806');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Fireflies
        ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
        for (let i = 0; i < 20; i++) {
          const x = (Math.sin(time + i) + 1) * canvas.width / 2;
          const y = (Math.cos(time * 0.7 + i) + 1) * canvas.height / 2;
          const size = Math.sin(time * 3 + i) * 2 + 3;
          ctx.globalAlpha = Math.sin(time * 2 + i) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },

      sunset: () => {
        // Sunset gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#FF6B35');
        gradient.addColorStop(0.3, '#F7931E');
        gradient.addColorStop(0.6, '#C9476D');
        gradient.addColorStop(1, '#4A1C40');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sun
        const sunY = canvas.height * 0.7;
        const sunRadius = 80;
        const sunGradient = ctx.createRadialGradient(
          canvas.width / 2, sunY, 0,
          canvas.width / 2, sunY, sunRadius
        );
        sunGradient.addColorStop(0, '#FFD700');
        sunGradient.addColorStop(0.5, '#FFA500');
        sunGradient.addColorStop(1, '#FF6347');
        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // Sun rays
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
        ctx.lineWidth = 2;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2, sunY);
          ctx.lineTo(
            canvas.width / 2 + Math.cos(angle + time) * canvas.width,
            sunY + Math.sin(angle + time) * canvas.height
          );
          ctx.stroke();
        }
      }
    };

    // Animation loop
    const animate = () => {
      time += 0.001;

      // Clear and render background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render theme-specific background
      renderTheme[theme]();

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [theme, animated]);

  return (
    <>
      {/* Canvas for animated background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -2,
          pointerEvents: 'none'
        }}
      />

      {/* Additional overlay effects */}
      <motion.div
        animate={{
          background: [
            'radial-gradient(circle at 20% 80%, transparent 0%, rgba(0,212,255,0.1) 50%, transparent 100%)',
            'radial-gradient(circle at 80% 20%, transparent 0%, rgba(0,212,255,0.1) 50%, transparent 100%)',
            'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,212,255,0.1) 50%, transparent 100%)',
            'radial-gradient(circle at 20% 80%, transparent 0%, rgba(0,212,255,0.1) 50%, transparent 100%)'
          ]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />

      {/* Vignette effect */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />
    </>
  );
};