import { Direction } from '../game/types';

export interface SchedulerStepResult {
  shouldStep: boolean;
  moveDir: Direction | null;
  tickProgress: number;
}

export class MoveScheduler {
  readonly tickMs: number;
  private accumulator = 0;
  private prevPolledDir: Direction | null = null;
  private lastNonNullDir: Direction | null = null;
  private lastReleasedAt = -Infinity;
  private bufferedDir: Direction | null = null;
  private bufferedDirAt = 0;
  private lastPlayerMoveWallMs = -Infinity;

  constructor(tickMs = 380) {
    this.tickMs = tickMs;
  }

  reset(): void {
    this.accumulator = 0;
    this.prevPolledDir = null;
    this.lastNonNullDir = null;
    this.lastReleasedAt = -Infinity;
    this.bufferedDir = null;
    this.bufferedDirAt = 0;
    this.lastPlayerMoveWallMs = -Infinity;
  }

  clearPendingInput(): void {
    this.bufferedDir = null;
  }

  markPlayerMoved(nowMs: number): void {
    this.lastPlayerMoveWallMs = nowMs;
  }

  update(nowMs: number, dtMs: number, dir: Direction | null): SchedulerStepResult {
    if (dir === null && this.prevPolledDir !== null) {
      this.lastReleasedAt = nowMs;
    }

    const isNewDirection = dir !== null && dir !== this.prevPolledDir;
    const isMicroswitchBounce =
      isNewDirection &&
      this.prevPolledDir === null &&
      dir === this.lastNonNullDir &&
      nowMs - this.lastReleasedAt < 45;
    const isFreshValidPress = isNewDirection && !isMicroswitchBounce;

    if (isFreshValidPress) {
      this.bufferedDir = dir;
      this.bufferedDirAt = nowMs;
    }

    if (dir !== null) {
      this.lastNonNullDir = dir;
    }

    const staleTimeout = Math.max(300, this.tickMs + 60);
    if (this.bufferedDir !== null && nowMs - this.bufferedDirAt > staleTimeout) {
      this.bufferedDir = null;
    }

    if (
      isFreshValidPress &&
      this.prevPolledDir === null &&
      nowMs - this.lastPlayerMoveWallMs >= this.tickMs * 0.85
    ) {
      this.accumulator = this.tickMs;
    } else {
      this.accumulator += dtMs;
    }

    this.prevPolledDir = dir;

    if (this.accumulator >= this.tickMs) {
      this.accumulator -= this.tickMs;
      const effectiveDir = isMicroswitchBounce ? null : dir;
      const moveDir = effectiveDir ?? this.bufferedDir;
      this.bufferedDir = null;
      return {
        shouldStep: true,
        moveDir,
        tickProgress: this.accumulator / this.tickMs
      };
    }

    return {
      shouldStep: false,
      moveDir: null,
      tickProgress: this.accumulator / this.tickMs
    };
  }
}
