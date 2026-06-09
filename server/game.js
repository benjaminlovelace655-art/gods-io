const { Player, getRank } = require('./player');
const { Enemy, ENEMY_TYPES } = require('./enemy');
const { Boss, BOSS_TYPES } = require('./boss');
const { Companion, COMPANION_TYPES } = require('./companion');
const { ABILITIES, createProjectile, createAoE } = require('./abilities');
const db = require('./database');

const WORLD_W = 4100;
const WORLD_H = 4100;

const BIOMES = [
  { name: 'Spawn', x: 0, y: 0, w: 1000, h: 1000, color: '#1a2a1a' },
  { name: 'Forest', x: 1000, y: 0, w: 1000, h: 1500, color: '#0d2a0d' },
  { name: 'Desert', x: 0, y: 1000, w: 1500, h: 1000, color: '#2a2a15' },
  { name: 'Ice Realm', x: 2000, y: 0, w: 1200, h: 1200, color: '#1a2a3a' },
  { name: 'Sky Realm', x: 1500, y: 1500, w: 1500, h: 1500, color: '#1a1a3a' },
];

class Game {
  constructor() {
    this.players = new Map();
    this.enemies = [];
    this.bosses = [];
    this.projectiles = [];
    this.aoes = [];
    this.chatHistory = [];
    this.enemyIdCounter = 0;
    this.bossIdCounter = 0;
    this.tick = 0;
    this.bossSpawnTimer = 60000;
    this.lastBiomeWarn = {};
  }

  addPlayer(id, name) {
    const saved = db.getPlayer(id);
    const x = 500 + Math.random() * 200;
    const y = 500 + Math.random() * 200;
    const player = new Player(id, name, x, y);

    if (saved) {
      player.level = saved.level || 1;
      player.xp = saved.xp || 0;
      player.kills = saved.kills || 0;
      player.deaths = saved.deaths || 0;
      player.power = saved.power || 'fire';
      player.powerLevel = saved.powerLevel || 1;
      player.recalcStats();
    }

    this.players.set(id, player);

    const msg = `${name} has entered the realm`;
    this.chatHistory.push({ text: msg, type: 'system', time: Date.now() });
    this.broadcastChat(msg, 'system');
    this.broadcastLeaderboard();

    return player;
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (player) {
      db.savePlayer(id, {
        name: player.name,
        level: player.level,
        xp: player.xp,
        kills: player.kills,
        deaths: player.deaths,
        power: player.power,
        powerLevel: player.powerLevel,
      });
      const msg = `${player.name} has left the realm`;
      this.chatHistory.push({ text: msg, type: 'system', time: Date.now() });
      this.broadcastChat(msg, 'system');
    }
    this.players.delete(id);
    this.projectiles = this.projectiles.filter(p => p.ownerId !== id);
    this.aoes = this.aoes.filter(a => a.ownerId !== id);
    this.broadcastLeaderboard();
  }

  handleInput(id, input) {
    const player = this.players.get(id);
    if (!player) return;
    player.inputs = input;
  }

  handleAttack(id, type, targetX, targetY) {
    const player = this.players.get(id);
    if (!player || !player.alive) return;

    const ability = ABILITIES[player.power];
    if (!ability) return;

    const skill = type === 'ultimate' ? ability.ultimate : type === 'secondary' ? ability.secondary : ability.primary;

    if (player.cooldowns[type] > 0) return;
    if (player.mana < skill.cost) return;

    player.cooldowns[type] = skill.cooldown;
    player.mana -= skill.cost;

    if (type === 'primary') {
      const proj = createProjectile(player, ability, targetX, targetY, false, false);
      this.projectiles.push(proj);
    } else {
      const aoe = createAoE(player, ability, type === 'secondary', type === 'ultimate');
      this.aoes.push(aoe);
    }
  }

  handleSummon(id, companionType) {
    const player = this.players.get(id);
    if (!player || !player.alive) return;
    if (!COMPANION_TYPES[companionType]) return;

    const existing = player.companions.filter(c => this.companions?.has(c));
    if (existing.length >= player.companionSlots) return;

    if (!this.companions) this.companions = new Map();
    const compId = `comp-${id}-${Date.now()}`;
    const comp = new Companion(compId, companionType, id, player.level);
    comp.x = player.x + 40;
    comp.y = player.y + 40;
    this.companions.set(compId, comp);
    player.companions.push(compId);
  }

  handleChat(id, message) {
    const player = this.players.get(id);
    if (!player) return;
    const text = message.trim().substring(0, 200);
    if (!text) return;
    this.chatHistory.push({ text, type: 'player', name: player.name, time: Date.now() });
    if (this.chatHistory.length > 100) this.chatHistory.shift();
    this.broadcastChat(text, 'player', player.name);
  }

  handlePowerChange(id, power) {
    const player = this.players.get(id);
    if (!player) return;
    if (ABILITIES[power]) {
      player.power = power;
    }
  }

  broadcastChat(text, type, name) {
    const msg = { text, type, name, time: Date.now() };
    for (const ws of this.wss?.clients || []) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'chat', ...msg }));
      }
    }
  }

  broadcastLeaderboard() {
    const lb = Array.from(this.players.values())
      .filter(p => p.alive)
      .sort((a, b) => b.level - a.level || b.kills - a.kills)
      .slice(0, 50)
      .map(p => ({ name: p.name, level: p.level, kills: p.kills, power: p.power }));

    const msg = JSON.stringify({ type: 'leaderboard', data: lb });
    for (const ws of this.wss?.clients || []) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }

  spawnEnemy() {
    const types = Object.keys(ENEMY_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const id = `e-${this.enemyIdCounter++}`;
    const x = Math.random() * WORLD_W;
    const y = Math.random() * WORLD_H;
    const level = Math.max(1, Math.floor(Math.random() * 10));
    const enemy = new Enemy(id, type, x, y, level);
    this.enemies.push(enemy);
  }

  spawnBoss() {
    const types = Object.keys(BOSS_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const id = `boss-${this.bossIdCounter++}`;
    const x = 500 + Math.random() * (WORLD_W - 1000);
    const y = 500 + Math.random() * (WORLD_H - 1000);
    const level = Math.max(1, Math.floor(Math.random() * 5) + 1);
    const boss = new Boss(id, type, x, y, level);
    this.bosses.push(boss);

    const msg = `⚔️ ${boss.name} (Lv.${level}) has appeared!`;
    this.chatHistory.push({ text: msg, type: 'system', time: Date.now() });
    this.broadcastChat(msg, 'system');
  }

  getBiome(x, y) {
    for (const b of BIOMES) {
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b;
    }
    return BIOMES[0];
  }

  processCompanionEffects(effects, player) {
    if (!effects) return;
    if (effects.heal) {
      player.hp = Math.min(player.maxHp, player.hp + effects.heal.amount);
    }
    if (effects.attack) {
      const enemy = this.enemies.find(e => e.id === effects.attack.enemyId);
      if (enemy) enemy.takeDamage(effects.attack.damage);
      const boss = this.bosses.find(b => b.id === effects.attack.enemyId);
      if (boss) boss.takeDamage(effects.attack.damage);
    }
    if (effects.abilityAttack) {
      const enemy = this.enemies.find(e => e.id === effects.abilityAttack.enemyId);
      if (enemy) enemy.takeDamage(effects.abilityAttack.damage);
      const boss = this.bosses.find(b => b.id === effects.abilityAttack.enemyId);
      if (boss) boss.takeDamage(effects.abilityAttack.damage);
    }
  }

  update(dt) {
    this.tick++;

    if (this.tick % 30 === 0 && this.enemies.length < 80) {
      this.spawnEnemy();
    }

    this.bossSpawnTimer -= dt;
    if (this.bossSpawnTimer <= 0 && this.bosses.length < 3) {
      this.spawnBoss();
      this.bossSpawnTimer = 45000 + Math.random() * 30000;
    }

    for (const player of this.players.values()) {
      player.update(dt);

      if (player.alive && this.companions) {
        const toRemove = [];
        for (const compId of player.companions) {
          const comp = this.companions.get(compId);
          if (!comp) { toRemove.push(compId); continue; }
          if (!comp.alive) { toRemove.push(compId); continue; }
          const effects = comp.update(dt, player, this.enemies, this.bosses);
          this.processCompanionEffects(effects, player);
        }
        player.companions = player.companions.filter(c => !toRemove.includes(c));
      }
    }

    for (const enemy of this.enemies) {
      const result = enemy.update(dt, Array.from(this.players.values()), this.projectiles);
      if (result && result.type === 'attack') {
        const target = this.players.get(result.targetId);
        if (target) {
          const killed = target.takeDamage(result.damage, result.enemyId);
          if (killed) {
            const attacker = this.enemies.find(e => e.id === result.enemyId);
            if (attacker) {
              this.chatHistory.push({ text: `${target.name} was slain by ${attacker.type}`, type: 'system', time: Date.now() });
            }
          }
        }
      }
    }

    for (const boss of this.bosses) {
      const effects = boss.update(dt, Array.from(this.players.values()));
      for (const eff of effects) {
        if (eff.type === 'bossAbility') {
          for (const p of this.players.values()) {
            if (!p.alive) continue;
            const d = Math.hypot(p.x - boss.x, p.y - boss.y);
            if (d < boss.size + 100) {
              p.takeDamage(boss.damage * 0.8, boss.id);
            }
          }
        }
      }
    }

    for (const proj of this.projectiles) {
      proj.x += proj.dx;
      proj.y += proj.dy;
      proj.traveled += Math.hypot(proj.dx, proj.dy);

      if (proj.traveled > proj.range) {
        proj.hit = true;
      }

      if (!proj.hit) {
        for (const player of this.players.values()) {
          if (player.id === proj.ownerId || !player.alive) continue;
          if (proj.hit.has(player.id)) continue;
          const d = Math.hypot(player.x - proj.x, player.y - proj.y);
          if (d < proj.size + 16) {
            const killed = player.takeDamage(proj.damage, proj.ownerId);
            proj.hit.add(player.id);
            if (killed) {
              const killer = this.players.get(proj.ownerId);
              if (killer) {
                killer.kills++;
                const xpGain = 50 + player.level * 5;
                killer.addXp(xpGain);
                this.broadcastChat(`${killer.name} vanquished ${player.name}`, 'system');
                this.broadcastLeaderboard();
              }
            }
            if (!proj.pierce) proj.hit = true;
          }
        }

        for (const enemy of this.enemies) {
          if (!enemy.alive || proj.hit.has(enemy.id)) continue;
          const d = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
          if (d < proj.size + enemy.size / 2) {
            const killed = enemy.takeDamage(proj.damage);
            proj.hit.add(enemy.id);
            if (killed) {
              const owner = this.players.get(proj.ownerId);
              if (owner) {
                owner.addXp(enemy.xp);
              }
            }
            if (!proj.pierce) proj.hit = true;
          }
        }

        for (const boss of this.bosses) {
          if (!boss.alive || proj.hit.has(boss.id)) continue;
          const d = Math.hypot(boss.x - proj.x, boss.y - proj.y);
          if (d < proj.size + boss.size / 2) {
            boss.takeDamage(proj.damage);
            proj.hit.add(boss.id);
            if (!boss.alive) {
              const owner = this.players.get(proj.ownerId);
              if (owner) {
                owner.addXp(boss.xp);
                this.broadcastChat(`🏆 ${owner.name} defeated ${boss.name}!`, 'system');
              }
            }
            if (!proj.pierce) proj.hit = true;
          }
        }
      }
    }

    this.enemies = this.enemies.filter(e => e.alive);
    this.bosses = this.bosses.filter(b => b.alive);
    this.projectiles = this.projectiles.filter(p => !p.hit);
    this.aoes = this.aoes.filter(a => Date.now() - a.startTime < a.duration);

    if (this.tick % 100 === 0) {
      this.broadcastLeaderboard();
    }
  }

  getState(playerId) {
    const players = Array.from(this.players.values()).map(p => p.serialize());
    const enemies = this.enemies.map(e => e.serialize());
    const bosses = this.bosses.map(b => b.serialize());
    const projectiles = this.projectiles.map(p => ({
      id: p.id,
      x: Math.round(p.x),
      y: Math.round(p.y),
      size: p.size,
      color: p.color,
      type: p.type,
    }));
    const aoeData = this.aoes.map(a => ({
      id: a.id,
      x: Math.round(a.x),
      y: Math.round(a.y),
      size: a.size,
      color: a.color,
      duration: a.duration,
      startTime: a.startTime,
      ownerId: a.ownerId,
    }));

    const companions = [];
    if (this.companions) {
      for (const [id, comp] of this.companions) {
        companions.push(comp.serialize());
      }
    }

    const biome = this.getBiome(
      this.players.get(playerId)?.x || 500,
      this.players.get(playerId)?.y || 500
    );

    return {
      type: 'state',
      players,
      enemies,
      bosses,
      projectiles,
      aoes: aoeData,
      companions,
      biome: biome?.name || 'Spawn',
    };
  }
}

module.exports = Game;
