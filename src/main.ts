import * as WebSocket from 'ws';

import { Card } from './Card';
import { Player } from './Player';
import { Room } from './Room';

const wss = new WebSocket.Server({
  port: 8081,
});

const room = new Room();

const wsPlayerMap = new Map<WebSocket, Player>();

wss.on('connection', (ws) => {
  ws.on('message', (messageJSON: string) => {
    const message = JSON.parse(messageJSON);
    console.log('message', message);

    if (message.id === 'register') {
      // if (message.pid)

      const playerId = room.generatePlayerId();
      const player = new Player(playerId);

      room.registerPlayer(player);

      wsPlayerMap.set(ws, player);

      sendPlayer(ws);
      broadcastRoom();
      if (room.isPlaying()) {
        broadcastGame();
      }
      broadcastLog(
        `${player.getId()} присоединился как ${player.getDisplayRole()}`,
      );

      return;
    }

    if (message.id === 'start') {
      const hasStarted = room.startGame();
      if (!hasStarted) {
        return;
      }

      broadcastLog(`Игра началась`);

      broadcastRoom();
      broadcastGame();
      return;
    }

    if (message.id === 'stop') {
      const hasStopped = room.stopGame();
      if (!hasStopped) {
        return;
      }

      broadcastRoom();
      broadcastGame();
      broadcastLog(`Игра остановлена хостом`);
      return;
    }

    if (message.id === 'end') {
      const hasEnded = room.endGame();
      if (!hasEnded) {
        return;
      }

      broadcastRoom();
      broadcastGame();
      broadcastLog(`Игра закончена.`);
      return;
    }

    if (message.id === 'act') {
      const card = new Card(message.card.suite, message.card.rank);
      const game = room.getGame();
      const hasActed = game.act(card);
      if (!hasActed) {
        return;
      }
      broadcastGame();
      return;
    }

    if (message.id === 'take') {
      const game = room.getGame();
      const hasTaken = game.take();
      if (!hasTaken) {
        return;
      }
      broadcastGame();
      return;
    }

    if (message.id === 'pass') {
      const game = room.getGame();
      const hasPassed = game.pass();
      if (!hasPassed) {
        return;
      }
      broadcastGame();
      return;
    }
  });

  // ws.on('error', (err) => {
  //   const player = wsPlayerMap.get(ws);

  //   console.log('err', err);
  // });

  ws.on('close', (code, reason) => {
    console.log('Close: ', code, reason);

    const player = wsPlayerMap.get(ws);
    if (player === undefined) {
      return;
    }

    room.unregisterPlayer(player);
    wsPlayerMap.delete(ws);

    broadcastLog(`${player.getId()} отключился`);

    if (!room.hasPlayers()) {
      room.clear();
      // TODO: remove room
      return;
    }

    if (player.isNotObverser()) {
      room.stopGame();
      broadcastLog(`Игра остановлена (игрок отключился)`);
    }

    if (player.isHost()) {
      const newHostPlayer = room.getHostPlayer();
      if (!newHostPlayer) {
        console.log('Host player not found');
        return;
      }

      const client = findClientByPlayer(newHostPlayer);
      if (!client) {
        console.log('Host player client not found');
        return;
      }

      sendPlayer(client);
      broadcastLog(
        `${newHostPlayer.getId()} теперь ${newHostPlayer.getDisplayRole()}`,
      );
    }

    broadcastRoom();
    broadcastGame();
  });
});

function findClientByPlayer(playerToFind: Player): WebSocket {
  let foundClient = undefined;

  wsPlayerMap.forEach((player, client) => {
    if (player.getId() === playerToFind.getId()) {
      foundClient = client;
    }
  });

  return foundClient;
}

function broadcastRoom() {
  const data = {
    id: 'room',
    room: {
      state: room.getState(),
      players: [],
    },
  };

  room.getPlayers().forEach((player) => {
    data.room.players.push(player.toObject());
  });

  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

function broadcastLog(message: string): void {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ id: 'log', message }));
    }
  });
}

function broadcastGame(): void {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      sendGame(ws);
    }
  });
}

function sendPlayer(client) {
  const player = wsPlayerMap.get(client);

  const data = {
    id: 'player',
    player: player.toObject(),
  };

  client.send(JSON.stringify(data));
}

function sendGame(client: WebSocket): void {
  const player = wsPlayerMap.get(client);
  if (!player) {
    return;
  }

  const game = room.getGame();

  const enemies = game
    .getPlayers()
    .filter((enemy) => {
      return enemy.getId() !== player.getId() && enemy.isNotObverser();
    })
    .map((enemy) => {
      const hand = game.getPlayerHand(enemy);
      const cardCount = hand.size();

      return {
        cardCount,
      };
    });

  client.send(
    JSON.stringify({
      id: 'game',
      game: game.toObject(),
      player: player.toObject(),
      hand: game.getPlayerHand(player).toObject(),
      enemies,
    }),
  );
}
