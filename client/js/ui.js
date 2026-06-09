const ui = {
  init() {
    this.joinScreen = document.getElementById('join-screen');
    this.nameInput = document.getElementById('name-input');
    this.joinBtn = document.getElementById('join-btn');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.chatInputArea = document.getElementById('chat-input-area');
    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.mpFill = document.getElementById('mp-fill');
    this.mpText = document.getElementById('mp-text');
    this.xpFill = document.getElementById('xp-fill');
    this.xpText = document.getElementById('xp-text');
    this.levelDisplay = document.getElementById('level-display');
    this.rankDisplay = document.getElementById('rank-display');
    this.killDisplay = document.getElementById('kill-display');
    this.powerDisplay = document.getElementById('power-display');
    this.deathScreen = document.getElementById('death-screen');
    this.respawnTimer = document.getElementById('respawn-timer');
    this.biomeLabel = document.getElementById('biome-label');
    this.lbEntries = document.getElementById('lb-entries');
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    const mm = document.getElementById('minimap');
    mm.appendChild(this.minimapCanvas);
    this.minimapCanvas.width = 120;
    this.minimapCanvas.height = 120;

    this.chatting = false;
    this.chatHistory = [];
    this.abilityNames = {
      fire: { primary: 'Fireball', secondary: 'Inferno', ultimate: 'Meteor Storm' },
      ice: { primary: 'Frost Bolt', secondary: 'Blizzard', ultimate: 'Absolute Zero' },
      lightning: { primary: 'Chain Bolt', secondary: 'Thunderstorm', ultimate: 'Divine Wrath' },
      wind: { primary: 'Gust', secondary: 'Tornado', ultimate: 'Storm Eye' },
      void: { primary: 'Void Orb', secondary: 'Null Field', ultimate: 'Reality Tear' },
    };
    this.powerIcons = {
      fire: '🔥', ice: '❄️', lightning: '⚡', wind: '🌪️', void: '🌀',
    };
  },

  showJoin() { this.joinScreen.style.display = 'flex'; },
  hideJoin() { this.joinScreen.style.display = 'none'; },

  updatePlayerInfo(player) {
    if (!player) return;
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    const mpPct = Math.max(0, (player.mana / player.maxMana) * 100);
    const xpPct = Math.max(0, (player.xp / player.xpToNext) * 100);

    this.hpFill.style.width = hpPct + '%';
    this.hpText.textContent = `${player.hp}/${player.maxHp}`;
    this.mpFill.style.width = mpPct + '%';
    this.mpText.textContent = `${Math.round(player.mana)}/${player.maxMana}`;
    this.xpFill.style.width = xpPct + '%';
    this.xpText.textContent = `${player.xp}/${player.xpToNext}`;
    this.levelDisplay.textContent = `Lv.${player.level}`;
    this.rankDisplay.textContent = player.rankName;
    this.killDisplay.textContent = `Kills: ${player.kills}`;

    const icon = this.powerIcons[player.power] || '🔥';
    this.powerDisplay.textContent = `${icon} ${player.power.charAt(0).toUpperCase() + player.power.slice(1)}`;

    const names = this.abilityNames[player.power] || this.abilityNames.fire;
    document.querySelector('#ability-primary .ability-name').textContent = names.primary;
    document.querySelector('#ability-secondary .ability-name').textContent = names.secondary;
    document.querySelector('#ability-ultimate .ability-name').textContent = names.ultimate;
  },

  addChatMessage(msg) {
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.type}`;

    if (msg.type === 'system') {
      div.textContent = `✦ ${msg.text}`;
    } else {
      div.innerHTML = `<span class="chat-name">${msg.name}:</span> <span class="chat-text">${msg.text}</span>`;
    }

    this.chatMessages.appendChild(div);
    this.chatHistory.push(div);

    while (this.chatHistory.length > 30) {
      const old = this.chatHistory.shift();
      old.remove();
    }

    if (!this.chatting) {
      setTimeout(() => div.scrollIntoView({ block: 'end' }), 50);
    }
  },

  showDeath(respawnTime) {
    this.deathScreen.style.display = 'flex';
    this.respawnTimer.textContent = Math.ceil(respawnTime / 1000);
    const interval = setInterval(() => {
      respawnTime -= 1000;
      if (respawnTime <= 0) {
        clearInterval(interval);
        this.deathScreen.style.display = 'none';
      } else {
        this.respawnTimer.textContent = Math.ceil(respawnTime / 1000);
      }
    }, 1000);
  },

  updateBiome(name) {
    const current = this.biomeLabel.textContent;
    if (current !== name) {
      this.biomeLabel.style.opacity = '0';
      setTimeout(() => {
        this.biomeLabel.textContent = name;
        this.biomeLabel.style.opacity = '0.3';
      }, 300);
    }
  },

  updateLeaderboard(data) {
    this.lbEntries.innerHTML = '';
    data.slice(0, 20).forEach((entry, i) => {
      const div = document.createElement('div');
      div.className = 'lb-entry';
      div.innerHTML = `
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${entry.name}</span>
        <span class="lb-level">Lv.${entry.level}</span>
        <span class="lb-kills">${entry.kills}</span>
      `;
      this.lbEntries.appendChild(div);
    });
  },

  drawMinimap(players, enemies, bosses, playerId) {
    const ctx = this.minimapCtx;
    const w = 120, h = 120;
    const scale = w / 4100;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, w, h);

    for (const e of enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(e.x * scale - 1, e.y * scale - 1, 2, 2);
    }

    for (const b of bosses) {
      if (!b.alive) continue;
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(b.x * scale, b.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of players) {
      if (!p.alive) continue;
      if (p.id === playerId) {
        ctx.fillStyle = '#44ff44';
        ctx.beginPath();
        ctx.arc(p.x * scale, p.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(p.x * scale - 1, p.y * scale - 1, 2, 2);
      }
    }
  },
};
