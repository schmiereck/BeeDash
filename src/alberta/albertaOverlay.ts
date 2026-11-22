import * as THREE from 'three';
import { SoundManager } from '../audio/soundManager';
import { Direction } from '../game/types';
import { InputAction } from '../input/inputManager';
import { AssetFactory } from '../render/assetFactory';
import {
  animateCharacterWalk,
  createStageCharacter
} from '../render/suitcaseCharacters';
import {
  cancelActiveWire,
  clearAllWires,
  computeWireCrossings,
  createAlbertaState,
  getNearbySocketAction,
  interactSocket,
  moveAlberta,
  undoLastWire
} from './albertaEngine';
import {
  ALBERTA_LEVELS,
  CLOCK_COLORS,
  CYCLE_LENGTH,
  getDisplayCycleLength
} from './albertaLevels';
import {
  AlbertaModelBundle,
  LogicBlockVisual,
  SocketHighlightState,
  SourceCubeVisual,
  TargetBlockVisual,
  WireVisual,
  createLogicBlockMesh,
  createSourceCubeMesh,
  createTargetBlockMesh,
  createWireMesh,
  createWorkbenchFloor,
  setSocketRingVisual
} from './albertaModels';
import { AlbertaEvent, AlbertaGameState, SocketDef } from './albertaTypes';

const STEP_REPEAT_MS = 165;

const FACING_YAW: Record<Direction, number> = {
  down: 0,
  right: Math.PI / 2,
  up: Math.PI,
  left: -Math.PI / 2
};

export interface AlbertaOverlayCallbacks {
  onClose: () => void;
}

export class AlbertaOverlay {
  private root: HTMLElement;
  private assets: AssetFactory;
  private sounds: SoundManager;
  private callbacks: AlbertaOverlayCallbacks;

  private active = false;
  private levelIndex = 0;
  private state: AlbertaGameState = createAlbertaState(ALBERTA_LEVELS[0]);
  private completedIds = new Set<string>();
  private tipVisible = false;
  private rhythmVisible = true;
  private clockPaused = false;
  private zoomFactor = 1.0;
  private noticeText = '';
  private noticeTimer = 0;

  // Timing & walk interpolation
  private clockTime = 0;
  private elapsed = 0;
  private stepProgress = 1;
  private lastStepAt = 0;
  private albertaYaw = FACING_YAW.right;
  private currentWorldPos = new THREE.Vector3();

  // Three.js scene resources
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private raycaster = new THREE.Raycaster();
  private albertaGroup: THREE.Group | null = null;
  private albertaCharMats: THREE.Material[] = [];
  private staticBundles: AlbertaModelBundle[] = [];
  private sourceVisuals = new Map<string, SourceCubeVisual>();
  private logicVisuals = new Map<string, LogicBlockVisual>();
  private targetVisuals = new Map<string, TargetBlockVisual>();
  private wireVisuals: WireVisual[] = [];
  private activeWireVisual: WireVisual | null = null;
  private lastWiresHash = '';
  private lastActiveWireHash = '';

  // DOM handles
  private bodyEl: HTMLElement | null = null;
  private canvasWrapEl: HTMLElement | null = null;
  private levelPillsEl: HTMLElement | null = null;
  private promptBtnEl: HTMLButtonElement | null = null;
  private undoBtnEl: HTMLButtonElement | null = null;
  private muteBtnEl: HTMLButtonElement | null = null;
  private pauseClockBtnEl: HTMLButtonElement | null = null;
  private rhythmToggleBtnEl: HTMLButtonElement | null = null;
  private rhythmSidebarEl: HTMLElement | null = null;
  private rhythmTableEl: HTMLElement | null = null;
  private rhythmSecBadgeEl: HTMLElement | null = null;
  private tipBoxEl: HTMLElement | null = null;
  private winBannerEl: HTMLElement | null = null;
  private subtitleEl: HTMLElement | null = null;
  private lastBeatSec = -1;
  private lastRhythmStructureKey = '';

  private boundPointerDown = (e: PointerEvent) => this.handleCanvasPointerDown(e);
  private boundWheel = (e: WheelEvent) => this.handleCanvasWheel(e);

  constructor(
    root: HTMLElement,
    assets: AssetFactory,
    sounds: SoundManager,
    callbacks: AlbertaOverlayCallbacks
  ) {
    this.root = root;
    this.assets = assets;
    this.sounds = sounds;
    this.callbacks = callbacks;
  }

  isActive(): boolean {
    return this.active;
  }

  open(levelIndex = 0): void {
    this.cleanupScene();
    this.active = true;
    this.levelIndex = Math.max(0, Math.min(ALBERTA_LEVELS.length - 1, levelIndex));
    this.tipVisible = false;
    this.rhythmVisible = true;
    this.clockPaused = false;
    this.zoomFactor = 1.0;
    this.noticeText = '';
    this.noticeTimer = 0;
    this.clockTime = 0;
    this.elapsed = 0;
    this.lastBeatSec = -1;
    this.lastRhythmStructureKey = '';

    this.buildDom();
    this.initScene();
    this.loadLevel(this.levelIndex);

    this.root.classList.remove('hidden');
    this.syncRendererSize();
    this.renderFrame();
  }

  close(notify = true): void {
    if (!this.active) return;
    this.active = false;
    this.cleanupScene();
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
    if (notify) {
      this.callbacks.onClose();
    }
  }

  private buildDom(): void {
    this.root.innerHTML = `
      <div class="alberta-shell">
        <header class="alberta-header">
          <div class="alberta-brand">
            <h2>🥽 Albertas Erfinder-Werkstatt</h2>
            <span id="alberta-subtitle" class="alberta-subtitle"></span>
          </div>
          <div id="alberta-level-pills" class="alberta-level-pills"></div>
          <div class="alberta-actions">
            <button id="alberta-zoom-out-btn" class="btn btn-secondary btn-compact" type="button" title="Herauszoomen">➖</button>
            <button id="alberta-zoom-in-btn" class="btn btn-secondary btn-compact" type="button" title="Näher heranzoomen">➕</button>
            <button id="alberta-rhythm-toggle-btn" class="btn btn-secondary btn-compact" type="button">📊 Takt-Tafel</button>
            <button id="alberta-undo-btn" class="btn btn-secondary btn-compact" type="button">↩️ Zurück</button>
            <button id="alberta-clear-btn" class="btn btn-secondary btn-compact" type="button">🗑️ Kabel</button>
            <button id="alberta-tip-btn" class="btn btn-pink btn-compact" type="button">💡 Tipp</button>
            <button id="alberta-mute-btn" class="btn btn-secondary btn-compact" type="button">${this.sounds.isMuted() ? '🔇' : '🔊'}</button>
            <button id="alberta-close-btn" class="btn btn-compact" type="button">🗺️ Karte</button>
          </div>
        </header>

        <div id="alberta-body" class="alberta-body">
          <div class="alberta-viewport">
            <div id="alberta-canvas-wrap" class="alberta-canvas-wrap"></div>
            <div id="alberta-tip-box" class="alberta-tip-box hidden"></div>
            <div id="alberta-win-banner" class="alberta-win-banner hidden"></div>
          </div>

          <aside id="alberta-rhythm-sidebar" class="alberta-rhythm-sidebar">
            <div class="alberta-rhythm-header">
              <span class="alberta-rhythm-title">📊 Live-Takt-Vergleich</span>
              <span id="alberta-rhythm-sec" class="alberta-beat-sec">⏱ 1s / 8s</span>
            </div>
            <div class="alberta-rhythm-controls">
              <button id="alberta-pause-clock-btn" class="btn btn-secondary btn-compact" type="button">⏸️ Pause</button>
              <button id="alberta-step-clock-btn" class="btn btn-secondary btn-compact" type="button">⏭️ +1s</button>
            </div>
            <div id="alberta-rhythm-table" class="alberta-rhythm-table"></div>
            <div class="alberta-rhythm-legend">
              <span><i class="alberta-leg-dot on"></i> An</span>
              <span><i class="alberta-leg-dot"></i> Aus</span>
              <span><i class="alberta-leg-dot mis"></i> Abweichung</span>
            </div>
          </aside>
        </div>

        <footer class="alberta-bottom-bar">
          <button id="alberta-prompt-btn" class="alberta-prompt-btn" type="button"></button>
          <span class="alberta-controls-hint">
            Laufen: Pfeiltasten / WASD / Joystick / Klick • Stecken: Leertaste / Enter • Zoom: ➕/➖ / Mausrad • Abbrechen: Z
          </span>
        </footer>
      </div>
    `;

    this.bodyEl = this.root.querySelector('#alberta-body');
    this.canvasWrapEl = this.root.querySelector('#alberta-canvas-wrap');
    this.levelPillsEl = this.root.querySelector('#alberta-level-pills');
    this.promptBtnEl = this.root.querySelector('#alberta-prompt-btn');
    this.undoBtnEl = this.root.querySelector('#alberta-undo-btn');
    this.muteBtnEl = this.root.querySelector('#alberta-mute-btn');
    this.pauseClockBtnEl = this.root.querySelector('#alberta-pause-clock-btn');
    this.rhythmToggleBtnEl = this.root.querySelector('#alberta-rhythm-toggle-btn');
    this.rhythmSidebarEl = this.root.querySelector('#alberta-rhythm-sidebar');
    this.rhythmTableEl = this.root.querySelector('#alberta-rhythm-table');
    this.rhythmSecBadgeEl = this.root.querySelector('#alberta-rhythm-sec');
    this.tipBoxEl = this.root.querySelector('#alberta-tip-box');
    this.winBannerEl = this.root.querySelector('#alberta-win-banner');
    this.subtitleEl = this.root.querySelector('#alberta-subtitle');

    this.root.querySelector('#alberta-zoom-out-btn')?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.adjustZoom(-0.14);
    });
    this.root.querySelector('#alberta-zoom-in-btn')?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.adjustZoom(0.14);
    });
    this.rhythmToggleBtnEl?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.rhythmVisible = !this.rhythmVisible;
      this.bodyEl?.classList.toggle('rhythm-hidden', !this.rhythmVisible);
      this.rhythmSidebarEl?.classList.toggle('hidden', !this.rhythmVisible);
      this.syncRendererSize();
      this.renderFrame();
    });
    this.pauseClockBtnEl?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.setClockPaused(!this.clockPaused);
    });
    this.root.querySelector('#alberta-step-clock-btn')?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.setClockPaused(true);
      this.clockTime = Math.floor(this.clockTime) + 1.01;
      const tickIdx = Math.floor(this.clockTime) % CYCLE_LENGTH;
      this.syncSignalVisuals(tickIdx);
      this.renderFrame();
    });
    this.root.querySelector('#alberta-close-btn')?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.close(true);
    });
    this.root.querySelector('#alberta-undo-btn')?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.handleEvents(undoLastWire(this.state));
      this.refreshHud();
    });
    this.root.querySelector('#alberta-clear-btn')?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.handleEvents(clearAllWires(this.state));
      this.refreshHud();
    });
    this.root.querySelector('#alberta-tip-btn')?.addEventListener('click', () => {
      this.sounds.play('ui_click');
      this.tipVisible = !this.tipVisible;
      this.refreshTipBox();
    });
    this.muteBtnEl?.addEventListener('click', () => {
      const muted = this.sounds.toggleMute();
      if (this.muteBtnEl) this.muteBtnEl.textContent = muted ? '🔇' : '🔊';
    });
    this.promptBtnEl?.addEventListener('click', () => {
      const events = interactSocket(this.state);
      this.handleEvents(events);
      this.refreshHud();
    });
  }

  private initScene(): void {
    if (!this.canvasWrapEl) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf6e6c2);

    const w = Math.max(this.canvasWrapEl.clientWidth, 320);
    const h = Math.max(this.canvasWrapEl.clientHeight, 240);
    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setSize(w, h);

    this.canvasWrapEl.innerHTML = '';
    this.canvasWrapEl.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('pointerdown', this.boundPointerDown);
    this.renderer.domElement.addEventListener('wheel', this.boundWheel, { passive: false });

    const hemi = new THREE.HemisphereLight(0xfff9ea, 0xbb8446, 1.15);
    const key = new THREE.DirectionalLight(0xfff4d6, 1.45);
    key.position.set(10, 16, 11);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 45;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -14;
    const fill = new THREE.DirectionalLight(0xffeedd, 0.45);
    fill.position.set(-8, 6, -6);
    this.scene.add(hemi, key, fill);

    this.resizeObserver = new ResizeObserver(() => this.syncRendererSize());
    this.resizeObserver.observe(this.canvasWrapEl);
  }

  private syncRendererSize(): void {
    if (!this.canvasWrapEl || !this.renderer || !this.camera) return;
    const w = Math.max(this.canvasWrapEl.clientWidth, 320);
    const h = Math.max(this.canvasWrapEl.clientHeight, 240);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.fitCameraToLevel();
  }

  private adjustZoom(delta: number): void {
    this.zoomFactor = Math.max(0.75, Math.min(1.45, this.zoomFactor + delta));
    this.fitCameraToLevel();
    this.renderFrame();
  }

  private handleCanvasWheel(e: WheelEvent): void {
    if (!this.active) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    this.adjustZoom(delta);
  }

  private setClockPaused(paused: boolean): void {
    this.clockPaused = paused;
    if (this.pauseClockBtnEl) {
      this.pauseClockBtnEl.textContent = paused ? '▶️ Weiter' : '⏸️ Pause';
    }
  }

  private fitCameraToLevel(): void {
    if (!this.camera) return;
    const lvl = this.state.level;
    const cx = (lvl.width - 1) / 2;
    const cz = (lvl.height - 1) / 2;
    const lookZ = cz - 0.12;
    const tiltRad = THREE.MathUtils.degToRad(54);

    const halfTanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const halfTanH = halfTanV * Math.max(0.5, this.camera.aspect);

    const boardW = lvl.width + 0.3;
    const boardH = lvl.height + 0.3;
    const distV = ((boardH * Math.sin(tiltRad) + 0.55) * 0.505) / halfTanV;
    const distH = (boardW * 0.505) / halfTanH;
    const dist = Math.max(distV, distH) / this.zoomFactor;

    this.camera.position.set(
      cx,
      0.25 + dist * Math.sin(tiltRad),
      lookZ + dist * Math.cos(tiltRad)
    );
    this.camera.lookAt(cx, 0.25, lookZ);
    this.camera.updateProjectionMatrix();
  }

  private clearBoardVisuals(): void {
    if (!this.scene) return;
    for (const bundle of this.staticBundles) {
      this.scene.remove(bundle.root);
      this.disposeBundle(bundle);
    }
    this.staticBundles = [];
    for (const src of this.sourceVisuals.values()) {
      this.scene.remove(src.root);
      this.disposeBundle(src);
    }
    this.sourceVisuals.clear();
    for (const g of this.logicVisuals.values()) {
      this.scene.remove(g.root);
      this.disposeBundle(g);
    }
    this.logicVisuals.clear();
    for (const t of this.targetVisuals.values()) {
      this.scene.remove(t.root);
      this.disposeBundle(t);
    }
    this.targetVisuals.clear();

    this.clearWireVisuals();

    if (this.albertaGroup) {
      this.scene.remove(this.albertaGroup);
      this.disposeObjectGeos(this.albertaGroup);
      for (const m of this.albertaCharMats) m.dispose();
      this.albertaCharMats = [];
      this.albertaGroup = null;
    }
  }

  private clearWireVisuals(): void {
    if (!this.scene) return;
    for (const wv of this.wireVisuals) {
      this.scene.remove(wv.root);
      this.disposeBundle(wv);
    }
    this.wireVisuals = [];
    if (this.activeWireVisual) {
      this.scene.remove(this.activeWireVisual.root);
      this.disposeBundle(this.activeWireVisual);
      this.activeWireVisual = null;
    }
    this.lastWiresHash = '';
    this.lastActiveWireHash = '';
  }

  private disposeObjectGeos(root: THREE.Object3D): void {
    const geos = new Set<THREE.BufferGeometry>();
    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh && m.geometry && !geos.has(m.geometry)) {
        geos.add(m.geometry);
        m.geometry.dispose();
      }
    });
  }

  private disposeBundle(bundle: AlbertaModelBundle): void {
    this.disposeObjectGeos(bundle.root);
    for (const m of bundle.ownedMaterials) m.dispose();
    for (const t of bundle.ownedTextures) t.dispose();
  }

  private loadLevel(index: number): void {
    this.levelIndex = index;
    const def = ALBERTA_LEVELS[index];
    this.state = createAlbertaState(def);
    this.tipVisible = false;
    this.noticeText = def.intro;
    this.noticeTimer = 5.5;
    this.stepProgress = 1;
    this.albertaYaw = FACING_YAW.right;
    this.currentWorldPos.set(this.state.alberta.x, 0, this.state.alberta.y);
    this.setClockPaused(false);
    this.lastBeatSec = -1;
    this.lastRhythmStructureKey = '';

    this.clearBoardVisuals();
    if (this.scene) {
      const floor = createWorkbenchFloor(def.width, def.height);
      this.scene.add(floor.root);
      this.staticBundles.push(floor);

      for (const block of def.blocks) {
        const blockSockets = this.state.sockets.filter((s) => s.blockId === block.id);
        if (block.kind === 'source') {
          const vis = createSourceCubeMesh(block, blockSockets);
          this.scene.add(vis.root);
          this.sourceVisuals.set(block.id, vis);
        } else if (block.kind === 'logic') {
          const vis = createLogicBlockMesh(block, blockSockets);
          this.scene.add(vis.root);
          this.logicVisuals.set(block.id, vis);
        } else {
          const vis = createTargetBlockMesh(block, blockSockets);
          this.scene.add(vis.root);
          this.targetVisuals.set(block.id, vis);
        }
      }

      const char = createStageCharacter(this.assets, 'alberta');
      this.albertaGroup = char.root;
      this.albertaCharMats = char.ownedMaterials;
      this.albertaGroup.scale.setScalar(1.08);
      this.albertaGroup.position.set(this.state.alberta.x, 0, this.state.alberta.y);
      this.albertaGroup.rotation.y = this.albertaYaw;
      this.scene.add(this.albertaGroup);
    }

    this.fitCameraToLevel();
    this.rebuildWiresIfNeeded(true);
    this.rebuildRhythmTable(true);
    this.refreshHud();
    this.refreshTipBox();
  }

  handleDirection(dir: Direction, nowMs: number): void {
    if (!this.active) return;
    if (nowMs - this.lastStepAt < STEP_REPEAT_MS) return;
    this.lastStepAt = nowMs;

    const events = moveAlberta(this.state, dir);
    if (this.state.alberta.movedThisTick) {
      this.stepProgress = 0;
      this.sounds.play('wire_step');
    } else if (events.some((e) => e.type === 'blocked')) {
      this.noticeText = 'Hier liegt bereits eine Leitung oder ein Baustein!';
      this.noticeTimer = 2.0;
    }
    this.rebuildWiresIfNeeded(false);
    this.refreshHud();
  }

  handleAction(action: InputAction): void {
    if (!this.active) return;
    if (action === 'confirm') {
      const events = interactSocket(this.state);
      this.handleEvents(events);
      this.refreshHud();
    } else if (action === 'undo') {
      const events = undoLastWire(this.state);
      this.handleEvents(events);
      this.refreshHud();
    } else if (action === 'restart') {
      this.loadLevel(this.levelIndex);
    } else if (action === 'tip') {
      this.tipVisible = !this.tipVisible;
      this.refreshTipBox();
    } else if (action === 'menu') {
      if (this.state.activeWire) {
        this.handleEvents(cancelActiveWire(this.state));
        this.refreshHud();
      } else {
        this.sounds.play('ui_click');
        this.close(true);
      }
    }
  }

  private handleEvents(events: AlbertaEvent[]): void {
    for (const ev of events) {
      switch (ev.type) {
        case 'wire_start':
        case 'wire_connect':
          this.sounds.play('wire_plug');
          break;
        case 'wire_unplug':
        case 'wire_cancel':
          this.sounds.play('wire_unplug');
          break;
        case 'target_match':
          this.sounds.play('target_match');
          break;
        case 'win':
          this.completedIds.add(this.state.level.id);
          this.sounds.play('win');
          break;
      }
    }
    this.rebuildWiresIfNeeded(true);
  }

  private handleCanvasPointerDown(e: PointerEvent): void {
    if (!this.active || !this.camera || !this.renderer || !this.scene) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);

    for (const hit of hits) {
      const socketId = hit.object.userData?.socketId as string | undefined;
      if (socketId) {
        const sock = this.state.sockets.find((s) => s.id === socketId);
        if (
          sock &&
          sock.accessX === this.state.alberta.x &&
          sock.accessY === this.state.alberta.y
        ) {
          this.handleEvents(interactSocket(this.state, socketId));
          this.refreshHud();
        } else if (sock) {
          const dx = sock.accessX - this.state.alberta.x;
          const dy = sock.accessY - this.state.alberta.y;
          if (dx !== 0 || dy !== 0) {
            const dir: Direction =
              Math.abs(dx) >= Math.abs(dy)
                ? dx > 0
                  ? 'right'
                  : 'left'
                : dy > 0
                  ? 'down'
                  : 'up';
            this.handleDirection(dir, performance.now());
          }
          if (
            sock.accessX !== this.state.alberta.x ||
            sock.accessY !== this.state.alberta.y
          ) {
            this.noticeText = 'Laufe direkt neben diese Steckdose zum Einstecken!';
            this.noticeTimer = 2.0;
            this.refreshHud();
          }
        }
        return;
      }

      const floorX = hit.object.userData?.floorX as number | undefined;
      const floorY = hit.object.userData?.floorY as number | undefined;
      if (floorX !== undefined && floorY !== undefined) {
        const dx = floorX - this.state.alberta.x;
        const dy = floorY - this.state.alberta.y;
        if (dx !== 0 || dy !== 0) {
          const dir: Direction =
            Math.abs(dx) >= Math.abs(dy)
              ? dx > 0
                ? 'right'
                : 'left'
              : dy > 0
                ? 'down'
                : 'up';
          this.handleDirection(dir, performance.now());
        }
        return;
      }
    }
  }

  private rebuildWiresIfNeeded(forceCompleted: boolean): void {
    if (!this.scene) return;
    const completedHash = JSON.stringify(
      this.state.wires.map((w) => [w.id, w.colorHex, w.path.length])
    );
    const activeHash = this.state.activeWire
      ? JSON.stringify([
          this.state.activeWire.startSocketId,
          this.state.activeWire.path.length,
          this.state.alberta.x,
          this.state.alberta.y
        ])
      : 'none';

    const crossings = computeWireCrossings(this.state.wires, this.state.activeWire);

    if (forceCompleted || completedHash !== this.lastWiresHash) {
      for (const wv of this.wireVisuals) {
        this.scene.remove(wv.root);
        this.disposeBundle(wv);
      }
      this.wireVisuals = [];
      this.lastWiresHash = completedHash;

      this.state.wires.forEach((wire, idx) => {
        const startSock = this.state.sockets.find((s) => s.id === wire.fromSocketId);
        const endSock = this.state.sockets.find((s) => s.id === wire.toSocketId);
        if (!startSock || !endSock) return;
        const wv = createWireMesh(
          wire.path,
          startSock,
          endSock,
          null,
          crossings[idx] ?? new Set<string>(),
          wire.colorHex
        );
        this.scene!.add(wv.root);
        this.wireVisuals.push(wv);
      });
    }

    if (this.state.activeWire && (forceCompleted || activeHash !== this.lastActiveWireHash)) {
      if (this.activeWireVisual) {
        this.scene.remove(this.activeWireVisual.root);
        this.disposeBundle(this.activeWireVisual);
        this.activeWireVisual = null;
      }
      const startSock = this.state.sockets.find(
        (s) => s.id === this.state.activeWire!.startSocketId
      );
      if (startSock) {
        const activeIdx = this.state.wires.length;
        const handPos = this.currentWorldPos
          .clone()
          .add(new THREE.Vector3(0.12, 0.45, 0.12));
        this.activeWireVisual = createWireMesh(
          this.state.activeWire.path,
          startSock,
          null,
          handPos,
          crossings[activeIdx] ?? new Set<string>(),
          this.state.activeWire.colorHex
        );
        this.scene.add(this.activeWireVisual.root);
      }
      this.lastActiveWireHash = activeHash;
    } else if (!this.state.activeWire && this.activeWireVisual) {
      this.scene.remove(this.activeWireVisual.root);
      this.disposeBundle(this.activeWireVisual);
      this.activeWireVisual = null;
      this.lastActiveWireHash = 'none';
    }
  }

  private refreshHud(): void {
    if (this.subtitleEl) {
      this.subtitleEl.textContent = `Aufgabe ${this.state.level.number}/${ALBERTA_LEVELS.length}: ${this.state.level.title}`;
    }

    if (this.levelPillsEl) {
      this.levelPillsEl.innerHTML = ALBERTA_LEVELS.map((lvl, idx) => {
        const done = this.completedIds.has(lvl.id);
        const cur = idx === this.levelIndex;
        return `<button class="studio-pill-btn ${cur ? 'active' : ''}" data-alberta-lvl="${idx}" type="button">${done ? '✅ ' : ''}${lvl.number}. ${lvl.subtitle}</button>`;
      }).join('');

      this.levelPillsEl
        .querySelectorAll<HTMLButtonElement>('[data-alberta-lvl]')
        .forEach((btn) => {
          btn.addEventListener('click', () => {
            this.sounds.play('ui_click');
            this.loadLevel(Number(btn.dataset.albertaLvl));
          });
        });
    }

    if (this.undoBtnEl) {
      const hasUndo = this.state.undoWires.length > 0 || Boolean(this.state.activeWire);
      this.undoBtnEl.toggleAttribute('disabled', !hasUndo);
    }

    const nearby = getNearbySocketAction(this.state);
    if (this.promptBtnEl) {
      if (nearby) {
        this.promptBtnEl.textContent = `${nearby.label} (Leertaste / Enter)`;
        this.promptBtnEl.classList.add('ready');
        this.promptBtnEl.disabled = false;
      } else if (this.state.activeWire) {
        this.promptBtnEl.textContent =
          this.noticeTimer > 0 && this.noticeText
            ? this.noticeText
            : '⚡ Kabel in der Hand – laufe zur passenden Steckdose!';
        this.promptBtnEl.classList.remove('ready');
        this.promptBtnEl.disabled = true;
      } else {
        this.promptBtnEl.textContent =
          this.noticeTimer > 0 && this.noticeText
            ? this.noticeText
            : '🥽 Lauft vor eine Steckdose zum Verkabeln!';
        this.promptBtnEl.classList.remove('ready');
        this.promptBtnEl.disabled = true;
      }
    }

    if (this.winBannerEl) {
      if (this.state.status === 'won') {
        const hasNext = this.levelIndex < ALBERTA_LEVELS.length - 1;
        this.winBannerEl.innerHTML = `
          <div class="alberta-win-title">🎉 Super getüftelt, Alberta!</div>
          <p class="alberta-win-sub">Alle Ziel-Glühbirnen leuchten genau im gewünschten Takt!</p>
          <div class="alberta-win-actions">
            ${
              hasNext
                ? `<button id="alberta-next-btn" class="btn btn-compact" type="button">➡️ Nächste Aufgabe</button>`
                : ''
            }
            <button id="alberta-replay-btn" class="btn btn-secondary btn-compact" type="button">🔄 Nochmal</button>
            <button id="alberta-win-map-btn" class="btn btn-secondary btn-compact" type="button">🗺️ Zur Karte</button>
          </div>
        `;
        this.winBannerEl.classList.remove('hidden');
        this.winBannerEl.querySelector('#alberta-next-btn')?.addEventListener('click', () => {
          this.sounds.play('ui_click');
          this.loadLevel(this.levelIndex + 1);
        });
        this.winBannerEl.querySelector('#alberta-replay-btn')?.addEventListener('click', () => {
          this.sounds.play('ui_click');
          this.loadLevel(this.levelIndex);
        });
        this.winBannerEl.querySelector('#alberta-win-map-btn')?.addEventListener('click', () => {
          this.sounds.play('ui_click');
          this.close(true);
        });
    } else {
        this.winBannerEl.classList.add('hidden');
      }
    }

    this.rebuildRhythmTable(false);
  }

  private rebuildRhythmTable(force: boolean): void {
    if (!this.rhythmTableEl) return;
    const displaySteps = getDisplayCycleLength(this.state.level);
    const wireKey = this.state.wires
      .map((w) => `${w.fromSocketId}>${w.toSocketId}`)
      .join(',');
    const structureKey = `${this.state.level.id}|${displaySteps}|${wireKey}`;
    if (!force && structureKey === this.lastRhythmStructureKey) return;
    this.lastRhythmStructureKey = structureKey;

    const compactClass = displaySteps > 12 ? ' is-compact' : '';
    const rows: string[] = [];

    const secBtns = Array.from({ length: displaySteps }, (_, i) => {
      return `<button class="alberta-rhythm-sec-btn" type="button" data-beat-col="${i}" data-beat-sec="${i}">${i + 1}</button>`;
    }).join('');
    rows.push(`
      <div class="alberta-rhythm-row is-header">
        <span class="alberta-rhythm-label">Sek.</span>
        <div class="alberta-rhythm-cells">${secBtns}</div>
      </div>
    `);

    const makeCells = (
      wave: boolean[] | undefined,
      colorCss: string,
      compareWave?: boolean[],
      unwired?: boolean
    ) => {
      return Array.from({ length: displaySteps }, (_, i) => {
        const on = !unwired && Boolean(wave?.[i]);
        const mismatch =
          !unwired && compareWave !== undefined && Boolean(wave?.[i]) !== Boolean(compareWave[i]);
        const cls = [
          'alberta-rhythm-cell',
          on ? 'is-on' : '',
          mismatch ? 'is-mismatch' : '',
          unwired ? 'is-unwired' : ''
        ]
          .filter(Boolean)
          .join(' ');
        return `<span class="${cls}" style="--cell-col:${colorCss}" data-beat-col="${i}" data-beat-sec="${i}"></span>`;
      }).join('');
    };

    for (const block of this.state.level.blocks) {
      if (block.kind !== 'source') continue;
      const meta = CLOCK_COLORS[block.period];
      const wave = this.state.blockOutputs[block.id];
      rows.push(`
        <div class="alberta-rhythm-row">
          <span class="alberta-rhythm-label"><i class="alberta-row-swatch" style="background:${meta.css}"></i>💡 ${block.period}s</span>
          <div class="alberta-rhythm-cells">${makeCells(wave, meta.css)}</div>
        </div>
      `);
    }

    const wiredTargets = new Set(this.state.wires.map((w) => w.toSocketId));
    for (const block of this.state.level.blocks) {
      if (block.kind !== 'logic') continue;
      const in0Wired = wiredTargets.has(`${block.id}:in0`);
      const in1Wired = wiredTargets.has(`${block.id}:in1`);
      if (!in0Wired && !in1Wired) continue;
      const gateName =
        block.gate === 'AND' ? 'UND' : block.gate === 'OR' ? 'ODER' : 'NICHT';
      const wave = this.state.blockOutputs[block.id];
      rows.push(`
        <div class="alberta-rhythm-row">
          <span class="alberta-rhythm-label">⚙️ ${gateName}</span>
          <div class="alberta-rhythm-cells">${makeCells(wave, '#ff922b')}</div>
        </div>
      `);
    }

    const targets = this.state.level.blocks.filter((b) => b.kind === 'target');
    targets.forEach((block, idx) => {
      if (block.kind !== 'target') return;
      const suffix = targets.length > 1 ? ` ${idx + 1}` : '';
      const matched = Boolean(this.state.targetMatched[block.id]);
      const inputSockId = `${block.id}:in0`;
      const isWired = wiredTargets.has(inputSockId);
      const inWave = this.state.socketWaveforms[inputSockId];

      rows.push(`
        <div class="alberta-rhythm-row is-target">
          <span class="alberta-rhythm-label">🎯 Ziel${suffix}${matched ? ' ✅' : ''}</span>
          <div class="alberta-rhythm-cells">${makeCells(block.targetWaveform, '#51cf66')}</div>
        </div>
        <div class="alberta-rhythm-row is-input">
          <span class="alberta-rhythm-label">🔌 Dein${suffix}</span>
          <div class="alberta-rhythm-cells">${makeCells(inWave, matched ? '#40c057' : '#ffd43b', block.targetWaveform, !isWired)}</div>
        </div>
      `);
    });

    this.rhythmTableEl.className = `alberta-rhythm-table${compactClass}`;
    this.rhythmTableEl.style.setProperty('--beat-count', String(displaySteps));
    this.rhythmTableEl.innerHTML = rows.join('');

    this.rhythmTableEl
      .querySelectorAll<HTMLElement>('[data-beat-sec]')
      .forEach((el) => {
        el.addEventListener('click', () => {
          const sec = Number(el.dataset.beatSec ?? 0);
          this.setClockPaused(true);
          this.clockTime = sec + 0.05;
          const tickIdx = Math.floor(this.clockTime) % CYCLE_LENGTH;
          this.syncSignalVisuals(tickIdx);
          this.renderFrame();
        });
      });

    this.lastBeatSec = -1;
    const tickIdx = Math.floor(this.clockTime) % CYCLE_LENGTH;
    this.syncRhythmPlayhead(tickIdx, displaySteps);
  }

  private syncRhythmPlayhead(tickIdx: number, displaySteps: number): void {
    const col = tickIdx % displaySteps;
    if (this.rhythmSecBadgeEl) {
      this.rhythmSecBadgeEl.textContent = `⏱ ${col + 1}s / ${displaySteps}s`;
    }
    if (!this.rhythmTableEl || this.lastBeatSec === tickIdx) return;
    this.lastBeatSec = tickIdx;

    this.rhythmTableEl
      .querySelectorAll<HTMLElement>('[data-beat-col].is-now')
      .forEach((el) => el.classList.remove('is-now'));
    this.rhythmTableEl
      .querySelectorAll<HTMLElement>(`[data-beat-col="${col}"]`)
      .forEach((el) => el.classList.add('is-now'));
  }

  private syncSignalVisuals(tickIdx: number): void {
    const displaySteps = getDisplayCycleLength(this.state.level);
    this.syncRhythmPlayhead(tickIdx, displaySteps);

    for (const block of this.state.level.blocks) {
      if (block.kind === 'source') {
        const wave = this.state.blockOutputs[block.id];
        const lit = Boolean(wave?.[tickIdx]);
        this.sourceVisuals.get(block.id)?.setLit(lit);
      } else if (block.kind === 'logic') {
        const wave = this.state.blockOutputs[block.id];
        const lit = Boolean(wave?.[tickIdx]);
        this.logicVisuals.get(block.id)?.setOutputLit(lit);
      } else {
        const inWave = this.state.socketWaveforms[`${block.id}:in0`];
        const inputLit = Boolean(inWave?.[tickIdx]);
        const targetLit = Boolean(block.targetWaveform[tickIdx]);
        const matched = Boolean(this.state.targetMatched[block.id]);
        this.targetVisuals.get(block.id)?.setStates(inputLit, targetLit, matched);
      }
    }

    this.state.wires.forEach((wire, idx) => {
      const wave = this.state.socketWaveforms[wire.fromSocketId];
      const on = Boolean(wave?.[tickIdx]);
      this.wireVisuals[idx]?.updateSignal(on, this.elapsed);
    });
    if (this.activeWireVisual && this.state.activeWire) {
      const wave = this.state.socketWaveforms[this.state.activeWire.startSocketId];
      const on = Boolean(wave?.[tickIdx]);
      this.activeWireVisual.updateSignal(on, this.elapsed);
    }
  }

  private refreshTipBox(): void {
    if (!this.tipBoxEl) return;
    if (this.tipVisible) {
      this.tipBoxEl.innerHTML = `<strong>💡 Albertas Tipp:</strong> ${this.state.level.tip}`;
      this.tipBoxEl.classList.remove('hidden');
    } else {
      this.tipBoxEl.classList.add('hidden');
    }
  }

  update(dt: number): void {
    if (!this.active) return;

    this.elapsed += dt;
    if (!this.clockPaused) {
      this.clockTime += dt;
    }
    if (this.noticeTimer > 0) {
      this.noticeTimer = Math.max(0, this.noticeTimer - dt);
      if (this.noticeTimer === 0) {
        this.refreshHud();
      }
    }

    // Smooth step interpolation for Alberta
    if (this.stepProgress < 1) {
      this.stepProgress = Math.min(1, this.stepProgress + dt / (STEP_REPEAT_MS / 1000));
    }
    const ease = this.stepProgress * this.stepProgress * (3 - 2 * this.stepProgress);
    const wx = THREE.MathUtils.lerp(this.state.alberta.prevX, this.state.alberta.x, ease);
    const wz = THREE.MathUtils.lerp(this.state.alberta.prevY, this.state.alberta.y, ease);
    this.currentWorldPos.set(wx, 0, wz);

    if (this.albertaGroup) {
      const targetYaw = FACING_YAW[this.state.alberta.facing];
      let dYaw = targetYaw - this.albertaYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      this.albertaYaw += dYaw * Math.min(1, dt * 16);

      this.albertaGroup.position.set(wx, 0, wz);
      this.albertaGroup.rotation.y = this.albertaYaw;
      animateCharacterWalk(
        this.albertaGroup,
        this.elapsed,
        this.stepProgress < 0.98,
        Boolean(this.state.activeWire),
        this.state.status === 'won'
      );
    }

    // Keep dragged wire endpoint smoothly glued while Alberta moves
    if (this.state.activeWire && (this.stepProgress < 0.995 || this.lastActiveWireHash === 'none')) {
      this.lastActiveWireHash = '';
      this.rebuildWiresIfNeeded(false);
    }

    // Discrete 1-second clock drives all blinking bulbs, wires, and live rhythm table
    const tickIdx = Math.floor(this.clockTime) % CYCLE_LENGTH;
    this.syncSignalVisuals(tickIdx);

    // Highlight adjacent socket + all compatible target sockets when holding a cable
    const nearby = getNearbySocketAction(this.state);
    const highlightId = nearby?.socket.id ?? null;
    const compatibleIds = new Set<string>();
    const activeWire = this.state.activeWire;
    if (activeWire) {
      const usedSockets = new Set<string>();
      for (const w of this.state.wires) {
        usedSockets.add(w.fromSocketId);
        usedSockets.add(w.toSocketId);
      }
      for (const s of this.state.sockets) {
        if (
          s.id !== activeWire.startSocketId &&
          s.role !== activeWire.startRole &&
          s.blockId !== activeWire.startBlockId &&
          !usedSockets.has(s.id)
        ) {
          compatibleIds.add(s.id);
        }
      }
    }

    const ringPulse = 0.5 + 0.5 * Math.sin(this.elapsed * 7.5);
    const updateRingMap = (rings: Map<string, THREE.Mesh>) => {
      for (const [sockId, ring] of rings.entries()) {
        const hl: SocketHighlightState =
          sockId === highlightId
            ? 'nearby'
            : compatibleIds.has(sockId)
              ? 'compatible'
              : 'idle';
        setSocketRingVisual(ring, hl, ringPulse);
      }
    };
    for (const s of this.sourceVisuals.values()) updateRingMap(s.socketRings);
    for (const g of this.logicVisuals.values()) updateRingMap(g.socketRings);
    for (const t of this.targetVisuals.values()) updateRingMap(t.socketRings);

    this.renderFrame();
  }

  private renderFrame(): void {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private cleanupScene(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.clearBoardVisuals();
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('pointerdown', this.boundPointerDown);
      this.renderer.domElement.removeEventListener('wheel', this.boundWheel);
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}
