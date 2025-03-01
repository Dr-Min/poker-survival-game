import { BaseEnemy } from "./BaseEnemy.js";

export class FourLegsEnemy extends BaseEnemy {
  constructor(x, y, round) {
    super(x, y, round);
    this.size = 18;
    this.renderSize = 100;
    this.speed = 0.6 * (1 + round * 0.1);

    this.runSpriteUp = new Image();
    this.runSpriteUp.src = "../sprite/4legs/4legs_run_up.png";
    this.runSpriteDown = new Image();
    this.runSpriteDown.src = "../sprite/4legs/4legs_run_down.png";
    this.runSprite = new Image();
    this.runSprite.src = "../sprite/4legs/4legs_run.png";
    this.deathSprite = new Image();
    this.deathSprite.src = "../sprite/4legs/4legs_run_death.png";

    this.attackSprite = new Image();
    this.attackSprite.src = "../sprite/4legs/4legs_attack.png";

    this.attackFrames = 7;
    this.attackDuration = 75;
    this.attackTicksPerFrame = 5;
    this.damageFrame = 4;
    this.attackDamage = 15;
    this.attackCooldown = 800;
  }

  getAttackRange(target) {
    return (this.size + target.size) * 1.3;
  }

  update(player, now) {
    if (this.isDead || (this.stunEndTime && now < this.stunEndTime)) {
      return super.update(player, now);
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

    let target = player;
    let targetDistance = Infinity;

    const dxPlayer = player.x - this.x;
    const dyPlayer = player.y - this.y;
    const distanceToPlayer = Math.sqrt(
      dxPlayer * dxPlayer + dyPlayer * dyPlayer
    );
    targetDistance = distanceToPlayer;

    if (window.game && window.game.enemyManager) {
      window.game.enemyManager.enemies.forEach((ally) => {
        if (!ally.isDead && ally.isAlly) {
          const dx = ally.x - this.x;
          const dy = ally.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < targetDistance && Math.random() < 0.55) {
            targetDistance = distance;
            target = ally;
          }
        }
      });
    }

    const targetX = target.x;
    const targetY = target.y;

    const attackRange = this.getAttackRange(target);

    if (
      targetDistance < attackRange &&
      now - this.lastAttackTime >= this.attackCooldown
    ) {
      this.isAttacking = true;
      this.attackAnimationStarted = true;
      this.lastAttackTime = now;

      setTimeout(() => {
        if (this.isAttacking) {
          const currentDx = target.x - this.x;
          const currentDy = target.y - this.y;
          const currentDistance = Math.sqrt(
            currentDx * currentDx + currentDy * currentDy
          );

          if (target === player) {
            const isInvincible = player.invincible || player.isDashInvincible;
            console.log(
              `🛡️ 플레이어 상태 - 무적: ${isInvincible}, 무적(기본): ${player.invincible}, 무적(대시): ${player.isDashInvincible}`
            );

            if (currentDistance < attackRange * 1.1) {
              console.log(
                `⚔️ 4LEGS가 플레이어에게 데미지 시도:`,
                this.id,
                `데미지량:`,
                this.attackDamage,
                `거리:`,
                currentDistance.toFixed(2),
                `범위:`,
                attackRange.toFixed(2)
              );

              if (!isInvincible) {
                console.log(
                  "4LEGS가 플레이어에게 데미지를 입힘:",
                  this.id,
                  "->",
                  player.id,
                  "데미지량:",
                  this.attackDamage
                );
                player.takeDamage(this.attackDamage);
                if (window.game && window.game.ui) {
                  window.game.ui.addDamageText(
                    player.x,
                    player.y - player.size,
                    this.attackDamage,
                    "#ff3333"
                  );
                }
                console.log(
                  `✅ 플레이어 데미지 적용 성공: ${this.attackDamage}`
                );
              } else {
                console.log(`❌ 플레이어 무적 상태로 데미지 적용 실패`);
              }
            }
          } else if (target !== player && !target.isDead) {
            if (currentDistance < attackRange) {
              console.log(
                "4LEGS가 아군에게 데미지를 입힘:",
                this.id,
                "->",
                target.id,
                "데미지량:",
                this.attackDamage
              );
              target.takeDamage(this.attackDamage);
              if (window.game && window.game.ui) {
                window.game.ui.addDamageText(
                  target.x,
                  target.y - target.size,
                  this.attackDamage,
                  "#ff6600"
                );
              }
            }
          }
        }
      }, 200);
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (this.isAttacking || distance < 5) {
      return true;
    }

    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;

    this.isFlipped = dx < 0;

    return true;
  }

  draw(ctx) {
    if (!this.isDead) {
      const dx = this.x - this.prevX || 0;
      const dy = this.y - this.prevY || 0;

      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0) {
          this.currentRunSprite = this.runSpriteUp;
        } else {
          this.currentRunSprite = this.runSpriteDown;
        }
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
        (this.isAttacking ? this.attackFrameIndex : this.frameIndex) *
          frameWidth,
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

        const currentHealthWidth =
          (this.chips / this.maxChips) * healthBarWidth;
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
