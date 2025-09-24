// Profile Dashboard UI Component

import { PlayerProfileManager, PlayerProfile } from '../core/PlayerProfile';

export class ProfileDashboard {
  private container: HTMLElement | null = null;
  private profileManager: PlayerProfileManager;
  private isOpen: boolean = false;

  constructor() {
    this.profileManager = PlayerProfileManager.getInstance();
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    if (this.isOpen) return;

    this.isOpen = true;
    this.render();
  }

  public close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  private render(): void {
    const profile = this.profileManager.getProfile();
    if (!profile) return;

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'profileDashboard';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
      z-index: 6000;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
    `;

    // Create header
    const header = this.createHeader(profile);

    // Create tabs
    const tabContainer = this.createTabs();

    // Create content area
    const contentArea = document.createElement('div');
    contentArea.id = 'profileContent';
    contentArea.style.cssText = `
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    `;

    // Default to stats tab
    contentArea.innerHTML = this.renderStatsTab(profile);

    this.container.appendChild(header);
    this.container.appendChild(tabContainer);
    this.container.appendChild(contentArea);
    document.body.appendChild(this.container);

    // Add close button listener
    const closeBtn = document.getElementById('closeProfileBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Add tab listeners
    this.setupTabListeners(profile);
  }

  private createHeader(profile: PlayerProfile): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      position: relative;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    `;

    const winRate = this.profileManager.getWinRate();
    const avatarIcon = this.profileManager.getAvatarIcon();

    header.innerHTML = `
      <button id="closeProfileBtn" style="
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        font-size: 24px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.3s;
      ">✕</button>

      <div style="display: flex; align-items: center; gap: 30px;">
        <!-- Avatar -->
        <div style="
          width: 120px;
          height: 120px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 60px;
          border: 4px solid white;
          position: relative;
        ">
          ${avatarIcon}
          <div style="
            position: absolute;
            bottom: -5px;
            right: -5px;
            background: #ffd700;
            color: #333;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
          ">Lv ${profile.level}</div>
        </div>

        <!-- Player Info -->
        <div style="flex: 1;">
          <h1 style="
            color: white;
            font-size: 36px;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 15px;
          ">
            ${profile.username}
            ${profile.title ? `<span style="font-size: 18px; opacity: 0.8;">${profile.title}</span>` : ''}
          </h1>

          <!-- XP Bar -->
          <div style="margin: 15px 0;">
            <div style="
              background: rgba(0,0,0,0.3);
              height: 30px;
              border-radius: 15px;
              overflow: hidden;
              position: relative;
            ">
              <div style="
                background: linear-gradient(90deg, #00ff00, #00cc00);
                height: 100%;
                width: ${(profile.xp / profile.xpToNextLevel) * 100}%;
                transition: width 0.5s ease;
                box-shadow: 0 0 20px rgba(0,255,0,0.5);
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-weight: bold;
              ">${profile.xp} / ${profile.xpToNextLevel} XP</div>
            </div>
          </div>

          <!-- Quick Stats -->
          <div style="display: flex; gap: 30px; color: white; font-size: 18px;">
            <div>
              <span style="opacity: 0.8;">Games:</span>
              <strong>${profile.stats.gamesPlayed}</strong>
            </div>
            <div>
              <span style="opacity: 0.8;">Wins:</span>
              <strong>${profile.stats.gamesWon}</strong>
            </div>
            <div>
              <span style="opacity: 0.8;">Win Rate:</span>
              <strong>${winRate.toFixed(1)}%</strong>
            </div>
            <div>
              <span style="opacity: 0.8;">Best Streak:</span>
              <strong>${profile.stats.bestWinStreak}</strong>
            </div>
          </div>
        </div>

        <!-- Currency Display -->
        <div style="
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 20px;
          background: rgba(255,255,255,0.1);
          border-radius: 15px;
        ">
          <div style="display: flex; align-items: center; gap: 10px; color: white;">
            <span style="font-size: 24px;">🪙</span>
            <strong style="font-size: 20px;">${profile.coins.toLocaleString()}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; color: white;">
            <span style="font-size: 24px;">💎</span>
            <strong style="font-size: 20px;">${profile.gems.toLocaleString()}</strong>
          </div>
        </div>
      </div>
    `;

    return header;
  }

  private createTabs(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      background: rgba(0,0,0,0.3);
      padding: 0;
      display: flex;
      border-bottom: 2px solid rgba(255,255,255,0.1);
    `;

    const tabs = [
      { id: 'stats', label: '📊 Statistics', active: true },
      { id: 'achievements', label: '🏆 Achievements' },
      { id: 'challenges', label: '🎯 Challenges' },
      { id: 'avatars', label: '🎨 Customization' },
      { id: 'history', label: '📜 Match History' }
    ];

    tabs.forEach(tab => {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'profile-tab';
      tabBtn.dataset.tab = tab.id;
      tabBtn.style.cssText = `
        flex: 1;
        padding: 20px;
        background: ${tab.active ? 'rgba(102, 126, 234, 0.3)' : 'transparent'};
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        transition: background 0.3s;
        border-bottom: ${tab.active ? '3px solid #667eea' : '3px solid transparent'};
      `;
      tabBtn.innerHTML = tab.label;
      container.appendChild(tabBtn);
    });

    return container;
  }

  private setupTabListeners(profile: PlayerProfile): void {
    const tabs = document.querySelectorAll('.profile-tab');
    const contentArea = document.getElementById('profileContent');

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabId = target.dataset.tab;

        // Update active tab styling
        tabs.forEach(t => {
          (t as HTMLElement).style.background = 'transparent';
          (t as HTMLElement).style.borderBottom = '3px solid transparent';
        });
        target.style.background = 'rgba(102, 126, 234, 0.3)';
        target.style.borderBottom = '3px solid #667eea';

        // Update content
        if (contentArea && tabId) {
          switch (tabId) {
            case 'stats':
              contentArea.innerHTML = this.renderStatsTab(profile);
              break;
            case 'achievements':
              contentArea.innerHTML = this.renderAchievementsTab(profile);
              break;
            case 'challenges':
              contentArea.innerHTML = this.renderChallengesTab(profile);
              break;
            case 'avatars':
              contentArea.innerHTML = this.renderCustomizationTab(profile);
              this.setupCustomizationListeners();
              break;
            case 'history':
              contentArea.innerHTML = this.renderHistoryTab(profile);
              break;
          }
        }
      });
    });
  }

  private renderStatsTab(profile: PlayerProfile): string {
    const avgScore = profile.stats.gamesPlayed > 0
      ? (profile.stats.totalScore / profile.stats.gamesPlayed).toFixed(0)
      : 0;

    const avgTime = profile.stats.gamesPlayed > 0
      ? Math.floor(profile.stats.totalPlayTime / profile.stats.gamesPlayed / 60)
      : 0;

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
        <!-- Overall Stats Card -->
        <div style="
          background: rgba(255,255,255,0.05);
          padding: 25px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.1);
        ">
          <h3 style="color: #667eea; margin-bottom: 20px;">📈 Overall Performance</h3>
          <div style="color: white; display: flex; flex-direction: column; gap: 15px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Games</span>
              <strong>${profile.stats.gamesPlayed}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Victories</span>
              <strong style="color: #00ff00;">${profile.stats.gamesWon}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Defeats</span>
              <strong style="color: #ff6b6b;">${profile.stats.gamesLost}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Current Streak</span>
              <strong style="color: #ffd700;">🔥 ${profile.stats.winStreak}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Perfect Games</span>
              <strong style="color: #00ffff;">💎 ${profile.stats.perfectGames}</strong>
            </div>
          </div>
        </div>

        <!-- Scoring Stats Card -->
        <div style="
          background: rgba(255,255,255,0.05);
          padding: 25px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.1);
        ">
          <h3 style="color: #ffd700; margin-bottom: 20px;">💯 Scoring Statistics</h3>
          <div style="color: white; display: flex; flex-direction: column; gap: 15px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Score</span>
              <strong>${profile.stats.totalScore.toLocaleString()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Highest Score</span>
              <strong style="color: #ffd700;">👑 ${profile.stats.highestScore}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Average Score</span>
              <strong>${avgScore}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Tiles Played</span>
              <strong>${profile.stats.tilesPlayed.toLocaleString()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Avg Game Time</span>
              <strong>${avgTime} min</strong>
            </div>
          </div>
        </div>

        <!-- Mode Stats Card -->
        <div style="
          background: rgba(255,255,255,0.05);
          padding: 25px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.1);
          grid-column: span 2;
        ">
          <h3 style="color: #00ff00; margin-bottom: 20px;">🎮 Game Mode Performance</h3>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
            ${Object.entries(profile.stats.modeStats).map(([mode, stats]) => `
              <div style="
                background: rgba(255,255,255,0.05);
                padding: 15px;
                border-radius: 10px;
                text-align: center;
                color: white;
              ">
                <div style="font-size: 14px; opacity: 0.8; text-transform: uppercase;">${mode}</div>
                <div style="font-size: 24px; font-weight: bold; color: #667eea;">${stats.won}/${stats.played}</div>
                <div style="font-size: 12px; opacity: 0.6;">Win Rate: ${stats.played > 0 ? ((stats.won/stats.played)*100).toFixed(0) : 0}%</div>
              </div>
            `).join('') || '<div style="color: white; opacity: 0.5;">No mode statistics yet</div>'}
          </div>
        </div>
      </div>
    `;
  }

  private renderAchievementsTab(profile: PlayerProfile): string {
    const totalAchievements = profile.achievements.length;
    const unlockedCount = profile.achievements.filter(a => a.unlocked).length;
    const completionRate = (unlockedCount / totalAchievements) * 100;

    return `
      <div>
        <!-- Progress Header -->
        <div style="
          background: rgba(255,255,255,0.05);
          padding: 20px;
          border-radius: 15px;
          margin-bottom: 20px;
        ">
          <h3 style="color: white; margin-bottom: 15px;">Achievement Progress</h3>
          <div style="
            background: rgba(0,0,0,0.3);
            height: 30px;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
          ">
            <div style="
              background: linear-gradient(90deg, #ffd700, #ffed4e);
              height: 100%;
              width: ${completionRate}%;
              transition: width 0.5s ease;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: white;
              font-weight: bold;
            ">${unlockedCount} / ${totalAchievements} (${completionRate.toFixed(0)}%)</div>
          </div>
        </div>

        <!-- Achievement Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 15px;">
          ${profile.achievements.map(achievement => `
            <div style="
              background: ${achievement.unlocked ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.05)'};
              padding: 20px;
              border-radius: 15px;
              border: 2px solid ${achievement.unlocked ? '#ffd700' : 'rgba(255,255,255,0.1)'};
              position: relative;
              transition: transform 0.3s, box-shadow 0.3s;
              cursor: pointer;
            " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.3)'"
               onmouseout="this.style.transform=''; this.style.boxShadow=''">

              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="
                  font-size: 40px;
                  ${!achievement.unlocked ? 'filter: grayscale(1); opacity: 0.3;' : ''}
                ">${achievement.icon}</div>

                <div style="flex: 1;">
                  <div style="
                    color: ${achievement.unlocked ? '#ffd700' : 'white'};
                    font-size: 18px;
                    font-weight: bold;
                  ">${achievement.name}</div>
                  <div style="
                    color: white;
                    opacity: 0.8;
                    font-size: 14px;
                    margin-top: 5px;
                  ">${achievement.description}</div>

                  ${!achievement.unlocked ? `
                    <div style="margin-top: 10px;">
                      <div style="
                        background: rgba(0,0,0,0.3);
                        height: 8px;
                        border-radius: 4px;
                        overflow: hidden;
                      ">
                        <div style="
                          background: #667eea;
                          height: 100%;
                          width: ${(achievement.progress / achievement.maxProgress) * 100}%;
                        "></div>
                      </div>
                      <div style="
                        color: white;
                        opacity: 0.6;
                        font-size: 12px;
                        margin-top: 5px;
                      ">${achievement.progress} / ${achievement.maxProgress}</div>
                    </div>
                  ` : `
                    <div style="
                      color: #00ff00;
                      font-size: 12px;
                      margin-top: 5px;
                    ">✅ Unlocked ${achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString() : ''}</div>
                  `}
                </div>

                <div style="
                  background: ${this.getRarityColor(achievement.rarity)};
                  padding: 5px 10px;
                  border-radius: 10px;
                  font-size: 12px;
                  color: white;
                  text-transform: uppercase;
                  font-weight: bold;
                ">${achievement.rarity}</div>
              </div>

              <div style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255,255,255,0.1);
                padding: 5px 10px;
                border-radius: 10px;
                color: #ffd700;
                font-size: 14px;
                font-weight: bold;
              ">+${achievement.xpReward} XP</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderChallengesTab(profile: PlayerProfile): string {
    return `
      <div>
        <!-- Daily Challenges -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #00ff00; margin-bottom: 20px;">📅 Daily Challenges</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
            ${profile.dailyChallenges.map(challenge => `
              <div style="
                background: ${challenge.completed ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255,255,255,0.05)'};
                padding: 25px;
                border-radius: 15px;
                border: 2px solid ${challenge.completed ? '#00ff00' : 'rgba(255,255,255,0.1)'};
                position: relative;
              ">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="font-size: 40px;">${challenge.icon}</div>

                  <div style="flex: 1;">
                    <div style="color: white; font-size: 20px; font-weight: bold;">
                      ${challenge.title}
                    </div>
                    <div style="color: white; opacity: 0.8; margin-top: 5px;">
                      ${challenge.description}
                    </div>

                    <div style="margin-top: 15px;">
                      <div style="
                        background: rgba(0,0,0,0.3);
                        height: 20px;
                        border-radius: 10px;
                        overflow: hidden;
                        position: relative;
                      ">
                        <div style="
                          background: ${challenge.completed ? '#00ff00' : 'linear-gradient(90deg, #667eea, #764ba2)'};
                          height: 100%;
                          width: ${Math.min(100, (challenge.progress / challenge.target) * 100)}%;
                          transition: width 0.5s ease;
                        "></div>
                        <div style="
                          position: absolute;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                          color: white;
                          font-weight: bold;
                          font-size: 14px;
                        ">${challenge.progress} / ${challenge.target}</div>
                      </div>
                    </div>
                  </div>

                  <div style="text-align: center;">
                    <div style="
                      background: rgba(255,215,0,0.2);
                      padding: 10px;
                      border-radius: 10px;
                      color: #ffd700;
                      font-weight: bold;
                    ">+${challenge.xpReward} XP</div>
                    ${challenge.completed ? `
                      <div style="color: #00ff00; margin-top: 10px;">✅ Complete</div>
                    ` : `
                      <div style="color: white; opacity: 0.6; margin-top: 10px; font-size: 12px;">
                        Expires in ${this.getTimeRemaining(challenge.expiresAt)}
                      </div>
                    `}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Weekly Challenge -->
        ${profile.weeklyChallenge ? `
          <div>
            <h3 style="color: #ffd700; margin-bottom: 20px;">🌟 Weekly Challenge</h3>
            <div style="
              background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,237,78,0.1));
              padding: 30px;
              border-radius: 20px;
              border: 2px solid #ffd700;
            ">
              <!-- Weekly challenge content similar to daily -->
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderCustomizationTab(profile: PlayerProfile): string {
    return `
      <div>
        <!-- Avatar Selection -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #667eea; margin-bottom: 20px;">🎨 Select Avatar</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px;">
            ${PlayerProfileManager.AVATARS.map(avatar => {
              const isUnlocked = profile.unlockedAvatars.includes(avatar.id);
              const isSelected = profile.avatar === avatar.id;

              return `
                <div class="avatar-option" data-avatar="${avatar.id}" style="
                  background: ${isSelected ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)'};
                  padding: 20px;
                  border-radius: 15px;
                  border: 2px solid ${isSelected ? '#667eea' : 'rgba(255,255,255,0.1)'};
                  text-align: center;
                  cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
                  opacity: ${isUnlocked ? '1' : '0.5'};
                  transition: all 0.3s;
                  position: relative;
                ">
                  <div style="font-size: 48px; margin-bottom: 10px;">
                    ${avatar.icon}
                  </div>
                  <div style="color: white; font-size: 12px;">
                    ${avatar.name}
                  </div>

                  ${!isUnlocked ? `
                    <div style="
                      position: absolute;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background: rgba(0,0,0,0.7);
                      border-radius: 15px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      flex-direction: column;
                      color: white;
                    ">
                      <div style="font-size: 24px;">🔒</div>
                      <div style="font-size: 10px; margin-top: 5px;">
                        ${avatar.unlockLevel ? `Level ${avatar.unlockLevel}` :
                          avatar.achievement ? 'Achievement' :
                          avatar.coins ? `${avatar.coins} coins` : 'Special'}
                      </div>
                    </div>
                  ` : ''}

                  ${isSelected ? `
                    <div style="
                      position: absolute;
                      top: 5px;
                      right: 5px;
                      background: #00ff00;
                      color: white;
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 12px;
                    ">✓</div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Username Change -->
        <div style="
          background: rgba(255,255,255,0.05);
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 30px;
        ">
          <h3 style="color: #ffd700; margin-bottom: 20px;">✏️ Change Username</h3>
          <div style="display: flex; gap: 15px; align-items: center;">
            <input type="text" id="usernameInput" value="${profile.username}" style="
              flex: 1;
              padding: 15px;
              background: rgba(0,0,0,0.3);
              border: 1px solid rgba(255,255,255,0.2);
              border-radius: 10px;
              color: white;
              font-size: 18px;
            " placeholder="Enter username..." maxlength="20">
            <button id="saveUsernameBtn" style="
              padding: 15px 30px;
              background: linear-gradient(135deg, #00ff00, #00cc00);
              border: none;
              color: white;
              font-size: 18px;
              font-weight: bold;
              border-radius: 10px;
              cursor: pointer;
              transition: transform 0.2s;
            ">Save</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderHistoryTab(profile: PlayerProfile): string {
    return `
      <div style="
        background: rgba(255,255,255,0.05);
        padding: 25px;
        border-radius: 15px;
        text-align: center;
        color: white;
      ">
        <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;">📜</div>
        <h3 style="color: #667eea; margin-bottom: 15px;">Match History Coming Soon!</h3>
        <p style="opacity: 0.8;">Your recent games and detailed statistics will appear here.</p>
      </div>
    `;
  }

  private setupCustomizationListeners(): void {
    // Avatar selection
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const avatarId = target.dataset.avatar;
        if (avatarId) {
          this.profileManager.setAvatar(avatarId);
          // Refresh the tab
          const profile = this.profileManager.getProfile();
          if (profile) {
            const contentArea = document.getElementById('profileContent');
            if (contentArea) {
              contentArea.innerHTML = this.renderCustomizationTab(profile);
              this.setupCustomizationListeners();
            }
          }
        }
      });
    });

    // Username save
    const saveBtn = document.getElementById('saveUsernameBtn');
    const input = document.getElementById('usernameInput') as HTMLInputElement;
    if (saveBtn && input) {
      saveBtn.addEventListener('click', () => {
        const newUsername = input.value.trim();
        if (newUsername && newUsername.length > 0) {
          this.profileManager.setUsername(newUsername);
          // Refresh header
          const profile = this.profileManager.getProfile();
          if (profile && this.container) {
            const header = this.container.querySelector('div');
            if (header) {
              const newHeader = this.createHeader(profile);
              header.replaceWith(newHeader);
            }
          }
        }
      });
    }
  }

  private getRarityColor(rarity: string): string {
    switch (rarity) {
      case 'common': return '#808080';
      case 'rare': return '#4169e1';
      case 'epic': return '#9932cc';
      case 'legendary': return '#ffd700';
      default: return '#808080';
    }
  }

  private getTimeRemaining(expiresAt: Date): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}