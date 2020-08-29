import { Card, CardSuite, CardRank } from './Card';

export class CardFactory {
  static make(suite: CardSuite, rank: CardRank): Card {
    return new Card(suite, rank);
  }

  // Fills a list of "count" size with the same card
  static makeDupList(suite: CardSuite, rank: CardRank, count: number): Card[] {
    const list: Card[] = [];

    for (let i = 0; i < count; i++) {
      list.push(new Card(suite, rank));
    }

    return list;
  }

  // Copies provided list of cards "count" times
  static makeAlternateList(cards: Card[], count: number): Card[] {
    const list: Card[] = [];

    for (let i = 0; i < count; i++) {
      list.push(...cards);
    }

    return list;
  }
}
