import {
  getCardColor,
  getDisplayNumber,
  getFileNumber,
  checkCollision,
} from "./utils.js";

export class Card {
  constructor(type, number, x, y) {
    this.type = type;
    this.number = number;
    this.x = x;
    this.y = y;
    this.size = 20;
    this.createdAt = Date.now();
    this.blinkStart = Date.now() + 5000;
  }

  draw(ctx, cardImages) {
    const now = Date.now();
    // 5초 이후부터 깜빡임 효과
    if (now - this.createdAt > 5000) {
      // 250ms 간격으로 깜빡임
      if (Math.floor((now - this.createdAt) / 250) % 2 === 0) {
        this.drawCardSymbol(ctx, cardImages);
      }
    } else {
      this.drawCardSymbol(ctx, cardImages);
    }
  }

  drawCardSymbol(ctx, cardImages) {
    const img = cardImages[this.type][this.number];
    if (img) {
      // 이미지의 원본 비율 유지
      const imgWidth = img.width;
      const imgHeight = img.height;
      const scale = Math.min(
        (this.size * 2) / imgWidth,
        (this.size * 2) / imgHeight
      );
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      ctx.drawImage(
        img,
        this.x - drawWidth / 2,
        this.y - drawHeight / 2,
        drawWidth,
        drawHeight
      );

      // 카드 문양과 숫자 표시
      ctx.fillStyle = getCardColor(this.type);
      ctx.font = `${this.size}px Arial`;
      ctx.textAlign = "center";

      // 문양 이모티콘 선택
      let symbol = "";
      switch (this.type) {
        case "spade":
          symbol = "♠";
          break;
        case "heart":
          symbol = "♥";
          break;
        case "diamond":
          symbol = "♦";
          break;
        case "clover":
          symbol = "♣";
          break;
      }

      // 문양과 숫자 그리기
      ctx.fillText(
        `${symbol} ${getDisplayNumber(this.number)}`,
        this.x,
        this.y - drawHeight / 2 - 5
      );
    }
  }
}

export class CardManager {
  constructor() {
    this.cards = [];
    this.collectedCards = [];
    this.chipDrops = [];
    this.cardImages = {
      spade: {},
      heart: {},
      diamond: {},
      clover: {},
    };
    this.loadCardImages();
    
    // 플레이어 근처에 있는 카드 추적용 변수 추가
    this.nearbyCard = null;
  }

  async loadCardImages() {
    const imagePromises = [];
    ["spade", "heart", "diamond", "clover"].forEach((type) => {
      for (let i = 1; i <= 13; i++) {
        const img = new Image();
        const promise = new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => {
            console.log(`이미지 로드 실패: ${type} ${i}`);
            resolve();
          };
        });
        const fileNumber = getFileNumber(type, i);
        img.src = `V2_4x/PixelPlebes_V2_4x__${fileNumber}.png`;
        this.cardImages[type][i] = img;
        imagePromises.push(promise);
      }
    });

    await Promise.all(imagePromises);
    console.log("카드 이미지 로드 완료");
  }

  createCard(type, number, x = 0, y = 0) {
    return new Card(type, number, x, y);
  }

  spawnCard(x, y) {
    if (Math.random() < 0.2) {
      const types = ["spade", "heart", "diamond", "clover"];
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
      const cardType = types[Math.floor(Math.random() * types.length)];
      const cardNumber = numbers[Math.floor(Math.random() * numbers.length)];

      this.cards.push(this.createCard(cardType, cardNumber, x, y));
    }
  }

  createChipDrop(x, y, amount) {
    console.log(`칩 드랍 생성: 위치(${x}, ${y}), 개수: ${amount}`);
    this.chipDrops.push({
      x,
      y,
      amount: Math.round(amount),
      size: 7.5,
      collected: false,
      createdAt: Date.now(),
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
    });
  }

  updateChipDrops(player) {
    // console.log(`칩 드랍 업데이트: 현재 칩 개수: ${this.chipDrops.length}`);
    for (let i = this.chipDrops.length - 1; i >= 0; i--) {
      const chip = this.chipDrops[i];
      
      if (Date.now() - chip.createdAt < 500) {
        chip.x += chip.dx;
        chip.y += chip.dy;
        chip.dx *= 0.9;
        chip.dy *= 0.9;
      } else {
        const dx = player.x - chip.x;
        const dy = player.y - chip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          const speed = 0.1 + (1 - distance / 150) * 0.3;
          chip.x += dx * speed;
          chip.y += dy * speed;
        }
      }

      const dx = player.x - chip.x;
      const dy = player.y - chip.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < player.size + chip.size) {
        console.log(`칩 획득: ${chip.amount}개`);
        player.heal(Math.round(chip.amount));
        this.chipDrops.splice(i, 1);
      }
    }
  }

  drawChipDrops(ctx) {
    for (const chip of this.chipDrops) {
      // 그림자 효과
      ctx.beginPath();
      ctx.arc(chip.x + 2, chip.y + 2, chip.size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fill();

      // 칩 외부 테두리
      ctx.beginPath();
      ctx.arc(chip.x, chip.y, chip.size, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD700";
      ctx.fill();
      ctx.strokeStyle = "#B8860B";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 칩 내부 원
      ctx.beginPath();
      ctx.arc(chip.x, chip.y, chip.size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "#DAA520";
      ctx.fill();

      // 칩 장식 패턴
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const x = chip.x + Math.cos(angle) * (chip.size * 0.6);
        const y = chip.y + Math.sin(angle) * (chip.size * 0.6);
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD700";
        ctx.fill();
      }

      // 칩 수량 텍스트
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // 텍스트 테두리
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeText(chip.amount.toString(), chip.x, chip.y);
      
      // 텍스트
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(chip.amount.toString(), chip.x, chip.y);
    }
  }

  updateCards(player, effects) {
    const now = Date.now();
    
    // 근처 카드 초기화
    this.nearbyCard = null;
    
    this.cards = this.cards.filter((card) => {
      if (now - card.createdAt > 7000) {
        return false;
      }

      // 충돌 체크하여 근처에 있는 카드로 표시만 하고 수집하지 않음
      if (checkCollision(player, card)) {
        this.nearbyCard = card;
      }
      return true;
    });

    this.updateChipDrops(player);
  }

  collectCard(type, number) {
    this.collectedCards.push({ type, number });
    if (this.collectedCards.length > 5) {
      this.collectedCards.shift();
      return true;
    }
    return false;
  }

  drawCards(ctx) {
    this.cards.forEach((card) => {
      card.draw(ctx, this.cardImages);
      
      // 근처에 있는 카드에 시각적 표시 추가
      if (card === this.nearbyCard) {
        ctx.beginPath();
        ctx.arc(card.x, card.y, card.size * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 'E' 키 안내 텍스트 추가
        ctx.font = "12px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("[E] 획득", card.x, card.y - card.size * 2);
      }
    });
    this.drawChipDrops(ctx);
  }

  getCollectedCards() {
    return this.collectedCards;
  }

  clearCards() {
    this.collectedCards = [];
    this.cards = [];
  }

  // E키를 눌렀을 때 근처 카드 수집 메서드 추가
  collectNearbyCard() {
    if (this.nearbyCard) {
      this.collectCard(this.nearbyCard.type, this.nearbyCard.number);
      this.cards = this.cards.filter(card => card !== this.nearbyCard);
      this.nearbyCard = null;
      return true;
    }
    return false;
  }
}
