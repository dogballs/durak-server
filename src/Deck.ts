import { Card, CardSuite, CardRank } from './Card';

export enum DeckType {
  Standard = 1, // 36 cards
  Full = 2, // 52 cards
}

export class Deck {
  private type: DeckType;
  private cards: Card[] = [];

  constructor(type = DeckType.Standard) {
    this.type = type;
  }

  refill(): void {
    this.cards = [];

    const suites: CardSuite[] = [
      CardSuite.Clubs,
      CardSuite.Diamonds,
      CardSuite.Hearts,
      CardSuite.Spades,
    ];

    const ranks: CardRank[] = [
      CardRank.R6,
      CardRank.R7,
      CardRank.R8,
      CardRank.R9,
      CardRank.R10,
      CardRank.Jack,
      CardRank.Queen,
      CardRank.King,
      CardRank.Ace,
    ];

    suites.forEach((suite) => {
      ranks.forEach((rank) => {
        const card = new Card(suite, rank);
        this.cards.push(card);
      });
    });
  }

  // https://stackoverflow.com/a/2450976/1573638
  shuffle(): void {
    let currentIndex = this.cards.length;
    let temporaryValue, randomIndex;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = this.cards[currentIndex];
      this.cards[currentIndex] = this.cards[randomIndex];
      this.cards[randomIndex] = temporaryValue;
    }
  }

  push(...cards: Card[]): void {
    this.cards.push(...cards);
  }

  pop(): Card {
    return this.cards.pop();
  }

  takeBack(count: number): Card[] {
    const maxCount = Math.min(count, this.cards.length);
    return this.cards.splice(this.cards.length - maxCount);
  }

  peekFront(): Card {
    return this.cards[0];
  }

  empty(): boolean {
    return this.cards.length === 0;
  }

  clear(): void {
    this.cards = [];
  }

  size(): number {
    return this.cards.length;
  }
}
