import * as THREE from 'three';

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  readonly boardGroup: THREE.Group;

  private backdropGroup: THREE.Group | null = null;
  private resizeObserver: ResizeObserver;
  private container: HTMLElement;
  private onResizeCallback: ((width: number, height: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfbf0d6);
    this.scene.fog = new THREE.Fog(0xfbf0d6, 26, 52);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 240);
    this.renderer.setSize(w, h);
    container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    this.resizeObserver = new ResizeObserver(() => {
      const cw = Math.max(this.container.clientWidth, 320);
      const ch = Math.max(this.container.clientHeight, 240);
      this.renderer.setSize(cw, ch);
      this.onResizeCallback?.(cw, ch);
    });
    this.resizeObserver.observe(container);
  }

  private setupLights(): void {
    const hemi = new THREE.HemisphereLight(0xfff9e8, 0xc78d3c, 1.05);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4d6, 1.45);
    sun.position.set(10, 14, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 14;
    sun.shadow.camera.bottom = -14;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    const frontFill = new THREE.DirectionalLight(0xffeedd, 0.55);
    frontFill.position.set(-8, -6, 14);
    this.scene.add(frontFill);
  }

  setOnResize(cb: (width: number, height: number) => void): void {
    this.onResizeCallback = cb;
  }

  getSize(): { width: number; height: number } {
    return {
      width: Math.max(this.container.clientWidth, 320),
      height: Math.max(this.container.clientHeight, 240)
    };
  }

  buildHoneycombBackdrop(boardWidth: number, boardHeight: number): void {
    this.clearBackdrop();

    const group = new THREE.Group();
    const padX = 4;
    const padY = 4;

    // Warm dark-amber backplate behind the honeycomb cells
    const plateW = boardWidth + padX * 2 + 2;
    const plateH = boardHeight + padY * 2 + 2;
    const backPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(plateW, plateH),
      new THREE.MeshStandardMaterial({
        color: 0xc27b22,
        roughness: 0.88
      })
    );
    backPlate.position.set((boardWidth - 1) / 2, -(boardHeight - 1) / 2, -0.66);
    backPlate.receiveShadow = true;
    group.add(backPlate);

    // Instanced staggered hexagonal honeycomb tiles in warm honey shades
    const hexRadius = 0.54;
    const hexHeight = 0.14;
    const hexGeo = new THREE.CylinderGeometry(hexRadius, hexRadius * 0.96, hexHeight, 6);
    hexGeo.rotateX(Math.PI / 2);

    const hexMat = new THREE.MeshStandardMaterial({
      color: 0xebb144,
      roughness: 0.68,
      metalness: 0.04
    });

    const dx = Math.sqrt(3) * hexRadius * 0.98;
    const dy = 1.5 * hexRadius * 0.98;

    const minX = -padX;
    const maxX = boardWidth + padX;
    const minY = -(boardHeight + padY);
    const maxY = padY;

    const cols = Math.ceil((maxX - minX) / dx) + 2;
    const rows = Math.ceil((maxY - minY) / dy) + 2;
    const totalCount = cols * rows;

    const instanced = new THREE.InstancedMesh(hexGeo, hexMat, totalCount);
    instanced.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let idx = 0;

    for (let r = 0; r < rows; r++) {
      const y = minY + r * dy;
      const offsetX = r % 2 === 1 ? dx * 0.5 : 0;
      for (let c = 0; c < cols; c++) {
        const x = minX + c * dx + offsetX;
        dummy.position.set(x, y, -0.58);
        dummy.scale.set(0.92, 0.92, 1);
        dummy.updateMatrix();
        instanced.setMatrixAt(idx, dummy.matrix);

        const shade = ((r * 3 + c * 5) % 4) * 0.03;
        color.setRGB(0.95 - shade, 0.72 - shade * 0.85, 0.27 - shade * 0.4);
        instanced.setColorAt(idx, color);
        idx++;
      }
    }

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    group.add(instanced);

    this.backdropGroup = group;
    this.scene.add(group);
  }

  private clearBackdrop(): void {
    if (!this.backdropGroup) return;
    this.scene.remove(this.backdropGroup);
    this.backdropGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    this.backdropGroup = null;
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.clearBackdrop();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
