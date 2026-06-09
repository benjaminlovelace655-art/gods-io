const COMPANION_TYPES = {
  angelCat: {
    name: 'Angel Cat',
    hp: 50,
    damage: 8,
    speed: 3.0,
    size: 14,
    color: '#ffffff',
    auraColor: '#ffddff',
    ability: 'heal',
    abilityCooldown: 5000,
    healAmount: 15,
  },
  dragonCat: {
    name: 'Dragon Cat',
    hp: 80,
    damage: 15,
    speed: 2.5,
    size: 16,
    color: '#ff6644',
    auraColor: '#ff4400',
    ability: 'fireBreath',
    abilityCooldown: 4000,
    abilityDamage: 20,
  },
  titanCat: {
    name: 'Titan Cat',
    hp: 150,
    damage: 10,
    speed: 2.0,
    size: 20,
    color: '#88aacc',
    auraColor: '#4466aa',
    ability: 'taunt',
    abilityCooldown: 6000,
    tauntRange: 150,
  },
};

class Companion {
  constructor(id, type, ownerId, level = 1) {
    const t = COMPANION_TYPES[type];
    this.id = id;
    this.type = type;
    this.ownerId = ownerId;
    this.x = 0;
    this.y = 0;
    this.hp = t.hp * (1 + level * 0.2);
    this.maxHp = this.hp;
    this.damage = t.damage * (1 + level * 0.15);
    this.speed = t.speed;
    this.size = t.size;
    this.color = t.color;
    this.auraColor = t.auraColor;
    this.level = level;
    this.alive = true;
    this.ability = t.ability;
    this.abilityCooldown = t.abilityCooldown;
    this.healAmount = t.healAmount || 0;
    this.abilityDamage = t.abilityDamage || 0;
    this.tauntRange = t.tauntRange || 0;
    this.lastAbility = 0;
    this.attackRange = 40;
    this.lastAttack = 0;
    this.attackCooldown = 1000;
    this.followDist = 60 + Math.random() * 20;
  }

  update(dt, owner, enemies, bosses) {
    if (!this.alive) return null;
    const ownerX = owner.x;
    const ownerY = owner.y;

    const dx = ownerX - this.x;
    const dy = ownerY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.followDist + 20) {
      const angle = Math.atan2(dy, dx);
      this.x += Math.cos(angle) * this.speed * (dt / 16);
      this.y += Math.sin(angle) * this.speed * (dt / 16);
    } else if (dist < this.followDist - 20) {
      const angle = Math.atan2(-dy, -dx);
      this.x += Math.cos(angle) * this.speed * 0.3 * (dt / 16);
      this.y += Math.sin(angle) * this.speed * 0.3 * (dt / 16);
    }

    let closestEnemy = null;
    let closestDist = 300;
    for (const e of [...enemies, ...bosses]) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < closestDist) {
        closestDist = d;
        closestEnemy = e;
      }
    }

    const result = {};

    if (closestEnemy && closestDist < this.attackRange + closestEnemy.size) {
      if (Date.now() - this.lastAttack > this.attackCooldown) {
        this.lastAttack = Date.now();
        result.attack = { enemyId: closestEnemy.id, damage: this.damage };
      }
    }

    if (Date.now() - this.lastAbility > this.abilityCooldown) {
      this.lastAbility = Date.now();
      if (this.ability === 'heal' && owner.hp < owner.maxHp) {
        result.heal = { amount: this.healAmount };
      } else if (this.ability === 'fireBreath' && closestEnemy) {
        result.abilityAttack = { enemyId: closestEnemy.id, damage: this.abilityDamage };
      } else if (this.ability === 'taunt' && closestEnemy) {
        result.taunt = { enemyId: closestEnemy.id };
      }
    }

    return Object.keys(result).length ? result : null;
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
      auraColor: this.auraColor,
      level: this.level,
      alive: this.alive,
    };
  }
}

module.exports = { Companion, COMPANION_TYPES };
