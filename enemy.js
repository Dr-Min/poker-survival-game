import { getDistance, checkCollision } from "./utils.js";

export class Enemy {
  constructor(x, y, round) {
    this.id = Date.now() + Math.random();
    this.x = x;
    this.y = y;
    this.size = 20;
    this.speed = 1 * (1 + round * 0.1);
    this.hp = 5 + Math.floor(round * 1.5);
    this.isDead = false;
    this.isAlly = false;
    this.stunEndTime = 0;
  }

  update(player, now) {
    if (this.isDead) return false;
    if (this.stunEndTime && now < this.stunEndTime) return true;

    if (this.isAlly) {
      return true;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;

    return true;
  }

  draw(ctx) {
    // 적 그리기
    ctx.fillStyle = this.isAlly ? "#00ff00" : "white";
    ctx.fillRect(
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );

    // 체력바 그리기
    const healthBarWidth = this.size;
    const healthBarHeight = 4;
    const healthBarY = this.y - this.size / 2 - 10;

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
        (enemy) => getDistance(newEnemy, enemy) < enemy.size * 2
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
          const minDistance = enemy1.size + enemy2.size;

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
      if (enemy.isDead) {
        // 적이 죽을 때 카드 드랍
        if (this.cardManager) {
          this.cardManager.spawnCard(enemy.x, enemy.y);
        }
        killedCount++;
        continue;
      }

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
