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
    this.cardImages = {
      spade: {},
      heart: {},
      diamond: {},
      clover: {},
    };
    this.loadCardImages();
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

  updateCards(player, effects) {
    const now = Date.now();
    this.cards = this.cards.filter((card) => {
      // 7초가 지난 카드는 제거
      if (now - card.createdAt > 7000) {
        return false;
      }

      if (checkCollision(player, card)) {
        this.collectCard(card.type, card.number);
        return false;
      }
      return true;
    });
  }

  collectCard(type, number) {
    this.collectedCards.push({ type, number });
    if (this.collectedCards.length > 5) {
      // 가장 먼저 들어온 카드를 제거 (FIFO)
      this.collectedCards.shift();
      return true; // 카드가 교체되었음을 알림
    }
    return false; // 카드가 교체되지 않음
  }

  drawCards(ctx) {
    this.cards.forEach((card) => card.draw(ctx, this.cardImages));
  }

  getCollectedCards() {
    return this.collectedCards;
  }
}
