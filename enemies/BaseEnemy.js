import { getDistance, checkCollision } from "../utils.js";

export class BaseEnemy {
  constructor(x, y, round) {
    this.id = Date.now() + Math.random();
    this.x = x;
    this.y = y;
    this.size = 20;
    this.speed = 0.5 * (1 + round * 0.1);
    this.hp = 5 + Math.floor(round * 1.5);
    this.isDead = false;
    this.isAlly = false;
    this.stunEndTime = 0;
    this.hasDroppedCard = false;
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
    this.attackDamage = 1;
    this.attackCooldown = 1000; // 1초
    this.lastAttackTime = 0;
    this.attackAnimationStarted = false;
    this.attackFrameIndex = 0;
    this.attackTickCount = 0;
    this.attackTicksPerFrame = 5;
    this.attackFrames = 0; // 자식 클래스에서 설정
    this.attackDuration = 0; // 자식 클래스에서 설정
    this.damageFrame = 0; // 자식 클래스에서 설정
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
      
      player.takeDamage(this.attackDamage);
      if (window.game && window.game.ui) {
        window.game.ui.addDamageText(
          player.x,
          player.y,
          this.attackDamage,
          "#ff0000"
        );
      }
      
      return true;
    }

    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;

    this.isFlipped = dx < 0;

    return true;
  }

  draw(ctx) {
    const currentSprite = this.isDead 
      ? this.deathSprite 
      : this.isAttacking 
        ? this.attackSprite 
        : this.runSprite;

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

        const currentHealthWidth = (this.hp / 5) * healthBarWidth;
        ctx.fillStyle = this.isAlly ? "#00ff00" : "#ff0000";
        ctx.fillRect(
          this.x - healthBarWidth / 2,
          healthBarY,
          currentHealthWidth,
          healthBarHeight
        );
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
