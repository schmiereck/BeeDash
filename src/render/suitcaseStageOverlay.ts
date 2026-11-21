import * as THREE from 'three';
import { Direction, LevelDefinition } from '../game/types';
import { AssetFactory } from './assetFactory';
import {
  createMagicGlowTexture,
  getSuitcaseSceneForLevel,
  SuitcaseSceneDefinition,
  SuitcaseSceneRuntime
} from './suitcaseScenes';

export interface SuitcaseStageCallbacks {
  onZoomStart?: () => void;
  onLidOpen?: () => void;
  onContinue: () => void;
}

interface SparkleMote {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  baseX: number;
  baseZ: number;
  baseSize: number;
  speed: number;
  phase: number;
  twinkleSpeed: number;
  maxH: number;
}

function easeOutCubic(t: number): number {
  const u = 1 - THREE.MathUtils.clamp(t, 0, 1);
  return 1 - u * u * u;
}

function easeOutBack(t: number): number {
  const c1 = 1.45;
  const c3 = c1 + 1;
  const u = THREE.MathUtils.clamp(t, 0, 1) - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

function hasCustomModelAncestor(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData?.isCustomModel) return true;
    cur = cur.parent;
  }
  return false;
}

export class SuitcaseStageOverlay {
  private root: HTMLElement;
  private assets: AssetFactory;

  private active = false;
  private elapsed = 0;
  private sceneTime = 0;
  private lidSoundPlayed = false;
  private selectedBtnIndex = 1; // Default to "Weiter"

  private originNdc = { ndcX: 0, ndcY: 0 };
  private startOffset = new THREE.Vector3(0, 1.8, 0);
  private callbacks: SuitcaseStageCallbacks | null = null;
  private sceneRuntime: SuitcaseSceneRuntime | null = null;

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private ownedMaterials: THREE.Material[] = [];
  private ownedTextures: THREE.Texture[] = [];

  private suitcaseGroup: THREE.Group | null = null;
  private lidGroup: THREE.Group | null = null;
  private clasps: THREE.Group[] = [];
  private interiorLight: THREE.PointLight | null = null;
  private sparkles: SparkleMote[] = [];
  private stageBee: THREE.Group | null = null;

  private backdropEl: HTMLElement | null = null;
  private captionBarEl: HTMLElement | null = null;
  private actionsEl: HTMLElement | null = null;
  private replayBtnEl: HTMLButtonElement | null = null;
  private continueBtnEl: HTMLButtonElement | null = null;

  constructor(root: HTMLElement, assets: AssetFactory) {
    this.root = root;
    this.assets = assets;
  }

  isActive(): boolean {
    return this.active;
  }

  start(
    level: LevelDefinition,
    originNdc: { ndcX: number; ndcY: number },
    callbacks: SuitcaseStageCallbacks
  ): void {
    this.stop();

    this.active = true;
    this.elapsed = 0;
    this.sceneTime = 0;
    this.lidSoundPlayed = false;
    this.selectedBtnIndex = 1;
    this.originNdc = { ...originNdc };
    this.callbacks = callbacks;

    const sceneDef = getSuitcaseSceneForLevel(level.number);

    this.root.innerHTML = `
      <div id="suitcase-backdrop" class="suitcase-backdrop"></div>
      <div id="suitcase-canvas-wrap" class="suitcase-canvas-wrap"></div>
      <div id="suitcase-caption-bar" class="suitcase-caption-bar">
        <div class="suitcase-eyebrow">${sceneDef.emoji} In Frau Honigs Koffer • Wabe ${level.number}</div>
        <div class="suitcase-scene-title">${sceneDef.title}</div>
        <div class="suitcase-scene-caption">${sceneDef.caption}</div>
      </div>
      <div id="suitcase-actions" class="suitcase-actions">
        <button id="suitcase-replay-btn" class="btn btn-secondary" type="button">🔄 Nochmal öffnen</button>
        <button id="suitcase-continue-btn" class="btn btn-green" type="button">🎉 Weiter</button>
      </div>
    `;
    this.root.classList.remove('hidden');

    this.backdropEl = this.root.querySelector('#suitcase-backdrop');
    const canvasWrap = this.root.querySelector('#suitcase-canvas-wrap') as HTMLElement;
    this.captionBarEl = this.root.querySelector('#suitcase-caption-bar');
    this.actionsEl = this.root.querySelector('#suitcase-actions');
    this.replayBtnEl = this.root.querySelector('#suitcase-replay-btn');
    this.continueBtnEl = this.root.querySelector('#suitcase-continue-btn');

    this.replayBtnEl?.addEventListener('click', () => this.replay());
    this.continueBtnEl?.addEventListener('click', () => this.finish());
    this.updateSelectionVisual();

    this.initScene(canvasWrap, sceneDef);
    this.callbacks.onZoomStart?.();
  }

  private initScene(container: HTMLElement, sceneDef: SuitcaseSceneDefinition): void {
    const scene = new THREE.Scene();
    this.scene = scene;

    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 90);
    this.camera = camera;
    this.updateCameraFraming(w, h);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const runtime = sceneDef.build(this.assets);
    this.sceneRuntime = runtime;

    const ambientLight = new THREE.HemisphereLight(runtime.ambientLightColor, 0x8f5d2b, 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff6dd, 1.4);
    keyLight.position.set(5, 11, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -5.5;
    keyLight.shadow.camera.right = 5.5;
    keyLight.shadow.camera.top = 5.5;
    keyLight.shadow.camera.bottom = -3;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(runtime.accentLightColor, 0.65);
    rimLight.position.set(-6, 5, -4);
    scene.add(rimLight);

    // Build Hero 3D Suitcase matching Frau Honig's yellow-black striped suitcase
    const suitcaseGroup = new THREE.Group();
    this.suitcaseGroup = suitcaseGroup;
    scene.add(suitcaseGroup);

    const yellowMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf6c328, roughness: 0.42, metalness: 0.04 })
    );
    const strapMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0x332215, roughness: 0.56, metalness: 0.05 })
    );
    const brassMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.28, metalness: 0.62 })
    );
    const trayFloorMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: runtime.trayFloorColor, roughness: 0.78 })
    );
    const lidVelvetMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: runtime.lidBackdropColor, roughness: 0.85 })
    );
    const tagMat = this.trackMat(
      new THREE.MeshStandardMaterial({ color: 0xfff3d1, roughness: 0.65 })
    );

    const W = 6.2;
    const H = 0.62;
    const D = 3.8;
    const wallT = 0.16;

    // Lower tray floor + colored diorama ground + 4 outer walls
    const trayBase = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), yellowMat);
    trayBase.position.y = 0.06;
    trayBase.castShadow = true;
    trayBase.receiveShadow = true;
    suitcaseGroup.add(trayBase);

    const innerFloor = new THREE.Mesh(
      new THREE.BoxGeometry(W - wallT * 2, 0.04, D - wallT * 2),
      trayFloorMat
    );
    innerFloor.position.y = 0.13;
    innerFloor.receiveShadow = true;
    suitcaseGroup.add(innerFloor);

    const wallSpecs: Array<[number, number, number, number, number, number]> = [
      [W, H, wallT, 0, H / 2, D / 2 - wallT / 2],
      [W, H, wallT, 0, H / 2, -D / 2 + wallT / 2],
      [wallT, H, D - wallT * 2, -W / 2 + wallT / 2, H / 2, 0],
      [wallT, H, D - wallT * 2, W / 2 - wallT / 2, H / 2, 0]
    ];
    for (const [bw, bh, bd, x, y, z] of wallSpecs) {
      const wMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), yellowMat);
      wMesh.position.set(x, y, z);
      wMesh.castShadow = true;
      wMesh.receiveShadow = true;
      suitcaseGroup.add(wMesh);
    }

    // Exterior-only tray leather straps & clasps (never slice through the hollow tray interior)
    for (const sx of [-1.75, 1.75]) {
      const frontStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, H + 0.01, 0.04),
        strapMat
      );
      frontStrap.position.set(sx, H / 2, D / 2 + 0.02);
      frontStrap.castShadow = true;
      suitcaseGroup.add(frontStrap);

      const backStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, H + 0.01, 0.04),
        strapMat
      );
      backStrap.position.set(sx, H / 2, -D / 2 - 0.02);
      backStrap.castShadow = true;
      suitcaseGroup.add(backStrap);

      const bottomStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.03, D + 0.06),
        strapMat
      );
      bottomStrap.position.set(sx, -0.015, 0);
      suitcaseGroup.add(bottomStrap);

      // Hinged front brass clasp
      const claspPivot = new THREE.Group();
      claspPivot.position.set(sx, H - 0.04, D / 2 + 0.05);
      const claspPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.08), brassMat);
      claspPlate.position.set(0, 0.04, 0.03);
      claspPivot.add(claspPlate);
      suitcaseGroup.add(claspPivot);
      this.clasps.push(claspPivot);
    }

    // Exterior bottom corner protectors
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), strapMat);
        cap.position.set(sx * (W / 2 - 0.07), 0.14, sz * (D / 2 - 0.07));
        suitcaseGroup.add(cap);
      }
    }

    // Front leather handle
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.1, 10, 20, Math.PI),
      strapMat
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, H * 0.45, D / 2 + 0.04);
    suitcaseGroup.add(handle);

    // Hinged suitcase lid at back edge
    const lidH = 0.32;
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, H, -D / 2);
    this.lidGroup = lidGroup;

    const lidOuter = new THREE.Mesh(new THREE.BoxGeometry(W, lidH, D), yellowMat);
    lidOuter.position.set(0, lidH / 2, D / 2);
    lidOuter.castShadow = true;
    lidGroup.add(lidOuter);

    // Velvet interior lining set cleanly proud of lidOuter underside (no z-fighting)
    const lidVelvet = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.34, 0.03, D - 0.34),
      lidVelvetMat
    );
    lidVelvet.position.set(0, -0.022, D / 2);
    lidVelvet.receiveShadow = true;
    lidGroup.add(lidVelvet);

    // Exterior-only lid leather straps (never coplanar with inner velvet lining)
    for (const sx of [-1.75, 1.75]) {
      const topStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.035, D + 0.06),
        strapMat
      );
      topStrap.position.set(sx, lidH + 0.018, D / 2);
      lidGroup.add(topStrap);

      const lidFrontStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, lidH + 0.02, 0.04),
        strapMat
      );
      lidFrontStrap.position.set(sx, lidH / 2 + 0.01, D + 0.02);
      lidGroup.add(lidFrontStrap);

      const lidBackStrap = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, lidH + 0.02, 0.04),
        strapMat
      );
      lidBackStrap.position.set(sx, lidH / 2 + 0.01, -0.02);
      lidGroup.add(lidBackStrap);
    }

    for (const sx of [-1, 1]) {
      for (const sz of [0.07, D - 0.07]) {
        const lidCap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.22), strapMat);
        lidCap.position.set(sx * (W / 2 - 0.07), lidH - 0.07, sz);
        lidGroup.add(lidCap);
      }
    }

    const travelTag = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.72), tagMat);
    travelTag.position.set(0, lidH + 0.04, D / 2);
    lidGroup.add(travelTag);

    suitcaseGroup.add(lidGroup);

    // Warm golden magic PointLight + soft glowing fairy-dust sprites rising from suitcase
    this.interiorLight = new THREE.PointLight(runtime.accentLightColor, 0, 12, 1.6);
    this.interiorLight.position.set(0, 1.8, 0.4);
    suitcaseGroup.add(this.interiorLight);

    const glowTex = createMagicGlowTexture();
    if (glowTex) {
      this.ownedTextures.push(glowTex);
    }
    const sparkleColors = [0xfff7c7, 0xffd95a, 0xffb443, 0xffbdd8, 0xffffff];
    for (let i = 0; i < 36; i++) {
      const mat = this.trackMat(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: sparkleColors[i % sparkleColors.length],
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      suitcaseGroup.add(sprite);
      this.sparkles.push({
        sprite,
        mat,
        baseX: -2.65 + ((i * 1.13) % 5.3),
        baseZ: -1.35 + ((i * 0.67) % 2.7),
        baseSize: 0.26 + ((i * 19) % 10) * 0.032,
        speed: 0.36 + (i % 5) * 0.1,
        phase: i * 0.37,
        twinkleSpeed: 3.2 + (i % 4) * 1.1,
        maxH: 2.5 + (i % 6) * 0.32
      });
    }

    // Mount diorama scene inside suitcase tray (starts tiny until lid opens)
    runtime.root.scale.setScalar(0.01);
    runtime.root.visible = false;
    suitcaseGroup.add(runtime.root);

    // Companion bee bursting playfully out of the suitcase
    const bee = this.assets.createBee();
    bee.scale.setScalar(0.82);
    bee.visible = false;
    suitcaseGroup.add(bee);
    this.stageBee = bee;

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.renderer || !this.camera) return;
      const nw = Math.max(container.clientWidth, 320);
      const nh = Math.max(container.clientHeight, 240);
      this.renderer.setSize(nw, nh);
      this.updateCameraFraming(nw, nh);
    });
    this.resizeObserver.observe(container);

    this.applyAnimationState();
    this.renderer.render(scene, camera);
  }

  private trackMat<T extends THREE.Material>(mat: T): T {
    this.ownedMaterials.push(mat);
    return mat;
  }

  private updateCameraFraming(w: number, h: number): void {
    if (!this.camera) return;
    const aspect = w / Math.max(h, 1);
    this.camera.aspect = aspect;
    const dist = Math.max(10.6, 11.6 / Math.max(aspect, 0.65));
    const camY = 4.1 * (dist / 10.6);
    this.camera.position.set(0, camY, dist);
    this.camera.lookAt(0, 1.85, 0);
    this.camera.updateProjectionMatrix();

    // Compute starting world offset aligned to the exit tile's NDC coordinate
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * dist;
    const halfW = halfH * aspect;
    this.startOffset.set(
      this.originNdc.ndcX * halfW,
      1.85 + this.originNdc.ndcY * halfH,
      0
    );
  }

  replay(): void {
    if (!this.active) return;
    this.elapsed = 0;
    this.sceneTime = 0;
    this.lidSoundPlayed = false;
    this.captionBarEl?.classList.remove('visible');
    this.actionsEl?.classList.remove('visible');
    this.selectedBtnIndex = 1;
    this.updateSelectionVisual();
    this.callbacks?.onZoomStart?.();
    this.applyAnimationState();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  moveSelection(dir: Direction): void {
    if (!this.active) return;
    if (dir === 'left' || dir === 'up') {
      this.selectedBtnIndex = (this.selectedBtnIndex + 1) % 2;
    } else if (dir === 'right' || dir === 'down') {
      this.selectedBtnIndex = (this.selectedBtnIndex + 1) % 2;
    }
    this.updateSelectionVisual();
  }

  confirmSelection(): void {
    if (!this.active || this.elapsed < 1.4) return;
    if (this.selectedBtnIndex === 0) {
      this.replay();
    } else {
      this.finish();
    }
  }

  finish(): void {
    if (!this.active) return;
    const onContinue = this.callbacks?.onContinue;
    this.stop();
    onContinue?.();
  }

  private updateSelectionVisual(): void {
    this.replayBtnEl?.classList.toggle('dialog-btn-selected', this.selectedBtnIndex === 0);
    this.continueBtnEl?.classList.toggle('dialog-btn-selected', this.selectedBtnIndex === 1);
  }

  update(dt: number): void {
    if (!this.active || !this.renderer || !this.scene || !this.camera) return;

    const safeDt = Math.min(dt, 0.05);
    this.elapsed += safeDt;

    if (this.elapsed >= 1.15 && !this.lidSoundPlayed) {
      this.lidSoundPlayed = true;
      this.callbacks?.onLidOpen?.();
    }

    if (this.elapsed >= 1.45) {
      this.captionBarEl?.classList.add('visible');
    }
    if (this.elapsed >= 2.05) {
      this.actionsEl?.classList.add('visible');
    }

    this.applyAnimationState(safeDt);
    this.renderer.render(this.scene, this.camera);
  }

  private applyAnimationState(dt = 0.016): void {
    if (!this.suitcaseGroup || !this.lidGroup) return;

    // 1) Fade backdrop vignette during zoom
    if (this.backdropEl) {
      const bgAlpha = THREE.MathUtils.clamp(this.elapsed / 0.85, 0, 1);
      this.backdropEl.style.opacity = bgAlpha.toFixed(3);
    }

    // 2) Zoom suitcase smoothly from exit tile to hero stage
    const zoomRaw = THREE.MathUtils.clamp(this.elapsed / 1.15, 0, 1);
    const zoomMove = easeOutCubic(zoomRaw);
    const zoomScale = THREE.MathUtils.lerp(0.15, 1.0, easeOutBack(zoomRaw));

    const landingBounce =
      zoomRaw >= 0.85 && zoomRaw < 1.0
        ? Math.sin(((zoomRaw - 0.85) / 0.15) * Math.PI) * 0.06
        : 0;

    this.suitcaseGroup.position.set(
      THREE.MathUtils.lerp(this.startOffset.x, 0, zoomMove),
      THREE.MathUtils.lerp(this.startOffset.y, 0, zoomMove) + landingBounce,
      THREE.MathUtils.lerp(this.startOffset.z, 0, zoomMove)
    );
    this.suitcaseGroup.scale.setScalar(zoomScale);
    this.suitcaseGroup.rotation.set(
      THREE.MathUtils.lerp(0.45, 0, zoomMove),
      THREE.MathUtils.lerp(0.22, 0, zoomMove) + Math.sin(Math.max(0, this.elapsed - 1.2) * 0.35) * 0.04,
      THREE.MathUtils.lerp(-0.08, 0, zoomMove)
    );

    // 3) Unclasp latches & open suitcase lid
    const lidT = THREE.MathUtils.clamp((this.elapsed - 1.15) / 1.0, 0, 1);
    const lidEase = easeOutBack(lidT);
    const claspRot = THREE.MathUtils.clamp((this.elapsed - 1.12) / 0.22, 0, 1);

    for (const clasp of this.clasps) {
      clasp.rotation.x = THREE.MathUtils.lerp(0, 1.35, easeOutCubic(claspRot));
    }
    this.lidGroup.rotation.x = -1.68 * lidEase;

    if (this.interiorLight) {
      const pulse = 1 + Math.sin(this.elapsed * 3.2) * 0.12;
      this.interiorLight.intensity = 2.6 * THREE.MathUtils.clamp(lidT * 1.4, 0, 1) * pulse;
    }

    // 4) Soft glowing fairy dust drifting up from open suitcase
    for (const s of this.sparkles) {
      if (this.elapsed < 1.2) {
        s.sprite.visible = false;
        continue;
      }
      s.sprite.visible = true;
      const t = (this.elapsed - 1.2) * s.speed + s.phase;
      const cyc = t % 1;
      s.sprite.position.set(
        s.baseX + Math.sin(t * 4.2 + s.phase) * 0.28,
        0.38 + cyc * s.maxH,
        s.baseZ + Math.cos(t * 3.4 + s.phase) * 0.22
      );
      const lifeFade = Math.sin(cyc * Math.PI);
      const twinkle = 0.68 + 0.32 * Math.sin(this.elapsed * s.twinkleSpeed + s.phase * 2.1);
      s.mat.opacity = 0.92 * lifeFade * twinkle;
      s.sprite.scale.setScalar(s.baseSize * (0.65 + lifeFade * 0.65) * (0.85 + twinkle * 0.25));
    }

    // 5) Companion bee greets us on the stage rim
    if (this.stageBee) {
      const beeT = Math.max(0, this.elapsed - 1.25);
      if (beeT <= 0.01) {
        this.stageBee.visible = false;
      } else {
        this.stageBee.visible = true;
        const hopIn = easeOutBack(Math.min(1, beeT / 0.95));
        const hoverX = 2.72 + Math.sin(beeT * 1.8) * 0.14;
        const hoverY = 1.48 + Math.sin(beeT * 3.1) * 0.12;
        const hoverZ = 1.42 + Math.cos(beeT * 1.5) * 0.12;
        this.stageBee.position.set(
          THREE.MathUtils.lerp(0.2, hoverX, hopIn),
          THREE.MathUtils.lerp(0.5, hoverY, hopIn) + Math.sin(Math.min(1, beeT / 0.95) * Math.PI) * 0.65,
          THREE.MathUtils.lerp(0.1, hoverZ, hopIn)
        );
        this.stageBee.rotation.y = -0.65 + Math.sin(beeT * 1.6) * 0.18;
        this.stageBee.rotation.z = Math.cos(beeT * 2.4) * 0.08;
        const { leftWing, rightWing } = this.stageBee.userData as {
          leftWing?: THREE.Object3D;
          rightWing?: THREE.Object3D;
        };
        const flap = Math.sin(beeT * 28) * 0.72;
        if (leftWing) leftWing.rotation.z = 0.25 + flap;
        if (rightWing) rightWing.rotation.z = -0.25 - flap;
      }
    }

    // 6) Reveal and animate diorama scene inside the suitcase
    if (this.sceneRuntime) {
      const revealProgress = THREE.MathUtils.clamp((this.elapsed - 1.5) / 1.15, 0, 1);
      if (revealProgress > 0.01) {
        this.sceneRuntime.root.visible = true;
        this.sceneRuntime.root.scale.setScalar(THREE.MathUtils.lerp(0.05, 1.0, easeOutCubic(revealProgress)));
        this.sceneTime = Math.max(0, this.elapsed - 1.5);
        this.sceneRuntime.update(this.sceneTime, dt, revealProgress);
      } else {
        this.sceneRuntime.root.visible = false;
      }
    }
  }

  stop(): void {
    this.active = false;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.sceneRuntime?.mixers) {
      for (const mixer of this.sceneRuntime.mixers) {
        mixer.stopAllAction();
      }
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry && !obj.userData?.sharedGeo && !hasCustomModelAncestor(obj)) {
          mesh.geometry.dispose();
        }
      });
    }

    for (const mat of this.ownedMaterials) {
      mat.dispose();
    }
    this.ownedMaterials = [];

    for (const tex of this.ownedTextures) {
      tex.dispose();
    }
    this.ownedTextures = [];

    if (this.sceneRuntime) {
      for (const mat of this.sceneRuntime.ownedMaterials) {
        mat.dispose();
      }
      for (const tex of this.sceneRuntime.ownedTextures ?? []) {
        tex.dispose();
      }
      this.sceneRuntime = null;
    }

    this.callbacks = null;
    this.clasps = [];
    this.sparkles = [];
    this.suitcaseGroup = null;
    this.lidGroup = null;
    this.interiorLight = null;
    this.stageBee = null;
    this.backdropEl = null;
    this.captionBarEl = null;
    this.actionsEl = null;
    this.replayBtnEl = null;
    this.continueBtnEl = null;
    this.scene = null;
    this.camera = null;

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }
}
