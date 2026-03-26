/**
 * Time management for Snapcast synchronization.
 */

export class Tv {
  sec: number;
  usec: number;

  constructor(sec: number = 0, usec: number = 0) {
    this.sec = sec;
    this.usec = usec;
  }

  setMilliseconds(ms: number) {
    this.sec = Math.floor(ms / 1000);
    this.usec = Math.floor(ms * 1000) % 1000000;
  }

  getMilliseconds(): number {
    return this.sec * 1000 + this.usec / 1000;
  }
}

export interface IAudioContext {
  currentTime: number;
}

export class TimeProvider {
  private diffBuffer: number[] = [];
  private diff: number = 0;
  private ctx?: IAudioContext;

  constructor(ctx?: IAudioContext) {
    this.ctx = ctx;
  }

  setAudioContext(ctx: IAudioContext) {
    this.ctx = ctx;
  }

  reset() {
    this.diffBuffer = [];
    this.diff = 0;
  }

  setDiff(c2s: number, s2c: number) {
    if (this.now() === 0) {
      this.reset();
    } else {
      const currentDiff = (c2s - s2c) / 2;
      this.diffBuffer.push(currentDiff);
      if (this.diffBuffer.length > 100) {
        this.diffBuffer.shift();
      }
      const sorted = [...this.diffBuffer].sort((a, b) => a - b);
      this.diff = sorted[Math.floor(sorted.length / 2)];
    }
  }

  now(): number {
    return (this.ctx ? this.ctx.currentTime : (typeof window !== 'undefined' ? performance.now() : 0)) * 1000;
  }

  serverTime(localTimeMs: number): number {
    return localTimeMs + this.diff;
  }

  localTime(serverTimeMs: number): number {
    return serverTimeMs - this.diff;
  }

  serverNow(): number {
    return this.serverTime(this.now());
  }
}
