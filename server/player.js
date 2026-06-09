const RANKS = [
  { name: 'Mortal', level: 0, hp: 100 },
  { name: 'Warrior', level: 5, hp: 150 },
  { name: 'Hero', level: 15, hp: 220 },
  { name: 'Sage', level: 30, hp: 320 },
  { name: 'Demigod', level: 50, hp: 450 },
  { name: 'Lesser God', level: 75, hp: 600 },
  { name: 'Greater God', level: 100, hp: 800 },
  { name: 'Primordial Being', level: 140, hp: 1100 },
  { name: 'Cosmic Entity', level: 190, hp: 1500 },
  { name: 'Creator', level: 250, hp: 2000 },
];

function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.18, level));
}

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.level) rank = r;
  }
  return rank;
}

class Player {
  constructor(id, name, x, y) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 2.5;
    this.hp = 100;
    this.maxHp = 100;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = xpForLevel(1);
    this.kills = 0;
    this.deaths = 0;
    this.power = 'fire';
    this.cooldowns = { primary: 0, secondary: 0, ultimate: 0 };
    this.companions = [];
    this.companionSlots = 1;
    this.alive = true;
    this.respawnTimer = 0;
    this.invincible = false;
    this.invincibleUntil = 0;
    this.inputs = { up: false, down: false, left: false, right: false, aiming: false, targetX: 0, targetY: 0 };
    this.lastAttack = 0;
    this.mana = 100;
    this.maxMana = 100;
    this.manaRegen = 1;
    this.powerLevel = 1;
    this.rank = getRank(1);
    this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
  }

  get rankName() {
    return getRank(this.level).name;
  }

  recalcStats() {
    const rank = getRank(this.level);
    this.maxHp = rank.hp + (this.level - rank.level) * 5;
    this.hp = Math.min(this.hp, this.maxHp);
    this.maxMana = 100 + this.level * 2;
    this.manaRegen = 1 + this.level * 0.05;
    this.companionSlots = Math.min(3, 1 + Math.floor(this.level / 10));
    this.xpToNext = xpForLevel(this.level);
    this.rank = rank;
  }

  addXp(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.recalcStats();
    }
  }

  takeDamage(amount, fromId) {
    if (this.invincible || !this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.respawnTimer = 5000;
      return true;
    }
    return false;
  }

  respawn() {
    this.alive = true;
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.invincible = true;
    this.invincibleUntil = Date.now() + 3000;
    this.x = Math.random() * 1000 + 100;
    this.y = Math.random() * 1000 + 100;
  }

  update(dt) {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    if (Date.now() > this.invincibleUntil) this.invincible = false;

    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * (dt / 1000));

    let mx = 0, my = 0;
    if (this.inputs.up) my -= 1;
    if (this.inputs.down) my += 1;
    if (this.inputs.left) mx -= 1;
    if (this.inputs.right) mx += 1;

    if (mx !== 0 && my !== 0) {
      mx *= 0.7071;
      my *= 0.7071;
    }

    this.x += mx * this.speed * (dt / 16);
    this.y += my * this.speed * (dt / 16);

    this.x = Math.max(32, Math.min(4068, this.x));
    this.y = Math.max(32, Math.min(4068, this.y));

    if (this.inputs.aiming) {
      this.angle = Math.atan2(this.inputs.targetY - this.y, this.inputs.targetX - this.x);
    }

    Object.keys(this.cooldowns).forEach(k => {
      if (this.cooldowns[k] > 0) this.cooldowns[k] -= dt;
    });
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      x: Math.round(this.x),
      y: Math.round(this.y),
      angle: this.angle,
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      mana: Math.round(this.mana),
      maxMana: this.maxMana,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      kills: this.kills,
      power: this.power,
      rankName: this.rankName,
      color: this.color,
      alive: this.alive,
      invincible: this.invincible,
      companionSlots: this.companionSlots,
      powerLevel: this.powerLevel,
    };
  }
}

module.exports = { Player, getRank, xpForLevel, RANKS };
