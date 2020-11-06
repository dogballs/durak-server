import { Player, PlayerId } from './Player';

export class PlayerList {
  private map = new Map<PlayerId, Player>();

  constructor(players: Player[] = []) {
    this.reset(players);
  }

  reset(players: Player[]): void {
    players.forEach((player) => {
      this.map.set(player.getId(), player);
    });
  }

  firstId(): PlayerId {
    return this.map.keys().next().value;
  }

  first(): Player {
    return this.map.values().next().value;
  }

  prevId(id: PlayerId): PlayerId {
    const ids = Array.from(this.map.keys());

    const index = ids.indexOf(id);
    if (index === -1) {
      return -1;
    }

    let prevIndex = index - 1;
    if (prevIndex < 0) {
      prevIndex = ids.length + prevIndex;
    }

    const prevId = ids[prevIndex];

    return prevId;
  }

  nextId(id: PlayerId): PlayerId {
    const ids = Array.from(this.map.keys());

    const index = ids.indexOf(id);
    if (index === -1) {
      return -1;
    }

    const nextIndex = (index + 1) % ids.length;
    const nextId = ids[nextIndex];

    return nextId;
  }

  has(id: PlayerId): boolean {
    return this.map.has(id);
  }

  delete(id: PlayerId): boolean {
    return this.map.delete(id);
  }

  size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  players(): Player[] {
    return Array.from(this.map.values());
  }
}
