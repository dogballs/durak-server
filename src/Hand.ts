import { Card, CardDto } from './Card';
import * as config from './config';

export interface HandDto {
  cards: CardDto[];
}

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
    if (this.cards.length >= config.HAND_MAX_CARDS) {
      return 0;
    }

    return config.HAND_MAX_CARDS - this.cards.length;
  }

  size(): number {
    return this.cards.length;
  }

  toObject(): HandDto {
    return {
      cards: this.cards.map((card) => card.toObject()),
    };
  }
}
