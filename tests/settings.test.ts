import { describe, expect, it } from 'vitest';
import {
  completeLevel,
  createDefaultProgress,
  resetProgress
} from '../src/game/progress';
import {
  createDefaultSettings,
  isPlaytimeLimitReached
} from '../src/game/settings';

describe('GameSettings & Playtime limit', () => {
  it('defaults to 15 minutes playtime limit', () => {
    const defaults = createDefaultSettings();
    expect(defaults.playtimeLimitMinutes).toBe(15);
  });

  it('never triggers when limit is 0 (disabled for testing)', () => {
    expect(isPlaytimeLimitReached(0, 0)).toBe(false);
    expect(isPlaytimeLimitReached(120 * 60_000, 0)).toBe(false);
  });

  it('triggers only once elapsedMs reaches limitMinutes * 60_000', () => {
    expect(isPlaytimeLimitReached(14 * 60_000 + 59_999, 15)).toBe(false);
    expect(isPlaytimeLimitReached(15 * 60_000, 15)).toBe(true);
    expect(isPlaytimeLimitReached(60_000, 1)).toBe(true);
  });

  it('resets level progress cleanly back to Wabe 1', () => {
    let progress = createDefaultProgress();
    progress = completeLevel(progress, 1, 'wabe-1', 3, 2);
    progress = completeLevel(progress, 2, 'wabe-2', 2, 1);
    expect(progress.unlockedUpTo).toBe(3);
    expect(Object.keys(progress.completed)).toEqual(['wabe-1', 'wabe-2']);

    const reset = resetProgress();
    expect(reset).toEqual({ unlockedUpTo: 1, completed: {} });
  });
});
