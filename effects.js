import { getHighestPokerHand } from "./pokerHands.js";
import { WeaponSystem } from "./weapons.js";

export class Effects {
  constructor() {
    this.resetEffects();
    this.weaponSystem = new WeaponSystem();
  }

  resetEffects() {
    this.effects = {
      spade: {
        count: 0,
        damageIncrease: 0,
        penetrationDamage: 0,
        criticalChance: 0,
        aoeEnabled: false,
        ultimateEndTime: 0,
      },
      heart: {
        count: 0,
        chipDropMultiplier: 1,
        bagSizeIncrease: 0,
        allySpawnChance: 0,
        maxAllies: 0,
        allyPowerUp: false,
        ultimateEndTime: 0,
      },
      diamond: {
        count: 0,
        slowAmount: 0,
        stunDuration: 0,
        aoeSlow: false,
        damageAmplify: 0,
        ultimateEndTime: 0,
      },
      clover: {
        count: 0,
        ricochetChance: 0,
        explosionEnabled: false,
        bounceCount: 0,
        explosionSize: 1,
        ultimateEndTime: 0,
      },
    };
  }

  applyCardEffects(collectedCards) {
    // 각 무늬별 카드 개수 계산
    const cardCounts = {};
    collectedCards.forEach((card) => {
      cardCounts[card.type] = (cardCounts[card.type] || 0) + 1;
    });

    // 효과 초기화
    this.resetEffects();

    // 스페이드 효과 적용
    if (cardCounts.spade >= 1) {
      this.effects.spade.penetrationDamage = 1;
    }
    if (cardCounts.spade >= 2) {
      this.effects.spade.damageIncrease = 0.5;
    }
    if (cardCounts.spade >= 3) {
      this.effects.spade.criticalChance = 0.3;
    }
    if (cardCounts.spade >= 4) {
      this.effects.spade.aoeEnabled = true;
    }
    if (cardCounts.spade >= 5) {
      this.effects.spade.ultimateEndTime = Date.now() + 10000;
    }

    // 하트 효과 적용
    if (cardCounts.heart >= 1) {
      this.effects.heart.chipDropMultiplier = 2;
    }
    if (cardCounts.heart >= 2) {
      this.effects.heart.bagSizeIncrease = 0.2;
    }
    if (cardCounts.heart >= 3) {
      this.effects.heart.allySpawnChance = 0.1;
      this.effects.heart.maxAllies = 2;
    }
    if (cardCounts.heart >= 4) {
      this.effects.heart.allyPowerUp = true;
      this.effects.heart.maxAllies = 4;
    }
    if (cardCounts.heart >= 5) {
      this.effects.heart.chipDropMultiplier = 5;
    }

    // 다이아몬드 효과 적용
    if (cardCounts.diamond >= 1) {
      this.effects.diamond.slowAmount = 0.3;
    }
    if (cardCounts.diamond >= 2) {
      this.effects.diamond.stunDuration = 1000;
    }
    if (cardCounts.diamond >= 3) {
      this.effects.diamond.aoeSlow = true;
    }
    if (cardCounts.diamond >= 4) {
      this.effects.diamond.damageAmplify = 0.3;
    }
    if (cardCounts.diamond >= 5) {
      this.effects.diamond.ultimateEndTime = Date.now() + 5000;
    }

    // 클로버 효과 적용
    if (cardCounts.clover >= 1) {
      this.effects.clover.ricochetChance = 0.3;
    }
    if (cardCounts.clover >= 2) {
      this.effects.clover.explosionEnabled = true;
    }
    if (cardCounts.clover >= 3) {
      this.effects.clover.bounceCount = 5;
    }
    if (cardCounts.clover >= 4) {
      this.effects.clover.explosionSize = 2;
    }
    if (cardCounts.clover >= 5) {
      this.effects.clover.ultimateEndTime = Date.now() + 15000;
    }

    // 카드 개수 저장
    this.effects.spade.count = cardCounts.spade || 0;
    this.effects.heart.count = cardCounts.heart || 0;
    this.effects.diamond.count = cardCounts.diamond || 0;
    this.effects.clover.count = cardCounts.clover || 0;

    // 족보 판정 및 무기 업데이트
    const pokerHand = getHighestPokerHand(collectedCards);
    const weaponChanged = this.weaponSystem.updateWeapon(pokerHand);

    return {
      effects: this.effects,
      weaponChanged,
      currentWeapon: this.weaponSystem.getCurrentWeapon(),
    };
  }

  getEffects() {
    return {
      ...this.effects,
      currentWeapon: this.weaponSystem.getCurrentWeapon(),
    };
  }
}
