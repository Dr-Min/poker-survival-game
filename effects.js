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
        ultimateEndTime: 0,
        allyConversionEnabled: false,
        guaranteedDropChance: 0,
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

    // 하트 효과 적용 (중첩되도록 수정)
    if (cardCounts.heart >= 1) {
      this.effects.heart.chipDropMultiplier = 2;
    }
    if (cardCounts.heart >= 2) {
      this.effects.heart.bagSizeIncrease = 0.2;
    }
    if (cardCounts.heart >= 3) {
      // 3개 이상일 때 아군 변환 효과 추가 (실제 변환은 bullet.js에서 처리)
      this.effects.heart.allyConversionEnabled = true;
    }
    if (cardCounts.heart >= 5) {
      // 5개 이상일 때는 칩 드랍 배수를 5로 증가시키고 50% 확률로 드랍하도록 설정
      this.effects.heart.chipDropMultiplier = 5;
      this.effects.heart.guaranteedDropChance = 0.5; // 50% 확률로 칩 드랍
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

  createEffectsDescription() {
    let description = "";

    // 하트 효과 설명
    if (this.effects.heart.count > 0) {
      description +=
        `❤️ ${this.effects.heart.count}개: ` +
        `칩 드랍 확률 ${this.effects.heart.chipDropMultiplier}배 증가\n`;

      if (this.effects.heart.count >= 3) {
        description += "❤️ 3개 이상: 적이 총알에 맞을 때 5% 확률로 아군으로 변환\n";
      }

      if (this.effects.heart.count >= 5) {
        description += "❤️ 5개 이상: 50% 확률로 칩 드랍\n";
      }
    }

    // 스페이드 효과 설명
    if (this.effects.spade.count > 0) {
      description += `♠️ ${this.effects.spade.count}개: `;
      
      if (this.effects.spade.penetrationDamage > 0) {
        description += `관통 데미지 +${this.effects.spade.penetrationDamage} `;
      }
      
      if (this.effects.spade.damageIncrease > 0) {
        description += `데미지 ${this.effects.spade.damageIncrease * 100}% 증가 `;
      }
      
      if (this.effects.spade.criticalChance > 0) {
        description += `크리티컬 확률 ${this.effects.spade.criticalChance * 100}% `;
      }
      
      if (this.effects.spade.aoeEnabled) {
        description += `범위 공격 활성화 `;
      }
      
      description += "\n";
    }

    // 다이아몬드 효과 설명
    if (this.effects.diamond.count > 0) {
      description += `♦️ ${this.effects.diamond.count}개: `;
      
      if (this.effects.diamond.slowAmount > 0) {
        description += `슬로우 ${this.effects.diamond.slowAmount * 100}% `;
      }
      
      if (this.effects.diamond.stunDuration > 0) {
        description += `스턴 ${this.effects.diamond.stunDuration / 1000}초 `;
      }
      
      if (this.effects.diamond.aoeSlow) {
        description += `범위 슬로우 `;
      }
      
      if (this.effects.diamond.damageAmplify > 0) {
        description += `데미지 증폭 ${this.effects.diamond.damageAmplify * 100}% `;
      }
      
      description += "\n";
    }

    // 클로버 효과 설명
    if (this.effects.clover.count > 0) {
      description += `♣️ ${this.effects.clover.count}개: `;
      
      if (this.effects.clover.ricochetChance > 0) {
        description += `튕김 확률 ${this.effects.clover.ricochetChance * 100}% `;
      }
      
      if (this.effects.clover.explosionEnabled) {
        description += `폭발 활성화 `;
      }
      
      if (this.effects.clover.bounceCount > 0) {
        description += `튕김 횟수 +${this.effects.clover.bounceCount} `;
      }
      
      if (this.effects.clover.explosionSize > 1) {
        description += `폭발 크기 x${this.effects.clover.explosionSize} `;
      }
      
      description += "\n";
    }
    
    return description;
  }
}
