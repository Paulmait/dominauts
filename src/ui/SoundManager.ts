export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private volume: number = 0.5;
  private isMuted: boolean = false;
  private isEnabled: boolean = true;

  constructor() {
    this.loadSettings();
    this.initAudioContext();
    this.generateSounds();
  }

  private loadSettings(): void {
    const savedVolume = localStorage.getItem('domino-volume');
    const savedMuted = localStorage.getItem('domino-muted');
    
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
    
    if (savedMuted === 'true') {
      this.isMuted = true;
    }
  }

  private initAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Resume context on user interaction
      document.addEventListener('click', () => {
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }
      }, { once: true });
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.isEnabled = false;
    }
  }

  private generateSounds(): void {
    if (!this.audioContext || !this.isEnabled) return;

    // Generate synthetic sounds
    this.sounds.set('tilePlacement', this.createTilePlacementSound());
    this.sounds.set('tilePickup', this.createTilePickupSound());
    this.sounds.set('score', this.createScoreSound());
    this.sounds.set('win', this.createWinSound());
    this.sounds.set('lose', this.createLoseSound());
    this.sounds.set('buttonClick', this.createButtonClickSound());
    this.sounds.set('error', this.createErrorSound());
    this.sounds.set('swoosh', this.createSwooshSound());
  }

  private createTilePlacementSound(): AudioBuffer {
    const duration = 0.2;
    const sampleRate = this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Mix of frequencies for a solid "clack" sound
      data[i] = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-10 * t) +
                Math.sin(2 * Math.PI * 400 * t) * Math.exp(-15 * t) * 0.5 +
                (Math.random() - 0.5) * 0.1 * Math.exp(-20 * t);
    }

    return buffer;
  }

  private createTilePickupSound(): AudioBuffer {
    const duration = 0.15;
    const sampleRate = this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Rising pitch for pickup
      const freq = 300 + 200 * t;
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-5 * t) * 0.3;
    }

    return buffer;
  }

  private createScoreSound(): AudioBuffer {
    const duration = 0.5;
    const sampleRate = this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Ascending arpeggio
      const note = Math.floor(t * 8) % 4;
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
      data[i] = Math.sin(2 * Math.PI * frequencies[note] * t) * 
                Math.exp(-2 * t) * 0.3;
    }

    return buffer;
  }

  private createWinSound(): AudioBuffer {
    const duration = 1.5;
    const sampleRate = this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Victory fanfare
      const envelope = Math.exp(-0.5 * t);
      const vibrato = 1 + 0.05 * Math.sin(2 * Math.PI * 6 * t);
      
      data[i] = (
        Math.sin(2 * Math.PI * 523.25 * vibrato * t) +
        Math.sin(2 * Math.PI * 659.25 * vibrato * t) * 0.8 +
        Math.sin(2 * Math.PI * 783.99 * vibrato * t) * 0.6
      ) * envelope * 0.2;
    }

    return buffer;
  }

  private createLoseSound(): AudioBuffer {
    const duration = 1;
    const sampleRate = this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Descending sad trombone
      const freq = 200 * Math.exp(-0.5 * t);
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-2 * t) * 0.3;
    }

    return buffer;
  }

  private createButtonClickSound(): AudioBuffer {
    const duration = 0.05;
    const sampleRate = this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-100 * t) * 0.2;
    }

    return buffer;
  }

  private createErrorSound(): AudioBuffer {
    const duration = 0.3;
    const sampleRate = this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // Dissonant frequencies
      data[i] = (
        Math.sin(2 * Math.PI * 200 * t) +
        Math.sin(2 * Math.PI * 213 * t)
      ) * Math.exp(-5 * t) * 0.2;
    }

    return buffer;
  }

  private createSwooshSound(): AudioBuffer {
    const duration = 0.3;
    const sampleRate = this.audioContext!.sampleRate;
    const buffer = this.audioContext!.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      // White noise with envelope
      const envelope = Math.sin(Math.PI * t / duration);
      data[i] = (Math.random() - 0.5) * envelope * 0.1;
    }

    return buffer;
  }

  play(soundName: string): void {
    if (!this.audioContext || !this.isEnabled || this.isMuted) return;

    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = this.volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start(0);
    } catch (error) {
      console.warn(`Error playing sound '${soundName}':`, error);
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('domino-volume', this.volume.toString());
  }

  getVolume(): number {
    return this.volume;
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    localStorage.setItem('domino-muted', this.isMuted.toString());
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  createVolumeControl(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'volume-control';
    
    const muteBtn = document.createElement('button');
    muteBtn.className = 'mute-btn';
    muteBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
    muteBtn.title = 'Toggle sound';
    
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = (this.volume * 100).toString();
    volumeSlider.className = 'volume-slider';
    
    muteBtn.addEventListener('click', () => {
      this.toggleMute();
      muteBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
      this.play('buttonClick');
    });
    
    volumeSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setVolume(parseInt(target.value) / 100);
      this.play('buttonClick');
    });
    
    container.appendChild(muteBtn);
    container.appendChild(volumeSlider);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .volume-control {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--color-surface, #fff);
        padding: 0.5rem;
        border-radius: 25px;
        box-shadow: var(--shadow-lg);
        z-index: 900;
      }

      .mute-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: var(--color-primary, #667eea);
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .mute-btn:hover {
        transform: scale(1.1);
      }

      .volume-slider {
        width: 100px;
        height: 4px;
        background: var(--color-primary, #667eea);
        outline: none;
        cursor: pointer;
      }

      .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: var(--color-primary, #667eea);
        border-radius: 50%;
        cursor: pointer;
      }

      .volume-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: var(--color-primary, #667eea);
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }
    `;
    
    if (!document.getElementById('volume-control-styles')) {
      style.id = 'volume-control-styles';
      document.head.appendChild(style);
    }
    
    return container;
  }
}