export interface GameModeInfo {
  id: string;
  name: string;
  region: string;
  description: string;
  image: string;
  rules: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  players: string;
}

export class GameModeSelector {
  private container: HTMLElement;
  private selectedMode: string = 'block';
  private onSelectCallback: ((mode: string) => void) | null = null;

  private gameModes: GameModeInfo[] = [
    {
      id: 'block',
      name: 'Block Dominoes',
      region: '🌍 Classic',
      description: 'The traditional domino game where you match tiles end-to-end',
      image: 'block-preview.svg',
      rules: [
        'Match domino ends with same number',
        'Pass if you can\'t play',
        'First to empty hand wins',
        'Simple and straightforward'
      ],
      difficulty: 'Easy',
      players: '2-4 players'
    },
    {
      id: 'cutthroat',
      name: 'Cutthroat Dominoes',
      region: '🎯 Three-Hand',
      description: 'Three-player individual competition with no partnerships',
      image: 'cutthroat-preview.svg',
      rules: [
        'Three players compete individually',
        'No partnerships or teams',
        'Each player for themselves',
        'Popular in casual street games'
      ],
      difficulty: 'Medium',
      players: '3 players'
    },
    {
      id: 'partner',
      name: 'Partner Dominoes',
      region: '🤝 Four-Hand',
      description: 'Traditional four-player format with two teams of two',
      image: 'partner-preview.svg',
      rules: [
        'Partners sit opposite each other',
        'Team scoring system',
        'First team to 150 points wins',
        'Most traditional format'
      ],
      difficulty: 'Medium',
      players: '4 players (2 teams)'
    },
    {
      id: 'sixlove',
      name: 'Six-Love Dominoes',
      region: '🇯🇲 Jamaica',
      description: 'Win six games straight for a "six love" skunk victory',
      image: 'sixlove-preview.svg',
      rules: [
        'Based on Partner Dominoes',
        'Win 6 consecutive games for "six love"',
        'Bragging rights & bonus rewards',
        'Cultural staple in Jamaica'
      ],
      difficulty: 'Hard',
      players: '4 players (2 teams)'
    },
    {
      id: 'cross',
      name: 'Cross Dominoes',
      region: '✚ Tournament',
      description: 'Play extends in four directions from center double',
      image: 'cross-preview.svg',
      rules: [
        'Start with double in center',
        'Play extends in 4 directions',
        'Common in tournaments',
        'Strategic positioning matters'
      ],
      difficulty: 'Hard',
      players: '2-4 players'
    },
    {
      id: 'draw',
      name: 'Draw Dominoes',
      region: '⚡ Fast-Paced',
      description: 'Draw from boneyard until you can play - no passing allowed',
      image: 'draw-preview.svg',
      rules: [
        'Must draw if can\'t play',
        'No passing allowed',
        'Fast-paced gameplay',
        'Popular in informal settings'
      ],
      difficulty: 'Easy',
      players: '2-4 players'
    },
    {
      id: 'cuba',
      name: 'Cuban Dominoes',
      region: '🇨🇺 Cuba',
      description: 'Strategic blocking game popular in Cuba with partnership play',
      image: 'cuban-preview.svg',
      rules: [
        'Partners sit opposite each other',
        'Block opponents strategically',
        'Count points when blocked',
        'Team with lowest score wins'
      ],
      difficulty: 'Medium',
      players: '4 players (2 teams)'
    },
    {
      id: 'allfives',
      name: 'All Fives',
      region: '🇺🇸 USA',
      description: 'Score points when the board ends add up to multiples of 5',
      image: 'allfives-preview.svg',
      rules: [
        'Score when ends total 5, 10, 15, etc.',
        'First to 150 points wins',
        'Requires math skills',
        'Popular in USA & UK'
      ],
      difficulty: 'Medium',
      players: '2-4 players'
    },
    {
      id: 'chicken',
      name: 'Chicken Foot',
      region: '🇲🇽 Mexico',
      description: 'Create a chicken foot pattern with special double tile rules',
      image: 'chicken-preview.svg',
      rules: [
        'Start with double-9',
        'Create "chicken foot" on doubles',
        'Must play on all 3 sides of double',
        'Strategic and complex'
      ],
      difficulty: 'Hard',
      players: '2-8 players'
    }
  ];

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    } else {
      this.container = element;
    }

    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="game-mode-selector">
        <h2 class="selector-title">Choose Your Game Mode</h2>
        <div class="game-modes-grid">
          ${this.gameModes.map(mode => this.createModeCard(mode)).join('')}
        </div>
        <button class="start-game-btn" id="start-selected-game">
          Start Game
        </button>
      </div>
    `;

    this.attachEventListeners();
    this.addStyles();
  }

  private createModeCard(mode: GameModeInfo): string {
    return `
      <div class="mode-card ${mode.id === this.selectedMode ? 'selected' : ''}" data-mode="${mode.id}">
        <div class="mode-header">
          <h3>${mode.name}</h3>
          <span class="region-badge">${mode.region}</span>
        </div>

        <div class="mode-preview">
          ${this.createPreviewSVG(mode.id)}
        </div>

        <div class="mode-info">
          <p class="mode-description">${mode.description}</p>

          <div class="mode-details">
            <span class="difficulty difficulty-${mode.difficulty.toLowerCase()}">
              ${mode.difficulty}
            </span>
            <span class="players">${mode.players}</span>
          </div>

          <div class="mode-rules">
            <h4>Key Rules:</h4>
            <ul>
              ${mode.rules.map(rule => `<li>${rule}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  private createPreviewSVG(modeId: string): string {
    const svgWidth = 200;
    const svgHeight = 150;

    switch(modeId) {
      case 'block':
        return `
          <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 200 150">
            <!-- Block Dominoes Preview -->
            <rect x="40" y="60" width="30" height="60" fill="#f8f4e6" stroke="#333" stroke-width="2"/>
            <line x1="40" y1="90" x2="70" y2="90" stroke="#333" stroke-width="1"/>
            <circle cx="55" cy="75" r="3" fill="#333"/>
            <circle cx="55" cy="105" r="3" fill="#333"/>

            <rect x="70" y="60" width="30" height="60" fill="#f8f4e6" stroke="#333" stroke-width="2"/>
            <line x1="70" y1="90" x2="100" y2="90" stroke="#333" stroke-width="1"/>
            <circle cx="85" cy="75" r="3" fill="#333"/>
            <circle cx="85" cy="105" r="3" fill="#333"/>

            <rect x="100" y="60" width="30" height="60" fill="#f8f4e6" stroke="#333" stroke-width="2"/>
            <line x1="100" y1="90" x2="130" y2="90" stroke="#333" stroke-width="1"/>
            <circle cx="108" cy="75" r="3" fill="#333"/>
            <circle cx="122" cy="75" r="3" fill="#333"/>
            <circle cx="115" cy="105" r="3" fill="#333"/>

            <text x="100" y="140" text-anchor="middle" font-size="12" fill="#666">Linear Layout</text>
          </svg>
        `;

      case 'cuba':
        return `
          <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 200 150">
            <!-- Cuban Dominoes Preview with teams -->
            <rect x="60" y="40" width="30" height="60" fill="#f8f4e6" stroke="#333" stroke-width="2"/>
            <rect x="90" y="40" width="30" height="60" fill="#f8f4e6" stroke="#333" stroke-width="2"/>

            <!-- Team indicators -->
            <circle cx="75" cy="25" r="8" fill="#4CAF50" opacity="0.5"/>
            <text x="75" y="30" text-anchor="middle" font-size="10" fill="#fff">T1</text>

            <circle cx="105" cy="115" r="8" fill="#4CAF50" opacity="0.5"/>
            <text x="105" y="120" text-anchor="middle" font-size="10" fill="#fff">T1</text>

            <circle cx="45" cy="70" r="8" fill="#2196F3" opacity="0.5"/>
            <text x="45" y="75" text-anchor="middle" font-size="10" fill="#fff">T2</text>

            <circle cx="135" cy="70" r="8" fill="#2196F3" opacity="0.5"/>
            <text x="135" y="75" text-anchor="middle" font-size="10" fill="#fff">T2</text>

            <text x="100" y="140" text-anchor="middle" font-size="12" fill="#666">Team Play</text>
          </svg>
        `;

      case 'allfives':
        return `
          <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 200 150">
            <!-- All Fives Preview with scoring -->
            <rect x="50" y="60" width="30" height="60" fill="#f8f4e6" stroke="#333" stroke-width="2"/>
            <line x1="50" y1="90" x2="80" y2="90" stroke="#333" stroke-width="1"/>
            <!-- 5 dots -->
            <circle cx="58" cy="75" r="2" fill="#333"/>
            <circle cx="72" cy="75" r="2" fill="#333"/>
            <circle cx="65" cy="68" r="2" fill="#333"/>
            <circle cx="58" cy="82" r="2" fill="#333"/>
            <circle cx="72" cy="82" r="2" fill="#333"/>

            <rect x="80" y="60" width="30" height="60" fill="#f8f4e6" stroke="#333" stroke-width="2"/>
            <line x1="80" y1="90" x2="110" y2="90" stroke="#333" stroke-width="1"/>
            <!-- 5 dots -->
            <circle cx="88" cy="105" r="2" fill="#333"/>
            <circle cx="102" cy="105" r="2" fill="#333"/>
            <circle cx="95" cy="98" r="2" fill="#333"/>
            <circle cx="88" cy="112" r="2" fill="#333"/>
            <circle cx="102" cy="112" r="2" fill="#333"/>

            <!-- Score indicator -->
            <text x="100" y="45" text-anchor="middle" font-size="14" fill="#4CAF50" font-weight="bold">+10 pts!</text>
            <text x="100" y="140" text-anchor="middle" font-size="12" fill="#666">Score Multiples of 5</text>
          </svg>
        `;

      case 'chicken':
        return `
          <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 200 150">
            <!-- Chicken Foot Preview -->
            <!-- Center double -->
            <rect x="85" y="60" width="30" height="30" fill="#ffd700" stroke="#333" stroke-width="2"/>
            <line x1="85" y1="75" x2="115" y2="75" stroke="#333" stroke-width="1"/>

            <!-- Top branch -->
            <rect x="85" y="30" width="30" height="30" fill="#f8f4e6" stroke="#333" stroke-width="2"/>

            <!-- Left branch -->
            <rect x="55" y="60" width="30" height="30" fill="#f8f4e6" stroke="#333" stroke-width="2"/>

            <!-- Right branch -->
            <rect x="115" y="60" width="30" height="30" fill="#f8f4e6" stroke="#333" stroke-width="2"/>

            <!-- Bottom branches (chicken foot) -->
            <rect x="70" y="90" width="30" height="30" fill="#f8f4e6" stroke="#333" stroke-width="2"/>
            <rect x="100" y="90" width="30" height="30" fill="#f8f4e6" stroke="#333" stroke-width="2"/>

            <text x="100" y="140" text-anchor="middle" font-size="12" fill="#666">Chicken Foot Pattern</text>
          </svg>
        `;

      default:
        return '';
    }
  }

  private attachEventListeners(): void {
    // Card selection
    const cards = this.container.querySelectorAll('.mode-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.getAttribute('data-mode');
        if (mode) {
          this.selectMode(mode);
        }
      });
    });

    // Start button
    const startBtn = this.container.querySelector('#start-selected-game');
    startBtn?.addEventListener('click', () => {
      if (this.onSelectCallback) {
        this.onSelectCallback(this.selectedMode);
      }
    });
  }

  private selectMode(mode: string): void {
    this.selectedMode = mode;

    // Update UI
    const cards = this.container.querySelectorAll('.mode-card');
    cards.forEach(card => {
      if (card.getAttribute('data-mode') === mode) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  public onSelect(callback: (mode: string) => void): void {
    this.onSelectCallback = callback;
  }

  private addStyles(): void {
    if (document.getElementById('game-mode-selector-styles')) return;

    const style = document.createElement('style');
    style.id = 'game-mode-selector-styles';
    style.textContent = `
      .game-mode-selector {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .selector-title {
        text-align: center;
        font-size: 2rem;
        margin-bottom: 30px;
        background: linear-gradient(90deg, #00d4ff, #00a8cc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .game-modes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }

      .mode-card {
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .mode-card:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.5);
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 212, 255, 0.2);
      }

      .mode-card.selected {
        background: rgba(0, 212, 255, 0.1);
        border-color: #00d4ff;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
      }

      .mode-card.selected::before {
        content: '✓';
        position: absolute;
        top: 10px;
        right: 10px;
        background: #00d4ff;
        color: #fff;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      .mode-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .mode-header h3 {
        margin: 0;
        font-size: 1.3rem;
      }

      .region-badge {
        font-size: 0.9rem;
        padding: 5px 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
      }

      .mode-preview {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 15px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 150px;
      }

      .mode-description {
        font-size: 0.95rem;
        line-height: 1.4;
        margin-bottom: 15px;
        color: rgba(255, 255, 255, 0.9);
      }

      .mode-details {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
      }

      .difficulty, .players {
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 0.85rem;
      }

      .difficulty {
        font-weight: bold;
      }

      .difficulty-easy {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
      }

      .difficulty-medium {
        background: rgba(255, 152, 0, 0.2);
        color: #FF9800;
      }

      .difficulty-hard {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }

      .players {
        background: rgba(33, 150, 243, 0.2);
        color: #2196F3;
      }

      .mode-rules {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 15px;
      }

      .mode-rules h4 {
        margin: 0 0 10px 0;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
      }

      .mode-rules ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .mode-rules li {
        padding: 5px 0;
        padding-left: 20px;
        position: relative;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.8);
      }

      .mode-rules li::before {
        content: '▸';
        position: absolute;
        left: 0;
        color: #00d4ff;
      }

      .start-game-btn {
        display: block;
        margin: 0 auto;
        padding: 15px 50px;
        font-size: 1.2rem;
        background: linear-gradient(90deg, #00d4ff, #00a8cc);
        border: none;
        border-radius: 30px;
        color: #fff;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 5px 20px rgba(0, 212, 255, 0.3);
      }

      .start-game-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 30px rgba(0, 212, 255, 0.4);
      }

      @media (max-width: 768px) {
        .game-modes-grid {
          grid-template-columns: 1fr;
        }

        .selector-title {
          font-size: 1.5rem;
        }
      }
    `;

    document.head.appendChild(style);
  }

  public getSelectedMode(): string {
    return this.selectedMode;
  }
}