export enum RoomState {
  WaitingForHost = 0,
  WaitingForGuests = 1,
  WaitingForStart = 2,
  Playing = 3,
}

import { Game } from './Game';
import { Player, PlayerRole } from './Player';

const ROOM_MIN_PLAYERS = 2;

export class Room {
  private state = RoomState.WaitingForHost;
  private game = new Game();
  private players: Player[] = [];
  private playerIdCounter = 0;
  private lastLossPlayerId = -1;

  generatePlayerId(): number {
    const id = this.playerIdCounter;
    this.playerIdCounter++;
    return id;
  }

  registerPlayer(player: Player): void {
    if (this.state === RoomState.WaitingForHost) {
      player.setRole(PlayerRole.Host);
    } else if (this.state === RoomState.Playing) {
      player.setRole(PlayerRole.Observer);
    }

    this.players.push(player);

    this.ensureWaitingState();
  }

  unregisterPlayer(playerToRemove: Player): void {
    const wasHost = playerToRemove.isHost();
    const wasRegular = playerToRemove.isRegular();

    this.players = this.players.filter((player) => {
      return player.getId() !== playerToRemove.getId();
    });

    if (wasHost && this.players.length > 0) {
      const nextPlayer = this.players[0];
      nextPlayer.makeHost();
    }

    if (this.state === RoomState.Playing && (wasHost || wasRegular)) {
      this.stopGame();
    }

    this.ensureWaitingState();
  }

  startGame(): boolean {
    if (this.state !== RoomState.WaitingForStart) {
      return false;
    }

    const isInitialized = this.game.init(
      this.players.slice(),
      this.lastLossPlayerId,
    );
    if (!isInitialized) {
      return false;
    }

    this.setState(RoomState.Playing);

    return true;
  }

  stopGame(): boolean {
    if (this.state !== RoomState.Playing) {
      return false;
    }

    this.game.clear();
    this.setState(RoomState.WaitingForStart);
    this.upgradeObserverPlayers();

    return true;
  }

  endGame(): boolean {
    if (this.state !== RoomState.Playing) {
      return false;
    }

    if (this.game.isEndedInLoss()) {
      const lostPlayer = this.game.getPlayers()[0];
      if (lostPlayer) {
        this.lastLossPlayerId = lostPlayer.getId();
      }
    } else {
      // Otherwise it should be a draw
      this.lastLossPlayerId = -1;
    }

    this.stopGame();

    return true;
  }

  private setState(newState: RoomState): void {
    this.state = newState;

    this.ensureWaitingState();
  }

  private ensureWaitingState(): void {
    if (this.state === RoomState.Playing) {
      return;
    }

    if (this.players.length === 0) {
      this.state = RoomState.WaitingForHost;
    } else if (this.players.length < ROOM_MIN_PLAYERS) {
      this.state = RoomState.WaitingForGuests;
    } else if (this.players.length >= ROOM_MIN_PLAYERS) {
      this.state = RoomState.WaitingForStart;
    }
  }

  private upgradeObserverPlayers(): void {
    this.players.forEach((player) => {
      if (player.isObverser() && this.state < RoomState.Playing) {
        player.setRole(PlayerRole.Regular);
      }
    });
  }

  clear(): void {
    this.state = RoomState.WaitingForHost;
    this.game.clear();
    this.playerIdCounter = 0;
    this.players = [];
  }

  isPlaying(): boolean {
    return this.state === RoomState.Playing;
  }

  hasPlayers(): boolean {
    return this.players.length > 0;
  }

  getState(): RoomState {
    return this.state;
  }

  getGame(): Game {
    return this.game;
  }

  getPlayers(): Player[] {
    return this.players;
  }

  getHostPlayer(): Player {
    return this.players.find((player) => player.isHost());
  }
}
