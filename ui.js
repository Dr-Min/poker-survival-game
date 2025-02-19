export class UI {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.damageTexts = [];
    this.cardImages = {}; // 이미지 캐시
    this.loadedImages = new Set(); // 로드된 이미지 추적
    this.selectedType = null; // 디버그 모드 선택된 카드 타입
    this.selectedNumber = null; // 디버그 모드 선택된 카드 숫자
    this.preloadAllCardImages(); // 모든 카드 이미지 미리 로드
  }

  // 모든 카드 이미지 프리로드
  async preloadAllCardImages() {
    const types = ["spade", "heart", "diamond", "clover"];
    const numbers = Array.from({ length: 13 }, (_, i) => i + 1);

    const loadPromises = [];

    types.forEach((type) => {
      numbers.forEach((number) => {
        const key = `${type}_${number}`;
        if (!this.loadedImages.has(key)) {
          this.loadedImages.add(key);
          this.cardImages[key] = new Image();

          const promise = new Promise((resolve) => {
            this.cardImages[key].onload = resolve;
            this.cardImages[key].onerror = resolve; // 에러 시에도 진행
          });

          loadPromises.push(promise);
          const fileNumber = this.getFileNumber(type, number);
          this.cardImages[
            key
          ].src = `V2_4x/PixelPlebes_V2_4x__${fileNumber}.png`;
        }
      });
    });

    await Promise.all(loadPromises);
    console.log("모든 카드 이미지 로드 완료");
  }

  // 캐시된 이미지 가져오기
  getCardImage(type, number) {
    const key = `${type}_${number}`;
    return this.cardImages[key];
  }

  drawGameUI(gameState) {
    const {
      score,
      round,
      enemiesKilledInRound,
      enemiesRequiredForNextRound,
      roundStartTime,
      roundDuration,
      currentWeapon,
      player,
      effects,
      collectedCards,
    } = gameState;
    const now = Date.now();

    // 기본 텍스트 정렬 설정
    this.ctx.textAlign = "left";

    // UI 배경 그리기 (왼쪽)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(10, 10, 300, 230);

    // 점수 표시
    this.ctx.fillStyle = "white";
    this.ctx.font = "24px Arial";
    this.ctx.fillText(`점수: ${score}`, 20, 40);

    // 라운드 정보 표시
    this.ctx.fillText(`라운드: ${round}`, 20, 70);
    this.ctx.fillText(
      `처치: ${enemiesKilledInRound}/${enemiesRequiredForNextRound}`,
      20,
      100
    );

    // 남은 시간 표시
    const timeLeft = Math.max(
      0,
      Math.ceil((roundDuration - (now - roundStartTime)) / 1000)
    );
    this.ctx.fillText(`남은 시간: ${timeLeft}초`, 20, 130);

    // 현재 무기 정보 표시
    this.ctx.font = "20px Arial";
    this.ctx.fillText(`무기: ${currentWeapon.name}`, 20, 160);
    this.ctx.fillText(`공격력: ${currentWeapon.damage}`, 20, 190);

    // 체력바 그리기
    this.drawHealthBar(player);

    // 수집된 카드 표시
    this.drawCollectedCards(collectedCards);

    // 카드 효과 UI 그리기
    this.drawEffectsUI(effects);

    // 데미지 텍스트 업데이트 및 그리기
    this.updateDamageTexts();
  }

  drawHealthBar(player) {
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = 20;
    const healthBarY = 210;

    // 체력바 배경
    this.ctx.fillStyle = "#444444";
    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    // 현재 체력
    const currentHealthWidth = (player.hp / player.maxHp) * healthBarWidth;
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillRect(
      healthBarX,
      healthBarY,
      currentHealthWidth,
      healthBarHeight
    );

    // 체력바 테두리
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.strokeRect(
      healthBarX,
      healthBarY,
      healthBarWidth,
      healthBarHeight
    );
  }

  drawEffectsUI(effects) {
    const now = Date.now();
    const cardAreaX = this.canvas.width - 420;
    const cardAreaY = 180; // 카드 아래 충분한 여백을 두고 시작

    // 효과 표시 영역 (투명하게 유지)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    this.ctx.fillRect(cardAreaX - 10, cardAreaY, 410, 300);

    // 각 무늬별 효과 표시
    this.ctx.font = "14px Arial";
    let effectX = cardAreaX;
    const effectSpacing = 100; // 효과 간 간격

    // 각 효과를 가로로 배치
    if (effects.spade.count > 0) {
      this.ctx.fillStyle = "#9966ff";
      this.drawEffectType("♠ 스페이드", effects.spade, effectX, cardAreaY);
      effectX += effectSpacing;
    }

    if (effects.heart.count > 0) {
      this.ctx.fillStyle = "#ff4444";
      this.drawEffectType("♥ 하트", effects.heart, effectX, cardAreaY);
      effectX += effectSpacing;
    }

    if (effects.diamond.count > 0) {
      this.ctx.fillStyle = "#4477ff";
      this.drawEffectType("◆ 다이아몬드", effects.diamond, effectX, cardAreaY);
      effectX += effectSpacing;
    }

    if (effects.clover.count > 0) {
      this.ctx.fillStyle = "#44ff44";
      this.drawEffectType("♣ 클로버", effects.clover, effectX, cardAreaY);
    }
  }

  drawEffectType(title, effect, x, y) {
    this.ctx.fillText(`${title} 효과:`, x, y);
    let currentY = y + 20;
    const lineHeight = 18; // 줄 간격 조정

    Object.entries(effect).forEach(([key, value]) => {
      if (key !== "count" && value) {
        let text = "";
        switch (key) {
          case "damageIncrease":
            text = `- 데미지 ${value * 100}% 증가`;
            break;
          case "penetrationDamage":
            text = `- 관통 데미지 ${value * 100}% 증가`;
            break;
          case "criticalChance":
            text = `- 치명타 확률 ${value * 100}%`;
            break;
          case "lifeSteal":
            text = `- 흡혈량 ${value * 100}%`;
            break;
          case "convertChance":
            text = `- 적 전환 확률 ${value * 100}%`;
            break;
          case "maxHpIncrease":
            text = `- 최대 체력 ${value * 100}% 증가`;
            break;
          case "allyPowerUp":
            text = `- 아군 강화`;
            break;
          case "slowAmount":
            text = `- 적 이동속도 ${value * 100}% 감소`;
            break;
          case "stunDuration":
            text = `- ${value / 1000}초 스턴`;
            break;
          case "aoeSlow":
            text = `- 범위 감속`;
            break;
          case "damageAmplify":
            text = `- 데미지 증폭 ${value * 100}%`;
            break;
          case "ricochetChance":
            text = `- 도탄 확률 ${value * 100}%`;
            break;
          case "explosionEnabled":
            text = `- 폭발 효과`;
            break;
          case "bounceCount":
            text = value > 0 ? `- 도탄 강화` : "";
            break;
          case "explosionSize":
            text = value > 1 ? `- 폭발 범위 ${value}배` : "";
            break;
        }
        if (text) {
          this.ctx.fillText(text, x, currentY);
          currentY += lineHeight;
        }
      }
    });
  }

  addDamageText(x, y, damage, color = "#ffffff") {
    this.damageTexts.push({
      x,
      y,
      damage: Math.round(damage * 10) / 10,
      color,
      createdTime: Date.now(),
      velocity: -2,
    });
  }

  updateDamageTexts() {
    const now = Date.now();
    this.damageTexts = this.damageTexts.filter((text) => {
      const age = now - text.createdTime;
      if (age > 1000) return false;

      text.y += text.velocity;
      this.ctx.fillStyle = text.color;
      this.ctx.font = "bold 20px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(text.damage, text.x, text.y);

      return true;
    });
  }

  drawPauseScreen() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; // 배경 더 어둡게
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 일시정지 메시지
    this.ctx.fillStyle = "white";
    this.ctx.font = "48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("일시정지", this.canvas.width / 2, 100);

    // 디버그 모드 UI
    this.ctx.font = "24px Arial";
    this.ctx.fillText("디버그 모드 - 카드 선택", this.canvas.width / 2, 160);

    // 카드 타입과 숫자 선택 UI
    const types = ["스페이드", "하트", "다이아", "클로버"];
    const numbers = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
    ];
    const startX = this.canvas.width / 2 - 300;
    const startY = 200;
    const buttonWidth = 140;
    const buttonHeight = 40;
    const padding = 10;

    // 타입 선택 버튼
    this.ctx.font = "20px Arial";
    types.forEach((type, i) => {
      const x = startX + (buttonWidth + padding) * i;
      this.ctx.fillStyle = this.getDebugButtonColor(type);
      this.ctx.fillRect(x, startY, buttonWidth, buttonHeight);
      this.ctx.fillStyle = type === this.selectedType ? "black" : "white"; // 선택된 타입은 글자색 변경
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        type,
        x + buttonWidth / 2,
        startY + buttonHeight / 2 + 6
      );
    });

    // 숫자 선택 버튼
    numbers.forEach((num, i) => {
      const x = startX + (buttonWidth + padding) * (i % 4);
      const y =
        startY +
        buttonHeight +
        padding +
        Math.floor(i / 4) * (buttonHeight + padding);
      this.ctx.fillStyle =
        num === this.selectedNumber
          ? "rgba(200, 200, 200, 0.8)"
          : "rgba(100, 100, 100, 0.8)"; // 선택된 숫자는 밝게
      this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
      this.ctx.fillStyle = "white";
      this.ctx.fillText(num, x + buttonWidth / 2, y + buttonHeight / 2 + 6);
    });

    // 선택된 카드 표시
    this.ctx.fillStyle = "white";
    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      "선택된 카드: " + this.getSelectedCardText(),
      this.canvas.width / 2,
      startY + 200
    );

    // 안내 메시지
    this.ctx.fillText(
      "Enter: 카드 획득 / ESC: 게임으로 돌아가기",
      this.canvas.width / 2,
      startY + 240
    );
  }

  getDebugButtonColor(type) {
    switch (type) {
      case "스페이드":
        return "#9966ff";
      case "하트":
        return "#ff4444";
      case "다이아":
        return "#4477ff";
      case "클로버":
        return "#44ff44";
      default:
        return "#ffffff";
    }
  }

  getSelectedCardText() {
    if (!this.selectedType || !this.selectedNumber) {
      return "선택 안됨";
    }
    return `${this.selectedType} ${this.selectedNumber}`;
  }

  handleDebugClick(x, y) {
    const startX = this.canvas.width / 2 - 300;
    const startY = 200;
    const buttonWidth = 140;
    const buttonHeight = 40;
    const padding = 10;

    // 타입 선택 확인
    const types = ["스페이드", "하트", "다이아", "클로버"];
    types.forEach((type, i) => {
      const buttonX = startX + (buttonWidth + padding) * i;
      if (
        x >= buttonX &&
        x <= buttonX + buttonWidth &&
        y >= startY &&
        y <= startY + buttonHeight
      ) {
        this.selectedType = type;
      }
    });

    // 숫자 선택 확인
    const numbers = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
    ];
    numbers.forEach((num, i) => {
      const buttonX = startX + (buttonWidth + padding) * (i % 4);
      const buttonY =
        startY +
        buttonHeight +
        padding +
        Math.floor(i / 4) * (buttonHeight + padding);
      if (
        x >= buttonX &&
        x <= buttonX + buttonWidth &&
        y >= buttonY &&
        y <= buttonY + buttonHeight
      ) {
        this.selectedNumber = num;
      }
    });
  }

  getDebugCardInfo() {
    if (!this.selectedType || !this.selectedNumber) return null;

    const typeMap = {
      스페이드: "spade",
      하트: "heart",
      다이아: "diamond",
      클로버: "clover",
    };

    const numberMap = {
      A: 1,
      J: 11,
      Q: 12,
      K: 13,
    };

    const type = typeMap[this.selectedType];
    const number =
      numberMap[this.selectedNumber] || parseInt(this.selectedNumber);

    return { type, number };
  }

  drawRoundTransition(round) {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "white";
    this.ctx.font = "48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `라운드 ${round} 클리어!`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );
    this.ctx.fillText(
      "다음 라운드 준비중...",
      this.canvas.width / 2,
      this.canvas.height / 2 + 50
    );
  }

  countActiveEffects(effectGroup) {
    return Object.entries(effectGroup).filter(
      ([key, value]) => key !== "count" && value && typeof value !== "number"
    ).length;
  }

  drawCollectedCards(cards) {
    const cardAreaX = this.canvas.width - 420;
    const cardAreaY = 10;
    const cardSpacing = 80;
    const cardSize = 70;

    // 카드 영역 배경 (투명하게)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
    this.ctx.fillRect(cardAreaX - 10, cardAreaY, 410, cardSize + 40);

    // 각 카드 그리기
    cards.forEach((card, index) => {
      const x = cardAreaX + index * cardSpacing;
      const y = cardAreaY + 10;

      // 카드 배경 (투명하게)
      this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
      this.ctx.fillRect(x, y, cardSize, cardSize);

      // 첫 번째 카드이고 카드가 5개일 때 교체될 카드임을 표시
      if (index === 0 && cards.length === 5) {
        // 깜빡이는 효과
        if (Math.floor(Date.now() / 500) % 2 === 0) {
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          this.ctx.fillRect(x, y, cardSize, cardSize);
        }
        // "교체 예정" 텍스트 표시
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        this.ctx.font = "12px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("교체 예정", x + cardSize / 2, y - 5);
      }

      // 카드 테두리
      this.ctx.strokeStyle = this.getCardColor(card.type);
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, cardSize, cardSize);

      // 캐시된 이미지 사용
      const img = this.getCardImage(card.type, card.number);
      if (img && img.complete) {
        // 이미지 비율 계산
        const imgRatio = img.width / img.height;
        let drawWidth = cardSize;
        let drawHeight = cardSize;
        let drawX = x;
        let drawY = y;

        if (imgRatio > 1) {
          drawHeight = cardSize / imgRatio;
          drawY = y + (cardSize - drawHeight) / 2;
        } else if (imgRatio < 1) {
          drawWidth = cardSize * imgRatio;
          drawX = x + (cardSize - drawWidth) / 2;
        }

        this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // 카드 아래에 문양과 숫자 표시
        this.ctx.fillStyle = this.getCardColor(card.type);
        this.ctx.font = "bold 24px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
          `${this.getDisplayNumber(card.number)} ${this.getCardSymbol(
            card.type
          )}`,
          x + cardSize / 2,
          y + cardSize + 25
        );
      }
    });
  }

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

  getCardSymbol(type) {
    switch (type) {
      case "spade":
        return "♠";
      case "heart":
        return "♥";
      case "diamond":
        return "♦";
      case "clover":
        return "♣";
      default:
        return "";
    }
  }

  getCardColor(type) {
    switch (type) {
      case "spade":
        return "#9966ff"; // 보라색으로 변경
      case "heart":
        return "#ff4444"; // 빨간색 유지
      case "diamond":
        return "#4477ff"; // 파란색으로 변경
      case "clover":
        return "#44ff44"; // 초록색 유지
      default:
        return "#ffffff";
    }
  }

  getDisplayNumber(number) {
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
}
