export class Boss {
  constructor(round) {
    this.id = Date.now() + Math.random();
    this.round = round;
    this.maxHp = (150 + (round - 1) * 75) * 5; // 체력 5배 증가
    this.hp = this.maxHp;
    this.renderSize = 384; // 스프라이트 크기 절반으로 수정 (192 * 0.5)
    this.size = 40; // 히트박스를 렌더링 크기의 절반으로 설정
    this.cards = [];
    this.isDead = false;
    this.x = 600; // 화면 중앙
    this.y = 300; // 상단으로 위치 수정

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
    this.moveSpeed = 0.4; // 이동 속도 5배 감소 (2 / 5)
    this.targetX = this.x;
    this.targetY = this.y;
    this.isMoving = false;
    this.facingUp = false;

    // 공격 패턴 관련 상태
    this.attackCooldown = 2000; // 2초
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
    this.bombCooldown = 1500; // 폭탄 쿨다운 1.5초로 감소 (기존 3초)
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
    this.slamDamage = 5;
    this.slamRadius = 150;
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
    this.hp = Math.max(0, this.hp - finalDamage);
    if (this.hp <= 0) {
      this.isDead = true;
    }
    return this.isDead;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  getHealthPercentage() {
    return (this.hp / this.maxHp) * 100;
  }

  // 포커 게임 결과 적용
  applyPokerResult(result) {
    if (result.winner === "boss") {
      this.attackBonus = 1.5; // 공격력 50% 증가
      this.defenseBonus = 1.3; // 방어력 30% 증가
    } else {
      this.attackBonus = 0.7; // 공격력 30% 감소
      this.defenseBonus = 0.8; // 방어력 20% 감소
    }
  }

  // 공격 패턴 업데이트
  update(now, player) {
    if (this.isDead) return null;

    // 이동 업데이트
    this.updateMovement(now, player);

    // 페이즈 체크 및 업데이트
    const currentHpPercent = (this.hp / this.maxHp) * 100;
    if (currentHpPercent <= 30 && this.currentPhase === 1) {
      this.currentPhase = 2;
      this.attackCooldown = 1500;
      this.attackBonus *= 1.5;
      this.moveSpeed *= 1.3;
      this.bombCooldown = 1000;
      this.bombCount = 5;
      this.bombSpread = 180;
    }

    // 폭탄 업데이트
    this.updateBombs(now, player);

    // 점프 공격 업데이트
    if (this.isJumping) {
      const jumpResult = this.updateJumpAttack(now, player);
      if (jumpResult) return jumpResult;
    }

    // 점프 공격 시작 (100% 확률)
    if (
      !this.isJumping &&
      !this.isAttacking &&
      now - this.lastAttackTime >= this.attackCooldown
    ) {
      console.log("점프 공격 시작");
      this.isAttacking = true;
      this.startJumpAttack(player);
      return null;
    }

    // 폭탄 던지기 쿨다운 체크
    if (
      !this.isJumping &&
      !this.isAttacking &&
      now - this.lastBombTime >= this.bombCooldown
    ) {
      this.lastBombTime = now;
      this.currentAnimation = this.facingUp ? "throw_up" : "throw_down";

      const attacks = [];
      for (let i = 0; i < this.bombCount; i++) {
        const angleOffset =
          (this.bombSpread / 2) * ((2 * i) / (this.bombCount - 1) - 1);
        attacks.push(this.throwBomb(player, angleOffset));
      }
      return {
        type: "bomb",
        bombs: attacks,
      };
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
    const baseAttack = 3 * this.attackBonus;

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

    // 폭탄 생성
    const bomb = new BossBomb({
      x: this.x,
      y: this.y,
      targetX: targetX,
      targetY: targetY,
      damage: baseAttack * 2,
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

    // 공격 준비 중일 때 경고 효과
    if (this.isPreparingAttack) {
      const progress =
        (Date.now() - this.preparationStartTime) / this.preparationDuration;
      const warningAlpha = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
      this.drawBombTrajectory(ctx, warningAlpha);
    }

    // 애니메이션 업데이트
    this.updateAnimation();

    // 보스 스프라이트 그리기
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
    }

    // 디버그 폭발 애니메이션 그리기
    if (this.debugBomb) {
      this.debugBomb.update(Date.now());
      this.debugBomb.draw(ctx, this.bombSprite, this.explodeSprite);

      if (this.debugBomb.isFinished) {
        this.debugBomb = null;
        console.log("디버그: 폭발 테스트 완료");
      }
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
    this.isJumping = true;
    this.jumpPhase = "jump";
    this.jumpStartTime = Date.now();
    this.jumpStartX = this.x;
    this.jumpStartY = this.y;
    this.jumpTargetX = player.x;
    this.jumpTargetY = player.y;
    this.currentAnimation = "jump";
    this.frameIndex = 0;
    this.lastFrameTime = Date.now();
  }

  updateJumpAttack(now, player) {
    const elapsedTime = now - this.jumpStartTime;

    switch (this.jumpPhase) {
      case "jump":
        if (this.frameIndex >= this.sprites.jump.frames - 1) {
          this.jumpPhase = "indicator";
          this.currentAnimation = "indicator";
          this.frameIndex = 0;
          this.jumpTargetX = player.x;
          this.jumpTargetY = player.y;
        }
        break;

      case "indicator":
        // 인디케이터 애니메이션이 끝나면 슬램으로 전환
        if (this.frameIndex >= this.sprites.indicator.frames - 1) {
          this.jumpPhase = "slam";
          this.currentAnimation = "slam";
          this.frameIndex = 0;

          // 최종 타겟 위치로 즉시 이동
          this.x = this.jumpTargetX;
          this.y = this.jumpTargetY;

          // 슬램 데미지 판정
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= this.slamRadius) {
            const damage = this.slamDamage * this.attackBonus;
            return {
              type: "slam",
              damage: damage,
              x: this.x,
              y: this.y,
              radius: this.slamRadius,
            };
          }
        }
        break;

      case "slam":
        // 슬램 애니메이션이 끝나면 점프 공격 종료
        if (this.frameIndex >= this.sprites.slam.frames - 1) {
          this.isJumping = false;
          this.jumpPhase = "none";
          this.currentAnimation = this.facingUp ? "idle_up" : "idle_down";
          this.lastAttackTime = now;
          this.isAttacking = false;
          console.log("점프 공격 종료");
        }
        break;
    }

    return null;
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
    this.explosionWidth = this.explodeFrameWidth * this.explodeScale; // 절반 크기로 조정
    this.explosionHeight = (this.explodeFrameHeight * this.explodeScale) / 2; // 절반 크기로 조정
    this.explosionOffsetY = this.explosionHeight / 2; // 아래쪽 정렬을 위한 오프셋

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
            // 직사각형 충돌 체크
            const halfWidth = this.explosionWidth / 2;
            const halfHeight = this.explosionHeight / 2;

            // 플레이어가 폭발 범위 내에 있는지 확인 (아래쪽 정렬 고려)
            const inRangeX = Math.abs(player.x - this.x) <= halfWidth;
            const inRangeY =
              Math.abs(player.y - (this.y + this.explosionOffsetY)) <=
              halfHeight;

            if (inRangeX && inRangeY) {
              // 중심으로부터의 상대적 거리 계산 (0~1 사이 값)
              const relativeX = Math.abs(player.x - this.x) / halfWidth;
              const relativeY =
                Math.abs(player.y - (this.y + this.explosionOffsetY)) /
                halfHeight;
              const relativeDistance = Math.max(relativeX, relativeY);

              // 거리에 따른 데미지 감소
              const damageRatio = Math.pow(1 - relativeDistance, 2);
              const damage = this.damage * damageRatio;

              player.takeDamage(damage);
              console.log(
                `폭발 데미지 적용: ${damage} (상대거리: ${relativeDistance}, 범위: ${this.explosionWidth}x${this.explosionHeight})`
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

        // 폭발 이펙트 그리기 (원래 크기 유지)
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
