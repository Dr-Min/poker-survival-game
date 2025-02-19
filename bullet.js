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
  constructor(
    sourceEnemy,
    targetEnemy,
    size,
    damage,
    effects,
    bounceCount = 0
  ) {
    // 시작 위치를 적으로부터 약간 떨어진 곳으로 설정
    const offset = 30;
    const angle = Math.atan2(
      targetEnemy.y - sourceEnemy.y,
      targetEnemy.x - sourceEnemy.x
    );
    const startX = sourceEnemy.x + Math.cos(angle) * offset;
    const startY = sourceEnemy.y + Math.sin(angle) * offset;

    super(startX, startY, 0, 0, size, damage * 0.8, true, "#50ff50");
    this.targetEnemy = targetEnemy;
    this.bounceCount = bounceCount;
    this.speed = 6.0;
    this.effects = effects;
    this.hitEnemies = [sourceEnemy.id];
    this.lastHitTime = 0;

    // 초기 방향 설정
    this.updateDirection();

    console.log("도탄 총알 생성:", {
      position: { x: this.x, y: this.y },
      target: { x: targetEnemy.x, y: targetEnemy.y },
      speed: this.speed,
      sourceEnemyId: sourceEnemy.id,
      bounceCount: this.bounceCount,
      maxBounces: effects.clover.count >= 3 ? 3 : 1,
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

    // 타겟 적과의 거리 체크
    if (this.targetEnemy && !this.targetEnemy.isDead) {
      const dx = this.targetEnemy.x - this.x;
      const dy = this.targetEnemy.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 적과 충분히 가까워지면 다음 도탄 준비
      if (distance < 5) {
        this.hitEnemies.push(this.targetEnemy.id);
        return false;
      }
    }

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
    // 벽 바운스 제거 (적에서 적으로만 튕기도록)
    return true;
  }
}

class ExplosionAnimation {
  constructor(x, y, radius, color = "#ff6600") {
    this.x = x;
    this.y = y;
    this.maxRadius = radius;
    this.currentRadius = 0;
    this.alpha = 1;
    this.color = color;
    this.duration = 500; // 애니메이션 지속 시간 (ms)
    this.startTime = Date.now();
    this.finished = false;
  }

  update() {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);

    this.currentRadius = this.maxRadius * Math.sin(progress * Math.PI);
    this.alpha = 1 - progress;

    if (progress >= 1) {
      this.finished = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;

    // 외부 원
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // 내부 원
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.restore();
  }
}

export class BulletManager {
  constructor() {
    this.bullets = [];
    this.ricochetBullets = [];
    this.explosionAnimations = [];
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
          this.applyDamage(bullet, enemy, finalDamage, effects, enemies);

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

  applyDamage(bullet, enemy, damage, effects, enemies) {
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

    // 도탄 총알이 적을 맞췄을 때 다음 도탄 생성
    if (bullet.constructor.name.includes("Ricochet")) {
      // 클로버 3개 이상일 때는 무조건 3번 튕김
      if (effects.clover.count >= 3 && bullet.bounceCount < 2) {
        console.log("도탄 연쇄 진행상황:", {
          currentBounce: bullet.bounceCount,
          maxBounce: 3,
          remainingBounces: 3 - bullet.bounceCount,
          bulletId: bullet.id,
          hitEnemies: bullet.hitEnemies.length,
          enemyPosition: { x: enemy.x, y: enemy.y },
        });
        this.createNextRicochet(
          enemy,
          enemies,
          bullet,
          effects,
          bullet.bounceCount + 1
        );
      }
    }

    // 도탄 총알이 맞았을 때 30% 확률로 폭발
    if (bullet.constructor.name.includes("Ricochet") && Math.random() < 0.3) {
      console.log("도탄 폭발 발생:", {
        position: { x: enemy.x, y: enemy.y },
        radius: effects.clover.count >= 4 ? 100 : 50,
        damage: damage,
        bulletId: bullet.id,
        bounceCount: bullet.bounceCount,
      });

      const radius = effects.clover.count >= 4 ? 100 : 50;
      const affectedEnemies = this.createExplosion(
        enemy.x,
        enemy.y,
        radius,
        damage,
        enemies,
        effects
      );

      console.log("폭발 영향받은 적 수:", affectedEnemies.length);
    }

    // 적 처치 체크
    if (enemy.hp <= 0) {
      enemy.isDead = true;
      console.log("적 처치됨:", {
        enemyId: enemy.id,
        position: { x: enemy.x, y: enemy.y },
        cloverCount: effects.clover.count,
        byRicochet: bullet.constructor.name.includes("Ricochet"),
        bulletId: bullet.id,
        bounceCount: bullet.bounceCount,
      });
    }
  }

  createExplosion(x, y, radius, damage, enemies, effects) {
    // 폭발 애니메이션 생성
    const explosionColor = effects.clover.count >= 4 ? "#50ff50" : "#ff6600";
    this.explosionAnimations.push(
      new ExplosionAnimation(x, y, radius, explosionColor)
    );

    // 폭발 효과를 받은 적들을 추적
    const affectedEnemies = [];

    console.log("폭발 생성:", {
      position: { x, y },
      radius,
      damage,
      totalEnemies: enemies.length,
    });

    enemies.forEach((enemy) => {
      if (!enemy.isDead && !enemy.isAlly) {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < radius) {
          // 폭발 중심으로부터의 방향 계산
          const angle = Math.atan2(dy, dx);
          const knockbackDistance = (radius - distance) * 2; // 넉백 거리 4배 증가

          const oldPos = { x: enemy.x, y: enemy.y };

          // 넉백 적용
          enemy.x += Math.cos(angle) * knockbackDistance;
          enemy.y += Math.sin(angle) * knockbackDistance;

          // 화면 경계 체크
          enemy.x = Math.max(enemy.size, Math.min(1200 - enemy.size, enemy.x));
          enemy.y = Math.max(enemy.size, Math.min(800 - enemy.size, enemy.y));

          const damageMultiplier = Math.max(0.5, 1 - distance / radius); // 최소 데미지를 50%로 설정
          const explosionDamage = damage * damageMultiplier;

          console.log("적 폭발 영향받음:", {
            enemyId: enemy.id,
            distance,
            knockback: {
              from: oldPos,
              to: { x: enemy.x, y: enemy.y },
              distance: knockbackDistance,
            },
            damage: explosionDamage,
          });

          enemy.hp -= explosionDamage;
          affectedEnemies.push(enemy);

          // 다이아몬드 범위 감속 효과
          if (effects.diamond.count >= 3) {
            enemy.speed *= 0.7;
          }

          if (enemy.hp <= 0) {
            enemy.isDead = true;

            // 클로버 2차 폭발
            if (effects.clover.count >= 4) {
              console.log("2차 폭발 발생:", {
                position: { x: enemy.x, y: enemy.y },
                radius: radius * 0.5,
                damage: damage * 0.5,
              });

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

    return affectedEnemies;
  }

  drawBullets(ctx) {
    [...this.bullets, ...this.ricochetBullets].forEach((bullet) =>
      bullet.draw(ctx)
    );

    // 폭발 애니메이션 업데이트 및 그리기
    this.explosionAnimations = this.explosionAnimations.filter((explosion) => {
      explosion.update();
      explosion.draw(ctx);
      return !explosion.finished;
    });
  }

  handleRicochet(sourceEnemy, enemies, sourceBullet, effects) {
    const ricochetChance = effects.clover.ricochetChance;
    const roll = Math.random();

    console.log("Ricochet chance check:", {
      chance: ricochetChance,
      roll: roll,
      willRicochet: roll < ricochetChance,
    });

    // 30% 확률로 도탄 발생
    if (roll < ricochetChance) {
      // 첫 번째 도탄 생성
      this.createNextRicochet(sourceEnemy, enemies, sourceBullet, effects, 0);
    }
  }

  createNextRicochet(
    sourceEnemy,
    enemies,
    sourceBullet,
    effects,
    currentBounceCount
  ) {
    // 주변 적 찾기 (이미 맞은 적 제외)
    const searchRadius = 500; // 도탄 범위 500으로 증가
    const nearbyEnemies = enemies.filter(
      (e) =>
        !e.isDead &&
        !e.isAlly &&
        e !== sourceEnemy &&
        !sourceBullet.hitEnemies.includes(e.id) &&
        Math.sqrt(
          Math.pow(e.x - sourceEnemy.x, 2) + Math.pow(e.y - sourceEnemy.y, 2)
        ) <= searchRadius
    );

    console.log("도탄 검색 정보:", {
      bounceNumber: currentBounceCount + 1,
      maxBounces: effects.clover.count >= 3 ? 3 : 1,
      searchRadius,
      sourcePosition: { x: sourceEnemy.x, y: sourceEnemy.y },
      foundEnemies: nearbyEnemies.length,
      totalHitEnemies: sourceBullet.hitEnemies.length,
    });

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

      console.log("도탄 목표 선택:", {
        targetPosition: { x: target.x, y: target.y },
        distance: Math.sqrt(
          Math.pow(target.x - sourceEnemy.x, 2) +
            Math.pow(target.y - sourceEnemy.y, 2)
        ),
        currentBounce: currentBounceCount,
        nextBounce: currentBounceCount + 1,
      });

      const ricochetBullet = new RicochetBullet(
        sourceEnemy,
        target,
        sourceBullet.size,
        sourceBullet.damage,
        effects,
        currentBounceCount
      );

      // 도탄 총알에 원본 총알의 hitEnemies 복사
      ricochetBullet.hitEnemies = [...sourceBullet.hitEnemies];
      this.ricochetBullets.push(ricochetBullet);
    } else {
      console.log("도탄 실패:", {
        reason: "범위 내 적 없음",
        searchRadius,
        position: { x: sourceEnemy.x, y: sourceEnemy.y },
        currentBounce: currentBounceCount,
        maxBounces: effects.clover.count >= 3 ? 3 : 1,
      });
    }
  }

  clearBullets() {
    this.bullets = [];
    this.ricochetBullets = [];
    this.explosionAnimations = [];
    console.log("모든 총알 초기화 완료");
  }
}
