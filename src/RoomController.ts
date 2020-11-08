import * as WebSocket from 'ws';
import { Card } from './Card';
import { Game } from './Game';
import { Player } from './Player';
import { Room } from './Room';
import * as config from './config';

export class RoomController {
  private room: Room;
  private game: Game;
  private server: WebSocket.Server;
  private client: WebSocket;
  private clientPlayerMap: Map<WebSocket, Player>;

  constructor(
    room: Room,
    game: Game,
    clientPlayerMap: Map<WebSocket, Player>,
    server: WebSocket.Server,
    client: WebSocket,
  ) {
    this.room = room;
    this.game = game;
    this.clientPlayerMap = clientPlayerMap;
    this.server = server;
    this.client = client;
  }

  register(playerName: string): void {
    const playerId = this.room.generateId();
    const player = new Player(playerId, playerName);

    this.room.register(player);

    this.clientPlayerMap.set(this.client, player);

    this.sendPlayer(this.client);
    this.broadcastRoom();
    if (this.room.isPlaying()) {
      this.broadcastGame();
    }
    this.broadcastLog(
      `"${player.getName()}" присоединился как ${player.getDisplayRole()}`,
    );
  }

  start(): void {
    if (!this.room.canStart()) {
      return;
    }

    const isInitialized = this.game.init(
      this.room.getPlayers().slice(0, config.ROOM_MAX_PLAYERS),
      this.room.lastLossPlayerId,
    );
    if (!isInitialized) {
      return;
    }

    this.room.start();

    this.broadcastLog(`Игра началась`);

    this.broadcastGame();
    this.broadcastRoom();
    return;
  }

  stop(): void {
    if (!this.room.canStop()) {
      return;
    }

    this.room.stop();
    this.game.clear();

    this.broadcastRoom();
    this.broadcastGame();
    this.broadcastLog(`Игра остановлена хостом`);
  }

  end(): void {
    if (!this.room.canStop()) {
      return;
    }
    if (!this.game.isEnded()) {
      return;
    }

    this.room.stop();

    if (this.game.isEndedInLoss()) {
      const lostPlayer = this.game.getPlayers()[0];
      if (lostPlayer) {
        this.room.lastLossPlayerId = lostPlayer.getId();
      }
    } else {
      // Otherwise it should be a draw
      this.room.lastLossPlayerId = -1;
    }

    this.game.clear();

    this.broadcastRoom();
    this.broadcastGame();
    this.broadcastLog(`Игра закончена.`);
  }

  act(card: Card): void {
    const hasActed = this.game.act(card);
    if (!hasActed) {
      return;
    }
    this.broadcastGame();
  }

  take(): void {
    const hasTaken = this.game.take();
    if (!hasTaken) {
      return;
    }
    this.broadcastGame();
  }

  pass(): void {
    const hasPassed = this.game.pass();
    if (!hasPassed) {
      return;
    }
    this.broadcastGame();
  }

  error(): void {
    const player = this.clientPlayerMap.get(this.client);
    if (player === undefined) {
      return;
    }

    this.room.unregister(player);
    this.clientPlayerMap.delete(this.client);

    this.broadcastLog(`"${player.getName()}" отключился`);

    if (!this.room.hasPlayers()) {
      this.room.clear();
      this.game.clear();
      // TODO: remove room
      return;
    }

    if (player.isNotObserver()) {
      this.room.stop();
      this.game.clear();
      this.broadcastLog(`Игра остановлена (игрок отключился)`);
    }

    if (player.isHost()) {
      const newHostPlayer = this.room.getHostPlayer();
      if (!newHostPlayer) {
        return;
      }

      const client = this.findClientByPlayer(newHostPlayer);
      if (!client) {
        return;
      }

      this.sendPlayer(client);
      this.broadcastLog(
        `"${newHostPlayer.getName()}" теперь ${newHostPlayer.getDisplayRole()}`,
      );
    }

    this.broadcastRoom();
    this.broadcastGame();
  }

  ping(): void {
    this.client.send(JSON.stringify({ id: 'pong' }));
  }

  playerMoveUp(playerId: number): void {
    const hasMoved = this.room.moveUp(playerId);
    if (!hasMoved) {
      return;
    }

    this.broadcastRoom();
  }

  playerMoveDown(playerId: number): void {
    const hasMoved = this.room.moveDown(playerId);
    if (!hasMoved) {
      return;
    }

    this.broadcastRoom();
  }

  playerSetLossCount(playerId: number, lossCount: number): void {
    const hasChanged = this.room.setLossCount(playerId, lossCount);
    if (!hasChanged) {
      return;
    }

    this.broadcastRoom();
    this.sendPlayer(this.client);
  }

  private findClientByPlayer(playerToFind: Player): WebSocket {
    let foundClient = undefined;

    this.clientPlayerMap.forEach((player, client) => {
      if (player.getId() === playerToFind.getId()) {
        foundClient = client;
      }
    });

    return foundClient;
  }

  private broadcastRoom() {
    const data = {
      id: 'room',
      room: {
        state: this.room.getState(),
        players: [],
      },
    };

    this.room.getPlayers().forEach((player) => {
      data.room.players.push(player.toObject());
    });

    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  private broadcastGame() {
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendGame(client);
      }
    });
  }

  private sendGame(client: WebSocket) {
    const player = this.clientPlayerMap.get(client);
    if (!player) {
      return;
    }

    const counters = this.game.getPlayers().map((enemy) => {
      const hand = this.game.getPlayerHand(enemy);
      const cardCount = hand.size();

      return {
        id: enemy.getId(),
        role: enemy.getRole(),
        cardCount,
      };
    });

    client.send(
      JSON.stringify({
        id: 'game',
        game: this.game.toObject(),
        player: player.toObject(),
        hand: this.game.getPlayerHand(player).toObject(),
        counters,
      }),
    );
  }

  private sendPlayer(client: WebSocket) {
    const player = this.clientPlayerMap.get(client);

    const data = {
      id: 'player',
      player: player.toObject(),
    };

    client.send(JSON.stringify(data));
  }

  private broadcastLog(message: string): void {
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ id: 'log', message }));
      }
    });
  }
}
