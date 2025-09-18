import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundSystem } from '../services/SoundSystem';
import { authApiClient } from '../services/AuthApiClient';

interface AuthSystemProps {
  onLogin: (user: any) => void;
  onClose: () => void;
}

export const AuthSystem: React.FC<AuthSystemProps> = ({ onLogin, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'admin'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'reset'>('email');

  // Theme detection
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isDark = theme === 'dark';

  // Handle login
  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email address');
      }

      let response;

      // Check if admin login
      if (adminCode) {
        response = await authApiClient.adminLogin(email, password, adminCode);
      } else {
        response = await authApiClient.login(email, password);
      }

      if (response.success && response.user) {
        const user = {
          ...response.user,
          isAdmin: response.user.role === 'admin'
        };
        onLogin(user);
        soundSystem.play(user.isAdmin ? 'levelUp' : 'success');
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message);
      soundSystem.play('error');
    } finally {
      setLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!email || !username || !password || !confirmPassword) {
        throw new Error('Please fill in all fields');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email address');
      }

      // Username validation
      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      // Password validation
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        throw new Error('Password must contain uppercase, lowercase, and numbers');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Call API
      const response = await authApiClient.register(email, username, password);

      if (response.success) {
        setSuccess('Registration successful! You are now logged in.');
        if (response.user) {
          onLogin(response.user);
        }
        soundSystem.play('achievement');
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message);
      soundSystem.play('error');
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');

    try {
      if (step === 'email') {
        // Validate email
        if (!email) {
          throw new Error('Please enter your email');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Invalid email address');
        }

        // Simulate sending reset code
        await new Promise(resolve => setTimeout(resolve, 1000));

        setSuccess('Reset code sent to your email!');
        setStep('code');
        soundSystem.play('notification');
      } else if (step === 'code') {
        // Validate reset code
        if (!resetCode) {
          throw new Error('Please enter the reset code');
        }

        // Simulate code verification (accept any 6-digit code for demo)
        if (resetCode.length !== 6 || !/^\d+$/.test(resetCode)) {
          throw new Error('Invalid reset code');
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        setStep('reset');
        soundSystem.play('success');
      } else if (step === 'reset') {
        // Validate new password
        if (!newPassword || !confirmPassword) {
          throw new Error('Please fill in all fields');
        }

        if (newPassword.length < 8) {
          throw new Error('Password must be at least 8 characters');
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
          throw new Error('Password must contain uppercase, lowercase, and numbers');
        }

        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        // Reset password using API
        const response = await authApiClient.resetPassword(resetCode, newPassword);

        if (response.success) {
          setSuccess('Password reset successful! Please log in.');
          setMode('login');
          setStep('email');
          soundSystem.play('levelUp');
        } else {
          throw new Error(response.error || 'Failed to reset password');
        }
      }
    } catch (err: any) {
      setError(err.message);
      soundSystem.play('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="auth-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(10px)'
        }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="auth-panel"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
              : 'linear-gradient(135deg, #ffffff, #f0f0f0)',
            borderRadius: '20px',
            padding: '2.5rem',
            width: '90%',
            maxWidth: '450px',
            border: `2px solid ${isDark ? '#00d4ff' : '#007acc'}`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            color: isDark ? '#fff' : '#333'
          }}
        >
          {/* Logo/Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              background: 'linear-gradient(90deg, #00d4ff, #00a8cc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Dominauts™
            </h1>
            <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '0.9rem' }}>
              {mode === 'login' && 'Welcome back!'}
              {mode === 'register' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
              {mode === 'admin' && 'Administrator Access'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                color: '#ef4444'
              }}
            >
              ❌ {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                color: '#10b981'
              }}
            >
              ✅ {success}
            </motion.div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                    borderRadius: '8px',
                    color: isDark ? '#fff' : '#333',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                    borderRadius: '8px',
                    color: isDark ? '#fff' : '#333',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* Admin Code (optional) */}
              {email === 'admin@cienrios.com' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    Admin Code
                  </label>
                  <input
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Enter admin code"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 215, 0, 0.1)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '8px',
                      color: isDark ? '#ffd700' : '#b8860b',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #00d4ff, #00a8cc)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </motion.button>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1rem',
                fontSize: '0.9rem'
              }}>
                <button
                  onClick={() => setMode('forgot')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00d4ff',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Forgot Password?
                </button>
                <button
                  onClick={() => setMode('register')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00d4ff',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Create Account
                </button>
              </div>
            </>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                    borderRadius: '8px',
                    color: isDark ? '#fff' : '#333',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                    borderRadius: '8px',
                    color: isDark ? '#fff' : '#333',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                    borderRadius: '8px',
                    color: isDark ? '#fff' : '#333',
                    fontSize: '1rem'
                  }}
                />
                <small style={{ color: isDark ? '#aaa' : '#666' }}>
                  Must contain uppercase, lowercase, and numbers
                </small>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                    borderRadius: '8px',
                    color: isDark ? '#fff' : '#333',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRegister}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </motion.button>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  onClick={() => setMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00d4ff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem'
                  }}
                >
                  Already have an account? Login
                </button>
              </div>
            </>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <>
              {step === 'email' && (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Enter your email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#333',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleForgotPassword}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </motion.button>
                </>
              )}

              {step === 'code' && (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Enter the 6-digit code sent to your email
                    </label>
                    <input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#333',
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        letterSpacing: '0.5rem'
                      }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleForgotPassword}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </motion.button>
                </>
              )}

              {step === 'reset' && (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#333',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        border: `1px solid ${isDark ? 'rgba(0, 212, 255, 0.3)' : 'rgba(0, 122, 204, 0.3)'}`,
                        borderRadius: '8px',
                        color: isDark ? '#fff' : '#333',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleForgotPassword}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </motion.button>
                </>
              )}

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setMode('login');
                    setStep('email');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00d4ff',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem'
                  }}
                >
                  Back to Login
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};