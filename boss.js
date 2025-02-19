export class Boss {
  constructor(round) {
    this.id = Date.now() + Math.random();
    this.round = round;
    this.maxHp = 100 + (round - 1) * 50;
    this.hp = this.maxHp;
    this.size = 40;
    this.cards = [];
    this.isDead = false;
    this.x = 600; // 화면 중앙
    this.y = 150; // 상단

    // 공격 패턴 관련 상태
    this.attackPattern = 0; // 현재 공격 패턴
    this.attackCooldown = 3000; // 공격 쿨다운 (3초)
    this.lastAttackTime = 0; // 마지막 공격 시간
    this.isAttacking = false; // 공격 중 여부

    // 포커 게임 결과에 따른 상태
    this.attackBonus = 1.0; // 공격력 보너스
    this.defenseBonus = 1.0; // 방어력 보너스

    // 시각 효과 관련 상태
    this.attackEffects = [];
    this.glowIntensity = 0;
    this.glowDirection = 1;
  }

  // 공격 타이머 초기화
  resetAttackTimer() {
    this.lastAttackTime = Date.now();
    this.isAttacking = false;
    this.attackPattern = 0;
    this.attackEffects = [];
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

    // 공격 쿨다운 체크
    if (now - this.lastAttackTime >= this.attackCooldown && !this.isAttacking) {
      this.isAttacking = true;
      this.attackPattern = (this.attackPattern + 1) % 3;
      this.lastAttackTime = now;

      // 공격 패턴에 따른 공격 정보 반환
      const baseAttack = 2 * this.attackBonus;
      switch (this.attackPattern) {
        case 0: // 단일 강공격
          return {
            type: "single",
            damage: baseAttack * 2,
            range: 50,
          };
        case 1: // 광역 약공격
          return {
            type: "area",
            damage: baseAttack,
            range: 150,
          };
        case 2: // 연속 공격
          return {
            type: "multi",
            damage: baseAttack * 1.5,
            count: 3,
            interval: 500,
          };
      }
    }

    return null;
  }

  draw(ctx) {
    // 보스 몸체 그리기
    ctx.save();

    // 공격 중일 때 빛나는 효과
    if (this.isAttacking) {
      this.glowIntensity += 0.1 * this.glowDirection;
      if (this.glowIntensity >= 1) this.glowDirection = -1;
      if (this.glowIntensity <= 0) this.glowDirection = 1;

      ctx.shadowColor = "red";
      ctx.shadowBlur = 20 + this.glowIntensity * 10;
    }

    // 보스 본체
    ctx.fillStyle = this.isAttacking ? "#ff4444" : "#880000";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // 보스 테두리
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // 공격 이펙트 그리기
    this.drawAttackEffects(ctx);
  }

  drawAttackEffects(ctx) {
    // 공격 이펙트 업데이트 및 그리기
    this.attackEffects = this.attackEffects.filter((effect) => {
      effect.update();
      effect.draw(ctx);
      return !effect.finished;
    });
  }

  // 공격 이펙트 추가
  addAttackEffect(type, target) {
    const effect = new BossAttackEffect(this, type, target);
    this.attackEffects.push(effect);
  }
}

// 보스 공격 이펙트 클래스
class BossAttackEffect {
  constructor(boss, type, target) {
    this.boss = boss;
    this.type = type;
    this.target = target;
    this.progress = 0;
    this.duration = 500;
    this.startTime = Date.now();
    this.finished = false;
  }

  update() {
    const elapsed = Date.now() - this.startTime;
    this.progress = Math.min(elapsed / this.duration, 1);
    if (this.progress >= 1) {
      this.finished = true;
    }
  }

  draw(ctx) {
    ctx.save();

    switch (this.type) {
      case "single":
        this.drawSingleAttack(ctx);
        break;
      case "area":
        this.drawAreaAttack(ctx);
        break;
      case "multi":
        this.drawMultiAttack(ctx);
        break;
    }

    ctx.restore();
  }

  drawSingleAttack(ctx) {
    const startX = this.boss.x;
    const startY = this.boss.y;
    const endX = this.target.x;
    const endY = this.target.y;

    ctx.strokeStyle = `rgba(255, 0, 0, ${1 - this.progress})`;
    ctx.lineWidth = 5 * (1 - this.progress);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(
      startX + (endX - startX) * this.progress,
      startY + (endY - startY) * this.progress
    );
    ctx.stroke();
  }

  drawAreaAttack(ctx) {
    const radius = this.boss.size + 150 * this.progress;

    ctx.fillStyle = `rgba(255, 0, 0, ${0.3 * (1 - this.progress)})`;
    ctx.beginPath();
    ctx.arc(this.boss.x, this.boss.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 0, 0, ${1 - this.progress})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  drawMultiAttack(ctx) {
    const angle = this.progress * Math.PI * 4;
    const radius = 50 + 30 * Math.sin(angle);

    ctx.strokeStyle = `rgba(255, 0, 0, ${1 - this.progress})`;
    ctx.lineWidth = 3;

    for (let i = 0; i < 3; i++) {
      const subAngle = (i * Math.PI * 2) / 3 + angle;
      const x = this.boss.x + Math.cos(subAngle) * radius;
      const y = this.boss.y + Math.sin(subAngle) * radius;

      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
