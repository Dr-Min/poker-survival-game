export class PokerSystem {
  constructor() {
    this.communityCards = [];
    this.playerCards = [];
    this.bossCards = [];
    this.pot = {
      player: 0,
      boss: 0,
    };
    this.gameResult = null; // 게임 결과 저장
    this.showdownStartTime = null; // 추가
  }

  // 족보 계산
  calculateHandRank(cards) {
    // 에이스(1)를 14로 변환
    const processedCards = cards.map((card) => ({
      ...card,
      number: card.number === 1 ? 14 : card.number,
    }));

    // 카드 정렬 (숫자 기준)
    const sortedCards = [...processedCards].sort((a, b) => b.number - a.number);

    // 숫자별 카드 개수 계산
    const numberCount = {};
    sortedCards.forEach((card) => {
      numberCount[card.number] = (numberCount[card.number] || 0) + 1;
    });

    // 무늬별 카드 개수 계산
    const typeCount = {};
    sortedCards.forEach((card) => {
      typeCount[card.type] = (typeCount[card.type] || 0) + 1;
    });

    // 스트레이트 체크
    const numbers = [...new Set(sortedCards.map((card) => card.number))].sort(
      (a, b) => b - a
    );
    let isStraight = false;
    for (let i = 0; i < numbers.length - 4; i++) {
      if (numbers[i] - numbers[i + 4] === 4) {
        isStraight = true;
        break;
      }
    }
    // A-5 스트레이트 체크 (14,5,4,3,2)
    if (
      !isStraight &&
      numbers.includes(14) &&
      numbers.includes(2) &&
      numbers.includes(3) &&
      numbers.includes(4) &&
      numbers.includes(5)
    ) {
      isStraight = true;
    }

    // 플러시 체크
    const isFlush = Object.values(typeCount).some((count) => count >= 5);

    // 족보 판정
    const pairs = Object.values(numberCount).filter(
      (count) => count === 2
    ).length;
    const hasThreeOfAKind = Object.values(numberCount).some(
      (count) => count === 3
    );
    const hasFourOfAKind = Object.values(numberCount).some(
      (count) => count === 4
    );

    // 페어나 트리플의 숫자 찾기
    const getPairNumber = () => {
      return Number(
        Object.entries(numberCount).find(([num, count]) => count === 2)?.[0]
      );
    };

    const getThreeOfAKindNumber = () => {
      return Number(
        Object.entries(numberCount).find(([num, count]) => count === 3)?.[0]
      );
    };

    const getFourOfAKindNumber = () => {
      return Number(
        Object.entries(numberCount).find(([num, count]) => count === 4)?.[0]
      );
    };

    // 점수 계산 (높은 순)
    if (isStraight && isFlush)
      return {
        rank: 8,
        name: "스트레이트 플러시",
        value: Math.max(...numbers),
      };
    if (hasFourOfAKind)
      return { rank: 7, name: "포카드", value: getFourOfAKindNumber() };
    if (hasThreeOfAKind && pairs === 1)
      return { rank: 6, name: "풀하우스", value: getThreeOfAKindNumber() };
    if (isFlush)
      return { rank: 5, name: "플러시", value: Math.max(...numbers) };
    if (isStraight)
      return { rank: 4, name: "스트레이트", value: Math.max(...numbers) };
    if (hasThreeOfAKind)
      return { rank: 3, name: "트리플", value: getThreeOfAKindNumber() };
    if (pairs === 2) {
      const pairNumbers = Object.entries(numberCount)
        .filter(([_, count]) => count === 2)
        .map(([num, _]) => Number(num))
        .sort((a, b) => b - a);
      return { rank: 2, name: "투페어", value: Math.max(...pairNumbers) };
    }
    if (pairs === 1) return { rank: 1, name: "원페어", value: getPairNumber() };
    return { rank: 0, name: "하이카드", value: Math.max(...numbers) };
  }

  // 라운드 시작 전 플레이어 카드 선택
  selectPlayerCards(availableCards, count = 2) {
    if (availableCards.length < count) {
      // 카드가 부족한 경우 랜덤 카드 생성
      const needed = count - availableCards.length;
      const randomCards = this.generateRandomCards(needed);
      return [...availableCards, ...randomCards];
    }
    return availableCards.slice(0, count);
  }

  // 커뮤니티 카드 생성
  generateCommunityCards(count = 3) {
    this.communityCards = this.generateRandomCards(count);
    return this.communityCards;
  }

  // 보스 카드 생성
  generateBossCards(count = 2) {
    this.bossCards = this.generateRandomCards(count);

    // 보스 카드 정보 로깅
    console.log(
      "보스 카드 생성:",
      this.bossCards
        .map((card) => {
          const typeSymbols = {
            spade: "♠",
            heart: "♥",
            diamond: "♦",
            clover: "♣",
          };
          return `${typeSymbols[card.type]}${card.number}`;
        })
        .join(", ")
    );

    return this.bossCards;
  }

  // 랜덤 카드 생성
  generateRandomCards(count) {
    const types = ["spade", "heart", "diamond", "clover"];
    const cards = [];
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const number = Math.floor(Math.random() * 13) + 1;
      cards.push({ type, number });
    }
    return cards;
  }

  // 베팅 처리
  placeBet(player, amount) {
    this.pot[player] += amount;
    return this.pot[player];
  }

  // 승자 판정 (수정)
  determineWinner() {
    const playerHand = this.calculateHandRank([
      ...this.playerCards,
      ...this.communityCards,
    ]);
    const bossHand = this.calculateHandRank([
      ...this.bossCards,
      ...this.communityCards,
    ]);

    // 족보 순위가 다른 경우
    if (playerHand.rank > bossHand.rank) return "player";
    if (bossHand.rank > playerHand.rank) return "boss";

    // 족보가 같은 경우 value로 비교
    if (playerHand.value > bossHand.value) return "player";
    if (bossHand.value > playerHand.value) return "boss";

    // value까지 같은 경우 (매우 드문 경우) 플레이어 승리
    return "player";
  }

  // 폴드 처리
  handleFold(player, playerHealth, bossHealth) {
    if (player === "player") {
      return {
        playerDamage: playerHealth * 0.3,
        bossDamage: 0,
      };
    } else {
      return {
        playerDamage: 0,
        bossDamage: bossHealth * 0.2,
      };
    }
  }

  // 레이즈 처리
  handleRaise(amount, playerHealth, bossHealth) {
    const playerRaise = amount;
    const bossRaise = amount * (2 / 3); // 보스는 플레이어의 2/3 비율로 베팅

    return {
      playerBet: playerHealth * (playerRaise / 100),
      bossBet: bossHealth * (bossRaise / 100),
    };
  }

  // 게임 결과 저장
  saveGameResult() {
    this.showdownStartTime = Date.now(); // 추가
    this.gameResult = {
      communityCards: [...this.communityCards],
      playerCards: [...this.playerCards],
      bossCards: [...this.bossCards],
      winner: this.determineWinner(),
      finalPot: { ...this.pot },
    };
    return this.gameResult;
  }

  // 저장된 게임 결과 가져오기
  getGameResult() {
    return this.gameResult;
  }

  // 게임 초기화
  resetGame() {
    this.communityCards = [];
    this.playerCards = [];
    this.bossCards = [];
    this.pot = {
      player: 0,
      boss: 0,
    };
    this.gameResult = null;
    this.showdownStartTime = null; // 추가
  }
}
