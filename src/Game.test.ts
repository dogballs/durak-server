import * as test from 'tape';

import { ExplicitStockFactory } from './stock';
import { CardSuite, CardRank } from './Card';
import { CardFactory } from './CardFactory';
import { Game, GameState } from './Game';
import { Player } from './Player';

test('basic defence', (t) => {
  const stockFactory = new ExplicitStockFactory(
    [
      CardFactory.make(CardSuite.Clubs, CardRank.R6), // Lowest trump
      CardFactory.make(CardSuite.Clubs, CardRank.R7),
      //
      CardFactory.make(CardSuite.Hearts, CardRank.R6),
      CardFactory.make(CardSuite.Hearts, CardRank.R8),
      //
      CardFactory.make(CardSuite.Spades, CardRank.R6),
      CardFactory.make(CardSuite.Spades, CardRank.R8),
      //
      CardFactory.make(CardSuite.Diamonds, CardRank.R8),
      CardFactory.make(CardSuite.Clubs, CardRank.R7),
      //
      ...CardFactory.makeDupList(CardSuite.Spades, CardRank.R7, 6), // Filler
      CardFactory.make(CardSuite.Clubs, CardRank.Ace), // Trump
    ].reverse(),
  );
  const players = [new Player(3, 'p3'), new Player(7, 'p7')];

  const game = new Game(stockFactory);
  game.init(players);

  let gameDto = game.toObject();
  t.equal(gameDto.attackerId, 3);
  t.equal(gameDto.currentId, 3);
  t.equal(gameDto.defenderId, 7);

  t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R6)));
  t.equal(game.toObject().currentId, 7);
  t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R8)));
  t.equal(game.toObject().currentId, 3);
  //
  t.ok(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
  t.equal(game.toObject().currentId, 7);
  t.ok(game.act(CardFactory.make(CardSuite.Spades, CardRank.R8)));
  t.equal(game.toObject().currentId, 3);
  //
  t.ok(game.act(CardFactory.make(CardSuite.Diamonds, CardRank.R8)));
  t.equal(game.toObject().currentId, 7);
  t.ok(game.act(CardFactory.make(CardSuite.Clubs, CardRank.R7)));
  t.equal(game.toObject().currentId, 3);
  //
  t.ok(game.pass());

  gameDto = game.toObject();
  t.equal(gameDto.attackerId, 7);
  t.equal(gameDto.currentId, 7);
  t.equal(gameDto.defenderId, 3);
  t.equal(gameDto.discardCount, 6);
  t.equal(gameDto.stockCount, 0);

  t.end();
});

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
          CardFactory.make(CardSuite.Spades, CardRank.R6), // p1
          CardFactory.make(CardSuite.Spades, CardRank.R7), // p2
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
    t.ok(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
    t.ok(game.act(CardFactory.make(CardSuite.Spades, CardRank.R7)));
  }

  gameDto = game.toObject();
  t.equal(gameDto.attackerId, 3);
  t.equal(gameDto.currentId, 3);
  t.equal(gameDto.defenderId, 7);
  t.equal(gameDto.discardCount, 0);
  t.equal(gameDto.state, GameState.DefenceShowcase);
  t.equal(gameDto.stockCount, 11);

  t.ok(game.pass());

  gameDto = game.toObject();
  t.equal(gameDto.attackerId, 7);
  t.equal(gameDto.currentId, 7);
  t.equal(gameDto.defenderId, 3);
  t.equal(gameDto.discardCount, 10);
  t.equal(gameDto.state, GameState.Attack);
  t.equal(gameDto.stockCount, 1);

  for (let i = 0; i < 6; i++) {
    t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R7)));
    t.ok(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
  }

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.DefenceShowcase);
  t.equal(gameDto.discardCount, 10);
  t.equal(gameDto.stockCount, 1);

  t.ok(game.pass());

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.Ended);
  t.equal(players[1].toObject().lossCount, 1);

  t.end();
});

test('second player leaving', (t) => {
  const stockFactory = new ExplicitStockFactory(
    [
      ...CardFactory.makeAlternateList(
        [
          CardFactory.make(CardSuite.Hearts, CardRank.R7),
          CardFactory.make(CardSuite.Hearts, CardRank.R8),
          CardFactory.make(CardSuite.Hearts, CardRank.R6),
        ],
        6,
      ),
      ...CardFactory.makeDupList(CardSuite.Hearts, CardRank.R6, 5),
      ...CardFactory.makeDupList(CardSuite.Hearts, CardRank.R7, 5),
      CardFactory.make(CardSuite.Hearts, CardRank.Ace), // Trump
    ].reverse(),
  );
  const players = [
    new Player(3, 'p1'),
    new Player(5, 'p2'),
    new Player(7, 'p3'),
  ];

  const game = new Game(stockFactory);
  game.init(players);

  let gameDto = game.toObject();
  t.equal(gameDto.attackerId, 7);
  t.equal(gameDto.currentId, 7);
  t.equal(gameDto.defenderId, 3);

  // p3 attacking p1 with 5 cards (first discard is max 5)
  for (let i = 0; i < 5; i++) {
    t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R6)));
    t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R7)));
  }

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.DefenceShowcase);
  t.equal(gameDto.passerId, 7);
  t.equal(gameDto.currentId, 7);

  t.ok(game.pass());

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.DefenceShowcase);
  t.equal(gameDto.passerId, 5);
  t.equal(gameDto.currentId, 5);

  t.ok(game.pass());

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.Attack);
  t.equal(gameDto.attackerId, 3);
  t.equal(gameDto.currentId, 3);
  t.equal(gameDto.defenderId, 5);
  t.equal(gameDto.discardCount, 10);
  t.equal(gameDto.stockCount, 1);

  // p1 has one card left after defending and 5 same cards from stock
  // p2 has all his original cards
  // p3 has one card left from attacking and 5 same cards from stock
  // p1 attacking p2 with all his 6 cards
  for (let i = 0; i < 6; i++) {
    t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R7)));
    t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R8)));
  }

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.DefenceShowcase);
  t.equal(gameDto.passerId, 3);
  t.equal(gameDto.currentId, 3);

  t.ok(game.pass());

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.DefenceShowcase);
  t.equal(gameDto.passerId, 7);
  t.equal(gameDto.currentId, 7);

  t.ok(game.pass());

  // p1 has one card picked up from stock (ace)
  // p2 leaves the game (no cards left)
  // p3 has 6 cards (6's)
  // p3 takes the turn to attack p1 instead

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.Attack);
  t.equal(gameDto.attackerId, 7);
  t.equal(gameDto.currentId, 7);
  t.equal(gameDto.defenderId, 3);
  t.equal(gameDto.discardCount, 22);
  t.equal(gameDto.stockCount, 0);

  t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R6)));
  t.ok(game.act(CardFactory.make(CardSuite.Hearts, CardRank.Ace)));

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.DefenceShowcase);
  t.equal(gameDto.passerId, 7);
  t.equal(gameDto.currentId, 7);

  t.ok(game.pass());

  gameDto = game.toObject();
  t.equal(gameDto.state, GameState.Ended);
  t.equal(gameDto.discardCount, 24);
  t.equal(gameDto.stockCount, 0);
  t.equal(players[2].toObject().lossCount, 1);

  t.end();
});
