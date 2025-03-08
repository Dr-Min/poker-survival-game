import { checkCollision } from "./utils.js";

export class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.size = 20;
    this.villageSpeed = 0.8; // 마을 모드에서의 속도
    this.combatSpeed = 1.6; // 전투 모드에서의 속도
    this.speed = this.villageSpeed; // 기본은 마을 모드 속도
    this.chips = 0; // 칩을 0으로 시작 (마을에서 상자를 열어 모아야 함)
    this.chipBag = 100; // 칩 최대 용량은 그대로 유지
    console.log(
      "플레이어 초기화: 칩=" + this.chips + ", 칩주머니=" + this.chipBag
    );
    this.invincible = false;
    this.invincibleTime = 1000;
    this.isDashInvincible = false;
    this.bulletSpeed = 5.6;
    this.lastShot = 0;
    this.shotInterval = 600;
    this.bulletDamage = 10;
    this.lastHitTime = 0;

    // 대시 관련 속성 수정
    this.dashSpeed = 6; // 대시 속도 절반으로 감소
    this.dashDuration = 200; // 대시 지속시간 (ms) - 200ms에서 400ms로 증가
    this.dashInvincibleDuration = 500; // 대시 무적 지속시간 (0.5초)
    this.dashCooldown = 500; // 개별 대시 쿨다운 (0.5초)
    this.dashRechargeTime = 5000; // 대시 충전 시간 (5초)
    this.isDashing = false;
    this.canDash = true;
    this.dashDirection = { x: 0, y: 0 };
    this.lastDashTime = 0;

    // 충전식 대시 시스템
    this.maxDashCharges = 3; // 최대 대시 횟수
    this.dashCharges = 3; // 현재 대시 횟수
    this.dashChargePerSecond = 0.5; // 초당 충전량 (2초당 1회)
    this.currentCharge = 3; // 현재 충전량 (소수점으로 관리)
    this.lastChargeTime = Date.now(); // 마지막 충전 시간

    // 애니메이션 관련 속성
    this.frameIndex = 0;
    this.tickCount = 0;
    this.ticksPerFrame = 6; // 100ms에 맞춰 조정
    this.numberOfFrames = {
      idle: 5, // idle 스프라이트 프레임 수
      move: 4, // move 스프라이트 프레임 수
    };
    this.frameWidth = 32; // JSON에서 확인한 실제 프레임 크기
    this.frameHeight = 32;
    this.renderSize = 64; // 화면에 표시될 크기

    // 스프라이트 이미지 로드
    this.idelSprite = new Image();
    this.idelSprite.src = "./sprite/player/Player_idel.png";
    this.moveSprite = new Image();
    this.moveSprite.src = "./sprite/player/Player_move.png";

    this.currentSprite = this.idelSprite;
    this.isMoving = false;
    this.prevX = this.x;
    this.prevY = this.y;
    this.facingLeft = false; // 캐릭터가 왼쪽을 보고 있는지 확인

    // 히트 애니메이션 관련 속성 추가
    this.hitSprite = new Image();
    this.hitSprite.src = "./sprite/player/Player_hit.png";
    this.isHit = false;
    this.hitFrameIndex = 0;
    this.hitFrameDuration = 100; // json 파일 기준 duration
    this.hitLastFrameTime = 0;
    this.hitFrames = 2; // json 파일 기준 프레임 수

    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.isTouching = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;

    this.surplusChips = 0; // 잉여칩(점수) 추가
  }

  move(keys, mouseX, mouseY, joystick) {
    this.prevX = this.x;
    this.prevY = this.y;

    // 터치나 마우스 방향에 따라 캐릭터 방향 설정 - 마우스 우선
    if (mouseX !== undefined) {
      // 마우스 방향을 최우선으로 설정 (마우스가 오른쪽에 있으면 오른쪽을 봄)
      this.facingLeft = mouseX < this.x; // 원래 논리로 복원
    } else if (this.isTouching) {
      // 터치 방향으로 설정 (마우스가 없는 경우)
      this.facingLeft = this.touchEndX < this.x; // 원래 논리로 복원
    } else if (keys.ArrowLeft || keys.a) {
      // 키보드 좌우 방향키 (마우스와 터치가 없는 경우)
      this.facingLeft = true; // 왼쪽 키를 누르면 왼쪽을 봄
    } else if (keys.ArrowRight || keys.d) {
      // 키보드 좌우 방향키 (마우스와 터치가 없는 경우)
      this.facingLeft = false; // 오른쪽 키를 누르면 오른쪽을 봄
    }

    // 마우스 좌표 저장과 방향 디버깅
    if (mouseX !== undefined) {
      console.log(`마우스 방향: x=${mouseX}, 플레이어: x=${this.x}, facingLeft=${this.facingLeft}`);
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
    }

    // 캔버스 크기 유효성 검사
    if (!this.canvas || this.canvas.width <= 0 || this.canvas.height <= 0) {
      console.error("캔버스 크기 오류: ", this.canvas);
      // 캔버스가 유효하지 않으면 이동하지 않음
      return;
    }

    // 대시 충전 업데이트
    const now = Date.now();
    const deltaTime = (now - this.lastChargeTime) / 1000; // 초 단위로 변환
    this.lastChargeTime = now;

    // 충전량 업데이트
    if (this.currentCharge < this.maxDashCharges) {
      this.currentCharge = Math.min(
        this.maxDashCharges,
        this.currentCharge + this.dashChargePerSecond * deltaTime
      );
      this.dashCharges = Math.floor(this.currentCharge);
    }

    // 대시 처리
    if (keys[" "] && this.canDash && !this.isDashing && this.dashCharges > 0) {
      this.startDash(keys);
    }

    // 현재 속도 계산
    const currentSpeed = this.isDashing ? this.dashSpeed : this.speed;

    if (joystick.active) {
      const dx = joystick.moveX - joystick.startX;
      const dy = joystick.moveY - joystick.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.x += (dx / distance) * currentSpeed;
        this.y += (dy / distance) * currentSpeed;
        this.isMoving = true;
        this.currentSprite = this.moveSprite;
        
        // 조이스틱 방향에 따라 캐릭터 방향 설정
        if (dx != 0) {
          this.facingLeft = dx < 0; // 원래 논리로 복원
        }
      } else {
        this.isMoving = false;
        this.currentSprite = this.idelSprite;
      }
    } else if (this.isTouching) {
      // 터치 이동 처리
      const dx = this.touchEndX - this.touchStartX;
      const dy = this.touchEndY - this.touchStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        // 방향에 따라 캐릭터 이동
        this.x += (dx / distance) * currentSpeed;
        this.y += (dy / distance) * currentSpeed;
        this.isMoving = true;
        this.currentSprite = this.moveSprite;
        
        // 터치 방향에 따라 캐릭터 방향 설정
        if (dx != 0) {
          this.facingLeft = dx < 0; // 원래 논리로 복원
        }
      } else {
        this.isMoving = false;
        this.currentSprite = this.idelSprite;
      }
    } else {
      if (this.isDashing) {
        this.x += this.dashDirection.x * currentSpeed;
        this.y += this.dashDirection.y * currentSpeed;
        this.isMoving = true;
        this.currentSprite = this.moveSprite;
        // 대시 중에도 마우스 방향 우선
      } else {
        let dx = 0;
        let dy = 0;

        if (keys["ArrowUp"] || keys["w"]) dy -= 1;
        if (keys["ArrowDown"] || keys["s"]) dy += 1;
        if (keys["ArrowLeft"] || keys["a"]) dx -= 1;
        if (keys["ArrowRight"] || keys["d"]) dx += 1;

        if (dx !== 0 || dy !== 0) {
          this.isMoving = true;
          this.currentSprite = this.moveSprite;

          if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
          }
          this.x += dx * currentSpeed;
          this.y += dy * currentSpeed;
        } else {
          this.isMoving = false;
          this.currentSprite = this.idelSprite;
        }
      }
    }

    // 화면 경계 체크 - 강화된 버전
    if (this.canvas && this.canvas.width > 0 && this.canvas.height > 0) {
      // 최소 10px 이상, 최대 캔버스 크기보다 10px 작게 설정
      const minX = Math.max(10, this.size / 2);
      const minY = Math.max(10, this.size / 2);
      const maxX = Math.max(this.canvas.width - 10, this.canvas.width - this.size / 2);
      const maxY = Math.max(this.canvas.height - 10, this.canvas.height - this.size / 2);
      
      this.x = Math.max(minX, Math.min(maxX, this.x));
      this.y = Math.max(minY, Math.min(maxY, this.y));
      
      // 디버깅용 출력 (비정상적인 값이 있으면 콘솔에 기록)
      if (this.x <= minX || this.x >= maxX || this.y <= minY || this.y >= maxY) {
        console.log("플레이어 경계 도달: ", { x: this.x, y: this.y, canvasWidth: this.canvas.width, canvasHeight: this.canvas.height });
      }
    } else {
      console.error("캔버스 크기 오류 (경계 체크): ", this.canvas);
    }
  }

  dash(targetX, targetY) {
    if (!this.canDash || this.isDashing || this.dashCharges <= 0) return;

    // 터치나 마우스 좌표 사용
    const dashTargetX = this.isTouching ? this.touchEndX : targetX;
    const dashTargetY = this.isTouching ? this.touchEndY : targetY;

    console.log("대시 시작");
    this.isDashing = true;
    this.canDash = false;
    this.lastDashTime = Date.now();
    this.isDashInvincible = true;
    console.log("무적 판정 시작 - 대시");

    // 대시 사용
    this.currentCharge = Math.max(0, this.currentCharge - 1);
    this.dashCharges = Math.floor(this.currentCharge);

    // 대시 방향 계산 (마우스 포인터 방향으로)
    const angle = Math.atan2(dashTargetY - this.y, dashTargetX - this.x);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    this.dashDirection = { x: dx, y: dy };

    // 대시 종료
    setTimeout(() => {
      console.log("대시 종료");
      this.isDashing = false;
    }, this.dashDuration);

    // 대시 무적 종료 (0.5초 후)
    setTimeout(() => {
      this.isDashInvincible = false;
      console.log("무적 판정 종료 - 대시");
    }, this.dashInvincibleDuration);

    // 개별 대시 쿨다운
    setTimeout(() => {
      this.canDash = true;
    }, this.dashCooldown);

    // 대시 충전 시스템
    if (this.dashRechargeTimer) clearTimeout(this.dashRechargeTimer);

    this.dashRechargeTimer = setTimeout(() => {
      this.dashCharges = this.maxDashCharges;
      this.lastChargeTime = Date.now();
    }, this.dashRechargeTime);
  }

  startDash(keys) {
    if (!this.canDash || this.isDashing || this.dashCharges <= 0) return;

    console.log("대시 시작");
    this.isDashing = true;
    this.canDash = false;
    this.lastDashTime = Date.now();
    this.isDashInvincible = true;
    console.log("무적 판정 시작 - 대시");

    // 대시 사용
    this.currentCharge = Math.max(0, this.currentCharge - 1);
    this.dashCharges = Math.floor(this.currentCharge);

    // 대시 방향 결정
    let dx = 0;
    let dy = 0;
    if (keys["ArrowUp"] || keys["w"]) dy -= 1;
    if (keys["ArrowDown"] || keys["s"]) dy += 1;
    if (keys["ArrowLeft"] || keys["a"]) dx -= 1;
    if (keys["ArrowRight"] || keys["d"]) dx += 1;

    // 대각선 이동시 정규화
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    // 아무 방향키도 누르지 않았다면 마지막으로 바라보는 방향으로 대시
    if (dx === 0 && dy === 0) {
      const angle = Math.atan2(
        this.lastMouseY - this.y,
        this.lastMouseX - this.x
      );
      dx = Math.cos(angle);
      dy = Math.sin(angle);
    }

    this.dashDirection = { x: dx, y: dy };

    // 대시 종료
    setTimeout(() => {
      console.log("대시 종료");
      this.isDashing = false;
    }, this.dashDuration);

    // 대시 무적 종료 (0.5초 후)
    setTimeout(() => {
      this.isDashInvincible = false;
      console.log("무적 판정 종료 - 대시");
    }, this.dashInvincibleDuration);

    // 개별 대시 쿨다운
    setTimeout(() => {
      this.canDash = true;
    }, this.dashCooldown);

    // 대시 충전 시스템
    if (this.dashRechargeTimer) clearTimeout(this.dashRechargeTimer);

    this.dashRechargeTimer = setTimeout(() => {
      this.dashCharges = this.maxDashCharges;
      this.lastChargeTime = Date.now();
    }, this.dashRechargeTime);
  }

  draw(ctx, showHitboxes = false) {
    this.lastMouseX = this.mouseX;
    this.lastMouseY = this.mouseY;

    // 무적 상태에서 깜빡임 효과를 더 자주 적용 (0.1초마다 깜빡임)
    if (
      (!this.invincible && !this.isDashInvincible) ||
      Math.floor(Date.now() / 100) % 2
    ) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // 히트박스 표시
      ctx.strokeStyle =
        this.invincible || this.isDashInvincible
          ? "rgba(0, 255, 0, 0.8)"
          : "rgba(255, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.stroke();

      // 무적 상태 표시 강화
      if (this.invincible || this.isDashInvincible) {
        // 무적 오오라 효과
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = this.isDashInvincible ? "#4a90e2" : "#ffff00";
        ctx.fill();
        ctx.globalAlpha = 1;

        // 무적 텍스트 표시
        ctx.fillStyle = this.isDashInvincible ? "#4a90e2" : "#ffff00";
        ctx.font = "12px Arial";
        ctx.fillText("무적", -15, -this.size);
      }

      // 대시 이펙트
      if (this.isDashing) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "#4a90e2";
        ctx.fill();
      }

      // 애니메이션 프레임 업데이트
      this.tickCount++;
      if (this.tickCount > this.ticksPerFrame) {
        this.tickCount = 0;
        const maxFrames = this.isMoving
          ? this.numberOfFrames.move
          : this.numberOfFrames.idle;
        this.frameIndex = (this.frameIndex + 1) % maxFrames;
      }

      // 대시 게이지 그리기
      const gaugeWidth = 30;
      const gaugeHeight = 4;
      const gaugeY = -this.renderSize / 2 - 10;

      // 게이지 배경
      ctx.fillStyle = "#333333";
      ctx.fillRect(-gaugeWidth / 2, gaugeY, gaugeWidth, gaugeHeight);

      // 게이지 바
      const chargeRatio = this.currentCharge / this.maxDashCharges;
      const chargeWidth = gaugeWidth * chargeRatio;
      ctx.fillStyle = "#4a90e2";
      ctx.fillRect(-gaugeWidth / 2, gaugeY, chargeWidth, gaugeHeight);

      // 대시 포인트
      for (let i = 0; i < this.maxDashCharges; i++) {
        const isCharged = i < this.dashCharges;
        const x =
          -gaugeWidth / 2 + (gaugeWidth * (i + 0.5)) / this.maxDashCharges;

        ctx.beginPath();
        ctx.arc(x, gaugeY + gaugeHeight + 3, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isCharged ? "#ffffff" : "#666666";
        ctx.fill();
      }

      // 캐릭터 좌우 반전을 위한 설정
      if (!this.facingLeft) { // 논리 반전: facingLeft가 false일 때 좌우 반전
        ctx.scale(-1, 1);
      }

      // 히트 애니메이션 업데이트
      if (this.isHit) {
        const now = Date.now();
        if (now - this.hitLastFrameTime > this.hitFrameDuration) {
          this.hitFrameIndex = (this.hitFrameIndex + 1) % this.hitFrames;
          this.hitLastFrameTime = now;
        }
      }

      // 스프라이트 그리기 (히트 상태일 때는 히트 스프라이트 사용)
      const sprite = this.isHit ? this.hitSprite : this.currentSprite;
      if (sprite.complete) {
        ctx.drawImage(
          sprite,
          (this.isHit ? this.hitFrameIndex : this.frameIndex) * this.frameWidth,
          0,
          this.frameWidth,
          this.frameHeight,
          -this.renderSize / 2,
          -this.renderSize / 2,
          this.renderSize,
          this.renderSize
        );
      }

      ctx.restore();
    }
  }

  takeDamage(amount) {
    if (this.invincible || this.isDashInvincible) {
      console.log(`🛡️ 플레이어가 무적 상태로 데미지를 무시: ${amount}`);
      return false;
    }

    const oldChips = this.chips;
    this.chips = Math.max(0, this.chips - amount);
    console.log(
      `💥 플레이어 데미지: ${oldChips} -> ${this.chips} (데미지량: ${amount}, 최대체력: ${this.chipBag})`
    );

    this.invincible = true;
    this.isHit = true;
    this.hitFrameIndex = 0;
    this.hitLastFrameTime = Date.now();
    console.log(
      `🛡️ 플레이어 무적 상태 시작 - ${this.invincibleTime}ms 동안 지속`
    );

    // 데미지 텍스트 표시 (숫자만 표시)
    if (window.game && window.game.ui) {
      window.game.ui.addDamageText(
        this.x,
        this.y,
        Math.round(amount),
        "#ff0000"
      );
    }

    // 체력이 0이 되면 게임오버 처리 - 마을 모드에서는 예외
    if (this.chips <= 0 && window.game && !window.game.isVillageMode) {
      window.game.stopGame();
      return true;
    }

    // 히트 애니메이션 종료 타이머 추가
    setTimeout(() => {
      this.isHit = false;
      this.hitFrameIndex = 0;
    }, this.hitFrameDuration * this.hitFrames);

    setTimeout(() => {
      this.invincible = false;
      console.log(`🛡️ 플레이어 무적 상태 종료`);
    }, this.invincibleTime);

    return true;
  }

  heal(amount) {
    const oldChips = this.chips;
    const missingHealth = this.chipBag - this.chips; // 부족한 체력

    if (missingHealth > 0) {
      if (amount <= missingHealth) {
        // 획득한 칩이 부족한 체력보다 적거나 같으면 전부 체력 회복에 사용
        this.chips += amount;
      } else {
        // 획득한 칩이 부족한 체력보다 많으면
        this.chips = this.chipBag; // 체력을 최대치로
        const surplus = amount - missingHealth; // 초과분 계산
        this.surplusChips += surplus * 0.5; // 초과분의 50%를 잉여칩으로 저장
      }
    } else {
      // 이미 체력이 가득 찬 경우
      this.surplusChips += amount * 0.5; // 획득한 칩의 50%를 잉여칩으로 저장
    }

    console.log(
      `플레이어 회복: ${oldChips} -> ${this.chips} (회복량: ${amount}, 최대체력: ${this.chipBag})`
    );

    // 칩 획득 텍스트 표시
    if (window.game && window.game.ui) {
      window.game.ui.addDamageText(
        this.x,
        this.y,
        Math.round(amount),
        "#00ff00"
      );
    }
  }

  // 칩 주머니 크기 증가 메서드 추가
  increaseBagSize(amount) {
    console.log(`칩 주머니 크기 증가 메서드 호출됨! 증가량: ${amount}`);
    const oldBagSize = this.chipBag;
    this.chipBag += amount;
    console.log(
      `칩 주머니 크기 증가: ${oldBagSize} -> ${this.chipBag} (증가량: ${amount})`
    );

    // 칩 주머니 크기 증가 텍스트 표시
    if (window.game && window.game.ui) {
      window.game.ui.addDamageText(
        this.x,
        this.y,
        `+${Math.round(amount)} 주머니 크기`,
        "#ffff00"
      );
    }
  }

  // 원형 충돌 체크 메서드 추가
  checkCollision(x, y, radius) {
    const dx = this.x - x;
    const dy = this.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.size / 2 + radius;
  }

  // 직사각형 충돌 체크 메서드 추가
  checkRectCollision(x, y, width, height) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const playerHalfSize = this.size / 2;

    return (
      Math.abs(this.x - x) < halfWidth + playerHalfSize &&
      Math.abs(this.y - y) < halfHeight + playerHalfSize
    );
  }

  // 플레이어의 현재 히트박스 정보를 반환하는 메서드
  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      radius: this.size / 2,
    };
  }

  // 터치 이벤트 처리 메서드 추가
  handleTouchStart(event) {
    this.isTouching = true;
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.touchEndX = this.touchStartX;
    this.touchEndY = this.touchStartY;
  }

  handleTouchMove(event) {
    if (this.isTouching) {
      this.touchEndX = event.touches[0].clientX;
      this.touchEndY = event.touches[0].clientY;
    }
  }

  handleTouchEnd() {
    this.isTouching = false;
  }

  // 게임 모드에 따라 속도 설정하는 메서드 추가
  setModeSpeed(isVillageMode) {
    this.speed = isVillageMode ? this.villageSpeed : this.combatSpeed;
    console.log(`플레이어 속도 변경: ${this.speed} (${isVillageMode ? '마을' : '전투'} 모드)`);
  }
}
