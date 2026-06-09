const BOSS_TYPES = {
  celestialDragon: {
    name: 'Celestial Dragon',
    hp: 5000,
    damage: 40,
    speed: 2.0,
    size: 80,
    xp: 2000,
    color: '#ffdd44',
    glowColor: '#ffaa00',
    abilities: ['lightningBreath', 'stormCloud', 'divineWrath'],
  },
  titanKing: {
    name: 'Titan King',
    hp: 8000,
    damage: 60,
    speed: 1.2,
    size: 100,
    xp: 3500,
    color: '#cc6644',
    glowColor: '#ff4400',
    abilities: ['groundSlam', 'boulderThrow', 'titanRage'],
  },
  voidEmperor: {
    name: 'Void Emperor',
    hp: 12000,
    damage: 80,
    speed: 2.5,
    size: 70,
    xp: 5000,
    color: '#6622cc',
    glowColor: '#aa44ff',
    abilities: ['voidRift', 'shadowPulse', 'annihilate'],
  },
};

class Boss {
  constructor(id, type, x, y, level = 1) {
    const t = BOSS_TYPES[type];
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.hp = t.hp * (1 + level * 0.2);
    this.maxHp = this.hp;
    this.damage = t.damage * (1 + level * 0.15);
    this.speed = t.speed;
    this.size = t.size;
    this.xp = t.xp * (1 + level * 0.2);
    this.color = t.color;
    this.glowColor = t.glowColor;
    this.level = level;
    this.target = null;
    this.alive = true;
    this.phase = 1;
    this.abilities = t.abilities;
    this.lastAbility = 0;
    this.abilityCooldown = 3000;
    this.currentAbility = null;
    this.abilityTimer = 0;
    this.spawnTime = Date.now();
    this.name = t.name;
  }

  takeDamage(amount) {
    this.hp -= amount;
    const phaseThreshold = this.maxHp * 0.3;
    if (this.hp <= phaseThreshold && this.phase === 1) {
      this.phase = 2;
      this.speed *= 1.3;
      this.damage *= 1.25;
      this.abilityCooldown = 2000;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  update(dt, players) {
    if (!this.alive) return [];

    let closest = null;
    let closestDist = 600;

    for (const p of players) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < closestDist) {
        closestDist = d;
        closest = p;
      }
    }

    this.target = closest;

    const effects = [];

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      if (dist > 80) {
        this.x += Math.cos(angle) * this.speed * (dt / 16);
        this.y += Math.sin(angle) * this.speed * (dt / 16);
      }

      if (Date.now() - this.lastAbility > this.abilityCooldown) {
        this.lastAbility = Date.now();
        const ability = this.abilities[Math.floor(Math.random() * this.abilities.length)];
        effects.push({ type: 'bossAbility', bossId: this.id, ability, x: this.x, y: this.y, targetX: this.target.x, targetY: this.target.y });
      }
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 2000;
      }
      this.x += Math.cos(this.wanderAngle) * this.speed * 0.3 * (dt / 16);
      this.y += Math.sin(this.wanderAngle) * this.speed * 0.3 * (dt / 16);
    }

    this.x = Math.max(80, Math.min(4020, this.x));
    this.y = Math.max(80, Math.min(4020, this.y));

    return effects;
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      x: Math.round(this.x),
      y: Math.round(this.y),
      hp: Math.round(this.hp),
      maxHp: Math.round(this.maxHp),
      size: this.size,
      color: this.color,
      glowColor: this.glowColor,
      level: this.level,
      alive: this.alive,
      phase: this.phase,
    };
  }
}

module.exports = { Boss, BOSS_TYPES };
