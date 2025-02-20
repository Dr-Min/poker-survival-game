import { Player } from "./player.js";
import { BulletManager } from "./bullet.js";
import { EnemyManager } from "./enemies/index.js";
import { CardManager } from "./card.js";
import { Effects } from "./effects.js";
import { UI } from "./ui.js";
import { Boss } from "./boss.js";
import { PokerSystem } from "./poker.js";

export class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // 기본 게임 해상도 설정
    this.baseWidth = 1200;
    this.baseHeight = 800;
    this.aspectRatio = this.baseWidth / this.baseHeight;

    // 화면 크기 초기화
    this.handleResize();

    // 매니저 클래스 초기화
    this.player = new Player(this.canvas);
    this.cardManager = new CardManager();
    this.enemyManager = new EnemyManager(this.cardManager, this);
    this.bulletManager = new BulletManager(this);
    this.effects = new Effects();
    this.ui = new UI(this.canvas);

    // BulletManager에 UI 연결
    this.bulletManager.setUI(this.ui);

    // 게임 상태 초기화
    this.score = 0;
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.isStartScreen = true; // 시작 화면 상태 추가

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
    this.roundDuration = 25000; // 25초로 수정
    this.isRoundTransition = false;
    this.roundTransitionDuration = 3000;
    this.roundTransitionStartTime = 0;
    this.isSpawningEnemies = true;

    // 디버그 옵션
    this.debugOptions = {
      selectedCard: { type: "spade", number: 1 },
      cardTypes: ["spade", "heart", "diamond", "clover"],
      cardNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      ricochetChance: 1.0,
    };

    // 보스전 관련 상태 추가
    this.boss = null;
    this.pokerSystem = new PokerSystem();
    this.isBossBattle = false;
    this.isPokerPhase = false;
    this.selectedCards = [];
    this.pokerState = {
      currentTurn: null, // 'player' or 'boss'
      phase: "selection", // 'selection', 'betting', 'showdown'
      lastAction: null,
      lastBet: 0,
      currentBetPercent: 0,
    };

    // 이벤트 리스너 설정
    this.setupEventListeners();
    if (this.isMobile) {
      this.setupMobileEventListeners();
    }
    this.gameLoop(); // startGame() 대신 gameLoop() 직접 호출
  }

  handleResize = () => {
    const container = document.getElementById("gameContainer");
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let canvasWidth, canvasHeight;
    let scale;

    if (containerAspectRatio > this.aspectRatio) {
      // 컨테이너가 더 넓은 경우
      canvasHeight = containerHeight;
      canvasWidth = containerHeight * this.aspectRatio;
      scale = canvasHeight / this.baseHeight;
    } else {
      // 컨테이너가 더 좁은 경우
      canvasWidth = containerWidth;
      canvasHeight = containerWidth / this.aspectRatio;
      scale = canvasWidth / this.baseWidth;
    }

    // 최소 크기 제한
    const minScale = 0.5;
    if (scale < minScale) {
      scale = minScale;
      canvasWidth = this.baseWidth * scale;
      canvasHeight = this.baseHeight * scale;
    }

    // 최대 크기 제한
    const maxScale = 2;
    if (scale > maxScale) {
      scale = maxScale;
      canvasWidth = this.baseWidth * scale;
      canvasHeight = this.baseHeight * scale;
    }

    // 캔버스 크기 설정
    this.canvas.width = this.baseWidth;
    this.canvas.height = this.baseHeight;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;

    // 현재 스케일 저장
    this.currentScale = scale;

    // 슈팅 버튼 위치 업데이트
    this.shootButton = {
      x: this.canvas.width - 80,
      y: this.canvas.height - 80,
      size: 60,
    };
  };

  setupEventListeners() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
    window.addEventListener("resize", this.handleResize);
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
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY = (e.clientY - rect.top) * scaleY;
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (this.isStartScreen) {
      const buttonBounds = this.ui.drawStartScreen();
      if (
        x >= buttonBounds.buttonBounds.x &&
        x <= buttonBounds.buttonBounds.x + buttonBounds.buttonBounds.width &&
        y >= buttonBounds.buttonBounds.y &&
        y <= buttonBounds.buttonBounds.y + buttonBounds.buttonBounds.height
      ) {
        this.isStartScreen = false;
        this.startGame();
      }
      return;
    }

    if (this.isShowingCommunityCards) {
      const buttonArea = this.ui.continueButtonArea;
      if (
        buttonArea &&
        x >= buttonArea.x &&
        x <= buttonArea.x + buttonArea.width &&
        y >= buttonArea.y &&
        y <= buttonArea.y + buttonArea.height
      ) {
        this.startPokerPhase();
      }
      return;
    }

    if (this.isPokerPhase) {
      if (this.pokerState.phase === "selection") {
        if (this.ui.cardClickAreas) {
          for (const area of this.ui.cardClickAreas) {
            if (
              x >= area.x &&
              x <= area.x + area.width &&
              y >= area.y &&
              y <= area.y + area.height
            ) {
              this.handleCardSelection(area.card);
              return;
            }
          }
        }

        if (this.selectedCards.length === 2 && this.ui.confirmButtonArea) {
          const buttonArea = this.ui.confirmButtonArea;
          if (
            x >= buttonArea.x &&
            x <= buttonArea.x + buttonArea.width &&
            y >= buttonArea.y &&
            y <= buttonArea.y + buttonArea.height
          ) {
            this.finishCardSelection(this.selectedCards);
            return;
          }
        }
      } else if (
        this.pokerState.phase === "betting" &&
        this.pokerState.currentTurn === "player"
      ) {
        const buttonAreas = this.ui.bettingButtonAreas;
        if (buttonAreas) {
          if (
            x >= buttonAreas.fold.x &&
            x <= buttonAreas.fold.x + buttonAreas.fold.width &&
            y >= buttonAreas.fold.y &&
            y <= buttonAreas.fold.y + buttonAreas.fold.height
          ) {
            this.handlePokerAction("fold");
            return;
          }
          if (
            x >= buttonAreas.call.x &&
            x <= buttonAreas.call.x + buttonAreas.call.width &&
            y >= buttonAreas.call.y &&
            y <= buttonAreas.call.y + buttonAreas.call.height
          ) {
            this.handlePokerAction("call");
            return;
          }

          // 레이즈 버튼들 처리
          for (const raiseButton of buttonAreas.raise) {
            if (
              x >= raiseButton.x &&
              x <= raiseButton.x + raiseButton.width &&
              y >= raiseButton.y &&
              y <= raiseButton.y + raiseButton.height
            ) {
              this.handlePokerAction("raise", raiseButton.value);
              return;
            }
          }
        }
      } else if (this.pokerState.phase === "showdown") {
        // 쇼다운 확인 버튼 처리
        const buttonArea = this.ui.showdownConfirmButtonArea;
        if (
          buttonArea &&
          x >= buttonArea.x &&
          x <= buttonArea.x + buttonArea.width &&
          y >= buttonArea.y &&
          y <= buttonArea.y + buttonArea.height
        ) {
          this.startBossBattle(true);
          return;
        }
      }
    }

    if (this.isPaused) {
      // 보스전 진입 버튼 클릭 체크
      const bossButtonArea = this.ui.bossButtonArea;
      if (
        bossButtonArea &&
        x >= bossButtonArea.x &&
        x <= bossButtonArea.x + bossButtonArea.width &&
        y >= bossButtonArea.y &&
        y <= bossButtonArea.y + bossButtonArea.height
      ) {
        // 보스전 진입
        this.isPaused = false;
        this.isRoundTransition = false;
        this.isSpawningEnemies = false;
        this.enemyManager.clearEnemies();
        this.startBossBattle();
        return;
      }
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
    const normalizedDx = (dx / distance) * 3.6;
    const normalizedDy = (dy / distance) * 3.6;

    const effects = this.effects.getEffects();
    const bulletConfig = {
      x: this.player.x,
      y: this.player.y,
      dx: normalizedDx,
      dy: normalizedDy,
      damage: this.effects.weaponSystem.calculateDamage(effects),
      effects: effects,
      isGameOver: this.isGameOver,
      cards: this.cardManager.getCollectedCards(),
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
    this.score = 0;
    this.round = 1;
    this.enemiesKilledInRound = 0;
    this.enemiesRequiredForNextRound = 10;
    this.roundStartTime = Date.now();
    this.isSpawningEnemies = true;

    // 플레이어 초기화
    this.player = new Player(this.canvas);

    // 매니저 클래스 초기화
    this.cardManager = new CardManager();
    this.enemyManager = new EnemyManager(this.cardManager, this);
    this.bulletManager = new BulletManager(this);
    this.bulletManager.setUI(this.ui);

    // 효과 시스템 초기화
    this.effects = new Effects();
    this.currentWeapon = this.effects.weaponSystem.getCurrentWeapon();
  }

  gameLoop() {
    if (this.isStartScreen) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ui.drawStartScreen();
    } else if (!this.isGameOver) {
      if (!this.isPaused) {
        this.update();
      }
      this.draw();
    }

    this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    if (this.isPokerPhase) {
      // 포커 페이즈 업데이트
      if (
        this.pokerState.currentTurn === "boss" &&
        this.pokerState.phase === "betting"
      ) {
        // 보스 AI의 결정
        this.handleBossDecision();
      }
      return;
    }

    // 보스전 업데이트
    if (this.isBossBattle && this.boss) {
      const now = Date.now();
      const attack = this.boss.update(now, this.player);

      if (attack) {
        this.handleBossAttack(attack);
      }

      // 보스전 승리/패배 체크
      this.checkBossBattleResult();
    }

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
    const prevCards = JSON.stringify(this.cardManager.getCollectedCards());
    this.cardManager.updateCards(this.player, this.effects.getEffects());
    const currentCards = JSON.stringify(this.cardManager.getCollectedCards());

    // 카드가 변경되었을 때 효과 재계산 (개수 변경 또는 카드 교체)
    if (prevCards !== currentCards) {
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

    if (this.isStartScreen) {
      this.ui.drawStartScreen();
      return;
    }

    if (this.isShowingCommunityCards) {
      // UI에 수집된 카드 정보 전달
      this.ui.collectedCards = this.cardManager.getCollectedCards();
      this.ui.drawBossPreviewScreen(this.pokerSystem.communityCards);
      return;
    }

    if (this.isPokerPhase) {
      // UI에 수집된 카드 정보 전달
      this.ui.collectedCards = this.cardManager.getCollectedCards();
      this.ui.drawPokerUI(
        this.pokerState,
        this.pokerSystem,
        this.selectedCards
      );
      return;
    }

    // 게임 요소 그리기
    this.player.draw(this.ctx, this.mouseX, this.mouseY);
    this.cardManager.drawCards(this.ctx);
    this.enemyManager.drawEnemies(this.ctx);
    this.bulletManager.drawBullets(this.ctx);

    // 보스 그리기 (보스전일 때만)
    if (this.isBossBattle && this.boss) {
      this.boss.draw(this.ctx);
    }

    // UI에 수집된 카드 정보 전달
    this.ui.collectedCards = this.cardManager.getCollectedCards();
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
      boss: this.isBossBattle ? this.boss : null,
    });

    if (this.isPaused) {
      this.ui.drawPauseScreen();
    }

    if (this.isRoundTransition) {
      this.ui.drawRoundTransition(this.round);
    }

    if (this.isGameOver) {
      this.ui.drawGameOverScreen({
        score: this.score,
        round: this.round,
        cards: this.cardManager.getCollectedCards(),
      });
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

    // 보스전이나 포커 페이즈일 때는 라운드 진행 체크 건너뛰기
    if (this.isBossBattle || this.isPokerPhase) {
      return;
    }

    const roundTimeElapsed = Date.now() - this.roundStartTime;

    if (roundTimeElapsed >= this.roundDuration) {
      this.isSpawningEnemies = false;
    }

    if (!this.isSpawningEnemies && this.enemyManager.enemies.length === 0) {
      this.startRoundTransition();
    }
  }

  startRoundTransition() {
    this.isRoundTransition = true;
    this.roundTransitionStartTime = Date.now();
    this.bulletManager.clearBullets();
    this.player.heal(2);
  }

  startNextRound() {
    this.round++;
    this.isRoundTransition = false;
    this.enemiesKilledInRound = 0;
    this.roundStartTime = Date.now();
    this.enemiesRequiredForNextRound = Math.floor(10 * (1 + this.round * 0.2));
    this.roundDuration = Math.max(15000, 25000 - (this.round - 1) * 2000); // 25초에서 시작하여 라운드당 2초씩 감소, 최소 15초

    // 보스전이 끝난 후에는 일반 라운드로 진행
    if (this.isBossBattle) {
      this.isBossBattle = false;
      this.boss = null;
      this.isSpawningEnemies = true;
    } else if (this.round % 3 === 0) {
      // 3의 배수 라운드에서 보스전 시작
      // 보스전 시작
      this.startBossBattle();
    } else {
      this.isSpawningEnemies = true;
    }
  }

  // 보스전 시작
  startBossBattle(afterPoker = false) {
    // 적 생성 중단 및 기존 적 제거
    this.isSpawningEnemies = false;
    this.enemyManager.clearEnemies();

    if (!afterPoker) {
      // 새로운 보스 생성 및 포커 게임 초기화
      this.boss = new Boss(this.round);
      this.pokerSystem.resetGame();

      // 커뮤니티 카드 생성
      this.pokerSystem.generateCommunityCards();

      // 커뮤니티 카드 미리보기 상태로 설정
      this.isShowingCommunityCards = true;
      this.isPokerPhase = false;
      this.isBossBattle = false; // 포커 페이즈 동안은 false
      this.selectedCards = []; // 선택된 카드 초기화
    } else {
      // 포커 게임 결과를 가져와서 보스전 시작
      const gameResult = this.pokerSystem.getGameResult();
      if (gameResult) {
        this.cardManager.clearCards();
        [...gameResult.playerCards, ...gameResult.communityCards].forEach(
          (card) => {
            this.cardManager.collectCard(card.type, card.number);
          }
        );

        const result = this.effects.applyCardEffects(
          this.cardManager.getCollectedCards()
        );
        if (result.weaponChanged) {
          this.currentWeapon = result.currentWeapon;
        }

        // 포커 페이즈 종료 및 실제 보스전 시작
        this.isShowingCommunityCards = false;
        this.isPokerPhase = false;
        this.isBossBattle = true; // 실제 보스전 시작

        // 보스전 상태 재설정
        this.isRoundTransition = false;
        this.isSpawningEnemies = false;

        // 보스 상태 업데이트
        if (this.boss) {
          this.boss.resetAttackTimer();
        }
      }
    }
  }

  // 커뮤니티 카드 미리보기에서 포커 페이즈로 전환
  startPokerPhase() {
    this.isShowingCommunityCards = false;
    this.isPokerPhase = true;
    this.initializePokerRound();
  }

  // 포커 라운드 초기화
  initializePokerRound() {
    // 플레이어 카드 선택 UI 표시
    this.pokerState.phase = "selection";
    this.selectedCards = [];

    // 기본 판돈 설정 (플레이어 30% + 보스 30% = 60%)
    const initialBetPercent = 30;

    const playerBet = this.player.maxHp * (initialBetPercent / 100);
    const bossBet = this.boss.maxHp * (initialBetPercent / 100);

    this.pokerSystem.placeBet("player", playerBet);
    this.pokerSystem.placeBet("boss", bossBet);

    // 초기 베팅 퍼센트 저장 (추가 레이즈를 위한 기준)
    this.pokerState.currentBetPercent = 0; // 레이즈 금액만 추적
  }

  // 카드 선택 완료
  finishCardSelection(selectedCards) {
    this.pokerSystem.playerCards = selectedCards;
    this.pokerSystem.bossCards = this.pokerSystem.generateBossCards();
    this.pokerState.currentTurn = "player"; // 항상 플레이어 턴으로 시작
    this.pokerState.phase = "betting";

    // 초기 베팅 설정
    const initialPlayerBet = Math.floor(this.player.hp * 0.3);
    const initialBossBet = Math.floor(this.boss.hp * 0.2);
    this.pokerSystem.placeBet("player", initialPlayerBet);
    this.pokerSystem.placeBet("boss", initialBossBet);
  }

  // 베팅 액션 처리
  handlePokerAction(action, amount = 0) {
    switch (action) {
      case "fold":
        // 폴드 시 체력 30% 차감
        if (this.pokerState.currentTurn === "player") {
          this.player.hp = Math.max(
            1,
            this.player.hp - this.player.maxHp * 0.3
          );
        } else {
          this.boss.takeDamage(this.boss.maxHp * 0.2);
        }
        this.pokerSystem.saveGameResult();
        this.startBossBattle(true);
        break;

      case "raise":
        // 레이즈는 10% 또는 20%만 가능
        if (amount > 20) amount = 20;

        // 현재 베팅 퍼센트에 레이즈 금액 추가
        this.pokerState.currentBetPercent =
          (this.pokerState.currentBetPercent || 0) + amount;
        break;

      case "call":
        this.pokerState.phase = "showdown";
        // 쇼다운 시작 시간 설정 및 게임 결과 저장
        this.pokerSystem.saveGameResult();

        // 결과에 따른 데미지 처리는 보스전 시작 시에 수행
        const winner = this.pokerSystem.determineWinner();
        const totalBetPercent = 60 + this.pokerState.currentBetPercent;

        if (winner === "player") {
          // 보스는 총 배팅의 2/3만큼 데미지
          const bossDamage =
            this.boss.maxHp * (((totalBetPercent / 100) * 2) / 3);
          this.boss.takeDamage(bossDamage);
        } else {
          // 플레이어는 총 배팅만큼 데미지
          const playerDamage = this.player.maxHp * (totalBetPercent / 100);
          this.player.hp = Math.max(1, this.player.hp - playerDamage);
        }
        break;
    }
  }

  handleBossDecision() {
    // 보스는 액션을 하지 않고 플레이어의 턴으로 변경
    this.pokerState.currentTurn = "player";
    this.pokerState.lastAction = "보스가 당신의 선택을 기다립니다.";
  }

  handleBossAttack(attack) {
    switch (attack.type) {
      case "single":
        // 단일 강공격: 플레이어 방향으로 강한 공격
        const dx = this.player.x - this.canvas.width / 2;
        const dy = this.player.y - 150;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= attack.range) {
          this.player.takeDamage(attack.damage);
          this.ui.addDamageText(
            this.player.x,
            this.player.y,
            attack.damage,
            "#ff0000"
          );
        }
        this.boss.addAttackEffect("single", this.player);
        break;

      case "area":
        // 광역 약공격: 넓은 범위에 약한 공격
        const playerDistance = Math.sqrt(
          Math.pow(this.player.x - this.canvas.width / 2, 2) +
            Math.pow(this.player.y - 150, 2)
        );
        if (playerDistance <= attack.range) {
          this.player.takeDamage(attack.damage);
          this.ui.addDamageText(
            this.player.x,
            this.player.y,
            attack.damage,
            "#ff0000"
          );
        }
        this.boss.addAttackEffect("area", this.player);
        break;

      case "multi":
        // 연속 공격: 여러 번 공격
        this.startMultiAttack(attack);
        this.boss.addAttackEffect("multi", this.player);
        break;
    }
  }

  startMultiAttack(attack) {
    let count = 0;
    const interval = setInterval(() => {
      if (count >= attack.count || !this.boss || this.boss.isDead) {
        clearInterval(interval);
        this.boss.isAttacking = false;
        return;
      }

      const dx = this.player.x - this.canvas.width / 2;
      const dy = this.player.y - 150;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 100) {
        this.player.takeDamage(attack.damage);
        this.ui.addDamageText(
          this.player.x,
          this.player.y,
          attack.damage,
          "#ff0000"
        );
      }

      count++;
    }, attack.interval);
  }

  // 보스전 결과 체크
  checkBossBattleResult() {
    if (this.boss.isDead) {
      this.handleBossVictory();
    } else if (this.player.hp <= 0) {
      this.handleBossDefeat();
    }
  }

  // 보스전 승리 처리
  handleBossVictory() {
    this.isBossBattle = false;
    this.isRoundTransition = true;
    this.roundTransitionStartTime = Date.now();

    // 보상 지급
    this.score += this.round * 1000; // 라운드 기반 점수
    this.player.heal(5); // 체력 회복

    // 추가 카드 보상
    const rewardCards = this.generateRewardCards();
    rewardCards.forEach((card) => {
      this.cardManager.collectCard(card.type, card.number);
    });

    // 효과 재계산
    const result = this.effects.applyCardEffects(
      this.cardManager.getCollectedCards()
    );
    if (result.weaponChanged) {
      this.currentWeapon = result.currentWeapon;
    }

    // 다음 라운드 준비
    this.bulletManager.clearBullets();
    this.enemyManager.clearEnemies();
    this.boss = null; // 보스 객체 제거
  }

  // 보스전 패배 처리
  handleBossDefeat() {
    this.isGameOver = true;
    this.stopGame();

    // 최종 결과 표시
    this.ui.drawGameOverScreen({
      score: this.score,
      round: this.round,
      cards: this.cardManager.getCollectedCards(),
    });
  }

  // 보상 카드 생성
  generateRewardCards() {
    const rewardCount = Math.min(
      3,
      5 - this.cardManager.getCollectedCards().length
    );
    const cards = [];

    for (let i = 0; i < rewardCount; i++) {
      const types = ["spade", "heart", "diamond", "clover"];
      const type = types[Math.floor(Math.random() * types.length)];
      const number = Math.floor(Math.random() * 13) + 1;
      cards.push({ type, number });
    }

    return cards;
  }

  // 카드 선택 처리
  handleCardSelection(card) {
    // 이미 선택된 카드인지 확인
    const index = this.selectedCards.findIndex(
      (selected) =>
        selected.type === card.type && selected.number === card.number
    );

    if (index !== -1) {
      // 이미 선택된 카드면 선택 해제
      this.selectedCards.splice(index, 1);
    } else if (this.selectedCards.length < 2) {
      // 새로운 카드 선택 (중복 체크)
      const isDuplicate = this.selectedCards.some(
        (selected) =>
          selected.type === card.type && selected.number === card.number
      );
      if (!isDuplicate) {
        this.selectedCards.push(card);
      }
    }
  }
}

window.onload = function () {
  const game = new Game();
};
