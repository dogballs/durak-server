export enum PlayerRole {
  Host,
  Regular,
  Observer,
}

export class Player {
  private id: number;
  private name: string;
  private role = PlayerRole.Regular;
  private lossCount = 0;

  constructor(id: number, name = `Игрок #${id}`) {
    this.id = id;
    this.name = name;
  }

  getId(): number {
    return this.id;
  }

  getName(): string {
    return this.name;
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

  toObject(): object {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      lossCount: this.lossCount,
    };
  }
}
