// 포커 족보 타입 정의
export const POKER_HANDS = {
  ROYAL_STRAIGHT_FLUSH: "royalStraightFlush",
  STRAIGHT_FLUSH: "straightFlush",
  FOUR_OF_A_KIND: "fourOfAKind",
  FULL_HOUSE: "fullHouse",
  FLUSH: "flush",
  STRAIGHT: "straight",
  THREE_OF_A_KIND: "threeOfAKind",
  TWO_PAIR: "twoPair",
  ONE_PAIR: "onePair",
  HIGH_CARD: "highCard",
};

// 카드 정렬 함수
const sortCards = (cards) => {
  return [...cards].sort((a, b) => a.number - b.number);
};

// 같은 무늬 체크
const isSameType = (cards) => {
  if (cards.length === 0) return false;
  const firstType = cards[0].type;
  return cards.every((card) => card.type === firstType);
};

// 스트레이트 체크
const isStraight = (cards) => {
  if (cards.length < 5) return false;
  const sortedCards = sortCards(cards);

  // A,10,J,Q,K 체크
  if (
    sortedCards[0].number === 1 &&
    sortedCards[sortedCards.length - 4].number === 10
  ) {
    return true;
  }

  // 일반적인 스트레이트 체크
  for (let i = 0; i < sortedCards.length - 1; i++) {
    if (sortedCards[i + 1].number - sortedCards[i].number !== 1) {
      return false;
    }
  }
  return true;
};

// 각 족보 판정 함수들
export const checkRoyalStraightFlush = (cards) => {
  if (cards.length < 5) return false;
  const sortedCards = sortCards(cards);
  return (
    isSameType(cards) &&
    sortedCards[0].number === 1 &&
    sortedCards[sortedCards.length - 4].number === 10
  );
};

export const checkStraightFlush = (cards) => {
  if (cards.length < 5) return false;
  return isSameType(cards) && isStraight(cards);
};

export const checkFourOfAKind = (cards) => {
  if (cards.length < 4) return false;
  const numberCount = new Map();
  cards.forEach((card) => {
    numberCount.set(card.number, (numberCount.get(card.number) || 0) + 1);
  });
  return Array.from(numberCount.values()).some((count) => count >= 4);
};

export const checkFullHouse = (cards) => {
  if (cards.length < 5) return false;
  const numberCount = new Map();
  cards.forEach((card) => {
    numberCount.set(card.number, (numberCount.get(card.number) || 0) + 1);
  });
  const counts = Array.from(numberCount.values());
  return counts.includes(3) && counts.includes(2);
};

export const checkFlush = (cards) => {
  if (cards.length < 5) return false;
  return isSameType(cards);
};

export const checkStraight = (cards) => {
  if (cards.length < 5) return false;
  return isStraight(cards);
};

export const checkThreeOfAKind = (cards) => {
  if (cards.length < 3) return false;
  const numberCount = new Map();
  cards.forEach((card) => {
    numberCount.set(card.number, (numberCount.get(card.number) || 0) + 1);
  });
  return Array.from(numberCount.values()).some((count) => count >= 3);
};

export const checkTwoPair = (cards) => {
  if (cards.length < 4) return false;
  const numberCount = new Map();
  cards.forEach((card) => {
    numberCount.set(card.number, (numberCount.get(card.number) || 0) + 1);
  });
  const pairs = Array.from(numberCount.values()).filter((count) => count >= 2);
  return pairs.length >= 2;
};

export const checkOnePair = (cards) => {
  if (cards.length < 2) return false;
  const numberCount = new Map();
  cards.forEach((card) => {
    numberCount.set(card.number, (numberCount.get(card.number) || 0) + 1);
  });
  return Array.from(numberCount.values()).some((count) => count >= 2);
};

// 최고 족보 판정
export const getHighestPokerHand = (cards) => {
  if (checkRoyalStraightFlush(cards)) return POKER_HANDS.ROYAL_STRAIGHT_FLUSH;
  if (checkStraightFlush(cards)) return POKER_HANDS.STRAIGHT_FLUSH;
  if (checkFourOfAKind(cards)) return POKER_HANDS.FOUR_OF_A_KIND;
  if (checkFullHouse(cards)) return POKER_HANDS.FULL_HOUSE;
  if (checkFlush(cards)) return POKER_HANDS.FLUSH;
  if (checkStraight(cards)) return POKER_HANDS.STRAIGHT;
  if (checkThreeOfAKind(cards)) return POKER_HANDS.THREE_OF_A_KIND;
  if (checkTwoPair(cards)) return POKER_HANDS.TWO_PAIR;
  if (checkOnePair(cards)) return POKER_HANDS.ONE_PAIR;
  return POKER_HANDS.HIGH_CARD;
};
