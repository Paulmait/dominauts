import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundSystem } from '../services/SoundSystem';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  // Sound settings
  const [masterVolume, setMasterVolume] = useState(100);
  const [sfxVolume, setSfxVolume] = useState(70);
  const [musicVolume, setMusicVolume] = useState(50);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Display settings
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');
  const [backgroundTheme, setBackgroundTheme] = useState('miami');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [particlesEnabled, setParticlesEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  // Game settings
  const [autoSave, setAutoSave] = useState(true);
  const [showHints, setShowHints] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('en');

  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(false);
  const [achievementAlerts, setAchievementAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setMasterVolume(settings.masterVolume ?? 100);
      setSfxVolume(settings.sfxVolume ?? 70);
      setMusicVolume(settings.musicVolume ?? 50);
      setSoundEnabled(settings.soundEnabled ?? true);
      setHapticEnabled(settings.hapticEnabled ?? true);
      setTheme(settings.theme ?? 'system');
      setBackgroundTheme(settings.backgroundTheme ?? 'miami');
      setAnimationsEnabled(settings.animationsEnabled ?? true);
      setParticlesEnabled(settings.particlesEnabled ?? true);
      setHighContrast(settings.highContrast ?? false);
      setAutoSave(settings.autoSave ?? true);
      setShowHints(settings.showHints ?? true);
      setShowTimer(settings.showTimer ?? true);
      setDifficulty(settings.difficulty ?? 'medium');
      setLanguage(settings.language ?? 'en');
      setNotificationsEnabled(settings.notificationsEnabled ?? true);
      setDailyReminders(settings.dailyReminders ?? false);
      setAchievementAlerts(settings.achievementAlerts ?? true);
      setSoundAlerts(settings.soundAlerts ?? true);
    }
  }, []);

  // Detect system theme
  useEffect(() => {
    const detectTheme = () => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setActualTheme(isDark ? 'dark' : 'light');
      } else {
        setActualTheme(theme);
      }
    };

    detectTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', detectTheme);

    return () => mediaQuery.removeEventListener('change', detectTheme);
  }, [theme]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme);
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [actualTheme, highContrast]);

  // Save settings
  const saveSettings = () => {
    const settings = {
      masterVolume,
      sfxVolume,
      musicVolume,
      soundEnabled,
      hapticEnabled,
      theme,
      backgroundTheme,
      animationsEnabled,
      particlesEnabled,
      highContrast,
      autoSave,
      showHints,
      showTimer,
      difficulty,
      language,
      notificationsEnabled,
      dailyReminders,
      achievementAlerts,
      soundAlerts
    };

    localStorage.setItem('gameSettings', JSON.stringify(settings));

    // Apply sound settings
    soundSystem.setEnabled(soundEnabled);
    soundSystem.setSfxVolume(sfxVolume / 100);
    soundSystem.setMusicVolume(musicVolume / 100);
    soundSystem.setHapticEnabled(hapticEnabled);

    // Play confirmation sound
    if (soundEnabled) {
      soundSystem.play('success');
    }

    onClose();
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setMasterVolume(100);
    setSfxVolume(70);
    setMusicVolume(50);
    setSoundEnabled(true);
    setHapticEnabled(true);
    setTheme('system');
    setBackgroundTheme('miami');
    setAnimationsEnabled(true);
    setParticlesEnabled(true);
    setHighContrast(false);
    setAutoSave(true);
    setShowHints(true);
    setShowTimer(true);
    setDifficulty('medium');
    setLanguage('en');
    setNotificationsEnabled(true);
    setDailyReminders(false);
    setAchievementAlerts(true);
    setSoundAlerts(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="settings-overlay"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="settings-panel"
            style={{
              background: actualTheme === 'dark'
                ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
                : 'linear-gradient(135deg, #f5f5f5, #e0e0e0)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              border: `2px solid ${actualTheme === 'dark' ? '#00d4ff' : '#007acc'}`,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              color: actualTheme === 'dark' ? '#fff' : '#333'
            }}
          >
            <h2 style={{
              color: actualTheme === 'dark' ? '#00d4ff' : '#007acc',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ⚙️ Settings
            </h2>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              borderBottom: `2px solid ${actualTheme === 'dark' ? 'rgba(0,212,255,0.2)' : 'rgba(0,122,204,0.2)'}`,
              paddingBottom: '0.5rem'
            }}>
              {['Sound', 'Display', 'Game', 'Notifications'].map((tab) => (
                <button
                  key={tab}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    color: actualTheme === 'dark' ? '#fff' : '#333',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = actualTheme === 'dark'
                      ? 'rgba(0,212,255,0.1)'
                      : 'rgba(0,122,204,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sound Settings */}
            <div className="settings-section">
              <h3 style={{ color: actualTheme === 'dark' ? '#00d4ff' : '#007acc' }}>
                🔊 Sound Settings
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                  Enable Sound
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label>Master Volume: {masterVolume}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => {
                    setMasterVolume(Number(e.target.value));
                    setSfxVolume(Math.min(sfxVolume, Number(e.target.value)));
                    setMusicVolume(Math.min(musicVolume, Number(e.target.value)));
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label>Sound Effects: {sfxVolume}%</label>
                <input
                  type="range"
                  min="0"
                  max={masterVolume}
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(Number(e.target.value))}
                  disabled={!soundEnabled}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label>Music: {musicVolume}%</label>
                <input
                  type="range"
                  min="0"
                  max={masterVolume}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  disabled={!soundEnabled}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={hapticEnabled}
                    onChange={(e) => setHapticEnabled(e.target.checked)}
                  />
                  📳 Haptic Feedback (Vibration)
                </label>
              </div>

              <button
                onClick={() => soundSystem.play('success')}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #00d4ff, #00a8cc)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Test Sound
              </button>
            </div>

            {/* Display Settings */}
            <div className="settings-section" style={{ marginTop: '2rem' }}>
              <h3 style={{ color: actualTheme === 'dark' ? '#00d4ff' : '#007acc' }}>
                🎨 Display Settings
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label>Theme Mode</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: actualTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    borderRadius: '8px',
                    color: actualTheme === 'dark' ? '#fff' : '#333'
                  }}
                >
                  <option value="system">🖥️ System Default</option>
                  <option value="light">☀️ Light Mode</option>
                  <option value="dark">🌙 Dark Mode</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label>Background Theme</label>
                <select
                  value={backgroundTheme}
                  onChange={(e) => setBackgroundTheme(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: actualTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    borderRadius: '8px',
                    color: actualTheme === 'dark' ? '#fff' : '#333'
                  }}
                >
                  <option value="miami">🌴 Miami Vice</option>
                  <option value="cyber">🤖 Cyberpunk</option>
                  <option value="space">🚀 Deep Space</option>
                  <option value="ocean">🌊 Ocean Waves</option>
                  <option value="forest">🌲 Forest</option>
                  <option value="sunset">🌅 Sunset</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={animationsEnabled}
                    onChange={(e) => setAnimationsEnabled(e.target.checked)}
                  />
                  Enable Animations
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={particlesEnabled}
                    onChange={(e) => setParticlesEnabled(e.target.checked)}
                  />
                  Enable Particle Effects
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                  />
                  High Contrast Mode
                </label>
              </div>
            </div>

            {/* Game Settings */}
            <div className="settings-section" style={{ marginTop: '2rem' }}>
              <h3 style={{ color: actualTheme === 'dark' ? '#00d4ff' : '#007acc' }}>
                🎮 Game Settings
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label>Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: actualTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    borderRadius: '8px',
                    color: actualTheme === 'dark' ? '#fff' : '#333'
                  }}
                >
                  <option value="easy">😊 Easy</option>
                  <option value="medium">😐 Medium</option>
                  <option value="hard">😤 Hard</option>
                  <option value="expert">🔥 Expert</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                  />
                  Auto-save Progress
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={showHints}
                    onChange={(e) => setShowHints(e.target.checked)}
                  />
                  Show Hints
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={showTimer}
                    onChange={(e) => setShowTimer(e.target.checked)}
                  />
                  Show Game Timer
                </label>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="settings-section" style={{ marginTop: '2rem' }}>
              <h3 style={{ color: actualTheme === 'dark' ? '#00d4ff' : '#007acc' }}>
                🔔 Notification Settings
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  />
                  Enable Notifications
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={dailyReminders}
                    onChange={(e) => setDailyReminders(e.target.checked)}
                    disabled={!notificationsEnabled}
                  />
                  Daily Play Reminders
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={achievementAlerts}
                    onChange={(e) => setAchievementAlerts(e.target.checked)}
                    disabled={!notificationsEnabled}
                  />
                  Achievement Alerts
                </label>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    disabled={!notificationsEnabled}
                  />
                  Sound Alerts
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginTop: '2rem',
              paddingTop: '1rem',
              borderTop: `1px solid ${actualTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetToDefaults}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: actualTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  border: `1px solid ${actualTheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                  borderRadius: '8px',
                  color: actualTheme === 'dark' ? '#fff' : '#333',
                  cursor: 'pointer'
                }}
              >
                Reset to Defaults
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveSettings}
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
                Save Settings
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};