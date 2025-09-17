/**
 * Premium UI Components
 */

import React, { useState, useEffect } from 'react';
import { premiumService } from '../services/PremiumService';
import { stripePaymentService } from '../services/StripePaymentService';

/**
 * Currency Display Component
 */
export const CurrencyDisplay: React.FC = () => {
  const [balance, setBalance] = useState({
    coins: 0,
    gems: 0,
    energy: 5,
    tickets: 0
  });

  useEffect(() => {
    const updateBalance = () => {
      const currentBalance = premiumService.getBalance();
      if (currentBalance) {
        setBalance(currentBalance);
      }
    };

    updateBalance();
    const interval = setInterval(updateBalance, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="currency-display">
      <div className="currency-item coins">
        <span className="icon">🪙</span>
        <span className="value">{balance.coins.toLocaleString()}</span>
        <button className="add-btn" onClick={() => openShop('coins')}>+</button>
      </div>
      <div className="currency-item gems">
        <span className="icon">💎</span>
        <span className="value">{balance.gems.toLocaleString()}</span>
        <button className="add-btn" onClick={() => openShop('gems')}>+</button>
      </div>
      <div className="currency-item energy">
        <span className="icon">⚡</span>
        <span className="value">{balance.energy}/5</span>
        {balance.energy < 5 && <EnergyTimer />}
      </div>
      {premiumService.isVIP() && (
        <div className="vip-badge">
          <span className="icon">👑</span>
          <span className="label">VIP</span>
        </div>
      )}
    </div>
  );
};

/**
 * Energy Timer Component
 */
const EnergyTimer: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const regenTime = premiumService.getEnergyRegenTime();
      setTimeLeft(Math.floor(regenTime / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="energy-timer">
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
};

/**
 * Premium Benefits Display
 */
export const PremiumBenefits: React.FC = () => {
  const benefits = premiumService.getBenefits();
  const isPremium = premiumService.isPremium();
  const isVIP = premiumService.isVIP();

  return (
    <div className="premium-benefits">
      <h3>
        {isVIP ? '👑 VIP Benefits' : isPremium ? '⭐ Premium Benefits' : '🎮 Free Player'}
      </h3>
      <ul className="benefits-list">
        {benefits.map((benefit, index) => (
          <li key={index} className="benefit-item">
            <span className="checkmark">✓</span>
            {benefit}
          </li>
        ))}
      </ul>
      {!isPremium && (
        <button className="upgrade-btn" onClick={() => openPremiumOffer()}>
          🚀 Upgrade to Premium
        </button>
      )}
      {isPremium && !isVIP && (
        <button className="upgrade-btn vip" onClick={() => openVIPOffer()}>
          👑 Upgrade to VIP
        </button>
      )}
    </div>
  );
};

/**
 * Daily Rewards Component
 */
export const DailyRewards: React.FC = () => {
  const [canClaim, setCanClaim] = useState(false);
  const [streak, setStreak] = useState(0);
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [lastReward, setLastReward] = useState<any>(null);

  useEffect(() => {
    checkDailyReward();
  }, []);

  const checkDailyReward = async () => {
    // Check if can claim from localStorage
    const lastClaim = localStorage.getItem('last_daily_claim');
    const now = new Date();
    
    if (!lastClaim || new Date(lastClaim).getDate() !== now.getDate()) {
      setCanClaim(true);
    }
    
    const savedStreak = parseInt(localStorage.getItem('daily_streak') || '0');
    setStreak(savedStreak);
  };

  const claimReward = async () => {
    const result = await premiumService.claimDailyRewards();
    
    if (result && !result.error) {
      setCanClaim(false);
      setStreak(result.streak);
      setNextClaimTime(result.nextClaimAt);
      setLastReward(result.rewards);
      setShowReward(true);
      
      localStorage.setItem('last_daily_claim', new Date().toISOString());
      localStorage.setItem('daily_streak', result.streak.toString());
      
      // Hide reward after 3 seconds
      setTimeout(() => setShowReward(false), 3000);
    }
  };

  return (
    <div className="daily-rewards">
      <h3>📅 Daily Rewards</h3>
      <div className="streak-display">
        <span className="streak-label">Current Streak:</span>
        <span className="streak-value">{streak} days 🔥</span>
      </div>
      
      <div className="reward-days">
        {[1, 2, 3, 4, 5, 6, 7].map(day => (
          <div 
            key={day}
            className={`reward-day ${
              day <= streak % 7 || (streak > 0 && day === 7 && streak % 7 === 0) 
                ? 'claimed' 
                : day === (streak % 7) + 1 
                  ? 'current' 
                  : ''
            }`}
          >
            <div className="day-number">Day {day}</div>
            <div className="day-reward">
              {day === 7 ? '🎁' : '🪙'}
              <span>{getRewardForDay(day).coins}</span>
            </div>
          </div>
        ))}
      </div>
      
      <button 
        className="claim-btn"
        disabled={!canClaim}
        onClick={claimReward}
      >
        {canClaim ? '🎁 Claim Daily Reward' : '✅ Claimed Today'}
      </button>
      
      {showReward && lastReward && (
        <div className="reward-popup">
          <div className="reward-content">
            <h4>🎉 Daily Reward Claimed!</h4>
            <div className="reward-items">
              {lastReward.coins > 0 && (
                <div>🪙 +{lastReward.coins} Coins</div>
              )}
              {lastReward.gems > 0 && (
                <div>💎 +{lastReward.gems} Gems</div>
              )}
            </div>
            <div className="streak-bonus">
              Streak: {streak} days! 🔥
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Shop Component
 */
export const Shop: React.FC = () => {
  const [activeTab, setActiveTab] = useState('coins');
  const products = stripePaymentService.getProducts();
  
  const coinPacks = products.filter(p => p.id.startsWith('coins_'));
  const premiumPacks = products.filter(p => p.id.startsWith('premium_'));
  const bundles = products.filter(p => !p.id.startsWith('coins_') && !p.id.startsWith('premium_'));

  const handlePurchase = async (productId: string) => {
    const userId = localStorage.getItem('userId'); // Get from auth
    if (!userId) return;
    
    const success = await stripePaymentService.purchaseProduct(productId, userId);
    if (success) {
      // Purchase initiated, will redirect to Stripe
    }
  };

  return (
    <div className="shop-modal">
      <div className="shop-header">
        <h2>🛍️ Shop</h2>
        <button className="close-btn" onClick={() => closeShop()}>✕</button>
      </div>
      
      <div className="shop-tabs">
        <button 
          className={activeTab === 'coins' ? 'active' : ''}
          onClick={() => setActiveTab('coins')}
        >
          🪙 Coins
        </button>
        <button 
          className={activeTab === 'premium' ? 'active' : ''}
          onClick={() => setActiveTab('premium')}
        >
          ⭐ Premium
        </button>
        <button 
          className={activeTab === 'bundles' ? 'active' : ''}
          onClick={() => setActiveTab('bundles')}
        >
          🎁 Bundles
        </button>
      </div>
      
      <div className="shop-content">
        {activeTab === 'coins' && (
          <div className="product-grid">
            {coinPacks.map(product => (
              <ShopItem key={product.id} product={product} onPurchase={handlePurchase} />
            ))}
          </div>
        )}
        
        {activeTab === 'premium' && (
          <div className="product-grid">
            {premiumPacks.map(product => (
              <ShopItem key={product.id} product={product} onPurchase={handlePurchase} />
            ))}
          </div>
        )}
        
        {activeTab === 'bundles' && (
          <div className="product-grid">
            {bundles.map(product => (
              <ShopItem key={product.id} product={product} onPurchase={handlePurchase} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Shop Item Component
 */
const ShopItem: React.FC<{ product: any; onPurchase: (id: string) => void }> = ({ product, onPurchase }) => {
  return (
    <div className="shop-item">
      {product.badge && (
        <div className="item-badge">{product.badge}</div>
      )}
      <div className="item-icon">
        {product.id.includes('coins') ? '🪙' : 
         product.id.includes('premium') ? '⭐' : '🎁'}
      </div>
      <h4 className="item-name">{product.name}</h4>
      <p className="item-description">{product.description}</p>
      
      {product.rewards && (
        <div className="item-rewards">
          {product.rewards.coins && (
            <div>🪙 {product.rewards.coins} Coins</div>
          )}
          {product.rewards.hints && (
            <div>💡 {product.rewards.hints} Hints</div>
          )}
        </div>
      )}
      
      {product.features && (
        <ul className="item-features">
          {product.features.slice(0, 3).map((feature: string, i: number) => (
            <li key={i}>✓ {feature}</li>
          ))}
        </ul>
      )}
      
      <button 
        className="purchase-btn"
        onClick={() => onPurchase(product.id)}
      >
        ${product.price}
      </button>
    </div>
  );
};

// Helper functions
function getRewardForDay(day: number) {
  const rewards = [
    { coins: 50, gems: 0 },
    { coins: 75, gems: 1 },
    { coins: 100, gems: 2 },
    { coins: 150, gems: 3 },
    { coins: 200, gems: 5 },
    { coins: 300, gems: 7 },
    { coins: 500, gems: 10 }
  ];
  return rewards[day - 1];
}

function openShop(tab?: string) {
  // Implement shop opening logic
  console.log('Opening shop', tab);
}

function closeShop() {
  // Implement shop closing logic
  console.log('Closing shop');
}

function openPremiumOffer() {
  // Show premium offer modal
  console.log('Opening premium offer');
}

function openVIPOffer() {
  // Show VIP offer modal
  console.log('Opening VIP offer');
}