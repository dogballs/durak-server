import { Player, PlayerId, PlayerRole } from './Player';
import * as config from './config';

export enum RoomState {
  WaitingForHost = 0,
  WaitingForGuests = 1,
  WaitingForStart = 2,
  Playing = 3,
}

export class Room {
  public lastLossPlayerId = -1;
  private state = RoomState.WaitingForHost;
  private players: Player[] = [];
  private playerIdCounter: PlayerId = 0;

  generateId(): PlayerId {
    const id = this.playerIdCounter;
    this.playerIdCounter++;
    return id;
  }

  register(playerToAdd: Player): boolean {
    if (this.hasPlayer(playerToAdd)) {
      return false;
    }

    if (this.state === RoomState.WaitingForHost) {
      playerToAdd.setRole(PlayerRole.Host);
    } else if (this.state === RoomState.Playing) {
      playerToAdd.setRole(PlayerRole.Observer);
    } else if (this.players.length >= config.ROOM_MAX_PLAYERS) {
      playerToAdd.setRole(PlayerRole.Observer);
    }

    this.players.push(playerToAdd);

    this.ensureWaitingState();

    return true;
  }

  unregister(playerToRemove: Player): boolean {
    if (!this.hasPlayer(playerToRemove)) {
      return false;
    }

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
      this.stop();
    }

    this.ensureWaitingState();

    return true;
  }

  moveUp(playerId: PlayerId): boolean {
    const playerIndex = this.players.findIndex(
      (player) => player.getId() === playerId,
    );

    if (playerIndex === -1) {
      return false;
    }

    // Already at the top
    if (playerIndex === 0) {
      return false;
    }

    const movedPlayers = this.players.splice(playerIndex, 1);

    this.players.splice(playerIndex - 1, 0, ...movedPlayers);

    return true;
  }

  moveDown(playerId: PlayerId): boolean {
    const playerIndex = this.players.findIndex(
      (player) => player.getId() === playerId,
    );

    if (playerIndex === -1) {
      return false;
    }

    // Already at the top
    if (playerIndex === this.players.length - 1) {
      return false;
    }

    const movedPlayers = this.players.splice(playerIndex, 1);

    this.players.splice(playerIndex + 1, 0, ...movedPlayers);

    return true;
  }

  // TODO: should it even be here?
  setLossCount(playerId: PlayerId, lossCount: number): boolean {
    const player = this.players.find((player) => player.getId() === playerId);

    if (player === undefined) {
      return false;
    }

    if (lossCount < 0 || lossCount > 999) {
      return false;
    }

    player.setLossCount(lossCount);

    return true;
  }

  start(): boolean {
    if (!this.canStart()) {
      return false;
    }

    this.setState(RoomState.Playing);

    return true;
  }

  stop(): boolean {
    if (!this.canStop()) {
      return false;
    }

    this.setState(RoomState.WaitingForStart);
    this.upgradeObserverPlayers();

    return true;
  }

  private setState(newState: RoomState): void {
    this.state = newState;

    this.ensureWaitingState();
  }

  private ensureWaitingState(): void {
    if (this.isPlaying()) {
      return;
    }

    if (this.players.length === 0) {
      this.state = RoomState.WaitingForHost;
    } else if (this.players.length < config.ROOM_MIN_PLAYERS) {
      this.state = RoomState.WaitingForGuests;
    } else if (this.players.length >= config.ROOM_MIN_PLAYERS) {
      this.state = RoomState.WaitingForStart;
    }
  }

  private upgradeObserverPlayers(): void {
    this.players.forEach((player, playerIndex) => {
      if (
        player.isObserver() &&
        this.state < RoomState.Playing &&
        playerIndex + 1 <= config.ROOM_MAX_PLAYERS
      ) {
        player.setRole(PlayerRole.Regular);
      }
    });
  }

  private hasPlayer(playerToFind: Player): boolean {
    return this.players.some((player) => {
      return player.getId() === playerToFind.getId();
    });
  }

  clear(): void {
    this.state = RoomState.WaitingForHost;
    this.playerIdCounter = 0;
    this.players = [];
  }

  isPlaying(): boolean {
    return this.state === RoomState.Playing;
  }

  canStart(): boolean {
    return this.state === RoomState.WaitingForStart;
  }

  canStop(): boolean {
    return this.state === RoomState.Playing;
  }

  hasPlayers(): boolean {
    return this.players.length > 0;
  }

  getState(): RoomState {
    return this.state;
  }

  getPlayers(): Player[] {
    return this.players;
  }

  getHostPlayer(): Player {
    return this.players.find((player) => player.isHost());
  }
}
