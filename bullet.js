import { checkCollision } from "./utils.js";

export class Bullet {
  constructor(
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
    this.isRicochet = isRicochet;
    this.bounceCount = 0;
    this.createdTime = Date.now();
    this.effects = effects;
  }

  update(canvas) {
    this.x += this.speedX;
    this.y += this.speedY;

    // 화면 경계 체크
    if (
      this.x < 0 ||
      this.x > canvas.width ||
      this.y < 0 ||
      this.y > canvas.height
    ) {
      return false;
    }

    return true;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // 도탄 총알에 외곽선 추가
    if (this.isRicochet) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 관통 총알 궤적
    if (this.isPiercing) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x - this.speedX * 2, this.y - this.speedY * 2);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }
  }

  handleBounce(canvas) {
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    this.bounceCount++;
    return this.bounceCount < 5;
  }
}

export class BulletManager {
  constructor() {
    this.bullets = [];
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
      config.effects
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
      config.effects
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
      config.effects
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
            config.effects
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
        config.effects
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
      config.effects
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
        config.effects
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
      config.effects
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
      config.effects
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
            config.effects
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
        config.effects
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
        config.effects
      );
    }
  }

  updateBullets(canvas, enemies, effects) {
    // 디버깅: effects 객체 확인
    console.log("Effects in updateBullets:", effects);

    this.bullets = this.bullets.filter((bullet) => {
      // 화면 밖으로 나가면 제거 또는 바운스
      if (
        bullet.x < 0 ||
        bullet.x > canvas.width ||
        bullet.y < 0 ||
        bullet.y > canvas.height
      ) {
        if (
          bullet.isRicochet &&
          effects.clover.count >= 3 &&
          bullet.bounceCount < 5
        ) {
          return bullet.handleBounce(canvas);
        }
        return false;
      }

      // 적과의 충돌 체크
      let hasHit = false;
      enemies.forEach((enemy) => {
        if (!enemy.isDead && !bullet.hitEnemies.includes(enemy.id)) {
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < (bullet.size + enemy.size) / 2) {
            // 디버깅: 충돌 발생 시 상태 확인
            console.log("Bullet hit enemy:", {
              bulletIsRicochet: bullet.isRicochet,
              cloverCount: effects.clover.count,
              cloverRicochetChance: effects.clover.ricochetChance,
            });

            // 데미지 계산
            let finalDamage = bullet.damage;

            // 스페이드 효과 적용
            if (effects.spade.count >= 1) finalDamage *= 1.25;
            if (effects.spade.count >= 2 && bullet.isPiercing)
              finalDamage *= 1.15;
            if (effects.spade.count >= 3 && Math.random() < 0.3)
              finalDamage *= 2;

            // 다이아몬드 효과 적용
            if (effects.diamond.count >= 1) enemy.speed *= 0.7;
            if (effects.diamond.count >= 2)
              enemy.stunEndTime = Date.now() + 1000;
            if (effects.diamond.count >= 4) finalDamage *= 1.3;

            // 데미지 적용
            enemy.hp -= finalDamage;
            bullet.hitEnemies.push(enemy.id);

            // 데미지 텍스트 표시
            if (this.ui) {
              // 도탄 총알은 초록색, 일반 총알은 흰색으로 표시
              const damageColor = bullet.isRicochet ? "#50ff50" : "#ffffff";
              this.ui.addDamageText(
                enemy.x,
                enemy.y - enemy.size,
                finalDamage,
                damageColor
              );
            }

            // 적 처치 체크
            if (enemy.hp <= 0) {
              enemy.isDead = true;

              // 클로버 폭발 효과
              if (effects.clover.count >= 2) {
                const radius = effects.clover.count >= 4 ? 100 : 50;
                this.createExplosion(
                  enemy.x,
                  enemy.y,
                  radius,
                  finalDamage * 0.5,
                  enemies,
                  effects
                );
              }
            }

            // 도탄 효과 처리
            if (!bullet.isRicochet && effects.clover.count >= 1) {
              const ricochetChance = effects.clover.ricochetChance || 0.3;
              const roll = Math.random();

              // 디버깅: 도탄 판정 시작
              console.log("Starting ricochet check...");

              // 디버깅: 도탄 판정 과정 확인
              console.log("Ricochet check details:", {
                isRicochet: bullet.isRicochet,
                cloverCount: effects.clover.count,
                ricochetChance,
                roll: roll,
                willRicochet: roll < ricochetChance,
              });

              if (roll < ricochetChance) {
                console.log(
                  "Ricochet triggered, searching for nearby enemies..."
                );

                const nearbyEnemies = enemies.filter(
                  (e) =>
                    !e.isDead &&
                    !e.isAlly &&
                    e !== enemy &&
                    Math.sqrt(
                      Math.pow(e.x - enemy.x, 2) + Math.pow(e.y - enemy.y, 2)
                    ) <= 300
                );

                // 디버깅: 주변 적 확인
                console.log("Nearby enemies search result:", {
                  totalEnemies: enemies.length,
                  nearbyCount: nearbyEnemies.length,
                  searchRadius: 300,
                });

                if (nearbyEnemies.length > 0) {
                  const target = nearbyEnemies[0];
                  const angle = Math.atan2(
                    target.y - enemy.y,
                    target.x - enemy.x
                  );

                  // 디버깅: 도탄 총알 생성 정보
                  console.log("Creating ricochet bullet:", {
                    fromX: enemy.x,
                    fromY: enemy.y,
                    toX: target.x,
                    toY: target.y,
                    angle: angle,
                    damage: bullet.damage * 0.8,
                  });

                  this.createBullet(
                    enemy.x,
                    enemy.y,
                    Math.cos(angle) * 5.6,
                    Math.sin(angle) * 5.6,
                    bullet.size * 0.7,
                    bullet.damage * 0.8,
                    false,
                    "#50ff50",
                    effects,
                    true
                  );
                } else {
                  console.log("No valid targets found for ricochet");
                }
              } else {
                console.log("Ricochet check failed: roll too high");
              }
            }

            hasHit = !bullet.isPiercing;
          }
        }
      });

      if (hasHit) return false;

      bullet.update(canvas);
      return true;
    });
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
    this.bullets.forEach((bullet) => bullet.draw(ctx));
  }
}
