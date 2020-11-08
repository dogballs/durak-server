import test from 'ava';

import { Player } from './Player';
import { Room, RoomState } from './Room';

test('generate id', (t) => {
  const room1 = new Room();
  const room2 = new Room();

  t.is(room1.generateId(), 0);
  t.is(room1.generateId(), 1);
  t.is(room1.generateId(), 2);
  t.is(room2.generateId(), 0);
  t.is(room2.generateId(), 1);
});

test('register first player as host', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.hasPlayers(), false);
  t.is(room.getState(), RoomState.WaitingForHost);
  t.is(room.getHostPlayer(), undefined);
  t.deepEqual(room.getPlayers(), []);

  t.true(room.register(player1));

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.hasPlayers(), true);
  t.is(room.getState(), RoomState.WaitingForGuests);
  t.is(room.getHostPlayer(), player1);
  t.deepEqual(room.getPlayers(), [player1]);
});

test('register second player', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');
  const player2 = new Player(room.generateId(), 'bar');

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.hasPlayers(), false);
  t.is(room.getState(), RoomState.WaitingForHost);
  t.is(room.getHostPlayer(), undefined);
  t.deepEqual(room.getPlayers(), []);

  t.true(room.register(player1));
  t.true(room.register(player2));

  t.is(room.canStart(), true);
  t.is(room.canStop(), false);
  t.is(room.hasPlayers(), true);
  t.is(room.getState(), RoomState.WaitingForStart);
  t.is(room.getHostPlayer(), player1);
  t.deepEqual(room.getPlayers(), [player1, player2]);
});

test('register already existing player', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');

  t.true(room.register(player1));
  t.false(room.register(player1));

  t.is(room.hasPlayers(), true);
  t.is(room.getState(), RoomState.WaitingForGuests);
  t.is(room.getHostPlayer(), player1);
  t.deepEqual(room.getPlayers(), [player1]);
});

test('unregister unexisting player', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');
  const player2 = new Player(room.generateId(), 'bar');

  t.true(room.register(player1));
  t.false(room.unregister(player2));

  t.is(room.hasPlayers(), true);
  t.is(room.getState(), RoomState.WaitingForGuests);
  t.is(room.getHostPlayer(), player1);
  t.deepEqual(room.getPlayers(), [player1]);
});

test('two players waiting, unregister host', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');
  const player2 = new Player(room.generateId(), 'bar');

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.hasPlayers(), false);
  t.is(room.getState(), RoomState.WaitingForHost);
  t.is(room.getHostPlayer(), undefined);

  t.true(room.register(player1));
  t.true(room.register(player2));
  t.true(room.unregister(player1));

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.hasPlayers(), true);
  t.is(room.getState(), RoomState.WaitingForGuests);
  t.is(room.getHostPlayer(), player2);
  t.deepEqual(room.getPlayers(), [player2]);
});

test('two players, start game', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');
  const player2 = new Player(room.generateId(), 'bar');

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.getState(), RoomState.WaitingForHost);

  t.true(room.register(player1));
  t.true(room.register(player2));
  t.true(room.start());

  t.is(room.canStart(), false);
  t.is(room.canStop(), true);
  t.is(room.isPlaying(), true);
  t.is(room.getState(), RoomState.Playing);
});

test('two players, stop game', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');
  const player2 = new Player(room.generateId(), 'bar');

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.getState(), RoomState.WaitingForHost);

  t.true(room.register(player1));
  t.true(room.register(player2));
  t.true(room.start());
  t.true(room.stop());

  t.is(room.canStart(), true);
  t.is(room.canStop(), false);
  t.is(room.isPlaying(), false);
  t.is(room.getState(), RoomState.WaitingForStart);
});

test('one player playing, host leaves', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.getState(), RoomState.WaitingForHost);

  t.true(room.register(player1));
  t.true(room.unregister(player1));

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.isPlaying(), false);
  t.is(room.hasPlayers(), false);
  t.is(room.getState(), RoomState.WaitingForHost);
  t.is(room.getHostPlayer(), undefined);
  t.deepEqual(room.getPlayers(), []);
});

test('two players playing, host leaves', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');
  const player2 = new Player(room.generateId(), 'bar');

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.getState(), RoomState.WaitingForHost);

  t.true(room.register(player1));
  t.true(room.register(player2));

  t.true(room.start());
  t.true(room.unregister(player1));

  t.is(room.canStart(), false);
  t.is(room.canStop(), false);
  t.is(room.isPlaying(), false);
  t.is(room.hasPlayers(), true);
  t.is(room.getState(), RoomState.WaitingForGuests);
  t.is(room.getHostPlayer(), player2);
  t.deepEqual(room.getPlayers(), [player2]);
});

test('new player joins while two players playing', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');
  const player2 = new Player(room.generateId(), 'bar');
  const player3 = new Player(room.generateId(), 'baz');

  t.true(room.register(player1));
  t.true(room.register(player2));
  t.true(room.start());
  t.true(room.register(player3));

  t.is(room.canStart(), false);
  t.is(room.canStop(), true);
  t.is(room.isPlaying(), true);
  t.is(room.getState(), RoomState.Playing);

  t.is(room.getHostPlayer(), player1);
  t.deepEqual(room.getPlayers(), [player1, player2, player3]);
  t.true(player3.isObserver());
});

test('move players around', (t) => {
  const room = new Room();
  const player1 = new Player(room.generateId(), 'foo');
  const player2 = new Player(room.generateId(), 'bar');

  t.true(room.register(player1));
  t.true(room.register(player2));

  t.deepEqual(room.getPlayers(), [player1, player2]);

  t.false(room.moveUp(player1.getId()));
  t.true(room.moveDown(player1.getId()));

  t.deepEqual(room.getPlayers(), [player2, player1]);

  t.false(room.moveDown(player1.getId()));
  t.true(room.moveUp(player1.getId()));

  t.deepEqual(room.getPlayers(), [player1, player2]);
});
