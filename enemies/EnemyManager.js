import { getDistance } from "../utils.js";
import { FourLegsEnemy } from "./FourLegsEnemy.js";
import { TwoLegsEnemy } from "./TwoLegsEnemy.js";

export class EnemyManager {
  constructor(cardManager, game) {
    this.enemies = [];
    this.cardManager = cardManager;
    this.game = game;
    console.log("EnemyManager 초기화 완료");
  }

  // 새로 추가된 메소드: 지정된 타입의 적을 생성합니다
  createEnemy(x, y, enemyType) {
    let newEnemy;
    
    // 적 타입에 따라 적절한 객체 생성
    switch (enemyType) {
      case 'TwoLegsEnemy':
        newEnemy = new TwoLegsEnemy(x, y, this.game.round || 1);
        break;
      case 'FourLegsEnemy':
        newEnemy = new FourLegsEnemy(x, y, this.game.round || 1);
        break;
      default:
        console.error(`알 수 없는 적 타입: ${enemyType}`);
        return null;
    }
    
    // 생성된 적을 적 목록에 추가
    this.enemies.push(newEnemy);
    console.log(`새로운 ${enemyType} 생성됨 (위치: ${x}, ${y})`);
    
    return newEnemy;
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

    // 플레이어와 적의 충돌 처리 추가
    for (const enemy of this.enemies) {
      if (!enemy.isDead) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (enemy.size + player.size) * 0.8;

        if (distance < minDistance) {
          // 적을 플레이어로부터 밀어냄
          const angle = Math.atan2(dy, dx);
          enemy.x = player.x + Math.cos(angle) * minDistance;
          enemy.y = player.y + Math.sin(angle) * minDistance;

          // 화면 경계 체크
          enemy.x = Math.max(enemy.size, Math.min(1200 - enemy.size, enemy.x));
          enemy.y = Math.max(enemy.size, Math.min(800 - enemy.size, enemy.y));
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

  clearEnemies(keepAllies = false) {
    if (keepAllies) {
      // 아군만 남기고 나머지 적들 제거
      this.enemies = this.enemies.filter(enemy => enemy.isAlly && !enemy.isDead);
      console.log(`아군 ${this.enemies.length}명 유지, 나머지 적 제거됨`);
    } else {
      // 모든 적 제거
      this.enemies = [];
      console.log("모든 적 제거됨");
    }
  }

  drawEnemies(ctx) {
    this.enemies.forEach((enemy) => enemy.draw(ctx));
  }
}
