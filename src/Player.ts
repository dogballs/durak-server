export type PlayerId = number;

export enum PlayerRole {
  Host,
  Regular,
  Observer,
}

export interface PlayerDto {
  id: number;
  role: number;
  name: string;
  lossCount: number;
}

export class Player {
  private id: PlayerId;
  private name: string;
  private role = PlayerRole.Regular;
  private lossCount = 0;

  constructor(id: PlayerId, name: string) {
    this.id = id;
    this.name = name || `Игрок #${id}`;
  }

  getId(): PlayerId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getRole(): PlayerRole {
    return this.role;
  }

  setRole(role: PlayerRole): void {
    this.role = role;
  }

  makeHost(): void {
    this.role = PlayerRole.Host;
  }

  isHost(): boolean {
    return this.role === PlayerRole.Host;
  }

  isRegular(): boolean {
    return this.role === PlayerRole.Regular;
  }

  isObverser(): boolean {
    return this.role === PlayerRole.Observer;
  }

  isNotObverser(): boolean {
    return !this.isObverser();
  }

  addLoss(): void {
    this.lossCount += 1;
  }

  setLossCount(lossCount: number): void {
    this.lossCount = lossCount;
  }

  getDisplayRole(): string {
    switch (this.role) {
      case 0:
        return 'Хост';
      case 1:
        return 'Игрок';
      case 2:
        return 'Наблюдатель';
      default:
        return 'Неизвестный';
    }
  }

  toObject(): PlayerDto {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      lossCount: this.lossCount,
    };
  }
}
