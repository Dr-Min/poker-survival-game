// 플레이어 주변을 회전하는 스페이드 카드 클래스
export class OrbitingCard {
  constructor(player, index, totalCards, cardType, cardNumber, cardImages) {
    this.player = player;
    this.index = index; // 카드 인덱스 (0, 1, 2 등)
    this.totalCards = totalCards; // 총 카드 수
    this.cardType = cardType; // 카드 타입 (spade)
    this.cardNumber = cardNumber; // 카드 숫자 (1-13)

    // 기본 속성
    this.distance = 80; // 플레이어로부터의 거리
    this.size = 15; // 카드 크기 (절반으로 축소)
    this.angle = (index / totalCards) * Math.PI * 2; // 초기 각도 (균등하게 분배)
    this.baseRotationSpeed = 0.048; // 기본 회전 속도 (라디안/프레임)
    this.rotationSpeed = this.baseRotationSpeed; // 실제 적용될 회전 속도
    this.baseDamage = 1; // 기본 데미지 (실제 값은 updateEffects에서 설정됨)
    this.damage = this.baseDamage; // 실제 적용될 데미지
    this.knockbackPower = 6; // 넉백 효과 (강화)

    // 실제 카드 숫자에 따라 데미지 향상
    if (cardNumber > 10) {
      this.baseDamage += 0.5; // J, Q, K는 데미지 추가 (기본 값에서 +0.5)
      this.damage = this.baseDamage;
    }

    // 카드 이미지 사용
    if (
      cardImages &&
      cardImages[cardType] &&
      cardImages[cardType][cardNumber]
    ) {
      this.cardImage = cardImages[cardType][cardNumber];
      console.log(`오비탈 카드 이미지 사용: ${cardType} ${cardNumber}`);
    } else {
      // 이미지가 없는 경우 새로운 이미지 객체 생성
      this.cardImage = new Image();
      // 실제 카드 이미지 로드 시도
      const fileNumber = this.getFileNumber(cardType, cardNumber);
      this.cardImage.src = `V2_4x/PixelPlebes_V2_4x__${fileNumber}.png`;
      this.cardImage.onerror = () => {
        console.error(
          `오비탈 카드 이미지 로드 실패: ${cardType} ${cardNumber} (파일번호: ${fileNumber})`
        );
      };
      this.cardImage.onload = () => {
        console.log(
          `오비탈 카드 이미지 로드 성공: ${cardType} ${cardNumber} (파일번호: ${fileNumber})`
        );
      };
    }

    // 텍스트 백업용 설정
    this.cardSymbol = "♠";
    this.cardText = this.getCardText(cardNumber);

    console.log(
      `오비탈 카드 ${index} 생성됨 - ${this.cardType} ${this.cardText}`
    );

    // 충돌 쿨다운 관리 (같은 적을 연속해서 여러 번 때리지 않도록)
    this.hitEnemies = new Map(); // 각 적 ID마다 다음 히트 가능 시간 저장
    this.hitCooldown = 500; // 같은 적을 다시 때릴 수 있는 시간 (ms)

    this.isPulsing = false; // 효과 강조를 위한 맥동 효과
    this.pulseTime = 0;

    // 효과 적용 (게임 객체가 있을 경우)
    this.updateEffects();
  }

  // 파일 번호 계산 (utils.js의 getFileNumber와 같은 로직)
  getFileNumber(type, number) {
    const baseOffset = {
      heart: 0,
      diamond: 13,
      spade: 26,
      clover: 39,
    }[type];

    let fileIndex;
    if (number === 1) fileIndex = 1;
    else if (number === 13) fileIndex = 2;
    else if (number === 12) fileIndex = 3;
    else if (number === 11) fileIndex = 4;
    else fileIndex = number + 3;

    return String(baseOffset + fileIndex).padStart(2, "0");
  }

  // 카드 숫자를 텍스트로 변환
  getCardText(number) {
    switch (number) {
      case 1:
        return "A";
      case 11:
        return "J";
      case 12:
        return "Q";
      case 13:
        return "K";
      default:
        return number.toString();
    }
  }

  // 게임 효과 업데이트
  updateEffects() {
    if (window.game && window.game.effects) {
      const effects = window.game.effects.getEffects();

      // 플레이어 총알 데미지의 25%로 설정
      const currentWeapon = window.game.effects.weaponSystem.getCurrentWeapon();
      if (currentWeapon) {
        const bulletDamage = currentWeapon.damage;
        this.baseDamage = bulletDamage * 0.25; // 총알 데미지의 25%

        // 실제 카드 숫자에 따른 보너스 재적용
        if (this.cardNumber > 10) {
          this.baseDamage += bulletDamage * 0.05; // 총알 데미지의 추가 5% 보너스
        }

        console.log(
          `총알 데미지: ${bulletDamage}, 오비탈 카드 기본 데미지: ${this.baseDamage.toFixed(
            1
          )}`
        );
      }

      if (effects.spade) {
        // 스페이드 효과 적용
        if (effects.spade.orbitingCardSpeedBoost) {
          this.rotationSpeed =
            this.baseRotationSpeed * effects.spade.orbitingCardSpeedBoost;
        }

        if (effects.spade.orbitingCardDamageBoost) {
          this.damage = this.baseDamage * effects.spade.orbitingCardDamageBoost;
        } else {
          this.damage = this.baseDamage;
        }

        console.log(
          `오비탈 카드 데미지: ${this.damage.toFixed(1)} (총알 데미지의 25%)`
        );
      }
    }
  }

  update(now) {
    // 효과 업데이트
    this.updateEffects();

    // 카드 위치 업데이트 (플레이어 주변 회전)
    this.angle += this.rotationSpeed;

    // 맥동 효과 업데이트
    this.pulseTime += 0.1;
    this.isPulsing = Math.sin(this.pulseTime) > 0.7;

    // 적 히트 쿨다운 관리
    this.hitEnemies.forEach((nextHitTime, enemyId) => {
      if (now > nextHitTime) {
        this.hitEnemies.delete(enemyId);
      }
    });

    // 현재 위치 계산 (플레이어 중심)
    this.x = this.player.x + Math.cos(this.angle) * this.distance;
    this.y = this.player.y + Math.sin(this.angle) * this.distance;
  }

  checkCollisions(enemies, now) {
    if (!enemies || enemies.length === 0) return;

    enemies.forEach((enemy) => {
      // 죽은 적이나 아군은 무시
      if (enemy.isDead || enemy.isAlly) return;

      // 이미 쿨다운 중인 적은 무시
      if (this.hitEnemies.has(enemy.id)) return;

      // 충돌 체크
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (this.size + enemy.size) / 2) {
        // 충돌 발생!
        console.log(
          `🃏 오비탈 카드 ${this.cardType} ${this.cardText}가 적 ${enemy.id}와 충돌했습니다!`
        );

        // 적에게 데미지 주기
        enemy.takeDamage(this.damage);

        // 데미지 텍스트 표시 추가
        if (window.game && window.game.ui) {
          window.game.ui.addDamageText(
            enemy.x,
            enemy.y - enemy.size / 2,
            this.damage,
            "#ffffff"
          );
        }

        // 넉백 효과 적용 (적 위치 강하게 밀기)
        const angle = Math.atan2(dy, dx);
        const knockbackX = Math.cos(angle) * this.knockbackPower;
        const knockbackY = Math.sin(angle) * this.knockbackPower;

        // 적 객체에 넉백 메서드가 있는지 확인하고 적용
        if (typeof enemy.applyKnockback === "function") {
          enemy.applyKnockback(knockbackX, knockbackY);
        } else {
          // 직접 좌표 업데이트
          enemy.x += knockbackX;
          enemy.y += knockbackY;
        }

        // 화면 밖으로 나가지 않도록 제한
        enemy.x = Math.max(enemy.size, Math.min(1200 - enemy.size, enemy.x));
        enemy.y = Math.max(enemy.size, Math.min(800 - enemy.size, enemy.y));

        // 쿨다운 설정
        this.hitEnemies.set(enemy.id, now + this.hitCooldown);

        // 충돌 시 맥동 효과 강화
        this.isPulsing = true;
        this.pulseTime = Math.PI / 2; // 맥동 최대치로 설정
      }
    });
  }

  draw(ctx) {
    ctx.save();

    // 맥동 효과에 따라 크기와 투명도 조정
    const pulseScale = this.isPulsing ? 1.2 : 1;
    const pulseAlpha = this.isPulsing ? 1 : 0.8;

    // 카드 회전 적용
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2); // 카드가 진행 방향을 향하도록

    // 카드 크기 맥동 효과
    const drawSize = this.size * pulseScale;

    // 이미지가 로드되었는지 확인
    if (this.cardImage.complete && this.cardImage.naturalWidth !== 0) {
      // 실제 카드 이미지 그리기
      const imgWidth = this.cardImage.width;
      const imgHeight = this.cardImage.height;
      const scale = Math.min(
        (drawSize * 2) / imgWidth,
        (drawSize * 2) / imgHeight
      );
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      ctx.globalAlpha = pulseAlpha;
      ctx.drawImage(
        this.cardImage,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
    } else {
      // 이미지 로드 실패 시 대체 표시
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = pulseAlpha;
      ctx.fillRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);

      // 카드 테두리
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.strokeRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);

      // 카드 모서리 표시
      ctx.fillStyle = "#9966ff"; // 스페이드는 보라색으로 표시
      ctx.font = `${drawSize * 0.3}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 왼쪽 상단 모서리에 심볼과 숫자 표시
      ctx.fillText(this.cardSymbol, -drawSize * 0.25, -drawSize * 0.25);
      ctx.fillText(this.cardText, -drawSize * 0.25, -drawSize * 0.1);

      // 카드 중앙에 큰 심볼 표시
      ctx.font = `${drawSize * 0.5}px Arial`;
      ctx.fillText(this.cardSymbol, 0, 0);
    }

    // 디버그용 히트박스
    if (window.game && window.game.debugOptions.showHitboxes) {
      ctx.strokeStyle = "#ff00ff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
