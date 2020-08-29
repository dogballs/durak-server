import { Deck } from '../Deck';

import { StockFactory } from './StockFactory';

export class ShuffleStockFactory implements StockFactory {
  build(): Deck {
    const deck = new Deck();

    deck.refill();
    deck.shuffle();

    return deck;
  }
}
