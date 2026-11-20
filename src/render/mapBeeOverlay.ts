import * as THREE from 'three';
import { AssetFactory } from './assetFactory';

export class MapBeeOverlay {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private beeMesh: THREE.Group;
  private resizeObserver: ResizeObserver;

  private initialized = false;
  private startX = 0;
  private startY = 0;
  private curX = 0;
  private curY = 0;
  private targetX = 0;
  private targetY = 0;
  private flightProgress = 1;
  private flightDuration = 0.36;
  private currentYaw = 0.28;
  private elapsed = 0;
  private wingPhase = 0;
  private currentWingSpeed = 14;

  constructor(container: HTMLElement, assets: AssetFactory) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-175, 365, 175, -175, 0.1, 220);
    this.camera.position.set(0, 0, 120);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    const w = Math.max(container.clientWidth, 100);
    const h = Math.max(container.clientHeight, 70);
    this.renderer.setSize(w, h);
    container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xfff9e8, 0xc78d3c, 1.35);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.45);
    sun.position.set(120, 160, 200);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffeedd, 0.65);
    fill.position.set(-100, -60, 160);
    this.scene.add(fill);

    this.beeMesh = assets.createBee();
    this.beeMesh.scale.setScalar(58);
    this.beeMesh.rotation.x = 0.25;
    this.beeMesh.rotation.y = this.currentYaw;
    this.scene.add(this.beeMesh);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
  }

  handleResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w > 0 && h > 0) {
      this.renderer.setSize(w, h);
    }
  }

  setTarget(svgX: number, svgY: number, instant = false): void {
    const tx = svgX;
    const ty = -svgY;
    if (instant || !this.initialized) {
      this.startX = tx;
      this.startY = ty;
      this.curX = tx;
      this.curY = ty;
      this.targetX = tx;
      this.targetY = ty;
      this.flightProgress = 1;
      this.initialized = true;
      return;
    }

    if (Math.hypot(tx - this.targetX, ty - this.targetY) < 0.5) {
      return;
    }

    this.startX = this.curX;
    this.startY = this.curY;
    this.targetX = tx;
    this.targetY = ty;
    this.flightProgress = 0;
  }

  update(dt: number): void {
    this.elapsed += dt;

    let arcLift = 0;
    let isFlying = false;

    if (this.flightProgress < 1) {
      isFlying = true;
      this.flightProgress = Math.min(1, this.flightProgress + dt / this.flightDuration);
      const e =
        this.flightProgress * this.flightProgress * (3 - 2 * this.flightProgress);
      this.curX = THREE.MathUtils.lerp(this.startX, this.targetX, e);
      this.curY = THREE.MathUtils.lerp(this.startY, this.targetY, e);
      arcLift = Math.sin(this.flightProgress * Math.PI) * 16;

      const dx = this.targetX - this.startX;
      const dy = this.targetY - this.startY;
      if (Math.hypot(dx, dy) > 0.5) {
        const flightYaw = Math.atan2(dx, -dy);
        let deltaYaw = flightYaw - this.currentYaw;
        while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
        while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
        this.currentYaw += deltaYaw * Math.min(1, dt * 16);
      }
    } else {
      const idleYaw = 0.28 + Math.sin(this.elapsed * 1.4) * 0.14;
      let deltaYaw = idleYaw - this.currentYaw;
      while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
      while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
      this.currentYaw += deltaYaw * Math.min(1, dt * 6);
    }

    const bobY = Math.sin(this.elapsed * 3.8) * 3.5;
    this.beeMesh.position.set(this.curX, this.curY + bobY + arcLift * 0.35, 20 + arcLift);
    this.beeMesh.rotation.y = this.currentYaw;
    this.beeMesh.rotation.x = THREE.MathUtils.lerp(
      this.beeMesh.rotation.x,
      isFlying ? 0.34 : 0.24,
      Math.min(1, dt * 10)
    );

    const targetWingSpeed = isFlying ? 52 : 14;
    this.currentWingSpeed = THREE.MathUtils.lerp(
      this.currentWingSpeed,
      targetWingSpeed,
      Math.min(1, dt * 14)
    );
    this.wingPhase += dt * this.currentWingSpeed;
    const wingAmp = isFlying ? 0.48 : 0.28;

    const { leftWing, rightWing } = this.beeMesh.userData as {
      leftWing?: THREE.Object3D;
      rightWing?: THREE.Object3D;
    };
    const flap = Math.sin(this.wingPhase) * wingAmp;
    if (leftWing) leftWing.rotation.z = 0.25 + flap;
    if (rightWing) rightWing.rotation.z = -0.25 - flap;

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.beeMesh.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry && !this.beeMesh.userData.isCustomModel) {
        mesh.geometry.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
