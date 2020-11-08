import test from 'ava';

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
  t.is(gameDto.attackerId, 3);
  t.is(gameDto.currentId, 3);
  t.is(gameDto.defenderId, 7);

  t.true(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R6)));
  t.is(game.toObject().currentId, 7);
  t.true(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R8)));
  t.is(game.toObject().currentId, 3);
  //
  t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
  t.is(game.toObject().currentId, 7);
  t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R8)));
  t.is(game.toObject().currentId, 3);
  //
  t.true(game.act(CardFactory.make(CardSuite.Diamonds, CardRank.R8)));
  t.is(game.toObject().currentId, 7);
  t.true(game.act(CardFactory.make(CardSuite.Clubs, CardRank.R7)));
  t.is(game.toObject().currentId, 3);
  //
  t.true(game.pass());

  gameDto = game.toObject();
  t.is(gameDto.attackerId, 7);
  t.is(gameDto.currentId, 7);
  t.is(gameDto.defenderId, 3);
  t.is(gameDto.discardCount, 6);
  t.is(gameDto.stockCount, 0);
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
  t.is(gameDto.defenderId, 7);
  t.is(gameDto.attackerId, 3);
  t.is(gameDto.currentId, 3);
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
  t.is(gameDto.defenderId, 3);
  t.is(gameDto.attackerId, 5);
  t.is(gameDto.currentId, 5);
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
  t.is(gameDto.attackerId, 7);
  t.is(gameDto.currentId, 7);
  t.is(gameDto.defenderId, 5);
});

test('first round attack max 5 cards', (t) => {
  const stockFactory = new ExplicitStockFactory(
    [
      ...CardFactory.makeAlternateList(
        [
          CardFactory.make(CardSuite.Spades, CardRank.R6), // p1
          CardFactory.make(CardSuite.Spades, CardRank.R7), // p2
        ],
        6,
      ),
      // p1's first attack, p2 takes
      ...CardFactory.makeDupList(CardSuite.Spades, CardRank.R6, 5), // p1
      // p1's second attack, p2 defends
      ...CardFactory.makeDupList(CardSuite.Spades, CardRank.R7, 5), // p1
      CardFactory.make(CardSuite.Spades, CardRank.Ace), // trump
    ].reverse(),
  );
  const players = [new Player(3, 'p1'), new Player(7, 'p2')];

  const game = new Game(stockFactory);
  game.init(players);

  let gameDto = game.toObject();
  t.is(gameDto.attackerId, 3);
  t.is(gameDto.currentId, 3);
  t.is(gameDto.defenderId, 7);
  t.is(gameDto.stockCount, 11);

  // p1 attacks
  // p2 takes, max 5 cards

  t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
  t.true(game.take());
  for (let i = 0; i < 4; i++) {
    t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
  }
  t.false(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
  t.true(game.pass());

  gameDto = game.toObject();
  t.is(gameDto.attackerId, 3);
  t.is(gameDto.currentId, 3);
  t.is(gameDto.defenderId, 7);
  t.is(gameDto.discardCount, 0);
  t.is(gameDto.stockCount, 6);
  t.is(gameDto.state, GameState.Attack);

  // p1 attacks
  // p2 defends, max 5 cards

  for (let i = 0; i < 5; i++) {
    t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
    t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R7)));
  }
  t.false(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.DefenceShowcase);

  t.true(game.pass());

  gameDto = game.toObject();

  t.is(gameDto.attackerId, 7);
  t.is(gameDto.currentId, 7);
  t.is(gameDto.defenderId, 3);
  t.is(gameDto.discardCount, 10);
  t.is(gameDto.state, GameState.Attack);
  t.is(gameDto.stockCount, 1);

  // p2 attacks, max cards 6

  for (let i = 0; i < 5; i++) {
    t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R6)));
    t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R7)));
  }
  t.true(game.act(CardFactory.make(CardSuite.Spades, CardRank.R7)));
  t.true(game.take());
  t.true(game.pass());

  gameDto = game.toObject();
  t.is(gameDto.attackerId, 7);
  t.is(gameDto.currentId, 7);
  t.is(gameDto.defenderId, 3);
  t.is(gameDto.discardCount, 10);
  t.is(gameDto.state, GameState.Attack);
  t.is(gameDto.stockCount, 0);
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
  t.is(gameDto.attackerId, 7);
  t.is(gameDto.currentId, 7);
  t.is(gameDto.defenderId, 3);

  // p3 attacking p1 with 5 cards (first discard is max 5)
  for (let i = 0; i < 5; i++) {
    t.true(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R6)));
    t.true(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R7)));
  }

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.DefenceShowcase);
  t.is(gameDto.passerId, 7);
  t.is(gameDto.currentId, 7);

  t.true(game.pass());

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.DefenceShowcase);
  t.is(gameDto.passerId, 5);
  t.is(gameDto.currentId, 5);

  t.true(game.pass());

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.Attack);
  t.is(gameDto.attackerId, 3);
  t.is(gameDto.currentId, 3);
  t.is(gameDto.defenderId, 5);
  t.is(gameDto.discardCount, 10);
  t.is(gameDto.stockCount, 1);

  // p1 has one card left after defending and 5 same cards from stock
  // p2 has all his original cards
  // p3 has one card left from attacking and 5 same cards from stock
  // p1 attacking p2 with all his 6 cards
  for (let i = 0; i < 6; i++) {
    t.true(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R7)));
    t.true(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R8)));
  }

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.DefenceShowcase);
  t.is(gameDto.passerId, 3);
  t.is(gameDto.currentId, 3);

  t.true(game.pass());

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.DefenceShowcase);
  t.is(gameDto.passerId, 7);
  t.is(gameDto.currentId, 7);

  t.true(game.pass());

  // p1 has one card picked up from stock (ace)
  // p2 leaves the game (no cards left)
  // p3 has 6 cards (6's)
  // p3 takes the turn to attack p1 instead

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.Attack);
  t.is(gameDto.attackerId, 7);
  t.is(gameDto.currentId, 7);
  t.is(gameDto.defenderId, 3);
  t.is(gameDto.discardCount, 22);
  t.is(gameDto.stockCount, 0);

  t.true(game.act(CardFactory.make(CardSuite.Hearts, CardRank.R6)));
  t.true(game.act(CardFactory.make(CardSuite.Hearts, CardRank.Ace)));

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.DefenceShowcase);
  t.is(gameDto.passerId, 7);
  t.is(gameDto.currentId, 7);

  t.true(game.pass());

  gameDto = game.toObject();
  t.is(gameDto.state, GameState.Ended);
  t.is(gameDto.discardCount, 24);
  t.is(gameDto.stockCount, 0);
  t.is(players[2].toObject().lossCount, 1);
});
