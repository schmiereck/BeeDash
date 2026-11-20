import { describe, expect, it } from 'vitest';
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
});
