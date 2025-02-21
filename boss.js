export class Boss {
  constructor(round) {
    this.id = Date.now() + Math.random();
    this.round = round;
    this.maxHp = 150 + (round - 1) * 75; // 체력 증가
    this.hp = this.maxHp;
    this.size = 40;
    this.cards = [];
    this.isDead = false;
    this.x = 600; // 화면 중앙
    this.y = 150; // 상단

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
      frames: 8, // json 파일 기준 0-7 총 8프레임
      frameDuration: 100,
      scale: 2,
      explodeStartFrame: 2, // json 파일의 Explode 태그 시작 프레임
      explodeEndFrame: 9, // json 파일의 Explode 태그 끝 프레임
    };
    this.lastBombTime = 0;
    this.bombCooldown = 3000;

    // 포커 게임 결과에 따른 상태
    this.attackBonus = 1.0;
    this.defenseBonus = 1.0;

    // 시각 효과 관련 상태
    this.glowIntensity = 0;
    this.glowDirection = 1;

    // 디버그 모드 관련 상태 추가
    this.isDebugMode = false;
    this.debugBomb = null;
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

    // 페이즈 체크 및 업데이트
    const currentHpPercent = (this.hp / this.maxHp) * 100;
    if (currentHpPercent <= 30 && this.currentPhase === 1) {
      this.currentPhase = 2;
      this.attackCooldown = 1500; // 1.5초로 감소
      this.attackBonus *= 1.5;
    }

    // 폭탄 업데이트
    this.updateBombs(now, player);

    // 폭탄 던지기 쿨다운 체크
    if (now - this.lastBombTime >= this.bombCooldown) {
      this.lastBombTime = now;
      return this.throwBomb(player);
    }

    return null;
  }

  throwBomb(player) {
    const baseAttack = 3 * this.attackBonus;

    // 폭탄 생성 (보스의 현재 위치에서 플레이어 위치로)
    const bomb = new BossBomb({
      x: this.x,
      y: this.y,
      targetX: player.x,
      targetY: player.y,
      damage: baseAttack * 2,
      initialSpeed: 15,
      explosionRadius: 100,
      explodeSprite: this.explodeSprite,
      explodeData: this.explodeData,
    });

    this.activeBombs.push(bomb);

    return {
      type: "bomb",
      bomb: bomb,
    };
  }

  updateBombs(now, player) {
    this.activeBombs = this.activeBombs.filter((bomb) => {
      bomb.update(now, player);
      return !bomb.isFinished;
    });
  }

  draw(ctx) {
    ctx.save();

    // 공격 준비 중일 때 경고 효과
    if (this.isPreparingAttack) {
      const progress =
        (Date.now() - this.preparationStartTime) / this.preparationDuration;
      const warningAlpha = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;

      // 폭탄 낙하 지점 예측선 그리기
      this.drawBombTrajectory(ctx, warningAlpha);
    }

    // 보스 몸체 그리기
    if (this.isAttacking) {
      this.glowIntensity += 0.1 * this.glowDirection;
      if (this.glowIntensity >= 1) this.glowDirection = -1;
      if (this.glowIntensity <= 0) this.glowDirection = 1;

      ctx.shadowColor = "red";
      ctx.shadowBlur = 20 + this.glowIntensity * 10;
    }

    // 페이즈에 따른 보스 색상
    const baseColor = this.currentPhase === 2 ? "#ff0000" : "#880000";
    const attackColor = this.currentPhase === 2 ? "#ff6666" : "#ff4444";

    ctx.fillStyle = this.isAttacking ? attackColor : baseColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.currentPhase === 2 ? "#ff3333" : "#ff0000";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

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
      bomb.draw(ctx, this.bombSprite, this.explodeSprite)
    );
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
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.explosionRadius) {
              const damage =
                this.damage * (1 - distance / this.explosionRadius);
              player.takeDamage(damage);
              console.log(`폭발 데미지 적용: ${damage}`);
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

  draw(ctx, bombSprite, explodeSprite) {
    if (this.hasExploded && !this.isFinished) {
      const frameWidth = this.explodeFrameWidth;
      const frameHeight = this.explodeFrameHeight;
      const scale = this.explodeScale;
      const scaledWidth = frameWidth * scale;
      const scaledHeight = frameHeight * scale;

      if (this.explodeSprite && this.explodeSprite.complete) {
        // json 파일의 Explode 태그 프레임 범위에 맞춰 sourceX 계산
        const sourceX =
          (this.explodeStartFrame + this.explodeFrameIndex) * frameWidth;

        // 디버그 정보 출력
        console.log(`폭발 스프라이트 렌더링:`, {
          상태: this.debugState,
          프레임: this.explodeFrameIndex,
          실제프레임: this.explodeStartFrame + this.explodeFrameIndex,
          소스X: sourceX,
          위치: { x: this.x, y: this.y },
        });

        ctx.save();
        ctx.translate(this.x, this.y);

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
      ctx.restore();
    }
  }
}
