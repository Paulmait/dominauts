import React, { useState, useEffect } from 'react';
import { firebaseAuth, UserProfile } from '../services/firebase-auth';

interface EnhancedAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

export const EnhancedAuthModal: React.FC<EnhancedAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      setError('');
      setSuccess('');
      setMode('login');
    }
  }, [isOpen]);

  const handleEmailSignUp = async () => {
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!email || !password || !displayName) {
        throw new Error('Please fill in all fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const profile = await firebaseAuth.signUp(email, password, displayName);
      setSuccess('Account created successfully!');
      setTimeout(() => {
        onSuccess(profile);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      if (!email || !password) {
        throw new Error('Please enter email and password');
      }

      const profile = await firebaseAuth.signIn(email, password);
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const profile = await firebaseAuth.signInWithGoogle();
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const profile = await firebaseAuth.signInWithApple();
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!email) {
        throw new Error('Please enter your email address');
      }

      await firebaseAuth.sendPasswordReset(email);
      setSuccess('Password reset email sent! Check your inbox.');
      setTimeout(() => setMode('login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestPlay = () => {
    // Allow guest play without saving progress
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose}>×</button>

        <div className="auth-modal-header">
          <h1 className="auth-modal-title">Dominauts</h1>
          <p className="auth-modal-subtitle">
            {mode === 'login' && 'Welcome back, champion!'}
            {mode === 'signup' && 'Join the domino revolution!'}
            {mode === 'reset' && 'Reset your password'}
          </p>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error">
            <span className="auth-alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="auth-alert auth-alert-success">
            <span className="auth-alert-icon">✅</span>
            {success}
          </div>
        )}

        {mode === 'login' && (
          <>
            <div className="auth-form">
              <div className="auth-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@dominauts.com"
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailSignIn()}
                />
              </div>

              <button
                className="auth-btn auth-btn-primary"
                onClick={handleEmailSignIn}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="auth-divider">
                <span>or continue with</span>
              </div>

              <div className="auth-social-buttons">
                <button
                  className="auth-btn auth-btn-google"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="auth-social-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </button>

                {/* Apple Sign In (show on iOS/Mac) */}
                {(navigator.platform.includes('Mac') || navigator.platform.includes('iPhone')) && (
                  <button
                    className="auth-btn auth-btn-apple"
                    onClick={handleAppleSignIn}
                    disabled={loading}
                  >
                    <svg className="auth-social-icon" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l-.05-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Sign in with Apple
                  </button>
                )}
              </div>

              <div className="auth-links">
                <button
                  className="auth-link"
                  onClick={() => setMode('reset')}
                >
                  Forgot password?
                </button>
                <button
                  className="auth-link"
                  onClick={() => setMode('signup')}
                >
                  Create account
                </button>
              </div>

              <div className="auth-guest">
                <button
                  className="auth-btn auth-btn-ghost"
                  onClick={handleGuestPlay}
                >
                  Continue as Guest
                </button>
                <p className="auth-guest-note">
                  Play without saving progress
                </p>
              </div>
            </div>
          </>
        )}

        {mode === 'signup' && (
          <>
            <div className="auth-form">
              <div className="auth-form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="DominoMaster"
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@dominauts.com"
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={loading}
                />
              </div>

              <div className="auth-form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailSignUp()}
                />
              </div>

              <button
                className="auth-btn auth-btn-primary"
                onClick={handleEmailSignUp}
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <div className="auth-divider">
                <span>or sign up with</span>
              </div>

              <div className="auth-social-buttons">
                <button
                  className="auth-btn auth-btn-google"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="auth-social-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                {(navigator.platform.includes('Mac') || navigator.platform.includes('iPhone')) && (
                  <button
                    className="auth-btn auth-btn-apple"
                    onClick={handleAppleSignIn}
                    disabled={loading}
                  >
                    <svg className="auth-social-icon" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l-.05-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Continue with Apple
                  </button>
                )}
              </div>

              <div className="auth-links">
                <button
                  className="auth-link"
                  onClick={() => setMode('login')}
                >
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'reset' && (
          <>
            <div className="auth-form">
              <div className="auth-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@dominauts.com"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordReset()}
                />
                <p className="auth-form-help">
                  Enter your email and we'll send you a password reset link
                </p>
              </div>

              <button
                className="auth-btn auth-btn-primary"
                onClick={handlePasswordReset}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>

              <div className="auth-links">
                <button
                  className="auth-link"
                  onClick={() => setMode('login')}
                >
                  Back to sign in
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};