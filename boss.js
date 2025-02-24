export class Boss {
  constructor(canvas, round = 1) {
    this.canvas = canvas;
    this.round = Math.max(1, round || 1);
    
    // 체력 관련 속성 초기화
    this.chipBag = Math.max(15000, (1500 + ((this.round - 1) * 750)));
    this.chips = this.chipBag;
    this.damage = (20 + Math.floor(this.round * 8));
    
    // 위치 관련 속성 초기화 (한 번만)
    this.x = 600; // 화면 중앙
    this.y = 300; // 상단으로 위치 수정
    this.size = 40;
    this.speed = 0.8 + (this.round * 0.05);
    
    // 렌더링 관련 속성
    this.renderSize = 384;
    this.cards = [];
    this.isDead = false;

    // 칩 주머니 드랍 관련 속성 추가
    this.bagDropAmount = (200 + (this.round * 50)); // 10배로 증가

    // 애니메이션 스프라이트 로드
    this.sprites = {
      idle_down: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper idle_down.png",
        frames: 12,
        duration: 90,
      },
      idle_up: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper idle_up.png",
        frames: 12,
        duration: 90,
      },
      run_down: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper run_down.png",
        frames: 8,
        duration: 90,
      },
      run_up: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper run_up.png",
        frames: 8,
        duration: 90,
      },
      throw_down: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper Throw_down.png",
        frames: 9,
        duration: 90,
      },
      throw_up: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper throw_up.png",
        frames: 9,
        duration: 90,
      },
      jump: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper jump.png",
        frames: 13,
        duration: 90,
      },
      slam: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper slam.png",
        frames: 10,
        duration: 90,
      },
      death: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper death.png",
        frames: 14,
        duration: 90,
      },
      indicator: {
        img: new Image(),
        src: "./sprite/Dusk boss/Dusk Jumper indicator.png",
        frames: 9,
        duration: 90,
      },
    };

    // 스프라이트 이미지 로드
    Object.values(this.sprites).forEach((sprite) => {
      sprite.img.src = sprite.src;
    });

    // 애니메이션 상태
    this.currentAnimation = "idle_down";
    this.frameIndex = 0;
    this.lastFrameTime = Date.now();
    this.frameWidth = 192; // JSON 파일 기준
    this.frameHeight = 192; // JSON 파일 기준

    // 이동 관련 상태
    this.movePattern = "idle"; // idle, chase, retreat, circle
    this.moveTimer = 0;
    this.moveInterval = 3000; // 3초마다 이동 패턴 변경
    this.moveSpeed = 0.8; // 이동 속도 5배 감소 (2 / 5)
    this.targetX = this.x;
    this.targetY = this.y;
    this.isMoving = false;
    this.facingUp = false;

    // 공격 패턴 관련 상태
    this.attackCooldown = 1000; // 2초에서 1초로 감소
    this.lastAttackTime = 0;
    this.isAttacking = false;
    this.currentPhase = 1;
    this.isPreparingAttack = false;
    this.preparationStartTime = 0;
    this.preparationDuration = 1000;

    // 폭탄 관련 상태
    this.activeBombs = [];
    this.bombSprite = new Image();
    this.bombSprite.src = "./sprite/Dusk Bomb.png";
    this.explodeSprite = new Image();
    this.explodeSprite.src = "./sprite/Dusk explode.png";
    this.explodeData = {
      frameWidth: 32,
      frameHeight: 37,
      frames: 8,
      frameDuration: 100,
      scale: 2,
      explodeStartFrame: 2,
      explodeEndFrame: 9,
    };
    this.lastBombTime = 0;
    this.bombCooldown = 400; // 폭탄 쿨다운 1.5초로 감소 (기존 3초)
    this.bombCount = 5; // 한 번에 던질 폭탄 개수
    this.bombSpread = 120; // 폭탄이 퍼지는 범위 (각도)

    // 포커 게임 결과에 따른 상태
    this.attackBonus = 1.0;
    this.defenseBonus = 1.0;

    // 시각 효과 관련 상태
    this.glowIntensity = 0;
    this.glowDirection = 1;

    // 디버그 모드 관련 상태 추가
    this.isDebugMode = false;
    this.debugBomb = null;

    // 점프 공격 관련 상태 추가
    this.isJumping = false;
    this.jumpStartTime = 0;
    this.jumpDuration = 1000;
    this.jumpHeight = 200;
    this.jumpTargetX = 0;
    this.jumpTargetY = 0;
    this.jumpStartX = 0;
    this.jumpStartY = 0;
    this.jumpPhase = "none"; // 'none', 'jump', 'indicator', 'slam'
    this.slamDamage = 50; // 10배로 증가 (기존 5의 10배)
    this.slamRadius = 150;

    // 인디케이터 위치 추가
    this.indicatorX = 0;
    this.indicatorY = 0;
    this.showIndicator = false;
  }

  // 이동 패턴 업데이트
  updateMovement(now, player) {
    if (this.isDead) return;

    // 이동 패턴 변경
    if (now - this.moveTimer >= this.moveInterval) {
      this.moveTimer = now;
      const patterns = ["idle", "chase", "retreat", "circle"];
      this.movePattern = patterns[Math.floor(Math.random() * patterns.length)];
    }

    // 이동 패턴에 따른 움직임 처리
    switch (this.movePattern) {
      case "idle":
        this.isMoving = false;
        break;

      case "chase":
        this.targetX = player.x;
        this.targetY = player.y;
        this.isMoving = true;
        break;

      case "retreat":
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.targetX = this.x + (dx / dist) * 200;
        this.targetY = this.y + (dy / dist) * 200;
        this.isMoving = true;
        break;

      case "circle":
        const angle = (now / 1000) % (Math.PI * 2);
        this.targetX = player.x + Math.cos(angle) * 200;
        this.targetY = player.y + Math.sin(angle) * 200;
        this.isMoving = true;
        break;
    }

    // 실제 이동 처리
    if (this.isMoving) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        this.x += (dx / dist) * this.moveSpeed;
        this.y += (dy / dist) * this.moveSpeed;

        // 방향에 따른 애니메이션 설정
        this.facingUp = dy < 0;
        this.currentAnimation = this.facingUp ? "run_up" : "run_down";
      } else {
        this.isMoving = false;
      }
    } else {
      this.currentAnimation = this.facingUp ? "idle_up" : "idle_down";
    }

    // 화면 경계 체크
    this.x = Math.max(this.size, Math.min(1200 - this.size, this.x));
    this.y = Math.max(this.size, Math.min(800 - this.size, this.y));
  }

  // 공격 타이머 초기화
  resetAttackTimer() {
    this.lastAttackTime = Date.now();
    this.isAttacking = false;
    this.attackCooldown = 2000; // 2초
  }

  takeDamage(amount) {
    const finalDamage = amount / this.defenseBonus;
    this.chips = Math.max(0, this.chips - finalDamage); // hp를 chips로 변경
    if (this.chips <= 0) {
      this.isDead = true;
      this.dropChipBag(); // 사망 시 칩 주머니 드랍
    }
    return this.isDead;
  }

  heal(amount) {
    this.chips = Math.min(this.chipBag, this.chips + amount); // hp를 chips로, maxHp를 chipBag으로 변경
  }

  getHealthPercentage() {
    return (this.chips / this.chipBag) * 100; // hp를 chips로, maxHp를 chipBag으로 변경
  }

  // 포커 게임 결과 적용
  applyPokerResult(result) {
    if (result.winner === "boss") {
      this.attackBonus = 1.5;
      this.defenseBonus = 1.3;
    } else {
      this.attackBonus = 0.7;
      this.defenseBonus = 0.8;
      // 보스가 졌을 때 체력 감소
      const damage = this.chipBag * 0.2; // 최대 체력의 20%
      this.chips = Math.max(0, this.chips - damage);
      
      // 데미지 텍스트 표시
      if (window.game && window.game.ui) {
        window.game.ui.addDamageText(
          this.x,
          this.y,
          Math.round(damage),
          "#ff0000"
        );
      }
    }
  }

  // 공격 패턴 업데이트
  update(now, player) {
    if (this.isDead) return null;

    // 애니메이션 업데이트
    this.updateAnimation();

    // 점프 공격 업데이트
    if (this.isJumping) {
      this.updateJumpAttack(now, player);
      return null;
    }

    // 이동 패턴 업데이트 (점프 중이 아닐 때만)
    if (!this.isJumping && !this.isAttacking) {
      this.updateMovement(now, player);
    }

    // 폭탄 업데이트
    this.updateBombs(now, player);

    // 공격 쿨다운 체크
    if (this.isAttacking || now - this.lastAttackTime < this.attackCooldown) {
      return null;
    }

    // 플레이어와의 거리 계산
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 거리가 250 이상일 때 점프 공격, 그 외에는 폭탄 공격
    if (distance >= 300 && !this.isJumping) {
      console.log("점프 공격 시작 - 거리:", distance);
      this.isAttacking = true;
      this.startJumpAttack(player);
    } else if (!this.isJumping) {
      console.log("폭탄 공격 시작 - 거리:", distance);
      this.isAttacking = true;
      
      // 폭탄 발사 (부채꼴 모양으로)
      for (let i = 0; i < this.bombCount; i++) {
        const angleOffset = (this.bombSpread / 2) - (this.bombSpread * i / (this.bombCount - 1));
        this.throwBomb(player, angleOffset);
      }
      
      this.lastAttackTime = now;
      this.isAttacking = false;
    }

    return null;
  }

  // 애니메이션 프레임 업데이트
  updateAnimation() {
    const now = Date.now();
    const sprite = this.sprites[this.currentAnimation];

    if (now - this.lastFrameTime > sprite.duration) {
      this.frameIndex = (this.frameIndex + 1) % sprite.frames;
      this.lastFrameTime = now;
    }
  }

  throwBomb(player, angleOffset = 0) {
    const baseAttack = 30 * this.attackBonus; // 3에서 30으로 증가 (10배)

    // 기본 각도 계산 (보스에서 플레이어 방향)
    const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);

    // 각도 오프셋 적용 (라디안으로 변환)
    const angle = baseAngle + (angleOffset * Math.PI) / 180;

    // 새로운 목표 지점 계산
    const distance = Math.sqrt(
      Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
    );
    const targetX = this.x + Math.cos(angle) * distance;
    const targetY = this.y + Math.sin(angle) * distance;

    // 폭탄 생성 (데미지를 30으로 설정)
    const bomb = new BossBomb({
      x: this.x,
      y: this.y,
      targetX: targetX,
      targetY: targetY,
      damage: 30, // 3에서 30으로 증가 (10배)
      initialSpeed: 15,
      explosionRadius: 100,
      explodeSprite: this.explodeSprite,
      explodeData: this.explodeData,
    });

    this.activeBombs.push(bomb);
    return bomb;
  }

  updateBombs(now, player) {
    this.activeBombs = this.activeBombs.filter((bomb) => {
      bomb.update(now, player);
      return !bomb.isFinished;
    });
  }

  draw(ctx, showHitboxes = false) {
    ctx.save();

    // 인디케이터 그리기 (인디케이터 페이즈일 때만)
    if (this.showIndicator && this.jumpPhase === "indicator") {
      const sprite = this.sprites.indicator;
      if (sprite && sprite.img.complete) {
        ctx.drawImage(
          sprite.img,
          this.frameIndex * this.frameWidth,
          0,
          this.frameWidth,
          this.frameHeight,
          this.x - this.renderSize / 2,
          this.y - this.renderSize / 2,
          this.renderSize,
          this.renderSize
        );
      }
    }

    // 보스 스프라이트 그리기 (인디케이터 페이즈가 아닐 때만)
    if (this.jumpPhase !== "indicator") {
      const sprite = this.sprites[this.currentAnimation];
      if (sprite && sprite.img.complete) {
        ctx.drawImage(
          sprite.img,
          this.frameIndex * this.frameWidth,
          0,
          this.frameWidth,
          this.frameHeight,
          this.x - this.renderSize / 2,
          this.y - this.renderSize / 2,
          this.renderSize,
          this.renderSize
        );
      }
    }

    // 히트박스 표시 (showHitboxes가 true일 때만)
    if (showHitboxes) {
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.x - this.size / 2,
        this.y - this.size / 2,
        this.size,
        this.size
      );
    }

    // 활성화된 폭탄 그리기
    this.activeBombs.forEach((bomb) =>
      bomb.draw(ctx, this.bombSprite, this.explodeSprite, showHitboxes)
    );

    ctx.restore();
  }

  drawBombTrajectory(ctx, alpha) {
    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);

    // 포물선 예측 경로 그리기
    for (let t = 0; t <= 1; t += 0.1) {
      const x = this.x + (this.targetX - this.x) * t;
      const y = this.y + (this.targetY - this.y) * t + 100 * t * (1 - t);
      ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 디버그용 폭발 테스트 메서드 추가
  testExplosion() {
    const centerX = 600; // 화면 중앙
    const centerY = 400; // 화면 중앙

    const testBomb = new BossBomb({
      x: centerX,
      y: centerY,
      targetX: centerX,
      targetY: centerY,
      damage: 0,
      initialSpeed: 0,
      explosionRadius: 100,
      explodeSprite: this.explodeSprite,
      explodeData: this.explodeData,
    });

    testBomb.hasLanded = true;
    testBomb.bombAnimationCount = this.maxBombAnimations;
    testBomb.hasExploded = true;
    testBomb.explodeFrameIndex = 0;
    testBomb.lastFrameTime = Date.now();

    this.debugBomb = testBomb;
    console.log("디버그: 폭발 테스트 시작");
  }

  startJumpAttack(player) {
    console.log('점프 공격 시작');
    
    this.isJumping = true;
    this.jumpPhase = "jump";
    this.jumpStartTime = Date.now();
    this.currentAnimation = "jump";
    this.frameIndex = 0;
    this.lastFrameTime = Date.now();
    this.showIndicator = false;
  }

  updateJumpAttack(now, player) {
    const elapsedTime = now - this.jumpStartTime;

    switch (this.jumpPhase) {
      case "jump":
        // 점프 애니메이션 재생 (1초)
        const jumpProgress = Math.min(elapsedTime / 1000, 1);
        const jumpTotalFrames = this.sprites.jump.frames;
        const jumpFrame = Math.min(Math.floor(jumpProgress * jumpTotalFrames), jumpTotalFrames - 1);
        
        if (this.frameIndex !== jumpFrame) {
          this.frameIndex = jumpFrame;
          this.lastFrameTime = now;
        }

        // 점프 애니메이션이 완료되면 인디케이터 페이즈로 전환
        if (jumpProgress >= 1) {
          console.log('인디케이터 페이즈 시작');
          this.jumpPhase = "indicator";
          this.currentAnimation = "indicator";
          this.frameIndex = 0;
          this.lastFrameTime = now;
          this.jumpStartTime = now;
          this.showIndicator = true;
          // 보스를 플레이어의 현재 위치로 이동
          this.x = player.x;
          this.y = player.y;
        }
        break;

      case "indicator":
        // 인디케이터 애니메이션 재생 (2초)
        const indicatorProgress = Math.min(elapsedTime / 2000, 1);
        const indicatorTotalFrames = this.sprites.indicator.frames;
        const indicatorFrame = Math.min(Math.floor((indicatorProgress % 0.2) * 5 * indicatorTotalFrames), indicatorTotalFrames - 1);

        if (this.frameIndex !== indicatorFrame) {
          this.frameIndex = indicatorFrame;
          this.lastFrameTime = now;
        }

        // 보스가 플레이어를 추적
        if (indicatorProgress < 1) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          
          const speed = 300 / 1000;
          const moveDistance = speed * (now - this.lastFrameTime);
          
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            this.x += (dx / distance) * moveDistance;
            this.y += (dy / distance) * moveDistance;
          }
        }

        // 인디케이터 단계가 완료되면 슬램으로 전환
        if (indicatorProgress >= 1) {
          console.log('슬램 페이즈 시작 - 위치:', { x: this.x, y: this.y });
          this.jumpPhase = "slam";
          this.currentAnimation = "slam";
          this.frameIndex = 0;
          this.lastFrameTime = now;
          this.jumpStartTime = now;
          this.showIndicator = false;
        }
        break;

      case "slam":
        // 슬램 애니메이션 재생 (0.5초)
        const slamProgress = Math.min(elapsedTime / 500, 1);
        const slamTotalFrames = this.sprites.slam.frames;
        const slamFrame = Math.min(Math.floor(slamProgress * slamTotalFrames), slamTotalFrames - 1);

        if (this.frameIndex !== slamFrame) {
          this.frameIndex = slamFrame;
          this.lastFrameTime = now;

          // 슬램 프레임이 중간(5프레임)일 때 데미지 적용
          if (slamFrame === Math.floor(slamTotalFrames / 2)) {
            // 플레이어와의 거리 계산
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 슬램 범위 내에 있으면 데미지 적용
            if (distance <= this.slamRadius) {
              const damageRatio = 1 - (distance / this.slamRadius);
              const damage = this.slamDamage * damageRatio * this.attackBonus;
              
              player.takeDamage(damage);
              
              // 데미지 텍스트 표시
              if (window.game && window.game.ui) {
                window.game.ui.addDamageText(
                  player.x,
                  player.y,
                  Math.round(damage),
                  "#ff0000"
                );
              }
              
              console.log('슬램 데미지 적용:', damage);
            }
          }
        }

        // 슬램 애니메이션이 완료되면 공격 종료
        if (slamProgress >= 1) {
          console.log('점프 공격 종료');
          this.isJumping = false;
          this.jumpPhase = "none";
          this.currentAnimation = this.facingUp ? "idle_up" : "idle_down";
          this.frameIndex = 0;
          this.lastFrameTime = now;
          this.lastAttackTime = now - (this.attackCooldown / 2); // 쿨다운 절반만 적용
          this.isAttacking = false;
          this.updateAnimation();
        }
        break;
    }

    return null;
  }

  // 칩 주머니 드랍 메서드 추가
  dropChipBag() {
    if (window.game && window.game.player) {
      window.game.player.increaseBagSize(this.bagDropAmount);
    }
  }
}

class BossBomb {
  constructor({
    x,
    y,
    targetX,
    targetY,
    damage,
    initialSpeed,
    explosionRadius,
    explodeSprite,
    explodeData,
  }) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;

    // 포물선 운동을 위한 초기 속도 계산
    const dx = targetX - x;
    const dy = targetY - y;
    const gravity = 0.2;

    // 도달 시간 계산
    const time = 60; // 약 1초 동안 이동

    // 초기 속도 설정
    this.dx = dx / time;
    this.dy = dy / time - (gravity * time) / 2; // 포물선 운동 보정
    this.gravity = gravity;

    this.createTime = Date.now();
    this.hasLanded = false;
    this.landingTime = 0;
    this.hasExploded = false;
    this.isFinished = false;
    this.hasDamageApplied = false; // 데미지 적용 여부 추가

    // 스프라이트 애니메이션 관련
    this.frameIndex = 0;
    this.frameDuration = 100; // 기본 프레임 지속 시간
    this.lastFrameTime = Date.now();
    this.explodeFrameIndex = 0;
    this.bombAnimationCount = 0;
    this.maxBombAnimations = 3;
    this.explosionRadius = explosionRadius;
    this.bombFrames = 2;

    // 폭발 애니메이션 설정
    this.explodeFrames = explodeData.frames;
    this.explodeFrameWidth = explodeData.frameWidth;
    this.explodeFrameHeight = explodeData.frameHeight;
    this.explodeScale = explodeData.scale;
    this.explodeFrameDuration = explodeData.frameDuration;
    this.explodeStartFrame = explodeData.explodeStartFrame;
    this.explodeEndFrame = explodeData.explodeEndFrame;
    this.explodeSprite = explodeSprite;

    // 폭발 범위를 애니메이션의 직사각형 크기로 설정
    this.explosionWidth = this.explodeFrameWidth * this.explodeScale * 2; // 2배로 증가
    this.explosionHeight = this.explodeFrameHeight * this.explodeScale * 2; // 2배로 증가
    this.explosionOffsetY = this.explosionHeight / 2;
    this.explosionRadius = Math.max(this.explosionWidth, this.explosionHeight) / 2; // 폭발 반경을 애니메이션 크기에 맞춤

    // 디버그용 상태 추적
    this.debugState = "";
  }

  update(now, player) {
    if (this.hasExploded) {
      if (
        !this.isFinished &&
        now - this.lastFrameTime > this.explodeFrameDuration
      ) {
        // 폭발 첫 프레임에서 데미지 적용
        if (!this.hasDamageApplied && this.explodeFrameIndex === 0) {
          if (player) {
            // 원형 충돌 체크로 변경
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.explosionRadius) {
              // 거리에 따른 데미지 감소 (중심에 가까울수록 더 큰 데미지)
              const damageRatio = Math.pow(1 - (distance / this.explosionRadius), 2);
              const damage = Math.max(1, this.damage * damageRatio); // 최소 데미지를 1로 설정

              player.takeDamage(damage);

              // 데미지 텍스트 표시
              if (window.game && window.game.ui) {
                window.game.ui.addDamageText(
                  player.x,
                  player.y,
                  Math.round(damage),
                  "#ff0000"
                );
              }

              console.log(
                `폭발 데미지 적용: ${damage} (거리: ${distance}, 최대거리: ${this.explosionRadius})`
              );
            }
          }
          this.hasDamageApplied = true;
        }

        this.lastFrameTime = now;
        this.explodeFrameIndex++;

        // 디버그 상태 업데이트
        this.debugState = `폭발 진행 중 (${this.explodeFrameIndex}/${this.explodeFrames})`;
        console.log(`폭발 애니메이션 상태: ${this.debugState}`);

        if (this.explodeFrameIndex >= this.explodeFrames) {
          this.debugState = "폭발 완료";
          console.log(this.debugState);
          this.isFinished = true;
        }
      }
      return;
    }

    if (this.hasLanded) {
      if (now - this.lastFrameTime > this.frameDuration) {
        this.frameIndex = (this.frameIndex + 1) % this.bombFrames;
        this.lastFrameTime = now;

        if (this.frameIndex === 0) {
          this.bombAnimationCount++;
          this.debugState = `폭탄 회전 중 (${this.bombAnimationCount}/${this.maxBombAnimations})`;
          console.log(this.debugState);
        }

        if (this.bombAnimationCount >= this.maxBombAnimations) {
          this.debugState = "폭발 시작";
          console.log(this.debugState);
          this.hasExploded = true;
          this.explodeFrameIndex = 0;
          this.lastFrameTime = now;
        }
      }
      return;
    }

    // 포물선 운동
    this.x += this.dx;
    this.dy += this.gravity;
    this.y += this.dy;

    // 목표 지점 도달 체크
    const distToTarget = Math.sqrt(
      Math.pow(this.x - this.targetX, 2) + Math.pow(this.y - this.targetY, 2)
    );

    if (distToTarget < 10 || this.y >= 800 - 37) {
      this.x = this.targetX;
      this.y = Math.min(this.targetY, 800 - 37);
      this.hasLanded = true;
      this.landingTime = now;
      this.frameIndex = 0;
      this.lastFrameTime = now;
      console.log("폭탄 착지");
    }
  }

  draw(ctx, bombSprite, explodeSprite, showHitboxes) {
    if (this.hasExploded && !this.isFinished) {
      const frameWidth = this.explodeFrameWidth;
      const frameHeight = this.explodeFrameHeight;
      const scale = this.explodeScale;
      const scaledWidth = frameWidth * scale;
      const scaledHeight = frameHeight * scale;

      if (this.explodeSprite && this.explodeSprite.complete) {
        const sourceX =
          (this.explodeStartFrame + this.explodeFrameIndex) * frameWidth;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 디버그 모드에서 폭발 범위 표시
        if (showHitboxes) {
          ctx.beginPath();
          ctx.arc(0, 0, this.explosionRadius, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // 폭발 이펙트 그리기
        ctx.drawImage(
          this.explodeSprite,
          sourceX,
          0,
          frameWidth,
          frameHeight,
          -scaledWidth / 2,
          -scaledHeight / 2,
          scaledWidth,
          scaledHeight
        );

        ctx.restore();
      }
    } else if (!this.hasExploded) {
      // 폭탄 스프라이트 그리기
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Date.now() / 150);
      ctx.drawImage(
        bombSprite,
        this.frameIndex * 32,
        0,
        32,
        37,
        -16,
        -18.5,
        32,
        37
      );

      // 폭탄의 히트박스는 showHitboxes가 true일 때만 표시
      if (showHitboxes) {
        ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
        ctx.strokeRect(-16, -18.5, 32, 37);
      }

      ctx.restore();
    }
  }
}
