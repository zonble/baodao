// Game Entities for 寶島風情畫
import { sounds } from './audio.js';

export const TILE_SIZE = 60;

// Utility for AABB Collision
export function checkAABB(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// Particle System
export class Particle {
  constructor(x, y, vx, vy, color, size, life, decay = 0.96) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.decay = decay;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= this.decay;
    this.vy *= this.decay;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx, camX) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - camX, this.y, Math.max(1, this.size * alpha), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Bullets
export class Bullet {
  constructor(x, y, vx, vy, isEnemy = false, damage = 1, type = 'normal') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.w = isEnemy ? 10 : 16;
    this.h = isEnemy ? 10 : 8;
    this.isEnemy = isEnemy;
    this.damage = damage;
    this.type = type; // 'normal', 'missile', 'boss_laser', 'spread'
    this.alive = true;
    this.life = 6.0;
    this.trailTimer = 0;
  }

  update(dt, particles, target = null) {
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }

    if (this.type === 'missile' && target && target.alive) {
      const targetCenterY = target.y + target.h / 2;
      const targetCenterX = target.x + target.w / 2;
      const angle = Math.atan2(targetCenterY - this.y, targetCenterX - this.x);
      const curSpeed = Math.hypot(this.vx, this.vy) || 380;
      this.vx = Math.cos(angle) * curSpeed;
      this.vy = Math.sin(angle) * curSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Trail particle
    this.trailTimer += dt;
    if (this.trailTimer > 0.04) {
      this.trailTimer = 0;
      if (this.isEnemy) {
        particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, '#ff4757', 3, 0.25));
      } else {
        particles.push(new Particle(this.x, this.y, -this.vx * 0.1, (Math.random() - 0.5) * 20, '#00d2d3', 2.5, 0.2));
      }
    }
  }

  draw(ctx, camX) {
    const screenX = this.x - camX;
    ctx.save();
    if (this.isEnemy) {
      if (this.type === 'boba') {
        // Giant Boba (珍珠彈)
        ctx.fillStyle = '#1e1010';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(screenX, this.y, 7, 0, Math.PI * 2);
        ctx.fill();

        // Brown glossy ring
        ctx.strokeStyle = '#4a2818';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // White reflection specular dot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(screenX - 2.5, this.y - 2.5, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'ice_cube') {
        // Rotating Ice Cube (冰塊彈)
        ctx.translate(screenX, this.y);
        ctx.rotate(Date.now() * 0.005);
        ctx.fillStyle = 'rgba(164, 225, 255, 0.85)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00d2d3';
        ctx.shadowBlur = 8;
        ctx.fillRect(-6, -6, 12, 12);
        ctx.strokeRect(-6, -6, 12, 12);
      } else {
        // Standard energy bullet
        ctx.fillStyle = '#ff4757';
        ctx.shadowColor = '#ff6b81';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(screenX, this.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Bright inner core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX, this.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      if (this.type === 'missile') {
        ctx.fillStyle = '#ff9f43';
        ctx.fillRect(screenX - 8, this.y - 3, 16, 6);
      } else {
        // Laser bolt
        const grad = ctx.createLinearGradient(screenX - 10, this.y, screenX + 10, this.y);
        grad.addColorStop(0, '#4facfe');
        grad.addColorStop(1, '#00f2fe');
        ctx.fillStyle = grad;
        ctx.fillRect(screenX - 10, this.y - 3, 20, 6);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX - 6, this.y - 1.5, 12, 3);
      }
    }
    ctx.restore();
  }
}

// Powerup Drop Items
export class DropItem {
  constructor(x, y, type = 'P') {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 24;
    this.type = type; // 'P': Power, 'S': Speed, 'B': Bomb, 'H': Heal
    this.alive = true;
    this.vx = -30;
    this.vy = 0;
    this.baseY = y;
    this.timer = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.timer += dt * 3;
    this.x += this.vx * dt;
    this.y = this.baseY + Math.sin(this.timer) * 12;
  }

  draw(ctx, camX) {
    const sx = this.x - camX;
    ctx.save();
    ctx.translate(sx + 12, this.y + 12);
    ctx.rotate(Math.sin(this.timer) * 0.15);

    let bgColor = '#e056fd';
    if (this.type === 'P') bgColor = '#ffbe76';
    if (this.type === 'S') bgColor = '#22a6b3';
    if (this.type === 'B') bgColor = '#eb4d4b';
    if (this.type === 'H') bgColor = '#6ab04c';

    ctx.fillStyle = bgColor;
    ctx.shadowColor = bgColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(-12, -12, 24, 24, 6);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type, 0, 1);
    ctx.restore();
  }
}

// Player Ship
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 46;
    this.h = 24;
    this.hitW = 26; // Tighter hitbox for precision dodging
    this.hitH = 14;
    this.vx = 0;
    this.vy = 0;
    this.speed = 260;
    this.lives = 3;
    this.maxShield = 3;
    this.shield = 3;
    this.bombs = 2;
    this.weaponLevel = 1;
    this.maxWeaponLevel = 4;
    this.shootTimer = 0;
    this.shootCooldown = 0.14;
    this.invulnerableTimer = 2.0;
    this.alive = true;
    this.score = 0;
    this.flameTimer = 0;
  }

  getHitbox() {
    return {
      x: this.x + (this.w - this.hitW) / 2,
      y: this.y + (this.h - this.hitH) / 2,
      w: this.hitW,
      h: this.hitH
    };
  }

  update(dt, input, camX, viewW, viewH, particles, bullets, enemies) {
    if (!this.alive) return;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Input Movement
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    this.vx = dx * this.speed;
    this.vy = dy * this.speed;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Viewport boundaries
    const minX = camX + 10;
    const maxX = camX + viewW - this.w - 10;
    const minY = 10;
    const maxY = viewH - this.h - 10;

    if (this.x < minX) this.x = minX;
    if (this.x > maxX) this.x = maxX;
    if (this.y < minY) this.y = minY;
    if (this.y > maxY) this.y = maxY;

    // Thruster Particles
    this.flameTimer += dt;
    if (this.flameTimer > 0.03) {
      this.flameTimer = 0;
      const flameX = this.x - 4;
      const flameY = this.y + this.h / 2;
      particles.push(new Particle(flameX, flameY + (Math.random() - 0.5) * 4, -120 - Math.random() * 50, (Math.random() - 0.5) * 30, '#00f2fe', 4, 0.22));
      particles.push(new Particle(flameX - 2, flameY + (Math.random() - 0.5) * 4, -80, (Math.random() - 0.5) * 20, '#ff9ff3', 3, 0.18));
    }

    // Shooting
    this.shootTimer -= dt;
    if (input.shoot && this.shootTimer <= 0) {
      this.shoot(bullets, enemies);
      this.shootTimer = this.shootCooldown;
    }
  }

  shoot(bullets, enemies) {
    sounds.playLaser();
    const gunX = this.x + this.w;
    const gunY = this.y + this.h / 2;

    if (this.weaponLevel === 1) {
      bullets.push(new Bullet(gunX, gunY, 650, 0, false, 1));
    } else if (this.weaponLevel === 2) {
      bullets.push(new Bullet(gunX, gunY - 7, 650, 0, false, 1));
      bullets.push(new Bullet(gunX, gunY + 7, 650, 0, false, 1));
    } else if (this.weaponLevel === 3) {
      bullets.push(new Bullet(gunX, gunY, 650, 0, false, 1));
      bullets.push(new Bullet(gunX, gunY - 8, 630, -90, false, 1, 'spread'));
      bullets.push(new Bullet(gunX, gunY + 8, 630, 90, false, 1, 'spread'));
    } else {
      // Level 4: Heavy dual lasers + Homing micro missile
      bullets.push(new Bullet(gunX, gunY - 7, 700, 0, false, 1.5));
      bullets.push(new Bullet(gunX, gunY + 7, 700, 0, false, 1.5));

      // Find nearest alive enemy ahead
      let nearest = null;
      let minDist = 9999;
      for (const e of enemies) {
        if (e.alive && e.x > this.x) {
          const d = Math.hypot(e.x - this.x, e.y - this.y);
          if (d < minDist) {
            minDist = d;
            nearest = e;
          }
        }
      }
      bullets.push(new Bullet(this.x + 10, gunY - 14, 400, -150, false, 2, 'missile'));
      if (nearest) bullets[bullets.length - 1].target = nearest;
    }
  }

  takeDamage(amount = 1, particles) {
    if (this.invulnerableTimer > 0 || !this.alive) return false;

    this.shield -= amount;
    sounds.playHit();

    // Damage particles
    for (let i = 0; i < 15; i++) {
      particles.push(new Particle(
        this.x + this.w / 2,
        this.y + this.h / 2,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        '#ff4757',
        4,
        0.4
      ));
    }

    if (this.shield <= 0) {
      this.lives--;
      sounds.playExplosion(true);
      if (this.lives <= 0) {
        this.alive = false;
        sounds.playGameOver();
        return true;
      } else {
        // Reset shield and weapon downgrade slightly
        this.shield = this.maxShield;
        this.weaponLevel = Math.max(1, this.weaponLevel - 1);
        this.invulnerableTimer = 2.5;
      }
    } else {
      this.invulnerableTimer = 1.2;
    }
    return false;
  }

  draw(ctx, camX) {
    if (!this.alive) return;

    // Blinking effect during invulnerability
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    const sx = this.x - camX;
    ctx.save();
    ctx.translate(sx, this.y);

    // Shield Aura
    if (this.shield > 1) {
      ctx.strokeStyle = `rgba(0, 242, 254, ${this.shield === 3 ? 0.6 : 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.w / 2, this.h / 2, this.w * 0.65, this.h * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ship Body - Sleek Futuristic Arcade Jet (Taiwan Formosa Blue & Gold)
    // Main fuselage
    ctx.fillStyle = '#1e3799';
    ctx.beginPath();
    ctx.moveTo(this.w, this.h / 2); // Nose
    ctx.lineTo(8, 0); // Upper wing root
    ctx.lineTo(0, 5); // Upper engine
    ctx.lineTo(6, this.h / 2); // Center rear
    ctx.lineTo(0, this.h - 5); // Lower engine
    ctx.lineTo(8, this.h); // Lower wing root
    ctx.closePath();
    ctx.fill();

    // Wing highlights
    ctx.fillStyle = '#00a8ff';
    ctx.beginPath();
    ctx.moveTo(this.w - 10, this.h / 2);
    ctx.lineTo(12, 4);
    ctx.lineTo(18, this.h / 2);
    ctx.lineTo(12, this.h - 4);
    ctx.closePath();
    ctx.fill();

    // Golden Canards / Trim
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(16, 2, 8, 2);
    ctx.fillRect(16, this.h - 4, 8, 2);

    // Cockpit Canopy (Neon Cyan glow)
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(this.w * 0.6, this.h / 2, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Twin Wingtip Cannons
    ctx.fillStyle = '#718093';
    ctx.fillRect(this.w - 14, 2, 8, 2);
    ctx.fillRect(this.w - 14, this.h - 4, 8, 2);

    ctx.restore();
  }
}

// Enemy X: "會上下短暫移動然後往前移動的敵人，發射慢速子彈"
export class EnemyX {
  constructor(r, c) {
    this.r = r;
    this.c = c;
    this.x = c * TILE_SIZE + 15;
    this.y = r * TILE_SIZE + 15;
    this.w = 34;
    this.h = 30;
    this.baseY = this.y;
    this.state = 'WAITING'; // WAITING, BOBBING, ADVANCING, DEAD
    this.hp = 2;
    this.alive = true;
    this.timer = 0;
    this.shotFired = false;
    this.bobDuration = 1.6; // 短暫上下移動約 1.6 秒
    this.scoreValue = 100;
  }

  update(dt, camX, player, bullets, particles) {
    if (!this.alive) return;

    // Activate when approaching viewport
    if (this.state === 'WAITING') {
      if (this.x <= camX + 850) {
        this.state = 'BOBBING';
        this.timer = 0;
      }
      return;
    }

    this.timer += dt;

    if (this.state === 'BOBBING') {
      // Bob up and down along a sine wave while drifting slightly left
      this.y = this.baseY + Math.sin(this.timer * 5) * 36;
      this.x -= 30 * dt;

      // Shoot slow bullet towards player near end of bobbing phase
      if (!this.shotFired && this.timer >= 1.0) {
        this.shotFired = true;
        sounds.playEnemyLaser();
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const speed = 150;
        bullets.push(new Bullet(this.x, this.y + this.h / 2, Math.cos(angle) * speed, Math.sin(angle) * speed, true));
      }

      if (this.timer >= this.bobDuration) {
        this.state = 'ADVANCING';
        this.timer = 0;
      }
    } else if (this.state === 'ADVANCING') {
      // Moves forward (leftward) rapidly towards the player
      this.x -= 185 * dt;

      // Gentle homing drift vertically
      const dy = player.y - this.y;
      this.y += Math.sign(dy) * 45 * dt;

      // Thruster particle
      if (Math.random() < 0.3) {
        particles.push(new Particle(this.x + this.w, this.y + this.h / 2, 40, (Math.random() - 0.5) * 15, '#e84118', 2.5, 0.2));
      }
    }

    // Out of bounds cleanup
    if (this.x < camX - 100) {
      this.alive = false;
    }
  }

  takeDamage(amount, particles) {
    this.hp -= amount;
    sounds.playHit();
    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(this.x + 15, this.y + 15, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, '#fbc531', 2.5, 0.2));
    }
    if (this.hp <= 0) {
      this.alive = false;
      sounds.playExplosion();
      for (let i = 0; i < 16; i++) {
        particles.push(new Particle(
          this.x + this.w / 2,
          this.y + this.h / 2,
          (Math.random() - 0.5) * 180,
          (Math.random() - 0.5) * 180,
          Math.random() < 0.5 ? '#e84118' : '#fbc531',
          4,
          0.35
        ));
      }
      return true;
    }
    return false;
  }

  draw(ctx, camX) {
    if (!this.alive || this.state === 'WAITING') return;
    const sx = this.x - camX;
    ctx.save();
    ctx.translate(sx, this.y);

    // Glowing Neon Arcade Scout Drone
    ctx.fillStyle = '#c23616';
    ctx.shadowColor = '#e84118';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, this.h / 2); // Sharp nose facing left
    ctx.lineTo(this.w, 2);
    ctx.lineTo(this.w - 6, this.h / 2);
    ctx.lineTo(this.w, this.h - 2);
    ctx.closePath();
    ctx.fill();

    // Wing highlights
    ctx.fillStyle = '#fbc531';
    ctx.fillRect(this.w - 12, 6, 6, 4);
    ctx.fillRect(this.w - 12, this.h - 10, 6, 4);

    // Red pulsating sensor eye
    const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
    ctx.fillStyle = `rgba(255, 234, 167, ${pulse})`;
    ctx.beginPath();
    ctx.arc(8, this.h / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Sneak Enemy S: "一開始不會出現，當主角機移動到畫面中時從後面出現的敵人，發射慢速子彈"
export class SneakEnemyS {
  constructor(r, c) {
    this.r = r;
    this.c = c;
    this.triggerCol = c;
    this.targetY = r * TILE_SIZE + 15;
    this.x = 0;
    this.y = this.targetY;
    this.w = 36;
    this.h = 28;
    this.state = 'UNSPAWNED'; // UNSPAWNED, ALERT, RUSHING, DEAD
    this.hp = 3;
    this.alive = true;
    this.alertTimer = 0.6; // Pre-spawn warning indicator at screen edge
    this.shootTimer = 1.0;
    this.scoreValue = 250;
    this.speed = 220;
  }

  update(dt, camX, player, bullets, particles) {
    if (!this.alive) return;

    if (this.state === 'UNSPAWNED') {
      // Trigger when player reaches trigger column or camera crosses it
      if (player.x >= this.triggerCol * TILE_SIZE - 250) {
        this.state = 'ALERT';
        sounds.playWarning();
      }
      return;
    }

    if (this.state === 'ALERT') {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) {
        this.state = 'RUSHING';
        this.x = camX - 40; // Spawns from the left/rear of screen
        this.y = this.targetY;
      }
      return;
    }

    if (this.state === 'RUSHING') {
      // Rushes in from behind (moving rightwards)
      this.x += this.speed * dt;

      // Slow bullet towards player
      if (this.shootTimer > 0) {
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
          sounds.playEnemyLaser();
          const angle = Math.atan2(player.y - this.y, player.x - this.x);
          bullets.push(new Bullet(this.x + this.w, this.y + this.h / 2, Math.cos(angle) * 140, Math.sin(angle) * 140, true));
        }
      }

      // Trail
      if (Math.random() < 0.4) {
        particles.push(new Particle(this.x, this.y + this.h / 2, -60, (Math.random() - 0.5) * 15, '#8c7ae6', 3, 0.25));
      }

      // Exit screen right
      if (this.x > camX + 900) {
        this.alive = false;
      }
    }
  }

  takeDamage(amount, particles) {
    this.hp -= amount;
    sounds.playHit();
    if (this.hp <= 0) {
      this.alive = false;
      sounds.playExplosion();
      for (let i = 0; i < 18; i++) {
        particles.push(new Particle(
          this.x + this.w / 2,
          this.y + this.h / 2,
          (Math.random() - 0.5) * 180,
          (Math.random() - 0.5) * 180,
          '#9c88ff',
          4,
          0.35
        ));
      }
      return true;
    }
    return false;
  }

  draw(ctx, camX) {
    if (!this.alive) return;

    // Draw warning arrow on left screen border during ALERT phase
    if (this.state === 'ALERT') {
      ctx.save();
      const blink = Math.floor(Date.now() / 100) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ff3838';
        ctx.shadowColor = '#ff3838';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 12px monospace';
        ctx.fillText('◀ REAR ALERT', 15, this.targetY + 15);
        ctx.beginPath();
        ctx.moveTo(10, this.targetY + 14);
        ctx.lineTo(2, this.targetY + 20);
        ctx.lineTo(10, this.targetY + 26);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (this.state !== 'RUSHING') return;

    const sx = this.x - camX;
    ctx.save();
    ctx.translate(sx, this.y);

    // Purple stealth assassin interceptor facing right (towards front)
    ctx.fillStyle = '#4834d4';
    ctx.shadowColor = '#686de0';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(this.w, this.h / 2); // Nose pointing right!
    ctx.lineTo(0, 0);
    ctx.lineTo(8, this.h / 2);
    ctx.lineTo(0, this.h);
    ctx.closePath();
    ctx.fill();

    // Wing energy blades
    ctx.fillStyle = '#e056fd';
    ctx.fillRect(8, 2, 10, 3);
    ctx.fillRect(8, this.h - 5, 10, 3);

    // Glowing visor
    ctx.fillStyle = '#00d2d3';
    ctx.fillRect(this.w - 10, this.h / 2 - 2, 6, 4);

    ctx.restore();
  }
}

// Turret: 塔
export class Turret {
  constructor(r, c) {
    this.r = r;
    this.c = c;
    this.x = c * TILE_SIZE + 10;
    this.y = r * TILE_SIZE + 10;
    this.w = 40;
    this.h = 40;
    this.isCeiling = r <= 3; // Attached to ceiling if top half, floor if bottom half
    this.angle = this.isCeiling ? Math.PI / 2 : -Math.PI / 2;
    this.shootTimer = 1.0 + Math.random() * 1.5;
    this.shootCooldown = 2.4;
    this.hp = 6;
    this.alive = true;
    this.scoreValue = 350;
  }

  update(dt, camX, player, bullets, particles) {
    if (!this.alive) return;

    // Check if within visible combat range
    if (this.x < camX - 80 || this.x > camX + 850) return;

    // Track player angle
    const targetAngle = Math.atan2(player.y - (this.y + 20), player.x - (this.x + 20));
    // Smooth rotate towards player
    const diff = targetAngle - this.angle;
    const normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.angle += normDiff * Math.min(1, dt * 3.5);

    // Fire cannon periodically
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.shootCooldown;
      sounds.playEnemyLaser();
      const muzzleX = this.x + 20 + Math.cos(this.angle) * 25;
      const muzzleY = this.y + 20 + Math.sin(this.angle) * 25;
      const speed = 140;
      bullets.push(new Bullet(muzzleX, muzzleY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, true, 1));

      // Muzzle spark
      for (let i = 0; i < 6; i++) {
        particles.push(new Particle(muzzleX, muzzleY, Math.cos(this.angle) * 50 + (Math.random() - 0.5) * 30, Math.sin(this.angle) * 50 + (Math.random() - 0.5) * 30, '#ff9f43', 3, 0.15));
      }
    }
  }

  takeDamage(amount, particles) {
    this.hp -= amount;
    sounds.playHit();
    if (this.hp <= 0) {
      this.alive = false;
      sounds.playExplosion(true);
      for (let i = 0; i < 25; i++) {
        particles.push(new Particle(
          this.x + 20,
          this.y + 20,
          (Math.random() - 0.5) * 220,
          (Math.random() - 0.5) * 220,
          Math.random() < 0.5 ? '#ff793f' : '#33d9b2',
          5,
          0.45
        ));
      }
      return true;
    }
    return false;
  }

  draw(ctx, camX) {
    if (!this.alive) return;
    const sx = this.x - camX;
    ctx.save();
    ctx.translate(sx + 20, this.y + 20);

    // Turret Armored Base Mount
    ctx.fillStyle = '#2f3542';
    ctx.strokeStyle = '#57606f';
    ctx.lineWidth = 2;
    if (this.isCeiling) {
      ctx.fillRect(-18, -20, 36, 12);
      ctx.strokeRect(-18, -20, 36, 12);
    } else {
      ctx.fillRect(-18, 8, 36, 12);
      ctx.strokeRect(-18, 8, 36, 12);
    }

    // Rotating Barrel Cannon
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#747d8c';
    ctx.fillRect(0, -5, 24, 10);
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(18, -3, 6, 6); // Energy tip
    ctx.restore();

    // Central Turret Dome
    ctx.fillStyle = '#3742fa';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#70a1ff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Falling Trap: | "由上往下掉落的陷阱，掉落後不會重生"
export class FallingTrap {
  constructor(r, c) {
    this.r = r;
    this.c = c;
    this.x = c * TILE_SIZE + 20;
    this.y = r * TILE_SIZE;
    this.w = 20;
    this.h = 50;
    this.state = 'HANGING'; // HANGING, SHAKING, FALLING, DESTROYED
    this.alive = true;
    this.vy = 0;
    this.shakeTimer = 0.35;
    this.shiverX = 0;
  }

  update(dt, camX, player, terrainGrid, particles) {
    if (this.state === 'DESTROYED') return;

    if (this.state === 'HANGING') {
      // Trigger when player approaches horizontally within 150px
      const dist = this.x - player.x;
      if (dist >= -20 && dist <= 160 && player.y > this.y) {
        this.state = 'SHAKING';
        sounds.playTrapRumble();
      }
      return;
    }

    if (this.state === 'SHAKING') {
      this.shakeTimer -= dt;
      this.shiverX = (Math.random() - 0.5) * 8;
      // Dust sparks
      if (Math.random() < 0.3) {
        particles.push(new Particle(this.x + 10, this.y, (Math.random() - 0.5) * 20, 20, '#dcdde1', 2, 0.2));
      }
      if (this.shakeTimer <= 0) {
        this.state = 'FALLING';
        this.shiverX = 0;
        this.vy = 80;
      }
      return;
    }

    if (this.state === 'FALLING') {
      this.vy += 650 * dt; // Gravity acceleration
      this.y += this.vy * dt;

      // Check collision with player
      const trapBox = { x: this.x, y: this.y, w: this.w, h: this.h };
      if (checkAABB(trapBox, player.getHitbox())) {
        player.takeDamage(1, particles);
        this.destroy(particles);
        return;
      }

      // Check ground collision (e blocks or bottom of world)
      const bottomRow = Math.floor((this.y + this.h) / TILE_SIZE);
      const col = Math.floor((this.x + this.w / 2) / TILE_SIZE);
      if (bottomRow >= 7 || (terrainGrid[bottomRow] && terrainGrid[bottomRow][col])) {
        this.destroy(particles);
      }
    }
  }

  destroy(particles) {
    this.state = 'DESTROYED';
    this.alive = false; // "掉落後不會重生"
    sounds.playTrapCrash();
    for (let i = 0; i < 25; i++) {
      particles.push(new Particle(
        this.x + this.w / 2,
        this.y + this.h,
        (Math.random() - 0.5) * 240,
        -Math.random() * 150 - 40,
        Math.random() < 0.5 ? '#f5cd79' : '#ea2027',
        4.5,
        0.5
      ));
    }
  }

  draw(ctx, camX) {
    if (this.state === 'DESTROYED') return;
    const sx = this.x - camX + this.shiverX;
    ctx.save();
    ctx.translate(sx, this.y);

    // Heavy industrial spike trap with hazard markings
    ctx.fillStyle = '#57606f';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.w, 0);
    ctx.lineTo(this.w / 2, this.h);
    ctx.closePath();
    ctx.fill();

    // Hazard yellow-black stripes
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(3, 10);
    ctx.lineTo(this.w - 3, 10);
    ctx.moveTo(6, 22);
    ctx.lineTo(this.w - 6, 22);
    ctx.stroke();

    // Sharp glowing tip
    ctx.fillStyle = '#e74c3c';
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(this.w / 2 - 4, this.h - 10);
    ctx.lineTo(this.w / 2 + 4, this.h - 10);
    ctx.lineTo(this.w / 2, this.h);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// Floating Text for Score & Alerts
export class FloatingText {
  constructor(x, y, text, color = '#fbc531', size = 14) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 0.9;
    this.maxLife = 0.9;
    this.vy = -35;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx, camX) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillText(this.text, this.x - camX, this.y);
    ctx.restore();
  }
}

// Stage 1 Boss: 巨型珍珠奶茶魔王 - 寶島波霸號 (GIANT BOBA BOSS)
export class Boss {
  constructor(r, c) {
    this.targetX = c * TILE_SIZE - 40;
    this.x = this.targetX + 350; // Starts off-screen right
    this.y = r * TILE_SIZE - 40;
    this.w = 170;
    this.h = 220;
    this.maxHp = 150;
    this.hp = 150;
    this.alive = true;
    this.active = false;
    this.entering = false;
    this.baseY = this.y;
    this.timer = 0;
    this.attackTimer = 2.0;
    this.attackPhase = 1;
    this.enraged = false;
    this.dying = false;
    this.dyingTimer = 3.2;
    this.scoreValue = 6000;
    this.strawFlash = 0;

    // Generate fixed random positions for boba pearls inside the cup bottom
    this.pearls = [];
    for (let i = 0; i < 32; i++) {
      this.pearls.push({
        x: 35 + Math.random() * 100,
        y: 145 + Math.random() * 55,
        r: 6.5 + Math.random() * 2.5,
        wobble: Math.random() * Math.PI * 2
      });
    }

    // Floating Ice Cubes
    this.iceCubes = [
      { x: 45, y: 55, s: 18, rot: 0.2 },
      { x: 80, y: 50, s: 22, rot: -0.3 },
      { x: 120, y: 58, s: 16, rot: 0.4 }
    ];
  }

  activate(camX) {
    this.active = true;
    this.entering = true;
    this.x = camX + 850;
    sounds.playWarning();
  }

  update(dt, camX, player, bullets, particles, onDefeated) {
    if (!this.alive || !this.active) return;

    if (this.strawFlash > 0) {
      this.strawFlash -= dt;
    }

    if (this.dying) {
      this.dyingTimer -= dt;
      // Chain explosions, leaking milk tea and bursting boba!
      if (Math.random() < 0.7) {
        sounds.playExplosion(Math.random() < 0.35);
        // Fire & smoke
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 220,
          (Math.random() - 0.5) * 220,
          Math.random() < 0.5 ? '#ff4757' : '#ffa502',
          6,
          0.6
        ));
        // Leaking tea drops
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 160,
          Math.random() * 180,
          '#d29054',
          5,
          0.5
        ));
        // Exploding pearls
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          '#1e1010',
          7,
          0.7
        ));
      }
      if (this.dyingTimer <= 0) {
        this.alive = false;
        sounds.playVictory();
        if (onDefeated) onDefeated();
      }
      return;
    }

    // Entrance glide animation
    if (this.entering) {
      this.x -= 130 * dt;
      if (this.x <= camX + 580) {
        this.x = camX + 580;
        this.entering = false;
      }
      return;
    }

    this.timer += dt;

    // Hover movement
    const hoverSpeed = this.enraged ? 2.8 : 1.8;
    const hoverAmp = 50;
    this.y = this.baseY + Math.sin(this.timer * hoverSpeed) * hoverAmp;

    // Enrage state check (< 50% HP: 全糖去冰暴怒模式！)
    if (this.hp <= this.maxHp * 0.5 && !this.enraged) {
      this.enraged = true;
      sounds.playWarning();
      // Burst shockwave of boba and steam
      for (let i = 0; i < 35; i++) {
        particles.push(new Particle(
          this.x + this.w / 2,
          this.y + this.h / 2,
          (Math.random() - 0.5) * 320,
          (Math.random() - 0.5) * 320,
          Math.random() < 0.5 ? '#ff4757' : '#d29054',
          5.5,
          0.6
        ));
      }
    }

    // Execute Attacks
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.executeAttack(player, bullets, particles);
      this.attackTimer = this.enraged ? 1.4 : 2.2;
    }
  }

  executeAttack(player, bullets, particles) {
    sounds.playEnemyLaser();
    this.strawFlash = 0.25;

    // Straw Tip position (where bullets emerge)
    const tipX = this.x + 10;
    const tipY = this.y - 10;

    this.attackPhase = (this.attackPhase % 3) + 1;

    if (this.attackPhase === 1) {
      // 1. 珍珠連射 (Boba Rapid Fire): 4 large boba pearls aimed at player
      const angle = Math.atan2(player.y - tipY, player.x - tipX);
      for (let i = 0; i < (this.enraged ? 5 : 3); i++) {
        setTimeout(() => {
          if (!this.alive || this.dying) return;
          sounds.playEnemyLaser();
          const speed = 190 + i * 20;
          const spreadA = angle + (Math.random() - 0.5) * 0.25;
          bullets.push(new Bullet(tipX, tipY, Math.cos(spreadA) * speed, Math.sin(spreadA) * speed, true, 1, 'boba'));
        }, i * 110);
      }
    } else if (this.attackPhase === 2) {
      // 2. 茶波擴散 (Milk Tea Spray): 5-way to 7-way spread of golden tea orbs
      const count = this.enraged ? 7 : 5;
      const spread = 0.8;
      const baseAngle = Math.PI; // Shooting left
      for (let i = 0; i < count; i++) {
        const offset = ((i / (count - 1)) - 0.5) * spread;
        const a = baseAngle + offset;
        const speed = 170;
        bullets.push(new Bullet(this.x + 20, this.y + 100, Math.cos(a) * speed, Math.sin(a) * speed, true, 1, 'tea_drop'));
      }
    } else {
      // 3. 甜度冰塊大爆發 (Sweetness & Ice Storm)
      // Ice cubes launched at player
      const angle = Math.atan2(player.y - (this.y + 60), player.x - (this.x + 30));
      bullets.push(new Bullet(this.x + 20, this.y + 60, Math.cos(angle - 0.2) * 210, Math.sin(angle - 0.2) * 210, true, 1, 'ice_cube'));
      bullets.push(new Bullet(this.x + 20, this.y + 60, Math.cos(angle + 0.2) * 210, Math.sin(angle + 0.2) * 210, true, 1, 'ice_cube'));

      if (this.enraged) {
        // Radial 8-way Boba Burst
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          bullets.push(new Bullet(this.x + this.w / 2, this.y + 120, Math.cos(a) * 150, Math.sin(a) * 150, true, 1, 'boba'));
        }
      }
    }
  }

  takeDamage(amount, particles) {
    if (!this.active || this.entering || this.dying) return false;
    this.hp -= amount;
    sounds.playHit();

    // Boba splash particles on hit
    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(
        this.x + 40,
        this.y + 80 + (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        Math.random() < 0.5 ? '#d29054' : '#1e1010',
        3.5,
        0.25
      ));
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.dyingTimer = 3.0;
      sounds.playExplosion(true);
      return true;
    }
    return false;
  }

  draw(ctx, camX) {
    if (!this.alive || !this.active) return;
    const sx = this.x - camX;
    ctx.save();
    ctx.translate(sx, this.y);

    // ==========================================
    // 1. GIANT BOBA STRAW (斜插巨型吸管)
    // ==========================================
    ctx.save();
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.strawFlash > 0 ? '#ffffff' : (this.enraged ? '#ff4757' : '#9c88ff');
    ctx.shadowColor = this.strawFlash > 0 ? '#fbc531' : '#8c7ae6';
    ctx.shadowBlur = this.strawFlash > 0 ? 15 : 6;
    ctx.beginPath();
    ctx.moveTo(85, 40); // Base inside cup
    ctx.lineTo(15, -15); // Slanted tip pointing toward player!
    ctx.stroke();

    // Straw Diagonal Cut Hole (吸管斜切口)
    ctx.fillStyle = '#1e1010';
    ctx.beginPath();
    ctx.ellipse(15, -15, 9, 6, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // Inner pearl ready to fire in muzzle
    if (this.strawFlash > 0) {
      ctx.fillStyle = '#ffbe76';
      ctx.beginPath();
      ctx.arc(15, -15, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ==========================================
    // 2. CUP OUTLINE & MILK TEA LIQUID (杯身與奶茶)
    // ==========================================
    // Cup dimensions: Top w=150, Bottom w=110, Height=175
    const topL = 10, topR = 160, topY = 35;
    const botL = 30, botR = 140, botY = 210;

    // Cup Shadow / Glow
    ctx.save();
    ctx.shadowColor = this.enraged ? 'rgba(255, 71, 87, 0.6)' : 'rgba(210, 144, 84, 0.5)';
    ctx.shadowBlur = 16;

    // Fill Milk Tea (香濃台式奶茶漸層)
    const teaGrad = ctx.createLinearGradient(0, topY, 0, botY);
    if (this.enraged) {
      teaGrad.addColorStop(0, '#e55039');
      teaGrad.addColorStop(0.5, '#b71540');
      teaGrad.addColorStop(1, '#6c152a');
    } else {
      teaGrad.addColorStop(0, '#f8c291');
      teaGrad.addColorStop(0.35, '#e17055');
      teaGrad.addColorStop(0.7, '#d29054');
      teaGrad.addColorStop(1, '#a05c28');
    }

    ctx.fillStyle = teaGrad;
    ctx.beginPath();
    ctx.moveTo(topL, topY + 10);
    // Sloshing waves on top
    const wave = Math.sin(Date.now() * 0.006) * 3;
    ctx.quadraticCurveTo(85, topY + 10 + wave, topR, topY + 10);
    ctx.lineTo(botR, botY);
    ctx.quadraticCurveTo(85, botY + 8, botL, botY);
    ctx.closePath();
    ctx.fill();

    // ==========================================
    // 3. TAPIOCA PEARLS (顆顆分明的黑糖珍珠)
    // ==========================================
    for (const p of this.pearls) {
      const wobbleY = Math.sin(Date.now() * 0.004 + p.wobble) * 2;
      ctx.fillStyle = '#140c0b';
      ctx.beginPath();
      ctx.arc(p.x, p.y + wobbleY, p.r, 0, Math.PI * 2);
      ctx.fill();

      // Brown edge
      ctx.strokeStyle = '#3d1f14';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Shiny highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(p.x - p.r * 0.35, p.y + wobbleY - p.r * 0.35, p.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    // ==========================================
    // 4. FLOATING ICE CUBES (晶瑩剔透冰塊)
    // ==========================================
    for (const ice of this.iceCubes) {
      ctx.save();
      ctx.translate(ice.x, ice.y + Math.sin(Date.now() * 0.005 + ice.x) * 3);
      ctx.rotate(ice.rot);
      ctx.fillStyle = 'rgba(240, 248, 255, 0.65)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-ice.s / 2, -ice.s / 2, ice.s, ice.s);
      ctx.strokeRect(-ice.s / 2, -ice.s / 2, ice.s, ice.s);
      ctx.restore();
    }

    // ==========================================
    // 5. CUP CLEAR RIM & PLASTIC GLASS EFFECT
    // ==========================================
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(topL, topY);
    ctx.lineTo(botL, botY);
    ctx.quadraticCurveTo(85, botY + 8, botR, botY);
    ctx.lineTo(topR, topY);
    ctx.stroke();

    // Cup Highlight reflection (左側透明高光條)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(topL + 12, topY + 20);
    ctx.lineTo(botL + 10, botY - 15);
    ctx.stroke();

    // ==========================================
    // 6. BOSS EYES & EXPRESSION (逗趣又霸氣的面部)
    // ==========================================
    const eyeY = 100;
    if (this.enraged) {
      // Angry Enraged Eyes (狂暴赤紅眼神)
      ctx.fillStyle = '#ff3838';
      ctx.shadowColor = '#ff3838';
      ctx.shadowBlur = 10;

      // Left eye
      ctx.beginPath();
      ctx.moveTo(50, eyeY - 8);
      ctx.lineTo(75, eyeY + 4);
      ctx.lineTo(55, eyeY + 6);
      ctx.closePath();
      ctx.fill();

      // Right eye
      ctx.beginPath();
      ctx.moveTo(120, eyeY - 8);
      ctx.lineTo(95, eyeY + 4);
      ctx.lineTo(115, eyeY + 6);
      ctx.closePath();
      ctx.fill();

      // Roaring Jagged Mouth (全糖暴怒咆哮嘴)
      ctx.fillStyle = '#2c0000';
      ctx.beginPath();
      ctx.ellipse(85, 128, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff3838';
      ctx.stroke();
    } else {
      // Normal Cute-Fierce Eyes
      ctx.fillStyle = '#2d3436';
      ctx.beginPath();
      ctx.arc(60, eyeY, 7, 0, Math.PI * 2);
      ctx.arc(110, eyeY, 7, 0, Math.PI * 2);
      ctx.fill();

      // Eye White Sparkle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(58, eyeY - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(108, eyeY - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Boss Mouth
      ctx.strokeStyle = '#2d3436';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(85, 120, 9, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // ==========================================
    // 7. CUP TOP SEALING FILM (封口膜：半糖去冰 / 全糖暴怒)
    // ==========================================
    ctx.fillStyle = this.enraged ? '#ff4757' : '#fbc531';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(85, topY, 75, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sealing text
    ctx.fillStyle = '#1e272e';
    ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.enraged ? '全糖去冰！' : '半糖少冰', 85, topY);

    // Cup Brand Label
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('★ 寶島珍奶 ★', 85, 148);

    ctx.restore();
    ctx.restore();
  }
}
