import { checkCollision } from "./utils.js";

class BaseBullet {
  constructor(
    x,
    y,
    dx,
    dy,
    size,
    damage,
    isPiercing = false,
    color = "#ffff00"
  ) {
    this.x = x;
    this.y = y;
    this.speedX = dx;
    this.speedY = dy;
    this.size = size;
    this.damage = damage;
    this.isPiercing = isPiercing;
    this.color = color;
    this.id = Date.now() + Math.random();
    this.hitEnemies = [];
    this.createdTime = Date.now();
  }

  update(canvas) {
    this.x += this.speedX;
    this.y += this.speedY;
    return true;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    if (this.isPiercing) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x - this.speedX * 2, this.y - this.speedY * 2);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }
  }
}

class Bullet extends BaseBullet {
  constructor(
    x,
    y,
    dx,
    dy,
    size,
    damage,
    isPiercing = false,
    color = "#ffff00"
  ) {
    super(x, y, dx, dy, size, damage, isPiercing, color);
  }
}

class RicochetBullet extends BaseBullet {
  constructor(sourceEnemy, targetEnemy, size, damage, effects) {
    // 시작 위치를 적으로부터 약간 떨어진 곳으로 설정
    const offset = 30; // 시작 오프셋을 30픽셀로 증가
    const angle = Math.atan2(
      targetEnemy.y - sourceEnemy.y,
      targetEnemy.x - sourceEnemy.x
    );
    const startX = sourceEnemy.x + Math.cos(angle) * offset;
    const startY = sourceEnemy.y + Math.sin(angle) * offset;

    super(startX, startY, 0, 0, size, damage * 0.8, false, "#50ff50");
    this.targetEnemy = targetEnemy;
    this.maxBounces = effects.clover?.count >= 3 ? 5 : 0;
    this.bounceCount = 0;
    this.speed = 3.0;
    this.effects = effects;
    this.hitEnemies = [sourceEnemy.id]; // 시작할 때 원래 맞은 적을 히트 목록에 추가

    // 초기 방향 설정
    this.updateDirection();

    console.log("도탄 총알 생성:", {
      position: { x: this.x, y: this.y },
      target: { x: targetEnemy.x, y: targetEnemy.y },
      speed: this.speed,
      sourceEnemyId: sourceEnemy.id,
    });
  }

  updateDirection() {
    if (this.targetEnemy && !this.targetEnemy.isDead) {
      const dx = this.targetEnemy.x - this.x;
      const dy = this.targetEnemy.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        this.speedX = (dx / distance) * this.speed;
        this.speedY = (dy / distance) * this.speed;
      }
    }
  }

  update(canvas) {
    this.updateDirection();
    super.update(canvas);

    console.log("도탄 총알 위치 업데이트:", {
      position: { x: this.x, y: this.y },
      speed: { x: this.speedX, y: this.speedY },
    });
    return true;
  }

  draw(ctx) {
    super.draw(ctx);
    // 도탄 총알 외곽선 추가
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  handleBounce(canvas) {
    const margin = 20;
    let bounced = false;

    if (this.x < margin || this.x > canvas.width - margin) {
      this.speedX *= -1;
      bounced = true;
    }
    if (this.y < margin || this.y > canvas.height - margin) {
      this.speedY *= -1;
      bounced = true;
    }

    if (bounced) {
      this.bounceCount++;
      console.log("도탄 총알 바운스:", {
        bounceCount: this.bounceCount,
        position: { x: this.x, y: this.y },
        newSpeed: { x: this.speedX, y: this.speedY },
      });
    }

    return this.bounceCount < this.maxBounces;
  }
}

export class BulletManager {
  constructor() {
    this.bullets = [];
    this.ricochetBullets = [];
    this.ui = null;
  }

  setUI(ui) {
    this.ui = ui;
  }

  createBullet(
    x,
    y,
    dx,
    dy,
    size,
    damage,
    isPiercing = false,
    color = "#ffff00",
    effects = null,
    isRicochet = false
  ) {
    const bullet = new Bullet(
      x,
      y,
      dx,
      dy,
      size,
      damage,
      isPiercing,
      color,
      effects,
      isRicochet
    );
    this.bullets.push(bullet);
    return bullet;
  }

  createBasicBullet(config) {
    return this.createBullet(
      config.x,
      config.y,
      config.dx * 5.6,
      config.dy * 5.6,
      5,
      config.damage,
      false,
      "#ffff00",
      config.effects,
      false
    );
  }

  createDualBullet(config) {
    const offset = 10;
    this.createBullet(
      config.x - offset,
      config.y,
      config.dx * 5.6,
      config.dy * 5.6,
      5,
      config.damage,
      false,
      "#ffff00",
      config.effects,
      false
    );
    this.createBullet(
      config.x + offset,
      config.y,
      config.dx * 5.6,
      config.dy * 5.6,
      5,
      config.damage,
      false,
      "#ffff00",
      config.effects,
      false
    );
  }

  createDoubleDualBullet(config) {
    const offset = 10;
    const shots = [
      { x: -offset, delay: 0 },
      { x: offset, delay: 0 },
      { x: -offset, delay: 150 },
      { x: offset, delay: 150 },
    ];

    shots.forEach((shot) => {
      setTimeout(() => {
        if (!config.isGameOver) {
          this.createBullet(
            config.x + shot.x,
            config.y,
            config.dx * 5.6,
            config.dy * 5.6,
            5,
            config.damage,
            false,
            "#ffff00",
            config.effects,
            false
          );
        }
      }, shot.delay);
    });
  }

  createTripleShotgun(config) {
    const angles = [-0.3, 0, 0.3];
    angles.forEach((angle) => {
      const rotatedDx =
        config.dx * Math.cos(angle) - config.dy * Math.sin(angle);
      const rotatedDy =
        config.dx * Math.sin(angle) + config.dy * Math.cos(angle);
      this.createBullet(
        config.x,
        config.y,
        rotatedDx * 5.6,
        rotatedDy * 5.6,
        5,
        config.damage,
        false,
        "#ffff00",
        config.effects,
        false
      );
    });
  }

  createLaserRailgun(config) {
    this.createBullet(
      config.x,
      config.y,
      config.dx * 5.6,
      config.dy * 5.6,
      3,
      config.damage,
      true,
      "#00ffff",
      config.effects,
      false
    );
  }

  createShotgunPistolCombo(config) {
    // 샷건 부분
    for (let i = 0; i < 5; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const rotatedDx =
        config.dx * Math.cos(spread) - config.dy * Math.sin(spread);
      const rotatedDy =
        config.dx * Math.sin(spread) + config.dy * Math.cos(spread);
      this.createBullet(
        config.x,
        config.y,
        rotatedDx * 5.6,
        rotatedDy * 5.6,
        4,
        config.damage * 0.5,
        false,
        "#ffff00",
        config.effects,
        false
      );
    }
    // 정확한 단발
    this.createBullet(
      config.x,
      config.y,
      config.dx * 5.6,
      config.dy * 5.6,
      6,
      config.damage,
      false,
      "#ffff00",
      config.effects,
      false
    );
  }

  createPlasmaCannon(config) {
    this.createBullet(
      config.x,
      config.y,
      config.dx * 5.6,
      config.dy * 5.6,
      12,
      config.damage,
      false,
      "#ff00ff",
      config.effects,
      false
    );
  }

  createQuadRocketLauncher(config) {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!config.isGameOver) {
          this.createBullet(
            config.x,
            config.y,
            config.dx * 5.6,
            config.dy * 5.6,
            8,
            config.damage,
            false,
            "#ff4400",
            config.effects,
            false
          );
        }
      }, i * 100);
    }
  }

  createLaserGatling(config) {
    for (let i = 0; i < 8; i++) {
      const spread = (Math.random() - 0.5) * 0.2;
      const rotatedDx =
        config.dx * Math.cos(spread) - config.dy * Math.sin(spread);
      const rotatedDy =
        config.dx * Math.sin(spread) + config.dy * Math.cos(spread);
      this.createBullet(
        config.x,
        config.y,
        rotatedDx * 5.6,
        rotatedDy * 5.6,
        4,
        config.damage * 0.5,
        true,
        "#ff0000",
        config.effects,
        false
      );
    }
  }

  createOrbitalLaserStrike(config) {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      this.createBullet(
        config.x,
        config.y,
        Math.cos(angle) * 5.6,
        Math.sin(angle) * 5.6,
        6,
        config.damage * 0.8,
        true,
        "#ffff00",
        config.effects,
        false
      );
    }
  }

  updateBullets(canvas, enemies, effects) {
    const currentEffects = JSON.parse(JSON.stringify(effects));

    // 일반 총알 업데이트
    this.bullets = this.bullets.filter((bullet) => {
      bullet.update(canvas);

      if (this.isOutOfBounds(bullet, canvas)) {
        return false;
      }

      return !this.checkBulletCollisions(bullet, enemies, currentEffects);
    });

    // 도탄 총알 업데이트
    this.ricochetBullets = this.ricochetBullets.filter((bullet) => {
      bullet.update(canvas);

      // 화면 밖 체크
      if (this.isOutOfBounds(bullet, canvas)) {
        if (
          currentEffects.clover.count >= 3 &&
          bullet.bounceCount < bullet.maxBounces
        ) {
          return bullet.handleBounce(canvas);
        }
        return false;
      }

      return !this.checkBulletCollisions(bullet, enemies, currentEffects);
    });

    console.log("현재 도탄 총알 개수:", this.ricochetBullets.length);
  }

  isOutOfBounds(bullet, canvas) {
    const margin = 100;
    return (
      bullet.x < -margin ||
      bullet.x > canvas.width + margin ||
      bullet.y < -margin ||
      bullet.y > canvas.height + margin
    );
  }

  checkBulletCollisions(bullet, enemies, effects) {
    let hasHit = false;

    enemies.forEach((enemy) => {
      if (!enemy.isDead && !bullet.hitEnemies.includes(enemy.id)) {
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (bullet.size + enemy.size) / 2) {
          // 데미지 계산 및 적용
          const finalDamage = this.calculateDamage(bullet, enemy, effects);
          this.applyDamage(bullet, enemy, finalDamage, effects);

          // 도탄 효과 처리
          if (
            !bullet.constructor.name.includes("Ricochet") &&
            effects.clover.count >= 1
          ) {
            this.handleRicochet(enemy, enemies, bullet, effects);
          }

          hasHit = !bullet.isPiercing;
        }
      }
    });

    return hasHit;
  }

  calculateDamage(bullet, enemy, effects) {
    let finalDamage = bullet.damage;

    if (effects.spade.count >= 1) finalDamage *= 1.25;
    if (effects.spade.count >= 2 && bullet.isPiercing) finalDamage *= 1.15;
    if (effects.spade.count >= 3 && Math.random() < 0.3) finalDamage *= 2;
    if (effects.diamond.count >= 4) finalDamage *= 1.3;

    return finalDamage;
  }

  applyDamage(bullet, enemy, damage, effects) {
    // 다이아몬드 효과 적용
    if (effects.diamond.count >= 1) enemy.speed *= 0.7;
    if (effects.diamond.count >= 2) enemy.stunEndTime = Date.now() + 1000;

    // 데미지 적용
    enemy.hp -= damage;
    bullet.hitEnemies.push(enemy.id);

    // 데미지 텍스트 표시
    if (this.ui) {
      const damageColor = bullet.constructor.name.includes("Ricochet")
        ? "#50ff50"
        : "#ffffff";
      this.ui.addDamageText(enemy.x, enemy.y - enemy.size, damage, damageColor);
    }

    // 적 처치 체크
    if (enemy.hp <= 0) {
      enemy.isDead = true;
      if (effects.clover.count >= 2) {
        const radius = effects.clover.count >= 4 ? 100 : 50;
        this.createExplosion(
          enemy.x,
          enemy.y,
          radius,
          damage * 0.5,
          enemies,
          effects
        );
      }
    }
  }

  createExplosion(x, y, radius, damage, enemies, effects) {
    enemies.forEach((enemy) => {
      if (!enemy.isDead && !enemy.isAlly) {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < radius) {
          const damageMultiplier = 1 - distance / radius;
          const explosionDamage = damage * damageMultiplier;

          enemy.hp -= explosionDamage;

          // 다이아몬드 범위 감속 효과
          if (effects.diamond.count >= 3) {
            enemy.speed *= 0.7;
          }

          if (enemy.hp <= 0) {
            enemy.isDead = true;

            // 클로버 2차 폭발
            if (effects.clover.count >= 4) {
              this.createExplosion(
                enemy.x,
                enemy.y,
                radius * 0.5,
                damage * 0.5,
                enemies,
                effects
              );
            }
          }
        }
      }
    });
  }

  drawBullets(ctx) {
    [...this.bullets, ...this.ricochetBullets].forEach((bullet) =>
      bullet.draw(ctx)
    );
  }

  handleRicochet(sourceEnemy, enemies, sourceBullet, effects) {
    const ricochetChance = effects.clover.ricochetChance;
    const roll = Math.random();

    console.log("Ricochet chance check:", {
      chance: ricochetChance,
      roll: roll,
      willRicochet: roll < ricochetChance,
    });

    if (roll < ricochetChance) {
      // 주변 적 찾을 때 현재 맞은 적을 제외하고 가장 가까운 적을 찾도록 수정
      const nearbyEnemies = enemies.filter(
        (e) =>
          !e.isDead &&
          !e.isAlly &&
          e !== sourceEnemy &&
          !sourceBullet.hitEnemies.includes(e.id) && // 이미 맞은 적 제외
          Math.sqrt(
            Math.pow(e.x - sourceEnemy.x, 2) + Math.pow(e.y - sourceEnemy.y, 2)
          ) <= 300
      );

      console.log("찾은 주변 적 수:", nearbyEnemies.length);

      if (nearbyEnemies.length > 0) {
        // 가장 가까운 적을 목표로 선택
        const target = nearbyEnemies.reduce((closest, current) => {
          const closestDist = Math.sqrt(
            Math.pow(closest.x - sourceEnemy.x, 2) +
              Math.pow(closest.y - sourceEnemy.y, 2)
          );
          const currentDist = Math.sqrt(
            Math.pow(current.x - sourceEnemy.x, 2) +
              Math.pow(current.y - sourceEnemy.y, 2)
          );
          return currentDist < closestDist ? current : closest;
        });

        console.log("도탄 목표 적 위치:", { x: target.x, y: target.y });

        const ricochetBullet = new RicochetBullet(
          sourceEnemy,
          target,
          sourceBullet.size,
          sourceBullet.damage,
          effects
        );

        this.ricochetBullets.push(ricochetBullet);
      }
    }
  }
}
