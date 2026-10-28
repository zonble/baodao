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
      } else if (this.type === 'marinade') {
        // Dark-Gold Soy Marinade Bullet (黑金濃汁能量彈)
        ctx.fillStyle = '#b7791f';
        ctx.shadowColor = '#f6ad55';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(screenX, this.y, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fefcbf';
        ctx.beginPath();
        ctx.arc(screenX - 1.5, this.y - 1.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'iron_shard') {
        // Iron Egg Shell Fragment (鐵蛋硬化破片)
        ctx.translate(screenX, this.y);
        ctx.rotate(Date.now() * 0.008);
        ctx.fillStyle = '#2d1810';
        ctx.strokeStyle = '#f6ad55';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (this.type === 'celery') {
        // Fresh Green Celery Fleck (芹菜末破片彈)
        ctx.translate(screenX, this.y);
        ctx.rotate(Date.now() * 0.007);
        ctx.fillStyle = '#2ed573';
        ctx.shadowColor = '#7bed9f';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e824c';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (this.type === 'broth') {
        // Glowing Bone Broth Plasma (大骨高湯濃縮彈)
        ctx.fillStyle = '#f6e58d';
        ctx.shadowColor = '#f9ca24';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(screenX, this.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffbe76';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, this.y, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX - 2, this.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'pepper') {
        // Coarse Black Pepper Spark (黑胡椒碎火花彈)
        ctx.fillStyle = '#2f3542';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(screenX, this.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff6b81';
        ctx.beginPath();
        ctx.arc(screenX, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'bullet' || this.type === 'qingji') {
        // High-velocity Brass Handgun Cartridge / 慶記子彈
        ctx.translate(screenX, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const bGrad = ctx.createLinearGradient(-8, 0, 8, 0);
        bGrad.addColorStop(0, '#f39c12');
        bGrad.addColorStop(0.5, '#f1c40f');
        bGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = bGrad;
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-7, -4);
        ctx.lineTo(-7, 4);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        // Primer rim
        ctx.fillStyle = '#d35400';
        ctx.fillRect(-8, -3, 2, 6);
      } else if (this.type === 'sniper_bullet') {
        // Heavy Armor-Piercing Mega Round (穿甲狙擊重彈)
        ctx.translate(screenX, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));
        ctx.fillStyle = '#ff3838';
        ctx.shadowColor = '#ff3838';
        ctx.shadowBlur = 14;
        ctx.fillRect(-12, -4, 24, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -2, 16, 4);
      } else if (this.type === 'turbo_ring') {
        // Jet Turbofan Vortex Ring (渦輪渦流噴射環)
        ctx.translate(screenX, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'beacon') {
        // ILS Runway Navigation Guidance Pulse (跑道導航導引光球)
        ctx.fillStyle = '#2ed573';
        ctx.shadowColor = '#7bed9f';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(screenX, this.y, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(46, 213, 115, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(screenX, this.y, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX, this.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
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
    this.bossName = '巨型珍珠奶茶魔王 - 寶島波霸號';
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

// Alias BobaBoss
export const BobaBoss = Boss;

// Stage 2 Boss: 超大淡水鐵蛋魔王 - 阿婆黑金號 (GIANT TAMSUI IRON EGG BOSS)
export class IronEggBoss {
  constructor(r, c) {
    this.targetX = c * TILE_SIZE - 40;
    this.x = this.targetX + 350;
    this.y = r * TILE_SIZE - 30;
    this.w = 160;
    this.h = 200;
    this.maxHp = 180;
    this.hp = 180;
    this.alive = true;
    this.active = false;
    this.entering = false;
    this.baseY = this.y;
    this.timer = 0;
    this.attackTimer = 1.8;
    this.attackPhase = 1;
    this.enraged = false;
    this.dying = false;
    this.dyingTimer = 3.5;
    this.scoreValue = 8000;
    this.bossName = '超大淡水鐵蛋魔王 - 阿婆黑金號';

    // 4 Orbiting Quail Iron Eggs (鵪鶉小鐵蛋浮游砲)
    this.orbitRadius = 110;
    this.quailEggs = [
      { angle: 0 },
      { angle: Math.PI / 2 },
      { angle: Math.PI },
      { angle: (Math.PI * 3) / 2 }
    ];

    // Shell marbling/crackle patterns
    this.cracks = [];
    for (let i = 0; i < 14; i++) {
      this.cracks.push({
        x1: 30 + Math.random() * 100,
        y1: 40 + Math.random() * 120,
        x2: 30 + Math.random() * 100,
        y2: 40 + Math.random() * 120
      });
    }
  }

  activate(camX) {
    this.active = true;
    this.entering = true;
    this.x = camX + 850;
    sounds.playWarning();
  }

  update(dt, camX, player, bullets, particles, onDefeated) {
    if (!this.alive || !this.active) return;

    if (this.dying) {
      this.dyingTimer -= dt;
      // Heavy explosions, dark marinade splashes and cracked shell sparks!
      if (Math.random() < 0.75) {
        sounds.playExplosion(Math.random() < 0.4);
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 240,
          (Math.random() - 0.5) * 240,
          Math.random() < 0.5 ? '#f39c12' : '#e74c3c',
          6,
          0.6
        ));
        // Golden marinade mist
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 180,
          (Math.random() - 0.5) * 180,
          '#b7791f',
          5,
          0.5
        ));
        // Obsidian egg shell fragments
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          '#1e100c',
          6,
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

    // Entrance slide animation
    if (this.entering) {
      this.x -= 130 * dt;
      if (this.x <= camX + 590) {
        this.x = camX + 590;
        this.entering = false;
      }
      return;
    }

    this.timer += dt;

    // Movement: Bobbing + Occasional heavy slam bounce
    const hoverSpeed = this.enraged ? 3.0 : 2.0;
    const hoverAmp = 55;
    this.y = this.baseY + Math.sin(this.timer * hoverSpeed) * hoverAmp;

    // Orbiting Quail Eggs Rotation
    const orbitSpeed = this.enraged ? 3.2 : 2.0;
    for (const egg of this.quailEggs) {
      egg.angle += orbitSpeed * dt;
    }

    // Check enrage state (< 50% HP)
    if (this.hp <= this.maxHp * 0.5 && !this.enraged) {
      this.enraged = true;
      sounds.playWarning();
      // Shockwave
      for (let i = 0; i < 40; i++) {
        particles.push(new Particle(
          this.x + this.w / 2,
          this.y + this.h / 2,
          (Math.random() - 0.5) * 360,
          (Math.random() - 0.5) * 360,
          Math.random() < 0.5 ? '#f39c12' : '#2d1810',
          5.5,
          0.6
        ));
      }
    }

    // Execute Attacks
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.executeAttack(player, bullets, particles);
      this.attackTimer = this.enraged ? 1.3 : 2.1;
    }
  }

  executeAttack(player, bullets, particles) {
    sounds.playEnemyLaser();
    const coreX = this.x + 30;
    const coreY = this.y + this.h / 2;

    this.attackPhase = (this.attackPhase % 3) + 1;

    if (this.attackPhase === 1) {
      // 1. 黑金滷汁放射 (Marinade Salvo): 5-7 high-speed amber-gold energy balls
      const count = this.enraged ? 7 : 5;
      const spread = 0.75;
      const baseAngle = Math.PI;
      for (let i = 0; i < count; i++) {
        const offset = ((i / (count - 1)) - 0.5) * spread;
        const a = baseAngle + offset;
        const speed = 190;
        bullets.push(new Bullet(coreX, coreY, Math.cos(a) * speed, Math.sin(a) * speed, true, 1, 'marinade'));
      }
    } else if (this.attackPhase === 2) {
      // 2. 鵪鶉鐵蛋齊射 (Quail Drone Crossfire)
      for (const egg of this.quailEggs) {
        const eggX = this.x + this.w / 2 + Math.cos(egg.angle) * this.orbitRadius;
        const eggY = this.y + this.h / 2 + Math.sin(egg.angle) * this.orbitRadius;
        const a = Math.atan2(player.y - eggY, player.x - eggX);
        bullets.push(new Bullet(eggX, eggY, Math.cos(a) * 180, Math.sin(a) * 180, true, 1, 'boba'));
      }
    } else {
      // 3. 鐵蛋硬化破片大爆發 (Hardened Shell Shard Burst)
      const count = this.enraged ? 10 : 6;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        bullets.push(new Bullet(this.x + this.w / 2, this.y + this.h / 2, Math.cos(a) * 160, Math.sin(a) * 160, true, 1, 'iron_shard'));
      }
      // Direct heavy shot to player
      const aimA = Math.atan2(player.y - coreY, player.x - coreX);
      bullets.push(new Bullet(coreX, coreY, Math.cos(aimA) * 230, Math.sin(aimA) * 230, true, 1.5, 'marinade'));
    }
  }

  takeDamage(amount, particles) {
    if (!this.active || this.entering || this.dying) return false;
    this.hp -= amount;
    sounds.playHit();

    // Metallic / Hardened rock sparks
    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(
        this.x + 30 + Math.random() * 50,
        this.y + 40 + Math.random() * 120,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        Math.random() < 0.5 ? '#f6ad55' : '#2d1810',
        3.5,
        0.25
      ));
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.dyingTimer = 3.2;
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

    const centerX = this.w / 2;
    const centerY = this.h / 2;

    // 1. Draw 4 Orbiting Quail Iron Eggs
    for (const egg of this.quailEggs) {
      const qX = centerX + Math.cos(egg.angle) * this.orbitRadius;
      const qY = centerY + Math.sin(egg.angle) * this.orbitRadius;
      ctx.save();
      ctx.translate(qX, qY);
      ctx.rotate(egg.angle);

      // Mini egg shadow / aura
      ctx.shadowColor = this.enraged ? '#ff4757' : '#f6ad55';
      ctx.shadowBlur = 8;

      ctx.fillStyle = '#1e100c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mini egg gloss
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(-3, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Main Giant Iron Egg Body
    ctx.save();
    ctx.shadowColor = this.enraged ? 'rgba(255, 71, 87, 0.7)' : 'rgba(246, 173, 85, 0.5)';
    ctx.shadowBlur = 18;

    // Deep marinated obsidian brown-black egg gradient
    const eggGrad = ctx.createLinearGradient(0, 10, 0, 200);
    if (this.enraged) {
      eggGrad.addColorStop(0, '#5a1a10');
      eggGrad.addColorStop(0.5, '#2e0f0a');
      eggGrad.addColorStop(1, '#180705');
    } else {
      eggGrad.addColorStop(0, '#4a2511');
      eggGrad.addColorStop(0.35, '#2c150a');
      eggGrad.addColorStop(0.7, '#1c0c06');
      eggGrad.addColorStop(1, '#0e0503');
    }

    ctx.fillStyle = eggGrad;
    ctx.beginPath();
    // Smooth egg bezier path
    ctx.moveTo(centerX, 10);
    ctx.bezierCurveTo(centerX + 65, 10, this.w, 110, this.w - 15, 180);
    ctx.bezierCurveTo(this.w - 30, 215, 30, 215, 15, 180);
    ctx.bezierCurveTo(0, 110, centerX - 65, 10, centerX, 10);
    ctx.closePath();
    ctx.fill();

    // Metallic egg border
    ctx.strokeStyle = this.enraged ? '#ff4757' : '#d4a373';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Chewy Hardened Shell Gloss Specular (弧形金屬反光)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX - 35, 30);
    ctx.bezierCurveTo(centerX - 60, 70, 20, 130, 30, 170);
    ctx.stroke();

    // Secondary specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(centerX - 30, 45, 12, 5, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // 4. Cracks / Fissures (十重滷煮裂紋)
    ctx.strokeStyle = this.enraged ? '#ff4757' : 'rgba(246, 173, 85, 0.4)';
    ctx.lineWidth = this.enraged ? 2 : 1;
    for (const ck of this.cracks) {
      ctx.beginPath();
      ctx.moveTo(ck.x1, ck.y1);
      ctx.lineTo(ck.x2, ck.y2);
      ctx.stroke();
    }

    // 5. Traditional Seal Stamp (阿婆鐵蛋 / 正宗淡水)
    ctx.save();
    ctx.translate(centerX, 155);
    ctx.rotate(-0.08);
    ctx.fillStyle = '#b71540';
    ctx.strokeStyle = '#fbc531';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-35, -12, 70, 24);
    ctx.strokeRect(-35, -12, 70, 24);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('阿婆鐵蛋', 0, 1);
    ctx.restore();

    // 6. Boss Face / Eyes
    const eyeY = 95;
    if (this.enraged) {
      // Red Blazing Eyes
      ctx.fillStyle = '#ff3838';
      ctx.shadowColor = '#ff3838';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(45, eyeY - 6);
      ctx.lineTo(70, eyeY + 4);
      ctx.lineTo(50, eyeY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(115, eyeY - 6);
      ctx.lineTo(90, eyeY + 4);
      ctx.lineTo(110, eyeY + 6);
      ctx.closePath();
      ctx.fill();

      // Roaring crack mouth
      ctx.strokeStyle = '#ff3838';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, 122);
      ctx.lineTo(75, 128);
      ctx.lineTo(85, 122);
      ctx.lineTo(100, 128);
      ctx.stroke();
    } else {
      // Fierce Battle Eyes
      ctx.fillStyle = '#fbc531';
      ctx.shadowColor = '#f6ad55';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(55, eyeY, 8, 4, -0.2, 0, Math.PI * 2);
      ctx.ellipse(105, eyeY, 8, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Eye pupil
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(54, eyeY, 2, 0, Math.PI * 2);
      ctx.arc(106, eyeY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Title label
    ctx.fillStyle = '#f6ad55';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ 正宗淡水鐵蛋 ★', centerX, 25);

    ctx.restore();
    ctx.restore();
  }
}

// Boss Factory
export function createBoss(stageIndex, r, c) {
  if (stageIndex === 4) {
    return [new GiantAirlinerBoss(r, c)];
  }
  if (stageIndex === 3) {
    return [new GiantGunBoss(r, c)];
  }
  if (stageIndex === 2) {
    const b1 = new GongwanBoss(0, c, 'top');
    const b2 = new GongwanBoss(3, c, 'bottom');
    b1.twin = b2;
    b2.twin = b1;
    return [b1, b2];
  }
  if (stageIndex === 1) {
    return [new IronEggBoss(r, c)];
  }
  return [new BobaBoss(r, c)];
}

// Stage 3 Boss: 超大新竹貢丸雙子 (TWIN GIANT HSINCHU MEATBALL BOSSES)
export class GongwanBoss {
  constructor(r, c, role = 'top') {
    this.role = role; // 'top' or 'bottom'
    this.targetX = c * TILE_SIZE - 40;
    this.x = this.targetX + 350;
    this.baseY = role === 'top' ? 70 : 310;
    this.y = this.baseY;
    this.w = 130;
    this.h = 130;
    this.radius = 58;
    this.maxHp = 140;
    this.hp = 140;
    this.alive = true;
    this.active = false;
    this.entering = false;
    this.timer = role === 'top' ? 0 : Math.PI;
    this.attackTimer = role === 'top' ? 1.6 : 2.6;
    this.attackPhase = 1;
    this.enraged = false;
    this.dying = false;
    this.dyingTimer = 3.5;
    this.scoreValue = 6000;
    this.bossName = role === 'top' ? '新竹超大貢丸 (彈力壹號)' : '新竹超大貢丸 (爆汁貳號)';
    this.twin = null;

    // Celery and pepper flecks
    this.specks = [];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.radius - 12);
      this.specks.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        type: i % 3 === 0 ? 'celery' : 'pepper',
        size: i % 3 === 0 ? 3.5 : 2,
        rot: Math.random() * Math.PI
      });
    }
  }

  activate(camX) {
    this.active = true;
    this.entering = true;
    this.x = camX + 850 + (this.role === 'bottom' ? 50 : 0);
    sounds.playWarning();
  }

  setEnraged() {
    if (this.enraged || !this.alive || this.dying) return;
    this.enraged = true;
    this.bossName = this.role === 'top' ? '新竹超大貢丸 (彈力壹號·暴走 200%)' : '新竹超大貢丸 (爆汁貳號·暴走 200%)';
    sounds.playWarning();
  }

  update(dt, camX, player, bullets, particles, onDefeated) {
    if (!this.alive || !this.active) return;

    if (this.dying) {
      this.dyingTimer -= dt;
      // High-intensity meatball broth explosion
      if (Math.random() < 0.8) {
        sounds.playExplosion(Math.random() < 0.4);
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 260,
          (Math.random() - 0.5) * 260,
          Math.random() < 0.5 ? '#f9ca24' : '#fff5eb',
          6,
          0.6
        ));
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          '#2ecc71',
          4,
          0.5
        ));
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 220,
          (Math.random() - 0.5) * 220,
          '#2c3e50',
          3,
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

    // Entrance slide animation
    if (this.entering) {
      this.x -= 140 * dt;
      const targetScreenX = this.role === 'top' ? 610 : 640;
      if (this.x <= camX + targetScreenX) {
        this.x = camX + targetScreenX;
        this.entering = false;
      }
      return;
    }

    this.timer += dt;

    // Movement: bouncy harmonic oscillation
    const bounceSpeed = this.enraged ? 3.6 : 2.2;
    const bounceAmp = this.role === 'top' ? 40 : 50;
    this.y = this.baseY + Math.sin(this.timer * bounceSpeed) * bounceAmp;

    // Check enrage state (< 50% HP)
    if (this.hp <= this.maxHp * 0.5 && !this.enraged) {
      this.setEnraged();
      for (let i = 0; i < 35; i++) {
        particles.push(new Particle(
          this.x + this.w / 2,
          this.y + this.h / 2,
          (Math.random() - 0.5) * 350,
          (Math.random() - 0.5) * 350,
          Math.random() < 0.5 ? '#f9ca24' : '#fff5eb',
          5,
          0.6
        ));
      }
    }

    // Attacks
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.executeAttack(player, bullets, particles);
      this.attackTimer = this.enraged ? 1.2 : 2.2;
    }
  }

  executeAttack(player, bullets, particles) {
    sounds.playEnemyLaser();
    const coreX = this.x + 20;
    const coreY = this.y + this.h / 2;

    this.attackPhase = (this.attackPhase % 3) + 1;

    if (this.role === 'top') {
      // Top Meatball: 彈力壹號 (High mobility, Celery spread, Pepper barrage)
      if (this.attackPhase === 1) {
        // 1. 芹菜末扇形彈幕 (Celery Arc Shot)
        const count = this.enraged ? 7 : 5;
        const spread = 0.8;
        const baseA = Math.atan2(player.y - coreY, player.x - coreX);
        for (let i = 0; i < count; i++) {
          const offset = ((i / (count - 1)) - 0.5) * spread;
          const a = baseA + offset;
          const speed = 190;
          bullets.push(new Bullet(coreX, coreY, Math.cos(a) * speed, Math.sin(a) * speed, true, 1, 'celery'));
        }
      } else if (this.attackPhase === 2) {
        // 2. 白胡椒高速雙發 (Pepper Darts)
        for (let i = 0; i < (this.enraged ? 4 : 2); i++) {
          const offsetAngle = (i - 0.5) * 0.15;
          const a = Math.atan2(player.y - coreY, player.x - coreX) + offsetAngle;
          bullets.push(new Bullet(coreX, coreY, Math.cos(a) * 240, Math.sin(a) * 240, true, 1, 'pepper'));
        }
      } else {
        // 3. 彈力高湯全方位迸發 (Broth Burst)
        const count = this.enraged ? 10 : 8;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + this.timer;
          bullets.push(new Bullet(coreX, coreY, Math.cos(a) * 160, Math.sin(a) * 160, true, 1, 'broth'));
        }
      }
    } else {
      // Bottom Meatball: 爆汁貳號 (Heavy broth waves, Pepper spiral, Scalding snipes)
      if (this.attackPhase === 1) {
        // 1. 爆汁大骨高湯波浪 (Broth Wave)
        const count = this.enraged ? 8 : 6;
        const baseA = Math.PI;
        for (let i = 0; i < count; i++) {
          const a = baseA + ((i / (count - 1)) - 0.5) * 0.9;
          const speed = 175;
          bullets.push(new Bullet(coreX, coreY, Math.cos(a) * speed, Math.sin(a) * speed, true, 1, 'broth'));
        }
      } else if (this.attackPhase === 2) {
        // 2. 黑胡椒漩渦彈 (Pepper Spiral)
        const count = this.enraged ? 12 : 8;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          bullets.push(new Bullet(coreX, coreY, Math.cos(a) * 180, Math.sin(a) * 180, true, 1, 'pepper'));
        }
      } else {
        // 3. 爆汁高壓熱湯直擊 (Hot Broth Stream)
        const a = Math.atan2(player.y - coreY, player.x - coreX);
        bullets.push(new Bullet(coreX, coreY, Math.cos(a) * 250, Math.sin(a) * 250, true, 1.5, 'broth'));
        bullets.push(new Bullet(coreX, coreY, Math.cos(a + 0.2) * 210, Math.sin(a + 0.2) * 210, true, 1, 'celery'));
        bullets.push(new Bullet(coreX, coreY, Math.cos(a - 0.2) * 210, Math.sin(a - 0.2) * 210, true, 1, 'celery'));
      }
    }
  }

  takeDamage(amount, particles) {
    if (!this.active || this.entering || this.dying) return false;
    this.hp -= amount;
    sounds.playHit();

    // Broth and pork flecks
    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(
        this.x + 20 + Math.random() * (this.w - 40),
        this.y + 20 + Math.random() * (this.h - 40),
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        Math.random() < 0.5 ? '#fff5eb' : '#ebd4b7',
        3.5,
        0.25
      ));
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.dyingTimer = 3.2;
      sounds.playExplosion(true);
      if (this.twin && this.twin.alive && !this.twin.dying) {
        this.twin.setEnraged();
      }
      return true;
    }
    return false;
  }

  draw(ctx, camX) {
    if (!this.alive || !this.active) return;
    const sx = this.x - camX;
    ctx.save();
    ctx.translate(sx + this.w / 2, this.y + this.h / 2);

    // Squash & Stretch for bouncy pork meatball
    const squash = Math.sin(this.timer * (this.enraged ? 7 : 4)) * (this.enraged ? 0.08 : 0.05);
    ctx.scale(1 + squash, 1 - squash);

    // 1. Rising Broth Steam (大骨湯熱氣)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2.5;
    const steamT = (this.timer * 3) % 2;
    ctx.beginPath();
    ctx.moveTo(-15, -this.radius + 5);
    ctx.bezierCurveTo(-25, -this.radius - 15, -5, -this.radius - 25, -15, -this.radius - 35 - steamT * 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(15, -this.radius + 5);
    ctx.bezierCurveTo(25, -this.radius - 15, 5, -this.radius - 25, 15, -this.radius - 35 - steamT * 10);
    ctx.stroke();
    ctx.restore();

    // 2. Meatball Body Shadow / Aura
    ctx.save();
    ctx.shadowColor = this.enraged ? 'rgba(255, 71, 87, 0.75)' : 'rgba(249, 202, 36, 0.55)';
    ctx.shadowBlur = this.enraged ? 20 : 14;

    const meatGrad = ctx.createRadialGradient(-15, -15, 10, 0, 0, this.radius);
    if (this.enraged) {
      meatGrad.addColorStop(0, '#fff5eb');
      meatGrad.addColorStop(0.3, '#fbc531');
      meatGrad.addColorStop(0.7, '#e74c3c');
      meatGrad.addColorStop(1, '#c0392b');
    } else {
      meatGrad.addColorStop(0, '#ffffff');
      meatGrad.addColorStop(0.25, '#fff7ed');
      meatGrad.addColorStop(0.65, '#ebd4b7');
      meatGrad.addColorStop(1, '#ca9e72');
    }

    ctx.fillStyle = meatGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.enraged ? '#ff4757' : '#ba8655';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // 3. Celery flecks & pepper specks on surface
    for (const sp of this.specks) {
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);
      if (sp.type === 'celery') {
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.ellipse(0, 0, sp.size * 1.5, sp.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(0, 0, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Chef Headband (鉢卷)
    ctx.save();
    const bandY = -18;
    ctx.fillStyle = this.role === 'top' ? '#eb4d4b' : '#30336b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-this.radius + 4, bandY - 8, (this.radius - 4) * 2, 16);
    ctx.strokeRect(-this.radius + 4, bandY - 8, (this.radius - 4) * 2, 16);

    // Headband Kanji Emblem
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.role === 'top' ? '彈' : '汁', 0, bandY);
    ctx.restore();

    // 5. Cute/Fierce Anime Eyes & Face
    const eyeY = 12;
    if (this.enraged) {
      // Blazing Red Battle Eyes
      ctx.fillStyle = '#ff3838';
      ctx.shadowColor = '#ff3838';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-28, eyeY - 6);
      ctx.lineTo(-8, eyeY + 3);
      ctx.lineTo(-24, eyeY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(28, eyeY - 6);
      ctx.lineTo(8, eyeY + 3);
      ctx.lineTo(24, eyeY + 6);
      ctx.closePath();
      ctx.fill();

      // Roaring steam mouth
      ctx.strokeStyle = '#ff3838';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 32, 10, 0, Math.PI, true);
      ctx.stroke();
    } else {
      // Expressive Determined Eyes
      ctx.fillStyle = '#2d3436';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.ellipse(-18, eyeY, 6, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(18, eyeY, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye White Reflections
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-20, eyeY - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(16, eyeY - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Blushing Cheeks
      ctx.fillStyle = 'rgba(255, 118, 117, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-26, eyeY + 12, 7, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(26, eyeY + 12, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Confident Gourmet Smile
      ctx.strokeStyle = '#2d3436';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 26, 7, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // 6. Title Label Above Meatball
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.role === 'top' ? '#ff7675' : '#74b9ff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.role === 'top' ? '★ 新竹彈力貢丸 ★' : '★ 新竹爆汁貢丸 ★', 0, -this.radius - 8);

    ctx.restore();
  }
}

// Stage 4 Boss: 超級大手槍魔王 - 台中慶記號 (GIANT HANDGUN BOSS)
export class GiantGunBoss {
  constructor(r, c) {
    this.targetX = c * TILE_SIZE - 40;
    this.x = this.targetX + 350;
    this.y = r * TILE_SIZE - 20;
    this.w = 190;
    this.h = 130;
    this.maxHp = 220;
    this.hp = 220;
    this.alive = true;
    this.active = false;
    this.entering = false;
    this.baseY = this.y;
    this.timer = 0;
    this.attackTimer = 1.6;
    this.attackPhase = 1;
    this.enraged = false;
    this.dying = false;
    this.dyingTimer = 3.6;
    this.scoreValue = 10000;
    this.bossName = '超級大手槍魔王 - 台中慶記號';

    this.recoilX = 0; // slide blowback displacement (px)
    this.laserAimTimer = 0; // targeting laser countdown
    this.isAiming = false;
    this.muzzleFlash = 0; // muzzle flash visual countdown
    this.cylinderAngle = 0; // revolver cylinder rotation
    this.hammerCocked = false;
  }

  activate(camX) {
    this.active = true;
    this.entering = true;
    this.x = camX + 850;
    sounds.playWarning();
  }

  update(dt, camX, player, bullets, particles, onDefeated) {
    if (!this.alive || !this.active) return;

    if (this.dying) {
      this.dyingTimer -= dt;
      if (Math.random() < 0.8) {
        sounds.playExplosion(Math.random() < 0.4);
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 280,
          (Math.random() - 0.5) * 280,
          Math.random() < 0.5 ? '#f39c12' : '#e74c3c',
          6,
          0.6
        ));
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          '#f1c40f',
          4,
          0.5
        ));
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 240,
          (Math.random() - 0.5) * 240,
          '#2c3e50',
          5,
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

    // Entrance slide animation
    if (this.entering) {
      this.x -= 140 * dt;
      if (this.x <= camX + 590) {
        this.x = camX + 590;
        this.entering = false;
      }
      return;
    }

    this.timer += dt;

    // Recoil recovery
    if (this.recoilX > 0) {
      this.recoilX = Math.max(0, this.recoilX - dt * 90);
    }
    if (this.muzzleFlash > 0) {
      this.muzzleFlash -= dt;
    }

    // Smooth vertical tracking of player with sine oscillation
    const targetY = Math.max(40, Math.min(320, player.y - 45));
    const trackSpeed = this.enraged ? 3.0 : 2.0;
    this.y += (targetY - this.y) * trackSpeed * dt;
    this.y += Math.sin(this.timer * (this.enraged ? 4.5 : 2.5)) * 1.5;

    // Check enrage state (< 50% HP)
    if (this.hp <= this.maxHp * 0.5 && !this.enraged) {
      this.enraged = true;
      this.bossName = '超級大手槍魔王 - 台中慶記號 [狂暴狂掃 200%]';
      sounds.playWarning();
      for (let i = 0; i < 40; i++) {
        particles.push(new Particle(
          this.x + 20,
          this.y + 40,
          (Math.random() - 0.5) * 360,
          (Math.random() - 0.5) * 360,
          Math.random() < 0.5 ? '#f39c12' : '#ff4757',
          5,
          0.6
        ));
      }
    }

    // Attacks
    this.attackTimer -= dt;
    if (this.attackTimer <= 0.4 && !this.hammerCocked) {
      this.hammerCocked = true;
    }
    if (this.attackTimer <= 0) {
      this.executeAttack(player, bullets, particles);
      this.hammerCocked = false;
      this.attackTimer = this.enraged ? 1.1 : 1.9;
    }
  }

  executeAttack(player, bullets, particles) {
    sounds.playEnemyLaser();
    const muzzleX = this.x - 10;
    const muzzleY = this.y + 36;

    this.recoilX = 22;
    this.muzzleFlash = 0.15;
    this.cylinderAngle += Math.PI / 3;

    // Smoke particles from barrel
    for (let i = 0; i < 8; i++) {
      particles.push(new Particle(
        muzzleX,
        muzzleY,
        -Math.random() * 80 - 40,
        (Math.random() - 0.5) * 40,
        'rgba(200, 200, 200, 0.7)',
        4,
        0.4
      ));
    }

    this.attackPhase = (this.attackPhase % 3) + 1;

    if (this.attackPhase === 1) {
      // 1. 慶記連環快槍 (Rapid Brass Stream)
      const count = this.enraged ? 7 : 5;
      const baseA = Math.atan2(player.y - muzzleY, player.x - muzzleX);
      for (let i = 0; i < count; i++) {
        const offset = ((i / (count - 1)) - 0.5) * 0.65;
        const a = baseA + offset;
        const speed = 230;
        bullets.push(new Bullet(muzzleX, muzzleY, Math.cos(a) * speed, Math.sin(a) * speed, true, 1, 'qingji'));
      }
    } else if (this.attackPhase === 2) {
      // 2. 左輪輪轉六連發 (Cylinder Radial Burst)
      const count = this.enraged ? 10 : 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + this.cylinderAngle;
        bullets.push(new Bullet(muzzleX, muzzleY, Math.cos(a) * 180, Math.sin(a) * 180, true, 1, 'qingji'));
      }
    } else {
      // 3. 紅外線雷射穿甲巨彈 (Laser Sniper Snipe)
      const aimA = Math.atan2(player.y - muzzleY, player.x - muzzleX);
      bullets.push(new Bullet(muzzleX, muzzleY, Math.cos(aimA) * 360, Math.sin(aimA) * 360, true, 2, 'sniper_bullet'));
      bullets.push(new Bullet(muzzleX, muzzleY, Math.cos(aimA + 0.22) * 220, Math.sin(aimA + 0.22) * 220, true, 1, 'qingji'));
      bullets.push(new Bullet(muzzleX, muzzleY, Math.cos(aimA - 0.22) * 220, Math.sin(aimA - 0.22) * 220, true, 1, 'qingji'));
    }
  }

  takeDamage(amount, particles) {
    if (!this.active || this.entering || this.dying) return false;
    this.hp -= amount;
    sounds.playHit();

    // Metallic sparks
    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(
        this.x + 20 + Math.random() * (this.w - 40),
        this.y + 20 + Math.random() * (this.h - 40),
        (Math.random() - 0.5) * 130,
        (Math.random() - 0.5) * 130,
        Math.random() < 0.5 ? '#f39c12' : '#bdc3c7',
        3.5,
        0.25
      ));
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.dyingTimer = 3.6;
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

    const muzzleX = 0;
    const muzzleY = 36;

    // 1. Red Laser Sight targeting beam pointing towards the left
    ctx.save();
    const flashAlpha = 0.35 + Math.sin(this.timer * 12) * 0.25;
    ctx.strokeStyle = this.enraged ? `rgba(255, 71, 87, ${flashAlpha + 0.3})` : `rgba(255, 71, 87, ${flashAlpha})`;
    ctx.lineWidth = this.enraged ? 2.5 : 1.5;
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(muzzleX, muzzleY + 8);
    ctx.lineTo(muzzleX - 580, muzzleY + 8);
    ctx.stroke();
    ctx.restore();

    // 2. Muzzle Flash Animation
    if (this.muzzleFlash > 0) {
      ctx.save();
      ctx.translate(muzzleX - 8, muzzleY);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#f39c12';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f1c40f';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + this.timer * 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
        ctx.lineTo(Math.cos(a + 0.3) * 10, Math.sin(a + 0.3) * 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Ergonomic Wood Grip Handle (木質握把)
    ctx.save();
    const gripGrad = ctx.createLinearGradient(120, 45, 175, 130);
    gripGrad.addColorStop(0, '#592512');
    gripGrad.addColorStop(0.5, '#78351b');
    gripGrad.addColorStop(1, '#3b180d');
    ctx.fillStyle = gripGrad;
    ctx.strokeStyle = '#2b1007';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(125, 45);
    ctx.bezierCurveTo(145, 45, 175, 70, 170, 125);
    ctx.lineTo(135, 125);
    ctx.bezierCurveTo(115, 95, 115, 70, 115, 60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Grip texture / checkering pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 5; g++) {
      ctx.beginPath();
      ctx.moveTo(125 + g * 8, 65);
      ctx.lineTo(135 + g * 6, 115);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Trigger & Trigger Guard (扳機與護弓)
    ctx.save();
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(105, 70, 15, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Trigger
    ctx.fillStyle = '#bdc3c7';
    ctx.beginPath();
    ctx.moveTo(112, 60);
    ctx.bezierCurveTo(110, 70, 105, 75, 100, 72);
    ctx.lineTo(105, 60);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5. Hammer (擊錘)
    ctx.save();
    ctx.fillStyle = '#7f8c8d';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const hammerAngle = this.hammerCocked ? 0.35 : -0.15;
    ctx.translate(145, 25);
    ctx.rotate(hammerAngle);
    ctx.rect(-6, -14, 12, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 6. Gun Body Slide & Barrel (滑套與槍管 - 含後座力偏移)
    ctx.save();
    ctx.translate(this.recoilX, 0);

    const slideGrad = ctx.createLinearGradient(0, 15, 0, 55);
    if (this.enraged) {
      slideGrad.addColorStop(0, '#7f1d1d');
      slideGrad.addColorStop(0.5, '#450a0a');
      slideGrad.addColorStop(1, '#1e1b4b');
    } else {
      slideGrad.addColorStop(0, '#95a5a6');
      slideGrad.addColorStop(0.3, '#7f8c8d');
      slideGrad.addColorStop(0.7, '#34495e');
      slideGrad.addColorStop(1, '#2c3e50');
    }

    ctx.fillStyle = slideGrad;
    ctx.strokeStyle = this.enraged ? '#ff4757' : '#bdc3c7';
    ctx.lineWidth = 2.5;

    // Main barrel & slide box
    ctx.fillRect(0, 15, 145, 42);
    ctx.strokeRect(0, 15, 145, 42);

    // Front barrel muzzle crown
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 22, 14, 28);
    ctx.strokeRect(0, 22, 14, 28);

    // Front & Rear Sights (準星與照門)
    ctx.fillStyle = this.enraged ? '#ff3838' : '#2ecc71';
    ctx.fillRect(8, 8, 8, 7);
    ctx.fillRect(135, 8, 8, 7);

    // Slide serrations (滑套防滑紋)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    for (let s = 0; s < 7; s++) {
      ctx.beginPath();
      ctx.moveTo(110 + s * 4, 18);
      ctx.lineTo(110 + s * 4, 52);
      ctx.stroke();
    }

    // Engraved Golden Title (慶記金字雕刻)
    ctx.save();
    ctx.fillStyle = '#f1c40f';
    ctx.shadowColor = '#f39c12';
    ctx.shadowBlur = 6;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ 慶記 SPECIAL ★', 65, 36);
    ctx.restore();

    // Ejection port (拋殼窗)
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(82, 18, 22, 12);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(85, 20, 16, 8);

    ctx.restore();

    // 7. Revolver Cylinder Accent (左輪彈巢 / 慶記能量核心)
    ctx.save();
    ctx.translate(115, 36);
    ctx.rotate(this.cylinderAngle);
    ctx.fillStyle = '#2c3e50';
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 6 Chamber bullet tips
    for (let c = 0; c < 6; c++) {
      const a = (c / 6) * Math.PI * 2;
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 8. Title Label Above Boss
    ctx.fillStyle = this.enraged ? '#ff4757' : '#f1c40f';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ 台中特產 · 超級大手槍 ★', this.w / 2, 2);

    ctx.restore();
  }
}

// Stage 5 Boss: 超大巨無霸客機 - 桃園之翼號 (GIANT JUMBO JET AIRLINER BOSS)
export class GiantAirlinerBoss {
  constructor(r, c) {
    this.targetX = c * TILE_SIZE - 40;
    this.x = this.targetX + 350;
    this.y = r * TILE_SIZE - 25;
    this.w = 230;
    this.h = 145;
    this.maxHp = 250;
    this.hp = 250;
    this.alive = true;
    this.active = false;
    this.entering = false;
    this.baseY = this.y;
    this.timer = 0;
    this.attackTimer = 1.6;
    this.attackPhase = 1;
    this.enraged = false;
    this.dying = false;
    this.dyingTimer = 3.8;
    this.scoreValue = 12000;
    this.bossName = '超大巨無霸客機 - 桃園之翼號';

    this.engines = [
      { x: 30, y: 35 },
      { x: 60, y: 55 },
      { x: 60, y: 90 },
      { x: 30, y: 110 }
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

    if (this.dying) {
      this.dyingTimer -= dt;
      if (Math.random() < 0.85) {
        sounds.playExplosion(Math.random() < 0.4);
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 300,
          (Math.random() - 0.5) * 300,
          Math.random() < 0.5 ? '#00f2fe' : '#ff4757',
          6,
          0.65
        ));
        particles.push(new Particle(
          this.x + Math.random() * this.w,
          this.y + Math.random() * this.h,
          (Math.random() - 0.5) * 220,
          (Math.random() - 0.5) * 220,
          '#ffffff',
          4,
          0.5
        ));
      }
      if (this.dyingTimer <= 0) {
        this.alive = false;
        sounds.playVictory();
        if (onDefeated) onDefeated();
      }
      return;
    }

    // Entrance slide animation
    if (this.entering) {
      this.x -= 140 * dt;
      if (this.x <= camX + 570) {
        this.x = camX + 570;
        this.entering = false;
      }
      return;
    }

    this.timer += dt;

    // Aerodynamic flight heave oscillation
    const heaveSpeed = this.enraged ? 2.6 : 1.8;
    this.y = this.baseY + Math.sin(this.timer * heaveSpeed) * 45;

    // Turbofan jet engine trails
    if (Math.random() < 0.6) {
      for (const eng of this.engines) {
        particles.push(new Particle(
          this.x + eng.x,
          this.y + eng.y,
          -Math.random() * 80 - 60,
          (Math.random() - 0.5) * 15,
          this.enraged ? '#ff4757' : '#00d2d3',
          3.5,
          0.3
        ));
      }
    }

    // Check enrage state (< 50% HP)
    if (this.hp <= this.maxHp * 0.5 && !this.enraged) {
      this.enraged = true;
      this.bossName = '超大巨無霸客機 - 桃園之翼號 [滿載超音速 200%]';
      sounds.playWarning();
      for (let i = 0; i < 45; i++) {
        particles.push(new Particle(
          this.x + 30,
          this.y + 70,
          (Math.random() - 0.5) * 380,
          (Math.random() - 0.5) * 380,
          Math.random() < 0.5 ? '#00f2fe' : '#eb4d4b',
          5.5,
          0.7
        ));
      }
    }

    // Attacks
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.executeAttack(player, bullets, particles);
      this.attackTimer = this.enraged ? 1.1 : 1.8;
    }
  }

  executeAttack(player, bullets, particles) {
    sounds.playEnemyLaser();
    this.attackPhase = (this.attackPhase % 3) + 1;

    if (this.attackPhase === 1) {
      // 1. 四聯渦輪渦流噴射 (Quad Turbofan Vortex Jet)
      for (const eng of this.engines) {
        const muzzleX = this.x + eng.x;
        const muzzleY = this.y + eng.y;
        const a = Math.atan2(player.y - muzzleY, player.x - muzzleX);
        bullets.push(new Bullet(muzzleX, muzzleY, Math.cos(a) * 230, Math.sin(a) * 230, true, 1, 'turbo_ring'));
      }
    } else if (this.attackPhase === 2) {
      // 2. 跑道導航導引光球矩陣 (Runway Beacon Matrix)
      const count = this.enraged ? 8 : 6;
      for (let i = 0; i < count; i++) {
        const offset = ((i / (count - 1)) - 0.5) * 0.9;
        const a = Math.PI + offset;
        const speed = 190;
        bullets.push(new Bullet(this.x + 20, this.y + 70, Math.cos(a) * speed, Math.sin(a) * speed, true, 1, 'beacon'));
      }
    } else {
      // 3. 超音速穿透巡航 (Supersonic Flak Stream)
      const noseX = this.x - 10;
      const noseY = this.y + 70;
      const aimA = Math.atan2(player.y - noseY, player.x - noseX);
      bullets.push(new Bullet(noseX, noseY, Math.cos(aimA) * 350, Math.sin(aimA) * 350, true, 2, 'turbo_ring'));
      bullets.push(new Bullet(noseX, noseY, Math.cos(aimA + 0.25) * 220, Math.sin(aimA + 0.25) * 220, true, 1, 'beacon'));
      bullets.push(new Bullet(noseX, noseY, Math.cos(aimA - 0.25) * 220, Math.sin(aimA - 0.25) * 220, true, 1, 'beacon'));
    }
  }

  takeDamage(amount, particles) {
    if (!this.active || this.entering || this.dying) return false;
    this.hp -= amount;
    sounds.playHit();

    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(
        this.x + 20 + Math.random() * (this.w - 40),
        this.y + 20 + Math.random() * (this.h - 40),
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 120,
        Math.random() < 0.5 ? '#00f2fe' : '#ffffff',
        3.5,
        0.25
      ));
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = true;
      this.dyingTimer = 3.8;
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

    const pitch = Math.sin(this.timer * 1.8) * 0.04;
    ctx.rotate(pitch);

    // 1. Jet Engine Exhaust Flames & Trails
    for (const eng of this.engines) {
      ctx.save();
      ctx.translate(eng.x, eng.y);
      const flameLen = this.enraged ? 28 : 18;
      const fGrad = ctx.createLinearGradient(0, 0, -flameLen, 0);
      if (this.enraged) {
        fGrad.addColorStop(0, '#ffffff');
        fGrad.addColorStop(0.3, '#ffa502');
        fGrad.addColorStop(1, 'rgba(255, 71, 87, 0)');
      } else {
        fGrad.addColorStop(0, '#ffffff');
        fGrad.addColorStop(0.3, '#00f2fe');
        fGrad.addColorStop(1, 'rgba(0, 210, 211, 0)');
      }
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-flameLen, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. Wings (Swept-back Jet Wings)
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 70);
    ctx.lineTo(150, 15);
    ctx.lineTo(190, 25);
    ctx.lineTo(120, 70);
    ctx.lineTo(190, 120);
    ctx.lineTo(150, 130);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. 4 Turbofan Pods
    for (const eng of this.engines) {
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(eng.x - 12, eng.y - 8, 26, 16, 4);
      ctx.fill();
      ctx.stroke();

      // Turbine spinner core
      ctx.fillStyle = this.enraged ? '#ff4757' : '#00f2fe';
      ctx.beginPath();
      ctx.arc(eng.x - 12, eng.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Main Jumbo Jet Fuselage (Boeing 747 Double-deck Hump)
    ctx.save();
    ctx.shadowColor = this.enraged ? 'rgba(255, 71, 87, 0.6)' : 'rgba(0, 242, 254, 0.45)';
    ctx.shadowBlur = 16;

    const fuseGrad = ctx.createLinearGradient(0, 40, 0, 100);
    fuseGrad.addColorStop(0, '#ffffff');
    fuseGrad.addColorStop(0.4, '#f1f5f9');
    fuseGrad.addColorStop(0.8, '#e2e8f0');
    fuseGrad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = fuseGrad;
    ctx.strokeStyle = this.enraged ? '#ff4757' : '#00d2d3';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Nose cone pointing left
    ctx.moveTo(10, 72);
    ctx.bezierCurveTo(15, 55, 45, 42, 85, 42); // Upper deck hump
    ctx.lineTo(200, 48); // Tail top
    ctx.lineTo(225, 20); // Vertical stabilizer tip
    ctx.lineTo(225, 95); // Tail bottom
    ctx.lineTo(170, 95);
    ctx.bezierCurveTo(100, 95, 30, 85, 10, 72); // Underside
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Airline Livery Ribbons (紅藍翱翔彩帶)
    ctx.fillStyle = '#eb4d4b';
    ctx.beginPath();
    ctx.moveTo(25, 70);
    ctx.lineTo(200, 68);
    ctx.lineTo(195, 74);
    ctx.lineTo(25, 76);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e3799';
    ctx.beginPath();
    ctx.moveTo(35, 76);
    ctx.lineTo(195, 74);
    ctx.lineTo(190, 80);
    ctx.lineTo(35, 82);
    ctx.closePath();
    ctx.fill();

    // 6. Cockpit Windshield (座艙擋風玻璃)
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(22, 58);
    ctx.lineTo(38, 52);
    ctx.lineTo(40, 58);
    ctx.lineTo(26, 64);
    ctx.closePath();
    ctx.fill();

    // Upper & Lower Passenger Windows
    ctx.fillStyle = '#334155';
    ctx.shadowBlur = 0;
    for (let w = 0; w < 12; w++) {
      ctx.fillRect(50 + w * 11, 56, 5, 5); // Upper deck
      ctx.fillRect(40 + w * 12, 64, 5, 5); // Main deck
    }

    // 7. Tail Plum Blossom Crest (尾翼梅花標誌)
    ctx.save();
    ctx.translate(212, 38);
    ctx.fillStyle = '#eb4d4b';
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fbc531';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 8. Title Banner Above Airliner
    ctx.fillStyle = this.enraged ? '#ff4757' : '#00f2fe';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★ 桃園航空城 · 巨無霸客機 ★', this.w / 2, 8);

    ctx.restore();
  }
}
