import { BaseEnemy } from "./BaseEnemy.js";

export class TwoLegsEnemy extends BaseEnemy {
  constructor(x, y, round) {
    super(x, y, round);
    this.size = 20;
    this.renderSize = 83;
    this.speed = 0.5 * (1 + round * 0.1);

    this.runSpriteUp = new Image();
    this.runSpriteUp.src = "./sprite/2legs/2legs_run_up.png";
    this.runSprite = new Image();
    this.runSprite.src = "./sprite/2legs/2legs_run.png";
    this.deathSprite = new Image();
    this.deathSprite.src = "./sprite/2legs/2legs_death.png";

    this.attackSprite = new Image();
    this.attackSprite.src = "./sprite/2legs/2legs_attack.png";

    this.attackFrames = 10;
    this.attackDuration = 80;
    this.attackTicksPerFrame = 5;
    this.damageFrame = 5;
    this.attackDamage = 2;
  }

  draw(ctx) {
    if (!this.isDead) {
      const dx = this.x - this.prevX || 0;
      const dy = this.y - this.prevY || 0;

      if (Math.abs(dy) > Math.abs(dx) && dy < 0) {
        this.currentRunSprite = this.runSpriteUp;
      } else {
        this.currentRunSprite = this.runSprite;
      }
    }

    const currentSprite = this.isDead
      ? this.deathSprite
      : this.isAttacking
        ? this.attackSprite
        : this.currentRunSprite || this.runSprite;

    if (currentSprite.complete) {
      if (!this.isDead && !this.isAttacking) {
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
          this.tickCount = 0;
          this.frameIndex = (this.frameIndex + 1) % this.runFrames;
        }
      }

      const frameWidth = 64;
      const frameHeight = 64;

      ctx.save();

      if (this.isFlipped && !this.isAttacking) {
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
        (this.isAttacking ? this.attackFrameIndex : this.frameIndex) * frameWidth,
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
        const healthBarY = this.y - 20;

        ctx.fillStyle = "#444444";
        ctx.fillRect(
          this.x - healthBarWidth / 2,
          healthBarY,
          healthBarWidth,
          healthBarHeight
        );

        const currentHealthWidth = (this.chips / this.maxChips) * healthBarWidth;
        ctx.fillStyle = this.isAlly ? "#00ff00" : "#ff0000";
        ctx.fillRect(
          this.x - healthBarWidth / 2,
          healthBarY,
          currentHealthWidth,
          healthBarHeight
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
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

    this.prevX = this.x;
    this.prevY = this.y;
  }
}
