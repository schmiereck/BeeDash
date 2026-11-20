export interface LevelCompletionRecord {
  stars: number;
  bestHoney: number;
}

export interface ProgressState {
  unlockedUpTo: number;
  completed: Record<string, LevelCompletionRecord>;
}

const PROGRESS_STORAGE_KEY = 'beedash_progress_v1';

export function createDefaultProgress(): ProgressState {
  return {
    unlockedUpTo: 1,
    completed: {}
  };
}

export function loadProgress(): ProgressState {
  try {
    if (typeof localStorage === 'undefined') {
      return createDefaultProgress();
    }
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const unlockedUpTo =
      typeof parsed.unlockedUpTo === 'number' && parsed.unlockedUpTo >= 1
        ? Math.floor(parsed.unlockedUpTo)
        : 1;
    const completed =
      parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {};
    return { unlockedUpTo, completed };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress: ProgressState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function isLevelUnlocked(levelNumber: number, progress: ProgressState): boolean {
  return levelNumber <= progress.unlockedUpTo;
}

export function completeLevel(
  progress: ProgressState,
  levelNumber: number,
  levelId: string,
  stars: number,
  honeyCollected: number
): ProgressState {
  const prev = progress.completed[levelId];
  const updated: ProgressState = {
    unlockedUpTo: Math.max(progress.unlockedUpTo, levelNumber + 1),
    completed: {
      ...progress.completed,
      [levelId]: {
        stars: Math.max(prev?.stars ?? 0, Math.min(3, Math.max(1, stars))),
        bestHoney: Math.max(prev?.bestHoney ?? 0, honeyCollected)
      }
    }
  };
  saveProgress(updated);
  return updated;
}

export function resetProgress(): ProgressState {
  const fresh = createDefaultProgress();
  saveProgress(fresh);
  return fresh;
}
