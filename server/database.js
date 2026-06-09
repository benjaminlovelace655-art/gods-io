const fs = require('fs');

const DB_PATH = './data.json';

const defaults = {
  players: {},
  leaderboard: [],
};

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch {}
  return { ...defaults };
}

function save(state) {
  try {
    const dir = require('path').dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
  } catch {}
}

let db = load();

function getPlayer(id) {
  return db.players[id];
}

function savePlayer(id, data) {
  db.players[id] = { ...db.players[id], ...data, lastSeen: Date.now() };
  save(db);
}

function getLeaderboard() {
  return Object.values(db.players)
    .sort((a, b) => b.level - a.level || b.kills - a.kills)
    .slice(0, 100)
    .map(p => ({ name: p.name, level: p.level, kills: p.kills || 0 }));
}

function updateLeaderboard() {
  db.leaderboard = getLeaderboard();
  save(db);
}

module.exports = { getPlayer, savePlayer, getLeaderboard, updateLeaderboard };
