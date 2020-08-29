import { Card } from '../Card';
import { Deck } from '../Deck';

import { StockFactory } from './StockFactory';

export class ExplicitStockFactory implements StockFactory {
  private cards: Card[] = [];

  constructor(cards: Card[]) {
    this.cards = cards;
  }

  build(): Deck {
    const deck = new Deck();

    deck.push(...this.cards);

    return deck;
  }
}
