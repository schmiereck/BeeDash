import * as THREE from 'three';
import { AssetFactory } from './assetFactory';
import {
  applyStorybookCelShading,
  CelShadingHandle
} from './celShading';
import {
  buildStudioStageItem,
  disposeStudioInstance,
  STUDIO_BEE_TRICKS,
  STUDIO_ITEMS,
  STUDIO_POSES,
  StudioBeeTrick,
  StudioCategory,
  StudioItemSpec,
  StudioStageInstance,
  StudioToggleState
} from './studioCatalog';
import { CharacterPose } from './suitcaseCharacters';

export interface StudioOverlayCallbacks {
  onClose: () => void;
  onPreviewSuitcaseScene: (sceneIndex: number) => void;
}

const CATEGORY_TABS: Array<{ id: StudioCategory; emoji: string; label: string }> = [
  { id: 'characters', emoji: '🧍', label: 'Figuren' },
  { id: 'scenes', emoji: '🧳', label: 'Koffer-Szenen' },
  { id: 'objects', emoji: '🍯', label: 'Objekte' }
];

export class StudioOverlay {
  private root: HTMLElement;
  private assets: AssetFactory;
  private callbacks: StudioOverlayCallbacks;

  private active = false;
  private pausedForPreview = false;
  private activeCategory: StudioCategory = 'characters';
  private activeItem: StudioItemSpec = STUDIO_ITEMS[0];
  private activePose: CharacterPose = 'wave';
  private toggles: StudioToggleState = {
    sticky: false,
    dizzy: false,
    bowlFilled: true,
    platePressed: false,
    suitcaseOpen: true
  };
  private activeBeeTrick: { kind: StudioBeeTrick; age: number; duration: number } | null =
    null;

  private animPaused = false;
  private autoRotate = true;
  private celShaded = true;
  private elapsed = 0;
  private revealElapsed = 0;

  // Orbit camera state
  private yaw = 0.38;
  private pitch = 0.25;
  private radius = 3.4;
  private isDragging = false;
  private activePointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Three.js scene resources
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private accentLight: THREE.PointLight | null = null;
  private pedestalGroup: THREE.Group | null = null;
  private pedestalTopGeo: THREE.CylinderGeometry | null = null;
  private pedestalRimGeo: THREE.CylinderGeometry | null = null;
  private pedestalTopMat: THREE.MeshStandardMaterial | null = null;
  private pedestalRimMat: THREE.MeshStandardMaterial | null = null;
  private instance: StudioStageInstance | null = null;
  private celHandle: CelShadingHandle | null = null;

  // DOM handles
  private canvasWrapEl: HTMLElement | null = null;
  private sourceBadgeEl: HTMLElement | null = null;
  private tabsEl: HTMLElement | null = null;
  private itemListEl: HTMLElement | null = null;
  private contextBarEl: HTMLElement | null = null;
  private itemDescEl: HTMLElement | null = null;
  private pauseBtnEl: HTMLButtonElement | null = null;
  private autoRotateBtnEl: HTMLButtonElement | null = null;
  private celBtnEl: HTMLButtonElement | null = null;

  // Bound event listeners
  private boundPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  private boundPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
  private boundPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
  private boundWheel = (e: WheelEvent) => this.handleWheel(e);

  constructor(
    root: HTMLElement,
    assets: AssetFactory,
    callbacks: StudioOverlayCallbacks
  ) {
    this.root = root;
    this.assets = assets;
    this.callbacks = callbacks;
  }

  isActive(): boolean {
    return this.active;
  }

  setPausedForPreview(paused: boolean): void {
    if (!this.active) return;
    this.pausedForPreview = paused;
    if (paused) {
      this.root.classList.add('hidden');
    } else {
      this.root.classList.remove('hidden');
      this.syncRendererSize();
      this.renderFrame();
    }
  }

  open(initialItemId?: string): void {
    this.cleanupSceneResources();

    const chosen =
      (initialItemId ? STUDIO_ITEMS.find((i) => i.id === initialItemId) : undefined) ??
      STUDIO_ITEMS[0];
    this.active = true;
    this.pausedForPreview = false;
    this.activeCategory = chosen.category;
    this.activeItem = chosen;
    this.activeBeeTrick = null;
    this.animPaused = false;
    this.autoRotate = true;
    this.elapsed = 0;
    this.revealElapsed = 0;

    this.root.innerHTML = `
      <div class="studio-shell">
        <header class="studio-header">
          <div class="studio-title-wrap">
            <h2 class="studio-title">🎭 BeeDash 3D-Atelier</h2>
            <span id="studio-source-badge" class="studio-source-badge">Prozedurales 3D-Modell</span>
          </div>
          <button id="studio-close-btn" class="btn btn-secondary btn-compact" type="button">✖️ Schließen</button>
        </header>
        <div class="studio-body">
          <aside class="studio-sidebar">
            <div id="studio-tabs" class="studio-tabs" role="tablist"></div>
            <div id="studio-item-list" class="studio-item-list" role="listbox"></div>
          </aside>
          <section class="studio-viewport">
            <div id="studio-context-bar" class="studio-context-bar"></div>
            <div id="studio-canvas-wrap" class="studio-canvas-wrap" title="Ziehen zum Drehen • Mausrad zum Zoomen"></div>
            <div class="studio-bottom-bar">
              <div id="studio-item-desc" class="studio-item-desc"></div>
              <div class="studio-controls-row">
                <button id="studio-pause-btn" class="studio-pill-btn" type="button">⏸️ Pause</button>
                <button id="studio-autorotate-btn" class="studio-pill-btn active" type="button">🔁 Auto-Drehen: An</button>
                <button id="studio-cel-btn" class="studio-pill-btn active" type="button">🖍️ Buch-Stil: An</button>
                <button id="studio-zoom-out" class="studio-pill-btn" type="button" aria-label="Herauszoomen">➖</button>
                <button id="studio-zoom-in" class="studio-pill-btn" type="button" aria-label="Heranzoomen">➕</button>
                <button id="studio-reset-view" class="studio-pill-btn" type="button">🎯 Ansicht zurücksetzen</button>
                <span class="studio-hint">Ziehen = Drehen • Mausrad = Zoom • Esc = Schließen</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
    this.root.classList.remove('hidden');

    this.sourceBadgeEl = this.root.querySelector('#studio-source-badge');
    this.tabsEl = this.root.querySelector('#studio-tabs');
    this.itemListEl = this.root.querySelector('#studio-item-list');
    this.contextBarEl = this.root.querySelector('#studio-context-bar');
    this.canvasWrapEl = this.root.querySelector('#studio-canvas-wrap');
    this.itemDescEl = this.root.querySelector('#studio-item-desc');
    this.pauseBtnEl = this.root.querySelector('#studio-pause-btn');
    this.autoRotateBtnEl = this.root.querySelector('#studio-autorotate-btn');
    this.celBtnEl = this.root.querySelector('#studio-cel-btn');

    this.root.querySelector('#studio-close-btn')?.addEventListener('click', () => {
      this.close();
    });

    this.pauseBtnEl?.addEventListener('click', () => {
      this.animPaused = !this.animPaused;
      this.syncPlaybackButtons();
    });

    this.autoRotateBtnEl?.addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      this.syncPlaybackButtons();
    });

    this.celBtnEl?.addEventListener('click', () => {
      this.celShaded = !this.celShaded;
      this.applyCelShadingMode();
      this.syncPlaybackButtons();
      this.renderFrame();
    });

    this.root.querySelector('#studio-zoom-out')?.addEventListener('click', () => {
      this.adjustZoom(0.45);
    });

    this.root.querySelector('#studio-zoom-in')?.addEventListener('click', () => {
      this.adjustZoom(-0.45);
    });

    this.root.querySelector('#studio-reset-view')?.addEventListener('click', () => {
      this.resetCameraToItem(this.activeItem);
      this.renderFrame();
    });

    this.initScene();
    this.renderTabs();
    this.selectItem(chosen, true);
    this.syncPlaybackButtons();
  }

  close(notify = true): void {
    const wasActive = this.active;
    this.active = false;
    this.pausedForPreview = false;
    this.cleanupSceneResources();

    this.root.classList.add('hidden');
    this.root.innerHTML = '';

    if (wasActive && notify) {
      this.callbacks.onClose();
    }
  }

  update(dt: number): void {
    if (!this.active || this.pausedForPreview || !this.instance) return;
    const safeDt = Math.min(Math.max(dt, 0), 0.05);

    if (!this.animPaused) {
      this.elapsed += safeDt;
      this.revealElapsed += safeDt;

      if (this.activeBeeTrick) {
        this.activeBeeTrick.age += safeDt;
        if (this.activeBeeTrick.age >= this.activeBeeTrick.duration) {
          this.activeBeeTrick = null;
          this.renderContextBar();
        }
      }

      const trickState = this.activeBeeTrick
        ? {
            kind: this.activeBeeTrick.kind,
            progress: THREE.MathUtils.clamp(
              this.activeBeeTrick.age / this.activeBeeTrick.duration,
              0,
              1
            )
          }
        : null;

      this.instance.update(this.elapsed, safeDt, {
        pose: this.activePose,
        toggles: this.toggles,
        revealElapsed: this.revealElapsed,
        beeTrick: trickState
      });
    }

    if (this.autoRotate && !this.animPaused && !this.isDragging) {
      this.yaw += safeDt * 0.42;
    }

    this.updateCameraTransform();
    this.renderFrame();
  }

  private initScene(): void {
    if (!this.canvasWrapEl) return;

    const scene = new THREE.Scene();
    this.scene = scene;

    const w = Math.max(this.canvasWrapEl.clientWidth, 320);
    const h = Math.max(this.canvasWrapEl.clientHeight, 240);
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 80);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0xf8ecd1, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;
    this.canvasWrapEl.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xfff4d9, 0x8f6234, 1.05);
    this.hemiLight = hemiLight;
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6dc, 1.35);
    keyLight.position.set(4.5, 7.5, 5.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    const d = 4.6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    this.keyLight = keyLight;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffcf77, 0.48);
    rimLight.position.set(-4.2, 3.6, -4.4);
    scene.add(rimLight);

    const accentLight = new THREE.PointLight(0xffd07a, 0.85, 16, 1.5);
    accentLight.position.set(-2.2, 3.2, 2.4);
    this.accentLight = accentLight;
    scene.add(accentLight);

    // Ground turntable pedestal with top sitting cleanly at y = 0
    const pedestalGroup = new THREE.Group();
    this.pedestalTopGeo = new THREE.CylinderGeometry(1, 1.04, 0.16, 40);
    this.pedestalTopMat = new THREE.MeshStandardMaterial({
      color: 0xdfb97a,
      roughness: 0.82
    });
    const topDisc = new THREE.Mesh(this.pedestalTopGeo, this.pedestalTopMat);
    topDisc.position.y = -0.08;
    topDisc.receiveShadow = true;
    pedestalGroup.add(topDisc);

    this.pedestalRimGeo = new THREE.CylinderGeometry(1.07, 1.1, 0.08, 40);
    this.pedestalRimMat = new THREE.MeshStandardMaterial({
      color: 0x8d5832,
      roughness: 0.72
    });
    const rimDisc = new THREE.Mesh(this.pedestalRimGeo, this.pedestalRimMat);
    rimDisc.position.y = -0.14;
    rimDisc.receiveShadow = true;
    pedestalGroup.add(rimDisc);

    this.pedestalGroup = pedestalGroup;
    scene.add(pedestalGroup);

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', this.boundPointerDown);
    dom.addEventListener('pointermove', this.boundPointerMove);
    dom.addEventListener('pointerup', this.boundPointerUp);
    dom.addEventListener('pointercancel', this.boundPointerUp);
    dom.addEventListener('wheel', this.boundWheel, { passive: false });

    this.resizeObserver = new ResizeObserver(() => {
      this.syncRendererSize();
      this.renderFrame();
    });
    this.resizeObserver.observe(this.canvasWrapEl);
  }

  private syncRendererSize(): void {
    if (!this.canvasWrapEl || !this.renderer || !this.camera) return;
    const w = Math.max(this.canvasWrapEl.clientWidth, 1);
    const h = Math.max(this.canvasWrapEl.clientHeight, 1);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private renderTabs(): void {
    if (!this.tabsEl) return;
    this.tabsEl.innerHTML = CATEGORY_TABS.map((tab) => {
      const activeClass = tab.id === this.activeCategory ? 'active' : '';
      return `<button class="studio-tab ${activeClass}" data-cat="${tab.id}" type="button">${tab.emoji} ${tab.label}</button>`;
    }).join('');

    this.tabsEl.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextCat = btn.dataset.cat as StudioCategory;
        if (!nextCat || nextCat === this.activeCategory) return;
        this.activeCategory = nextCat;
        this.renderTabs();
        const firstInCat = STUDIO_ITEMS.find((item) => item.category === nextCat);
        if (firstInCat) {
          this.selectItem(firstInCat, true);
        }
      });
    });

    this.renderItemList();
  }

  private renderItemList(): void {
    if (!this.itemListEl) return;
    const items = STUDIO_ITEMS.filter((item) => item.category === this.activeCategory);
    this.itemListEl.innerHTML = items
      .map((item) => {
        const activeClass = item.id === this.activeItem.id ? 'active' : '';
        return `
          <button class="studio-item ${activeClass}" data-item-id="${item.id}" type="button">
            <span class="studio-item-emoji">${item.emoji}</span>
            <span class="studio-item-label">${item.label}</span>
          </button>
        `;
      })
      .join('');

    this.itemListEl.querySelectorAll<HTMLButtonElement>('[data-item-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const spec = STUDIO_ITEMS.find((i) => i.id === btn.dataset.itemId);
        if (spec) {
          this.selectItem(spec, spec.id !== this.activeItem.id);
        }
      });
    });
  }

  private selectItem(spec: StudioItemSpec, resetView: boolean): void {
    if (!this.scene) return;

    this.celHandle?.restore();
    this.celHandle = null;

    if (this.instance) {
      this.scene.remove(this.instance.root);
      disposeStudioInstance(this.instance);
      this.instance = null;
    }

    this.activeItem = spec;
    this.activeCategory = spec.category;
    this.activeBeeTrick = null;
    this.elapsed = 0;
    this.revealElapsed = 0;

    if (resetView) {
      this.resetCameraToItem(spec);
    }

    const built = buildStudioStageItem(spec, this.assets);
    this.instance = built;
    this.scene.add(built.root);

    if (this.pedestalGroup && this.pedestalTopMat) {
      this.pedestalGroup.scale.set(spec.pedestalRadius, 1, spec.pedestalRadius);
      this.pedestalTopMat.color.setHex(built.floorColor);
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(built.ambientColor);
    }
    if (this.accentLight) {
      this.accentLight.color.setHex(built.accentColor);
    }
    if (this.sourceBadgeEl) {
      this.sourceBadgeEl.textContent = built.isCustomGlb
        ? 'Custom GLB-Modell'
        : 'Prozedurales 3D-Modell';
      this.sourceBadgeEl.classList.toggle('is-glb', built.isCustomGlb);
    }
    if (this.itemDescEl) {
      this.itemDescEl.textContent = `${spec.emoji} ${spec.label}: ${spec.description}`;
    }

    // Populate initial pose/state once immediately
    built.update(0, 0.016, {
      pose: this.activePose,
      toggles: this.toggles,
      revealElapsed: spec.sceneIndex !== undefined ? 0.05 : 1,
      beeTrick: null
    });

    this.applyCelShadingMode();
    this.renderItemList();
    this.renderContextBar();
    this.updateCameraTransform();
    this.renderFrame();
  }

  private applyCelShadingMode(): void {
    this.celHandle?.restore();
    this.celHandle = null;
    if (this.celShaded && this.instance) {
      this.celHandle = applyStorybookCelShading(this.instance.root);
    }
  }

  private renderContextBar(): void {
    if (!this.contextBarEl) return;
    const item = this.activeItem;

    if (item.characterKey) {
      const poseBtns = STUDIO_POSES.map((p) => {
        const activeClass = p.id === this.activePose ? 'active' : '';
        return `<button class="studio-pill-btn ${activeClass}" data-pose="${p.id}" type="button">${p.emoji} ${p.label}</button>`;
      }).join('');
      this.contextBarEl.innerHTML = `<span class="studio-context-label">Pose:</span>${poseBtns}`;
      this.contextBarEl
        .querySelectorAll<HTMLButtonElement>('[data-pose]')
        .forEach((btn) => {
          btn.addEventListener('click', () => {
            const pose = btn.dataset.pose as CharacterPose;
            if (!pose) return;
            this.activePose = pose;
            this.applyImmediateStateUpdate();
            this.renderContextBar();
          });
        });
      return;
    }

    if (item.isBee) {
      const trickBtns = STUDIO_BEE_TRICKS.map((t) => {
        const activeClass = this.activeBeeTrick?.kind === t.id ? 'active' : '';
        return `<button class="studio-pill-btn ${activeClass}" data-trick="${t.id}" type="button">${t.emoji} ${t.label}</button>`;
      }).join('');
      const stickyActive = this.toggles.sticky ? 'active' : '';
      const stickyLabel = this.toggles.sticky ? '🍯 Verklebt: An' : '🍯 Verklebt: Aus';
      const dizzyActive = this.toggles.dizzy ? 'active' : '';
      const dizzyLabel = this.toggles.dizzy ? '💫 Betäubt: An' : '💫 Betäubt: Aus';
      this.contextBarEl.innerHTML = `
        <span class="studio-context-label">Tricks:</span>
        ${trickBtns}
        <button id="studio-toggle-sticky" class="studio-pill-btn ${stickyActive}" type="button">${stickyLabel}</button>
        <button id="studio-toggle-dizzy" class="studio-pill-btn ${dizzyActive}" type="button">${dizzyLabel}</button>
      `;
      this.contextBarEl
        .querySelectorAll<HTMLButtonElement>('[data-trick]')
        .forEach((btn) => {
          btn.addEventListener('click', () => {
            const kind = btn.dataset.trick as StudioBeeTrick;
            if (!kind) return;
            this.animPaused = false;
            this.syncPlaybackButtons();
            this.activeBeeTrick = { kind, age: 0, duration: 0.95 };
            this.renderContextBar();
          });
        });
      this.contextBarEl
        .querySelector('#studio-toggle-sticky')
        ?.addEventListener('click', () => {
          this.toggles.sticky = !this.toggles.sticky;
          this.applyImmediateStateUpdate();
          this.renderContextBar();
        });
      this.contextBarEl
        .querySelector('#studio-toggle-dizzy')
        ?.addEventListener('click', () => {
          this.toggles.dizzy = !this.toggles.dizzy;
          if (this.toggles.dizzy) {
            this.activeBeeTrick = null;
            this.animPaused = false;
            this.syncPlaybackButtons();
          }
          this.applyImmediateStateUpdate();
          this.renderContextBar();
        });
      return;
    }

    if (item.sceneIndex !== undefined) {
      const sceneIndex = item.sceneIndex;
      this.contextBarEl.innerHTML = `
        <button id="studio-replay-reveal" class="studio-pill-btn" type="button">🌱 Aufbau neu starten</button>
        <button id="studio-preview-suitcase" class="btn btn-green btn-compact" type="button">🎬 Volle Koffer-Öffnung abspielen</button>
      `;
      this.contextBarEl
        .querySelector('#studio-replay-reveal')
        ?.addEventListener('click', () => {
          this.animPaused = false;
          this.syncPlaybackButtons();
          this.revealElapsed = 0;
          this.elapsed = 0;
        });
      this.contextBarEl
        .querySelector('#studio-preview-suitcase')
        ?.addEventListener('click', () => {
          this.callbacks.onPreviewSuitcaseScene(sceneIndex);
        });
      return;
    }

    if (item.toggleKind === 'bowl') {
      const label = this.toggles.bowlFilled
        ? '🥣 Zustand: Gefüllt'
        : '🥣 Zustand: Leer';
      this.contextBarEl.innerHTML = `
        <span class="studio-context-label">Zustand:</span>
        <button id="studio-toggle-bowl" class="studio-pill-btn ${
          this.toggles.bowlFilled ? 'active' : ''
        }" type="button">${label}</button>
      `;
      this.contextBarEl
        .querySelector('#studio-toggle-bowl')
        ?.addEventListener('click', () => {
          this.toggles.bowlFilled = !this.toggles.bowlFilled;
          this.applyImmediateStateUpdate(0.25);
          this.renderContextBar();
        });
      return;
    }

    if (item.toggleKind === 'plate') {
      const label = this.toggles.platePressed
        ? '🌺 Zustand: Gedrückt'
        : '🌺 Zustand: Frei';
      this.contextBarEl.innerHTML = `
        <span class="studio-context-label">Zustand:</span>
        <button id="studio-toggle-plate" class="studio-pill-btn ${
          this.toggles.platePressed ? 'active' : ''
        }" type="button">${label}</button>
      `;
      this.contextBarEl
        .querySelector('#studio-toggle-plate')
        ?.addEventListener('click', () => {
          this.toggles.platePressed = !this.toggles.platePressed;
          this.applyImmediateStateUpdate(0.25);
          this.renderContextBar();
        });
      return;
    }

    if (item.toggleKind === 'suitcase') {
      const label = this.toggles.suitcaseOpen
        ? '🧳 Koffer: Offen'
        : '🧳 Koffer: Geschlossen';
      this.contextBarEl.innerHTML = `
        <span class="studio-context-label">Zustand:</span>
        <button id="studio-toggle-suitcase" class="studio-pill-btn ${
          this.toggles.suitcaseOpen ? 'active' : ''
        }" type="button">${label}</button>
      `;
      this.contextBarEl
        .querySelector('#studio-toggle-suitcase')
        ?.addEventListener('click', () => {
          this.toggles.suitcaseOpen = !this.toggles.suitcaseOpen;
          this.applyImmediateStateUpdate(0.25);
          this.renderContextBar();
        });
      return;
    }

    this.contextBarEl.innerHTML = `<span class="studio-context-label">Vorschau:</span><span class="studio-context-note">Frei drehbar & zoombar</span>`;
  }

  private applyImmediateStateUpdate(dtHint = 0.016): void {
    if (!this.instance) return;
    this.instance.update(this.elapsed, dtHint, {
      pose: this.activePose,
      toggles: this.toggles,
      revealElapsed: this.revealElapsed,
      beeTrick: null
    });
    this.renderFrame();
  }

  private syncPlaybackButtons(): void {
    if (this.pauseBtnEl) {
      this.pauseBtnEl.textContent = this.animPaused ? '▶️ Weiter' : '⏸️ Pause';
      this.pauseBtnEl.classList.toggle('active', this.animPaused);
    }
    if (this.autoRotateBtnEl) {
      this.autoRotateBtnEl.textContent = this.autoRotate
        ? '🔁 Auto-Drehen: An'
        : '🔁 Auto-Drehen: Aus';
      this.autoRotateBtnEl.classList.toggle('active', this.autoRotate);
    }
    if (this.celBtnEl) {
      this.celBtnEl.textContent = this.celShaded
        ? '🖍️ Buch-Stil: An'
        : '🖍️ Buch-Stil: Aus';
      this.celBtnEl.classList.toggle('active', this.celShaded);
    }
  }

  private resetCameraToItem(spec: StudioItemSpec): void {
    this.yaw = spec.defaultYaw;
    this.pitch = spec.defaultPitch;
    this.radius = spec.defaultRadius;
    this.updateCameraTransform();
  }

  private adjustZoom(delta: number): void {
    this.radius = THREE.MathUtils.clamp(
      this.radius + delta,
      this.activeItem.minRadius,
      this.activeItem.maxRadius
    );
    this.updateCameraTransform();
    this.renderFrame();
  }

  private updateCameraTransform(): void {
    if (!this.camera) return;
    const targetY = this.activeItem.targetY;
    const cosPitch = Math.cos(this.pitch);
    const camX = Math.sin(this.yaw) * cosPitch * this.radius;
    const camY = targetY + Math.sin(this.pitch) * this.radius;
    const camZ = Math.cos(this.yaw) * cosPitch * this.radius;
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(0, targetY, 0);
  }

  private renderFrame(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  private handlePointerDown(e: PointerEvent): void {
    const dom = this.renderer?.domElement;
    if (!dom) return;
    this.isDragging = true;
    this.activePointerId = e.pointerId;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    dom.classList.add('is-dragging');
    try {
      dom.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events in tests or unsupported browsers
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.yaw -= dx * 0.01;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.008, -0.22, 1.15);
    this.updateCameraTransform();
    this.renderFrame();
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
    const dom = this.renderer?.domElement;
    this.isDragging = false;
    this.activePointerId = null;
    dom?.classList.remove('is-dragging');
    try {
      if (dom?.hasPointerCapture(e.pointerId)) {
        dom.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore synthetic events
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * Math.min(0.85, Math.abs(e.deltaY) * 0.004);
    this.adjustZoom(delta);
  }

  private cleanupSceneResources(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('pointerdown', this.boundPointerDown);
      dom.removeEventListener('pointermove', this.boundPointerMove);
      dom.removeEventListener('pointerup', this.boundPointerUp);
      dom.removeEventListener('pointercancel', this.boundPointerUp);
      dom.removeEventListener('wheel', this.boundWheel);
    }

    this.isDragging = false;
    this.activePointerId = null;

    this.celHandle?.restore();
    this.celHandle = null;

    if (this.instance && this.scene) {
      this.scene.remove(this.instance.root);
    }
    if (this.instance) {
      disposeStudioInstance(this.instance);
      this.instance = null;
    }

    this.pedestalTopGeo?.dispose();
    this.pedestalTopGeo = null;
    this.pedestalRimGeo?.dispose();
    this.pedestalRimGeo = null;
    this.pedestalTopMat?.dispose();
    this.pedestalTopMat = null;
    this.pedestalRimMat?.dispose();
    this.pedestalRimMat = null;
    this.pedestalGroup = null;

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.hemiLight = null;
    this.keyLight = null;
    this.accentLight = null;
    this.canvasWrapEl = null;
    this.sourceBadgeEl = null;
    this.tabsEl = null;
    this.itemListEl = null;
    this.contextBarEl = null;
    this.itemDescEl = null;
    this.pauseBtnEl = null;
    this.autoRotateBtnEl = null;
    this.celBtnEl = null;
  }
}
