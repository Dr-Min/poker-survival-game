export class UI {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cardImages = {};
    this.collectedCards = [];
    this.cardClickAreas = [];
    this.damageTexts = [];
    this.cardBackImage = new Image();
    this.cardBackImage.src = "V2_4x/PixelPlebes_V2_4x__53.png";
    this.preloadAllCardImages();
  }

  async preloadAllCardImages() {
    const types = ["heart", "diamond", "spade", "clover"];
    const numbers = Array.from({ length: 13 }, (_, i) => i + 1);

    for (const type of types) {
      for (const number of numbers) {
        const fileNumber = this.getFileNumber(type, number);
        const img = new Image();
        img.src = `V2_4x/PixelPlebes_V2_4x__${fileNumber}.png`;
        this.cardImages[`${type}_${number}`] = img;
      }
    }
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

  getCardImage(type, number) {
    return this.cardImages[`${type}_${number}`];
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
      boss, // 보스 정보 추가
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
    this.ctx.fillText(
      timeLeft > 0 ? `남은 시간: ${timeLeft}초` : "모든 적을 처치하세요!",
      20,
      130
    );

    // 현재 무기 정보 표시
    this.ctx.font = "20px Arial";
    this.ctx.fillText(`무기: ${currentWeapon.name}`, 20, 160);
    this.ctx.fillText(`공격력: ${currentWeapon.damage}`, 20, 190);

    // 체력바 그리기
    this.drawHealthBar(player);

    // 보스가 있을 경우 보스 체력바 표시
    if (boss) {
      this.drawBossHealthBar(boss);
    }

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

  drawBossHealthBar(boss) {
    const healthBarWidth = 400;
    const healthBarHeight = 30;
    const healthBarX = (this.canvas.width - healthBarWidth) / 2;
    const healthBarY = 20;

    // 체력바 배경
    this.ctx.fillStyle = "#444444";
    this.ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    // 현재 체력
    const currentHealthWidth = (boss.hp / boss.maxHp) * healthBarWidth;
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

    // 보스 체력 텍스트
    this.ctx.fillStyle = "white";
    this.ctx.font = "20px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `보스 HP: ${Math.ceil(boss.hp)}/${boss.maxHp}`,
      this.canvas.width / 2,
      healthBarY + healthBarHeight + 20
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
            text = `- 도탄 확률 ${value * 100}% (데미지 50%)`;
            break;
          case "explosionEnabled":
            text = `- 폭발 효과`;
            break;
          case "bounceCount":
            text = value > 0 ? `- 3연속 도탄 (데미지 100%)` : "";
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

    // 보스전 진입 버튼
    const bossButtonWidth = 200;
    const bossButtonHeight = 50;
    const bossButtonX = (this.canvas.width - bossButtonWidth) / 2;
    const bossButtonY = 500;

    this.ctx.fillStyle = "#ff4444";
    this.ctx.fillRect(
      bossButtonX,
      bossButtonY,
      bossButtonWidth,
      bossButtonHeight
    );
    this.ctx.fillStyle = "white";
    this.ctx.fillText("보스전 진입", this.canvas.width / 2, bossButtonY + 32);

    // 보스전 버튼 영역 저장
    this.bossButtonArea = {
      x: bossButtonX,
      y: bossButtonY,
      width: bossButtonWidth,
      height: bossButtonHeight,
    };

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
      this.ctx.fillStyle = type === this.selectedType ? "black" : "white";
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
          : "rgba(100, 100, 100, 0.8)";
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
    // 반투명 배경 그라데이션
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width / 2
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.85)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 라운드 클리어 텍스트 (빛나는 효과)
    this.ctx.save();
    this.ctx.shadowColor = "#ffff00";
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 64px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `라운드 ${round} 클리어!`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 80
    );
    this.ctx.restore();

    // 다음 라운드 정보 박스
    const boxWidth = 500;
    const boxHeight = 180;
    const boxX = (this.canvas.width - boxWidth) / 2;
    const boxY = this.canvas.height / 2 - 20;

    // 박스 배경
    this.ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // 박스 테두리
    this.ctx.strokeStyle = "#666666";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // 다음 라운드 정보
    this.ctx.fillStyle = "#00ffff";
    this.ctx.font = "28px Arial";
    this.ctx.fillText(`다음 라운드 정보`, this.canvas.width / 2, boxY + 40);

    // 적 정보
    this.ctx.fillStyle = "#ff9999";
    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      `- 적 체력: ${5 + Math.floor((round + 1) * 1.5)}`,
      this.canvas.width / 2,
      boxY + 80
    );
    this.ctx.fillText(
      `- 적 속도: ${Math.round((1 + (round + 1) * 0.1) * 100)}%`,
      this.canvas.width / 2,
      boxY + 110
    );

    // 보스전 알림
    if ((round + 1) % 5 === 0) {
      this.ctx.fillStyle = "#ff0000";
      this.ctx.font = "bold 32px Arial";
      this.ctx.fillText(
        "⚠ 다음은 보스전 입니다! ⚠",
        this.canvas.width / 2,
        boxY + 150
      );
    } else {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "24px Arial";
      this.ctx.fillText(
        `다음 보스전까지 ${5 - ((round + 1) % 5)}라운드`,
        this.canvas.width / 2,
        boxY + 150
      );
    }

    // 준비 메시지 (깜빡이는 효과)
    this.ctx.fillStyle = `rgba(255, 255, 255, ${
      0.5 + Math.sin(Date.now() / 300) * 0.5
    })`;
    this.ctx.font = "32px Arial";
    this.ctx.fillText(
      "준비하세요...",
      this.canvas.width / 2,
      this.canvas.height - 100
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

  drawPokerUI(pokerState, pokerSystem, selectedCards) {
    // 반투명 배경
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 페이즈에 따른 UI 표시
    switch (pokerState.phase) {
      case "selection":
        this.drawCardSelectionUI(selectedCards);
        break;
      case "betting":
        this.drawBettingUI(pokerState, pokerSystem);
        break;
      case "showdown":
        this.drawShowdownUI(pokerSystem);
        break;
    }

    if (pokerState.phase === "betting") {
      this.drawBettingUI(pokerState, pokerSystem);

      // 보스의 마지막 액션 표시
      if (pokerState.lastAction) {
        this.ctx.fillStyle = "#ff0000";
        this.ctx.font = "24px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(pokerState.lastAction, this.canvas.width / 2, 100);
      }
    }
  }

  drawCardSelectionUI(selectedCards) {
    // 반투명 배경
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width / 2
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.85)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 제목
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 36px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "포커 게임에 사용할 카드 2장을 선택하세요",
      this.canvas.width / 2,
      100
    );

    // 선택된 카드 수 표시
    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      `선택된 카드: ${selectedCards.length}/2`,
      this.canvas.width / 2,
      150
    );

    // 카드 그리기
    const cardWidth = 120;
    const cardHeight = 180;
    const cardSpacing = 30;
    const cardsPerRow = 5;
    const totalWidth =
      (cardWidth + cardSpacing) *
        Math.min(this.collectedCards.length, cardsPerRow) -
      cardSpacing;
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = (this.canvas.height - cardHeight) / 2;

    // 클릭 영역 초기화
    this.cardClickAreas = [];

    // 소유한 카드 표시
    this.collectedCards.forEach((card, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;
      const x = startX + col * (cardWidth + cardSpacing);
      const y = startY + row * (cardHeight + 60);

      // 카드 그리기
      this.drawCard(card, x, y, false);

      // 선택된 카드 표시
      const isSelected = selectedCards.some(
        (selected) =>
          selected.type === card.type && selected.number === card.number
      );

      // 중복 카드 체크
      const isDuplicate =
        selectedCards.length > 0 &&
        selectedCards.some(
          (selected) =>
            selected.type === card.type && selected.number === card.number
        );

      if (isSelected) {
        // 선택된 카드 테두리
        this.ctx.strokeStyle = "#ffff00";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x - 2, y - 2, cardWidth + 4, cardHeight + 4);
      } else if (isDuplicate && selectedCards.length >= 2) {
        // 중복 카드 표시 (선택 불가)
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        this.ctx.fillRect(x, y, cardWidth, cardHeight);
      }

      // 클릭 영역 저장
      this.cardClickAreas.push({
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        card,
      });
    });

    // 선택 완료 버튼
    if (selectedCards.length === 2) {
      const buttonWidth = 200;
      const buttonHeight = 50;
      const buttonX = (this.canvas.width - buttonWidth) / 2;
      const buttonY = startY + cardHeight + 80;

      this.ctx.fillStyle = "#4CAF50";
      this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "bold 24px Arial";
      this.ctx.fillText("선택 완료", this.canvas.width / 2, buttonY + 33);

      // 버튼 클릭 영역 저장
      this.confirmButtonArea = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      };
    }
  }

  drawBettingUI(pokerState, pokerSystem) {
    // 배경 그리기
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 보스 카드, 커뮤니티 카드, 플레이어 카드 표시
    this.drawBossCards(pokerSystem.bossCards);
    this.drawCommunityCards(pokerSystem.communityCards);
    this.drawPlayerCards(pokerSystem.playerCards);

    // 현재 베팅 정보 표시
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `현재 배팅: ${pokerState.currentBetPercent + 60}%`,
      this.canvas.width / 2,
      100
    );

    // 왼쪽에 베팅 시스템 설명
    this.ctx.textAlign = "left";
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(20, 150, 300, 300);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "20px Arial";
    const explanations = [
      "베팅 시스템 설명",
      "",
      "기본 배팅: 60%",
      "- 플레이어: 30%",
      "- 보스: 30%",
      "",
      "레이즈 시스템",
      "- 10%씩 추가 가능",
      "- 최대 50%까지",
      "",
      "결과",
      "- 승리: 보스 데미지 2/3",
      "- 패배: 전체 데미지",
      "- 폴드: 30% 데미지",
    ];
    explanations.forEach((text, index) => {
      this.ctx.fillText(text, 40, 180 + index * 25);
    });

    // 플레이어 턴일 때만 버튼 표시 (오른쪽에 세로로 배치)
    if (pokerState.currentTurn === "player") {
      const buttonWidth = 180;
      const buttonHeight = 50;
      const buttonSpacing = 20;
      const startX = this.canvas.width - buttonWidth - 40;
      const startY = this.canvas.height / 2 - 100;

      // 폴드 버튼
      const foldButton = {
        x: startX,
        y: startY,
        width: buttonWidth,
        height: buttonHeight,
      };

      this.ctx.fillStyle = "#ff4444";
      this.ctx.fillRect(foldButton.x, foldButton.y, buttonWidth, buttonHeight);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.textAlign = "center";
      this.ctx.fillText("폴드", startX + buttonWidth / 2, startY + 35);

      // 콜 버튼
      const callButton = {
        x: startX,
        y: startY + buttonHeight + buttonSpacing,
        width: buttonWidth,
        height: buttonHeight,
      };

      this.ctx.fillStyle = "#4444ff";
      this.ctx.fillRect(callButton.x, callButton.y, buttonWidth, buttonHeight);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText("콜", startX + buttonWidth / 2, callButton.y + 35);

      // 레이즈 버튼 또는 최대 베팅 메시지
      const raiseButton = {
        x: startX,
        y: startY + (buttonHeight + buttonSpacing) * 2,
        width: buttonWidth,
        height: buttonHeight,
      };

      if (pokerState.currentBetPercent < 50) {
        this.ctx.fillStyle = "#44ff44";
        this.ctx.fillRect(
          raiseButton.x,
          raiseButton.y,
          buttonWidth,
          buttonHeight
        );
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(
          "레이즈 (10%)",
          startX + buttonWidth / 2,
          raiseButton.y + 35
        );
      } else {
        this.ctx.fillStyle = "#888888";
        this.ctx.fillRect(
          raiseButton.x,
          raiseButton.y,
          buttonWidth,
          buttonHeight
        );
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(
          "최대 베팅",
          startX + buttonWidth / 2,
          raiseButton.y + 35
        );
      }

      // 버튼 영역 저장
      this.bettingButtonAreas = {
        fold: foldButton,
        call: callButton,
        raise: [raiseButton],
      };
    }
  }

  drawShowdownUI(pokerSystem) {
    const now = Date.now();
    const startTime = pokerSystem.showdownStartTime || now;
    const elapsedTime = now - startTime;

    // 배경 그리기
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 커뮤니티 카드와 플레이어 카드는 항상 표시
    this.drawCommunityCards(pokerSystem.communityCards);
    this.drawPlayerCards(pokerSystem.playerCards);

    // 보스 카드 순차적 공개
    const cardRevealInterval = 1000; // 1초 간격
    pokerSystem.bossCards.forEach((card, index) => {
      const shouldReveal = elapsedTime >= cardRevealInterval * index;
      this.drawBossCard(card, index, shouldReveal);
    });

    // 모든 카드가 공개된 후 결과 표시
    const allCardsRevealed =
      elapsedTime >=
      cardRevealInterval * (pokerSystem.bossCards.length - 1) + 500;

    if (allCardsRevealed) {
      const result = pokerSystem.getGameResult();
      if (result) {
        // 결과 표시 박스
        const boxWidth = 600;
        const boxHeight = 200;
        const boxX = (this.canvas.width - boxWidth) / 2;
        const boxY = (this.canvas.height - boxHeight) / 2;

        // 반투명 검은색 배경
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // 테두리
        this.ctx.strokeStyle = "#FFD700";
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        // 승자 표시
        this.ctx.font = "bold 32px Arial";
        this.ctx.fillStyle = "#FFD700";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
          result.winner === "player" ? "플레이어 승리!" : "보스 승리!",
          this.canvas.width / 2,
          boxY + 50
        );

        // 플레이어와 보스의 족보 표시
        const playerHand = pokerSystem.calculateHandRank([
          ...result.playerCards,
          ...result.communityCards,
        ]);
        const bossHand = pokerSystem.calculateHandRank([
          ...result.bossCards,
          ...result.communityCards,
        ]);

        const getCardValueText = (value) => {
          switch (value) {
            case 14:
              return "A";
            case 13:
              return "K";
            case 12:
              return "Q";
            case 11:
              return "J";
            default:
              return value.toString();
          }
        };

        this.ctx.font = "24px Arial";
        this.ctx.textAlign = "center";

        // 결과 표시를 가로로 배치
        const centerY = boxY + 100;
        const spacing = 300; // 플레이어와 보스 텍스트 사이 간격

        // 플레이어 결과 (밝은 하늘색으로 변경)
        this.ctx.fillStyle = "#00FFFF";
        this.ctx.fillText(
          `플레이어: ${playerHand.name} (${getCardValueText(
            playerHand.value
          )})`,
          this.canvas.width / 2 - spacing / 2,
          centerY
        );

        // VS 표시
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.fillText("VS", this.canvas.width / 2, centerY);

        // 보스 결과 (밝은 주황색으로 변경)
        this.ctx.fillStyle = "#FFA500";
        this.ctx.fillText(
          `보스: ${bossHand.name} (${getCardValueText(bossHand.value)})`,
          this.canvas.width / 2 + spacing / 2,
          centerY
        );

        // 보스전 시작 버튼
        const buttonWidth = 200;
        const buttonHeight = 40;
        const buttonX = (this.canvas.width - buttonWidth) / 2;
        const buttonY = boxY + boxHeight - 60;

        this.ctx.fillStyle = "#4CAF50";
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
          "보스전 시작",
          buttonX + buttonWidth / 2,
          buttonY + 28
        );

        // 버튼 영역 저장
        this.showdownConfirmButtonArea = {
          x: buttonX,
          y: buttonY,
          width: buttonWidth,
          height: buttonHeight,
        };
      }
    }
  }

  drawBossCard(card, index, isRevealed) {
    const cardWidth = 80;
    const cardHeight = 120;
    const startX = this.canvas.width / 2 - ((cardWidth + 20) * 2) / 2; // 보스는 항상 2장의 카드를 가지므로 2로 고정
    const y = 50;
    const x = startX + index * (cardWidth + 20);

    if (!isRevealed) {
      // 카드 뒷면 이미지 사용
      if (this.cardBackImage.complete) {
        this.ctx.drawImage(this.cardBackImage, x, y, cardWidth, cardHeight);
      }
    } else {
      // 카드 앞면 이미지 사용
      const img = this.getCardImage(card.type, card.number);
      if (img && img.complete) {
        this.ctx.drawImage(img, x, y, cardWidth, cardHeight);
      }
    }
  }

  drawCommunityCards(cards) {
    const cardWidth = 120;
    const cardHeight = 180;
    const cardSpacing = 30;
    const totalWidth = (cardWidth + cardSpacing) * cards.length - cardSpacing;
    const startX = (this.canvas.width - totalWidth) / 2;
    const y = this.canvas.height / 2 - cardHeight / 2;

    cards.forEach((card, index) => {
      const x = startX + (cardWidth + cardSpacing) * index;
      this.drawCard(card, x, y);
    });
  }

  drawPlayerCards(cards) {
    const cardWidth = 120;
    const cardHeight = 180;
    const cardSpacing = 30;
    const totalWidth = (cardWidth + cardSpacing) * cards.length - cardSpacing;
    const startX = (this.canvas.width - totalWidth) / 2;
    const y = this.canvas.height - cardHeight - 50;

    cards.forEach((card, index) => {
      const x = startX + (cardWidth + cardSpacing) * index;
      this.drawCard(card, x, y);
    });
  }

  drawBossCards(cards) {
    const cardWidth = 120;
    const cardHeight = 180;
    const cardSpacing = 30;
    const totalWidth = (cardWidth + cardSpacing) * cards.length - cardSpacing;
    const startX = (this.canvas.width - totalWidth) / 2;
    const y = 50;

    cards.forEach((card, index) => {
      const x = startX + (cardWidth + cardSpacing) * index;
      this.drawCard(card, x, y, true);
    });
  }

  drawCard(card, x, y, isHidden = false) {
    const cardWidth = 120;
    const cardHeight = 180;

    // 카드 배경
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    this.ctx.fillRect(x, y, cardWidth, cardHeight);

    if (!isHidden) {
      // 카드 이미지 표시
      const img = this.getCardImage(card.type, card.number);
      if (img) {
        this.ctx.drawImage(img, x, y, cardWidth, cardHeight);
      }
    } else {
      // 뒷면 표시 (보스 카드)
      this.ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
      this.ctx.fillRect(x, y, cardWidth, cardHeight);
    }

    // 카드 테두리
    this.ctx.strokeStyle = isHidden ? "#666666" : this.getCardColor(card.type);
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, cardWidth, cardHeight);

    if (!isHidden) {
      // 카드 정보 표시
      this.ctx.fillStyle = this.getCardColor(card.type);
      this.ctx.font = "bold 24px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        `${this.getDisplayNumber(card.number)} ${this.getCardSymbol(
          card.type
        )}`,
        x + cardWidth / 2,
        y + cardHeight + 30
      );
    }
  }

  drawStartScreen() {
    // 배경 그라데이션
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "#2c3e50");
    gradient.addColorStop(1, "#3498db");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 게임 제목
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "포커 서바이벌",
      this.canvas.width / 2,
      this.canvas.height / 3
    );

    // 시작 버튼
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = this.canvas.width / 2 - buttonWidth / 2;
    const buttonY = this.canvas.height / 2;

    // 버튼 배경
    this.ctx.fillStyle = "#27ae60";
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    // 버튼 텍스트
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px Arial";
    this.ctx.fillText(
      "게임 시작",
      this.canvas.width / 2,
      buttonY + buttonHeight / 2 + 8
    );

    // 버튼 영역 반환 (클릭 감지용)
    return {
      buttonBounds: {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      },
    };
  }

  drawBossPreviewScreen(communityCards) {
    // 배경 그라데이션
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.85)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 제목
    this.ctx.fillStyle = "#ff4444";
    this.ctx.font = "bold 48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("보스전 시작!", this.canvas.width / 2, 100);

    // 커뮤니티 카드 표시
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px Arial";
    this.ctx.fillText("공용 카드", this.canvas.width / 2, 180);
    this.drawCommunityCards(communityCards);

    // 게임 규칙 설명
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "20px Arial";
    const rules = [
      "- 기본 판돈: 플레이어 30%, 보스 30%",
      "- 레이즈: 10% 또는 20%",
      "- 폴드 시: 플레이어 30% 데미지",
      "- 승리 시: 보스에게 총 배팅의 2/3 데미지",
      "- 패배 시: 총 배팅만큼 데미지",
    ];
    rules.forEach((rule, index) => {
      this.ctx.fillText(rule, this.canvas.width / 2, 500 + index * 30);
    });

    // 계속하기 버튼
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = (this.canvas.width - buttonWidth) / 2;
    const buttonY = this.canvas.height - 100;

    this.ctx.fillStyle = "#27ae60";
    this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "24px Arial";
    this.ctx.fillText("계속하기", this.canvas.width / 2, buttonY + 33);

    // 버튼 영역 저장
    this.continueButtonArea = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    };
  }
}
