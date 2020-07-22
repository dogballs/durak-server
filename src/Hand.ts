import { Card } from './Card';

export const HAND_CARDS_COUNT = 6;

export class Hand {
  private cards: Card[] = [];

  push(...cards: Card[]): void {
    this.cards.push(...cards);
  }

  get(index: number): Card {
    return this.cards[index];
  }

  getCards(): Card[] {
    return this.cards;
  }

  has(cardToFind: Card): boolean {
    return this.cards.some((card) => {
      return card.isEqual(cardToFind);
    });
  }

  empty(): boolean {
    return this.cards.length === 0;
  }

  remove(cardToRemove: Card): boolean {
    let wasRemoved = false;

    this.cards = this.cards.filter((card) => {
      const isEqual = card.isEqual(cardToRemove);
      if (isEqual) {
        wasRemoved = true;
      }
      return !isEqual;
    });

    return wasRemoved;
  }

  tillFullCount(): number {
    if (this.cards.length >= HAND_CARDS_COUNT) {
      return 0;
    }

    return HAND_CARDS_COUNT - this.cards.length;
  }

  size(): number {
    return this.cards.length;
  }

  toObject(): object {
    return {
      cards: this.cards.map((card) => card.toObject()),
    };
  }
}
