import { getDistance, checkCollision } from "../utils.js";
import { CardManager } from "../card.js";

export class BaseEnemy {
  constructor(x, y, round) {
    this.id = Date.now() + Math.random();
    this.x = x;
    this.y = y;
    this.size = 20;
    this.round = round;
    this.speed = 0.5 * (1 + round * 0.1);
    this.maxChips = (5 + Math.floor(round * 1.5)) * 10; // 10배로 증가
    this.chips = this.maxChips;
    this.isDead = false;
    this.isAlly = false;
    this.stunEndTime = 0;
    this.hasDroppedCard = false;
    this.hasDroppedChips = false;
    this.isCountedAsKill = false;
    this.deathAnimationStarted = false;

    this.frameIndex = 0;
    this.tickCount = 0;
    this.ticksPerFrame = 8;
    this.runFrames = 6;
    this.deathFrames = 9;
    this.renderSize = 64;
    this.deathAnimationComplete = false;

    this.isAttacking = false;
    this.attackDamage = 10; // 1에서 10으로 증가
    this.attackCooldown = 1000; // 1초
    this.lastAttackTime = 0;
    this.attackAnimationStarted = false;
    this.attackFrameIndex = 0;
    this.attackTickCount = 0;
    this.attackTicksPerFrame = 5;
    this.attackFrames = 0; // 자식 클래스에서 설정
    this.attackDuration = 0; // 자식 클래스에서 설정
    this.damageFrame = 0; // 자식 클래스에서 설정

    this.chipDropChance = 0.1;
    this.minChipDrop = 2;
    this.maxChipDrop = 5;
  }

  loadSprites(runSpritePath, deathSpritePath) {
    this.runSprite = new Image();
    this.runSprite.src = runSpritePath;
    this.deathSprite = new Image();
    this.deathSprite.src = deathSpritePath;
  }

  resetDeathAnimation() {
    this.frameIndex = 0;
    this.tickCount = 0;
  }

  update(player, now) {
    if (this.isDead) {
      if (!this.deathAnimationStarted) {
        this.deathAnimationStarted = true;
        this.frameIndex = 0;
        this.tickCount = 0;
      }

      if (this.deathAnimationComplete) {
        return false;
      }

      this.tickCount++;
      if (this.tickCount > this.ticksPerFrame) {
        this.tickCount = 0;
        if (this.frameIndex < this.deathFrames - 1) {
          this.frameIndex++;
        } else {
          this.deathAnimationComplete = true;
          return false;
        }
      }
      return true;
    }

    if (this.stunEndTime && now < this.stunEndTime) return true;

    if (this.isAlly) {
      return true;
    }

    if (this.isAttacking) {
      this.attackTickCount++;
      if (this.attackTickCount > this.attackTicksPerFrame) {
        this.attackTickCount = 0;
        this.attackFrameIndex++;

        if (this.attackFrameIndex >= this.attackFrames) {
          this.isAttacking = false;
          this.attackFrameIndex = 0;
          this.attackAnimationStarted = false;
        }
      }
      return true;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const attackRange = (this.size + player.size) * 0.9;
    if (distance < attackRange && now - this.lastAttackTime >= this.attackCooldown) {
      this.isAttacking = true;
      this.attackAnimationStarted = true;
      this.lastAttackTime = now;
      
      setTimeout(() => {
        if (this.isAttacking && !player.invincible && !player.isDashInvincible) {
          const currentDx = player.x - this.x;
          const currentDy = player.y - this.y;
          const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
          
          if (currentDistance < attackRange) {
            console.log('적에게 데미지 받음 (플레이어 무적 상태:', player.invincible, ', 대시 무적 상태:', player.isDashInvincible, ')');
            player.takeDamage(this.attackDamage);
            if (window.game && window.game.ui) {
              window.game.ui.addDamageText(
                player.x,
                player.y,
                this.attackDamage,
                "#ff0000"
              );
            }
          }
        }
      }, 200);
      
      return true;
    }

    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;

    this.isFlipped = dx < 0;

    return true;
  }

  takeDamage(amount) {
    console.log(`적 데미지 받음: ${amount}, 현재 체력: ${this.chips}`);
    this.chips = Math.max(0, this.chips - amount);
    console.log(`남은 체력: ${this.chips}`);
    
    if (this.chips <= 0 && !this.isDead) {
      console.log('적 사망 처리 시작');
      this.isDead = true;
      this.tryDropChips();
      console.log('적 사망 처리 완료');
      return true;
    }
    return false;
  }

  tryDropChips() {
    console.log('칩 드랍 시도 - 이전 드랍 여부:', this.hasDroppedChips);
    if (this.hasDroppedChips) {
      console.log('이미 칩을 드랍했음');
      return;
    }
    
    if (Math.random() > this.chipDropChance) {
      console.log('칩 드랍 실패 (확률)');
      return;
    }
    
    const roundBonus = Math.floor(window.game ? window.game.round * 0.5 : 0);
    const minChips = this.minChipDrop + roundBonus;
    const maxChips = this.maxChipDrop + roundBonus;
    
    const chipAmount = Math.floor(Math.random() * (maxChips - minChips + 1)) + minChips;
    console.log(`칩 드랍 성공 - 개수: ${chipAmount}, 위치: (${this.x}, ${this.y})`);
    
    if (window.game) {
      if (!window.game.cardManager) {
        window.game.cardManager = new CardManager();
      }
      window.game.cardManager.createChipDrop(this.x, this.y, chipAmount);
    }
    
    this.hasDroppedChips = true;
  }

  draw(ctx) {
    const currentSprite = this.isDead 
      ? this.deathSprite 
      : this.isAttacking 
        ? this.attackSprite 
        : this.runSprite;

    if (this.isAttacking) {
      const attackRange = (this.size + window.game.player.size) * 0.9;
      
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(this.x, this.y, attackRange, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(`데미지: ${this.attackDamage}`, this.x - 30, this.y - attackRange - 5);
      
      ctx.restore();
    }

    if (currentSprite && currentSprite.complete) {
      let frameIndex = this.frameIndex;
      let totalFrames = this.runFrames;

      if (this.isDead) {
        frameIndex = this.frameIndex;
        totalFrames = this.deathFrames;
      } else if (this.isAttacking) {
        frameIndex = this.attackFrameIndex;
        totalFrames = this.attackFrames;
      }

      const frameWidth = 64;
      const frameHeight = 64;

      ctx.save();

      if (this.isFlipped) {
        ctx.translate(
          this.x + this.renderSize / 2,
          this.y - this.renderSize / 2
        );
        ctx.scale(-1, 1);
      } else {
        ctx.translate(
          this.x - this.renderSize / 2,
          this.y - this.renderSize / 2
        );
      }

      ctx.drawImage(
        currentSprite,
        frameIndex * frameWidth,
        0,
        frameWidth,
        frameHeight,
        0,
        0,
        this.renderSize,
        this.renderSize
      );

      ctx.restore();

      if (!this.isDead) {
        const healthBarWidth = this.size;
        const healthBarHeight = 4;
        const healthBarY = this.y - this.renderSize / 2 - 10;

        ctx.fillStyle = "#444444";
        ctx.fillRect(
          this.x - healthBarWidth / 2,
          healthBarY,
          healthBarWidth,
          healthBarHeight
        );

        // 현재 체력 비율 계산 (저장된 최대 체력 사용)
        const healthRatio = this.chips / this.maxChips;
        const currentHealthWidth = healthBarWidth * healthRatio;

        ctx.fillStyle = this.isAlly ? "#00ff00" : "#ffff00";
        ctx.fillRect(
          this.x - healthBarWidth / 2,
          healthBarY,
          currentHealthWidth,
          healthBarHeight
        );

        // 텍스트 외곽선 추가
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.strokeText(`${Math.ceil(this.chips)}칩`, this.x, healthBarY - 2);
        
        // 텍스트 색상을 검정색으로 변경
        ctx.fillStyle = "#000000";
        ctx.fillText(`${Math.ceil(this.chips)}칩`, this.x, healthBarY - 2);
      }
    } else {
      ctx.fillStyle = this.isAlly ? "#00ff00" : "white";
      ctx.fillRect(
        this.x - this.size / 2,
        this.y - this.size / 2,
        this.size,
        this.size
      );
    }
  }
}
