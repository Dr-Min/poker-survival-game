import { Player } from "./player.js";
import { BulletManager } from "./bullet.js";
import { EnemyManager } from "./enemies/index.js";
import { CardManager } from "./card.js";
import { getHighestPokerHand } from "./pokerHands.js";
import { Effects } from "./effects.js";
import { UI } from "./ui.js";
import { Boss } from "./boss.js";
import { PokerSystem, POKER_PHASES } from "./poker.js";
import { OrbitingCard } from "./orbitingCard.js";
import { Village } from "./village.js";

export class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // 기본 게임 해상도 설정
    this.baseWidth = 1200;
    this.baseHeight = 800;
    this.aspectRatio = this.baseWidth / this.baseHeight;

    // 화면 크기 초기화 - 먼저 실행하여 캔버스 크기 설정
    this.handleResize();
    
    // 디버그 옵션 추가
    this.debugOptions = {
      showFPS: false,
      showHitboxes: true, // 히트박스 표시 기본 활성화
      showPlayerStats: false,
      logCollisions: true, // 충돌 로그 표시 옵션
      invincibleMode: false // 무적 모드 옵션
    };
    
    // 편집 모드 설정
    this.isEditMode = false;

    // 게임 상태 초기화
    this.score = 0;
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.isStartScreen = true; // 시작 화면 상태 추가
    this.isVillageMode = true; // 마을 모드 활성화
    
    // 매니저 클래스 초기화 - 플레이어를 먼저 생성
    this.player = new Player(this.canvas);
    
    // 플레이어 위치 명시적 설정
    if (this.canvas && this.canvas.width > 0 && this.canvas.height > 0) {
      this.player.x = this.canvas.width / 2;
      this.player.y = this.canvas.height / 2;
    } else {
      console.error("캔버스 크기 문제 감지:", this.canvas);
    }
    
    // 마을 모드 초기화 - 플레이어 초기화 후 진행
    this.startVillage();
    
    // 나머지 매니저 클래스 초기화
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
      showHitboxes: false, // 히트박스 표시 여부
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

    // 자동 발사 관련 속성 추가
    this.lastAutoShootTime = 0;
    this.autoShootInterval = 250; // 자동 발사 간격을 100ms (0.1초)로 변경

    // 오비탈 카드 관리
    this.orbitingCards = [];
    this.lastOrbitingCardsUpdate = 0;
    this.lastSpadeCount = 0;

    // 이벤트 리스너 설정
    this.setupEventListeners();
    if (this.isMobile) {
      this.setupMobileEventListeners();
    }
    this.gameLoop(); // startGame() 대신 gameLoop() 직접 호출
    window.game = this; // window.game 설정 추가
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

    // 캔버스 크기 설정
    this.canvas.width = this.baseWidth;
    this.canvas.height = this.baseHeight;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;

    // 플레이어가 존재하고 화면 크기가 변경되었을 때 플레이어 위치 보정
    if (this.player && (this.player.x < 20 || this.player.y < 20 || 
        this.player.x > this.canvas.width - 20 || this.player.y > this.canvas.height - 20)) {
      console.log("리사이즈 후 플레이어 위치 보정", {
        이전x: this.player.x,
        이전y: this.player.y,
        캔버스폭: this.canvas.width,
        캔버스높이: this.canvas.height
      });
      
      // 플레이어 위치 화면 중앙으로 보정
      this.player.x = this.canvas.width / 2;
      this.player.y = this.canvas.height / 2;
    }

    // 모바일 조작 버튼 위치 조정
    if (this.isMobile) {
      this.shootButton.x = this.canvas.width - 80;
      this.shootButton.y = this.canvas.height - 80;
    }
  };

  setupEventListeners() {
    // 키 이벤트
    window.addEventListener("keydown", (e) => {
      // F5와 F12는 기본 동작 허용
      if (e.key === "F5" || e.key === "F12") return;

      e.preventDefault(); // 기본 동작 방지
      this.handleKeyDown(e);
    });
    window.addEventListener("keyup", (e) => {
      // F5와 F12는 기본 동작 허용
      if (e.key === "F5" || e.key === "F12") return;

      e.preventDefault(); // 기본 동작 방지
      this.handleKeyUp(e);
    });

    // 마우스 이벤트
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.handleRightClick(e);
    });

    // 리사이즈 이벤트
    window.addEventListener("resize", this.handleResize);
  }

  handleKeyDown(e) {
    // 마을 모드에서는 키 입력 처리 계속 진행, 게임오버 상태에서만 중단
    if (this.isGameOver) return;

    this.keys[e.key.toLowerCase()] = true; // 소문자로 통일

    if (e.key === "Escape") {
      this.isPaused = !this.isPaused;
    }

    // 마을 모드에서 E 키 누르면 워프 포인트와 상호작용
    if (this.isVillageMode && e.key.toLowerCase() === "e") {
      if (this.village.tryInteractWithWarpPoint()) {
        this.isVillageMode = false;
        this.isStartScreen = false; // 시작 화면 상태 비활성화
        
        // 게임 시작 상태만 초기화하고 라운드는 유지
        this.isGameOver = false;
        this.isPaused = false;
        this.isPokerPhase = false;
        
        // 첫 라운드 직접 시작 (round 초기화하지 않음)
        this.isRoundTransition = false;
        this.roundStartTime = Date.now();
        this.isSpawningEnemies = true;
        this.enemiesKilledInRound = 0;
      }
      return;
    }

    // 마을 모드가 아닐 때 E 키를 눌렀을 때 근처 카드 수집
    if (!this.isVillageMode && e.key.toLowerCase() === "e") {
      if (this.cardManager.collectNearbyCard()) {
        // 카드를 수집하면 효과 적용
        const result = this.applyCardEffects(
          this.cardManager.getCollectedCards()
        );
        if (result.weaponChanged) {
          this.currentWeapon = result.currentWeapon;
        }
        // 카드 획득 효과음 추가 가능 (향후 구현)
      }
    }

    if (this.isPaused && e.key === "Enter") {
      const cardInfo = this.ui.getDebugCardInfo();
      if (cardInfo) {
        const card = this.cardManager.createCard(
          cardInfo.type,
          cardInfo.number
        );
        this.cardManager.collectCard(card.type, card.number);
        const result = this.applyCardEffects(
          this.cardManager.getCollectedCards()
        );
        if (result.weaponChanged) {
          this.currentWeapon = result.currentWeapon;
        }
        this.ui.selectedType = null;
        this.ui.selectedNumber = null;
      }
    }
  }

  handleKeyUp(e) {
    // 게임오버 상태에서만 키 입력 중단
    if (this.isGameOver) return;
    this.keys[e.key.toLowerCase()] = false; // 소문자로 통일
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

    // 게임 오버 화면에서 마을로 돌아가기 버튼 클릭
    if (this.isGameOver && this.ui.gameOverButtonArea) {
      const btnArea = this.ui.gameOverButtonArea;
      if (
        x >= btnArea.x &&
        x <= btnArea.x + btnArea.width &&
        y >= btnArea.y &&
        y <= btnArea.y + btnArea.height
      ) {
        this.returnToVillage();
        return;
      }
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

      // 폭발 테스트 버튼 클릭 체크
      const explosionButtonArea = this.ui.explosionButtonArea;
      if (
        explosionButtonArea &&
        x >= explosionButtonArea.x &&
        x <= explosionButtonArea.x + explosionButtonArea.width &&
        y >= explosionButtonArea.y &&
        y <= explosionButtonArea.y + explosionButtonArea.height
      ) {
        if (this.boss) {
          this.boss.testExplosion();
        }
        return;
      }

      this.ui.handleDebugClick(x, y);
    } else {
      this.shoot();
    }
  }

  setupMobileEventListeners() {
    // 터치 이벤트 리스너
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      // 조이스틱 활성화
      if (x < this.canvas.width / 2) {
        this.joystick.active = true;
        this.joystick.startX = x;
        this.joystick.startY = y;
        this.joystick.moveX = x;
        this.joystick.moveY = y;
      }

      // 슈팅 버튼 처리
      if (this.isInShootButton(x, y)) {
        this.shoot();
      }

      // 플레이어 터치 이벤트 처리
      this.player.handleTouchStart(e);
    });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;

      if (this.joystick.active) {
        this.joystick.moveX = x;
        this.joystick.moveY = y;
      }

      // 플레이어 터치 이벤트 처리
      this.player.handleTouchMove(e);
    });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.joystick.active = false;

      // 플레이어 터치 이벤트 처리
      this.player.handleTouchEnd();
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

    // 마우스/터치 위치가 플레이어와 같은 위치일 경우 발사하지 않음
    if (dx === 0 && dy === 0) return;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = (dx / distance) * 6;
    const normalizedDy = (dy / distance) * 6;

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
    // 게임 상태 초기화
    this.isGameOver = false;
    this.isPaused = false;
    this.isPokerPhase = false;
    this.isStartScreen = false; // 시작 화면 상태 명시적으로 비활성화
    
    // 처음 게임을 시작할 때만 라운드를 1로 초기화
    if (!this.round || this.round < 1) {
      this.round = 1;
    }
    
    this.score = 0;

    // 전역 게임 객체 설정
    window.game = this;

    // 캔버스 크기가 올바른지 확인
    this.handleResize();

    // 게임 요소 초기화
    const oldPlayer = this.player; // 기존 플레이어 객체 임시 저장
    this.player = new Player(this.canvas);
    
    // 플레이어 위치 설정 (기존 위치 유지 또는 중앙으로 설정)
    if (oldPlayer && oldPlayer.x > 0 && oldPlayer.y > 0) {
      this.player.x = oldPlayer.x;
      this.player.y = oldPlayer.y;
    } else {
      // 명시적으로 중앙에 배치
      this.player.x = this.canvas.width / 2;
      this.player.y = this.canvas.height / 2;
    }
    
    this.cardManager = new CardManager();
    this.enemyManager = new EnemyManager(this.cardManager, this);
    this.bulletManager = new BulletManager(this);
    this.effects = new Effects();
    this.ui = new UI(this.canvas);
    this.bulletManager.setUI(this.ui);

    // 효과 시스템 초기화
    this.currentWeapon = this.effects.weaponSystem.getCurrentWeapon();

    // 라운드 시스템 초기화
    this.enemiesKilledInRound = 0;
    this.enemiesRequiredForNextRound = 10;
    this.roundStartTime = Date.now();
    this.roundDuration = 25000; // 25초로 수정
    this.isRoundTransition = false;
    this.roundTransitionDuration = 3000;
    this.roundTransitionStartTime = 0;
    this.isSpawningEnemies = true;

    // 디버그 옵션 초기화
    this.debugOptions = {
      selectedCard: { type: "spade", number: 1 },
      cardTypes: ["spade", "heart", "diamond", "clover"],
      cardNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      ricochetChance: 1.0,
      showHitboxes: false, // 히트박스 표시 여부
    };

    // 보스전 관련 상태 추가
    this.boss = null;
    this.pokerSystem = new PokerSystem();
    this.isBossBattle = false;
    this.selectedCards = [];
    this.pokerState = {
      currentTurn: null, // 'player' or 'boss'
      phase: "selection", // 'selection', 'betting', 'showdown'
      lastAction: null,
      lastBet: 0,
      currentBetPercent: 0,
    };

    // 자동 발사 관련 속성 추가
    this.lastAutoShootTime = 0;
    this.autoShootInterval = 250; // 자동 발사 간격을 250ms (0.25초)로 설정
  }

  gameLoop() {
    if (this.debugMode) {
      if (this.debugOptions.showDebugInfo) {
        console.log('FPS:', Math.round(1000 / (Date.now() - this.lastFrameTime)));
      }
      this.lastFrameTime = Date.now();
    }
    
    if (this.isVillageMode) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // 플레이어 이동 처리 (이전 위치 저장)
      this.prevPlayerX = this.player.x;
      this.prevPlayerY = this.player.y;
      
      // 플레이어 이동 처리
      this.player.move(this.keys, this.mouseX, this.mouseY, this.joystick);
      
      // 마을에서 플레이어와 건물 충돌 처리
      if (this.village) {
        this.village.handlePlayerMovement(this.player, this.keys);
      }
      
      // 마을 업데이트 추가 (플레이어 움직임과 관계없이 양 애니메이션 업데이트)
      // 더 작은 deltaTime을 사용하여 더 부드러운 움직임을 구현
      const deltaTime = this.lastFrameTime ? Math.min(16.67, Date.now() - this.lastFrameTime) : 16.67;
      this.village.update(deltaTime, this.player);
      
      // 마을 모드 그리기
      this.village.draw(this.player);
      
      // 플레이어 그리기
      this.player.draw(this.ctx, this.debugOptions.showHitboxes);
    } else if (!this.isGameOver) {
      if (!this.isPaused) {
        this.update();
      }
      this.draw();
    }

    this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    if (this.isGameOver) return;

    if (this.isPokerPhase) {
      return;
    }

    // 플레이어 위치 보호 - 왼쪽 상단에 박히는 현상 방지
    if (this.player.x < 20 && this.player.y < 20) {
      console.log("플레이어 위치 이상 감지 - 위치 재설정", { 이전x: this.player.x, 이전y: this.player.y });
      this.player.x = this.canvas.width / 2;
      this.player.y = this.canvas.height / 2;
    }

    // 자동 발사 처리
    const currentTime = Date.now();
    if (currentTime - this.lastAutoShootTime >= this.autoShootInterval) {
      this.shoot();
      this.lastAutoShootTime = currentTime;
    }

    // 보스전 업데이트
    if (this.isBossBattle && this.boss) {
      const now = Date.now();
      const attack = this.boss.update(now, this.player);

      if (attack) {
        // 공격 정보를 상태로 저장
        this.currentBossAttack = {
          ...attack,
          startTime: now,
          duration: attack.type === "slam" ? 1000 : 500, // 공격 타입별 지속시간
          hasDealtDamage: false,
        };
      }

      // 현재 진행 중인 공격 업데이트
      if (this.currentBossAttack) {
        const attackAge = now - this.currentBossAttack.startTime;

        // 공격 판정 타이밍 (애니메이션 중간 시점)
        const damageTime = this.currentBossAttack.duration * 0.5;

        // 데미지 판정 시점에 도달했고 아직 데미지를 주지 않았다면
        if (attackAge >= damageTime && !this.currentBossAttack.hasDealtDamage) {
          this.handleBossAttack(this.currentBossAttack);
          this.currentBossAttack.hasDealtDamage = true;
        }

        // 공격 종료
        if (attackAge >= this.currentBossAttack.duration) {
          this.currentBossAttack = null;
        }
      }

      // 보스와 플레이어의 충돌 처리
      const dx = this.boss.x - this.player.x;
      const dy = this.boss.y - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (this.boss.size + this.player.size) * 0.8;

      if (distance < minDistance) {
        const angle = Math.atan2(dy, dx);
        this.boss.x = this.player.x + Math.cos(angle) * minDistance;
        this.boss.y = this.player.y + Math.sin(angle) * minDistance;
        this.boss.x = Math.max(
          this.boss.size,
          Math.min(1200 - this.boss.size, this.boss.x)
        );
        this.boss.y = Math.max(
          this.boss.size,
          Math.min(800 - this.boss.size, this.boss.y)
        );
      }

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
      const result = this.applyCardEffects(
        this.cardManager.getCollectedCards()
      );
      // 무기가 변경되었다면 현재 무기 업데이트
      if (result.weaponChanged) {
        this.currentWeapon = result.currentWeapon;
      }

      // 하트 효과 처리 - increaseBagSize 메서드 호출 추가
      if (
        result.effects &&
        result.effects.heart &&
        result.effects.heart.bagSizeIncrease > 0
      ) {
        console.log(
          `하트 효과: 주머니 크기 ${result.effects.heart.bagSizeIncrease} 증가 시도`
        );
        this.player.increaseBagSize(result.effects.heart.bagSizeIncrease);
      }

      // 하트 카드 효과 직접 적용 (칩 주머니 크기 증가)
      if (result.effects.heart && result.effects.heart.count >= 2) {
        // 최대 체력을 아직 150으로 설정하지 않은 경우만 체력 비율 적용
        if (this.player.chipBag !== 150) {
          console.log(
            `하트 ${result.effects.heart.count}개: 최대 체력을 ${this.player.chipBag}에서 150으로 변경합니다`
          );
          // 현재 체력 저장
          const currentHealth = this.player.chips;
          // 최대 체력 설정
          this.player.chipBag = 150;

          // 체력이 100 이하일 경우 그대로 유지, 100 초과일 경우만 비율 적용
          if (currentHealth <= 100) {
            // 체력을 그대로 유지
            this.player.chips = currentHealth;
          } else {
            // 100을 초과하는 경우만 비율 적용
            const currentHealthRatio = currentHealth / 100;
            const newHealth = Math.max(
              currentHealth,
              Math.min(150, Math.floor(150 * currentHealthRatio))
            );
            this.player.chips = newHealth;
          }

          console.log(
            `플레이어 체력 변경: ${this.player.chips}/${this.player.chipBag}`
          );
        } else {
          // 이미 최대 체력이 150인 경우 현재 체력 유지, 로그만 출력
          console.log(
            `하트 ${result.effects.heart.count}개: 이미 최대 체력이 150입니다. 현재 체력: ${this.player.chips}`
          );
        }
      } else if (this.player.chipBag > 100) {
        // 하트 카드가 2개 미만일 때 최대 체력을 100으로 복원
        console.log(
          `하트 ${result.effects.heart.count}개: 최대 체력을 ${this.player.chipBag}에서 100으로 복원합니다`
        );
        // 현재 체력 저장
        const currentHealth = this.player.chips;
        // 체력 비율 계산 (천천히 감소되도록)
        const currentHealthRatio = currentHealth / this.player.chipBag;
        this.player.chipBag = 100;
        // 새 체력 계산 (최소 절반은 유지)
        const newHealth = Math.max(
          Math.floor(currentHealth * 0.5), // 최소 현재 체력의 50%는 유지
          Math.min(100, Math.floor(100 * currentHealthRatio))
        );
        this.player.chips = newHealth;
        console.log(`플레이어 체력 변경: ${newHealth}/${this.player.chipBag}`);
      }

      // 하트 3개 달성 시 즉시 아군 소환
      if (result.effects.heart && result.effects.heart.count >= 3) {
        try {
          const parsedPrevCards = JSON.parse(prevCards);
          const prevHeartCount = parsedPrevCards.filter(
            (card) => card.type === "heart"
          ).length;

          // 하트 수가 3개 미만에서 3개 이상으로 증가했을 때만 실행
          if (prevHeartCount < 3 && result.effects.heart.count >= 3) {
            // 아군 2명 즉시 소환
            this.spawnAllies(2);
          }
        } catch (error) {
          console.error("카드 정보 파싱 실패:", error);
        }
      }
    }

    this.bulletManager.updateBullets(
      this.canvas,
      this.enemyManager.enemies,
      this.effects.getEffects()
    );

    this.checkRoundProgress();

    // 오비탈 카드 업데이트 (추가)
    this.updateOrbitingCards(currentTime);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 배경 그리기 (투명)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 보스 공격 판정 영역 그리기
    if (this.currentBossAttack) {
      const attack = this.currentBossAttack;
      const ctx = this.ctx;

      ctx.save();

      // 공격 판정 영역 표시
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#ff0000";

      switch (attack.type) {
        case "bomb":
        case "slam":
          ctx.beginPath();
          ctx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
          ctx.fill();

          // 테두리
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 2;
          ctx.stroke();

          // 데미지 표시
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#ffffff";
          ctx.font = "14px Arial";
          ctx.fillText(
            `데미지: ${attack.damage}`,
            attack.x - 30,
            attack.y - attack.radius - 10
          );
          break;

        case "single":
        case "area":
          ctx.beginPath();
          ctx.arc(
            attack.x || this.canvas.width / 2,
            attack.y || 150,
            attack.range,
            0,
            Math.PI * 2
          );
          ctx.fill();

          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
      }

      ctx.restore();
    }

    if (this.isStartScreen) {
      // 시작 화면을 더 이상 표시하지 않음
      // this.ui.drawStartScreen();
      // return;
    }

    if (this.isShowingCommunityCards) {
      this.ui.collectedCards = this.cardManager.getCollectedCards();
      this.ui.drawBossPreviewScreen(this.pokerSystem.communityCards);
      return;
    }

    if (this.isPokerPhase) {
      this.ui.collectedCards = this.cardManager.getCollectedCards();
      this.ui.drawPokerUI(
        this.pokerState,
        this.pokerSystem,
        this.selectedCards
      );
      return;
    }

    // 게임 요소 그리기
    this.player.draw(this.ctx, this.debugOptions.showHitboxes);
    this.drawOrbitingCards(); // 회전 카드 그리기
    this.cardManager.drawCards(this.ctx);
    this.enemyManager.drawEnemies(this.ctx);
    this.bulletManager.drawBullets(this.ctx);

    // 보스 그리기 (보스전일 때만)
    if (this.isBossBattle && this.boss) {
      this.boss.draw(this.ctx, this.debugOptions.showHitboxes);
    }

    // 데미지 텍스트 업데이트 및 그리기
    this.ui.updateDamageTexts();

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
      showHitboxes: this.debugOptions.showHitboxes,
    });

    if (this.isPaused) {
      this.ui.drawPauseScreen();
    }

    if (this.isRoundTransition) {
      this.ui.drawRoundTransition(this.round);
    }

    // 게임 오버 화면 그리기
    if (this.isGameOver) {
      const gameState = {
        player: this.player,
        round: this.round,
        cards: this.cardManager.getCollectedCards(),
      };
      this.ui.drawGameOverScreen(gameState);
      return; // 게임 오버 화면 이후 다른 요소는 그리지 않음
    }
  }

  stopGame() {
    this.isGameOver = true;
    // gameLoop는 계속 실행되도록 cancelAnimationFrame 제거

    // 게임오버 화면 표시
    this.ui.drawGameOverScreen({
      score: this.score,
      round: this.round,
      cards: this.cardManager.getCollectedCards(),
    });
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

    // 모든 적대적인 적이 처리되었는지 확인 (죽었거나 아군으로 변경됨)
    const hasHostileEnemies = this.enemyManager.enemies.some(
      (enemy) => !enemy.isDead && !enemy.isAlly
    );

    if (!this.isSpawningEnemies && !hasHostileEnemies) {
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

    // 새 라운드에서도 살아있는 아군 유지 (clearEnemies 메서드 활용)
    this.enemyManager.clearEnemies(true); // true = 아군 유지

    this.roundStartTime = Date.now();
    this.enemiesRequiredForNextRound = Math.floor(10 * (1 + this.round * 0.2));
    this.roundDuration = Math.max(15000, 25000 - (this.round - 1) * 2000); // 25초에서 시작하여 라운드당 2초씩 감소, 최소 15초

    console.log(
      `라운드 ${this.round} 시작, 남은 아군: ${this.enemyManager.enemies.length}명`
    );

    // 보스전 관련 상태 확인 및 설정
    if (this.isBossBattle) {
      // 아직 보스전 진행 중이면 보스전 상태 유지
      this.isBossBattle = true;
      this.isSpawningEnemies = false;
    } else if (this.round % 3 === 0) {
      // 3의 배수 라운드에서 보스전 시작
      this.startBossBattle();
    } else {
      // 일반 라운드 시작
      this.isBossBattle = false; // 명시적으로 보스전 아님을 설정
      this.boss = null; // 보스 객체 제거 (안전을 위해 중복 설정)
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
      this.boss = new Boss(this.round, this.canvas);
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

        const result = this.applyCardEffects(
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

    // 카드가 없는 경우 랜덤 카드 2장 지급
    if (!this.cardManager.getCollectedCards().length) {
      const types = ["spade", "heart", "diamond", "clover"];
      for (let i = 0; i < 2; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const number = Math.floor(Math.random() * 13) + 1;
        this.cardManager.collectCard(type, number);
      }

      // 카드 효과 재계산
      const result = this.applyCardEffects(
        this.cardManager.getCollectedCards()
      );
      if (result.weaponChanged) {
        this.currentWeapon = result.currentWeapon;
      }
    }

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
        const gameResult = this.pokerSystem.saveGameResult();

        // 결과에 따른 데미지 처리
        const totalBetPercent = 60 + this.pokerState.currentBetPercent;

        if (gameResult.winner === "player") {
          // 보스는 총 배팅의 2/3만큼 데미지
          const bossDamage =
            this.boss.chipBag * (((totalBetPercent / 100) * 2) / 3);
          this.boss.takeDamage(bossDamage);
          console.log("보스 데미지:", bossDamage);
        } else {
          // 플레이어는 총 배팅만큼 데미지
          const playerDamage = this.player.chipBag * (totalBetPercent / 100);
          this.player.chips = Math.max(1, this.player.chips - playerDamage);
          console.log("플레이어 데미지:", playerDamage);
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
        // 단일 강공격 판정 영역 표시
        const ctx = this.canvas.getContext("2d");
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(this.canvas.width / 2, 150, attack.range, 0, Math.PI * 2);
        ctx.fill();

        // 테두리 표시
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 데미지 표시
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px Arial";
        ctx.fillText(
          `데미지: ${attack.damage}`,
          this.canvas.width / 2 - 30,
          120
        );
        ctx.restore();

        // 데미지 판정
        const singleDx = this.player.x - this.canvas.width / 2;
        const singleDy = this.player.y - 150;
        const singleDistance = Math.sqrt(
          singleDx * singleDx + singleDy * singleDy
        );
        if (singleDistance <= attack.range) {
          this.player.takeDamage(attack.damage);
          this.ui.addDamageText(
            this.player.x,
            this.player.y,
            attack.damage,
            "#ff0000"
          );
        }
        break;

      case "area":
        // 광역 약공격 판정 영역 표시
        const areaCtx = this.canvas.getContext("2d");
        areaCtx.save();
        areaCtx.globalAlpha = 0.2;
        areaCtx.fillStyle = "#ff0000";
        areaCtx.beginPath();
        areaCtx.arc(this.canvas.width / 2, 150, attack.range, 0, Math.PI * 2);
        areaCtx.fill();

        // 테두리 표시
        areaCtx.globalAlpha = 0.8;
        areaCtx.strokeStyle = "#ff0000";
        areaCtx.lineWidth = 2;
        areaCtx.stroke();

        // 데미지 표시
        areaCtx.globalAlpha = 1;
        areaCtx.fillStyle = "#ffffff";
        areaCtx.font = "14px Arial";
        areaCtx.fillText(
          `데미지: ${attack.damage}`,
          this.canvas.width / 2 - 30,
          120
        );
        areaCtx.restore();

        // 데미지 판정
        const areaDx = this.player.x - this.canvas.width / 2;
        const areaDy = this.player.y - 150;
        const areaDistance = Math.sqrt(areaDx * areaDx + areaDy * areaDy);
        if (areaDistance <= attack.range) {
          this.player.takeDamage(attack.damage);
          this.ui.addDamageText(
            this.player.x,
            this.player.y,
            attack.damage,
            "#ff0000"
          );
        }
        break;

      case "multi":
        // 연속 공격 판정 영역 표시
        const multiCtx = this.canvas.getContext("2d");
        multiCtx.save();
        multiCtx.globalAlpha = 0.2;
        multiCtx.fillStyle = "#ff0000";
        multiCtx.beginPath();
        multiCtx.arc(this.canvas.width / 2, 150, 100, 0, Math.PI * 2);
        multiCtx.fill();

        // 테두리 표시
        multiCtx.globalAlpha = 0.8;
        multiCtx.strokeStyle = "#ff0000";
        multiCtx.lineWidth = 2;
        multiCtx.stroke();

        // 데미지 표시
        multiCtx.globalAlpha = 1;
        multiCtx.fillStyle = "#ffffff";
        multiCtx.font = "14px Arial";
        multiCtx.fillText(
          `데미지: ${attack.damage} x ${attack.count}`,
          this.canvas.width / 2 - 40,
          120
        );
        multiCtx.restore();
        break;

      case "cross":
        // 십자 레이저 판정 영역 표시
        const crossCtx = this.canvas.getContext("2d");
        crossCtx.save();
        crossCtx.globalAlpha = 0.2;
        crossCtx.fillStyle = "#ff0000";

        // 가로 레이저
        crossCtx.fillRect(
          0,
          this.boss.y - attack.width / 2,
          this.canvas.width,
          attack.width
        );
        // 세로 레이저
        crossCtx.fillRect(
          this.boss.x - attack.width / 2,
          0,
          attack.width,
          this.canvas.height
        );

        // 테두리 표시
        crossCtx.globalAlpha = 0.8;
        crossCtx.strokeStyle = "#ff0000";
        crossCtx.lineWidth = 2;
        crossCtx.strokeRect(
          0,
          this.boss.y - attack.width / 2,
          this.canvas.width,
          attack.width
        );
        crossCtx.strokeRect(
          this.boss.x - attack.width / 2,
          0,
          attack.width,
          this.canvas.height
        );

        // 데미지 표시
        crossCtx.globalAlpha = 1;
        crossCtx.fillStyle = "#ffffff";
        crossCtx.font = "14px Arial";
        crossCtx.fillText(
          `데미지: ${attack.damage}/초`,
          this.boss.x + 20,
          this.boss.y - 20
        );
        crossCtx.restore();
        break;

      case "circular":
        // 원형 탄막 판정 영역 표시
        const circularCtx = this.canvas.getContext("2d");
        circularCtx.save();

        // 탄막 패턴 표시
        for (let i = 0; i < attack.bulletCount; i++) {
          const angle = (i * Math.PI * 2) / attack.bulletCount;
          const x = this.boss.x + Math.cos(angle) * 50;
          const y = this.boss.y + Math.sin(angle) * 50;

          circularCtx.globalAlpha = 0.2;
          circularCtx.fillStyle = "#ff0000";
          circularCtx.beginPath();
          circularCtx.arc(x, y, 8, 0, Math.PI * 2);
          circularCtx.fill();

          // 탄막 방향 표시
          circularCtx.globalAlpha = 0.8;
          circularCtx.strokeStyle = "#ff0000";
          circularCtx.beginPath();
          circularCtx.moveTo(this.boss.x, this.boss.y);
          circularCtx.lineTo(
            x + Math.cos(angle) * 30,
            y + Math.sin(angle) * 30
          );
          circularCtx.stroke();
        }

        // 데미지 표시
        circularCtx.globalAlpha = 1;
        circularCtx.fillStyle = "#ffffff";
        circularCtx.font = "14px Arial";
        circularCtx.fillText(
          `데미지: ${attack.damage}/발`,
          this.boss.x + 20,
          this.boss.y - 20
        );
        circularCtx.restore();
        break;

      case "bomb":
        // 폭탄 공격 판정 영역 표시
        const bombCtx = this.canvas.getContext("2d");
        bombCtx.save();

        // 폭발 범위 표시
        bombCtx.globalAlpha = 0.2;
        bombCtx.fillStyle = "#ff0000";
        bombCtx.beginPath();
        bombCtx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
        bombCtx.fill();

        // 테두리 표시
        bombCtx.globalAlpha = 0.8;
        bombCtx.strokeStyle = "#ff0000";
        bombCtx.lineWidth = 2;
        bombCtx.stroke();

        // 데미지 표시
        bombCtx.globalAlpha = 1;
        bombCtx.fillStyle = "#ffffff";
        bombCtx.font = "14px Arial";
        bombCtx.fillText(
          `폭발 데미지: ${attack.damage}`,
          attack.x - 40,
          attack.y - attack.radius - 10
        );

        bombCtx.restore();
        break;

      case "slam":
        // 슬램 공격 판정 영역 표시
        const slamCtx = this.canvas.getContext("2d");
        slamCtx.save();

        // 충격파 범위 표시
        slamCtx.globalAlpha = 0.2;
        slamCtx.fillStyle = "#ff0000";
        slamCtx.beginPath();
        slamCtx.arc(attack.x, attack.y, attack.radius, 0, Math.PI * 2);
        slamCtx.fill();

        // 테두리와 거리별 데미지 구간 표시
        const radiusSteps = [0.33, 0.66, 1];
        radiusSteps.forEach((step, index) => {
          slamCtx.globalAlpha = 0.8;
          slamCtx.strokeStyle = "#ff0000";
          slamCtx.lineWidth = 2;
          slamCtx.beginPath();
          slamCtx.arc(attack.x, attack.y, attack.radius * step, 0, Math.PI * 2);
          slamCtx.stroke();

          // 구간별 데미지 표시
          const damageAtRadius = Math.round(attack.damage * (1 - step));
          slamCtx.globalAlpha = 1;
          slamCtx.fillStyle = "#ffffff";
          slamCtx.font = "12px Arial";
          slamCtx.fillText(
            `${damageAtRadius}`,
            attack.x + 10,
            attack.y - attack.radius * step
          );
        });

        // 최대 데미지 표시
        slamCtx.globalAlpha = 1;
        slamCtx.fillStyle = "#ffffff";
        slamCtx.font = "14px Arial";
        slamCtx.fillText(
          `최대 데미지: ${attack.damage}`,
          attack.x - 50,
          attack.y - attack.radius - 10
        );

        slamCtx.restore();

        // 실제 데미지 판정
        const slamDx = this.player.x - attack.x;
        const slamDy = this.player.y - attack.y;
        const slamDistance = Math.sqrt(slamDx * slamDx + slamDy * slamDy);

        if (slamDistance <= attack.radius) {
          const damageRatio = 1 - slamDistance / attack.radius;
          const finalDamage = attack.damage * damageRatio;

          console.log(
            `슬램 공격 데미지 판정: 거리=${slamDistance.toFixed(2)}, 반경=${
              attack.radius
            }, 데미지 비율=${damageRatio.toFixed(
              2
            )}, 최종 데미지=${finalDamage.toFixed(0)}`
          );

          this.player.takeDamage(finalDamage);
          if (this.ui) {
            this.ui.addDamageText(
              this.player.x,
              this.player.y,
              Math.round(finalDamage),
              "#ff0000"
            );
          }
        }
        break;
    }
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
    const result = this.applyCardEffects(this.cardManager.getCollectedCards());
    if (result.weaponChanged) {
      this.currentWeapon = result.currentWeapon;
    }

    // 다음 라운드 준비
    this.bulletManager.clearBullets();
    this.enemyManager.clearEnemies();
    this.boss = null; // 보스 객체 제거
    
    // 다음 라운드로 진행 (마을로 돌아가지 않고 게임 계속)
    // 잠시 대기 후 다음 라운드 시작 (라운드 전환 효과 표시를 위해)
    setTimeout(() => {
      this.startNextRound();
    }, this.roundTransitionDuration);
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

  handleRightClick(e) {
    if (this.isStartScreen || this.isPaused || this.isGameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 플레이어에게 대시 명령 전달
    this.player.dash(x, y);
  }

  // 아군 소환 메서드 추가
  spawnAllies(count) {
    if (!this.enemyManager) return;

    console.log(`${count}명의 아군 즉시 소환 시도`);

    for (let i = 0; i < count; i++) {
      // 랜덤 위치에 아군 소환
      const x = this.player.x + (Math.random() * 100 - 50);
      const y = this.player.y + (Math.random() * 100 - 50);

      // 랜덤 타입의 적으로 아군 생성
      const enemyTypes = ["TwoLegsEnemy", "FourLegsEnemy"];
      const randomType =
        enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

      const ally = this.enemyManager.createEnemy(x, y, randomType);

      if (ally) {
        ally.isAlly = true;
        ally.chips = 30; // 아군 체력 30으로 설정
        ally.maxChips = 30;
        console.log("아군 소환됨:", ally);
      }
    }
  }

  applyCardEffects(collectedCards) {
    if (!this.effects) return;

    const result = this.effects.applyCardEffects(collectedCards);
    console.log("카드 효과 적용 결과:", result);

    // 하트 효과 직접 적용 - increaseBagSize 메서드 호출 추가
    if (
      result.effects &&
      result.effects.heart &&
      result.effects.heart.bagSizeIncrease > 0
    ) {
      console.log(
        `하트 효과: 주머니 크기 ${result.effects.heart.bagSizeIncrease} 증가 시도`
      );
      this.player.increaseBagSize(result.effects.heart.bagSizeIncrease);
    }

    // 하트 카드 효과 직접 적용 (칩 주머니 크기 증가)
    if (result.effects.heart && result.effects.heart.count >= 2) {
      // 최대 체력을 아직 150으로 설정하지 않은 경우만 체력 비율 적용
      if (this.player.chipBag !== 150) {
        console.log(
          `하트 ${result.effects.heart.count}개: 최대 체력을 ${this.player.chipBag}에서 150으로 변경합니다`
        );
        // 현재 체력 저장
        const currentHealth = this.player.chips;
        // 최대 체력 설정
        this.player.chipBag = 150;

        // 체력이 100 이하일 경우 그대로 유지, 100 초과일 경우만 비율 적용
        if (currentHealth <= 100) {
          // 체력을 그대로 유지
          this.player.chips = currentHealth;
        } else {
          // 100을 초과하는 경우만 비율 적용
          const currentHealthRatio = currentHealth / 100;
          const newHealth = Math.max(
            currentHealth,
            Math.min(150, Math.floor(150 * currentHealthRatio))
          );
          this.player.chips = newHealth;
        }

        console.log(
          `플레이어 체력 변경: ${this.player.chips}/${this.player.chipBag}`
        );
      } else {
        // 이미 최대 체력이 150인 경우 현재 체력 유지, 로그만 출력
        console.log(
          `하트 ${result.effects.heart.count}개: 이미 최대 체력이 150입니다. 현재 체력: ${this.player.chips}`
        );
      }
    } else if (this.player.chipBag > 100) {
      // 하트 카드가 2개 미만일 때 최대 체력을 100으로 복원
      console.log(
        `하트 ${result.effects.heart.count}개: 최대 체력을 ${this.player.chipBag}에서 100으로 복원합니다`
      );
      // 현재 체력 저장
      const currentHealth = this.player.chips;
      // 체력 비율 계산 (천천히 감소되도록)
      const currentHealthRatio = currentHealth / this.player.chipBag;
      this.player.chipBag = 100;
      // 새 체력 계산 (최소 절반은 유지)
      const newHealth = Math.max(
        Math.floor(currentHealth * 0.5), // 최소 현재 체력의 50%는 유지
        Math.min(100, Math.floor(100 * currentHealthRatio))
      );
      this.player.chips = newHealth;
      console.log(`플레이어 체력 변경: ${newHealth}/${this.player.chipBag}`);
    }

    // 무기 변경 메시지 표시
    if (result.weaponChanged) {
      this.ui.addDamageText(
        this.player.x,
        this.player.y - 30,
        `새 무기: ${result.currentWeapon.name}`,
        "#ffff00"
      );
    }
    return result;
  }

  // 회전 카드 업데이트 메서드
  updateOrbitingCards(now) {
    const effects = this.effects.getEffects();

    // 스페이드 효과로 오비탈 카드 활성화 확인
    const shouldHaveOrbitingCards =
      effects.spade && effects.spade.orbitingCardsEnabled;
    const desiredCardCount = effects.spade
      ? effects.spade.orbitingCardsCount
      : 0;

    // 플레이어가 모은 스페이드 카드 찾기
    const spadeCards = this.cardManager
      .getCollectedCards()
      .filter((card) => card.type === "spade");

    // 오비탈 카드 초기화 (효과 활성화/비활성화 시)
    if (shouldHaveOrbitingCards && spadeCards.length >= 4) {
      const cardsHaveChanged =
        this.orbitingCards.length !== desiredCardCount ||
        this.lastSpadeCount !== spadeCards.length;

      // 카드 개수가 변경되었거나 스페이드 카드가 변경되었을 때만 카드 재생성
      if (cardsHaveChanged) {
        console.log(
          `오비탈 카드 변경: ${this.orbitingCards.length} -> ${desiredCardCount} (수집한 스페이드 카드: ${spadeCards.length}개)`
        );

        // 현재 스페이드 카드 개수 저장
        this.lastSpadeCount = spadeCards.length;

        // 기존 카드 제거
        this.orbitingCards = [];

        // 모은 카드 중 첫 4장(또는 5장)을 사용
        const selectedCards = spadeCards.slice(0, desiredCardCount);

        // 각 카드별로 회전하는 카드 생성 (cardManager 전달)
        selectedCards.forEach((card, index) => {
          this.orbitingCards.push(
            new OrbitingCard(
              this.player,
              index,
              selectedCards.length,
              card.type,
              card.number,
              this.cardManager.cardImages // 카드 이미지 전달
            )
          );
        });
      }
    } else if (!shouldHaveOrbitingCards || spadeCards.length < 4) {
      // 활성화 조건 불충족 시 카드 제거
      if (this.orbitingCards.length > 0) {
        console.log("오비탈 카드 효과 비활성화 (스페이드 카드 부족)");
        this.orbitingCards = [];
        this.lastSpadeCount = 0;
      }
    }

    // 각 카드 업데이트
    if (this.orbitingCards.length > 0) {
      this.orbitingCards.forEach((card) => {
        card.update(now);
        card.checkCollisions(this.enemyManager.enemies, now);
      });
    }
  }

  // 회전 카드 그리기 메서드
  drawOrbitingCards() {
    if (this.orbitingCards.length > 0) {
      this.orbitingCards.forEach((card) => card.draw(this.ctx));
    }
  }

  // 게임 종료 시 마을로 돌아가는 기능 추가
  returnToVillage() {
    console.log("마을로 돌아감");
    this.isVillageMode = true;
    this.player.setModeSpeed(this.isVillageMode); // 마을 모드 속도로 설정
    this.isRoundTransition = false;
    this.isBossBattle = false;
    this.boss = null;
    this.isPokerPhase = false;
    
    // 포커 시스템 초기화 - 메서드 이름 수정
    if (this.pokerSystem && typeof this.pokerSystem.resetGame === 'function') {
      this.pokerSystem.resetGame();
    }

    // 플레이어 위치 초기화 (마을 워프 포인트 위치로)
    this.player.x = this.village.warpPoint.x;
    this.player.y = this.village.warpPoint.y;
    
    // 기존 모든 엔티티 제거
    this.enemyManager.enemies = [];
    this.enemyManager.bullets = [];
    this.bulletManager.bullets = [];
    this.orbitingCards = [];
  }

  doLinesIntersect(p1, p2, p3, p4) {
    function ccw(a, b, c) {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }
    
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  }

  // 마을 모드에서 게임 모드로 전환
  startRound() {
    console.log("라운드 시작");
    this.isVillageMode = false;
    this.player.setModeSpeed(this.isVillageMode); // 전투 모드 속도로 설정
    
    // 라운드 초기화는 제거 (startNextRound에서 증가하기 때문)
    this.enemiesKilledInRound = 0;
    this.enemiesRequiredForNextRound = 10;
    this.roundStartTime = Date.now();
    this.isRoundTransition = false;
    this.isSpawningEnemies = true;
    this.isBossBattle = false;
    
    // 포커 시스템 초기화 - 메서드 이름 수정
    if (this.pokerSystem && typeof this.pokerSystem.resetGame === 'function') {
      this.pokerSystem.resetGame();
    }

    // 플레이어 위치 초기화
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    
    // 기존 적 제거
    this.enemyManager.enemies = [];
    this.enemyManager.bullets = [];
    
    // 총알 초기화
    this.bulletManager.bullets = [];
  }

  startVillage() {
    // 게임 모드 전환 시 마을 생성
    this.village = new Village(this.canvas, this);
    
    // 마을에 플레이어 객체를 전달
    this.village.setPlayer(this.player);
    
    // 양을 생성하는 코드
    this.village.initSheeps();
    
    // 플레이어 이동 속도 조정 (마을에서는 더 느리게)
    this.player.setModeSpeed(true);
  }

  updateVillageMode() {
    // 게임이 시작되었다면 마을 모드로 전환
    this.isVillageMode = true;
    this.isStartScreen = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isRoundComplete = false;
    this.isRoundTransition = false;
    
    // 마을 생성
    this.startVillage();
  }
}

window.onload = function () {
  const game = new Game();
  window.game = game; // 전역 변수로 game 인스턴스 저장
};

// 기본 레이아웃 데이터 정의
const defaultLayout = {
  "buildings": [
    { "name": "의료소", "x": 0.38666666666666666, "y": 0.18125000000000002 },
    { "name": "레스토랑", "x": 0.4875, "y": 0.25000000000000006 },
    { "name": "총포상", "x": 0.5958333333333332, "y": 0.29 },
    { "name": "창고", "x": 0.31666666666666665, "y": 0.41 }
  ],
  "warpPoint": { "x": 0.8125, "y": 0.72625 }
};
