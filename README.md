# Gods.io

Top-down pixel-art multiplayer .io game.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Deploy

### Frontend (Vercel)
```bash
npm i -g vercel
vercel --prod
```

### Server (Railway or Render)
Set `NODE_ENV=production` and `PORT` env vars, run `npm start`.

## Controls

| Action | Key |
|--------|-----|
| Move | WASD |
| Aim | Mouse |
| Attack | Left Click / Space |
| Ability 1 | Q |
| Ability 2 | E |
| Ultimate | R |
| Summon Companion | F |
| Chat | Enter |

## Project Structure

```
client/           Frontend game client
  index.html      Main page
  css/style.css   Styling
  js/             Game logic
server/           WebSocket game server
  index.js        Server entry + WebSocket handler
  game.js         Game loop + world state
  player.js       Player entity
  enemy.js        Enemy AI
  abilities.js    Power abilities
  boss.js         Boss AI
  companion.js    Companion AI
  database.js     Persistence
```
