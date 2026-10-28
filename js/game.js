// Main Game Engine for 寶島風情畫 第一關
import { LEVEL_DATA } from './levelData.js';
import { sounds } from './audio.js';
import {
  TILE_SIZE,
  checkAABB,
  Player,
  Bullet,
  EnemyX,
  SneakEnemyS,
  Turret,
  FallingTrap,
  Boss,
  DropItem,
  Particle,
  FloatingText
} from './entities.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.viewW = 800;
    this.viewH = 480;

    // Fixed internal resolution
    this.canvas.width = this.viewW;
    this.canvas.height = this.viewH;

    this.worldCols = LEVEL_DATA.cols; // 99
    this.worldRows = LEVEL_DATA.rows; // 8
    this.worldWidth = this.worldCols * TILE_SIZE; // 5940 px
    this.worldHeight = this.worldRows * TILE_SIZE; // 480 px

    this.state = 'TITLE'; // TITLE, PLAYING, PAUSED, GAMEOVER, VICTORY
    this.cameraX = 0;
    this.scrollSpeed = 50; // px/sec
    this.cameraLocked = false;
    this.bossWarnTimer = 0;
    this.bossActive = false;

    // Inputs
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      shoot: false,
      bomb: false
    };

    // Game stats
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('baodao_hi_score') || '0', 10);
    this.enemiesDefeated = 0;
    this.screenShake = 0;

    // Parallax Stars
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * this.viewW,
        y: Math.random() * (this.viewH * 0.7),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 15 + 5,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    // Background: Taipei Aerial Photo
    this.bgImage = new Image();
    this.bgImage.src = 'assets/taipei_skyline.jpg';
    this.bgLoaded = false;
    this.bgImage.onload = () => {
      this.bgLoaded = true;
    };

    this.setupInputs();
    this.initLevel();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  initLevel() {
    // Reset terrain grid
    this.terrainGrid = Array.from({ length: this.worldRows }, () =>
      Array(this.worldCols).fill(false)
    );
    for (const t of LEVEL_DATA.terrain) {
      if (t.r < this.worldRows && t.c < this.worldCols) {
        this.terrainGrid[t.r][t.c] = true;
      }
    }

    // Spawn entities
    const startR = LEVEL_DATA.playerStart.r;
    const startC = LEVEL_DATA.playerStart.c;
    this.player = new Player(startC * TILE_SIZE + 10, startR * TILE_SIZE + 15);

    this.enemiesX = LEVEL_DATA.enemiesX.map(e => new EnemyX(e.r, e.c));
    this.enemiesS = LEVEL_DATA.enemiesS.map(e => new SneakEnemyS(e.r, e.c));
    this.turrets = LEVEL_DATA.turrets.map(t => new Turret(t.r, t.c));
    this.traps = LEVEL_DATA.traps.map(tr => new FallingTrap(tr.r, tr.c));

    this.boss = new Boss(LEVEL_DATA.boss.r, LEVEL_DATA.boss.c);

    this.bullets = [];
    this.particles = [];
    this.items = [];
    this.floatingTexts = [];

    this.cameraX = 0;
    this.cameraLocked = false;
    this.bossWarnTimer = 0;
    this.bossActive = false;
    this.screenShake = 0;
    this.stageIntroTimer = 3.5;
  }

  startNewGame() {
    sounds.ensureContext();
    sounds.startBgm();
    this.score = 0;
    this.enemiesDefeated = 0;
    this.initLevel();
    this.state = 'PLAYING';
    this.stageIntroTimer = 3.5;
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      sounds.ensureContext();
      if (e.repeat) return;

      const code = e.code;
      if (code === 'ArrowUp' || code === 'KeyW') this.input.up = true;
      if (code === 'ArrowDown' || code === 'KeyS') this.input.down = true;
      if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = true;
      if (code === 'ArrowRight' || code === 'KeyD') this.input.right = true;
      if (code === 'Space' || code === 'KeyJ' || code === 'KeyZ') this.input.shoot = true;
      if (code === 'KeyK' || code === 'KeyX' || code === 'KeyB') this.triggerBomb();

      if (code === 'KeyP') {
        if (this.state === 'PLAYING') this.state = 'PAUSED';
        else if (this.state === 'PAUSED') this.state = 'PLAYING';
      }

      if (code === 'KeyM') {
        sounds.toggleMute();
      }

      if (code === 'KeyR' && (this.state === 'GAMEOVER' || this.state === 'VICTORY')) {
        this.startNewGame();
      }

      if ((code === 'Enter' || code === 'Space') && this.state === 'TITLE') {
        this.startNewGame();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'ArrowUp' || code === 'KeyW') this.input.up = false;
      if (code === 'ArrowDown' || code === 'KeyS') this.input.down = false;
      if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = false;
      if (code === 'ArrowRight' || code === 'KeyD') this.input.right = false;
      if (code === 'Space' || code === 'KeyJ' || code === 'KeyZ') this.input.shoot = false;
    });

    // Mobile / Touch controls binding
    const bindBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (ev) => {
        ev.preventDefault();
        sounds.ensureContext();
        onDown();
      };
      const end = (ev) => {
        ev.preventDefault();
        if (onUp) onUp();
      };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
    };

    bindBtn('btn-up', () => this.input.up = true, () => this.input.up = false);
    bindBtn('btn-down', () => this.input.down = true, () => this.input.down = false);
    bindBtn('btn-left', () => this.input.left = true, () => this.input.left = false);
    bindBtn('btn-right', () => this.input.right = true, () => this.input.right = false);
    bindBtn('btn-fire', () => this.input.shoot = true, () => this.input.shoot = false);
    bindBtn('btn-bomb', () => this.triggerBomb());

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.state === 'TITLE' || this.state === 'GAMEOVER' || this.state === 'VICTORY') {
          this.startNewGame();
        }
      });
    }

    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        sounds.ensureContext();
        const isMuted = sounds.toggleMute();
        soundBtn.textContent = isMuted ? '🔇 靜音' : '🔊 音效';
      });
    }
  }

  triggerBomb() {
    if (this.state !== 'PLAYING' || !this.player.alive) return;
    if (this.player.bombs <= 0) return;

    this.player.bombs--;
    sounds.playBomb();
    this.screenShake = 18;

    // Clear all enemy bullets and convert to score sparks
    for (const b of this.bullets) {
      if (b.isEnemy && b.alive) {
        b.alive = false;
        this.score += 50;
        this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#00f2fe', 3.5, 0.3));
      }
    }

    // Damage all visible enemies
    const allEnemies = [...this.enemiesX, ...this.enemiesS, ...this.turrets];
    for (const e of allEnemies) {
      if (e.alive && e.x >= this.cameraX - 50 && e.x <= this.cameraX + this.viewW + 50) {
        if (e.takeDamage(5, this.particles)) {
          this.score += e.scoreValue;
          this.enemiesDefeated++;
        }
      }
    }

    // Damage Boss if active
    if (this.boss.alive && this.boss.active) {
      this.boss.takeDamage(15, this.particles);
    }
  }

  spawnDrop(x, y) {
    if (Math.random() < 0.28) {
      const types = ['P', 'P', 'S', 'B', 'H'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      this.items.push(new DropItem(x, y, chosen));
    }
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Screen Shake Decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 30);
    }

    // Auto-scroll Camera
    const bossStopX = (LEVEL_DATA.boss.c - 10) * TILE_SIZE; // Stop at ~4800px before boss
    if (!this.cameraLocked) {
      this.cameraX += this.scrollSpeed * dt;
      if (this.cameraX >= bossStopX) {
        this.cameraX = bossStopX;
        this.cameraLocked = true;
        this.bossWarnTimer = 3.0; // 3-second boss approach warning
      }
    }

    // Boss Warning & Trigger
    if (this.cameraLocked && !this.bossActive) {
      this.bossWarnTimer -= dt;
      if (Math.floor(this.bossWarnTimer * 4) % 2 === 0) {
        // Warning sound beep
      }
      if (this.bossWarnTimer <= 0) {
        this.bossActive = true;
        this.boss.activate(this.cameraX);
      }
    }

    if (this.stageIntroTimer > 0) {
      this.stageIntroTimer -= dt;
    }

    // All active enemies list for collision and targeting
    const activeEnemies = [
      ...this.enemiesX.filter(e => e.alive),
      ...this.enemiesS.filter(e => e.alive && e.state === 'RUSHING'),
      ...this.turrets.filter(e => e.alive)
    ];
    if (this.boss.alive && this.boss.active && !this.boss.dying) {
      activeEnemies.push(this.boss);
    }

    // Update Player
    this.player.update(dt, this.input, this.cameraX, this.viewW, this.viewH, this.particles, this.bullets, activeEnemies);

    // Player Terrain Collision (e blocks)
    this.checkPlayerTerrainCollision();

    // Check if player died
    if (!this.player.alive) {
      this.state = 'GAMEOVER';
      sounds.stopBgm();
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('baodao_hi_score', this.highScore.toString());
      }
      return;
    }

    // Update Bullets
    for (const b of this.bullets) {
      b.update(dt, this.particles);

      // Despawn bullets out of bounds
      if (b.x < this.cameraX - 100 || b.x > this.cameraX + this.viewW + 100 || b.y < -50 || b.y > this.viewH + 50) {
        b.alive = false;
        continue;
      }

      // Bullets hitting terrain (e blocks)
      const tileCol = Math.floor(b.x / TILE_SIZE);
      const tileRow = Math.floor(b.y / TILE_SIZE);
      if (tileRow >= 0 && tileRow < this.worldRows && tileCol >= 0 && tileCol < this.worldCols) {
        if (this.terrainGrid[tileRow][tileCol]) {
          b.alive = false;
          // Spark
          for (let i = 0; i < 4; i++) {
            this.particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, '#fbc531', 2, 0.15));
          }
          continue;
        }
      }

      // Player Bullets hitting enemies
      if (!b.isEnemy && b.alive) {
        for (const e of activeEnemies) {
          const eBox = { x: e.x, y: e.y, w: e.w, h: e.h };
          const bBox = { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h };
          if (checkAABB(bBox, eBox)) {
            b.alive = false;
            if (e.takeDamage(b.damage, this.particles)) {
              this.score += e.scoreValue;
              this.enemiesDefeated++;
              this.floatingTexts.push(new FloatingText(e.x + e.w / 2, e.y, `+${e.scoreValue}`, '#fbc531'));
              this.spawnDrop(e.x + e.w / 2, e.y + e.h / 2);
            }
            break;
          }
        }
      }

      // Enemy Bullets hitting Player
      if (b.isEnemy && b.alive) {
        const bBox = { x: b.x - 4, y: b.y - 4, w: 8, h: 8 };
        if (checkAABB(bBox, this.player.getHitbox())) {
          b.alive = false;
          this.player.takeDamage(b.damage, this.particles);
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.alive);

    // Update Enemies X
    for (const ex of this.enemiesX) {
      ex.update(dt, this.cameraX, this.player, this.bullets, this.particles);
      if (ex.alive && checkAABB(this.player.getHitbox(), { x: ex.x, y: ex.y, w: ex.w, h: ex.h })) {
        this.player.takeDamage(1, this.particles);
        ex.takeDamage(2, this.particles);
      }
    }

    // Update Sneak Enemies S
    for (const es of this.enemiesS) {
      es.update(dt, this.cameraX, this.player, this.bullets, this.particles);
      if (es.alive && es.state === 'RUSHING' && checkAABB(this.player.getHitbox(), { x: es.x, y: es.y, w: es.w, h: es.h })) {
        this.player.takeDamage(1, this.particles);
        es.takeDamage(2, this.particles);
      }
    }

    // Update Turrets
    for (const tu of this.turrets) {
      tu.update(dt, this.cameraX, this.player, this.bullets, this.particles);
      if (tu.alive && checkAABB(this.player.getHitbox(), { x: tu.x, y: tu.y, w: tu.w, h: tu.h })) {
        this.player.takeDamage(1, this.particles);
      }
    }

    // Update Traps
    for (const tr of this.traps) {
      tr.update(dt, this.cameraX, this.player, this.terrainGrid, this.particles);
    }

    // Update Boss
    this.boss.update(dt, this.cameraX, this.player, this.bullets, this.particles, () => {
      // Boss Defeated callback
      this.score += this.boss.scoreValue;
      this.score += this.player.lives * 1000;
      this.score += this.player.bombs * 500;
      this.floatingTexts.push(new FloatingText(this.boss.x + this.boss.w / 2, this.boss.y + 40, `+${this.boss.scoreValue} BOSS CLEARED!`, '#fbc531', 18));
      this.state = 'VICTORY';
      sounds.stopBgm();
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('baodao_hi_score', this.highScore.toString());
      }
    });

    // Update Drop Items
    for (const item of this.items) {
      item.update(dt);
      if (checkAABB(this.player.getHitbox(), { x: item.x, y: item.y, w: item.w, h: item.h })) {
        item.alive = false;
        sounds.playPowerup();
        if (item.type === 'P') {
          this.player.weaponLevel = Math.min(this.player.maxWeaponLevel, this.player.weaponLevel + 1);
          this.score += 500;
          this.floatingTexts.push(new FloatingText(item.x, item.y, 'WEAPON UP!', '#ffbe76', 15));
        } else if (item.type === 'S') {
          this.player.speed = Math.min(360, this.player.speed + 30);
          this.score += 200;
          this.floatingTexts.push(new FloatingText(item.x, item.y, 'SPEED UP!', '#22a6b3', 15));
        } else if (item.type === 'B') {
          this.player.bombs = Math.min(4, this.player.bombs + 1);
          this.score += 300;
          this.floatingTexts.push(new FloatingText(item.x, item.y, 'BOMB +1', '#eb4d4b', 15));
        } else if (item.type === 'H') {
          this.player.shield = Math.min(this.player.maxShield, this.player.shield + 1);
          this.score += 300;
          this.floatingTexts.push(new FloatingText(item.x, item.y, 'SHIELD +1', '#6ab04c', 15));
        }
        for (let i = 0; i < 12; i++) {
          this.particles.push(new Particle(item.x + 12, item.y + 12, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, '#e056fd', 3, 0.3));
        }
      }
      if (item.x < this.cameraX - 50) item.alive = false;
    }
    this.items = this.items.filter(i => i.alive);

    // Update Floating Texts
    this.floatingTexts = this.floatingTexts.filter(ft => ft.update(dt));

    // Update Particles
    this.particles = this.particles.filter(p => p.update(dt));

    // Update Stars
    for (const s of this.stars) {
      s.x -= s.speed * dt;
      if (s.x < 0) s.x = this.viewW;
    }
  }

  checkPlayerTerrainCollision() {
    const hb = this.player.getHitbox();
    const minCol = Math.floor(hb.x / TILE_SIZE);
    const maxCol = Math.floor((hb.x + hb.w) / TILE_SIZE);
    const minRow = Math.floor(hb.y / TILE_SIZE);
    const maxRow = Math.floor((hb.y + hb.h) / TILE_SIZE);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r >= 0 && r < this.worldRows && c >= 0 && c < this.worldCols) {
          if (this.terrainGrid[r][c]) {
            const tileBox = { x: c * TILE_SIZE, y: r * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
            if (checkAABB(hb, tileBox)) {
              // Calculate penetration on all 4 sides
              const overlapLeft = (hb.x + hb.w) - tileBox.x;
              const overlapRight = (tileBox.x + tileBox.w) - hb.x;
              const overlapTop = (hb.y + hb.h) - tileBox.y;
              const overlapBottom = (tileBox.y + tileBox.h) - hb.y;
              const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

              if (minOverlap === overlapLeft) {
                this.player.x -= overlapLeft;
              } else if (minOverlap === overlapRight) {
                this.player.x += overlapRight;
              } else if (minOverlap === overlapTop) {
                this.player.y -= overlapTop;
              } else {
                this.player.y += overlapBottom;
              }

              this.player.takeDamage(1, this.particles);
              this.screenShake = 6;
              return;
            }
          }
        }
      }
    }

    // Check if player is crushed against left screen edge by camera
    if (this.player.x < this.cameraX) {
      this.player.x = this.cameraX;
      this.player.takeDamage(1, this.particles);
    }
  }

  draw() {
    this.ctx.save();

    // Screen Shake
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    // 1. Draw Parallax Background (Taiwan Sky & Central Mountain Range Silhouette)
    this.drawBackground();

    // 2. Draw Stage Terrain (e blocks)
    this.drawTerrain();

    // 3. Draw Traps
    for (const tr of this.traps) tr.draw(this.ctx, this.cameraX);

    // 4. Draw Turrets
    for (const tu of this.turrets) tu.draw(this.ctx, this.cameraX);

    // 5. Draw Enemies X & S
    for (const ex of this.enemiesX) ex.draw(this.ctx, this.cameraX);
    for (const es of this.enemiesS) es.draw(this.ctx, this.cameraX);

    // 6. Draw Boss
    this.boss.draw(this.ctx, this.cameraX);

    // 7. Draw Drop Items
    for (const item of this.items) item.draw(this.ctx, this.cameraX);

    // 8. Draw Bullets
    for (const b of this.bullets) b.draw(this.ctx, this.cameraX);

    // 9. Draw Player
    this.player.draw(this.ctx, this.cameraX);

    // 10. Draw Particles
    for (const p of this.particles) p.draw(this.ctx, this.cameraX);

    // 11. Draw Floating Texts
    for (const ft of this.floatingTexts) ft.draw(this.ctx, this.cameraX);

    // 12. Overlays (Boss warning, HUD, States)
    this.drawOverlays();

    this.ctx.restore();
  }

  drawBackground() {
    if (this.bgLoaded) {
      // 1. Scrolling Taipei Aerial Photo (台北空拍照)
      const scrollSpeed = 0.20; // Smooth distant parallax speed
      const imgH = this.bgImage.height;
      const imgW = this.bgImage.width;
      const scaledH = this.viewH;
      const scaledW = (imgW / imgH) * scaledH;
      const offset = (this.cameraX * scrollSpeed) % scaledW;

      for (let x = -offset; x < this.viewW + scaledW; x += scaledW) {
        this.ctx.drawImage(this.bgImage, x, 0, scaledW, scaledH);
      }

      // Atmospheric arcade tint overlay (ensures retro bullets & sprites pop with contrast)
      const tint = this.ctx.createLinearGradient(0, 0, 0, this.viewH);
      tint.addColorStop(0, 'rgba(8, 12, 32, 0.42)');
      tint.addColorStop(0.65, 'rgba(12, 10, 28, 0.25)');
      tint.addColorStop(1, 'rgba(10, 15, 35, 0.45)');
      this.ctx.fillStyle = tint;
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);

      // Subtle twinkling stars in the upper sky
      this.ctx.save();
      for (const s of this.stars) {
        if (s.y < 180) {
          this.ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.7})`;
          this.ctx.fillRect(s.x, s.y, s.size, s.size);
        }
      }
      this.ctx.restore();
    } else {
      // Fallback procedural sky gradient
      const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.viewH);
      skyGrad.addColorStop(0, '#0a0a28');
      skyGrad.addColorStop(0.55, '#1b1b4f');
      skyGrad.addColorStop(0.85, '#481d58');
      skyGrad.addColorStop(1, '#8b2958');
      this.ctx.fillStyle = skyGrad;
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);

      this.drawMountainLayer(0.12, '#120f38', 210, 80);
      this.drawMountainLayer(0.24, '#1e144a', 260, 60);
      this.drawMountainLayer(0.40, '#2d1854', 320, 45);
    }
  }

  drawMountainLayer(speed, color, baseY, heightAmp) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.viewH);

    const step = 40;
    const offset = this.cameraX * speed;
    for (let x = 0; x <= this.viewW + step; x += step) {
      const worldX = x + offset;
      const y = baseY + Math.sin(worldX * 0.006) * heightAmp + Math.cos(worldX * 0.015) * (heightAmp * 0.4);
      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(this.viewW, this.viewH);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  drawTerrain() {
    // Render only visible columns in the viewport
    const startCol = Math.max(0, Math.floor((this.cameraX - TILE_SIZE) / TILE_SIZE));
    const endCol = Math.min(this.worldCols - 1, Math.ceil((this.cameraX + this.viewW + TILE_SIZE) / TILE_SIZE));

    for (let r = 0; r < this.worldRows; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (this.terrainGrid[r][c]) {
          const sx = c * TILE_SIZE - this.cameraX;
          const sy = r * TILE_SIZE;

          // Stylized Sci-Fi Cyber Fortress Rock Blocks
          this.ctx.save();
          this.ctx.fillStyle = '#222f3e';
          this.ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

          // Inner bevel
          this.ctx.fillStyle = '#2e3d49';
          this.ctx.fillRect(sx + 3, sy + 3, TILE_SIZE - 6, TILE_SIZE - 6);

          // Neon Grid Circuit Lines
          this.ctx.strokeStyle = '#00d2d3';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(sx + 8, sy + 8);
          this.ctx.lineTo(sx + TILE_SIZE - 8, sy + 8);
          this.ctx.lineTo(sx + TILE_SIZE - 8, sy + TILE_SIZE - 8);
          this.ctx.stroke();

          // Border edge
          this.ctx.strokeStyle = '#10ac84';
          this.ctx.lineWidth = 1.5;
          this.ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);

          this.ctx.restore();
        }
      }
    }
  }

  drawOverlays() {
    // HUD Bar at top
    this.drawHUD();

    // Stage Intro Banner
    if (this.state === 'PLAYING' && this.stageIntroTimer > 0) {
      this.ctx.save();
      const alpha = Math.min(1, this.stageIntroTimer / 1.0);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.ctx.fillRect(0, this.viewH / 2 - 40, this.viewW, 80);

      this.ctx.fillStyle = '#00f2fe';
      this.ctx.shadowColor = '#00f2fe';
      this.ctx.shadowBlur = 10;
      this.ctx.font = 'bold 22px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('第一關：寶島風情畫 (LEVEL 1)', this.viewW / 2, this.viewH / 2 - 6);

      this.ctx.fillStyle = '#fbc531';
      this.ctx.font = '13px monospace';
      this.ctx.fillText('STAGE 1: TAIPEI OVERFLIGHT', this.viewW / 2, this.viewH / 2 + 20);
      this.ctx.restore();
    }

    // Boss Warning Banner
    if (this.cameraLocked && !this.bossActive && this.bossWarnTimer > 0) {
      this.ctx.save();
      const flash = Math.floor(Date.now() / 150) % 2 === 0;
      this.ctx.fillStyle = flash ? 'rgba(235, 77, 75, 0.45)' : 'rgba(0, 0, 0, 0.45)';
      this.ctx.fillRect(0, this.viewH / 2 - 45, this.viewW, 90);

      this.ctx.fillStyle = '#ff4757';
      this.ctx.shadowColor = '#ff4757';
      this.ctx.shadowBlur = 12;
      this.ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚠ 警報！超巨大珍珠奶茶來襲 ⚠', this.viewW / 2, this.viewH / 2 - 8);

      this.ctx.font = '14px monospace';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText('WARNING: GIANT BOBA APPROACHING', this.viewW / 2, this.viewH / 2 + 24);
      this.ctx.restore();
    }

    // Boss Health Bar
    if (this.boss.alive && this.boss.active) {
      this.ctx.save();
      const barW = 380;
      const barH = 14;
      const barX = (this.viewW - barW) / 2;
      const barY = 40;

      // Label
      this.ctx.fillStyle = '#ff9f43';
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('BOSS: 巨型珍珠奶茶魔王 - 寶島波霸號 (GIANT BOBA)', this.viewW / 2, barY - 6);

      // Frame
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

      // Fill (Caramel Boba Gradient)
      const ratio = Math.max(0, this.boss.hp / this.boss.maxHp);
      const grad = this.ctx.createLinearGradient(barX, barY, barX + barW, barY);
      grad.addColorStop(0, '#ff4757');
      grad.addColorStop(0.5, '#ffa502');
      grad.addColorStop(1, '#ffbe76');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(barX, barY, barW * ratio, barH);
      this.ctx.restore();
    }

    // TITLE SCREEN
    if (this.state === 'TITLE') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);

      this.ctx.fillStyle = '#00f2fe';
      this.ctx.shadowColor = '#4facfe';
      this.ctx.shadowBlur = 18;
      this.ctx.font = 'bold 36px "Press Start 2P", monospace, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('寶島風情畫', this.viewW / 2, 140);

      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = '#fbc531';
      this.ctx.font = '16px monospace';
      this.ctx.fillText('第一關：台北上空 (LEVEL 1)', this.viewW / 2, 185);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '14px monospace';
      this.ctx.fillText('【 操作方式 】', this.viewW / 2, 240);
      this.ctx.fillText('方向鍵 / WASD : 移動戰機', this.viewW / 2, 270);
      this.ctx.fillText('Space / J : 發射武器 (按住連發)', this.viewW / 2, 295);
      this.ctx.fillText('K / X : 釋放全螢幕炸彈 (BOMB)', this.viewW / 2, 320);
      this.ctx.fillText('P : 暫停 | M : 音效開關', this.viewW / 2, 345);

      const blink = Math.floor(Date.now() / 400) % 2 === 0;
      if (blink) {
        this.ctx.fillStyle = '#00d2d3';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.fillText('▶ 按 空白鍵 或 點擊開始遊戲 ◀', this.viewW / 2, 410);
      }
      this.ctx.restore();
    }

    // PAUSED SCREEN
    if (this.state === 'PAUSED') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);

      this.ctx.fillStyle = '#fbc531';
      this.ctx.font = 'bold 28px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⏸ 遊戲暫停 (PAUSED)', this.viewW / 2, this.viewH / 2);
      this.ctx.font = '16px monospace';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText('按 P 鍵繼續作戰', this.viewW / 2, this.viewH / 2 + 40);
      this.ctx.restore();
    }

    // GAMEOVER SCREEN
    if (this.state === 'GAMEOVER') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(30, 0, 0, 0.85)';
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);

      this.ctx.fillStyle = '#ff4757';
      this.ctx.shadowColor = '#ff4757';
      this.ctx.shadowBlur = 18;
      this.ctx.font = 'bold 36px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.viewW / 2, 150);

      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '16px monospace';
      this.ctx.fillText(`最終得分: ${this.score}`, this.viewW / 2, 220);
      this.ctx.fillText(`擊墜敵機: ${this.enemiesDefeated} 機`, this.viewW / 2, 255);
      this.ctx.fillText(`最高紀錄: ${this.highScore}`, this.viewW / 2, 290);

      const blink = Math.floor(Date.now() / 350) % 2 === 0;
      if (blink) {
        this.ctx.fillStyle = '#fbc531';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.fillText('按 R 鍵 或 點擊重新出擊', this.viewW / 2, 360);
      }
      this.ctx.restore();
    }

    // VICTORY SCREEN
    if (this.state === 'VICTORY') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(5, 25, 45, 0.88)';
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);

      this.ctx.fillStyle = '#fbc531';
      this.ctx.shadowColor = '#fbc531';
      this.ctx.shadowBlur = 20;
      this.ctx.font = 'bold 34px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('★ 第一關 突破成功！★', this.viewW / 2, 130);

      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#00d2d3';
      this.ctx.font = '16px monospace';
      this.ctx.fillText('STAGE 1 CLEAR - MISSION COMPLETE', this.viewW / 2, 175);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '16px monospace';
      this.ctx.fillText(`作戰得分: ${this.score}`, this.viewW / 2, 230);
      this.ctx.fillText(`擊墜敵機: ${this.enemiesDefeated} 架`, this.viewW / 2, 265);
      this.ctx.fillText(`剩餘戰機獎勵: +${this.player.lives * 1000} PTS`, this.viewW / 2, 300);

      const blink = Math.floor(Date.now() / 350) % 2 === 0;
      if (blink) {
        this.ctx.fillStyle = '#fbc531';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.fillText('按 R 鍵 再次挑戰第一關', this.viewW / 2, 375);
      }
      this.ctx.restore();
    }
  }

  drawHUD() {
    this.ctx.save();
    // Top Bar Background
    this.ctx.fillStyle = 'rgba(15, 18, 30, 0.75)';
    this.ctx.fillRect(0, 0, this.viewW, 32);

    this.ctx.font = 'bold 13px monospace';
    this.ctx.textBaseline = 'middle';

    // 1. Score
    this.ctx.fillStyle = '#fbc531';
    this.ctx.fillText(`SCORE: ${this.score}`, 15, 16);

    // 2. High Score
    this.ctx.fillStyle = '#747d8c';
    this.ctx.fillText(`HI: ${Math.max(this.score, this.highScore)}`, 160, 16);

    // 3. Lives
    this.ctx.fillStyle = '#00d2d3';
    let livesStr = '✈ '.repeat(Math.max(0, this.player.lives));
    this.ctx.fillText(`LIVES: ${livesStr}`, 300, 16);

    // 4. Shield Gauge
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('SHIELD:', 440, 16);
    for (let i = 0; i < this.player.maxShield; i++) {
      this.ctx.fillStyle = i < this.player.shield ? '#00f2fe' : '#57606f';
      this.ctx.fillRect(505 + i * 14, 10, 10, 12);
    }

    // 5. Bombs
    this.ctx.fillStyle = '#ff4757';
    let bombStr = '💣'.repeat(this.player.bombs);
    this.ctx.fillText(`BOMB: ${bombStr}`, 570, 16);

    // 6. Weapon Level
    this.ctx.fillStyle = '#ffa502';
    this.ctx.fillText(`WEAPON: LV${this.player.weaponLevel}`, 685, 16);

    this.ctx.restore();
  }

  loop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
