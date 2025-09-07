export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    board: string;
    tile: string;
    tileHover: string;
    tileSelected: string;
    pip: string;
    success: string;
    error: string;
    warning: string;
  };
  gradients: {
    primary: string;
    header: string;
  };
}

export class ThemeManager {
  private currentTheme: 'light' | 'dark' = 'light';
  private themes: { light: Theme; dark: Theme };
  private listeners: Set<(theme: Theme) => void> = new Set();

  constructor() {
    this.themes = {
      light: {
        name: 'light',
        colors: {
          primary: '#667eea',
          secondary: '#764ba2',
          background: '#ffffff',
          surface: '#f8f9fa',
          text: '#212529',
          textSecondary: '#6c757d',
          board: '#2a4d3a',
          tile: '#f8f4e6',
          tileHover: '#ffe4b5',
          tileSelected: '#ffd700',
          pip: '#1a1a1a',
          success: '#4CAF50',
          error: '#f44336',
          warning: '#ff9800'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          header: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
      },
      dark: {
        name: 'dark',
        colors: {
          primary: '#818cf8',
          secondary: '#a78bfa',
          background: '#0f0f23',
          surface: '#1a1b3a',
          text: '#e8eaed',
          textSecondary: '#9aa0a6',
          board: '#1a1f2e',
          tile: '#2d3748',
          tileHover: '#4a5568',
          tileSelected: '#805ad5',
          pip: '#e8eaed',
          success: '#66bb6a',
          error: '#ef5350',
          warning: '#ffa726'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)',
          header: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
        }
      }
    };

    this.loadThemeFromStorage();
    this.applyTheme();
  }

  private loadThemeFromStorage(): void {
    const savedTheme = localStorage.getItem('domino-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.currentTheme = savedTheme;
    } else {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.currentTheme = 'dark';
      }
    }
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('domino-theme', this.currentTheme);
    this.applyTheme();
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    localStorage.setItem('domino-theme', theme);
    this.applyTheme();
  }

  getCurrentTheme(): Theme {
    return this.themes[this.currentTheme];
  }

  isDarkMode(): boolean {
    return this.currentTheme === 'dark';
  }

  private applyTheme(): void {
    const theme = this.themes[this.currentTheme];
    const root = document.documentElement;

    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${this.kebabCase(key)}`, value);
    });

    Object.entries(theme.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${this.kebabCase(key)}`, value);
    });

    // Add theme class to body
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${this.currentTheme}`);

    // Notify listeners
    this.listeners.forEach(listener => listener(theme));

    // Apply dynamic styles
    this.applyDynamicStyles();
  }

  private applyDynamicStyles(): void {
    const styleId = 'theme-dynamic-styles';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    const theme = this.themes[this.currentTheme];
    
    style.textContent = `
      :root {
        --theme-transition: all 0.3s ease;
      }

      body {
        background: ${theme.colors.background};
        color: ${theme.colors.text};
        transition: var(--theme-transition);
      }

      .theme-${this.currentTheme} .header {
        background: ${theme.gradients.header};
      }

      .theme-${this.currentTheme} .game-canvas {
        background: ${theme.colors.board};
      }

      .theme-${this.currentTheme} .btn {
        background: ${theme.colors.surface};
        color: ${theme.colors.text};
        border-color: ${theme.colors.primary};
      }

      .theme-${this.currentTheme} .btn:hover {
        background: ${theme.colors.primary};
        color: white;
      }

      .theme-${this.currentTheme} .modal {
        background: ${theme.colors.surface};
        color: ${theme.colors.text};
      }

      .theme-${this.currentTheme} .menu-content {
        background: ${theme.colors.surface};
        color: ${theme.colors.text};
      }

      .theme-${this.currentTheme} .game-mode-card {
        background: ${theme.colors.background};
        border-color: ${theme.colors.textSecondary};
      }

      .theme-${this.currentTheme} .game-mode-card:hover {
        background: ${theme.colors.surface};
        border-color: ${theme.colors.primary};
      }

      .theme-${this.currentTheme} .game-mode-card.selected {
        background: ${theme.colors.primary};
        color: white;
      }

      .theme-${this.currentTheme} .player-info {
        background: rgba(${this.hexToRgb(theme.colors.surface)}, 0.9);
      }

      .theme-${this.currentTheme} .score-display {
        background: rgba(${this.hexToRgb(theme.colors.primary)}, 0.2);
      }

      /* Dark mode specific adjustments */
      .theme-dark {
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      }

      /* Light mode specific adjustments */
      .theme-light {
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }

      /* Smooth transitions */
      * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
      }
    `;
  }

  private kebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0, 0, 0';
    
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }

  onThemeChange(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  createThemeToggleButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'theme-toggle-btn';
    button.innerHTML = this.currentTheme === 'light' ? '🌙' : '☀️';
    button.title = 'Toggle theme';
    
    button.addEventListener('click', () => {
      this.toggleTheme();
      button.innerHTML = this.currentTheme === 'light' ? '🌙' : '☀️';
    });

    // Add styles for the button
    const style = document.createElement('style');
    style.textContent = `
      .theme-toggle-btn {
        position: fixed;
        top: 1rem;
        right: 1rem;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--color-surface, #fff);
        border: 2px solid var(--color-primary, #667eea);
        font-size: 1.5rem;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
        box-shadow: var(--shadow-lg);
      }

      .theme-toggle-btn:hover {
        transform: scale(1.1) rotate(20deg);
        background: var(--color-primary, #667eea);
      }
    `;
    
    if (!document.getElementById('theme-toggle-styles')) {
      style.id = 'theme-toggle-styles';
      document.head.appendChild(style);
    }

    return button;
  }
}