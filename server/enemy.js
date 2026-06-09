const ENEMY_TYPES = {
  slime: {
    name: 'Slime',
    hp: 30,
    damage: 8,
    speed: 1.2,
    size: 20,
    xp: 10,
    color: '#44cc44',
    aggroRange: 200,
    attackRange: 30,
    attackCooldown: 1200,
  },
  skeleton: {
    name: 'Skeleton',
    hp: 50,
    damage: 12,
    speed: 1.8,
    size: 22,
    xp: 18,
    color: '#ddddaa',
    aggroRange: 250,
    attackRange: 40,
    attackCooldown: 900,
  },
  spirit: {
    name: 'Spirit',
    hp: 35,
    damage: 15,
    speed: 2.2,
    size: 18,
    xp: 22,
    color: '#aa88ff',
    aggroRange: 300,
    attackRange: 35,
    attackCooldown: 700,
  },
  dragon: {
    name: 'Dragon',
    hp: 200,
    damage: 25,
    speed: 1.5,
    size: 36,
    xp: 80,
    color: '#ff6600',
    aggroRange: 350,
    attackRange: 50,
    attackCooldown: 1500,
  },
};

class Enemy {
  constructor(id, type, x, y, level = 1) {
    const t = ENEMY_TYPES[type];
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.hp = t.hp * (1 + level * 0.15);
    this.maxHp = this.hp;
    this.damage = t.damage * (1 + level * 0.1);
    this.speed = t.speed;
    this.size = t.size;
    this.xp = t.xp * (1 + level * 0.2);
    this.color = t.color;
    this.aggroRange = t.aggroRange;
    this.attackRange = t.attackRange;
    this.attackCooldown = t.attackCooldown;
    this.level = level;
    this.target = null;
    this.lastAttack = 0;
    this.alive = true;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  update(dt, players, projectiles) {
    if (!this.alive) return null;

    let closest = null;
    let closestDist = this.aggroRange;

    for (const p of players) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < closestDist) {
        closestDist = d;
        closest = p;
      }
    }

    this.target = closest;

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      if (dist > this.attackRange) {
        this.x += Math.cos(angle) * this.speed * (dt / 16);
        this.y += Math.sin(angle) * this.speed * (dt / 16);
      }

      if (dist <= this.attackRange && Date.now() - this.lastAttack > this.attackCooldown) {
        this.lastAttack = Date.now();
        return { type: 'attack', targetId: this.target.id, damage: this.damage, enemyId: this.id };
      }
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = 2000 + Math.random() * 3000;
      }
      this.x += Math.cos(this.wanderAngle) * this.speed * 0.3 * (dt / 16);
      this.y += Math.sin(this.wanderAngle) * this.speed * 0.3 * (dt / 16);
    }

    this.x = Math.max(32, Math.min(4068, this.x));
    this.y = Math.max(32, Math.min(4068, this.y));

    return null;
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      x: Math.round(this.x),
      y: Math.round(this.y),
      hp: Math.round(this.hp),
      maxHp: Math.round(this.maxHp),
      size: this.size,
      color: this.color,
      level: this.level,
      alive: this.alive,
    };
  }
}

module.exports = { Enemy, ENEMY_TYPES };
