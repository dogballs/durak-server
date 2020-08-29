import * as WebSocket from 'ws';
import { Card } from './Card';
import { Player } from './Player';
import { Room } from './Room';

export class RoomController {
  private room: Room;
  private server: WebSocket.Server;
  private client: WebSocket;
  private clientPlayerMap: Map<WebSocket, Player>;

  constructor(
    room: Room,
    clientPlayerMap: Map<WebSocket, Player>,
    server: WebSocket.Server,
    client: WebSocket,
  ) {
    this.room = room;
    this.clientPlayerMap = clientPlayerMap;
    this.server = server;
    this.client = client;
  }

  register(playerName: string): void {
    const playerId = this.room.generatePlayerId();
    const player = new Player(playerId, playerName);

    this.room.registerPlayer(player);

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
    const hasStarted = this.room.startGame();
    if (!hasStarted) {
      return;
    }

    this.broadcastLog(`Игра началась`);

    this.broadcastRoom();
    this.broadcastGame();
    return;
  }

  stop(): void {
    const hasStopped = this.room.stopGame();
    if (!hasStopped) {
      return;
    }

    this.broadcastRoom();
    this.broadcastGame();
    this.broadcastLog(`Игра остановлена хостом`);
  }

  end(): void {
    const hasEnded = this.room.endGame();
    if (!hasEnded) {
      return;
    }

    this.broadcastRoom();
    this.broadcastGame();
    this.broadcastLog(`Игра закончена.`);
  }

  act(card: Card): void {
    const game = this.room.getGame();
    const hasActed = game.act(card);
    if (!hasActed) {
      return;
    }
    this.broadcastGame();
  }

  take(): void {
    const game = this.room.getGame();
    const hasTaken = game.take();
    if (!hasTaken) {
      return;
    }
    this.broadcastGame();
  }

  pass(): void {
    const game = this.room.getGame();
    const hasPassed = game.pass();
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

    this.room.unregisterPlayer(player);
    this.clientPlayerMap.delete(this.client);

    this.broadcastLog(`"${player.getName()}" отключился`);

    if (!this.room.hasPlayers()) {
      this.room.clear();
      // TODO: remove room
      return;
    }

    if (player.isNotObverser()) {
      this.room.stopGame();
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

    const game = this.room.getGame();

    const enemies = game
      .getPlayers()
      .filter((enemy) => {
        return enemy.getId() !== player.getId() && enemy.isNotObverser();
      })
      .map((enemy) => {
        const hand = game.getPlayerHand(enemy);
        const cardCount = hand.size();

        return {
          id: enemy.getId(),
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
