export enum CardSuite {
  Clubs = 1,
  Diamonds = 2,
  Hearts = 3,
  Spades = 4,
}

export enum CardRank {
  R2 = 2,
  R3 = 3,
  R4 = 4,
  R5 = 5,
  R6 = 6,
  R7 = 7,
  R8 = 8,
  R9 = 9,
  R10 = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Ace = 14,
}

export class Card {
  private suite: CardSuite;
  private rank: CardRank;

  constructor(suite: CardSuite, rank: CardRank) {
    this.suite = suite;
    this.rank = rank;
  }

  isEqual(other: Card): boolean {
    return this.suite === other.suite && this.rank === other.rank;
  }

  isSameSuite(other: Card): boolean {
    return this.suite === other.suite;
  }

  isSameRank(other: Card): boolean {
    return this.rank === other.rank;
  }

  isHigherRankThan(other: Card): boolean {
    return this.rank > other.rank;
  }

  isLowerRankThan(other: Card): boolean {
    return this.rank < other.rank;
  }

  toObject(): object {
    return {
      rank: this.rank,
      suite: this.suite,
    };
  }
}
