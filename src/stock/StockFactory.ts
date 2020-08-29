import { Deck } from '../Deck';

export interface StockFactory {
  build(): Deck;
}
