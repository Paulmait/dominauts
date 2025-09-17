/**
 * Advanced Sound System with FREE sounds
 * Using Web Audio API for professional sound effects
 */

export class SoundSystem {
  private audioContext: AudioContext;
  private sounds: Map<string, AudioBuffer> = new Map();
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private enabled: boolean = true;
  private vibrateEnabled: boolean = true;

  // Free sound URLs (use Zapsplat or generate with code)
  private soundLibrary = {
    // Tile sounds
    tilePlace: this.generateTileSound(440, 0.1),
    tilePickup: this.generateTileSound(520, 0.08),
    tileHover: this.generateTileSound(660, 0.05),
    tileDrop: this.generateTileSound(220, 0.15),

    // Game events
    victory: this.generateVictorySound(),
    defeat: this.generateDefeatSound(),
    levelUp: this.generateLevelUpSound(),
    achievement: this.generateAchievementSound(),

    // UI sounds
    buttonClick: this.generateClickSound(880, 0.03),
    buttonHover: this.generateClickSound(1100, 0.02),
    menuOpen: this.generateWhooshSound(true),
    menuClose: this.generateWhooshSound(false),

    // Feedback sounds
    success: this.generateSuccessSound(),
    error: this.generateErrorSound(),
    notification: this.generateNotificationSound(),
    coin: this.generateCoinSound(),

    // Background music (generative)
    ambientMusic: this.generateAmbientMusic()
  };

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.initializeSounds();
  }

  private async initializeSounds() {
    // Generate all sounds programmatically (FREE!)
    for (const [name, soundData] of Object.entries(this.soundLibrary)) {
      if (typeof soundData === 'function') {
        this.sounds.set(name, await soundData());
      }
    }
  }

  // Generate tile placement sound
  private generateTileSound(frequency: number, duration: number) {
    return () => {
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // Mix of sine waves for wooden sound
        data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.3 +
                  Math.sin(2 * Math.PI * frequency * 2 * t) * 0.2 +
                  Math.sin(2 * Math.PI * frequency * 3 * t) * 0.1;

        // Envelope for sharp attack
        const envelope = Math.exp(-t * 10) * (1 - t / duration);
        data[i] *= envelope;

        // Add click transient
        if (i < sampleRate * 0.002) {
          data[i] += (Math.random() - 0.5) * 0.5 * (1 - i / (sampleRate * 0.002));
        }
      }

      return buffer;
    };
  }

  // Generate victory fanfare
  private generateVictorySound() {
    return () => {
      const duration = 1.5;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          let sample = 0;

          // Major chord progression
          const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
          const noteIndex = Math.floor(t * 8) % notes.length;
          const frequency = notes[noteIndex];

          // Synthesize triumphant sound
          sample += Math.sin(2 * Math.PI * frequency * t) * 0.3;
          sample += Math.sin(2 * Math.PI * frequency * 2 * t) * 0.2;
          sample += Math.sin(2 * Math.PI * frequency * 3 * t) * 0.1;

          // Add harmonics
          sample += Math.sin(2 * Math.PI * frequency * 1.5 * t) * 0.15;

          // Envelope
          const envelope = Math.min(1, t * 10) * Math.exp(-t * 0.5);
          sample *= envelope;

          // Stereo effect
          if (channel === 0) {
            sample *= 0.8 + Math.sin(t * 5) * 0.2;
          } else {
            sample *= 0.8 + Math.cos(t * 5) * 0.2;
          }

          data[i] = sample;
        }
      }

      return buffer;
    };
  }

  // Generate defeat sound
  private generateDefeatSound() {
    return () => {
      const duration = 1.0;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Descending pitch
        const frequency = 440 * Math.exp(-t * 2);
        let sample = Math.sin(2 * Math.PI * frequency * t) * 0.3;

        // Add dissonance
        sample += Math.sin(2 * Math.PI * frequency * 1.4 * t) * 0.2;

        // Envelope
        const envelope = Math.exp(-t * 3);
        data[i] = sample * envelope;
      }

      return buffer;
    };
  }

  // Generate level up sound
  private generateLevelUpSound() {
    return () => {
      const duration = 0.8;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;

          // Ascending arpeggio
          const baseFreq = 261.63; // C4
          const multipliers = [1, 1.25, 1.5, 2]; // Major arpeggio
          const noteIndex = Math.floor(t * 16) % multipliers.length;
          const frequency = baseFreq * multipliers[noteIndex] * (1 + t * 0.5);

          let sample = Math.sin(2 * Math.PI * frequency * t) * 0.3;
          sample += Math.sin(2 * Math.PI * frequency * 2 * t) * 0.1;

          // Sparkle effect
          if (Math.random() < 0.1) {
            sample += (Math.random() - 0.5) * 0.1 * Math.exp(-t * 5);
          }

          // Envelope
          const envelope = Math.sin(Math.PI * t / duration) * Math.exp(-t * 0.5);
          data[i] = sample * envelope;
        }
      }

      return buffer;
    };
  }

  // Generate achievement sound
  private generateAchievementSound() {
    return () => {
      const duration = 0.6;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;

          // Bell-like sound
          const frequency = 1318.51; // E6
          let sample = 0;

          // Add partials for bell timbre
          const partials = [1, 2.4, 3.9, 5.4];
          const amplitudes = [1, 0.6, 0.4, 0.25];

          for (let j = 0; j < partials.length; j++) {
            sample += Math.sin(2 * Math.PI * frequency * partials[j] * t) * amplitudes[j];
          }

          // Ring modulation for shimmer
          sample *= 1 + Math.sin(2 * Math.PI * 20 * t) * 0.3;

          // Envelope
          const envelope = Math.exp(-t * 2) * 0.5;
          data[i] = sample * envelope;
        }
      }

      return buffer;
    };
  }

  // Generate click sound
  private generateClickSound(frequency: number, duration: number) {
    return () => {
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Click transient
        let sample = (Math.random() - 0.5) * Math.exp(-t * 100);

        // Add tone
        sample += Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 50);

        data[i] = sample * 0.5;
      }

      return buffer;
    };
  }

  // Generate whoosh sound
  private generateWhooshSound(ascending: boolean) {
    return () => {
      const duration = 0.3;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;

          // Filtered noise
          let sample = 0;
          for (let j = 0; j < 10; j++) {
            const freq = ascending ?
              100 * Math.exp(t * 10) :
              2000 * Math.exp(-t * 10);
            sample += Math.sin(2 * Math.PI * freq * (t + j * 0.01)) * (Math.random() - 0.5);
          }

          // Envelope
          const envelope = Math.sin(Math.PI * t / duration);
          data[i] = sample * envelope * 0.2;
        }
      }

      return buffer;
    };
  }

  // Success sound
  private generateSuccessSound() {
    return () => {
      const duration = 0.25;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Major third interval
        let sample = Math.sin(2 * Math.PI * 523.25 * t) * 0.3; // C5
        sample += Math.sin(2 * Math.PI * 659.25 * t) * 0.3; // E5

        const envelope = Math.exp(-t * 5);
        data[i] = sample * envelope;
      }

      return buffer;
    };
  }

  // Error sound
  private generateErrorSound() {
    return () => {
      const duration = 0.3;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Dissonant interval
        let sample = Math.sin(2 * Math.PI * 220 * t) * 0.3; // A3
        sample += Math.sin(2 * Math.PI * 233 * t) * 0.3; // Bb3

        const envelope = Math.exp(-t * 4);
        data[i] = sample * envelope;
      }

      return buffer;
    };
  }

  // Notification sound
  private generateNotificationSound() {
    return () => {
      const duration = 0.4;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;

          // Two-tone chime
          const freq1 = 880; // A5
          const freq2 = 1108.73; // C#6

          let sample = 0;
          if (t < duration / 2) {
            sample = Math.sin(2 * Math.PI * freq1 * t) * 0.3;
          } else {
            sample = Math.sin(2 * Math.PI * freq2 * t) * 0.3;
          }

          const envelope = Math.exp(-t * 3) * 0.7;
          data[i] = sample * envelope;
        }
      }

      return buffer;
    };
  }

  // Coin collection sound
  private generateCoinSound() {
    return () => {
      const duration = 0.2;
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Multiple high frequencies for metallic sound
        let sample = 0;
        const frequencies = [2093, 2637, 3136]; // C7, E7, G7

        for (const freq of frequencies) {
          sample += Math.sin(2 * Math.PI * freq * t) * 0.2;
        }

        // Add shimmer
        sample *= 1 + Math.sin(2 * Math.PI * 50 * t) * 0.3;

        const envelope = Math.exp(-t * 10);
        data[i] = sample * envelope;
      }

      return buffer;
    };
  }

  // Generate ambient background music
  private generateAmbientMusic() {
    return () => {
      const duration = 30; // 30 second loop
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * duration;
      const buffer = this.audioContext.createBuffer(2, length, sampleRate);

      // Chord progression
      const chords = [
        [261.63, 329.63, 392.00], // C major
        [293.66, 349.23, 440.00], // D minor
        [329.63, 392.00, 493.88], // E minor
        [261.63, 329.63, 392.00], // C major
      ];

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const chordIndex = Math.floor(t / 2) % chords.length;
          const chord = chords[chordIndex];

          let sample = 0;

          // Synthesize chord
          for (const note of chord) {
            sample += Math.sin(2 * Math.PI * note * t) * 0.05;
            sample += Math.sin(2 * Math.PI * note * 0.5 * t) * 0.03; // Sub bass
          }

          // Add pad texture
          sample += Math.sin(2 * Math.PI * 110 * t) * Math.sin(t * 0.5) * 0.02;

          // LFO for movement
          sample *= 1 + Math.sin(2 * Math.PI * 0.2 * t) * 0.2;

          // Stereo width
          if (channel === 1) {
            sample *= 1 + Math.sin(2 * Math.PI * 0.1 * t) * 0.1;
          }

          data[i] = sample;
        }
      }

      return buffer;
    };
  }

  // Play sound with volume and effects
  public play(soundName: string, options: {
    volume?: number;
    pitch?: number;
    pan?: number;
    delay?: number;
    reverb?: number;
  } = {}) {
    if (!this.enabled) return;

    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Create gain node for volume
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = (options.volume || 1) * this.sfxVolume;

    // Create panner for stereo positioning
    const pannerNode = this.audioContext.createStereoPanner();
    pannerNode.pan.value = options.pan || 0;

    // Pitch adjustment
    source.playbackRate.value = options.pitch || 1;

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(pannerNode);

    // Add reverb if requested
    if (options.reverb) {
      const convolver = this.audioContext.createConvolver();
      // Create impulse response for reverb
      const impulseBuffer = this.createImpulseResponse(options.reverb);
      convolver.buffer = impulseBuffer;

      const wetGain = this.audioContext.createGain();
      wetGain.gain.value = options.reverb;

      const dryGain = this.audioContext.createGain();
      dryGain.gain.value = 1 - options.reverb;

      pannerNode.connect(convolver);
      convolver.connect(wetGain);
      pannerNode.connect(dryGain);

      wetGain.connect(this.audioContext.destination);
      dryGain.connect(this.audioContext.destination);
    } else {
      pannerNode.connect(this.audioContext.destination);
    }

    // Play with optional delay
    source.start(this.audioContext.currentTime + (options.delay || 0));

    // Add haptic feedback for mobile
    this.triggerHaptic(soundName);
  }

  // Create impulse response for reverb
  private createImpulseResponse(seconds: number): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * seconds;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / length * 3);
      }
    }

    return impulse;
  }

  // Haptic feedback
  private triggerHaptic(soundName: string) {
    if (!this.vibrateEnabled || !navigator.vibrate) return;

    const hapticPatterns: { [key: string]: number[] } = {
      tilePlace: [10],
      tilePickup: [5],
      victory: [50, 100, 50, 100, 200],
      achievement: [25, 25, 25],
      error: [100],
      success: [10, 20, 10],
      buttonClick: [5],
      coin: [10, 10]
    };

    const pattern = hapticPatterns[soundName];
    if (pattern) {
      navigator.vibrate(pattern);
    }
  }

  // Play background music
  public playMusic() {
    // Implementation for looping background music
    // Would connect to Web Audio API with loop enabled
  }

  // Stop all sounds
  public stopAll() {
    // Implementation to stop all playing sounds
  }

  // Set volumes
  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }

  // Enable/disable
  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  public setHapticEnabled(enabled: boolean) {
    this.vibrateEnabled = enabled;
  }
}

// Singleton instance
export const soundSystem = new SoundSystem();