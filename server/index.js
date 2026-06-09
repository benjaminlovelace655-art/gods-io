const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const Game = require('./game');

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';

  const filePath = path.join(CLIENT_DIR, url);

  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }

  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const game = new Game();
game.wss = wss;

let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  const dt = Math.min(50, now - lastTime);
  lastTime = now;
  game.update(dt);
  broadcastState();
}

function broadcastState() {
  for (const ws of wss.clients) {
    if (ws.readyState !== 1 || !ws.playerId) continue;
    try {
      const state = game.getState(ws.playerId);
      ws.send(JSON.stringify(state));
    } catch {}
  }
}

wss.on('connection', (ws) => {
  const playerId = uuidv4();
  ws.playerId = playerId;
  let authenticated = false;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'join': {
          const name = (msg.name || 'Player').substring(0, 20).replace(/[<>]/g, '');
          const player = game.addPlayer(playerId, name);
          authenticated = true;
          ws.send(JSON.stringify({ type: 'init', playerId, player: player.serialize() }));
          break;
        }
        case 'input': {
          if (!authenticated) return;
          game.handleInput(playerId, msg.input);
          break;
        }
        case 'attack': {
          if (!authenticated) return;
          game.handleAttack(playerId, msg.attackType, msg.targetX, msg.targetY);
          break;
        }
        case 'summon': {
          if (!authenticated) return;
          game.handleSummon(playerId, msg.companionType);
          break;
        }
        case 'chat': {
          if (!authenticated) return;
          game.handleChat(playerId, msg.message);
          break;
        }
        case 'changePower': {
          if (!authenticated) return;
          game.handlePowerChange(playerId, msg.power);
          break;
        }
      }
    } catch {}
  });

  ws.on('close', () => {
    game.removePlayer(playerId);
  });

  ws.on('error', () => {
    game.removePlayer(playerId);
  });
});

setInterval(gameLoop, 50);

server.listen(PORT, () => {
  console.log(`Gods.io server running on http://localhost:${PORT}`);
});
