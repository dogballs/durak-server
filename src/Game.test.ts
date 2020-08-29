import * as test from 'tape';

import { ExplicitStockFactory } from './stock';
import { Card, CardSuite, CardRank } from './Card';
import { CardFactory } from './CardFactory';
import { Game, GameState } from './Game';
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
      CardFactory.make(CardSuite.Hearts, CardRank.Jack),
      CardFactory.make(CardSuite.Hearts, CardRank.R8),
      CardFactory.make(CardSuite.Hearts, CardRank.R10),
      ...CardFactory.makeDupList(CardSuite.Spades, CardRank.R6, 15),
      CardFactory.make(CardSuite.Hearts, CardRank.Ace), // Trump
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

test('first round attack max 5 cards', (t) => {
  const stockFactory = new ExplicitStockFactory(
    [
      ...CardFactory.makeAlternateList(
        [
          new Card(CardSuite.Spades, CardRank.R6), // p1
          new Card(CardSuite.Spades, CardRank.R7), // p2
        ],
        5,
      ),
      CardFactory.make(CardSuite.Spades, CardRank.R6), // p1
      CardFactory.make(CardSuite.Hearts, CardRank.R7), // p2
      ...CardFactory.makeDupList(CardSuite.Spades, CardRank.R6, 5), // p1
      ...CardFactory.makeDupList(CardSuite.Hearts, CardRank.R7, 5), // p2
      CardFactory.make(CardSuite.Spades, CardRank.Ace), // trump
    ].reverse(),
  );
  const players = [new Player(3, 'p1'), new Player(7, 'p2')];

  const game = new Game(stockFactory);
  game.init(players);

  let gameDto = game.toObject();
  t.equal(gameDto.attackerId, 3);
  t.equal(gameDto.currentId, 3);
  t.equal(gameDto.defenderId, 7);

  for (let i = 0; i < 5; i++) {
    t.ok(game.act(new Card(CardSuite.Spades, CardRank.R6)));
    t.ok(game.act(new Card(CardSuite.Spades, CardRank.R7)));
  }

  gameDto = game.toObject();
  t.equal(gameDto.attackerId, 7);
  t.equal(gameDto.currentId, 7);
  t.equal(gameDto.defenderId, 3);
  t.equal(gameDto.discardCount, 10);
  t.equal(gameDto.state, GameState.Attack);
  t.equal(gameDto.stockCount, 1);

  for (let i = 0; i < 6; i++) {
    t.ok(game.act(new Card(CardSuite.Hearts, CardRank.R7)));
    t.ok(game.act(new Card(CardSuite.Spades, CardRank.R6)));
  }

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.Ended);
  t.equal(players[1].toObject().lossCount, 1);

  t.end();
});
