export class ExpirationTimer {
  private startTime = new Date().getTime();
  private duration: number;

  constructor(duration: number) {
    this.duration = duration;
  }

  touch(): void {
    this.startTime = new Date().getTime();
  }

  hasExpired(): boolean {
    const nowTime = new Date().getTime();

    return nowTime > this.startTime + this.duration;
  }
}
