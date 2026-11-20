import * as THREE from 'three';
import { AssetFactory } from './assetFactory';
import { createHoneyPotModel } from './proceduralModels';

interface SwarmBee {
  mesh: THREE.Group;
  index: number;
  wingPhase: number;
  sleepAt: number;
  restPos: THREE.Vector3;
  prevPos: THREE.Vector3;
  zzzCooldown: number;
}

interface StarDot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  phase: number;
}

interface MathChallenge {
  prompt: string;
  answer: number;
}

const SKY_DAY = new THREE.Color(0xfce5b0);
const SKY_SUNSET = new THREE.Color(0xe59866);
const SKY_NIGHT = new THREE.Color(0x2b2d5c);

export class SleepSwarmOverlay {
  private root: HTMLElement;
  private assets: AssetFactory;
  private onParentUnlock: () => void;

  private active = false;
  private elapsed = 0;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private bees: SwarmBee[] = [];
  private honeyPot: THREE.Group | null = null;
  private stars: StarDot[] = [];
  private ownedMaterials: THREE.Material[] = [];
  private hemiLight: THREE.HemisphereLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;

  private bannerEl: HTMLElement | null = null;
  private zzzLayerEl: HTMLElement | null = null;
  private popoverEl: HTMLElement | null = null;
  private lastActBanner = -1;
  private currentChallenge: MathChallenge | null = null;

  constructor(
    root: HTMLElement,
    assets: AssetFactory,
    onParentUnlock: () => void
  ) {
    this.root = root;
    this.assets = assets;
    this.onParentUnlock = onParentUnlock;
  }

  isActive(): boolean {
    return this.active;
  }

  start(): void {
    this.stop();
    this.active = true;
    this.elapsed = 0;
    this.lastActBanner = -1;

    this.root.innerHTML = `
      <div id="sleep-canvas-wrap" class="sleep-canvas-wrap"></div>
      <div id="sleep-zzz-layer" class="sleep-zzz-layer"></div>
      <div id="sleep-banner" class="sleep-banner"></div>
      <button id="sleep-parent-btn" class="sleep-parent-btn" type="button" title="Für Eltern">🔓 Eltern</button>
      <div id="sleep-parent-popover" class="sleep-parent-popover hidden"></div>
    `;
    this.root.classList.remove('hidden');

    const canvasWrap = this.root.querySelector('#sleep-canvas-wrap') as HTMLElement;
    this.bannerEl = this.root.querySelector('#sleep-banner');
    this.zzzLayerEl = this.root.querySelector('#sleep-zzz-layer');
    this.popoverEl = this.root.querySelector('#sleep-parent-popover');

    this.root.querySelector('#sleep-parent-btn')?.addEventListener('click', () => {
      this.openParentChallenge();
    });

    this.initScene(canvasWrap);
    this.updateBanner();
  }

  private initScene(container: HTMLElement): void {
    const scene = new THREE.Scene();
    scene.background = SKY_DAY.clone();
    this.scene = scene;

    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.5, 80);
    camera.position.set(0, 1.4, 9.2);
    camera.lookAt(0, -0.1, 0);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.hemiLight = new THREE.HemisphereLight(0xfff9e8, 0xc78d3c, 1.15);
    scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4d6, 1.35);
    this.sunLight.position.set(6, 10, 10);
    this.sunLight.castShadow = true;
    scene.add(this.sunLight);

    // Cozy warm floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe6af4b, roughness: 0.85 });
    this.ownedMaterials.push(floorMat);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7.5, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.25;
    floor.receiveShadow = true;
    scene.add(floor);

    // Central honey pot
    const pot = createHoneyPotModel();
    pot.scale.setScalar(1.25);
    pot.position.set(0, -0.78, 0);
    scene.add(pot);
    this.honeyPot = pot;

    // 30 twinkling stars for dusk & night acts
    const starGeo = new THREE.SphereGeometry(0.06, 6, 6);
    for (let i = 0; i < 30; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfff5b8 : 0xffffff,
        transparent: true,
        opacity: 0
      });
      this.ownedMaterials.push(mat);
      const star = new THREE.Mesh(starGeo, mat);
      star.position.set(
        ((i * 73) % 100) / 100 * 16 - 8,
        ((i * 41) % 100) / 100 * 5.2 + 0.6,
        -4 - ((i * 19) % 4)
      );
      scene.add(star);
      this.stars.push({ mesh: star, mat, phase: i * 0.7 });
    }

    // 7 cheerful bees that play then fall asleep one by one
    for (let i = 0; i < 7; i++) {
      const mesh = this.assets.createBee();
      mesh.scale.setScalar(0.84);
      const angle = ((i / 6) - 0.5) * Math.PI * 1.15;
      const radius = 2.6 + (i % 2) * 0.35;
      const restPos = new THREE.Vector3(
        Math.sin(angle) * radius,
        -0.88 + (i % 2) * 0.08,
        Math.cos(angle) * 1.15 + 0.35
      );
      mesh.position.copy(restPos);
      scene.add(mesh);
      this.bees.push({
        mesh,
        index: i,
        wingPhase: i * 1.1,
        sleepAt: 46 + i * 7.8,
        restPos,
        prevPos: restPos.clone(),
        zzzCooldown: 1.5 + i * 0.6
      });
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.renderer || !this.camera) return;
      const cw = Math.max(container.clientWidth, 320);
      const ch = Math.max(container.clientHeight, 240);
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(cw, ch);
    });
    this.resizeObserver.observe(container);
  }

  private openParentChallenge(): void {
    if (!this.popoverEl) return;
    const a = 4 + Math.floor(Math.random() * 6);
    const b = 5 + Math.floor(Math.random() * 5);
    this.currentChallenge = {
      prompt: `${a} × ${b} = ?`,
      answer: a * b
    };

    this.popoverEl.innerHTML = `
      <div style="font-weight:900; margin-bottom:0.35rem;">Eltern-Freigabe</div>
      <div style="font-size:0.95rem; margin-bottom:0.45rem;">Bitte kurz lösen: <strong>${this.currentChallenge.prompt}</strong></div>
      <form id="sleep-unlock-form" style="display:flex; gap:0.4rem; align-items:center;">
        <input id="sleep-unlock-input" type="number" inputmode="numeric" style="width:76px; padding:0.35rem 0.5rem; border-radius:10px; border:2px solid #4a321f; font-weight:800; font-size:1rem;" autofocus />
        <button class="btn btn-green btn-compact" type="submit">Weiter</button>
        <button id="sleep-unlock-cancel" class="btn btn-secondary btn-compact" type="button">✕</button>
      </form>
      <div id="sleep-unlock-error" style="color:#b42318; font-size:0.82rem; font-weight:800; margin-top:0.3rem;"></div>
    `;
    this.popoverEl.classList.remove('hidden');

    const inputEl = this.popoverEl.querySelector('#sleep-unlock-input') as HTMLInputElement | null;
    inputEl?.focus();

    this.popoverEl.querySelector('#sleep-unlock-cancel')?.addEventListener('click', () => {
      this.popoverEl?.classList.add('hidden');
    });

    this.popoverEl.querySelector('#sleep-unlock-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.currentChallenge || !inputEl) return;
      const val = Number(inputEl.value.trim());
      if (val === this.currentChallenge.answer) {
        this.stop();
        this.onParentUnlock();
      } else {
        const errEl = this.popoverEl?.querySelector('#sleep-unlock-error');
        if (errEl) errEl.textContent = 'Das stimmt noch nicht ganz.';
        inputEl.select();
      }
    });
  }

  private updateBanner(): void {
    if (!this.bannerEl) return;
    const act = this.elapsed < 45 ? 1 : this.elapsed < 105 ? 2 : 3;
    if (act === this.lastActBanner) return;
    this.lastActBanner = act;

    if (act === 1) {
      this.bannerEl.innerHTML =
        '🐝 <strong>Spielpause!</strong> Die Bienen haben fleißig gesummt und machen jetzt ihre lustige Pausen-Show!';
    } else if (act === 2) {
      this.bannerEl.innerHTML =
        '🌙 <strong>Gähn…</strong> Der kleine Schwarm wird langsam müde und sucht sich einen Schlafplatz…';
    } else {
      this.bannerEl.innerHTML =
        '😴 <strong>Psst…</strong> Alle Bienen schlafen jetzt tief und fest. Bis zum nächsten Mal!';
    }
  }

  private spawnZzz(worldPos: THREE.Vector3): void {
    if (!this.zzzLayerEl || !this.camera || !this.renderer) return;
    const proj = worldPos.clone().project(this.camera);
    if (Math.abs(proj.x) > 0.95 || Math.abs(proj.y) > 0.95) return;

    const sx = (proj.x * 0.5 + 0.5) * this.zzzLayerEl.clientWidth;
    const sy = (-proj.y * 0.5 + 0.5) * this.zzzLayerEl.clientHeight - 24;

    const el = document.createElement('span');
    el.className = 'sleep-zzz-bubble';
    el.textContent = Math.random() > 0.5 ? 'Zzz' : 'z';
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    this.zzzLayerEl.appendChild(el);

    window.setTimeout(() => {
      el.remove();
    }, 2400);
  }

  update(dt: number): void {
    if (!this.active || !this.scene || !this.camera || !this.renderer) return;
    this.elapsed += dt;
    this.updateBanner();

    // Smooth sky & lighting transition across Day -> Sunset -> Starry Dusk
    const bg = this.scene.background as THREE.Color;
    let starAlpha = 0;
    if (this.elapsed < 45) {
      bg.copy(SKY_DAY);
    } else if (this.elapsed < 72) {
      const k = (this.elapsed - 45) / 27;
      bg.copy(SKY_DAY).lerp(SKY_SUNSET, k);
      starAlpha = Math.max(0, (k - 0.5) * 0.5);
    } else if (this.elapsed < 105) {
      const k = (this.elapsed - 72) / 33;
      bg.copy(SKY_SUNSET).lerp(SKY_NIGHT, k);
      starAlpha = 0.25 + k * 0.75;
    } else {
      bg.copy(SKY_NIGHT);
      starAlpha = 1;
    }

    if (this.hemiLight) {
      this.hemiLight.intensity = THREE.MathUtils.lerp(1.15, 0.58, starAlpha);
    }
    if (this.sunLight) {
      this.sunLight.intensity = THREE.MathUtils.lerp(1.35, 0.45, starAlpha);
    }

    for (const s of this.stars) {
      s.mat.opacity =
        starAlpha * (0.45 + 0.55 * Math.sin(this.elapsed * 2.1 + s.phase));
    }

    if (this.honeyPot) {
      this.honeyPot.rotation.y = Math.sin(this.elapsed * 0.6) * 0.08;
    }

    // Animate the 7 bees through Play -> Yawn-Flip -> Sleep
    const wavePeriod = 6.5;
    const waveCycle = this.elapsed % wavePeriod;

    for (const bee of this.bees) {
      const t = this.elapsed;
      let targetX = bee.restPos.x;
      let targetY = bee.restPos.y;
      let targetZ = bee.restPos.z;
      let pitch = 0.1;
      let roll = 0;
      let wingSpeed = 2.0;
      let wingAmp = 0.14;
      let faceForward = false;

      if (t < bee.sleepAt - 2.0) {
        // Act 1 / active flight: figure-8 playful swarm dance + synchronized wave somersault
        const phase = t * 1.15 + bee.index * 0.88;
        targetX = Math.sin(phase) * 3.7;
        targetY = Math.sin(phase * 2) * 1.15 + 0.45 + Math.sin(t * 3 + bee.index) * 0.12;
        targetZ = Math.cos(phase) * 1.65;

        wingSpeed = 48;
        wingAmp = 0.48;
        roll = Math.sin(t * 4.5 + bee.index) * 0.18;

        const waveLocal = waveCycle - bee.index * 0.14;
        if (waveLocal >= 0 && waveLocal <= 1.25) {
          const p = waveLocal / 1.25;
          const e = p * p * (3 - 2 * p);
          targetY += Math.sin(p * Math.PI) * 0.85;
          pitch = e * Math.PI * 2;
          wingSpeed = 62;
        }
      } else if (t < bee.sleepAt) {
        // One last goofy sleepy flip before landing
        const p = (t - (bee.sleepAt - 2.0)) / 2.0;
        const e = p * p * (3 - 2 * p);
        const phase = (bee.sleepAt - 2.0) * 1.15 + bee.index * 0.88;
        const fromX = Math.sin(phase) * 3.7;
        const fromY = Math.sin(phase * 2) * 1.15 + 0.45;
        const fromZ = Math.cos(phase) * 1.65;

        targetX = THREE.MathUtils.lerp(fromX, bee.restPos.x, e);
        targetY = THREE.MathUtils.lerp(fromY, bee.restPos.y, e) + Math.sin(p * Math.PI) * 0.55;
        targetZ = THREE.MathUtils.lerp(fromZ, bee.restPos.z, e);
        pitch = e * Math.PI * 2;
        wingSpeed = THREE.MathUtils.lerp(42, 10, e);
        wingAmp = THREE.MathUtils.lerp(0.45, 0.22, e);
      } else {
        // Asleep: slow, quiet, repetitive breathing bob
        const sleepDur = t - bee.sleepAt;
        const breath = Math.sin(sleepDur * 1.25 + bee.index * 0.8) * 0.04;
        targetY = bee.restPos.y + breath;
        pitch = 0.22; // sleepy nod
        wingSpeed = 1.8;
        wingAmp = 0.1;
        faceForward = true;

        bee.zzzCooldown -= dt;
        if (bee.zzzCooldown <= 0) {
          bee.zzzCooldown = sleepDur > 35 ? 3.8 : 2.6;
          this.spawnZzz(bee.mesh.position);
        }
      }

      const dx = targetX - bee.prevPos.x;
      const dz = targetZ - bee.prevPos.z;
      bee.prevPos.set(targetX, targetY, targetZ);
      bee.mesh.position.set(targetX, targetY, targetZ);

      if (faceForward) {
        const restYaw = Math.atan2(-bee.restPos.x * 0.25, 1);
        bee.mesh.rotation.y = THREE.MathUtils.lerp(bee.mesh.rotation.y, restYaw, Math.min(1, dt * 4));
      } else if (Math.hypot(dx, dz) > 0.002) {
        const targetYaw = Math.atan2(dx, dz);
        let deltaYaw = targetYaw - bee.mesh.rotation.y;
        while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
        while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
        bee.mesh.rotation.y += deltaYaw * Math.min(1, dt * 10);
      }

      bee.mesh.rotation.x = pitch;
      bee.mesh.rotation.z = roll;

      bee.wingPhase += dt * wingSpeed;
      const { leftWing, rightWing } = bee.mesh.userData as {
        leftWing?: THREE.Object3D;
        rightWing?: THREE.Object3D;
      };
      const flap = Math.sin(bee.wingPhase) * wingAmp;
      if (leftWing) leftWing.rotation.z = 0.25 + flap;
      if (rightWing) rightWing.rotation.z = -0.25 - flap;
    }

    this.renderer.render(this.scene, this.camera);
  }

  stop(): void {
    this.active = false;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.scene) {
      this.scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry && !obj.userData.isCustomModel) {
          mesh.geometry.dispose();
        }
      });
    }
    for (const mat of this.ownedMaterials) {
      mat.dispose();
    }
    this.ownedMaterials = [];

    this.bees = [];
    this.stars = [];
    this.honeyPot = null;
    this.hemiLight = null;
    this.sunLight = null;
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
