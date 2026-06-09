const ABILITIES = {
  fire: {
    name: 'Fire',
    color: '#ff4400',
    primary: { name: 'Fireball', damage: 25, cooldown: 800, range: 300, speed: 8, size: 8, cost: 5 },
    secondary: { name: 'Inferno', damage: 10, cooldown: 4000, range: 150, size: 60, duration: 2000, cost: 20 },
    ultimate: { name: 'Meteor Storm', damage: 60, cooldown: 25000, range: 400, size: 100, cost: 50 },
  },
  ice: {
    name: 'Ice',
    color: '#00ccff',
    primary: { name: 'Frost Bolt', damage: 20, cooldown: 700, range: 320, speed: 7, size: 7, slow: 0.4, cost: 5 },
    secondary: { name: 'Blizzard', damage: 8, cooldown: 5000, range: 180, size: 70, duration: 2500, slow: 0.6, cost: 20 },
    ultimate: { name: 'Absolute Zero', damage: 50, cooldown: 28000, range: 350, size: 90, freeze: 2000, cost: 50 },
  },
  lightning: {
    name: 'Lightning',
    color: '#ffdd00',
    primary: { name: 'Chain Bolt', damage: 22, cooldown: 600, range: 280, speed: 10, size: 5, chain: 2, cost: 5 },
    secondary: { name: 'Thunderstorm', damage: 15, cooldown: 4500, range: 200, size: 80, duration: 1500, stun: 800, cost: 20 },
    ultimate: { name: 'Divine Wrath', damage: 70, cooldown: 30000, range: 500, size: 60, chain: 5, cost: 50 },
  },
  wind: {
    name: 'Wind',
    color: '#88ff88',
    primary: { name: 'Gust', damage: 15, cooldown: 500, range: 250, speed: 9, size: 10, knockback: 100, cost: 4 },
    secondary: { name: 'Tornado', damage: 12, cooldown: 3500, range: 200, size: 50, duration: 2000, pull: true, cost: 15 },
    ultimate: { name: 'Storm Eye', damage: 40, cooldown: 22000, range: 300, size: 120, duration: 3000, cost: 45 },
  },
  void: {
    name: 'Void',
    color: '#aa44ff',
    primary: { name: 'Void Orb', damage: 30, cooldown: 900, range: 300, speed: 6, size: 9, pierce: true, cost: 8 },
    secondary: { name: 'Null Field', damage: 5, cooldown: 6000, range: 150, size: 65, duration: 3000, silence: true, cost: 25 },
    ultimate: { name: 'Reality Tear', damage: 80, cooldown: 35000, range: 400, size: 80, cost: 60 },
  },
};

function createProjectile(owner, ability, targetX, targetY, isSecondary, isUltimate) {
  const skill = isUltimate ? ability.ultimate : isSecondary ? ability.secondary : ability.primary;
  const dx = targetX - owner.x;
  const dy = targetY - owner.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    id: `${owner.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ownerId: owner.id,
    x: owner.x,
    y: owner.y,
    dx: (dx / dist) * skill.speed,
    dy: (dy / dist) * skill.speed,
    damage: skill.damage,
    size: skill.size,
    range: skill.range,
    color: ability.color,
    type: isUltimate ? 'ultimate' : isSecondary ? 'secondary' : 'primary',
    power: isUltimate ? 'ultimate' : isSecondary ? 'secondary' : 'primary',
    startX: owner.x,
    startY: owner.y,
    traveled: 0,
    slow: skill.slow || 0,
    stun: skill.stun || 0,
    knockback: skill.knockback || 0,
    chain: skill.chain || 0,
    pierce: skill.pierce || false,
    duration: skill.duration || 0,
    pull: skill.pull || false,
    freeze: skill.freeze || 0,
    silence: skill.silence || false,
    hit: new Set(),
  };
}

function createAoE(owner, ability, isSecondary, isUltimate) {
  const skill = isUltimate ? ability.ultimate : isSecondary ? ability.secondary : ability.primary;
  return {
    id: `${owner.id}-aoe-${Date.now()}`,
    ownerId: owner.id,
    x: owner.x,
    y: owner.y,
    damage: skill.damage,
    size: skill.size,
    color: ability.color,
    duration: skill.duration,
    startTime: Date.now(),
    slow: skill.slow || 0,
    stun: skill.stun || 0,
    pull: skill.pull || false,
    freeze: skill.freeze || 0,
    silence: skill.silence || false,
    hit: new Set(),
  };
}

module.exports = { ABILITIES, createProjectile, createAoE };
