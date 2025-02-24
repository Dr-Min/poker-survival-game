import { POKER_HANDS } from "./pokerHands.js";

// 무기 정보 정의
export const WEAPONS = {
  [POKER_HANDS.HIGH_CARD]: {
    name: "리볼버",
    damage: 10,
    description: "기본 단발 공격",
  },
  [POKER_HANDS.ONE_PAIR]: {
    name: "듀얼 리볼버",
    damage: 20,
    description: "양손 권총으로 2발 발사",
  },
  [POKER_HANDS.TWO_PAIR]: {
    name: "더블 듀얼 리볼버",
    damage: 30,
    description: "양손 권총으로 4발 발사",
  },
  [POKER_HANDS.THREE_OF_A_KIND]: {
    name: "트리플 샷건",
    damage: 40,
    description: "3갈래 산탄 발사",
  },
  [POKER_HANDS.STRAIGHT]: {
    name: "레이저 레일건",
    damage: 50,
    description: "관통하는 레이저 발사",
  },
  [POKER_HANDS.FLUSH]: {
    name: "플라즈마 캐논",
    damage: 70,
    description: "강력한 플라즈마 구체 발사",
  },
  [POKER_HANDS.FULL_HOUSE]: {
    name: "샷건+권총 콤보",
    damage: 60,
    description: "산탄과 정확한 단발을 동시에 발사",
  },
  [POKER_HANDS.FOUR_OF_A_KIND]: {
    name: "4연발 로켓런처",
    damage: 80,
    description: "4발의 로켓 연속 발사",
  },
  [POKER_HANDS.STRAIGHT_FLUSH]: {
    name: "레이저 게이트링건",
    damage: 90,
    description: "고속 레이저 연속 발사",
  },
  [POKER_HANDS.ROYAL_STRAIGHT_FLUSH]: {
    name: "오비탈 레이저 스트라이크",
    damage: 100,
    description: "전방위 레이저 공격",
  },
};

export class WeaponSystem {
  constructor() {
    this.currentWeapon = WEAPONS[POKER_HANDS.HIGH_CARD];
  }

  // 족보에 따른 무기 변경
  updateWeapon(pokerHand) {
    const newWeapon = WEAPONS[pokerHand];
    if (newWeapon && this.currentWeapon.name !== newWeapon.name) {
      this.currentWeapon = newWeapon;
      return true; // 무기가 변경됨
    }
    return false; // 무기가 변경되지 않음
  }

  // 현재 무기 정보 반환
  getCurrentWeapon() {
    return this.currentWeapon;
  }

  // 무기 데미지 계산 (효과 포함)
  calculateDamage(effects = {}) {
    let damage = this.currentWeapon.damage;

    // 스페이드 효과로 인한 데미지 증가
    if (effects.spade) {
      if (effects.spade.count >= 1) damage *= 1.25;
      if (effects.spade.count >= 2) damage *= 1.15;
    }

    return damage;
  }
}
