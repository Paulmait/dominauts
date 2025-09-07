import gameRules from '../data/gameRules.json';

export class RulesModal {
  private modal: HTMLElement;
  private isOpen: boolean = false;

  constructor() {
    this.modal = this.createModal();
    document.body.appendChild(this.modal);
    this.setupEventListeners();
  }

  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'rules-modal';
    modal.innerHTML = `
      <div class="rules-modal-overlay"></div>
      <div class="rules-modal-content">
        <div class="rules-modal-header">
          <h2 class="rules-modal-title">Game Rules</h2>
          <button class="rules-modal-close">×</button>
        </div>
        <div class="rules-modal-body">
          <div class="rules-tabs"></div>
          <div class="rules-content"></div>
        </div>
      </div>
    `;

    this.addStyles();
    return modal;
  }

  private addStyles(): void {
    if (document.getElementById('rules-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'rules-modal-styles';
    style.textContent = `
      .rules-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 3000;
        display: none;
      }

      .rules-modal.open {
        display: block;
      }

      .rules-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(5px);
      }

      .rules-modal-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 800px;
        max-height: 90vh;
        background: white;
        border-radius: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: modalSlideIn 0.3s ease;
      }

      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -40%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }

      .rules-modal-header {
        padding: 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .rules-modal-title {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
      }

      .rules-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.3s;
      }

      .rules-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .rules-modal-body {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      .rules-tabs {
        display: flex;
        gap: 0.5rem;
        padding: 1rem;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
        overflow-x: auto;
      }

      .rules-tab {
        padding: 0.5rem 1rem;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s;
        white-space: nowrap;
        font-size: 0.9rem;
      }

      .rules-tab:hover {
        background: #e9ecef;
        transform: translateY(-2px);
      }

      .rules-tab.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-color: transparent;
      }

      .rules-content {
        padding: 2rem;
        flex: 1;
        overflow-y: auto;
      }

      .rule-section {
        margin-bottom: 2rem;
      }

      .rule-section h3 {
        color: #333;
        font-size: 1.3rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .rule-section-icon {
        font-size: 1.5rem;
      }

      .rule-overview {
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 10px;
        margin-bottom: 1.5rem;
        font-style: italic;
        color: #495057;
      }

      .rule-setup {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .setup-item {
        background: #e9ecef;
        padding: 0.8rem;
        border-radius: 8px;
      }

      .setup-label {
        font-weight: 600;
        color: #495057;
        font-size: 0.85rem;
        text-transform: uppercase;
        margin-bottom: 0.3rem;
      }

      .setup-value {
        color: #212529;
      }

      .gameplay-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .gameplay-item {
        display: flex;
        align-items: flex-start;
        margin-bottom: 0.8rem;
        padding-left: 1.5rem;
        position: relative;
      }

      .gameplay-item::before {
        content: "▶";
        position: absolute;
        left: 0;
        color: #667eea;
      }

      .scoring-table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }

      .scoring-table th,
      .scoring-table td {
        padding: 0.8rem;
        text-align: left;
        border-bottom: 1px solid #dee2e6;
      }

      .scoring-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #495057;
      }

      .tips-grid {
        display: grid;
        gap: 1rem;
        margin-top: 1rem;
      }

      .tip-card {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        padding: 1rem;
        border-radius: 10px;
        border-left: 4px solid #667eea;
      }

      .tip-card::before {
        content: "💡";
        margin-right: 0.5rem;
      }

      .sample-image {
        width: 100%;
        max-width: 500px;
        margin: 1.5rem auto;
        display: block;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      }

      .special-rules {
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 10px;
        padding: 1rem;
        margin: 1rem 0;
      }

      .special-rules h4 {
        color: #856404;
        margin-bottom: 0.5rem;
      }

      .special-rules ul {
        margin: 0;
        padding-left: 1.5rem;
        color: #856404;
      }

      @media (max-width: 768px) {
        .rules-modal-content {
          width: 95%;
          max-height: 95vh;
        }

        .rules-content {
          padding: 1rem;
        }

        .rule-setup {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    const closeBtn = this.modal.querySelector('.rules-modal-close');
    const overlay = this.modal.querySelector('.rules-modal-overlay');

    closeBtn?.addEventListener('click', () => this.close());
    overlay?.addEventListener('click', () => this.close());

    // Setup tab switching
    const tabsContainer = this.modal.querySelector('.rules-tabs');
    if (tabsContainer) {
      tabsContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('rules-tab')) {
          this.switchTab(target.dataset.mode || 'allfives');
        }
      });
    }
  }

  open(mode: string = 'allfives'): void {
    this.modal.classList.add('open');
    this.isOpen = true;
    this.renderTabs();
    this.switchTab(mode);
  }

  close(): void {
    this.modal.classList.remove('open');
    this.isOpen = false;
  }

  private renderTabs(): void {
    const tabsContainer = this.modal.querySelector('.rules-tabs');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = Object.entries(gameRules).map(([key, rule]) => `
      <button class="rules-tab" data-mode="${key}">
        ${rule.icon} ${rule.name}
      </button>
    `).join('');
  }

  private switchTab(mode: string): void {
    // Update active tab
    const tabs = this.modal.querySelectorAll('.rules-tab');
    tabs.forEach(tab => {
      const tabElement = tab as HTMLElement;
      if (tabElement.dataset.mode === mode) {
        tabElement.classList.add('active');
      } else {
        tabElement.classList.remove('active');
      }
    });

    // Render content
    this.renderRuleContent(mode);
  }

  private renderRuleContent(mode: string): void {
    const contentContainer = this.modal.querySelector('.rules-content');
    if (!contentContainer) return;

    const rules = (gameRules as any)[mode];
    if (!rules) return;

    contentContainer.innerHTML = `
      <div class="rule-section">
        <h3>
          <span class="rule-section-icon">${rules.icon}</span>
          ${rules.name}
        </h3>
        <div class="rule-overview">${rules.rules.overview}</div>
      </div>

      <div class="rule-section">
        <h3>📋 Setup</h3>
        <div class="rule-setup">
          ${Object.entries(rules.rules.setup).map(([key, value]) => `
            <div class="setup-item">
              <div class="setup-label">${this.formatLabel(key)}</div>
              <div class="setup-value">${value}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="rule-section">
        <h3>🎮 How to Play</h3>
        <ul class="gameplay-list">
          ${rules.rules.gameplay.map((item: string) => `
            <li class="gameplay-item">${item}</li>
          `).join('')}
        </ul>
      </div>

      <div class="rule-section">
        <h3>🏆 Scoring</h3>
        <table class="scoring-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(rules.rules.scoring).map(([key, value]) => `
              <tr>
                <td>${this.formatLabel(key)}</td>
                <td>${value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${rules.rules.special && rules.rules.special.length > 0 ? `
        <div class="rule-section">
          <div class="special-rules">
            <h4>⭐ Special Rules</h4>
            <ul>
              ${rules.rules.special.map((item: string) => `
                <li>${item}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      ` : ''}

      <div class="rule-section">
        <h3>💡 Pro Tips</h3>
        <div class="tips-grid">
          ${rules.tips.map((tip: string) => `
            <div class="tip-card">${tip}</div>
          `).join('')}
        </div>
      </div>

      <div class="rule-section">
        <h3>📸 Sample Board Layout</h3>
        <img src="${rules.sampleImage}" alt="${rules.name} board layout" class="sample-image" />
      </div>
    `;
  }

  private formatLabel(key: string): string {
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
  }
}