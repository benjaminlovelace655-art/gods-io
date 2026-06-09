class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0 };
    this.worldW = 4100;
    this.worldH = 4100;
    this.tileSize = 80;
    this.particles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
  }

  clear(color = '#0a0a0a') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  follow(target) {
    this.camera.x = target.x - this.width / 2;
    this.camera.y = target.y - this.height / 2;
  }

  getWorldPos(screenX, screenY) {
    return {
      x: screenX + this.camera.x,
      y: screenY + this.camera.y,
    };
  }

  drawBiome(biome) {
    const ctx = this.ctx;

    const gridW = Math.ceil(this.worldW / this.tileSize);
    const gridH = Math.ceil(this.worldH / this.tileSize);
    const startCol = Math.max(0, Math.floor(this.camera.x / this.tileSize));
    const startRow = Math.max(0, Math.floor(this.camera.y / this.tileSize));
    const endCol = Math.min(gridW, startCol + Math.ceil(this.width / this.tileSize) + 2);
    const endRow = Math.min(gridH, startRow + Math.ceil(this.height / this.tileSize) + 2);

    const colors = {
      'Spawn': ['#1a2a1a', '#1f2f1f'],
      'Forest': ['#0d2a0d', '#0f250f'],
      'Desert': ['#2a2a15', '#252510'],
      'Ice Realm': ['#1a2a3a', '#152535'],
      'Sky Realm': ['#1a1a3a', '#151535'],
    };

    const [c1, c2] = colors[biome] || ['#1a1a1a', '#151515'];

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const x = c * this.tileSize - this.camera.x;
        const y = r * this.tileSize - this.camera.y;
        ctx.fillStyle = (c + r) % 2 === 0 ? c1 : c2;
        ctx.fillRect(Math.round(x), Math.round(y), this.tileSize, this.tileSize);
      }
    }

    this.drawTileDetails(startCol, startRow, endCol, endRow);
  }

  drawTileDetails(startCol, startRow, endCol, endRow) {
    const ctx = this.ctx;
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const x = c * this.tileSize - this.camera.x;
        const y = r * this.tileSize - this.camera.y;
        const hash = (c * 7 + r * 13) % 100;

        if (hash < 5) {
          ctx.fillStyle = 'rgba(255,255,255,0.02)';
          ctx.fillRect(x + 20, y + 20, 2, 2);
        }
        if (hash > 95 && hash < 98) {
          ctx.fillStyle = 'rgba(255,255,255,0.015)';
          ctx.fillRect(x + 50, y + 30, 3, 3);
        }
      }
    }
  }

  drawEntity(e, camera) {
    const ctx = this.ctx;
    const sx = e.x - camera.x;
    const sy = e.y - camera.y;

    if (sx < -100 || sx > this.width + 100 || sy < -100 || sy > this.height + 100) return;

    if (e.invincible && Math.floor(Date.now() / 100) % 2 === 0) return;

    const size = e.size || 20;

    ctx.save();
    ctx.translate(sx, sy);

    if (e.type === 'boss') {
      ctx.shadowColor = e.glowColor || e.color;
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = e.color || '#fff';
    ctx.fillRect(-size / 2, -size / 2, size, size);

    if (e.type === 'boss') {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = e.glowColor || e.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
    }

    if (e.angle !== undefined) {
      const len = size * 0.6;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(e.angle) * len, Math.sin(e.angle) * len);
      ctx.stroke();
    }

    if (e.auraColor) {
      ctx.strokeStyle = e.auraColor;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    if (e.hp !== undefined && e.maxHp !== undefined && e.hp < e.maxHp) {
      const barW = size + 6;
      const barH = 3;
      const barX = sx - barW / 2;
      const barY = sy - size / 2 - 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#44cc44' : e.hp / e.maxHp > 0.25 ? '#cccc44' : '#cc4444';
      ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
    }

    if (e.name) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name, sx, sy - size / 2 - 12);
    }
  }

  drawProjectile(p, camera) {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx < -20 || sx > this.width + 20 || sy < -20 || sy > this.height + 20) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = p.color || '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, p.size || 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawAoE(aoe, camera) {
    const sx = aoe.x - camera.x;
    const sy = aoe.y - camera.y;
    if (sx < -aoe.size || sx > this.width + aoe.size || sy < -aoe.size || sy > this.height + aoe.size) return;

    const ctx = this.ctx;
    const elapsed = Date.now() - aoe.startTime;
    const progress = elapsed / aoe.duration;
    if (progress > 1) return;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.globalAlpha = 0.3 * (1 - progress);
    ctx.fillStyle = aoe.color || '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, aoe.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.5 * (1 - progress);
    ctx.strokeStyle = aoe.color || '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, aoe.size * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawDamageNumber(x, y, amount, color = '#ff4444') {
    this.particles.push({
      x, y, vy: -2, life: 40, maxLife: 40,
      text: Math.round(amount).toString(),
      color,
    });
  }

  updateParticles() {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }

      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x - this.camera.x, p.y - this.camera.y);
      ctx.restore();
    }
  }
}
