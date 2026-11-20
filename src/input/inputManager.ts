import { Direction } from '../game/types';
import {
  GamepadCalibration,
  loadCalibration,
  resetCalibration,
  saveCalibration
} from './calibration';

export type InputAction = 'confirm' | 'undo' | 'tip' | 'restart' | 'menu';

export interface LiveGamepadSnapshot {
  connected: boolean;
  name: string;
  axes: number[];
  pressedButtons: number[];
  resolvedDirection: Direction | null;
}

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right'
};

const MENU_NAV_INITIAL_DELAY_MS = 240;
const MENU_NAV_REPEAT_MS = 180;

export class InputManager {
  private calibration: GamepadCalibration;
  private heldKeyDirs: Direction[] = [];
  private activeGamepadIndex: number | null = null;
  private lastGamepadDir: Direction | null = null;
  private prevAxisXActive = false;
  private prevAxisYActive = false;
  private prevGamepadButtons = new Set<number>();
  private prevNavDir: Direction | null = null;
  private nextNavRepeatAt = 0;

  private actionListeners = new Set<(action: InputAction) => void>();
  private navListeners = new Set<(dir: Direction) => void>();
  private rawActivityListeners = new Set<() => void>();
  private pauseNormalActions = false;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onGamepadConnectedBound: (e: GamepadEvent) => void;
  private onGamepadDisconnectedBound: (e: GamepadEvent) => void;

  constructor() {
    this.calibration = loadCalibration();

    this.onKeyDownBound = (e) => this.handleKeyDown(e);
    this.onKeyUpBound = (e) => this.handleKeyUp(e);
    this.onBlurBound = () => {
      this.heldKeyDirs = [];
    };
    this.onGamepadConnectedBound = (e) => {
      if (this.activeGamepadIndex === null) {
        this.activeGamepadIndex = e.gamepad.index;
      }
    };
    this.onGamepadDisconnectedBound = (e) => {
      if (this.activeGamepadIndex === e.gamepad.index) {
        this.activeGamepadIndex = null;
        this.lastGamepadDir = null;
        this.prevAxisXActive = false;
        this.prevAxisYActive = false;
      }
    };

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    window.addEventListener('gamepadconnected', this.onGamepadConnectedBound);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnectedBound);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    window.removeEventListener('gamepadconnected', this.onGamepadConnectedBound);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnectedBound);
  }

  getCalibration(): GamepadCalibration {
    return { ...this.calibration };
  }

  updateCalibration(cal: GamepadCalibration): void {
    this.calibration = { ...cal };
    saveCalibration(this.calibration);
  }

  resetCalibration(): GamepadCalibration {
    this.calibration = resetCalibration();
    return this.getCalibration();
  }

  setActionsPaused(paused: boolean): void {
    this.pauseNormalActions = paused;
  }

  onAction(cb: (action: InputAction) => void): () => void {
    this.actionListeners.add(cb);
    return () => this.actionListeners.delete(cb);
  }

  onMenuNav(cb: (dir: Direction) => void): () => void {
    this.navListeners.add(cb);
    return () => this.navListeners.delete(cb);
  }

  onAnyInput(cb: () => void): () => void {
    this.rawActivityListeners.add(cb);
    return () => this.rawActivityListeners.delete(cb);
  }

  private emitAction(action: InputAction): void {
    if (this.pauseNormalActions) return;
    for (const cb of this.actionListeners) cb(action);
  }

  private emitMenuNav(dir: Direction): void {
    if (this.pauseNormalActions) return;
    for (const cb of this.navListeners) cb(dir);
  }

  private emitActivity(): void {
    for (const cb of this.rawActivityListeners) cb();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'INPUT' && (document.activeElement as HTMLInputElement).type !== 'range') {
      return;
    }

    this.emitActivity();

    const dir = KEY_TO_DIR[e.code];
    if (dir) {
      e.preventDefault();
      if (!this.heldKeyDirs.includes(dir)) {
        this.heldKeyDirs.push(dir);
        this.emitMenuNav(dir);
      } else if (!e.repeat) {
        this.emitMenuNav(dir);
      }
      return;
    }

    if (e.repeat) return;

    if (e.code === 'KeyZ' || e.code === 'Backspace') {
      e.preventDefault();
      this.emitAction('undo');
    } else if (e.code === 'KeyR') {
      this.emitAction('restart');
    } else if (e.code === 'KeyH') {
      this.emitAction('tip');
    } else if (e.code === 'Escape') {
      this.emitAction('menu');
    } else if (e.code === 'Enter' || e.code === 'Space') {
      // If a button or range slider isn't natively handling it, trigger confirm
      if (activeTag !== 'BUTTON') {
        e.preventDefault();
        this.emitAction('confirm');
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const dir = KEY_TO_DIR[e.code];
    if (dir) {
      this.heldKeyDirs = this.heldKeyDirs.filter((d) => d !== dir);
    }
  }

  private getActiveGamepad(): Gamepad | null {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return null;
    }
    const pads = navigator.getGamepads();
    if (!pads) return null;

    let firstConnected: Gamepad | null = null;
    let activeSelected: Gamepad | null = null;
    const dz = this.calibration.deadzone;

    for (let i = 0; i < pads.length; i++) {
      const gp = pads[i];
      if (!gp || !gp.connected) continue;
      if (!firstConnected) firstConnected = gp;
      if (gp.index === this.activeGamepadIndex) activeSelected = gp;

      const hasButton = gp.buttons.some((b) => b?.pressed);
      const hasAxis = gp.axes.some((v) => Math.abs(v) >= dz);
      if (hasButton || hasAxis) {
        this.activeGamepadIndex = gp.index;
        return gp;
      }
    }

    return activeSelected ?? firstConnected;
  }

  private resolveGamepadDirection(gp: Gamepad | null, updateState: boolean): Direction | null {
    if (!gp) {
      if (updateState) {
        this.lastGamepadDir = null;
        this.prevAxisXActive = false;
        this.prevAxisYActive = false;
      }
      return null;
    }

    // Check D-pad buttons first (standard mapping 12..15)
    const upBtn = gp.buttons[12]?.pressed ?? false;
    const downBtn = gp.buttons[13]?.pressed ?? false;
    const leftBtn = gp.buttons[14]?.pressed ?? false;
    const rightBtn = gp.buttons[15]?.pressed ?? false;

    let dpadDir: Direction | null = null;
    if (upBtn && !downBtn && !leftBtn && !rightBtn) dpadDir = 'up';
    else if (downBtn && !upBtn && !leftBtn && !rightBtn) dpadDir = 'down';
    else if (leftBtn && !rightBtn && !upBtn && !downBtn) dpadDir = 'left';
    else if (rightBtn && !leftBtn && !upBtn && !downBtn) dpadDir = 'right';

    if (dpadDir !== null) {
      if (updateState) {
        this.lastGamepadDir = dpadDir;
        this.prevAxisXActive = false;
        this.prevAxisYActive = false;
      }
      return dpadDir;
    }

    // Digital/analog 4-way axis filter with newest-axis priority for microswitch cornering
    let ax = gp.axes[this.calibration.xAxis] ?? 0;
    let ay = gp.axes[this.calibration.yAxis] ?? 0;
    if (this.calibration.invertX) ax = -ax;
    if (this.calibration.invertY) ay = -ay;

    const absX = Math.abs(ax);
    const absY = Math.abs(ay);
    const dz = this.calibration.deadzone;
    const xActive = absX >= dz;
    const yActive = absY >= dz;

    let dir: Direction | null = null;
    if (xActive && !yActive) {
      dir = ax < 0 ? 'left' : 'right';
    } else if (yActive && !xActive) {
      dir = ay < 0 ? 'up' : 'down';
    } else if (xActive && yActive) {
      if (!this.prevAxisXActive && this.prevAxisYActive) {
        dir = ax < 0 ? 'left' : 'right';
      } else if (!this.prevAxisYActive && this.prevAxisXActive) {
        dir = ay < 0 ? 'up' : 'down';
      } else if (Math.abs(absX - absY) > 0.08) {
        dir = absX > absY ? (ax < 0 ? 'left' : 'right') : ay < 0 ? 'up' : 'down';
      } else if (this.lastGamepadDir === 'left' || this.lastGamepadDir === 'right') {
        dir = ax < 0 ? 'left' : 'right';
      } else if (this.lastGamepadDir === 'up' || this.lastGamepadDir === 'down') {
        dir = ay < 0 ? 'up' : 'down';
      } else {
        dir = ax < 0 ? 'left' : 'right';
      }
    }

    if (updateState) {
      this.prevAxisXActive = xActive;
      this.prevAxisYActive = yActive;
      this.lastGamepadDir = dir;
    }
    return dir;
  }

  poll(nowMs: number): Direction | null {
    const gp = this.getActiveGamepad();
    const gpDir = this.resolveGamepadDirection(gp, true);

    if (gp) {
      const pressedNow = new Set<number>();
      for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i]?.pressed) {
          pressedNow.add(i);
          if (!this.prevGamepadButtons.has(i)) {
            this.emitActivity();
            if (i === this.calibration.confirmButton) {
              this.emitAction('confirm');
            } else if (i === this.calibration.undoButton) {
              this.emitAction('undo');
            } else if (i === this.calibration.tipButton) {
              this.emitAction('tip');
            } else if (i === this.calibration.menuButton) {
              this.emitAction('menu');
            }
          }
        }
      }
      this.prevGamepadButtons = pressedNow;

      // Menu repeat for gamepad directions
      if (gpDir) {
        this.emitActivity();
        if (gpDir !== this.prevNavDir) {
          this.prevNavDir = gpDir;
          this.nextNavRepeatAt = nowMs + MENU_NAV_INITIAL_DELAY_MS;
          this.emitMenuNav(gpDir);
        } else if (nowMs >= this.nextNavRepeatAt) {
          this.nextNavRepeatAt = nowMs + MENU_NAV_REPEAT_MS;
          this.emitMenuNav(gpDir);
        }
      } else {
        this.prevNavDir = null;
      }
    } else {
      this.prevGamepadButtons.clear();
      this.prevNavDir = null;
    }

    // Keyboard takes immediate priority if a key is currently held
    if (this.heldKeyDirs.length > 0) {
      return this.heldKeyDirs[this.heldKeyDirs.length - 1];
    }
    return gpDir;
  }

  getLiveGamepadSnapshot(): LiveGamepadSnapshot {
    const gp = this.getActiveGamepad();
    if (!gp) {
      return {
        connected: false,
        name: 'Kein USB-Joystick angeschlossen',
        axes: [],
        pressedButtons: [],
        resolvedDirection: null
      };
    }

    const pressedButtons: number[] = [];
    for (let i = 0; i < gp.buttons.length; i++) {
      if (gp.buttons[i]?.pressed) {
        pressedButtons.push(i);
      }
    }

    return {
      connected: true,
      name: gp.id,
      axes: Array.from(gp.axes).map((v) => Number(v.toFixed(2))),
      pressedButtons,
      resolvedDirection: this.resolveGamepadDirection(gp, false)
    };
  }
}
