// Main Game Engine for 寶島風情畫 第一關與第二關
import { LEVEL_DATA, LEVELS, LEVEL_1_DATA, LEVEL_2_DATA } from './levelData.js';
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
  BobaBoss,
  IronEggBoss,
  createBoss,
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

    this.currentLevelIndex = 0; // 0 = Level 1 (Taipei), 1 = Level 2 (Tamsui)
    this.currentLevelData = LEVELS[this.currentLevelIndex];

    this.worldCols = this.currentLevelData.cols; // 99
    this.worldRows = this.currentLevelData.rows; // 8
    this.worldWidth = this.worldCols * TILE_SIZE; // 5940 px
    this.worldHeight = this.worldRows * TILE_SIZE; // 480 px

    this.state = 'TITLE'; // TITLE, PLAYING, PAUSED, STAGE_CLEAR, GAMEOVER, VICTORY
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

    // Background Photo per Level (每關一張專屬實景空照圖)
    this.stageBackgrounds = [
      'assets/taipei_101_panorama.jpg',      // 第一關：台北市遠景 (台北101與台北盆地全景)
      'assets/tamsui_guandu_sunset.jpg',     // 第二關：淡水的夕陽與關渡大橋
      'assets/hsinchu_science_park.jpg',     // 第三關：新竹科學園區 (晶圓科技廠空照景觀)
      'assets/taichung_greenway.jpg',        // 第四關：台中綠園道 (草悟道與市民廣場景觀)
      'assets/taoyuan_aerotropolis.jpg',     // 第五關：桃園航空城 (桃園國際機場與跑道景觀)
      'assets/new_taipei_christmas.jpg'      // 第六關：新北耶誕城 (市民廣場光雕夜景)
    ];
    this.bgImage = new Image();
    this.bgLoaded = false;
    this.loadStageBackground();

    this.setupInputs();
    this.initLevel(false);

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  initLevel(keepPlayerStats = false) {
    this.currentLevelData = LEVELS[this.currentLevelIndex];
    this.loadStageBackground();

    this.worldCols = this.currentLevelData.cols;
    this.worldRows = this.currentLevelData.rows;
    this.worldWidth = this.worldCols * TILE_SIZE;
    this.worldHeight = this.worldRows * TILE_SIZE;

    // Reset terrain grid
    this.terrainGrid = Array.from({ length: this.worldRows }, () =>
      Array(this.worldCols).fill(false)
    );
    for (const t of this.currentLevelData.terrain) {
      if (t.r < this.worldRows && t.c < this.worldCols) {
        this.terrainGrid[t.r][t.c] = true;
      }
    }

    // Spawn Player
    const startR = this.currentLevelData.playerStart.r;
    const startC = this.currentLevelData.playerStart.c;
    if (keepPlayerStats && this.player) {
      this.player.x = startC * TILE_SIZE + 10;
      this.player.y = startR * TILE_SIZE + 15;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.shield = this.player.maxShield;
      this.player.invulnerableTimer = 3.0;
    } else {
      this.player = new Player(startC * TILE_SIZE + 10, startR * TILE_SIZE + 15);
    }

    // Spawn entities
    this.enemiesX = this.currentLevelData.enemiesX.map(e => new EnemyX(e.r, e.c));
    this.enemiesS = this.currentLevelData.enemiesS.map(e => new SneakEnemyS(e.r, e.c));
    this.turrets = this.currentLevelData.turrets.map(t => new Turret(t.r, t.c));
    this.traps = this.currentLevelData.traps.map(tr => new FallingTrap(tr.r, tr.c));

    this.bosses = createBoss(this.currentLevelIndex, this.currentLevelData.boss.r, this.currentLevelData.boss.c);
    this.boss = this.bosses[0];

    this.bullets = [];
    this.particles = [];
    this.items = (this.currentLevelData.items || []).map(
      it => new DropItem(it.c * TILE_SIZE + 18, it.r * TILE_SIZE + 18, it.type, true)
    );
    this.floatingTexts = [];

    this.cameraX = 0;
    this.cameraLocked = false;
    this.bossWarnTimer = 0;
    this.bossActive = false;
    this.screenShake = 0;
    this.stageIntroTimer = 3.5;

    this.updateLevelUI();
  }

  updateLevelUI() {
    const lvlBtn = document.getElementById('lvl-toggle-btn');
    if (lvlBtn) {
      if (this.currentLevelIndex === 0) lvlBtn.textContent = '🗺️ 第一關：台北';
      else if (this.currentLevelIndex === 1) lvlBtn.textContent = '🗺️ 第二關：淡水';
      else if (this.currentLevelIndex === 2) lvlBtn.textContent = '🗺️ 第三關：新竹';
      else if (this.currentLevelIndex === 3) lvlBtn.textContent = '🗺️ 第四關：台中';
      else if (this.currentLevelIndex === 4) lvlBtn.textContent = '🗺️ 第五關：桃園';
      else lvlBtn.textContent = '🗺️ 第六關：新北';
    }
    const subtitle = document.querySelector('.subtitle');
    if (subtitle) {
      if (this.currentLevelIndex === 0) subtitle.textContent = 'STAGE 1: 台北空照 (LEVEL 1)';
      else if (this.currentLevelIndex === 1) subtitle.textContent = 'STAGE 2: 淡水夕照 (LEVEL 2)';
      else if (this.currentLevelIndex === 2) subtitle.textContent = 'STAGE 3: 新竹科園 (LEVEL 3)';
      else if (this.currentLevelIndex === 3) subtitle.textContent = 'STAGE 4: 台中綠園道 (LEVEL 4)';
      else if (this.currentLevelIndex === 4) subtitle.textContent = 'STAGE 5: 桃園航空城 (LEVEL 5)';
      else subtitle.textContent = 'STAGE 6: 新北耶誕城 (LEVEL 6)';
    }
  }

  loadStageBackground() {
    this.bgLoaded = false;
    this.bgImage.src = this.stageBackgrounds[this.currentLevelIndex];
    this.bgImage.onload = () => {
      this.bgLoaded = true;
    };
  }

  startNewGame() {
    sounds.ensureContext();
    sounds.startBgm();
    this.score = 0;
    this.enemiesDefeated = 0;
    this.initLevel(false);
    this.state = 'PLAYING';
    this.stageIntroTimer = 3.5;
  }

  nextStage() {
    sounds.ensureContext();
    sounds.startBgm();
    this.currentLevelIndex = (this.currentLevelIndex + 1) % LEVELS.length;
    this.initLevel(true); // Keep score, lives, weapon level, bombs!
    this.state = 'PLAYING';
  }

  switchLevel(index) {
    sounds.ensureContext();
    this.currentLevelIndex = index;
    this.initLevel(false);
    this.state = 'TITLE';
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
        this.currentLevelIndex = 0;
        this.startNewGame();
      }

      if ((code === 'Enter' || code === 'Space') && this.state === 'TITLE') {
        this.startNewGame();
      } else if ((code === 'Enter' || code === 'Space') && this.state === 'STAGE_CLEAR') {
        this.nextStage();
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
        } else if (this.state === 'STAGE_CLEAR') {
          this.nextStage();
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

    const lvlBtn = document.getElementById('lvl-toggle-btn');
    if (lvlBtn) {
      lvlBtn.addEventListener('click', () => {
        const nextLvl = (this.currentLevelIndex + 1) % LEVELS.length;
        this.switchLevel(nextLvl);
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

    // Damage Bosses if active
    for (const b of this.bosses) {
      if (b.alive && b.active) {
        b.takeDamage(15, this.particles);
      }
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
    const bossStopX = (this.currentLevelData.boss.c - 10) * TILE_SIZE; // Stop at ~4800px before boss
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
        for (const b of this.bosses) {
          b.activate(this.cameraX);
        }
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
    for (const b of this.bosses) {
      if (b.alive && b.active && !b.dying) {
        activeEnemies.push(b);
      }
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

    // Update Bosses
    let allBossesDefeated = true;
    for (const b of this.bosses) {
      b.update(dt, this.cameraX, this.player, this.bullets, this.particles, () => {
        // Individual Boss Defeated callback
        this.score += b.scoreValue;
        if (this.score > this.highScore) {
          this.highScore = this.score;
          localStorage.setItem('baodao_hi_score', this.highScore.toString());
        }
        this.floatingTexts.push(new FloatingText(b.x + b.w / 2, b.y + 40, `+${b.scoreValue}`, '#fbc531', 18));
      });
      if (b.alive) {
        allBossesDefeated = false;
      }
    }

    if (this.bossActive && allBossesDefeated) {
      this.bossActive = false;
      sounds.stopBgm();
      this.score += this.player.lives * 1000;
      this.score += this.player.bombs * 500;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('baodao_hi_score', this.highScore.toString());
      }
      if (this.currentLevelIndex === 0) {
        this.floatingTexts.push(new FloatingText(this.cameraX + this.viewW / 2, 180, 'STAGE 1 CLEAR!', '#fbc531', 20));
        this.state = 'STAGE_CLEAR';
      } else if (this.currentLevelIndex === 1) {
        this.floatingTexts.push(new FloatingText(this.cameraX + this.viewW / 2, 180, 'STAGE 2 CLEAR!', '#fbc531', 20));
        this.state = 'STAGE_CLEAR';
      } else if (this.currentLevelIndex === 2) {
        this.floatingTexts.push(new FloatingText(this.cameraX + this.viewW / 2, 180, 'STAGE 3 CLEAR!', '#fbc531', 20));
        this.state = 'STAGE_CLEAR';
      } else if (this.currentLevelIndex === 3) {
        this.floatingTexts.push(new FloatingText(this.cameraX + this.viewW / 2, 180, 'STAGE 4 CLEAR!', '#fbc531', 20));
        this.state = 'STAGE_CLEAR';
      } else if (this.currentLevelIndex === 4) {
        this.floatingTexts.push(new FloatingText(this.cameraX + this.viewW / 2, 180, 'STAGE 5 CLEAR!', '#fbc531', 20));
        this.state = 'STAGE_CLEAR';
      } else {
        this.floatingTexts.push(new FloatingText(this.cameraX + this.viewW / 2, 180, '★★★ ALL 6 STAGES CLEAR! ★★★', '#fbc531', 22));
        this.state = 'VICTORY';
      }
    }

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
          this.player.bombs = Math.min(6, this.player.bombs + 1);
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

    // 6. Draw Bosses
    for (const b of this.bosses) {
      b.draw(this.ctx, this.cameraX);
    }

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

      // Very subtle arcade edge vignette to keep Taipei 101 bright and recognizable
      const tint = this.ctx.createLinearGradient(0, 0, 0, this.viewH);
      tint.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
      tint.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
      tint.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      this.ctx.fillStyle = tint;
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);
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

    const isL1 = this.currentLevelIndex === 0;

    // Stage Intro Banner
    if (this.state === 'PLAYING' && this.stageIntroTimer > 0) {
      this.ctx.save();
      const alpha = Math.min(1, this.stageIntroTimer / 1.0);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.ctx.fillRect(0, this.viewH / 2 - 40, this.viewW, 80);

      let introTitle = '第一關：台北上空 (LEVEL 1)';
      let introSub = 'STAGE 1: TAIPEI SKYLINE & 101';
      if (this.currentLevelIndex === 1) {
        introTitle = '第二關：淡水夕照 (LEVEL 2)';
        introSub = 'STAGE 2: TAMSUI SUNSET & GUANDU BRIDGE';
      } else if (this.currentLevelIndex === 2) {
        introTitle = '第三關：新竹科技園區 (LEVEL 3)';
        introSub = 'STAGE 3: HSINCHU SCIENCE PARK & FABS';
      } else if (this.currentLevelIndex === 3) {
        introTitle = '第四關：台中綠園道 (LEVEL 4)';
        introSub = 'STAGE 4: TAICHUNG CALLIGRAPHY GREENWAY & CIVIC SQUARE';
      } else if (this.currentLevelIndex === 4) {
        introTitle = '第五關：桃園航空城 (LEVEL 5)';
        introSub = 'STAGE 5: TAOYUAN AEROTROPOLIS & RUNWAYS';
      } else if (this.currentLevelIndex === 5) {
        introTitle = '第六關：新北耶誕城 (LEVEL 6)';
        introSub = 'STAGE 6: NEW TAIPEI CITY CHRISTMASLAND & PLAZA';
      }

      this.ctx.fillStyle = '#00f2fe';
      this.ctx.shadowColor = '#00f2fe';
      this.ctx.shadowBlur = 10;
      this.ctx.font = 'bold 22px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(introTitle, this.viewW / 2, this.viewH / 2 - 6);

      this.ctx.fillStyle = '#fbc531';
      this.ctx.font = '13px monospace';
      this.ctx.fillText(introSub, this.viewW / 2, this.viewH / 2 + 20);
      this.ctx.restore();
    }

    // Boss Warning Banner
    if (this.cameraLocked && !this.bossActive && this.bossWarnTimer > 0) {
      this.ctx.save();
      const flash = Math.floor(Date.now() / 150) % 2 === 0;
      this.ctx.fillStyle = flash ? 'rgba(235, 77, 75, 0.45)' : 'rgba(0, 0, 0, 0.45)';
      this.ctx.fillRect(0, this.viewH / 2 - 45, this.viewW, 90);

      let warnTitle = '⚠ 警報！超巨大珍珠奶茶來襲 ⚠';
      let warnSub = 'WARNING: GIANT BOBA APPROACHING';
      if (this.currentLevelIndex === 1) {
        warnTitle = '⚠ 警報！超大淡水鐵蛋魔王來襲 ⚠';
        warnSub = 'WARNING: GIANT TAMSUI IRON EGG APPROACHING';
      } else if (this.currentLevelIndex === 2) {
        warnTitle = '⚠ 警報！超大新竹貢丸雙子逼近中 ⚠';
        warnSub = 'WARNING: TWIN GIANT HSINCHU MEATBALLS APPROACHING';
      } else if (this.currentLevelIndex === 3) {
        warnTitle = '⚠ 警報！超級大手槍魔王來襲 ⚠';
        warnSub = 'WARNING: GIANT PISTOL APPROACHING';
      } else if (this.currentLevelIndex === 4) {
        warnTitle = '⚠ 警報！超大巨無霸客機來襲 ⚠';
        warnSub = 'WARNING: GIANT JUMBO JET AIRLINER APPROACHING';
      } else if (this.currentLevelIndex === 5) {
        warnTitle = '⚠ 警報！超大光雕耶誕樹魔王來襲 ⚠';
        warnSub = 'WARNING: GIANT GLOWING CHRISTMAS TREE APPROACHING';
      }

      this.ctx.fillStyle = '#ff4757';
      this.ctx.shadowColor = '#ff4757';
      this.ctx.shadowBlur = 12;
      this.ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(warnTitle, this.viewW / 2, this.viewH / 2 - 8);

      this.ctx.font = '14px monospace';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(warnSub, this.viewW / 2, this.viewH / 2 + 24);
      this.ctx.restore();
    }

    // Boss Health Bar(s)
    if (this.bosses && this.bosses.length > 1) {
      const anyActive = this.bosses.some(b => b.active);
      if (anyActive) {
        this.ctx.save();
        const barW = 340;
        const barH = 11;
        const barX = (this.viewW - barW) / 2;

        this.bosses.forEach((b, idx) => {
          const barY = 32 + idx * 24;
          this.ctx.fillStyle = b.role === 'top' ? '#ff7675' : '#74b9ff';
          this.ctx.font = 'bold 11px monospace';
          this.ctx.textAlign = 'left';
          this.ctx.fillText(`${b.bossName} ${b.alive ? `[${Math.max(0, Math.ceil(b.hp))}/${b.maxHp}]` : '[已擊破]'}` , barX, barY - 4);

          // Frame
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          this.ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
          this.ctx.strokeStyle = b.enraged ? '#ff4757' : (b.role === 'top' ? '#ff7675' : '#74b9ff');
          this.ctx.lineWidth = 1.2;
          this.ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

          if (b.alive) {
            const ratio = Math.max(0, b.hp / b.maxHp);
            const grad = this.ctx.createLinearGradient(barX, barY, barX + barW, barY);
            if (b.role === 'top') {
              grad.addColorStop(0, '#ff4757');
              grad.addColorStop(0.5, '#ffa502');
              grad.addColorStop(1, '#ffbe76');
            } else {
              grad.addColorStop(0, '#0984e3');
              grad.addColorStop(0.5, '#00cec9');
              grad.addColorStop(1, '#81ecec');
            }
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(barX, barY, barW * ratio, barH);
          }
        });
        this.ctx.restore();
      }
    } else if (this.boss && this.boss.alive && this.boss.active) {
      this.ctx.save();
      const barW = 380;
      const barH = 14;
      const barX = (this.viewW - barW) / 2;
      const barY = 40;

      // Label
      let bossLabel = this.boss.bossName;
      if (this.currentLevelIndex === 0) bossLabel = bossLabel || 'BOSS: 巨型珍珠奶茶魔王 - 寶島波霸號 (GIANT BOBA)';
      else if (this.currentLevelIndex === 1) bossLabel = bossLabel || 'BOSS: 超大淡水鐵蛋魔王 - 阿婆黑金號 (IRON EGG)';
      else if (this.currentLevelIndex === 3) bossLabel = bossLabel || 'BOSS: 超級大手槍魔王 - 台中慶記號 (GIANT HANDGUN)';
      else if (this.currentLevelIndex === 4) bossLabel = bossLabel || 'BOSS: 超大巨無霸客機 - 桃園之翼號 (JUMBO JET)';
      else if (this.currentLevelIndex === 5) bossLabel = bossLabel || 'BOSS: 超大光雕耶誕樹魔王 - 新北竹筍號 (XMAS TREE)';

      this.ctx.fillStyle = this.currentLevelIndex === 5 ? '#2ecc71' : (this.currentLevelIndex === 4 ? '#00f2fe' : (this.currentLevelIndex === 3 ? '#f1c40f' : (isL1 ? '#ff9f43' : '#f6ad55')));
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(bossLabel, this.viewW / 2, barY - 6);

      // Frame
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

      // Fill Gradient
      const ratio = Math.max(0, this.boss.hp / this.boss.maxHp);
      const grad = this.ctx.createLinearGradient(barX, barY, barX + barW, barY);
      if (this.currentLevelIndex === 5) {
        grad.addColorStop(0, '#2ecc71');
        grad.addColorStop(0.35, '#f1c40f');
        grad.addColorStop(0.7, '#e84393');
        grad.addColorStop(1, '#00cec9');
      } else if (this.currentLevelIndex === 4) {
        grad.addColorStop(0, '#0984e3');
        grad.addColorStop(0.5, '#00cec9');
        grad.addColorStop(1, '#81ecec');
      } else if (this.currentLevelIndex === 3) {
        grad.addColorStop(0, '#ff4757');
        grad.addColorStop(0.5, '#f39c12');
        grad.addColorStop(1, '#f1c40f');
      } else if (isL1) {
        grad.addColorStop(0, '#ff4757');
        grad.addColorStop(0.5, '#ffa502');
        grad.addColorStop(1, '#ffbe76');
      } else {
        grad.addColorStop(0, '#ff4757');
        grad.addColorStop(0.5, '#f39c12');
        grad.addColorStop(1, '#2d1810');
      }
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

      let titleLevelStr = '第一關：台北上空 (LEVEL 1)';
      if (this.currentLevelIndex === 1) titleLevelStr = '第二關：淡水夕照 (LEVEL 2)';
      else if (this.currentLevelIndex === 2) titleLevelStr = '第三關：新竹科技園區 (LEVEL 3)';
      else if (this.currentLevelIndex === 3) titleLevelStr = '第四關：台中綠園道 (LEVEL 4)';
      else if (this.currentLevelIndex === 4) titleLevelStr = '第五關：桃園航空城 (LEVEL 5)';
      else if (this.currentLevelIndex === 5) titleLevelStr = '第六關：新北耶誕城 (LEVEL 6)';

      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = '#fbc531';
      this.ctx.font = '16px monospace';
      this.ctx.fillText(titleLevelStr, this.viewW / 2, 185);

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

    // STAGE CLEAR SCREEN (Stage 1 -> 2 -> 3 -> 4 -> 5)
    if (this.state === 'STAGE_CLEAR') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(5, 25, 45, 0.88)';
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);

      const clearIdx = this.currentLevelIndex;
      const stageName = `第${['一', '二', '三', '四', '五', '六'][clearIdx]}關`;

      this.ctx.fillStyle = '#fbc531';
      this.ctx.shadowColor = '#fbc531';
      this.ctx.shadowBlur = 20;
      this.ctx.font = 'bold 32px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`★ ${stageName} 突破成功！★`, this.viewW / 2, 115);

      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#00d2d3';
      this.ctx.font = '16px monospace';
      this.ctx.fillText(`STAGE ${clearIdx + 1} CLEAR - MISSION COMPLETE`, this.viewW / 2, 155);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '15px monospace';
      this.ctx.fillText(`作戰得分: ${this.score}`, this.viewW / 2, 205);
      this.ctx.fillText(`擊墜敵機: ${this.enemiesDefeated} 架`, this.viewW / 2, 235);
      this.ctx.fillText(`殘存戰機獎勵: +${this.player.lives * 1000} PTS`, this.viewW / 2, 265);

      // Next stage teaser
      this.ctx.fillStyle = '#ff9f43';
      this.ctx.font = 'bold 15px monospace';
      this.ctx.fillText('【 下一關情報 】', this.viewW / 2, 305);
      this.ctx.fillStyle = '#fbc531';
      this.ctx.font = '14px monospace';
      if (clearIdx === 0) {
        this.ctx.fillText('第二關場景：淡水的夕陽與關渡大橋', this.viewW / 2, 332);
        this.ctx.fillText('守關魔王：超大淡水鐵蛋', this.viewW / 2, 356);
      } else if (clearIdx === 1) {
        this.ctx.fillText('第三關場景：新竹科學園區科技廠房', this.viewW / 2, 332);
        this.ctx.fillText('守關魔王：超大新竹貢丸 x2 (彈力雙子)', this.viewW / 2, 356);
      } else if (clearIdx === 2) {
        this.ctx.fillText('第四關場景：台中綠園道 (草悟道與市民廣場)', this.viewW / 2, 332);
        this.ctx.fillText('守關魔王：超級大手槍 (台中慶記號)', this.viewW / 2, 356);
      } else if (clearIdx === 3) {
        this.ctx.fillText('第五關場景：桃園航空城 (國際機場跑道)', this.viewW / 2, 332);
        this.ctx.fillText('守關魔王：超大巨無霸客機 (桃園之翼號)', this.viewW / 2, 356);
      } else if (clearIdx === 4) {
        this.ctx.fillText('第六關場景：新北歡樂耶誕城 (市民廣場光雕夜景)', this.viewW / 2, 332);
        this.ctx.fillText('守關魔王：超大光雕耶誕樹 (新北竹筍號)', this.viewW / 2, 356);
      }

      const nextNum = ['二', '三', '四', '五', '六'][clearIdx] || '六';
      const blink = Math.floor(Date.now() / 350) % 2 === 0;
      if (blink) {
        this.ctx.fillStyle = '#00f2fe';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.fillText(`▶ 按 空白鍵 或 點擊出擊 前往第${nextNum}關 ◀`, this.viewW / 2, 415);
      }
      this.ctx.restore();
    }

    // VICTORY SCREEN (All Stages Complete)
    if (this.state === 'VICTORY') {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(5, 25, 45, 0.92)';
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);

      this.ctx.fillStyle = '#fbc531';
      this.ctx.shadowColor = '#fbc531';
      this.ctx.shadowBlur = 22;
      this.ctx.font = 'bold 34px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('★★★ 全島制霸！寶島風情畫全破！★★★', this.viewW / 2, 115);

      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#00d2d3';
      this.ctx.font = '16px monospace';
      this.ctx.fillText('ALL 6 STAGES CLEARED - CONGRATULATIONS!', this.viewW / 2, 155);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '15px monospace';
      this.ctx.fillText(`最終作戰總分: ${this.score}`, this.viewW / 2, 215);
      this.ctx.fillText(`總擊墜敵機: ${this.enemiesDefeated} 架`, this.viewW / 2, 250);
      this.ctx.fillText(`通關殘存戰機獎勵: +${this.player.lives * 1000} PTS`, this.viewW / 2, 285);
      this.ctx.fillText(`剩餘炸彈獎勵: +${this.player.bombs * 500} PTS`, this.viewW / 2, 320);

      const blink = Math.floor(Date.now() / 350) % 2 === 0;
      if (blink) {
        this.ctx.fillStyle = '#fbc531';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.fillText('按 R 鍵 重新挑戰第一關', this.viewW / 2, 395);
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
