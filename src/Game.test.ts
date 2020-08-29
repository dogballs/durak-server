import * as test from 'tape';

import { ExplicitStockFactory } from './stock';
import { Card, CardSuite, CardRank } from './Card';
import { Game } from './Game';
import { Player } from './Player';

test('player is attacking loser #1', (t) => {
  const players = [
    new Player(3, 'p3'),
    new Player(7, 'p7'),
    new Player(5, 'p5'),
  ];

  const game = new Game();
  game.init(players, 7);

  const gameDto = game.toObject();
  t.equal(gameDto.defenderId, 7);
  t.equal(gameDto.attackerId, 3);
  t.equal(gameDto.currentId, 3);
  t.end();
});

test('player is attacking loser #2', (t) => {
  const players = [
    new Player(3, 'p3'),
    new Player(7, 'p7'),
    new Player(5, 'p5'),
  ];

  const game = new Game();
  game.init(players, 3);

  const gameDto = game.toObject();
  t.equal(gameDto.defenderId, 3);
  t.equal(gameDto.attackerId, 5);
  t.equal(gameDto.currentId, 5);
  t.end();
});

test('first attacker is selected by lowest trump', (t) => {
  const stockFactory = new ExplicitStockFactory(
    [
      new Card(CardSuite.Hearts, CardRank.Jack),
      new Card(CardSuite.Hearts, CardRank.R8),
      new Card(CardSuite.Hearts, CardRank.R10),
      ...Card.makeDupList(CardSuite.Spades, CardRank.R6, 15),
      new Card(CardSuite.Hearts, CardRank.Ace), // Trump
    ].reverse(),
  );
  const players = [
    new Player(3, 'p3'),
    new Player(7, 'p7'),
    new Player(5, 'p5'),
  ];

  const game = new Game(stockFactory);
  game.init(players);

  const gameDto = game.toObject();
  t.equal(gameDto.attackerId, 7);
  t.equal(gameDto.currentId, 7);
  t.equal(gameDto.defenderId, 5);
  t.end();
});
