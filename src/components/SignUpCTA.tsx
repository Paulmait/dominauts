import React, { useState, useEffect } from 'react';
import { guestService, MissedBenefit } from '../services/guest-service';
import { EnhancedAuthModal } from './EnhancedAuthModal';
import { UserProfile } from '../services/firebase-auth';

interface SignUpCTAProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: (profile: UserProfile) => void;
  trigger?: 'milestone' | 'game-end' | 'manual';
}

export const SignUpCTA: React.FC<SignUpCTAProps> = ({
  isOpen,
  onClose,
  onSignUp,
  trigger = 'milestone'
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [benefits, setBenefits] = useState<MissedBenefit[]>([]);
  const [sessionSummary, setSessionSummary] = useState(guestService.getSessionSummary());
  const [currentBenefitIndex, setCurrentBenefitIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setBenefits(guestService.getCompellingReasons());
      setSessionSummary(guestService.getSessionSummary());
    }
  }, [isOpen]);

  useEffect(() => {
    // Rotate through benefits
    if (benefits.length > 1) {
      const interval = setInterval(() => {
        setCurrentBenefitIndex((prev) => (prev + 1) % benefits.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [benefits]);

  const handleContinueAsGuest = () => {
    onClose();
  };

  const handleSignUpClick = () => {
    setShowAuthModal(true);
  };

  const getHeadline = () => {
    switch (trigger) {
      case 'game-end':
        if (sessionSummary.currentStreak >= 3) {
          return `🔥 ${sessionSummary.currentStreak} Win Streak! Don't Lose It!`;
        }
        if (sessionSummary.totalMissedXP >= 500) {
          return `⭐ ${sessionSummary.totalMissedXP} XP Earned! Claim It Now!`;
        }
        return "🎮 Great Game! Save Your Progress!";
      case 'milestone':
        return "🏆 Milestone Reached! Unlock Your Rewards!";
      default:
        return "🚀 Level Up Your Game Experience!";
    }
  };

  if (showAuthModal) {
    return (
      <EnhancedAuthModal
        isOpen={true}
        onClose={() => {
          setShowAuthModal(false);
          onClose();
        }}
        onSuccess={(profile) => {
          guestService.convertToRegistered(profile.uid);
          onSignUp(profile);
          setShowAuthModal(false);
          onClose();
        }}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <div className="signup-cta-overlay" onClick={handleContinueAsGuest}>
      <div className="signup-cta-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button className="cta-close-btn" onClick={handleContinueAsGuest}>
          ×
        </button>

        {/* Animated header */}
        <div className="cta-header">
          <h2 className="cta-headline">{getHeadline()}</h2>
          <p className="cta-subheadline">
            You're missing out on exclusive rewards!
          </p>
        </div>

        {/* Session stats showcase */}
        <div className="cta-stats-grid">
          <div className="cta-stat">
            <span className="stat-value">{sessionSummary.gamesPlayed}</span>
            <span className="stat-label">Games</span>
          </div>
          <div className="cta-stat">
            <span className="stat-value">{sessionSummary.winRate}%</span>
            <span className="stat-label">Win Rate</span>
          </div>
          <div className="cta-stat">
            <span className="stat-value">{sessionSummary.bestScore}</span>
            <span className="stat-label">Best Score</span>
          </div>
          <div className="cta-stat highlight">
            <span className="stat-value">{sessionSummary.currentStreak}</span>
            <span className="stat-label">Streak</span>
          </div>
        </div>

        {/* Rotating benefits carousel */}
        {benefits.length > 0 && (
          <div className="cta-benefits-carousel">
            <div className="benefit-card active">
              <span className="benefit-icon">{benefits[currentBenefitIndex].icon}</span>
              <div className="benefit-content">
                <h3>{benefits[currentBenefitIndex].title}</h3>
                <p>{benefits[currentBenefitIndex].description}</p>
                {benefits[currentBenefitIndex].value && (
                  <span className="benefit-value">
                    {benefits[currentBenefitIndex].value}
                  </span>
                )}
              </div>
            </div>
            <div className="carousel-dots">
              {benefits.map((_, index) => (
                <span
                  key={index}
                  className={`dot ${index === currentBenefitIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* What you'll get section */}
        <div className="cta-features">
          <h3>Sign up now and get:</h3>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">💾</span>
              <span>Save progress across devices</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🏆</span>
              <span>Compete on leaderboards</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎮</span>
              <span>Unlock all game modes</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span>Challenge friends online</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⭐</span>
              <span>Earn XP & level up</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span>Daily challenges</span>
            </div>
          </div>
        </div>

        {/* Urgency indicator */}
        <div className="cta-urgency">
          <div className="urgency-bar">
            <div className="urgency-fill" style={{ width: '75%' }} />
          </div>
          <p className="urgency-text">
            ⚠️ Guest progress expires in 24 hours!
          </p>
        </div>

        {/* Action buttons */}
        <div className="cta-actions">
          <button
            className="cta-btn cta-btn-primary"
            onClick={handleSignUpClick}
          >
            <span className="btn-icon">🚀</span>
            Sign Up & Claim Rewards
            <span className="btn-badge">FREE</span>
          </button>

          <button
            className="cta-btn cta-btn-secondary"
            onClick={handleContinueAsGuest}
          >
            Continue as Guest
            <span className="btn-note">(lose progress)</span>
          </button>
        </div>

        {/* Trust indicators */}
        <div className="cta-trust">
          <span>🔒 Secure</span>
          <span>⚡ Instant</span>
          <span>🆓 Free Forever</span>
        </div>
      </div>
    </div>
  );
};

// Mini CTA Banner Component
export const SignUpBanner: React.FC<{
  onSignUpClick: () => void;
}> = ({ onSignUpClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sessionSummary = guestService.getSessionSummary();

  useEffect(() => {
    // Show banner after some gameplay
    const timer = setTimeout(() => {
      if (sessionSummary.gamesPlayed > 0 && !localStorage.getItem('banner_dismissed')) {
        setIsVisible(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [sessionSummary.gamesPlayed]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('banner_dismissed', 'true');
    setTimeout(() => {
      localStorage.removeItem('banner_dismissed');
    }, 3600000); // Reset after 1 hour
  };

  if (!isVisible) return null;

  return (
    <div className="signup-banner">
      <div className="banner-content">
        <span className="banner-icon">⭐</span>
        <span className="banner-text">
          {sessionSummary.totalMissedXP > 0
            ? `${sessionSummary.totalMissedXP} XP waiting to be claimed!`
            : 'Sign up to save your progress!'}
        </span>
        <button className="banner-cta" onClick={onSignUpClick}>
          Sign Up Free
        </button>
        <button className="banner-close" onClick={handleDismiss}>
          ×
        </button>
      </div>
    </div>
  );
};

// Floating Action Button Component
export const SignUpFAB: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const [pulse, setPulse] = useState(false);
  const summary = guestService.getSessionSummary();

  useEffect(() => {
    // Pulse when reaching milestones
    if (summary.currentStreak >= 3 || summary.totalMissedXP >= 100) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [summary.currentStreak, summary.totalMissedXP]);

  if (summary.gamesPlayed === 0) return null;

  return (
    <button
      className={`signup-fab ${pulse ? 'pulse' : ''}`}
      onClick={onClick}
      title="Sign up to save progress"
    >
      <span className="fab-icon">👤</span>
      {summary.totalMissedXP > 0 && (
        <span className="fab-badge">{summary.totalMissedXP}</span>
      )}
    </button>
  );
};