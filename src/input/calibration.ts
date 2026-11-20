export interface GamepadCalibration {
  xAxis: number;
  yAxis: number;
  invertX: boolean;
  invertY: boolean;
  deadzone: number;
  confirmButton: number;
  undoButton: number;
  tipButton: number;
  menuButton: number;
}

const CALIBRATION_STORAGE_KEY = 'beedash_gamepad_cal_v1';

export function createDefaultCalibration(): GamepadCalibration {
  return {
    xAxis: 0,
    yAxis: 1,
    invertX: false,
    invertY: false,
    deadzone: 0.40,
    confirmButton: 0,
    undoButton: 1,
    tipButton: 2,
    menuButton: 9
  };
}

export function loadCalibration(): GamepadCalibration {
  const defaults = createDefaultCalibration();
  try {
    if (typeof localStorage === 'undefined') {
      return defaults;
    }
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<GamepadCalibration>;
    return {
      xAxis: typeof parsed.xAxis === 'number' ? parsed.xAxis : defaults.xAxis,
      yAxis: typeof parsed.yAxis === 'number' ? parsed.yAxis : defaults.yAxis,
      invertX: typeof parsed.invertX === 'boolean' ? parsed.invertX : defaults.invertX,
      invertY: typeof parsed.invertY === 'boolean' ? parsed.invertY : defaults.invertY,
      deadzone:
        typeof parsed.deadzone === 'number'
          ? Math.min(0.85, Math.max(0.15, parsed.deadzone))
          : defaults.deadzone,
      confirmButton:
        typeof parsed.confirmButton === 'number'
          ? parsed.confirmButton
          : defaults.confirmButton,
      undoButton:
        typeof parsed.undoButton === 'number' ? parsed.undoButton : defaults.undoButton,
      tipButton:
        typeof parsed.tipButton === 'number' ? parsed.tipButton : defaults.tipButton,
      menuButton:
        typeof parsed.menuButton === 'number' ? parsed.menuButton : defaults.menuButton
    };
  } catch {
    return defaults;
  }
}

export function saveCalibration(calibration: GamepadCalibration): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(calibration));
  } catch {
    // Ignore storage errors
  }
}

export function resetCalibration(): GamepadCalibration {
  const defaults = createDefaultCalibration();
  saveCalibration(defaults);
  return defaults;
}
