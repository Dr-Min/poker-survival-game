import { Player } from "./player.js";
import { BulletManager } from "./bullet.js";
import { EnemyManager } from "./enemy.js";
import { CardManager } from "./card.js";
import { Effects } from "./effects.js";
import { UI } from "./ui.js";

export class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // 매니저 클래스 초기화
    this.player = new Player(this.canvas);
    this.cardManager = new CardManager();
    this.enemyManager = new EnemyManager(this.cardManager);
    this.bulletManager = new BulletManager();
    this.effects = new Effects();
    this.ui = new UI(this.canvas);

    // BulletManager에 UI 연결
    this.bulletManager.setUI(this.ui);

    // 게임 상태 초기화
    this.score = 0;
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;

    // 모바일 관련 설정
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      moveX: 0,
      moveY: 0,
      size: 50,
    };
    this.shootButton = {
      x: this.canvas.width - 80,
      y: this.canvas.height - 80,
      size: 60,
    };

    // 게임 시스템 상태
    this.isGameOver = false;
    this.gameLoopId = null;
    this.isPaused = false;
    this.showDebugMenu = false;

    // 무기 시스템 초기화 (Effects 클래스의 WeaponSystem 사용)
    this.currentWeapon = this.effects.weaponSystem.getCurrentWeapon();

    // 라운드 시스템
    this.round = 1;
    this.enemiesKilledInRound = 0;
    this.enemiesRequiredForNextRound = 10;
    this.roundStartTime = Date.now();
    this.roundDuration = 60000;
    this.isRoundTransition = false;
    this.roundTransitionDuration = 3000;
    this.roundTransitionStartTime = 0;

    // 디버그 옵션
    this.debugOptions = {
      selectedCard: { type: "spade", number: 1 },
      cardTypes: ["spade", "heart", "diamond", "clover"],
      cardNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      ricochetChance: 1.0,
    };

    // 이벤트 리스너 설정 및 게임 시작
    this.setupEventListeners();
    if (this.isMobile) {
      this.setupMobileEventListeners();
    }
    this.startGame();
  }

  setupEventListeners() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
  }

  handleKeyDown(e) {
    this.keys[e.key] = true;
    if (e.key === "Escape") {
      this.isPaused = !this.isPaused;
    }
    if (this.isPaused && e.key === "Enter") {
      const cardInfo = this.ui.getDebugCardInfo();
      if (cardInfo) {
        // 카드 매니저를 통해 카드 생성 및 수집
        const card = this.cardManager.createCard(
          cardInfo.type,
          cardInfo.number
        );
        this.cardManager.collectCard(card.type, card.number);

        // 카드 효과 즉시 적용
        const result = this.effects.applyCardEffects(
          this.cardManager.getCollectedCards()
        );
        // 무기가 변경되었다면 현재 무기 업데이트
        if (result.weaponChanged) {
          this.currentWeapon = result.currentWeapon;
        }

        // 카드 선택 초기화
        this.ui.selectedType = null;
        this.ui.selectedNumber = null;
      }
    }
  }

  handleKeyUp(e) {
    this.keys[e.key] = false;
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isPaused) {
      this.ui.handleDebugClick(x, y);
    } else {
      this.shoot();
    }
  }

  setupMobileEventListeners() {
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      if (this.isInShootButton(x, y)) {
        this.shoot();
        return;
      }

      this.joystick.active = true;
      this.joystick.startX = x;
      this.joystick.startY = y;
      this.joystick.moveX = x;
      this.joystick.moveY = y;
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!this.joystick.active) return;

      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.joystick.moveX = touch.clientX - rect.left;
      this.joystick.moveY = touch.clientY - rect.top;

      this.mouseX =
        this.player.x + (this.joystick.moveX - this.joystick.startX) * 2;
      this.mouseY =
        this.player.y + (this.joystick.moveY - this.joystick.startY) * 2;
    });

    this.canvas.addEventListener("touchend", () => {
      this.joystick.active = false;
    });
  }

  isInShootButton(x, y) {
    const dx = x - this.shootButton.x;
    const dy = y - this.shootButton.y;
    return Math.sqrt(dx * dx + dy * dy) < this.shootButton.size;
  }

  shoot() {
    if (!this.currentWeapon) return; // 무기가 없으면 발사하지 않음

    const dx = this.mouseX - this.player.x;
    const dy = this.mouseY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;

    const effects = this.effects.getEffects();
    const bulletConfig = {
      x: this.player.x,
      y: this.player.y,
      dx: normalizedDx,
      dy: normalizedDy,
      damage: this.effects.weaponSystem.calculateDamage(effects),
      effects: effects,
      isGameOver: this.isGameOver,
    };

    // 각 무기별 총알 생성 시 effects 전달
    switch (this.currentWeapon.name) {
      case "리볼버":
        this.bulletManager.createBasicBullet(bulletConfig);
        break;
      case "듀얼 리볼버":
        this.bulletManager.createDualBullet(bulletConfig);
        break;
      case "더블 듀얼 리볼버":
        this.bulletManager.createDoubleDualBullet(bulletConfig);
        break;
      case "트리플 샷건":
        this.bulletManager.createTripleShotgun(bulletConfig);
        break;
      case "레이저 레일건":
        this.bulletManager.createLaserRailgun(bulletConfig);
        break;
      case "샷건+권총 콤보":
        this.bulletManager.createShotgunPistolCombo(bulletConfig);
        break;
      case "플라즈마 캐논":
        this.bulletManager.createPlasmaCannon(bulletConfig);
        break;
      case "4연발 로켓런처":
        this.bulletManager.createQuadRocketLauncher(bulletConfig);
        break;
      case "레이저 게이트링건":
        this.bulletManager.createLaserGatling(bulletConfig);
        break;
      case "오비탈 레이저 스트라이크":
        this.bulletManager.createOrbitalLaserStrike(bulletConfig);
        break;
      default:
        this.bulletManager.createBasicBullet(bulletConfig);
    }
  }

  startGame() {
    this.isGameOver = false;
    this.gameLoop();
  }

  gameLoop() {
    if (!this.isGameOver) {
      if (!this.isPaused) {
        this.update();
      }
      this.draw();
      this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
  }

  update() {
    this.player.move(this.keys, this.mouseX, this.mouseY, this.joystick);
    this.enemyManager.spawnEnemy(
      this.canvas,
      this.round,
      this.isRoundTransition
    );

    // 적 업데이트 및 점수 계산
    const killedEnemies = this.enemyManager.updateEnemies(
      this.player,
      Date.now()
    );
    if (killedEnemies > 0) {
      this.score += killedEnemies * 10;
      this.enemiesKilledInRound += killedEnemies;
    }

    // 카드 관련 업데이트
    const prevCardCount = this.cardManager.getCollectedCards().length;
    this.cardManager.updateCards(this.player, this.effects.getEffects());

    // 카드가 변경되었을 때만 효과 재계산
    if (prevCardCount !== this.cardManager.getCollectedCards().length) {
      const result = this.effects.applyCardEffects(
        this.cardManager.getCollectedCards()
      );
      // 무기가 변경되었다면 현재 무기 업데이트
      if (result.weaponChanged) {
        this.currentWeapon = result.currentWeapon;
      }
    }

    this.bulletManager.updateBullets(
      this.canvas,
      this.enemyManager.enemies,
      this.effects.getEffects()
    );

    this.checkRoundProgress();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 배경 그리기 (투명)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 게임 요소 그리기
    this.player.draw(this.ctx, this.mouseX, this.mouseY);
    this.enemyManager.drawEnemies(this.ctx);
    this.bulletManager.drawBullets(this.ctx);
    this.cardManager.drawCards(this.ctx);

    // UI 그리기
    this.ui.drawGameUI({
      score: this.score,
      round: this.round,
      enemiesKilledInRound: this.enemiesKilledInRound,
      enemiesRequiredForNextRound: this.enemiesRequiredForNextRound,
      roundStartTime: this.roundStartTime,
      roundDuration: this.roundDuration,
      currentWeapon: this.currentWeapon,
      player: this.player,
      effects: this.effects.getEffects(),
      collectedCards: this.cardManager.getCollectedCards(),
    });

    if (this.isPaused) {
      this.ui.drawPauseScreen();
    }

    if (this.isRoundTransition) {
      this.ui.drawRoundTransition(this.round);
    }
  }

  stopGame() {
    this.isGameOver = true;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }
  }

  checkRoundProgress() {
    if (this.isRoundTransition) {
      if (
        Date.now() - this.roundTransitionStartTime >=
        this.roundTransitionDuration
      ) {
        this.startNextRound();
      }
      return;
    }

    const roundTimeElapsed = Date.now() - this.roundStartTime;
    if (
      roundTimeElapsed >= this.roundDuration ||
      this.enemiesKilledInRound >= this.enemiesRequiredForNextRound
    ) {
      this.startRoundTransition();
    }
  }

  startRoundTransition() {
    this.isRoundTransition = true;
    this.roundTransitionStartTime = Date.now();
    this.enemyManager.clearEnemies();
    this.bulletManager.clearBullets();
    this.player.heal(2);
  }

  startNextRound() {
    this.round++;
    this.isRoundTransition = false;
    this.enemiesKilledInRound = 0;
    this.roundStartTime = Date.now();
    this.enemiesRequiredForNextRound = Math.floor(10 * (1 + this.round * 0.2));
    this.roundDuration = Math.max(30000, 60000 - (this.round - 1) * 5000);
  }
}

window.onload = function () {
  const game = new Game();
};
