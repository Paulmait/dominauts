/**
 * Dominauts™ - Rules & Instructions Modal
 * Comprehensive game rules with visual guides
 */

import React, { useState, useEffect } from 'react';
import { GameMode } from '../types';
import { X, ChevronDown, ChevronUp, Book, Info, Trophy, Users } from 'lucide-react';
import './RulesModal.css';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: GameMode;
}

interface GameRules {
  mode: GameMode;
  title: string;
  tagline: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  players: string;
  objective: string;
  setup: string[];
  gameplay: string[];
  scoring: string[];
  winning: string;
  tips: string[];
  preview: string;
  video?: string;
}

const gameRulesData: GameRules[] = [
  {
    mode: GameMode.ALL_FIVES,
    title: 'All Fives',
    tagline: 'Score points when board ends sum to multiples of 5',
    difficulty: 'Medium',
    players: '2-4 players',
    objective: 'Be the first to reach 150 points by making the open ends sum to multiples of 5',
    setup: [
      'Each player draws 7 tiles (6 tiles for 3-4 players)',
      'Remaining tiles form the boneyard',
      'Player with highest double starts (or highest tile)',
      'Play proceeds clockwise'
    ],
    gameplay: [
      'Match tiles by connecting equal pip values',
      'First tile (spinner) can be played on all four sides',
      'Count all open ends after each play',
      'Score immediately when ends sum to 5, 10, 15, 20, etc.',
      'Draw from boneyard if unable to play',
      'Pass if boneyard is empty and cannot play'
    ],
    scoring: [
      '**Multiples of 5:** Score equals the sum (e.g., 15 = 15 points)',
      '**Domino:** Going out first scores points from opponents\' remaining tiles',
      '**Blocked Game:** Player with lowest tile count wins remaining points',
      '**All doubles exposed:** Bonus 50 points (house rule)'
    ],
    winning: 'First player to reach exactly 150 points wins. Must score exactly - going over resets to previous score.',
    tips: [
      '💡 Keep track of played tiles to predict opponents\' hands',
      '💡 Save tiles that create multiple scoring opportunities',
      '💡 Block high-scoring plays when ahead',
      '💡 The spinner (first double) is crucial - use it wisely',
      '💡 Count points before playing to avoid missing scores'
    ],
    preview: '/assets/rules/allfives.png'
  },
  {
    mode: GameMode.CHICKEN_FOOT,
    title: 'Chicken Foot',
    tagline: 'Complete the chicken foot pattern when doubles are played',
    difficulty: 'Hard',
    players: '2-8 players',
    objective: 'Score lowest points over multiple rounds by getting rid of all tiles',
    setup: [
      'Use double-9 or double-12 set for more players',
      'Each round starts with next lower double (9-9, 8-8, etc.)',
      'Deal tiles based on player count',
      'Center double must be satisfied before other plays'
    ],
    gameplay: [
      'First round starts with double-9 (or highest)',
      'When double is played, it must be "satisfied" with 3 tiles',
      'This creates the "chicken foot" pattern',
      'No other plays allowed until chicken foot is complete',
      'Player playing the double plays immediately again',
      'Draw one tile if unable to play'
    ],
    scoring: [
      '**Remaining tiles:** Sum of all pips in hand',
      '**Double blank:** 50 points penalty',
      '**Other doubles:** Face value',
      '**Round winner:** Subtracts 50 from score',
      '**Lowest total after all rounds wins**'
    ],
    winning: 'Play rounds from double-9 down to double-0. Player with lowest cumulative score wins.',
    tips: [
      '💡 Get rid of high doubles early',
      '💡 Force opponents to complete chicken feet',
      '💡 Save tiles that match current round\'s double',
      '💡 Block strategically when someone is close to going out',
      '💡 Remember which doubles have been played'
    ],
    preview: '/assets/rules/chickenfoot.png'
  },
  {
    mode: GameMode.BLOCK,
    title: 'Classic Block',
    tagline: 'Traditional dominoes - no drawing from boneyard',
    difficulty: 'Easy',
    players: '2-4 players',
    objective: 'Be first to play all tiles or have lowest pip count when blocked',
    setup: [
      'Each player draws 7 tiles (2 players) or 5 tiles (3-4 players)',
      'Remaining tiles stay face-down (not used)',
      'Highest double starts, or highest tile',
      'Play proceeds clockwise'
    ],
    gameplay: [
      'Match tiles by connecting equal values',
      'Only two open ends (no spinner rules)',
      'Must pass if cannot play (no drawing)',
      'Game ends when someone goes out or all pass',
      'Count remaining pips when blocked'
    ],
    scoring: [
      '**Going out:** Score sum of opponents\' remaining pips',
      '**Blocked game:** Winner scores difference in pip counts',
      '**Points goal:** Usually play to 100 or 150',
      '**Team play:** Partners sit opposite, combine scores'
    ],
    winning: 'First to reach agreed point total (typically 100-150) wins the match.',
    tips: [
      '💡 Remember what\'s been played',
      '💡 Block opponents when ahead in pip count',
      '💡 Keep variety in your hand',
      '💡 Watch for tiles opponents cannot play',
      '💡 In team play, help your partner'
    ],
    preview: '/assets/rules/block.png'
  },
  {
    mode: GameMode.CUBAN,
    title: 'Cuban Dominoes',
    tagline: 'Partners compete with strategic double plays',
    difficulty: 'Expert',
    players: '4 players (2 teams)',
    objective: 'First team to win 10 games (each game to 100 points)',
    setup: [
      'Partners sit opposite each other',
      'Each player draws 10 tiles (double-9 set)',
      'Remaining tiles are not used',
      'Player with double-9 starts (or highest double)'
    ],
    gameplay: [
      'Doubles are played perpendicular and count on both ends',
      'The "spinner" rule applies to all doubles',
      'Partners cannot communicate about tiles',
      'Must follow suit if possible',
      'Pass if cannot play (no drawing)',
      'Capicú: Going out on both ends scores double'
    ],
    scoring: [
      '**Team scoring:** Combine both partners\' captures',
      '**Capicú:** Double points for winning on both ends',
      '**Blocked game:** Team with lowest count scores difference',
      '**Chuchaso:** Opening play scores if makes multiple of 5',
      '**First to 100 points wins the game**'
    ],
    winning: 'First team to win 10 games wins the match. Games are to 100 points.',
    tips: [
      '💡 Set up your partner for scoring plays',
      '💡 Block opponents\' strong suits',
      '💡 Keep mental count of played tiles',
      '💡 Save doubles for strategic moments',
      '💡 Watch for Capicú opportunities',
      '💡 Communicate through plays, not words'
    ],
    preview: '/assets/rules/cuban.png'
  },
  {
    mode: GameMode.MEXICAN_TRAIN,
    title: 'Mexican Train',
    tagline: 'Build your train and the Mexican train simultaneously',
    difficulty: 'Medium',
    players: '2-8 players',
    objective: 'Have the lowest score when someone runs out of tiles',
    setup: [
      'Use double-12 set for best gameplay',
      'Center hub with station for each player plus Mexican train',
      'Each round starts with next double (12-12, 11-11, etc.)',
      'Deal tiles based on player count'
    ],
    gameplay: [
      'Start your train from the center double',
      'Can only play on your train unless marked',
      'Mexican train is always open to all',
      'Double must be "satisfied" immediately',
      'Train is marked "open" if you cannot play',
      'Remove marker when you play on your train again'
    ],
    scoring: [
      '**Remaining pips:** Count all pips in hand',
      '**Double-blank:** 50 points',
      '**No plays available:** Draw and +10 points',
      '**Lowest score after 13 rounds wins**'
    ],
    winning: 'Play 13 rounds (double-12 down to double-0). Lowest total score wins.',
    tips: [
      '💡 Build long chains during setup',
      '💡 Play doubles early to avoid penalties',
      '💡 Use Mexican train to dump high tiles',
      '💡 Mark opponents\' trains by forcing them to draw',
      '💡 Save tiles that match upcoming doubles'
    ],
    preview: '/assets/rules/mexicantrain.png'
  }
];

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, initialMode }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode || GameMode.ALL_FIVES);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['objective']));
  const [showVideo, setShowVideo] = useState(false);
  
  const currentRules = gameRulesData.find(r => r.mode === selectedMode)!;
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      case 'Expert': return '#9C27B0';
      default: return '#666';
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="rules-modal-overlay" onClick={onClose}>
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rules-modal-header">
          <h2><Book size={24} /> Game Rules & Instructions</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="rules-mode-selector">
          {gameRulesData.map(game => (
            <button
              key={game.mode}
              className={`mode-tab ${selectedMode === game.mode ? 'active' : ''}`}
              onClick={() => setSelectedMode(game.mode)}
            >
              <span className="mode-title">{game.title}</span>
              <span 
                className="difficulty-badge" 
                style={{ backgroundColor: getDifficultyColor(game.difficulty) }}
              >
                {game.difficulty}
              </span>
            </button>
          ))}
        </div>
        
        <div className="rules-content">
          <div className="rules-header-info">
            <h3>{currentRules.title}</h3>
            <p className="tagline">{currentRules.tagline}</p>
            <div className="game-meta">
              <span><Users size={16} /> {currentRules.players}</span>
              <span><Trophy size={16} /> {currentRules.difficulty}</span>
            </div>
          </div>
          
          {currentRules.preview && (
            <div className="rules-preview">
              <img src={currentRules.preview} alt={`${currentRules.title} layout`} />
              {currentRules.video && (
                <button className="video-button" onClick={() => setShowVideo(!showVideo)}>
                  {showVideo ? 'Hide' : 'Watch'} Tutorial Video
                </button>
              )}
            </div>
          )}
          
          <div className="rules-sections">
            <RulesSection
              title="Objective"
              content={currentRules.objective}
              expanded={expandedSections.has('objective')}
              onToggle={() => toggleSection('objective')}
              icon={<Trophy size={18} />}
            />
            
            <RulesSection
              title="Setup"
              content={
                <ul>
                  {currentRules.setup.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              }
              expanded={expandedSections.has('setup')}
              onToggle={() => toggleSection('setup')}
            />
            
            <RulesSection
              title="Gameplay"
              content={
                <ol>
                  {currentRules.gameplay.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              }
              expanded={expandedSections.has('gameplay')}
              onToggle={() => toggleSection('gameplay')}
            />
            
            <RulesSection
              title="Scoring"
              content={
                <div className="scoring-rules">
                  {currentRules.scoring.map((rule, i) => (
                    <div key={i} className="scoring-rule">
                      {rule.split('**').map((part, j) => 
                        j % 2 === 0 ? part : <strong key={j}>{part}</strong>
                      )}
                    </div>
                  ))}
                </div>
              }
              expanded={expandedSections.has('scoring')}
              onToggle={() => toggleSection('scoring')}
            />
            
            <RulesSection
              title="Winning"
              content={currentRules.winning}
              expanded={expandedSections.has('winning')}
              onToggle={() => toggleSection('winning')}
            />
            
            <RulesSection
              title="Pro Tips"
              content={
                <div className="tips-list">
                  {currentRules.tips.map((tip, i) => (
                    <div key={i} className="tip-item">{tip}</div>
                  ))}
                </div>
              }
              expanded={expandedSections.has('tips')}
              onToggle={() => toggleSection('tips')}
              icon={<Info size={18} />}
            />
          </div>
          
          <div className="rules-footer">
            <button className="expand-all-button" onClick={() => {
              if (expandedSections.size === 6) {
                setExpandedSections(new Set());
              } else {
                setExpandedSections(new Set(['objective', 'setup', 'gameplay', 'scoring', 'winning', 'tips']));
              }
            }}>
              {expandedSections.size === 6 ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RulesSectionProps {
  title: string;
  content: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}

const RulesSection: React.FC<RulesSectionProps> = ({ title, content, expanded, onToggle, icon }) => {
  return (
    <div className="rules-section">
      <button className="section-header" onClick={onToggle}>
        <span className="section-title">
          {icon && <span className="section-icon">{icon}</span>}
          {title}
        </span>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {expanded && (
        <div className="section-content">
          {content}
        </div>
      )}
    </div>
  );
};