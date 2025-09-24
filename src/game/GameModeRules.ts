export interface GameRules {
  id: string;
  name: string;
  description: string;
  icon: string;
  howToPlay: string[];
  winCondition: string;
  scoreSystem: string;
  specialRules: string[];
  playerCount: number;
  tilesPerPlayer: number;
  maxPips: number;
  canDraw: boolean;
  maxScore: number;
  startingTile?: string;
  teamPlay: boolean;
}

export const GAME_MODE_RULES: Record<string, GameRules> = {
  classic: {
    id: 'classic',
    name: 'Classic Dominoes',
    description: 'Traditional dominoes - match the numbers',
    icon: '🎯',
    howToPlay: [
      'Match tiles with the same number of pips',
      'Place tiles on either end of the line',
      'Draw from boneyard if you cannot play',
      'First to empty hand wins the round',
      'Score points based on opponents\' remaining tiles'
    ],
    winCondition: 'First player to use all tiles wins',
    scoreSystem: 'Points equal sum of opponents\' remaining pips',
    specialRules: [
      'Doubles can be placed perpendicular',
      'Must announce "Last tile!" with one tile left'
    ],
    playerCount: 4,
    tilesPerPlayer: 7,
    maxPips: 6,
    canDraw: true,
    maxScore: 100,
    teamPlay: false
  },

  cutthroat: {
    id: 'cutthroat',
    name: 'Cutthroat (Three-Hand)',
    description: '3-player free-for-all, no partnerships',
    icon: '🎭',
    howToPlay: [
      'Three players compete individually',
      'Each player draws 9 tiles to start',
      'No teams - everyone for themselves',
      'Pass if you cannot play (no drawing)',
      'Score is sum of BOTH opponents\' pips'
    ],
    winCondition: 'First to 150 points wins',
    scoreSystem: 'Winner scores total of both opponents\' remaining pips',
    specialRules: [
      'Start with highest double',
      'More defensive play due to 2 opponents',
      'Temporary alliances may form'
    ],
    playerCount: 3,
    tilesPerPlayer: 9,
    maxPips: 6,
    canDraw: false,
    maxScore: 150,
    teamPlay: false
  },

  partner: {
    id: 'partner',
    name: 'Partner (Four-Hand)',
    description: 'Traditional 2v2 team dominoes',
    icon: '🤝',
    howToPlay: [
      'Four players in two teams',
      'Partners sit opposite each other',
      'Team score is combined',
      'Communication through plays only',
      'First team to 150 points wins'
    ],
    winCondition: 'First team to 150 points',
    scoreSystem: 'Winning team scores sum of losing team\'s pips',
    specialRules: [
      'No table talk allowed',
      'Must not reveal hand to partner',
      'Strategic blocking is key'
    ],
    playerCount: 4,
    tilesPerPlayer: 7,
    maxPips: 6,
    canDraw: false,
    maxScore: 150,
    teamPlay: true
  },

  sixlove: {
    id: 'sixlove',
    name: 'Six-Love (6-Love)',
    description: 'Jamaican rules - win 6 games straight for a skunk!',
    icon: '🇯🇲',
    howToPlay: [
      'Based on Partner Dominoes rules',
      'Win 6 consecutive games for "Six Love"',
      'Losing team gets "skunked" at 6-0',
      'Massive bragging rights for Six Love',
      'Common in Caribbean domino culture'
    ],
    winCondition: 'Win 6 games in a row for ultimate victory',
    scoreSystem: 'Standard partner scoring + streak tracking',
    specialRules: [
      'Six Love gives bonus points',
      'Streak resets if you lose',
      'Celebrations are mandatory!',
      'Trash talk encouraged'
    ],
    playerCount: 4,
    tilesPerPlayer: 7,
    maxPips: 6,
    canDraw: false,
    maxScore: 150,
    teamPlay: true
  },

  cross: {
    id: 'cross',
    name: 'Cross Dominoes',
    description: 'Four-directional play from center double',
    icon: '✚',
    howToPlay: [
      'First double placed in center',
      'Play extends in 4 directions',
      'Must play on all 4 arms before continuing',
      'More placement options available',
      'Common in tournaments'
    ],
    winCondition: 'First to empty hand wins',
    scoreSystem: 'Points from all 4 ends when multiple of 5',
    specialRules: [
      'Spinner (first double) creates cross',
      'All 4 sides must have tiles',
      'Then play continues normally',
      'Can score on multiple ends'
    ],
    playerCount: 4,
    tilesPerPlayer: 7,
    maxPips: 6,
    canDraw: false,
    maxScore: 150,
    startingTile: 'double',
    teamPlay: false
  },

  draw: {
    id: 'draw',
    name: 'Draw Dominoes',
    description: 'Must draw until you can play - fast paced!',
    icon: '⚡',
    howToPlay: [
      'MUST draw if cannot play',
      'Keep drawing until playable tile',
      'No passing allowed',
      'Boneyard can be depleted quickly',
      'Very fast-paced gameplay'
    ],
    winCondition: 'First to empty hand',
    scoreSystem: 'Standard pip counting',
    specialRules: [
      'Forced drawing creates action',
      'Hand size can grow large',
      'Boneyard management crucial',
      'No blocking strategies'
    ],
    playerCount: 4,
    tilesPerPlayer: 7,
    maxPips: 6,
    canDraw: true,
    maxScore: 100,
    teamPlay: false
  },

  allfives: {
    id: 'allfives',
    name: 'All Fives (Muggins)',
    description: 'Score when ends total multiples of 5',
    icon: '💯',
    howToPlay: [
      'Score during play, not just at end',
      'Add up all open ends',
      'Score if total is multiple of 5',
      'Each multiple of 5 = that many points',
      'Call "Muggins!" if opponent misses score'
    ],
    winCondition: 'First to 150 points',
    scoreSystem: 'Score = total of ends when divisible by 5',
    specialRules: [
      'Spinner counts all exposed ends',
      'Missing scores can be claimed',
      'Mental math is crucial',
      'Popular in USA and UK'
    ],
    playerCount: 4,
    tilesPerPlayer: 7,
    maxPips: 6,
    canDraw: true,
    maxScore: 150,
    teamPlay: false
  },

  block: {
    id: 'block',
    name: 'Block Dominoes',
    description: 'No drawing - pass if you can\'t play',
    icon: '🚫',
    howToPlay: [
      'Cannot draw from boneyard',
      'Must pass if no valid moves',
      'Game ends when blocked',
      'Winner has lowest pip count',
      'Very strategic blocking'
    ],
    winCondition: 'Lowest pip count when blocked',
    scoreSystem: 'Difference in pip counts',
    specialRules: [
      'No drawing makes blocking powerful',
      'Count pips carefully',
      'Defensive play is key',
      'Game can end in stalemate'
    ],
    playerCount: 4,
    tilesPerPlayer: 7,
    maxPips: 6,
    canDraw: false,
    maxScore: 100,
    teamPlay: false
  }
};

export function getGameRules(modeId: string): GameRules {
  return GAME_MODE_RULES[modeId] || GAME_MODE_RULES.classic;
}

export function getHowToPlayText(modeId: string): string {
  const rules = getGameRules(modeId);
  return `
    <h2>${rules.icon} ${rules.name}</h2>
    <p><strong>${rules.description}</strong></p>

    <h3>How to Play:</h3>
    <ul>${rules.howToPlay.map(rule => `<li>${rule}</li>`).join('')}</ul>

    <h3>Win Condition:</h3>
    <p>${rules.winCondition}</p>

    <h3>Scoring:</h3>
    <p>${rules.scoreSystem}</p>

    <h3>Special Rules:</h3>
    <ul>${rules.specialRules.map(rule => `<li>${rule}</li>`).join('')}</ul>

    <div style="margin-top: 20px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 10px;">
      <strong>Players:</strong> ${rules.playerCount} |
      <strong>Tiles:</strong> ${rules.tilesPerPlayer} each |
      <strong>Can Draw:</strong> ${rules.canDraw ? 'Yes' : 'No'} |
      <strong>Target Score:</strong> ${rules.maxScore}
    </div>
  `;
}