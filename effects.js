import { getHighestPokerHand } from "./pokerHands.js";
import { WeaponSystem } from "./weapons.js";

export class Effects {
  constructor() {
    this.resetEffects();
    this.weaponSystem = new WeaponSystem();
  }

  resetEffects() {
    console.log("효과 초기화 실행");

    this.effects = {
      spade: {
        count: 0,
        damageIncrease: 0,
        penetrationDamage: 0,
        criticalChance: 0,
        aoeEnabled: false,
        ultimateEndTime: 0,
        orbitingCardsEnabled: false,
        orbitingCardsCount: 0,
        orbitingCardSpeedBoost: 1,
        orbitingCardDamageBoost: 1,
      },
      heart: {
        count: 0,
        chipDropMultiplier: 1,
        bagSizeIncrease: 0,
        ultimateEndTime: 0,
        allyConversionEnabled: false,
        allyConversionChance: 0.05,
        allyFullHealthEnabled: false,
        allyDamageBoost: 1,
        guaranteedDropChance: 0,
        maxAllies: 0,
      },
      diamond: {
        count: 0,
        slowAmount: 0,
        stunDuration: 0,
        damageAmplify: 0,
        playerAuraEnabled: false,
        playerAuraRadius: 0,
        playerAuraSlowAmount: 0,
        freezeEnabled: false,
        globalFreezeEnabled: false,
        globalFreezeDuration: 1500,
        globalFreezeInterval: 5000,
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

    // 카드 카운트 디버그 로그
    console.log("적용된 카드:", cardCounts);

    // 스페이드 효과 적용
    if (cardCounts.spade >= 1) {
      // 스페이드 1개일 때 데미지 증가 효과만 적용
      this.effects.spade.damageIncrease = 0.5;
    }
    if (cardCounts.spade >= 2) {
      this.effects.spade.penetrationDamage = 1; // 2개 이상일 때 관통 효과 적용
    }
    if (cardCounts.spade >= 3) {
      this.effects.spade.criticalChance = 0.3;
    }
    if (cardCounts.spade >= 4) {
      // 스페이드 4개 이상일 때 플레이어 주변을 도는 카드 활성화
      this.effects.spade.orbitingCardsEnabled = true;
      this.effects.spade.orbitingCardsCount = 4; // 4개의 카드 (실제 수집한 카드)
    }
    if (cardCounts.spade >= 5) {
      // 5개 이상일 때 회전 카드 강화
      this.effects.spade.orbitingCardsCount = 5; // 5개 카드로 증가
      this.effects.spade.orbitingCardSpeedBoost = 1.2; // 회전 속도 20% 증가
      this.effects.spade.orbitingCardDamageBoost = 1.5; // 회전 카드 데미지 50% 증가
      this.effects.spade.criticalChance = 0.5; // 치명타 확률 50%로 증가
      console.log(
        "스페이드 5개 이상: 회전 카드 강화 - 5개로 증가, 속도 20% 증가, 데미지 50% 증가, 치명타 확률 50%"
      );
      this.effects.spade.ultimateEndTime = Date.now() + 10000;
    }

    // 하트 효과 적용 (중첩되도록 수정)
    if (cardCounts.heart >= 1) {
      this.effects.heart.chipDropMultiplier = 2;
    }
    if (cardCounts.heart >= 2) {
      // 비율 대신 고정값 50으로 변경
      this.effects.heart.bagSizeIncrease = 50;
      console.log("하트 2개 이상: 주머니 크기 고정값 50 증가 설정됨");
    }
    if (cardCounts.heart >= 3) {
      // 3개 이상일 때 아군 변환 효과 추가 (실제 변환은 bullet.js에서 처리)
      this.effects.heart.allyConversionEnabled = true;
      this.effects.heart.allyConversionChance = 0.05;
      this.effects.heart.maxAllies = 3;
    }
    if (cardCounts.heart >= 4) {
      // 4개 이상일 때 아군 강화 효과
      this.effects.heart.allyConversionChance = 0.1;
      this.effects.heart.allyFullHealthEnabled = true;
      this.effects.heart.allyDamageBoost = 1.2;
      this.effects.heart.maxAllies = 4;
    }
    if (cardCounts.heart >= 5) {
      // 5개 이상일 때는 칩 드랍 배수를 5로 증가시키고 50% 확률로 드랍하도록 설정
      this.effects.heart.chipDropMultiplier = 5;
      this.effects.heart.guaranteedDropChance = 0.5; // 50% 확률로 칩 드랍
      this.effects.heart.maxAllies = 5;
    }

    // 다이아몬드 효과 적용
    if (cardCounts.diamond >= 1) {
      this.effects.diamond.slowAmount = 0.3;
    }
    if (cardCounts.diamond >= 2) {
      this.effects.diamond.stunDuration = 1000;
    }
    if (cardCounts.diamond >= 3) {
      this.effects.diamond.playerAuraEnabled = true;
      this.effects.diamond.playerAuraRadius = 150;
      this.effects.diamond.playerAuraSlowAmount = 0.6;
    }
    if (cardCounts.diamond >= 4) {
      this.effects.diamond.freezeEnabled = true;
    }
    if (cardCounts.diamond >= 5) {
      this.effects.diamond.globalFreezeEnabled = true;
      console.log("다이아몬드 5개 효과 활성화: 5초마다 모든 적 1.5초간 정지");
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

      if (this.effects.heart.count >= 2) {
        description += `❤️ 2개 이상: 칩 주머니 크기 +50 증가\n`;
      }

      if (this.effects.heart.count >= 3) {
        description += `❤️ 3개 이상: 적이 총알에 맞을 때 ${
          this.effects.heart.allyConversionChance * 100
        }% 확률로 아군으로 변환 (최대 ${this.effects.heart.maxAllies}명)\n`;
      }

      if (this.effects.heart.count >= 4) {
        description +=
          "❤️ 4개 이상: 아군으로 변환 시 체력 100%, 공격력 120% 증가 (최대 4명)\n";
      }

      if (this.effects.heart.count >= 5) {
        description += "❤️ 5개 이상: 50% 확률로 칩 드랍 (최대 5명 아군)\n";
      }
    }

    // 스페이드 효과 설명
    if (this.effects.spade.count > 0) {
      description += `♠️ ${this.effects.spade.count}개: `;

      if (this.effects.spade.count == 1) {
        description += `데미지 ${
          this.effects.spade.damageIncrease * 100
        }% 증가 `;
      }

      if (this.effects.spade.penetrationDamage > 0) {
        description += `관통 데미지 +${this.effects.spade.penetrationDamage} `;
      }

      if (this.effects.spade.damageIncrease > 0) {
        description += `데미지 ${
          this.effects.spade.damageIncrease * 100
        }% 증가 `;
      }

      if (this.effects.spade.criticalChance > 0) {
        description += `크리티컬 확률 ${
          this.effects.spade.criticalChance * 100
        }% `;
      }

      if (this.effects.spade.orbitingCardsEnabled) {
        description += `회전 카드 활성화 (${this.effects.spade.orbitingCardsCount}장의 스페이드 카드가 적을 공격) `;
      }

      description += "\n";
    }

    // 다이아몬드 효과 설명
    if (this.effects.diamond.count === 1) {
      description += "다이아: 맞은 적 30% 감속 / ";
    } else if (this.effects.diamond.count === 2) {
      description += "다이아: 맞은 적 30% 감속 + 1초 기절 / ";
    } else if (this.effects.diamond.count === 3) {
      description += `다이아: 맞은 적 30% 감속 + 1초 기절 + 플레이어 주변 ${
        this.effects.diamond.playerAuraRadius
      }픽셀 내 적 ${this.effects.diamond.playerAuraSlowAmount * 100}% 감속 / `;
    } else if (this.effects.diamond.count === 4) {
      description += `다이아: 맞은 적 30% 감속 + 1초 기절 + 플레이어 주변 ${
        this.effects.diamond.playerAuraRadius
      }픽셀 내 적 ${
        this.effects.diamond.playerAuraSlowAmount * 100
      }% 감속 + 4초마다 주변 적 완전 정지 / `;
    } else if (this.effects.diamond.count >= 5) {
      description += `다이아: 맞은 적 30% 감속 + 1초 기절 + 플레이어 주변 ${
        this.effects.diamond.playerAuraRadius
      }픽셀 내 적 ${
        this.effects.diamond.playerAuraSlowAmount * 100
      }% 감속 + 4초마다 주변 적 완전 정지 + 5초마다 모든 적 1.5초간 정지 / `;
    } else {
      description += "다이아: 없음 / ";
    }

    // 클로버 효과 설명
    if (this.effects.clover.count > 0) {
      description += `♣️ ${this.effects.clover.count}개: `;

      if (this.effects.clover.ricochetChance > 0) {
        description += `튕김 확률 ${
          this.effects.clover.ricochetChance * 100
        }% `;
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
