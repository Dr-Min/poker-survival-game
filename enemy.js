import { getDistance, checkCollision } from "./utils.js";

export class Enemy {
  constructor(x, y, round) {
    this.id = Date.now() + Math.random();
    this.x = x;
    this.y = y;
    this.size = 15;
    this.speed = 1 * (1 + round * 0.1);
    this.hp = 5 + Math.floor(round * 1.5);
    this.isDead = false;
    this.isAlly = false;
    this.stunEndTime = 0;
    this.hasDroppedCard = false;
    this.isCountedAsKill = false;

    // 애니메이션 관련 속성 추가
    this.runSprite = new Image();
    this.runSprite.src = "./Monster_run_2.png";
    this.deathSprite = new Image();
    this.deathSprite.src = "./Monster_death_2.png";

    this.frameIndex = 0;
    this.tickCount = 0;
    this.ticksPerFrame = 8; // 80ms에 맞추어 조정 (60fps 기준)
    this.runFrames = 6; // 달리기 애니메이션 프레임 수
    this.deathFrames = 9; // 죽음 애니메이션 프레임 수
    this.renderSize = 64;
    this.deathAnimationComplete = false;

    // 애니메이션 초기화 시 프레임 인덱스 리셋
    this.resetDeathAnimation = () => {
      this.frameIndex = 0;
      this.tickCount = 0;
    };
  }

  update(player, now) {
    if (this.isDead) {
      // 이미 애니메이션이 완료된 경우
      if (this.deathAnimationComplete) {
        return false;
      }

      // 죽음 애니메이션 업데이트
      this.tickCount++;
      if (this.tickCount > this.ticksPerFrame) {
        this.tickCount = 0;
        if (this.frameIndex < this.deathFrames - 1) {
          this.frameIndex++;
        } else {
          this.deathAnimationComplete = true;
          return false; // 애니메이션이 완료되면 즉시 false 반환
        }
      }
      return true; // 애니메이션이 진행 중일 때는 true 반환
    }

    if (this.stunEndTime && now < this.stunEndTime) return true;

    if (this.isAlly) {
      return true;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;

    // 이동 방향에 따라 좌우 반전 상태 저장
    this.isFlipped = dx < 0;

    return true;
  }

  draw(ctx) {
    const currentSprite = this.isDead ? this.deathSprite : this.runSprite;

    if (currentSprite.complete) {
      // 달리기 애니메이션 업데이트 (죽지 않은 경우에만)
      if (!this.isDead) {
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
          this.tickCount = 0;
          this.frameIndex = (this.frameIndex + 1) % this.runFrames;
        }
      }

      const frameWidth = 64;
      const frameHeight = 64;

      // 캔버스 상태 저장
      ctx.save();

      // 좌우 반전이 필요한 경우
      if (this.isFlipped) {
        ctx.translate(
          this.x + this.renderSize / 2,
          this.y - this.renderSize / 2
        );
        ctx.scale(-1, 1);
      } else {
        ctx.translate(
          this.x - this.renderSize / 2,
          this.y - this.renderSize / 2
        );
      }

      ctx.drawImage(
        currentSprite,
        this.frameIndex * frameWidth,
        0,
        frameWidth,
        frameHeight,
        0,
        0,
        this.renderSize,
        this.renderSize
      );

      // 캔버스 상태 복원
      ctx.restore();

      // 체력바 그리기 (죽지 않은 경우에만)
      if (!this.isDead) {
        const healthBarWidth = this.size;
        const healthBarHeight = 4;
        const healthBarY = this.y - this.renderSize / 2 - 10;

        ctx.fillStyle = "#444444";
        ctx.fillRect(
          this.x - healthBarWidth / 2,
          healthBarY,
          healthBarWidth,
          healthBarHeight
        );

        const currentHealthWidth = (this.hp / 5) * healthBarWidth;
        ctx.fillStyle = this.isAlly ? "#00ff00" : "#ff0000";
        ctx.fillRect(
          this.x - healthBarWidth / 2,
          healthBarY,
          currentHealthWidth,
          healthBarHeight
        );
      }
    } else {
      // 스프라이트가 로드되지 않았을 때의 대체 렌더링
      ctx.fillStyle = this.isAlly ? "#00ff00" : "white";
      ctx.fillRect(
        this.x - this.size / 2,
        this.y - this.size / 2,
        this.size,
        this.size
      );
    }
  }
}

export class EnemyManager {
  constructor(cardManager, game) {
    this.enemies = [];
    this.cardManager = cardManager;
    this.game = game;
  }

  spawnEnemy(canvas, round, isRoundTransition) {
    if (isRoundTransition || !this.game.isSpawningEnemies) return;

    if (Math.random() < 0.008 * (1 + round * 0.08)) {
      const side = Math.floor(Math.random() * 4);
      let x, y;

      switch (side) {
        case 0:
          x = Math.random() * canvas.width;
          y = -20;
          break;
        case 1:
          x = canvas.width + 20;
          y = Math.random() * canvas.height;
          break;
        case 2:
          x = Math.random() * canvas.width;
          y = canvas.height + 20;
          break;
        case 3:
          x = -20;
          y = Math.random() * canvas.height;
          break;
      }

      const newEnemy = new Enemy(x, y, round);

      const isTooClose = this.enemies.some(
        (enemy) => getDistance(newEnemy, enemy) < enemy.size * 1.5
      );

      if (!isTooClose) {
        this.enemies.push(newEnemy);
      }
    }
  }

  updateEnemies(player, now) {
    let killedCount = 0;
    const remainingEnemies = [];

    // 적들 사이의 충돌 처리
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const enemy1 = this.enemies[i];
        const enemy2 = this.enemies[j];

        if (!enemy1.isDead && !enemy2.isDead) {
          const dx = enemy2.x - enemy1.x;
          const dy = enemy2.y - enemy1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = (enemy1.size + enemy2.size) * 0.8;

          if (distance < minDistance) {
            // 충돌 발생 시 서로를 밀어냄
            const angle = Math.atan2(dy, dx);
            const pushForce = (minDistance - distance) * 0.5;

            // 두 번째 적을 밀어냄
            enemy2.x = enemy1.x + Math.cos(angle) * minDistance;
            enemy2.y = enemy1.y + Math.sin(angle) * minDistance;

            // 화면 경계 체크
            enemy2.x = Math.max(
              enemy2.size,
              Math.min(1200 - enemy2.size, enemy2.x)
            );
            enemy2.y = Math.max(
              enemy2.size,
              Math.min(800 - enemy2.size, enemy2.y)
            );
          }
        }
      }
    }

    // 기존의 적 업데이트 로직
    for (const enemy of this.enemies) {
      // 적이 죽은 경우
      if (enemy.isDead) {
        // 아직 카운트되지 않은 처치인 경우에만 카운트 증가
        if (!enemy.isCountedAsKill) {
          killedCount++;
          enemy.isCountedAsKill = true;
        }

        // 죽음 애니메이션 업데이트
        if (enemy.update(player, now)) {
          // 애니메이션이 아직 진행 중인 경우
          remainingEnemies.push(enemy);

          // 아직 카드를 드롭하지 않았다면 드롭
          if (this.cardManager && !enemy.hasDroppedCard) {
            this.cardManager.spawnCard(enemy.x, enemy.y);
            enemy.hasDroppedCard = true;
          }
        }
        continue;
      }

      // 살아있는 적 업데이트
      if (enemy.update(player, now)) {
        remainingEnemies.push(enemy);
      }
    }

    this.enemies = remainingEnemies;
    return killedCount;
  }

  clearEnemies() {
    this.enemies = [];
  }

  drawEnemies(ctx) {
    this.enemies.forEach((enemy) => enemy.draw(ctx));
  }
}
