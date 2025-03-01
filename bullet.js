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
    color = "#ffff00",
    cardInfo = null
  ) {
    this.x = x;
    this.y = y;
    this.speedX = dx;
    this.speedY = dy;
    this.size = size;
    this.originalSize = size; // 원래 크기 저장
    this.damage = damage;
    this.isPiercing = isPiercing;
    this.color = color;
    this.id = Date.now() + Math.random();
    this.hitEnemies = [];
    this.createdTime = Date.now();
    this.cardInfo = cardInfo;
    this.cardImage = null;
    if (cardInfo) {
      this.loadCardImage();
    } else {
      // 기본 카드 이미지 로드
      this.cardImage = new Image();
      this.cardImage.src = "V2_4x/PixelPlebes_V2_4x__53.png";
    }
  }

  loadCardImage() {
    this.cardImage = new Image();
    const fileNumber = this.getFileNumber(
      this.cardInfo.type,
      this.cardInfo.number
    );
    this.cardImage.src = `V2_4x/PixelPlebes_V2_4x__${fileNumber}.png`;
  }

  getFileNumber(type, number) {
    const baseOffset = {
      heart: 0,
      diamond: 13,
      spade: 26,
      clover: 39,
    }[type];

    let fileIndex;
    if (number === 1) fileIndex = 1;
    else if (number === 13) fileIndex = 2;
    else if (number === 12) fileIndex = 3;
    else if (number === 11) fileIndex = 4;
    else fileIndex = number + 3;

    return String(baseOffset + fileIndex).padStart(2, "0");
  }

  update(canvas) {
    this.x += this.speedX;
    this.y += this.speedY;
    return true;
  }

  draw(ctx) {
    // 도탄인 경우 적과의 거리 계산
    if (
      this.constructor.name === "RicochetBullet" &&
      this.targetEnemy &&
      !this.targetEnemy.isDead
    ) {
      const dx = this.targetEnemy.x - this.x;
      const dy = this.targetEnemy.y - this.y;
      const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

      // 적과의 거리에 따라 크기와 투명도 조절
      const transitionDistance = 30; // 전환 거리 증가
      if (distanceToTarget < transitionDistance) {
        const scale = 0.3 + (0.7 * distanceToTarget) / transitionDistance; // 최소 크기를 30%로 감소
        this.size = this.originalSize * scale;
        ctx.globalAlpha = 0.4 + (0.6 * distanceToTarget) / transitionDistance; // 최소 투명도를 40%로 증가
      } else {
        this.size = this.originalSize;
        ctx.globalAlpha = 1;
      }
    }

    if (this.cardImage && this.cardImage.complete) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const angle = Math.atan2(this.speedY, this.speedX) + Math.PI / 2;
      ctx.rotate(angle);

      // 이미지 비율 계산
      const imageRatio = this.cardImage.width / this.cardImage.height;
      let drawWidth, drawHeight;

      // 총알 크기 조정 (가로 30% 감소, 세로 5% 감소)
      if (imageRatio > 1) {
        drawWidth = this.size * 2.45; // 3.5 * 0.7 = 2.45 (30% 감소)
        drawHeight = (drawWidth / imageRatio) * 0.95; // 세로 5% 감소
      } else {
        drawHeight = this.size * 3.325; // 3.5 * 0.95 = 3.325 (5% 감소)
        drawWidth = drawHeight * imageRatio * 0.7; // 가로 30% 감소
      }

      ctx.drawImage(
        this.cardImage,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
      ctx.restore();
    }

    if (this.isPiercing) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x - this.speedX * 2, this.y - this.speedY * 2);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }

    // globalAlpha 복원
    ctx.globalAlpha = 1;
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

    // 클로버 개수에 따른 데미지 계산
    const damageMult = effects.clover.count >= 3 ? 1 : 0.5;

    super(startX, startY, 0, 0, size, damage * damageMult, true, "#50ff50");
    this.targetEnemy = targetEnemy;
    this.bounceCount = bounceCount;
    this.maxBounces = effects.clover.count >= 3 ? 3 : 1;
    this.speed = 4.2;
    this.effects = effects;
    this.hitEnemies = [sourceEnemy.id];
    this.lastHitTime = 0;

    this.updateDirection();
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

      // 적과 충분히 가까워지면 즉시 다음 도탄 준비
      if (distance < 5) {
        return false; // 항상 현재 도탄은 제거
      }
    }

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
  constructor(game) {
    this.game = game;
    this.bullets = [];
    this.ricochetBullets = [];
    this.explosionAnimations = [];
    this.ui = null;
  }

  setUI(ui) {
    this.ui = ui;
  }

  getRandomCard(cards) {
    if (!cards || cards.length === 0) return null;
    return cards[Math.floor(Math.random() * cards.length)];
  }

  // 족보 확인 및 카드 선택 함수
  selectCardsForBullet(cards) {
    if (!cards || cards.length === 0) return null;

    // 숫자별로 카드 그룹화
    const numberGroups = {};
    cards.forEach((card) => {
      if (!numberGroups[card.number]) {
        numberGroups[card.number] = [];
      }
      numberGroups[card.number].push(card);
    });

    // 페어 찾기 (2장 이상인 그룹)
    const pairs = Object.entries(numberGroups)
      .filter(([_, group]) => group.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);

    if (pairs.length >= 2) {
      // 투페어인 경우 각 페어에서 랜덤 선택
      const firstPair = pairs[0][1];
      const secondPair = pairs[1][1];
      return {
        type: "twoPair",
        pairs: [firstPair, secondPair],
      };
    } else if (pairs.length === 1) {
      // 원페어
      return {
        type: "onePair",
        cards: pairs[0][1],
      };
    }

    // 페어가 없으면 랜덤 카드 반환
    return {
      type: "highCard",
      cards: [this.getRandomCard(cards)],
    };
  }

  createBullet(config) {
    const {
      x,
      y,
      dx,
      dy,
      size,
      damage,
      isPiercing = false,
      color = "#ffff00",
      effects,
      cards,
    } = config;

    let selectedCards = this.selectCardsForBullet(cards);
    let cardInfo = null;

    if (selectedCards) {
      if (selectedCards.type === "twoPair") {
        const pairIndex = Math.floor(Math.random() * 2);
        const selectedPair = selectedCards.pairs[pairIndex];
        cardInfo = this.getRandomCard(selectedPair);
      } else {
        cardInfo = this.getRandomCard(selectedCards.cards);
      }
    }

    // 스페이드 효과에 따른 관통 여부 결정
    const shouldPierce = effects && effects.spade && effects.spade.count >= 2;

    const bullet = new BaseBullet(
      x,
      y,
      dx,
      dy,
      size,
      damage,
      shouldPierce,
      color,
      cardInfo
    );

    this.bullets.push(bullet);
    return bullet;
  }

  createBasicBullet(config) {
    return this.createBullet({
      ...config,
      size: 5,
      isPiercing: false,
      color: "#ffff00",
    });
  }

  createDualBullet(config) {
    const offset = 10;
    this.createBullet({
      ...config,
      x: config.x - offset,
      size: 5,
      isPiercing: false,
      color: "#ffff00",
    });
    this.createBullet({
      ...config,
      x: config.x + offset,
      size: 5,
      isPiercing: false,
      color: "#ffff00",
    });
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
          this.createBullet({
            ...config,
            x: config.x + shot.x,
            size: 5,
            isPiercing: false,
            color: "#ffff00",
          });
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
      this.createBullet({
        ...config,
        dx: rotatedDx,
        dy: rotatedDy,
        size: 5,
        isPiercing: false,
        color: "#ffff00",
      });
    });
  }

  createLaserRailgun(config) {
    this.createBullet({
      ...config,
      size: 3,
      color: "#00ffff",
    });
  }

  createShotgunPistolCombo(config) {
    // 샷건 부분
    for (let i = 0; i < 5; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const rotatedDx =
        config.dx * Math.cos(spread) - config.dy * Math.sin(spread);
      const rotatedDy =
        config.dx * Math.sin(spread) + config.dy * Math.cos(spread);
      this.createBullet({
        ...config,
        dx: rotatedDx,
        dy: rotatedDy,
        size: 4,
        damage: config.damage * 0.5,
        color: "#ffff00",
      });
    }
    // 정확한 단발
    this.createBullet({
      ...config,
      size: 6,
      color: "#ffff00",
    });
  }

  createPlasmaCannon(config) {
    this.createBullet({
      ...config,
      size: 12,
      color: "#ff00ff",
    });
  }

  createQuadRocketLauncher(config) {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!config.isGameOver) {
          this.createBullet({
            ...config,
            size: 8,
            color: "#ff4400",
          });
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
      this.createBullet({
        ...config,
        dx: rotatedDx,
        dy: rotatedDy,
        size: 4,
        damage: config.damage * 0.5,
        color: "#ff0000",
      });
    }
  }

  createOrbitalLaserStrike(config) {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      this.createBullet({
        ...config,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        size: 6,
        damage: config.damage * 0.8,
        color: "#ffff00",
      });
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

    // 보스와의 충돌 체크
    if (this.game && this.game.isBossBattle && this.game.boss) {
      const boss = this.game.boss;
      // 이미 보스에게 맞은 총알인지 확인
      if (!bullet.hitEnemies.includes(boss.id)) {
        const dx = bullet.x - boss.x;
        const dy = bullet.y - boss.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (bullet.size + boss.size) / 2) {
          // 데미지 계산 및 적용
          const finalDamage = this.calculateDamage(bullet, boss, effects);
          boss.takeDamage(finalDamage);
          bullet.hitEnemies.push(boss.id); // 보스 ID를 맞은 목록에 추가

          // 데미지 텍스트 표시
          if (this.ui) {
            this.ui.addDamageText(
              boss.x,
              boss.y - boss.size,
              finalDamage,
              "#ff0000"
            );
          }

          hasHit = !bullet.isPiercing;
          return hasHit;
        }
      }
    }

    // 일반 적과의 충돌 체크 (보스전이 아닐 때만)
    if (!this.game || !this.game.isBossBattle) {
      enemies.forEach((enemy) => {
        // 아군은 플레이어의 총알에 맞지 않도록 조건 추가
        if (
          !enemy.isDead &&
          !enemy.isAlly &&
          !bullet.hitEnemies.includes(enemy.id)
        ) {
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
    }

    return hasHit;
  }

  calculateDamage(bullet, enemy, effects) {
    let finalDamage = bullet.damage;

    // 스페이드 효과로 인한 데미지 계산
    // 스페이드 1개일 때는 이미 weapons.js에서 1.25배 증가가 적용됨

    // 치명타 확률 계산 (효과에 설정된 값 우선 사용)
    let critChance = 0;
    if (effects.spade && effects.spade.criticalChance) {
      critChance = effects.spade.criticalChance; // 효과에 지정된 치명타 확률 사용 (5개 이상일 때 50%)
    } else if (effects.spade && effects.spade.count >= 3) {
      critChance = 0.3; // 기존 로직 (3개 이상일 때 30%)
    }

    // 치명타 적용
    if (critChance > 0 && Math.random() < critChance) {
      finalDamage *= 2;
      console.log(`치명타 발생! 데미지 2배: ${finalDamage}`);
    }

    if (effects.diamond.count >= 4) finalDamage *= 1.3;

    return finalDamage;
  }

  applyDamage(bullet, enemy, damage, effects, enemies) {
    // 아군 변환 처리 (적이 플레이어 총알에 맞았을 때)
    if (!enemy.isAlly) {
      // 하트 카드 3개 이상일 때만 아군 변환 기능 활성화
      if (effects.heart.allyConversionEnabled) {
        console.log(
          `🔄 아군 변환 기능 활성화됨: 최대 ${
            effects.heart.maxAllies
          }명, 확률 ${effects.heart.allyConversionChance * 100}%`
        );
        // 현재 아군 수 계산
        const currentAllies = enemies.filter(
          (e) => e.isAlly && !e.isDead
        ).length;

        // 현재 아군 수가 최대 아군 수보다 적을 때만 변환 시도
        if (currentAllies < effects.heart.maxAllies) {
          const roll = Math.random();
          console.log(
            `🎲 아군 변환 주사위: ${roll.toFixed(
              3
            )} vs ${effects.heart.allyConversionChance.toFixed(3)}`
          );
          // 변환 확률 적용 (하트 4개 이상이면 10%, 아니면 5%)
          if (roll < effects.heart.allyConversionChance) {
            console.log(
              `✅ 적을 아군으로 변환 성공: ${enemy.id} (현재 아군: ${currentAllies}/${effects.heart.maxAllies})`
            );
            enemy.isAlly = true;

            // 체력 설정 (하트 4개 이상이면 원래 체력, 아니면 절반)
            if (effects.heart.allyFullHealthEnabled) {
              enemy.chips = enemy.maxChips; // 체력 100%
            } else {
              enemy.chips = Math.ceil(enemy.maxChips / 2); // 체력 50%
            }

            // 공격력 증가 적용 (하트 4개 이상이면 120% 증가)
            if (effects.heart.allyDamageBoost > 1) {
              enemy.attackDamage = Math.ceil(
                enemy.attackDamage * effects.heart.allyDamageBoost
              );
              console.log(`아군 공격력 증가: ${enemy.attackDamage}`);
            }

            console.log(
              `적이 아군으로 변환됨: ${enemy.id}, 체력: ${enemy.chips}/${enemy.maxChips}, 공격력: ${enemy.attackDamage}`
            );

            // 아군 변환 성공 시 추가 데미지 적용하지 않음
            return;
          }
        } else {
          console.log(
            `❌ 아군 변환 실패: 최대 아군 수 초과 (현재: ${currentAllies}/${effects.heart.maxAllies})`
          );
        }
      }
    }

    // 다이아몬드 효과 적용
    if (effects.diamond.count >= 1) enemy.speed *= 0.7;
    if (effects.diamond.count >= 2) enemy.stunEndTime = Date.now() + 1000;

    // 데미지 적용
    const isDead = enemy.takeDamage(damage);
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
      const maxBounces = effects.clover.count >= 3 ? 3 : 1;

      // 현재 도탄 횟수가 최대치보다 작을 때만 다음 도탄 생성
      if (bullet.bounceCount < maxBounces) {
        const nearbyEnemies = this.findNearbyEnemies(
          enemy,
          enemies,
          bullet,
          500
        );
        if (nearbyEnemies.length > 0) {
          const target = this.findClosestEnemy(enemy, nearbyEnemies);
          const nextBullet = new RicochetBullet(
            enemy,
            target,
            bullet.size,
            bullet.damage,
            effects,
            bullet.bounceCount + 1
          );
          nextBullet.hitEnemies = [enemy.id];
          this.ricochetBullets.push(nextBullet);
        }
      }

      // 클로버 2개 이상일 때만 폭발 효과 발동
      if (effects.clover.count >= 2 && Math.random() < 0.3) {
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
    }

    // 적 처치 체크
    if (isDead) {
      // console.log("적 처치됨:", {
      //   enemyId: enemy.id,
      //   position: { x: enemy.x, y: enemy.y },
      //   cloverCount: effects.clover.count,
      //   byRicochet: bullet.constructor.name.includes("Ricochet"),
      //   bulletId: bullet.id,
      //   bounceCount: bullet.bounceCount,
      // });
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
          const knockbackDistance = (radius - distance) * 2;

          const oldPos = { x: enemy.x, y: enemy.y };

          // 넉백 적용
          enemy.x += Math.cos(angle) * knockbackDistance;
          enemy.y += Math.sin(angle) * knockbackDistance;

          // 화면 경계 체크
          enemy.x = Math.max(enemy.size, Math.min(1200 - enemy.size, enemy.x));
          enemy.y = Math.max(enemy.size, Math.min(800 - enemy.size, enemy.y));

          const damageMultiplier = Math.max(0.5, 1 - distance / radius);
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

          const isDead = enemy.takeDamage(explosionDamage);
          affectedEnemies.push(enemy);

          // 다이아몬드 범위 감속 효과
          if (effects.diamond.count >= 3) {
            enemy.speed *= 0.7;
          }

          if (isDead) {
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
    // 클로버가 1개 이상일 때만 도탄 가능
    if (effects.clover.count < 1) return;

    const ricochetChance = effects.clover.ricochetChance;
    const roll = Math.random();

    console.log("도탄 확률 체크:", {
      클로버개수: effects.clover.count,
      확률: ricochetChance,
      주사위: roll,
      성공여부: roll < ricochetChance,
    });

    // 30% 확률로 도탄 발생
    if (roll < ricochetChance) {
      const nearbyEnemies = this.findNearbyEnemies(
        sourceEnemy,
        enemies,
        sourceBullet,
        500
      );

      if (nearbyEnemies.length > 0) {
        const target = this.findClosestEnemy(sourceEnemy, nearbyEnemies);

        // 클로버 개수에 따른 도탄 생성
        const ricochetBullet = new RicochetBullet(
          sourceEnemy,
          target,
          sourceBullet.size,
          sourceBullet.damage,
          effects,
          effects.clover.count >= 3 ? 0 : 1 // 클로버 3개 이상일 때는 0부터 시작
        );

        // hitEnemies 배열 초기화 (현재 맞은 적만 포함)
        ricochetBullet.hitEnemies = [sourceEnemy.id];
        this.ricochetBullets.push(ricochetBullet);

        console.log("도탄 생성됨:", {
          시작위치: { x: sourceEnemy.x, y: sourceEnemy.y },
          목표위치: { x: target.x, y: target.y },
          클로버개수: effects.clover.count,
          현재_도탄수: ricochetBullet.bounceCount,
          최대_도탄수: ricochetBullet.maxBounces,
        });
      }
    }
  }

  findNearbyEnemies(sourceEnemy, enemies, sourceBullet, searchRadius) {
    return enemies.filter(
      (e) =>
        !e.isDead &&
        !e.isAlly &&
        e !== sourceEnemy &&
        !sourceBullet.hitEnemies.includes(e.id) &&
        Math.sqrt(
          Math.pow(e.x - sourceEnemy.x, 2) + Math.pow(e.y - sourceEnemy.y, 2)
        ) <= searchRadius
    );
  }

  findClosestEnemy(sourceEnemy, enemies) {
    return enemies.reduce((closest, current) => {
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
  }

  createNextRicochet(
    sourceEnemy,
    enemies,
    sourceBullet,
    effects,
    currentBounceCount
  ) {
    const maxBounces = effects.clover.count >= 3 ? 3 : 1;

    // 최대 도탄 횟수를 초과하면 중단
    if (currentBounceCount >= maxBounces) {
      console.log("도탄 최대 횟수 도달:", {
        현재_도탄수: currentBounceCount,
        최대_도탄수: maxBounces,
        클로버개수: effects.clover.count,
      });
      return;
    }

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
