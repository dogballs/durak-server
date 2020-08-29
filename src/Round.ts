import { Card, CardDto } from './Card';
import * as config from './config';

export interface RoundDto {
  attackCards: CardDto[];
  defenceCards: CardDto[];
}

export class Round {
  private trumpCard: Card = null;
  private attackCards: Card[] = [];
  private defenceCards: Card[] = [];
  private maxCards: number = config.ROUND_MAX_CARDS;

  reset(trumpCard: Card, maxCards: number): void {
    this.trumpCard = trumpCard;
    this.attackCards = [];
    this.defenceCards = [];
    this.maxCards = maxCards;
  }

  clear(): void {
    this.trumpCard = null;
    this.attackCards = [];
    this.defenceCards = [];
    this.maxCards = config.ROUND_FIRST_MAX_CARDS;
  }

  attack(attackCard: Card): boolean {
    if (this.attackCards.length >= this.maxCards) {
      return false;
    }

    if (this.attackCards.length === 0) {
      this.attackCards.push(attackCard);
      return true;
    }

    // Attackers can only play cards which ranks are present in the round
    let hasSameRank = false;
    this.attackCards.forEach((card) => {
      if (attackCard.isSameRank(card)) {
        hasSameRank = true;
      }
    });
    this.defenceCards.forEach((card) => {
      if (attackCard.isSameRank(card)) {
        hasSameRank = true;
      }
    });

    if (!hasSameRank) {
      return false;
    }

    this.attackCards.push(attackCard);

    return true;
  }

  defend(defenceCard: Card): boolean {
    const attackCard = this.attackCards[this.attackCards.length - 1];
    if (attackCard === undefined) {
      return false;
    }

    const isAttackTrump = attackCard.isSameSuite(this.trumpCard);
    const isDefenceTrump = defenceCard.isSameSuite(this.trumpCard);
    const isDefenceHigherRank = defenceCard.isHigherRankThan(attackCard);
    const areSameSuite = defenceCard.isSameSuite(attackCard);

    const isTrumpOverNormal = isDefenceTrump && !isAttackTrump;
    const isHigherNormal = areSameSuite && isDefenceHigherRank;

    const isBeating = isTrumpOverNormal || isHigherNormal;

    if (isBeating) {
      this.defenceCards.push(defenceCard);
      return true;
    }

    return false;
  }

  getAttackCards(): Card[] {
    return this.attackCards;
  }

  getDefenceCards(): Card[] {
    return this.defenceCards;
  }

  isComplete(): boolean {
    return (
      this.attackCards.length === this.maxCards &&
      this.defenceCards.length === this.maxCards
    );
  }

  isEmpty(): boolean {
    return this.attackCards.length === 0 && this.defenceCards.length === 0;
  }

  toObject(): RoundDto {
    return {
      attackCards: this.attackCards.map((card) => card.toObject()),
      defenceCards: this.defenceCards.map((card) => card.toObject()),
    };
  }
}
