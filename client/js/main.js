const canvas = document.getElementById('gameCanvas');
const renderer = new Renderer(canvas);
const input = new InputManager(canvas);

let gameState = {
  playerId: null,
  player: null,
  players: [],
  enemies: [],
  bosses: [],
  projectiles: [],
  aoes: [],
  companions: [],
  biome: 'Spawn',
};

let lastSentInput = null;
let updateCounter = 0;
let connected = false;
function getServerUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('server')) return params.get('server');
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `ws://${host}:${window.location.port || 3000}`;
  }
  return `wss://gods-io-server.onrender.com`;
}

let serverUrl = getServerUrl();

const POWER_LIST = ['fire', 'ice', 'lightning', 'wind', 'void'];
let currentPowerIndex = 0;

ui.init();

function cyclePower(direction) {
  if (direction > 0) currentPowerIndex = (currentPowerIndex + 1) % POWER_LIST.length;
  else currentPowerIndex = (currentPowerIndex - 1 + POWER_LIST.length) % POWER_LIST.length;
  const power = POWER_LIST[currentPowerIndex];
  net.changePower(power);
  if (gameState.player) gameState.player.power = power;
}

input.onEnter = () => {
  if (ui.chatting) {
    const msg = ui.chatInput.value.trim();
    if (msg) net.chat(msg);
    ui.chatInput.value = '';
    ui.chatInputArea.style.display = 'none';
    ui.chatting = false;
  } else {
    ui.chatInputArea.style.display = 'block';
    ui.chatInput.focus();
    ui.chatting = true;
  }
};

input.onAbility = (type) => {
  if (!connected || !gameState.player?.alive) return;
  if (type === 'primary') {
    const worldPos = renderer.getWorldPos(input.mouseX, input.mouseY);
    net.attack('primary', worldPos.x, worldPos.y);
  }
};

input.onClick = () => {
  if (!connected || !gameState.player?.alive) return;
  const worldPos = renderer.getWorldPos(input.mouseX, input.mouseY);
  net.attack('primary', worldPos.x, worldPos.y);
};

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2 && connected && gameState.player?.alive) {
    const worldPos = renderer.getWorldPos(input.mouseX, input.mouseY);
    net.attack('secondary', worldPos.x, worldPos.y);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === '1') cyclePower(-1);
  if (e.key === '2') cyclePower(1);
  if (e.key === '3' && connected) net.summon('angelCat');
  if (e.key === '4' && connected) net.summon('dragonCat');
  if (e.key === '5' && connected) net.summon('titanCat');
});

ui.joinBtn.addEventListener('click', () => {
  const name = ui.nameInput.value.trim() || `God${Math.floor(Math.random() * 1000)}`;
  connect(name);
});

ui.nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') ui.joinBtn.click();
});

function connect(name) {
  ui.hideJoin();
  net.connect(serverUrl,
    () => {
      connected = true;
      net.join(name);
    },
    (data) => handleMessage(data),
    () => {
      connected = false;
      setTimeout(() => connect(name), 2000);
    }
  );
}

function handleMessage(data) {
  switch (data.type) {
    case 'init':
      gameState.playerId = data.playerId;
      gameState.player = data.player;
      const icon = ui.powerIcons[data.player.power] || '🔥';
      ui.powerDisplay.textContent = `${icon} ${data.player.power.charAt(0).toUpperCase() + data.player.power.slice(1)}`;
      break;

    case 'state':
      gameState.players = data.players || [];
      gameState.enemies = data.enemies || [];
      gameState.bosses = data.bosses || [];
      gameState.projectiles = data.projectiles || [];
      gameState.aoes = data.aoes || [];
      gameState.companions = data.companions || [];

      const myPlayer = gameState.players.find(p => p.id === gameState.playerId);
      if (myPlayer) gameState.player = myPlayer;

      if (data.biome) {
        gameState.biome = data.biome;
        ui.updateBiome(data.biome);
      }

      if (gameState.player && !gameState.player.alive) {
        ui.showDeath(5000);
      }

      ui.updatePlayerInfo(gameState.player);

      updateCounter = 0;
      break;

    case 'chat':
      ui.addChatMessage(data);
      break;

    case 'leaderboard':
      ui.updateLeaderboard(data.data || []);
      break;
  }
}

let lastMouseInput = 0;

function gameLoop() {
  const inputData = input.getInput();
  const worldPos = renderer.getWorldPos(input.mouseX, input.mouseY);
  inputData.targetX = worldPos.x;
  inputData.targetY = worldPos.y;

  const inputStr = JSON.stringify(inputData);
  if (connected && inputStr !== lastSentInput) {
    net.sendInput(inputData);
    lastSentInput = inputStr;
  }

  const player = gameState.player;
  if (player) {
    renderer.follow(player);
  }

  renderer.clear();
  renderer.drawBiome(gameState.biome);

  for (const e of gameState.enemies) {
    if (e.alive) renderer.drawEntity({ ...e, type: 'enemy' }, renderer.camera);
  }
  for (const b of gameState.bosses) {
    if (b.alive) renderer.drawEntity({ ...b, type: 'boss' }, renderer.camera);
  }
  for (const comp of gameState.companions) {
    if (comp.alive) renderer.drawEntity({ ...comp, type: 'companion', angle: 0 }, renderer.camera);
  }
  for (const p of gameState.projectiles) {
    renderer.drawProjectile(p, renderer.camera);
  }
  for (const aoe of gameState.aoes) {
    renderer.drawAoE(aoe, renderer.camera);
  }

  for (const p of gameState.players) {
    if (p.id === gameState.playerId) continue;
    renderer.drawEntity({ ...p, type: 'player' }, renderer.camera);
  }

  if (player) {
    renderer.drawEntity({ ...player, type: 'player' }, renderer.camera);
  }

  renderer.updateParticles();

  ui.drawMinimap(gameState.players, gameState.enemies, gameState.bosses, gameState.playerId);
}

function loop() {
  gameLoop();
  requestAnimationFrame(loop);
}

loop();

ui.showJoin();
