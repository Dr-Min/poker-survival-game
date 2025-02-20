import { checkCollision } from "./utils.js";

export class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.size = 20;
    this.speed = 1.6;
    this.hp = 10;
    this.maxHp = 10;
    this.invincible = false;
    this.invincibleTime = 1000;
    this.bulletSpeed = 5.6;
    this.lastShot = 0;
    this.shotInterval = 600;
    this.bulletDamage = 1;
    this.lastHitTime = 0;

    // 대시 관련 속성 수정
    this.dashSpeed = 4; // 대시 속도 절반으로 감소
    this.dashDuration = 200; // 대시 지속시간 (ms)
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
  }

  move(keys, mouseX, mouseY, joystick) {
    this.prevX = this.x;
    this.prevY = this.y;

    // 마우스 방향에 따라 캐릭터 방향 설정 (반대로 수정)
    this.facingLeft = mouseX > this.x;

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
        // 조이스틱 사용 시에도 마우스 방향 우선
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

    // 화면 경계 체크
    this.x = Math.max(
      this.size / 2,
      Math.min(this.canvas.width - this.size / 2, this.x)
    );
    this.y = Math.max(
      this.size / 2,
      Math.min(this.canvas.height - this.size / 2, this.y)
    );
  }

  dash(targetX, targetY) {
    if (!this.canDash || this.isDashing || this.dashCharges <= 0) return;

    this.isDashing = true;
    this.canDash = false;
    this.lastDashTime = Date.now();

    // 대시 사용
    this.currentCharge = Math.max(0, this.currentCharge - 1);
    this.dashCharges = Math.floor(this.currentCharge);

    // 대시 방향 계산 (마우스 포인터 방향으로)
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    this.dashDirection = { x: dx, y: dy };

    // 대시 종료
    setTimeout(() => {
      this.isDashing = false;
    }, this.dashDuration);

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

    this.isDashing = true;
    this.canDash = false;
    this.lastDashTime = Date.now();

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
      this.isDashing = false;
    }, this.dashDuration);

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

  draw(ctx, mouseX, mouseY) {
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;

    if (!this.invincible || Math.floor(Date.now() / 100) % 2) {
      ctx.save();
      ctx.translate(this.x, this.y);

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
      if (this.facingLeft) {
        ctx.scale(-1, 1);
      }

      // 스프라이트 그리기
      if (this.currentSprite.complete) {
        ctx.drawImage(
          this.currentSprite,
          this.frameIndex * this.frameWidth,
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
    if (!this.invincible) {
      this.hp -= amount;
      this.invincible = true;

      setTimeout(() => {
        this.invincible = false;
      }, this.invincibleTime);

      return this.hp <= 0;
    }
    return false;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
