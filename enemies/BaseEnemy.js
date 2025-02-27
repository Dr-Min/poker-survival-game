import { getDistance, checkCollision, getRandomInt } from "../utils.js";
import { CardManager } from "../card.js";

export class BaseEnemy {
  constructor(x, y, round = 1) {
    this.id = Date.now() + Math.random();
    this.x = x;
    this.y = y;
    this.size = 20;
    this.round = round;
    this.speed = 1 + round * 0.1;
    this.defaultSpeed = this.speed;
    this.maxChips = 30 + Math.min(round * 5, 100);
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
    this.attackDamage = 10 + Math.floor(round * 1.5);
    this.attackCooldown = 1000;
    this.lastAttackTime = 0;
    this.attackAnimationStarted = false;
    this.attackFrameIndex = 0;
    this.attackTickCount = 0;
    this.attackTicksPerFrame = 5;
    this.attackFrames = 8;
    this.attackDuration = 0;
    this.damageFrame = 0;

    this.chipDropChance = 0.04 + round * 0.001;
    this.minChipDrop = 2;
    this.maxChipDrop = 5;

    this.deathCount = 0;
    this.deathMaxCount = 60;
    this.fadeAlpha = 1;
    this.isFlipped = false;
  }

  loadSprites(runSpritePath, attackSpritePath, deathSpritePath) {
    this.runSprite = new Image();
    this.runSprite.src = runSpritePath;
    
    this.attackSprite = new Image();
    this.attackSprite.src = attackSpritePath;
    
    this.deathSprite = new Image();
    this.deathSprite.src = deathSpritePath;
    
    console.log("적 스프라이트 로드됨:", {
      runSprite: runSpritePath,
      attackSprite: attackSpritePath,
      deathSprite: deathSpritePath
    });
  }

  resetDeathAnimation() {
    this.frameIndex = 0;
    this.tickCount = 0;
  }

  update(player, now) {
    if (this.isDead) {
      // 사망 애니메이션 진행 (draw와 별도로 여기서도 처리)
      if (!this.deathAnimationComplete) {
        this.tickCount++;
        if (this.tickCount > this.ticksPerFrame) {
          this.tickCount = 0;
          this.frameIndex++;
          // console.log(`[update] 사망 애니메이션 프레임 진행: ${this.frameIndex}/${this.deathFrames}, ID: ${this.id}`);
          
          if (this.frameIndex >= this.deathFrames) {
            // console.log("[update] 사망 애니메이션 완료:", this.id);
            this.deathAnimationComplete = true;
            this.frameIndex = this.deathFrames - 1; // 마지막 프레임으로 고정
          }
        }
      } else {
        // 애니메이션 완료 후 페이드아웃
        this.deathCount++;
        this.fadeAlpha = 1 - this.deathCount / this.deathMaxCount;
      }
      
      return this.deathCount < this.deathMaxCount;
    }

    if (this.stunEndTime && now < this.stunEndTime) return true;

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

    // 아군인 경우 가장 가까운 적 찾기
    let targetX, targetY;
    
    if (this.isAlly) {
      let closestEnemy = null;
      let closestDistance = Infinity;
      
      if (window.game && window.game.enemyManager) {
        // 모든 적 중에서 가장 가까운 적(아군이 아닌 적)을 찾음
        window.game.enemyManager.enemies.forEach(enemy => {
          if (!enemy.isDead && !enemy.isAlly && enemy !== this) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestEnemy = enemy;
            }
          }
        });
      }
      
      // 가까운 적이 있으면 그 적을 공격, 없으면 플레이어 주변에 머무름
      if (closestEnemy) {
        targetX = closestEnemy.x;
        targetY = closestEnemy.y;
        
        // 공격 로직
        const attackRange = (this.size + closestEnemy.size) * 0.9;
        if (closestDistance < attackRange && now - this.lastAttackTime >= this.attackCooldown) {
          this.isAttacking = true;
          this.attackAnimationStarted = true;
          this.lastAttackTime = now;
          
          setTimeout(() => {
            if (this.isAttacking && !closestEnemy.isDead) {
              const currentDx = closestEnemy.x - this.x;
              const currentDy = closestEnemy.y - this.y;
              const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
              
              if (currentDistance < attackRange) {
                // console.log("아군이 적에게 데미지를 입힘:", this.attackDamage);
                closestEnemy.takeDamage(this.attackDamage);
                if (window.game && window.game.ui) {
                  window.game.ui.addDamageText(
                    closestEnemy.x, 
                    closestEnemy.y - closestEnemy.size, 
                    this.attackDamage, 
                    "#00ff00"
                  );
                }
              }
            }
          }, 300);
        }
      } else {
        // 적이 없으면 플레이어 주변에 머무름
        targetX = player.x + (Math.random() * 100 - 50);
        targetY = player.y + (Math.random() * 100 - 50);
      }
    } else {
      // 일반 적은 플레이어를 쫓거나 아군을 공격
      let target = player;
      let targetDistance = Infinity;
      
      // 플레이어와의 거리 계산
      const dxPlayer = player.x - this.x;
      const dyPlayer = player.y - this.y;
      const distanceToPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
      targetDistance = distanceToPlayer;
      
      // 가장 가까운 아군 찾기
      if (window.game && window.game.enemyManager) {
        window.game.enemyManager.enemies.forEach(ally => {
          if (!ally.isDead && ally.isAlly) {
            const dx = ally.x - this.x;
            const dy = ally.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 30% 확률로 더 가까운 아군을 공격 대상으로 선택
            if (distance < targetDistance && Math.random() < 0.3) {
              targetDistance = distance;
              target = ally;
            }
          }
        });
      }
      
      targetX = target.x;
      targetY = target.y;
      
      // 공격 로직
      const attackRange = (this.size + target.size) * 0.9;
      if (targetDistance < attackRange && now - this.lastAttackTime >= this.attackCooldown) {
        this.isAttacking = true;
        this.attackAnimationStarted = true;
        this.lastAttackTime = now;
        
        setTimeout(() => {
          if (this.isAttacking) {
            if (target === player && !player.invincible && !player.isDashInvincible) {
              const currentDx = player.x - this.x;
              const currentDy = player.y - this.y;
              const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
              
              if (currentDistance < attackRange) {
                // console.log("적이 플레이어에게 데미지를 입힘:", this.attackDamage);
                player.takeDamage(this.attackDamage);
                if (window.game && window.game.ui) {
                  window.game.ui.addDamageText(
                    player.x, 
                    player.y - player.size, 
                    this.attackDamage, 
                    "#ff0000"
                  );
                }
              }
            } else if (target !== player && !target.isDead) {
              // 아군에게 공격
              const currentDx = target.x - this.x;
              const currentDy = target.y - this.y;
              const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
              
              if (currentDistance < attackRange) {
                // console.log("적이 아군에게 데미지를 입힘:", this.attackDamage);
                target.takeDamage(this.attackDamage);
                if (window.game && window.game.ui) {
                  window.game.ui.addDamageText(
                    target.x, 
                    target.y - target.size, 
                    this.attackDamage, 
                    "#ff0000"
                  );
                }
              }
            }
          }
        }, 300);
      }
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 이미 공격 중이거나 이동 중인 경우 처리
    if (this.isAttacking || distance < 5) {
      return true;
    }

    this.x += (dx / distance) * this.speed;
    this.y += (dy / distance) * this.speed;

    this.isFlipped = dx < 0;

    return true;
  }

  takeDamage(amount) {
    // 이미 죽은 적은 추가 데미지를 받지 않음
    if (this.isDead) {
      console.log("이미 죽은 적에게 데미지 시도:", this.id);
      return false;
    }
    
    // console.log(`적 데미지 받음: ${amount}, 현재 체력: ${this.chips}`);
    this.chips = Math.max(0, this.chips - amount);
    // console.log(`남은 체력: ${this.chips}`);

    if (this.chips <= 0 && !this.isDead) {
      // console.log("적 사망 처리 시작:", this.id);
      this.isDead = true;
      this.frameIndex = 0;
      this.tickCount = 0;
      this.deathAnimationComplete = false;
      this.deathAnimationStarted = true;
      this.deathCount = 0;
      this.tryDropChips();

      // 다른 상태 초기화
      this.isAttacking = false;
      this.attackAnimationStarted = false;
      
      // console.log("적 사망 처리 완료:", this.id);
      return true;
    }
    return false;
  }

  tryDropChips() {
    // console.log("칩 드랍 시도 - 이전 드랍 여부:", this.hasDroppedChips);
    if (this.hasDroppedChips) {
      // console.log("이미 칩을 드랍했음");
      return;
    }

    // 하트 효과로 인한 드랍률 배수 적용
    let dropChance = this.chipDropChance;
    if (window.game && window.game.effects) {
      const effects = window.game.effects.getEffects();
      if (effects.heart) {
        // 하트 효과 - 칩 드랍률 증가
        if (effects.heart.guaranteedDropChance) {
          // 5개 이상일 경우 guaranteedDropChance 확률로 무조건 드랍
          dropChance = effects.heart.guaranteedDropChance;
        } else if (effects.heart.chipDropMultiplier) {
          // 그 외 경우에는 배수에 따라 증가
          dropChance = this.chipDropChance * effects.heart.chipDropMultiplier;
        }
      }
    }

    if (Math.random() > dropChance) {
      // console.log("칩 드랍 실패 (확률)");
      return;
    }

    const roundBonus = Math.floor(window.game ? window.game.round * 0.5 : 0);
    const minChips = this.minChipDrop + roundBonus;
    const maxChips = this.maxChipDrop + roundBonus;

    const chipAmount =
      Math.floor(Math.random() * (maxChips - minChips + 1)) + minChips;
    console.log(
      `칩 드랍 성공 - 개수: ${chipAmount}, 위치: (${this.x}, ${this.y})`
    );

    if (window.game) {
      if (!window.game.cardManager) {
        window.game.cardManager = new CardManager();
      }
      window.game.cardManager.createChipDrop(this.x, this.y, chipAmount);
    }

    this.hasDroppedChips = true;
  }

  draw(ctx) {
    // 스프라이트 체크 로직 수정 - 각 상태에 필요한 스프라이트만 확인하도록 변경
    if (this.isDead && (!this.deathSprite || !this.deathSprite.complete)) {
      console.log("사망 스프라이트 로드 안됨:", this.id);
      return;
    }
    
    if (this.isAttacking && (!this.attackSprite || !this.attackSprite.complete)) {
      // 공격 스프라이트가 없으면 공격 상태를 취소
      console.log("공격 스프라이트 로드 안됨, 공격 상태 취소:", this.id);
      this.isAttacking = false;
      this.attackAnimationStarted = false;
    }
    
    if (!this.isDead && !this.isAttacking && (!this.runSprite || !this.runSprite.complete)) {
      console.log("이동 스프라이트 로드 안됨:", this.id);
      return;
    }
    
    const currentSprite = this.isDead
      ? this.deathSprite
      : this.isAttacking
      ? this.attackSprite
      : this.runSprite;

    if (this.isAttacking) {
      const attackRange = (this.size + window.game.player.size) * 0.9;

      ctx.save();
      ctx.globalAlpha = 0.2;
      // 아군이면 공격 범위 표시 색상을 녹색으로 변경
      ctx.fillStyle = this.isAlly ? "#00ff00" : "#ff0000";
      ctx.beginPath();
      ctx.arc(this.x, this.y, attackRange, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.8;
      // 아군이면 공격 범위 윤곽선 색상을 녹색으로 변경
      ctx.strokeStyle = this.isAlly ? "#00ff00" : "#ff0000";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px Arial";
      ctx.fillText(
        `데미지: ${this.attackDamage}`,
        this.x - 30,
        this.y - attackRange - 5
      );

      ctx.restore();
    }

    if (this.attackAnimationStarted && this.isAttacking) {
      // 공격 애니메이션 프레임 업데이트
      this.attackTickCount++;
      if (this.attackTickCount > this.attackTicksPerFrame) {
        this.attackTickCount = 0;
        this.attackFrameIndex++;
        if (this.attackFrameIndex >= this.attackFrames) {
          this.attackFrameIndex = 0;
          this.isAttacking = false;
          this.attackAnimationStarted = false;
        }
      }
    }
    
    // draw 함수에서는 카운터를 업데이트하지 않고 update에서 처리된 프레임을 사용
    // 단, 비공격/비사망 상태일 때의 이동 애니메이션은 여기서 처리
    if (!this.isDead && !this.isAttacking) {
      // 달리기 애니메이션
      this.tickCount++;
      if (this.tickCount > this.ticksPerFrame) {
        this.tickCount = 0;
        this.frameIndex++;
        if (this.frameIndex >= this.runFrames) {
          this.frameIndex = 0;
        }
      }
    }

    let frameIndex = this.isDead
      ? this.frameIndex
      : this.isAttacking
      ? this.attackFrameIndex
      : this.frameIndex;

    if (this.isDead && this.deathAnimationComplete) {
      frameIndex = this.deathFrames - 1;
    }
    
    // 프레임 인덱스 범위 검증
    const totalFrames = this.isDead ? this.deathFrames : this.isAttacking ? this.attackFrames : this.runFrames;
    if (frameIndex < 0 || frameIndex >= totalFrames) {
      console.error("유효하지 않은 프레임 인덱스:", {
        frameIndex,
        totalFrames,
        isDead: this.isDead,
        isAttacking: this.isAttacking,
        id: this.id
      });
      // 안전한 값으로 보정
      frameIndex = Math.max(0, Math.min(frameIndex, totalFrames - 1));
    }

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    // 방향에 따라 캐릭터 좌우 반전
    const isMovingLeft = this.speedX < 0;
    this.isFlipped = isMovingLeft;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.isFlipped) {
      ctx.scale(-1, 1);
    }

    // 현재 스프라이트와 프레임 인덱스에 따라 이미지 그리기
    if (currentSprite && currentSprite.complete) {
      // 스프라이트 프레임 계산 로직 개선
      let framesCount;
      if (this.isDead) {
        framesCount = this.deathFrames;
      } else if (this.isAttacking) {
        framesCount = this.attackFrames;
      } else {
        framesCount = this.runFrames;
      }
      
      const frameWidth = currentSprite.width / framesCount;
      const frameHeight = currentSprite.height;

      try {
        ctx.drawImage(
          currentSprite,
          frameIndex * frameWidth,
          0,
          frameWidth,
          frameHeight,
          -this.renderSize / 2,
          -this.renderSize / 2,
          this.renderSize,
          this.renderSize
        );
      } catch (err) {
        console.error("애니메이션 그리기 오류:", err, {
          sprite: currentSprite.src,
          frame: frameIndex,
          totalFrames: framesCount,
          width: currentSprite.width,
          height: currentSprite.height,
          id: this.id,
          isDead: this.isDead,
          deathAnimationComplete: this.deathAnimationComplete
        });
      }
    }
    ctx.restore();

    if (!this.isDead) {
      // 체력바 그리기
      const healthBarWidth = 40;
      const healthBarHeight = 5;
      const healthPercentage = Math.max(0, this.chips / this.maxChips);
      
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(
        this.x - healthBarWidth / 2,
        this.y - this.size - 10,
        healthBarWidth,
        healthBarHeight
      );
      
      // 아군이면 체력바를 녹색으로, 아니면 빨간색으로 표시
      ctx.fillStyle = this.isAlly ? "rgba(0, 255, 0, 0.7)" : "rgba(255, 0, 0, 0.7)";
      ctx.fillRect(
        this.x - healthBarWidth / 2,
        this.y - this.size - 10,
        healthBarWidth * healthPercentage,
        healthBarHeight
      );
      
      // 아군 상태 표시
      if (this.isAlly) {
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = "limegreen";
        ctx.textAlign = "center";
        ctx.fillText("아군", this.x, this.y - this.size - 15);
      }
    }

    ctx.restore();
  }
}
