export interface GameSettings {
  playtimeLimitMinutes: number;
}

export const PLAYTIME_PRESETS = [0, 1, 5, 10, 15, 20, 30] as const;

const SETTINGS_STORAGE_KEY = 'beedash_settings_v1';

export function createDefaultSettings(): GameSettings {
  return {
    playtimeLimitMinutes: 15
  };
}

export function loadSettings(): GameSettings {
  const defaults = createDefaultSettings();
  try {
    if (typeof localStorage === 'undefined') {
      return defaults;
    }
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const limit =
      typeof parsed.playtimeLimitMinutes === 'number' &&
      Number.isFinite(parsed.playtimeLimitMinutes) &&
      parsed.playtimeLimitMinutes >= 0
        ? Math.round(parsed.playtimeLimitMinutes)
        : defaults.playtimeLimitMinutes;
    return {
      playtimeLimitMinutes: limit
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function isPlaytimeLimitReached(
  elapsedMs: number,
  limitMinutes: number
): boolean {
  if (limitMinutes <= 0) return false;
  return elapsedMs >= limitMinutes * 60_000;
}
