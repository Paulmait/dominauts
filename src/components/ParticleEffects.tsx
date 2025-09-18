import React from 'react';
import { Particles } from '@tsparticles/react';

interface ParticleEffectsProps {
  type?: 'ambient' | 'celebration' | 'explosion' | 'stars';
  color?: string;
}

export const ParticleEffects: React.FC<ParticleEffectsProps> = ({
  type = 'ambient',
  color = '#00d4ff'
}) => {
  const getParticleConfig = () => {
    switch (type) {
      case 'celebration':
        return {
          particles: {
            number: {
              value: 100,
              density: {
                enable: true,
                value_area: 800
              }
            },
            color: {
              value: ["#FFD700", "#FF69B4", "#00CED1", "#FF6347", "#7FFF00"]
            },
            shape: {
              type: ["circle", "square", "triangle"],
            },
            opacity: {
              value: 1,
              random: true,
              anim: {
                enable: true,
                speed: 1,
                opacity_min: 0,
                sync: false
              }
            },
            size: {
              value: 5,
              random: true,
              anim: {
                enable: true,
                speed: 3,
                size_min: 1,
                sync: false
              }
            },
            move: {
              enable: true,
              speed: 8,
              direction: "none" as const,
              random: true,
              straight: false,
              out_mode: "out" as const,
              bounce: false,
              attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
              }
            },
            life: {
              duration: {
                value: 3
              },
              count: 1
            }
          },
          interactivity: {
            events: {
              onhover: {
                enable: false
              },
              onclick: {
                enable: false
              }
            }
          },
          retina_detect: true,
          emitters: {
            direction: "top" as const,
            rate: {
              quantity: 50,
              delay: 0.05
            },
            size: {
              width: 100,
              height: 10
            },
            position: {
              x: 50,
              y: 100
            }
          }
        };

      case 'explosion':
        return {
          particles: {
            number: {
              value: 0
            },
            color: {
              value: color
            },
            shape: {
              type: "circle"
            },
            opacity: {
              value: { min: 0.1, max: 1 },
              anim: {
                enable: true,
                speed: 1,
                opacity_min: 0,
                sync: false
              }
            },
            size: {
              value: { min: 1, max: 5 },
              anim: {
                enable: true,
                speed: 5,
                size_min: 0.1,
                sync: false
              }
            },
            move: {
              enable: true,
              speed: { min: 10, max: 20 },
              direction: "none" as const,
              random: false,
              straight: false,
              out_mode: "destroy" as const,
              attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
              }
            }
          },
          interactivity: {
            events: {
              onclick: {
                enable: true,
                mode: "push"
              }
            },
            modes: {
              push: {
                particles_nb: 30
              }
            }
          },
          retina_detect: true
        };

      case 'stars':
        return {
          particles: {
            number: {
              value: 50,
              density: {
                enable: true,
                value_area: 800
              }
            },
            color: {
              value: "#ffffff"
            },
            shape: {
              type: "star"
            },
            opacity: {
              value: 0.8,
              random: true,
              anim: {
                enable: true,
                speed: 1,
                opacity_min: 0.1,
                sync: false
              }
            },
            size: {
              value: 3,
              random: true,
              anim: {
                enable: true,
                speed: 2,
                size_min: 0.1,
                sync: false
              }
            },
            move: {
              enable: true,
              speed: 1,
              direction: "none" as const,
              random: true,
              straight: false,
              out_mode: "out" as const,
              bounce: false
            }
          },
          interactivity: {
            events: {
              onhover: {
                enable: true,
                mode: "grab"
              }
            },
            modes: {
              grab: {
                distance: 150,
                line_linked: {
                  opacity: 1
                }
              }
            }
          },
          retina_detect: true
        };

      case 'ambient':
      default:
        return {
          particles: {
            number: {
              value: 30,
              density: {
                enable: true,
                value_area: 800
              }
            },
            color: {
              value: color
            },
            shape: {
              type: "circle"
            },
            opacity: {
              value: 0.3,
              random: true,
              anim: {
                enable: true,
                speed: 0.5,
                opacity_min: 0.1,
                sync: false
              }
            },
            size: {
              value: 3,
              random: true,
              anim: {
                enable: true,
                speed: 2,
                size_min: 1,
                sync: false
              }
            },
            line_linked: {
              enable: true,
              distance: 150,
              color: color,
              opacity: 0.2,
              width: 1
            },
            move: {
              enable: true,
              speed: 1,
              direction: "none" as const,
              random: false,
              straight: false,
              out_mode: "bounce" as const,
              bounce: false,
              attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200
              }
            }
          },
          interactivity: {
            detect_on: "canvas" as const,
            events: {
              onhover: {
                enable: true,
                mode: "repulse"
              },
              onclick: {
                enable: true,
                mode: "bubble"
              },
              resize: {
                enable: true
              }
            },
            modes: {
              repulse: {
                distance: 100,
                duration: 0.4
              },
              bubble: {
                distance: 200,
                size: 6,
                duration: 2,
                opacity: 0.8,
                speed: 3
              }
            }
          },
          retina_detect: true,
          background: {
            color: "transparent"
          }
        };
    }
  };

  return (
    <Particles
      id={`tsparticles-${type}`}
      options={getParticleConfig()}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: type === 'ambient' ? 'none' : 'auto',
        zIndex: type === 'celebration' ? 9999 : 1
      }}
    />
  );
};

// Simplified particle burst for tile interactions
export const createParticleBurst = (x: number, y: number, color: string = '#00d4ff') => {
  const particleCount = 15;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = `${x}px`;
  container.style.top = `${y}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '10000';
  document.body.appendChild(container);

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '8px';
    particle.style.height = '8px';
    particle.style.borderRadius = '50%';
    particle.style.background = color;
    particle.style.boxShadow = `0 0 6px ${color}`;

    const angle = (Math.PI * 2 * i) / particleCount;
    const velocity = 50 + Math.random() * 50;
    const lifetime = 0.5 + Math.random() * 0.5;

    particle.style.animation = `
      particle-fly-${i} ${lifetime}s ease-out forwards
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes particle-fly-${i} {
        to {
          transform: translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);

    container.appendChild(particle);

    setTimeout(() => {
      styleSheet.remove();
    }, lifetime * 1000);
  }

  setTimeout(() => {
    container.remove();
  }, 1500);
};