import { getDistance } from "../utils.js";
import { FourLegsEnemy } from "./FourLegsEnemy.js";
import { TwoLegsEnemy } from "./TwoLegsEnemy.js";

export class EnemyManager {
  constructor(cardManager, game) {
    this.enemies = [];
    this.cardManager = cardManager;
    this.game = game;
  }

  spawnEnemy(canvas, round, isRoundTransition) {
    if (isRoundTransition || !this.game.isSpawningEnemies) return;

    if (Math.random() < 0.006 * (1 + round * 0.05)) {
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

      let newEnemy;
      if (round === 1) {
        newEnemy = new FourLegsEnemy(x, y, round);
      } else if (round === 2) {
        newEnemy = new TwoLegsEnemy(x, y, round);
      } else {
        // 3라운드부터는 랜덤하게 섞어서 생성
        newEnemy =
          Math.random() < 0.5
            ? new FourLegsEnemy(x, y, round)
            : new TwoLegsEnemy(x, y, round);
      }

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
            const angle = Math.atan2(dy, dx);
            const pushForce = (minDistance - distance) * 0.5;

            enemy2.x = enemy1.x + Math.cos(angle) * minDistance;
            enemy2.y = enemy1.y + Math.sin(angle) * minDistance;

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

    for (const enemy of this.enemies) {
      if (enemy.isDead) {
        if (!enemy.isCountedAsKill) {
          killedCount++;
          enemy.isCountedAsKill = true;
        }

        if (enemy.update(player, now)) {
          remainingEnemies.push(enemy);

          if (this.cardManager && !enemy.hasDroppedCard) {
            this.cardManager.spawnCard(enemy.x, enemy.y);
            enemy.hasDroppedCard = true;
          }
        }
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
