import * as THREE from 'three';
import { AssetFactory } from './assetFactory';
import { createFlowerModel, createHoneyPotModel } from './proceduralModels';
import {
  AnimatedCharacter,
  CharacterKey,
  createStageCharacter
} from './suitcaseCharacters';

export interface SuitcaseSceneRuntime {
  root: THREE.Group;
  lidBackdropColor: number;
  trayFloorColor: number;
  ambientLightColor: number;
  accentLightColor: number;
  ownedMaterials: THREE.Material[];
  ownedTextures?: THREE.Texture[];
  mixers?: THREE.AnimationMixer[];
  update: (sceneTime: number, dt: number, revealProgress: number) => void;
}

export interface SuitcaseSceneDefinition {
  id: string;
  title: string;
  caption: string;
  emoji: string;
  build: (assets: AssetFactory) => SuitcaseSceneRuntime;
}

function trackMat<T extends THREE.Material>(owned: THREE.Material[], mat: T): T {
  owned.push(mat);
  return mat;
}

function attachCharacter(
  parent: THREE.Group,
  owned: THREE.Material[],
  mixers: THREE.AnimationMixer[],
  assets: AssetFactory,
  key: CharacterKey,
  scale: number,
  pos: [number, number, number],
  rotY = 0
): AnimatedCharacter {
  const ch = createStageCharacter(assets, key);
  ch.root.scale.setScalar(scale);
  ch.root.position.set(...pos);
  ch.root.rotation.y = rotY;
  owned.push(...ch.ownedMaterials);
  if (ch.mixer) mixers.push(ch.mixer);
  parent.add(ch.root);
  return ch;
}

export function createMagicGlowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = size / 2;
  const cy = size / 2;

  // Soft spherical bloom core + warm golden halo
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
  halo.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  halo.addColorStop(0.18, 'rgba(255, 250, 224, 0.92)');
  halo.addColorStop(0.45, 'rgba(255, 224, 130, 0.38)');
  halo.addColorStop(0.76, 'rgba(255, 195, 75, 0.08)');
  halo.addColorStop(1.0, 'rgba(255, 180, 40, 0.0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Feathered 4-point starlight cross fading smoothly to zero before canvas edges
  for (const [sx, sy] of [
    [1.0, 0.14],
    [0.14, 1.0]
  ] as const) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    const ray = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.44);
    ray.addColorStop(0.0, 'rgba(255, 255, 255, 0.65)');
    ray.addColorStop(0.4, 'rgba(255, 245, 200, 0.22)');
    ray.addColorStop(1.0, 'rgba(255, 240, 180, 0.0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = THREE.MathUtils.clamp(t, 0, 1) - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

function animateBeeWings(bee: THREE.Group, phase: number, speed = 26, amp = 0.72): void {
  const { leftWing, rightWing } = bee.userData as {
    leftWing?: THREE.Object3D;
    rightWing?: THREE.Object3D;
  };
  const flap = Math.sin(phase * speed) * amp;
  if (leftWing) leftWing.rotation.z = 0.25 + flap;
  if (rightWing) rightWing.rotation.z = -0.25 - flap;
}

function addGrassTufts(
  parent: THREE.Group,
  owned: THREE.Material[],
  color: number,
  positions: Array<[number, number]>,
  baseY = 0.14
): void {
  const grassMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color, roughness: 0.78 })
  );
  const bladeGeo = new THREE.ConeGeometry(0.055, 0.24, 5);
  for (const [x, z] of positions) {
    const tuft = new THREE.Group();
    tuft.position.set(x, baseY, z);
    for (let i = -1; i <= 1; i++) {
      const blade = new THREE.Mesh(bladeGeo, grassMat);
      blade.position.set(i * 0.045, 0.11, (i % 2) * 0.02);
      blade.rotation.z = -i * 0.28;
      blade.rotation.y = i * 0.4;
      blade.castShadow = true;
      tuft.add(blade);
    }
    parent.add(tuft);
  }
}

function buildCherryTreeScene(assets: AssetFactory): SuitcaseSceneRuntime {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  // Mossy meadow mound
  const moundMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x6fb857, roughness: 0.85 })
  );
  const mound = new THREE.Mesh(new THREE.SphereGeometry(1.5, 22, 12), moundMat);
  mound.scale.set(1.35, 0.22, 0.85);
  mound.position.set(0, 0.12, 0);
  mound.receiveShadow = true;
  root.add(mound);

  addGrassTufts(
    root,
    owned,
    0x5ca447,
    [
      [-2.1, 0.8],
      [-1.5, -0.7],
      [-0.9, 1.05],
      [1.1, 0.95],
      [1.75, -0.55],
      [2.15, 0.5]
    ],
    0.14
  );

  // Surrounding spring flowers
  const flowerCoords: Array<[number, number, number]> = [
    [-1.95, 0.14, 0.55],
    [-1.25, 0.16, 0.9],
    [1.35, 0.16, 0.82],
    [2.0, 0.14, 0.35],
    [-1.7, 0.14, -0.8],
    [1.75, 0.14, -0.78]
  ];
  const flowers: THREE.Group[] = [];
  flowerCoords.forEach(([fx, fy, fz], idx) => {
    const fl = createFlowerModel(idx);
    fl.position.set(fx, fy + 0.18, fz);
    fl.scale.setScalar(0.55);
    root.add(fl);
    flowers.push(fl);
  });

  // Tree root group that grows from soil during reveal
  const treeGroup = new THREE.Group();
  treeGroup.position.set(-0.08, 0.22, -0.1);
  root.add(treeGroup);

  const barkMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x6f4328, roughness: 0.82 })
  );
  const trunkLower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.29, 1.05, 12),
    barkMat
  );
  trunkLower.position.set(0, 0.52, 0);
  trunkLower.rotation.z = 0.05;
  trunkLower.castShadow = true;
  treeGroup.add(trunkLower);

  const trunkUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.78, 10),
    barkMat
  );
  trunkUpper.position.set(-0.06, 1.25, 0.02);
  trunkUpper.rotation.z = 0.12;
  trunkUpper.castShadow = true;
  treeGroup.add(trunkUpper);

  const branchSpecs: Array<{
    pos: [number, number, number];
    rot: [number, number, number];
    len: number;
    rTop: number;
    rBot: number;
  }> = [
    { pos: [-0.46, 1.38, 0.05], rot: [0.08, 0, 0.78], len: 0.92, rTop: 0.06, rBot: 0.11 },
    { pos: [0.5, 1.44, -0.02], rot: [-0.06, 0, -0.82], len: 1.0, rTop: 0.06, rBot: 0.11 },
    { pos: [0.05, 1.68, -0.25], rot: [-0.42, 0, -0.1], len: 0.76, rTop: 0.06, rBot: 0.1 }
  ];
  for (const b of branchSpecs) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(b.rTop, b.rBot, b.len, 9),
      barkMat
    );
    mesh.position.set(...b.pos);
    mesh.rotation.set(...b.rot);
    mesh.castShadow = true;
    treeGroup.add(mesh);
  }

  // Hanging red-roofed birdhouse on right branch
  const birdhousePivot = new THREE.Group();
  birdhousePivot.position.set(0.86, 1.56, 0.04);
  treeGroup.add(birdhousePivot);

  const cordMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x3b2616, roughness: 0.7 })
  );
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 6), cordMat);
  cord.position.y = -0.17;
  birdhousePivot.add(cord);

  const houseWallMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xfff1c9, roughness: 0.65 })
  );
  const houseRoofMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xd95f76, roughness: 0.55 })
  );
  const houseBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.22), houseWallMat);
  houseBody.position.y = -0.44;
  houseBody.castShadow = true;
  birdhousePivot.add(houseBody);

  const houseRoof = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 4), houseRoofMat);
  houseRoof.position.y = -0.27;
  houseRoof.rotation.y = Math.PI / 4;
  houseRoof.castShadow = true;
  birdhousePivot.add(houseRoof);

  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), cordMat);
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, -0.43, 0.11);
  birdhousePivot.add(hole);

  // Layered cherry blossom canopies
  const blossomMatLight = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xffc4d6, roughness: 0.58 })
  );
  const blossomMatDeep = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf79cb7, roughness: 0.58 })
  );
  const blossomMatWhite = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.55 })
  );

  const canopyDefs: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
    mat: THREE.Material;
    delay: number;
  }> = [
    { pos: [0, 2.15, 0], scale: [1.05, 0.72, 0.85], mat: blossomMatLight, delay: 0.1 },
    { pos: [-0.85, 1.82, 0.12], scale: [0.8, 0.6, 0.7], mat: blossomMatDeep, delay: 0.22 },
    { pos: [0.88, 1.88, 0.05], scale: [0.78, 0.58, 0.68], mat: blossomMatLight, delay: 0.28 },
    { pos: [-0.35, 2.38, -0.18], scale: [0.7, 0.55, 0.65], mat: blossomMatWhite, delay: 0.34 },
    { pos: [0.42, 2.32, 0.16], scale: [0.68, 0.52, 0.62], mat: blossomMatDeep, delay: 0.38 },
    { pos: [0.04, 1.75, 0.38], scale: [0.62, 0.45, 0.52], mat: blossomMatWhite, delay: 0.42 }
  ];

  const canopies = canopyDefs.map((def) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 12), def.mat);
    puff.position.set(...def.pos);
    puff.castShadow = true;
    puff.receiveShadow = true;
    puff.userData = { targetScale: def.scale, delay: def.delay };
    treeGroup.add(puff);
    return puff;
  });

  // Swirling falling cherry petals
  const petalMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({
      color: 0xffb3c8,
      emissive: 0xff8fab,
      emissiveIntensity: 0.18,
      roughness: 0.45,
      side: THREE.DoubleSide
    })
  );
  const petalGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const petals: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.scale.set(1.2, 0.22, 0.78);
    petal.userData = {
      phase: i * 0.67,
      radius: 0.55 + ((i * 29) % 100) / 100 * 1.45,
      speed: 0.32 + (i % 4) * 0.08,
      baseY: 2.35
    };
    root.add(petal);
    petals.push(petal);
  }

  // 3 bees orbiting the blossom canopy
  const bees: Array<{ mesh: THREE.Group; radius: number; y: number; speed: number; offset: number }> =
    [];
  for (let i = 0; i < 3; i++) {
    const bee = assets.createBee();
    bee.scale.setScalar(0.5);
    root.add(bee);
    bees.push({
      mesh: bee,
      radius: 1.05 + i * 0.38,
      y: 1.5 + i * 0.36,
      speed: 1.05 - i * 0.14,
      offset: i * ((Math.PI * 2) / 3)
    });
  }

  // Frau Honig & two cheerful kids under the blossoms
  const mixers: THREE.AnimationMixer[] = [];
  const frauHonig = attachCharacter(root, owned, mixers, assets, 'frau_honig', 1.18, [-1.15, 0.14, 0.48], 0.25);
  const girl = attachCharacter(root, owned, mixers, assets, 'child_girl', 0.84, [1.02, 0.14, 0.56], -0.2);
  const boy = attachCharacter(root, owned, mixers, assets, 'child_boy', 0.86, [1.58, 0.14, 0.26], -0.35);

  return {
    root,
    lidBackdropColor: 0xffe6ef,
    trayFloorColor: 0x82c46c,
    ambientLightColor: 0xfff5ec,
    accentLightColor: 0xffb3c6,
    ownedMaterials: owned,
    mixers,
    update: (sceneTime, dt, reveal) => {
      const charPop = easeOutBack(Math.min(1, reveal * 1.25));
      frauHonig.root.scale.setScalar(1.18 * charPop);
      girl.root.scale.setScalar(0.84 * charPop);
      boy.root.scale.setScalar(0.86 * charPop);
      frauHonig.update(sceneTime, dt, 'wave');
      girl.update(sceneTime + 0.4, dt, 'cheer');
      boy.update(sceneTime + 0.9, dt, 'wave');
      const grow = easeOutBack(Math.min(1, reveal * 1.25));
      treeGroup.scale.set(
        THREE.MathUtils.lerp(0.15, 1, grow),
        THREE.MathUtils.lerp(0.05, 1, grow),
        THREE.MathUtils.lerp(0.15, 1, grow)
      );

      for (const puff of canopies) {
        const { targetScale, delay } = puff.userData as {
          targetScale: [number, number, number];
          delay: number;
        };
        const local = THREE.MathUtils.clamp((reveal - delay) / Math.max(0.25, 1 - delay), 0, 1);
        const pop = easeOutBack(local);
        const breathe = 1 + Math.sin(sceneTime * 1.6 + delay * 10) * 0.025;
        puff.scale.set(
          targetScale[0] * pop * breathe,
          targetScale[1] * pop * breathe,
          targetScale[2] * pop * breathe
        );
      }

      birdhousePivot.rotation.z = Math.sin(sceneTime * 1.9) * 0.11;

      flowers.forEach((fl, idx) => {
        fl.rotation.z = Math.sin(sceneTime * 2 + idx) * 0.08;
      });

      for (const petal of petals) {
        const d = petal.userData as { phase: number; radius: number; speed: number; baseY: number };
        const cycle = (sceneTime * d.speed + d.phase * 0.35) % 1;
        const angle = sceneTime * 1.15 + d.phase * 2.2;
        petal.position.set(
          Math.cos(angle) * (d.radius + Math.sin(cycle * Math.PI * 2) * 0.25),
          THREE.MathUtils.lerp(d.baseY, 0.2, cycle),
          Math.sin(angle) * d.radius * 0.58
        );
        petal.rotation.set(sceneTime * 2.5 + d.phase, angle, sceneTime * 1.8);
        petal.visible = reveal > 0.35;
      }

      bees.forEach((b, idx) => {
        const angle = sceneTime * b.speed + b.offset;
        const nextAngle = angle + 0.05;
        const x = Math.cos(angle) * b.radius;
        const z = Math.sin(angle) * b.radius * 0.65;
        const nx = Math.cos(nextAngle) * b.radius;
        const nz = Math.sin(nextAngle) * b.radius * 0.65;
        const y = b.y + Math.sin(sceneTime * 3.1 + idx * 1.8) * 0.16;

        b.mesh.position.set(x, y * Math.max(0.2, reveal), z);
        b.mesh.rotation.y = Math.atan2(nx - x, nz - z);
        b.mesh.rotation.x = 0.1;
        animateBeeWings(b.mesh, sceneTime + idx * 0.3);
      });
    }
  };
}

function buildTeaPartyScene(assets: AssetFactory): SuitcaseSceneRuntime {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  // Picnic blanket base
  const blanketMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xfff5dc, roughness: 0.85 })
  );
  const blanketStripeMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf48498, roughness: 0.82 })
  );
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.03, 2.3), blanketMat);
  blanket.position.set(0, 0.14, 0.04);
  blanket.receiveShadow = true;
  root.add(blanket);

  for (let i = -1; i <= 1; i++) {
    const stripX = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.034, 2.3), blanketStripeMat);
    stripX.position.set(i * 1.1, 0.142, 0.04);
    stripX.receiveShadow = true;
    root.add(stripX);
  }

  // Round miniature wooden table
  const tableWoodMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x9c6132, roughness: 0.65 })
  );
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 28), tableWoodMat);
  tableTop.position.set(0, 0.68, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  root.add(tableTop);

  const tablePedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.24, 0.5, 14),
    tableWoodMat
  );
  tablePedestal.position.set(0, 0.4, 0);
  tablePedestal.castShadow = true;
  root.add(tablePedestal);

  // Plate with golden honey muffins in the middle
  const porcelainMat = trackMat(
    owned,
    new THREE.MeshPhysicalMaterial({
      color: 0xfffdf8,
      roughness: 0.18,
      clearcoat: 0.85
    })
  );
  const goldTrimMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 0.45, roughness: 0.3 })
  );
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.04, 20), porcelainMat);
  plate.position.set(0, 0.74, 0);
  root.add(plate);

  const muffinMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xe39e46, roughness: 0.65 })
  );
  const glazeMat = trackMat(
    owned,
    new THREE.MeshPhysicalMaterial({ color: 0xffb703, roughness: 0.15, clearcoat: 1 })
  );
  const cherryMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xe64860, roughness: 0.35 })
  );
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const muffin = new THREE.Group();
    muffin.position.set(Math.cos(ang) * 0.17, 0.78, Math.sin(ang) * 0.17);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.072, 0.1, 12), muffinMat);
    base.position.y = 0.04;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), glazeMat);
    cap.scale.y = 0.65;
    cap.position.y = 0.1;
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), cherryMat);
    berry.position.y = 0.17;
    muffin.add(base, cap, berry);
    root.add(muffin);
  }

  // 3 floating waltzing porcelain teacups
  const teacups: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const cupGroup = new THREE.Group();
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.035, 18), porcelainMat);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.17, 16), porcelainMat);
    cup.position.y = 0.1;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 8, 18), goldTrimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.185;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 8, 12, Math.PI), porcelainMat);
    handle.position.set(0.145, 0.1, 0);
    handle.rotation.z = -Math.PI / 2;
    const teaFill = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14), glazeMat);
    teaFill.position.y = 0.16;
    cupGroup.add(saucer, cup, rim, handle, teaFill);
    root.add(cupGroup);
    teacups.push(cupGroup);
  }

  // Floating porcelain teapot hovering above
  const teapot = new THREE.Group();
  teapot.position.set(-0.25, 2.05, 0);
  const potBody = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), porcelainMat);
  potBody.scale.set(1.08, 0.85, 1.08);
  potBody.castShadow = true;
  const potBand = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.02, 8, 22), goldTrimMat);
  potBand.rotation.x = Math.PI / 2;
  potBand.position.y = 0.05;
  const potLid = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), porcelainMat);
  potLid.scale.set(1, 0.45, 1);
  potLid.position.y = 0.27;
  const potKnob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), goldTrimMat);
  potKnob.position.y = 0.36;
  const potHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.032, 10, 16, Math.PI * 1.25),
    porcelainMat
  );
  potHandle.position.set(-0.34, 0.02, 0);
  potHandle.rotation.z = Math.PI * 0.4;
  const potSpout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.085, 0.34, 12),
    porcelainMat
  );
  potSpout.position.set(0.36, 0.09, 0);
  potSpout.rotation.z = -1.02;
  teapot.add(potBody, potBand, potLid, potKnob, potHandle, potSpout);
  root.add(teapot);

  // Shimmering honey-tea pour stream & splashes
  const streamMat = trackMat(
    owned,
    new THREE.MeshPhysicalMaterial({
      color: 0xffc324,
      emissive: 0xff9500,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1
    })
  );
  const teaStream = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.042, 0.72, 10), streamMat);
  root.add(teaStream);

  // Rising warm steam puffs
  const steamMat = trackMat(
    owned,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    })
  );
  const steamGeo = new THREE.SphereGeometry(0.065, 10, 8);
  const steamPuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(steamGeo, steamMat);
    puff.userData = { phase: i * 0.65, idx: i };
    root.add(puff);
    steamPuffs.push(puff);
  }

  // Surrounding party blossoms
  for (let i = 0; i < 4; i++) {
    const fl = createFlowerModel(i);
    const sx = i < 2 ? -1.95 + i * 0.45 : 1.5 + (i - 2) * 0.45;
    const sz = i % 2 === 0 ? -0.85 : 0.92;
    fl.position.set(sx, 0.32, sz);
    fl.scale.setScalar(0.5);
    root.add(fl);
  }

  // Two curious party bees
  const partyBees = [assets.createBee(), assets.createBee()];
  partyBees.forEach((b) => {
    b.scale.setScalar(0.48);
    root.add(b);
  });

  const mixers: THREE.AnimationMixer[] = [];
  const frauHonig = attachCharacter(root, owned, mixers, assets, 'frau_honig', 1.15, [-1.42, 0.16, -0.25], 0.35);
  const girl = attachCharacter(root, owned, mixers, assets, 'child_girl', 0.84, [1.45, 0.16, 0.25], -0.4);
  const boy = attachCharacter(root, owned, mixers, assets, 'child_boy', 0.86, [-1.25, 0.16, 0.65], 0.45);

  return {
    root,
    lidBackdropColor: 0xfff0cc,
    trayFloorColor: 0xe6b978,
    ambientLightColor: 0xfff7e2,
    accentLightColor: 0xffc857,
    ownedMaterials: owned,
    mixers,
    update: (sceneTime, dt, reveal) => {
      const pop = easeOutBack(Math.min(1, reveal * 1.15));
      frauHonig.root.scale.setScalar(1.15 * pop);
      girl.root.scale.setScalar(0.84 * pop);
      boy.root.scale.setScalar(0.86 * pop);
      frauHonig.update(sceneTime, dt, 'sip_tea');
      girl.update(sceneTime + 0.5, dt, 'cheer');
      boy.update(sceneTime + 0.2, dt, 'sip_tea');

      // Orbit & bob 3 teacups
      teacups.forEach((cup, idx) => {
        const ang = sceneTime * 0.75 + (idx * Math.PI * 2) / 3;
        const radius = 1.12;
        const x = Math.cos(ang) * radius;
        const z = Math.sin(ang) * radius * 0.65;
        const y = (1.12 + Math.sin(sceneTime * 2.4 + idx * 2.1) * 0.14) * pop;
        cup.position.set(x, y, z);
        cup.rotation.z = Math.sin(sceneTime * 1.8 + idx) * 0.09;
        cup.scale.setScalar(pop);
      });

      // Teapot follows frontmost teacup position slightly & pours periodically
      const pourWave = (Math.sin(sceneTime * 1.6) + 1) * 0.5;
      const tilt = THREE.MathUtils.lerp(-0.1, -0.52, pourWave);
      teapot.position.set(-0.35 + Math.sin(sceneTime * 0.9) * 0.14, (2.08 + Math.cos(sceneTime * 2) * 0.08) * pop, 0.15);
      teapot.rotation.z = tilt;
      teapot.scale.setScalar(pop);

      teaStream.visible = reveal > 0.6 && pourWave > 0.32;
      if (teaStream.visible) {
        const localTipX = 0.5;
        const localTipY = 0.16;
        const spoutX = teapot.position.x + localTipX * Math.cos(tilt) - localTipY * Math.sin(tilt);
        const spoutY = teapot.position.y + localTipX * Math.sin(tilt) + localTipY * Math.cos(tilt);
        teaStream.position.set(spoutX, spoutY - 0.36, teapot.position.z);
        const thickness = THREE.MathUtils.clamp((pourWave - 0.32) * 1.6, 0.2, 1);
        teaStream.scale.set(thickness, 1, thickness);
      }

      for (const puff of steamPuffs) {
        const d = puff.userData as { phase: number; idx: number };
        const t = (sceneTime * 0.45 + d.phase) % 1;
        const cup = teacups[d.idx % teacups.length];
        puff.position.set(
          cup.position.x + Math.sin(t * 6 + d.phase) * 0.07,
          cup.position.y + 0.2 + t * 0.55,
          cup.position.z
        );
        puff.scale.setScalar((0.6 + t * 1.1) * pop);
        puff.visible = reveal > 0.5 && t < 0.92;
      }

      partyBees.forEach((bee, idx) => {
        const dir = idx === 0 ? 1 : -1;
        const ang = sceneTime * (1.2 + idx * 0.25) * dir + idx * Math.PI;
        bee.position.set(
          Math.cos(ang) * 1.55,
          (1.65 + Math.sin(sceneTime * 3 + idx * 2) * 0.18) * Math.max(0.25, reveal),
          Math.sin(ang) * 0.95
        );
        bee.rotation.y = Math.atan2(-Math.sin(ang) * dir, Math.cos(ang) * dir);
        animateBeeWings(bee, sceneTime + idx * 0.4);
      });
    }
  };
}

function buildBeeHeartScene(assets: AssetFactory): SuitcaseSceneRuntime {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];
  const glowTex = createMagicGlowTexture();
  if (glowTex) ownedTextures.push(glowTex);

  // Giant golden honey pot centerpiece
  const heroPot = createHoneyPotModel();
  heroPot.scale.setScalar(1.42);
  heroPot.position.set(0, 0.66, 0.1);
  root.add(heroPot);

  // Decorative ring of 8 bright flowers around the honey pot
  for (let i = 0; i < 8; i++) {
    const fl = createFlowerModel(i);
    const angle = (i / 8) * Math.PI * 2;
    fl.position.set(Math.cos(angle) * 1.65, 0.34, Math.sin(angle) * 0.98);
    fl.scale.setScalar(0.58);
    root.add(fl);
  }

  // Soft glowing golden fairy-dust trail along the heart
  const heartDustMat = trackMat(
    owned,
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffe67a,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  const heartDust: THREE.Sprite[] = [];
  for (let i = 0; i < 16; i++) {
    const dot = new THREE.Sprite(heartDustMat);
    dot.userData = { index: i };
    root.add(dot);
    heartDust.push(dot);
  }

  // 8 golden bees that spiral up into a floating beating heart
  const heartBees: THREE.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const bee = assets.createBee();
    bee.scale.setScalar(0.46);
    root.add(bee);
    heartBees.push(bee);
  }

  const heartPoint = (paramT: number, pulse: number): [number, number] => {
    const s = Math.sin(paramT);
    const x = 16 * s * s * s;
    const y =
      13 * Math.cos(paramT) -
      5 * Math.cos(2 * paramT) -
      2 * Math.cos(3 * paramT) -
      Math.cos(4 * paramT);
    const scale = 0.072 * pulse;
    return [x * scale, 2.15 + y * scale];
  };

  const mixers: THREE.AnimationMixer[] = [];
  const frauHonig = attachCharacter(root, owned, mixers, assets, 'frau_honig', 1.18, [-1.18, 0.14, 0.36], 0.25);
  const girl = attachCharacter(root, owned, mixers, assets, 'child_girl', 0.84, [1.05, 0.14, 0.48], -0.25);
  const boy = attachCharacter(root, owned, mixers, assets, 'child_boy', 0.86, [1.62, 0.14, 0.18], -0.35);

  return {
    root,
    lidBackdropColor: 0xffeab8,
    trayFloorColor: 0xf4c45a,
    ambientLightColor: 0xfff9e6,
    accentLightColor: 0xffae24,
    ownedMaterials: owned,
    ownedTextures,
    mixers,
    update: (sceneTime, dt, reveal) => {
      const potPop = easeOutBack(Math.min(1, reveal * 1.25));
      frauHonig.root.scale.setScalar(1.18 * potPop);
      girl.root.scale.setScalar(0.84 * potPop);
      boy.root.scale.setScalar(0.86 * potPop);
      frauHonig.update(sceneTime, dt, 'wave');
      girl.update(sceneTime + 0.3, dt, 'cheer');
      boy.update(sceneTime + 0.8, dt, 'cheer');
      heroPot.scale.setScalar(1.42 * potPop);
      heroPot.rotation.y = Math.sin(sceneTime * 0.7) * 0.22;

      const pulse = 1 + Math.sin(sceneTime * 3.4) * 0.055;
      const formBlend = THREE.MathUtils.smoothstep(reveal, 0.2, 0.95);

      heartBees.forEach((bee, idx) => {
        const tCurve = (idx / heartBees.length) * Math.PI * 2 + sceneTime * 0.35;
        const [hx, hy] = heartPoint(tCurve, pulse);

        const spiralAngle = sceneTime * 2.4 + idx * 0.85;
        const spiralRadius = 0.25 + (1 - formBlend) * 0.95;
        const sx = Math.cos(spiralAngle) * spiralRadius;
        const sy = 0.6 + formBlend * 1.2;
        const sz = Math.sin(spiralAngle) * 0.65 * (1 - formBlend) + Math.sin(sceneTime * 1.8 + idx) * 0.14;

        bee.position.set(
          THREE.MathUtils.lerp(sx, hx, formBlend),
          THREE.MathUtils.lerp(sy, hy, formBlend),
          sz
        );
        bee.rotation.y = Math.sin(sceneTime * 1.5 + idx) * 0.35;
        bee.rotation.z = Math.cos(sceneTime * 2.2 + idx) * 0.1;
        animateBeeWings(bee, sceneTime + idx * 0.22);
      });

      heartDust.forEach((dot, idx) => {
        const tCurve = (idx / heartDust.length) * Math.PI * 2 - sceneTime * 0.25;
        const [hx, hy] = heartPoint(tCurve, pulse * 1.03);
        dot.position.set(hx, hy, Math.sin(sceneTime * 2 + idx) * 0.08);
        const s = (0.24 + Math.sin(sceneTime * 4.2 + idx) * 0.11) * formBlend;
        dot.scale.setScalar(s);
        dot.visible = formBlend > 0.25;
      });
    }
  };
}

function buildUmbrellaFlightScene(assets: AssetFactory): SuitcaseSceneRuntime {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  // Cozy miniature village rooftops along bottom back
  const houseSpecs: Array<{ x: number; z: number; w: number; h: number; wall: number; roof: number }> =
    [
      { x: -1.9, z: -0.58, w: 0.65, h: 0.56, wall: 0xfff0cc, roof: 0xd9604c },
      { x: -1.0, z: -0.22, w: 0.68, h: 0.64, wall: 0xfde2c8, roof: 0x5c7ca8 },
      { x: -0.05, z: -0.62, w: 0.74, h: 0.72, wall: 0xfff6dd, roof: 0xd95f76 },
      { x: 0.95, z: -0.24, w: 0.65, h: 0.6, wall: 0xfbe5c0, roof: 0x67a36f },
      { x: 1.85, z: -0.55, w: 0.66, h: 0.58, wall: 0xfff1cf, roof: 0xc9733a }
    ];
  const windowMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({
      color: 0xffe47a,
      emissive: 0xffb703,
      emissiveIntensity: 0.75,
      roughness: 0.25
    })
  );
  const housesGroup = new THREE.Group();
  for (const h of houseSpecs) {
    const wallMat = trackMat(owned, new THREE.MeshStandardMaterial({ color: h.wall, roughness: 0.75 }));
    const roofMat = trackMat(owned, new THREE.MeshStandardMaterial({ color: h.roof, roughness: 0.6 }));
    const house = new THREE.Group();
    house.position.set(h.x, 0.14, h.z);

    const body = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.w * 0.85), wallMat);
    body.position.y = h.h / 2;
    body.castShadow = true;
    house.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(h.w * 0.78, h.h * 0.56, 4), roofMat);
    roof.position.y = h.h + h.h * 0.26;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    for (const wx of [-h.w * 0.2, h.w * 0.2]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.03), windowMat);
      win.position.set(wx, h.h * 0.52, (h.w * 0.85) / 2 + 0.01);
      house.add(win);
    }
    housesGroup.add(house);
  }
  root.add(housesGroup);

  // Fluffy drifting white clouds
  const cloudMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 })
  );
  const clouds: Array<{ group: THREE.Group; baseX: number; y: number; z: number; speed: number }> =
    [];
  for (let i = 0; i < 4; i++) {
    const cg = new THREE.Group();
    const puffs: Array<[number, number, number, number]> = [
      [0, 0, 0, 0.24],
      [-0.22, -0.04, 0.02, 0.18],
      [0.22, -0.04, -0.02, 0.19],
      [0.08, 0.1, 0, 0.16]
    ];
    for (const [px, py, pz, r] of puffs) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
      m.position.set(px, py, pz);
      cg.add(m);
    }
    root.add(cg);
    clouds.push({
      group: cg,
      baseX: -1.8 + i * 1.25,
      y: 1.55 + (i % 2) * 0.42,
      z: i % 2 === 0 ? -0.6 : 0.45,
      speed: 0.35 + i * 0.08
    });
  }

  // Colorful striped magic umbrella
  const umbrella = new THREE.Group();
  const handleMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x734222, roughness: 0.55 })
  );
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.05, 10), handleMat);
  shaft.position.y = -0.35;
  const hook = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.028, 8, 14, Math.PI),
    handleMat
  );
  hook.position.set(-0.11, -0.88, 0);
  hook.rotation.z = Math.PI;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 10), handleMat);
  tip.position.y = 0.24;
  umbrella.add(shaft, hook, tip);

  const canopyColors = [0xff6b8b, 0xffbe2e, 0x5bc0de, 0x7bc96f, 0xff8c42, 0xc77dff];
  const wedgeAngle = (Math.PI * 2) / canopyColors.length;
  canopyColors.forEach((col, idx) => {
    const wMat = trackMat(
      owned,
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.42, side: THREE.DoubleSide })
    );
    const wedge = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 12, 10, idx * wedgeAngle, wedgeAngle + 0.04, 0, Math.PI * 0.46),
      wMat
    );
    wedge.position.y = -0.6;
    wedge.castShadow = true;
    umbrella.add(wedge);
  });
  root.add(umbrella);

  // Swirling wind puffs + 2 flying bees
  const windMat = trackMat(
    owned,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    })
  );
  const windMotes: THREE.Mesh[] = [];
  const moteGeo = new THREE.SphereGeometry(0.04, 8, 6);
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(moteGeo, windMat);
    m.userData = { phase: i * 0.5 };
    root.add(m);
    windMotes.push(m);
  }

  const bees = [assets.createBee(), assets.createBee()];
  bees.forEach((b) => {
    b.scale.setScalar(0.46);
    root.add(b);
  });

  // Frau Honig sails high overhead holding the magic umbrella while children cheer from the village!
  const mixers: THREE.AnimationMixer[] = [];
  const frauHonig = attachCharacter(
    umbrella,
    owned,
    mixers,
    assets,
    'frau_honig',
    0.92,
    [0, -1.68, 0],
    0
  );
  const girl = attachCharacter(root, owned, mixers, assets, 'child_girl', 0.82, [-0.45, 0.14, 0.88], 0.18);
  const boy = attachCharacter(root, owned, mixers, assets, 'child_boy', 0.84, [0.55, 0.14, 0.84], -0.18);

  return {
    root,
    lidBackdropColor: 0xcbe8ff,
    trayFloorColor: 0x7ab86b,
    ambientLightColor: 0xf4faff,
    accentLightColor: 0xffe082,
    ownedMaterials: owned,
    mixers,
    update: (sceneTime, dt, reveal) => {
      const pop = easeOutBack(Math.min(1, reveal * 1.2));
      housesGroup.scale.set(1, Math.max(0.05, pop), 1);

      clouds.forEach((c) => {
        const span = 4.8;
        const wrappedX = (((c.baseX + sceneTime * c.speed + span / 2) % span) + span) % span - span / 2;
        c.group.position.set(wrappedX, c.y, c.z);
        c.group.scale.setScalar(pop);
      });

      const ux = Math.sin(sceneTime * 0.85) * 1.4;
      const uy = 2.66 + Math.sin(sceneTime * 1.9) * 0.14;
      const uz = 0.36 + Math.cos(sceneTime * 0.85) * 0.28;
      umbrella.position.set(ux, uy * pop, uz);
      umbrella.rotation.z = -Math.cos(sceneTime * 0.85) * 0.18;
      umbrella.rotation.x = Math.sin(sceneTime * 1.4) * 0.08;
      umbrella.rotation.y = Math.cos(sceneTime * 0.85) * 0.25;
      umbrella.scale.setScalar(pop);

      frauHonig.update(sceneTime, dt, 'fly_umbrella');
      girl.root.scale.setScalar(0.82 * pop);
      boy.root.scale.setScalar(0.84 * pop);
      girl.update(sceneTime + 0.3, dt, 'cheer');
      boy.update(sceneTime + 0.7, dt, 'wave');

      windMotes.forEach((m, idx) => {
        const t = ((sceneTime * 0.55 + idx * 0.23) % 1);
        m.position.set(
          THREE.MathUtils.lerp(-2.5, 2.5, t),
          1.3 + Math.sin(t * 9 + idx) * 0.45 + (idx % 3) * 0.25,
          Math.cos(t * 6 + idx) * 0.7
        );
        m.visible = reveal > 0.35;
      });

      bees.forEach((bee, idx) => {
        const side = idx === 0 ? -1 : 1;
        bee.position.set(
          ux + side * 0.9 + Math.cos(sceneTime * 2.2 + idx) * 0.18,
          uy + 0.15 + Math.sin(sceneTime * 3.1 + idx * 2) * 0.15,
          uz + 0.35 * side
        );
        bee.rotation.y = Math.cos(sceneTime * 0.85) >= 0 ? Math.PI / 2 : -Math.PI / 2;
        animateBeeWings(bee, sceneTime + idx * 0.35);
      });
    }
  };
}

function buildSoapBubblesScene(assets: AssetFactory): SuitcaseSceneRuntime {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  addGrassTufts(
    root,
    owned,
    0x5fb354,
    [
      [-2.1, 0.7],
      [-1.1, 0.95],
      [0.4, 0.9],
      [1.7, 0.65],
      [2.1, -0.6],
      [-1.7, -0.75]
    ],
    0.14
  );

  for (let i = 0; i < 7; i++) {
    const fl = createFlowerModel(i);
    fl.position.set(-1.95 + i * 0.65, 0.34, i % 2 === 0 ? -0.58 : 0.72);
    fl.scale.setScalar(0.56);
    root.add(fl);
  }

  // Soap pot & waving brass bubble wand
  const potMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf47a98, roughness: 0.42 })
  );
  const soapPot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.42, 16), potMat);
  soapPot.position.set(-1.6, 0.35, 0.18);
  soapPot.castShadow = true;
  root.add(soapPot);

  const wandGroup = new THREE.Group();
  wandGroup.position.set(-1.32, 0.75, 0.25);
  const brassMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 0.6, roughness: 0.25 })
  );
  const wandStick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8), brassMat);
  wandStick.position.y = 0.25;
  const wandLoop = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.024, 10, 22), brassMat);
  wandLoop.position.y = 0.72;
  wandLoop.rotation.y = 0.45;
  wandGroup.add(wandStick, wandLoop);
  root.add(wandGroup);

  // Iridescent translucent soap bubbles carrying mini stars inside
  const bubbleTints = [0xb3e8ff, 0xffc8e6, 0xd4ffdb, 0xfff0b3];
  const bubbleMats = bubbleTints.map((c) =>
    trackMat(
      owned,
      new THREE.MeshPhysicalMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.46,
        roughness: 0.06,
        metalness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05
      })
    )
  );
  const coreStarMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({
      color: 0xffe46b,
      emissive: 0xffb703,
      emissiveIntensity: 0.55,
      roughness: 0.25
    })
  );
  const bubbleGeo = new THREE.SphereGeometry(1, 20, 16);
  const starGeo = new THREE.OctahedronGeometry(0.28, 0);

  const bubbles: THREE.Group[] = [];
  for (let i = 0; i < 15; i++) {
    const bg = new THREE.Group();
    const shell = new THREE.Mesh(bubbleGeo, bubbleMats[i % bubbleMats.length]);
    const innerStar = new THREE.Mesh(starGeo, coreStarMat);
    bg.add(shell, innerStar);
    bg.userData = {
      phase: i * 0.41,
      radius: 0.14 + (i % 4) * 0.065,
      driftZ: ((i % 5) - 2) * 0.24,
      speed: 0.22 + (i % 3) * 0.05,
      innerStar
    };
    root.add(bg);
    bubbles.push(bg);
  }

  // 3 playful bubble-chasing bees
  const bees = [assets.createBee(), assets.createBee(), assets.createBee()];
  bees.forEach((b) => {
    b.scale.setScalar(0.46);
    root.add(b);
  });

  const mixers: THREE.AnimationMixer[] = [];
  const frauHonig = attachCharacter(root, owned, mixers, assets, 'frau_honig', 1.15, [-0.88, 0.14, 0.36], 0.18);
  const girl = attachCharacter(root, owned, mixers, assets, 'child_girl', 0.84, [0.85, 0.14, 0.56], -0.25);
  const boy = attachCharacter(root, owned, mixers, assets, 'child_boy', 0.86, [1.58, 0.14, 0.25], -0.35);

  return {
    root,
    lidBackdropColor: 0xd9f5ff,
    trayFloorColor: 0x7bc96f,
    ambientLightColor: 0xf7fdff,
    accentLightColor: 0xffb7d5,
    ownedMaterials: owned,
    mixers,
    update: (sceneTime, dt, reveal) => {
      const pop = easeOutBack(Math.min(1, reveal * 1.2));
      frauHonig.root.scale.setScalar(1.15 * pop);
      girl.root.scale.setScalar(0.84 * pop);
      boy.root.scale.setScalar(0.86 * pop);
      frauHonig.update(sceneTime, dt, 'blow_bubbles');
      girl.update(sceneTime + 0.4, dt, 'cheer');
      boy.update(sceneTime + 0.9, dt, 'wave');
      wandGroup.rotation.z = Math.sin(sceneTime * 1.9) * 0.22 - 0.18;
      wandGroup.rotation.y = Math.cos(sceneTime * 1.4) * 0.24;
      wandGroup.scale.setScalar(pop);

      bubbles.forEach((bg, idx) => {
        const d = bg.userData as {
          phase: number;
          radius: number;
          driftZ: number;
          speed: number;
          innerStar: THREE.Mesh;
        };
        const cycle = (sceneTime * d.speed + d.phase) % 1;
        const x = THREE.MathUtils.lerp(-1.18, 2.05, cycle) + Math.sin(cycle * 9 + idx) * 0.24;
        const y = THREE.MathUtils.lerp(1.25, 3.05, Math.pow(cycle, 0.85)) + Math.cos(sceneTime * 2.5 + idx) * 0.09;
        const z = d.driftZ + Math.sin(sceneTime * 1.7 + idx) * 0.22;
        const inflate = THREE.MathUtils.smoothstep(cycle, 0, 0.16);
        const fade = cycle > 0.88 ? (1 - cycle) / 0.12 : 1;
        const wob = 1 + Math.sin(sceneTime * 4 + idx) * 0.07;

        bg.position.set(x, y, z);
        bg.scale.set(
          d.radius * inflate * fade * wob,
          d.radius * inflate * fade / Math.sqrt(wob),
          d.radius * inflate * fade * wob
        );
        d.innerStar.rotation.y = sceneTime * 2.4 + idx;
        d.innerStar.rotation.x = sceneTime * 1.7;
        bg.visible = reveal > 0.4;
      });

      bees.forEach((bee, idx) => {
        const ang = sceneTime * (1.1 + idx * 0.2) + idx * 2.1;
        const bx = 0.35 + Math.cos(ang) * (1.05 + idx * 0.22);
        const by = 1.45 + idx * 0.32 + Math.sin(sceneTime * 2.6 + idx) * 0.22;
        const bz = Math.sin(ang) * 0.72;
        bee.position.set(bx, by * Math.max(0.25, reveal), bz);
        bee.rotation.y = Math.atan2(-Math.sin(ang), Math.cos(ang));
        animateBeeWings(bee, sceneTime + idx * 0.25);
      });
    }
  };
}

function buildFireflyNightScene(assets: AssetFactory): SuitcaseSceneRuntime {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  // Garden bench on left
  const benchMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.75 })
  );
  const bench = new THREE.Group();
  bench.position.set(-1.35, 0.14, 0.12);
  bench.rotation.y = 0.28;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.36), benchMat);
  seat.position.y = 0.34;
  const backRest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.06), benchMat);
  backRest.position.set(0, 0.56, -0.15);
  backRest.rotation.x = -0.15;
  for (const lx of [-0.42, 0.42]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.32), benchMat);
    leg.position.set(lx, 0.17, 0);
    bench.add(leg);
  }
  bench.add(seat, backRest);
  root.add(bench);

  // Glowing vintage lantern on right
  const ironMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x2c2c38, roughness: 0.4, metalness: 0.55 })
  );
  const lanternGlassMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({
      color: 0xfff0a8,
      emissive: 0xffb703,
      emissiveIntensity: 1.4,
      roughness: 0.2
    })
  );
  const lantern = new THREE.Group();
  lantern.position.set(1.58, 0.14, -0.1);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 1.32, 10), ironMat);
  post.position.y = 0.66;
  const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.28, 8), lanternGlassMat);
  lampGlass.position.y = 1.42;
  const lampCap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 8), ironMat);
  lampCap.position.y = 1.62;
  const lanternLight = new THREE.PointLight(0xffca57, 1.8, 5.5, 2);
  lanternLight.position.set(0, 1.42, 0);
  lantern.add(post, lampGlass, lampCap, lanternLight);
  root.add(lantern);

  // Moonlit flowers
  for (let i = 0; i < 6; i++) {
    const fl = createFlowerModel(i);
    fl.position.set(-1.8 + i * 0.72, 0.32, i % 2 === 0 ? 0.85 : -0.72);
    fl.scale.setScalar(0.5);
    root.add(fl);
  }

  // Smiling golden crescent moon built cleanly from tapered torus arc + tip spheres
  const moonMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({
      color: 0xfff099,
      emissive: 0xffc83d,
      emissiveIntensity: 0.75,
      roughness: 0.3
    })
  );
  const moonGroup = new THREE.Group();
  moonGroup.position.set(-1.35, 2.35, -0.88);
  const moonArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.13, 14, 24, Math.PI * 1.25),
    moonMat
  );
  moonArc.rotation.z = Math.PI * 0.42;
  moonGroup.add(moonArc);
  root.add(moonGroup);

  // Soft glowing twinkling stars
  const nightGlowTex = createMagicGlowTexture();
  const ownedTextures: THREE.Texture[] = nightGlowTex ? [nightGlowTex] : [];
  const starMat = trackMat(
    owned,
    new THREE.SpriteMaterial({
      map: nightGlowTex,
      color: 0xfff6c8,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  const stars: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const st = new THREE.Sprite(starMat);
    st.position.set(
      -2.25 + ((i * 1.37) % 4.5),
      1.65 + ((i * 0.43) % 1.25),
      -0.95 - (i % 3) * 0.08
    );
    st.userData = { phase: i * 0.9 };
    root.add(st);
    stars.push(st);
  }

  // 20 warm glowing fireflies weaving lazy figure-eights
  const fireflyMat = trackMat(
    owned,
    new THREE.SpriteMaterial({
      map: nightGlowTex,
      color: 0xffe46b,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  const fireflies: THREE.Sprite[] = [];
  for (let i = 0; i < 20; i++) {
    const ff = new THREE.Sprite(fireflyMat);
    ff.userData = {
      cx: -1.9 + ((i * 0.79) % 3.8),
      cy: 0.55 + ((i * 0.33) % 1.45),
      cz: -0.6 + ((i * 0.51) % 1.3),
      phase: i * 1.15,
      speed: 0.8 + (i % 4) * 0.25
    };
    root.add(ff);
    fireflies.push(ff);
  }

  // Two gentle night bees near the lantern
  const bees = [assets.createBee(), assets.createBee()];
  bees.forEach((b) => {
    b.scale.setScalar(0.45);
    root.add(b);
  });

  // Frau Honig & girl sit cozily on the garden bench looking at moon/fireflies; boy waves beside the lantern
  const mixers: THREE.AnimationMixer[] = [];
  const frauHonig = attachCharacter(
    bench,
    owned,
    mixers,
    assets,
    'frau_honig',
    1.12,
    [-0.2, 0.37 - 0.32 * 1.12, 0.04],
    0
  );
  const girl = attachCharacter(
    bench,
    owned,
    mixers,
    assets,
    'child_girl',
    0.84,
    [0.24, 0.37 - 0.32 * 0.84, 0.04],
    -0.12
  );
  const boy = attachCharacter(root, owned, mixers, assets, 'child_boy', 0.86, [0.95, 0.14, 0.48], -0.2);

  return {
    root,
    lidBackdropColor: 0x1e2554,
    trayFloorColor: 0x2f4d3b,
    ambientLightColor: 0x9ab0ff,
    accentLightColor: 0xffd166,
    ownedMaterials: owned,
    ownedTextures,
    mixers,
    update: (sceneTime, dt, reveal) => {
      const pop = easeOutBack(Math.min(1, reveal * 1.2));
      bench.scale.setScalar(pop);
      boy.root.scale.setScalar(0.86 * pop);
      frauHonig.update(sceneTime, dt, 'sit_stargaze');
      girl.update(sceneTime + 0.6, dt, 'sit_stargaze');
      boy.update(sceneTime + 0.3, dt, 'wave');
      lantern.scale.set(1, Math.max(0.05, pop), 1);
      lanternLight.intensity = (1.65 + Math.sin(sceneTime * 4.5) * 0.25) * reveal;

      moonGroup.scale.setScalar(pop);
      moonGroup.rotation.z = Math.sin(sceneTime * 0.9) * 0.08;

      stars.forEach((st) => {
        const phase = (st.userData as { phase: number }).phase;
        const tw = 0.55 + 0.55 * Math.sin(sceneTime * 3.1 + phase);
        st.scale.setScalar(0.24 * tw * pop);
      });

      fireflies.forEach((ff) => {
        const d = ff.userData as {
          cx: number;
          cy: number;
          cz: number;
          phase: number;
          speed: number;
        };
        const t = sceneTime * d.speed + d.phase;
        ff.position.set(
          d.cx + Math.sin(t) * 0.42,
          d.cy + Math.sin(t * 2) * 0.18,
          d.cz + Math.cos(t * 1.3) * 0.28
        );
        const glow = 0.65 + 0.55 * Math.sin(sceneTime * 4.2 + d.phase);
        ff.scale.setScalar(0.28 * glow * reveal);
      });

      bees.forEach((bee, idx) => {
        const ang = sceneTime * 0.9 + idx * Math.PI;
        bee.position.set(
          Math.cos(ang) * 0.85,
          1.15 + Math.sin(sceneTime * 2 + idx) * 0.14,
          Math.sin(ang) * 0.55
        );
        bee.rotation.y = Math.atan2(-Math.sin(ang), Math.cos(ang));
        animateBeeWings(bee, sceneTime + idx * 0.4, 20, 0.58);
      });
    }
  };
}

function buildBeeChristmasNeedleScene(assets: AssetFactory): SuitcaseSceneRuntime {
  const root = new THREE.Group();
  const owned: THREE.Material[] = [];

  const glowTex = createMagicGlowTexture();
  const ownedTextures: THREE.Texture[] = glowTex ? [glowTex] : [];

  // Cozy crimson Christmas rug with golden trim
  const rugMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xb82937, roughness: 0.88 })
  );
  const goldMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({
      color: 0xffd147,
      emissive: 0xffa600,
      emissiveIntensity: 0.32,
      metalness: 0.48,
      roughness: 0.25
    })
  );
  const standRedMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xd63344, roughness: 0.42 })
  );
  const needleMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x2f7d44, roughness: 0.48 })
  );
  const stemBrownMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.72 })
  );
  const hiveWoodMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x8f5624, roughness: 0.76 })
  );
  const combWindowMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({
      color: 0xffc84a,
      emissive: 0xff9e1c,
      emissiveIntensity: 0.55,
      roughness: 0.35
    })
  );
  const santaRedMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xd92638, roughness: 0.55 })
  );
  const whiteFluffMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.85 })
  );

  const rug = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.78, 0.024, 28), rugMat);
  rug.position.set(0, 0.142, 0.08);
  rug.receiveShadow = true;
  root.add(rug);

  const rugRim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.022, 8, 32), goldMat);
  rugRim.rotation.x = Math.PI / 2;
  rugRim.position.set(0, 0.156, 0.08);
  root.add(rugRim);

  // Cozy curved honeycomb hive alcove behind the single-needle tree
  const hiveBackdrop = new THREE.Group();
  hiveBackdrop.position.set(0, 0.14, -0.78);
  const archWall = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 1.18, 1.38, 18, 1, true, Math.PI * 0.72, Math.PI * 0.56),
    trackMat(
      owned,
      new THREE.MeshStandardMaterial({
        color: 0xc27b2b,
        roughness: 0.75,
        side: THREE.DoubleSide
      })
    )
  );
  archWall.position.set(0, 0.68, 0.35);
  archWall.castShadow = true;
  archWall.receiveShadow = true;
  hiveBackdrop.add(archWall);

  // Glowing hexagonal honeycomb windows in the alcove
  const hexPositions: Array<[number, number, number, number]> = [
    [-0.46, 0.72, -0.58, 0.25],
    [0, 0.94, -0.66, 0],
    [0.46, 0.72, -0.58, -0.25]
  ];
  for (const [hx, hy, hz, hRotY] of hexPositions) {
    const hexCell = new THREE.Group();
    hexCell.position.set(hx, hy, hz);
    hexCell.rotation.y = hRotY;
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 6), hiveWoodMat);
    frame.rotation.x = Math.PI / 2;
    hexCell.add(frame);
    const pane = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.095, 6), combWindowMat);
    pane.rotation.x = Math.PI / 2;
    hexCell.add(pane);
    hiveBackdrop.add(hexCell);
  }
  root.add(hiveBackdrop);

  // Festive single-pine-needle Christmas tree group
  const treeGroup = new THREE.Group();
  treeGroup.position.set(0, 0.15, 0.08);
  root.add(treeGroup);

  // Red tree stand with 4 little golden feet & brass holder collar
  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.1, 16), standRedMat);
  standBase.position.y = 0.05;
  standBase.castShadow = true;
  treeGroup.add(standBase);

  const standCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.07, 14), goldMat);
  standCollar.position.y = 0.115;
  standCollar.castShadow = true;
  treeGroup.add(standCollar);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.032, 0.11), goldMat);
    foot.position.set(Math.sin(a) * 0.18, 0.016, Math.cos(a) * 0.18);
    foot.rotation.y = a;
    foot.castShadow = true;
    treeGroup.add(foot);
  }

  // Tiny woody stem sheath + ONE single slender gracefully curved green pine needle
  const petiole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.09, 10), stemBrownMat);
  petiole.position.y = 0.17;
  petiole.castShadow = true;
  treeGroup.add(petiole);

  const needleSegments: Array<{
    y: number;
    h: number;
    rBot: number;
    rTop: number;
    x: number;
    rotZ: number;
  }> = [
    { y: 0.34, h: 0.3, rBot: 0.042, rTop: 0.039, x: 0.008, rotZ: -0.05 },
    { y: 0.62, h: 0.3, rBot: 0.039, rTop: 0.034, x: 0.025, rotZ: -0.06 },
    { y: 0.9, h: 0.29, rBot: 0.034, rTop: 0.026, x: 0.036, rotZ: -0.01 },
    { y: 1.17, h: 0.28, rBot: 0.026, rTop: 0.016, x: 0.026, rotZ: 0.07 },
    { y: 1.4, h: 0.22, rBot: 0.016, rTop: 0.004, x: 0.006, rotZ: 0.11 }
  ];

  const singleNeedle = new THREE.Group();
  for (const seg of needleSegments) {
    const segMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(seg.rTop, seg.rBot, seg.h, 10),
      needleMat
    );
    segMesh.scale.set(1.15, 1, 0.62); // Flattened true pine-needle cross section
    segMesh.position.set(seg.x, seg.y, 0);
    segMesh.rotation.z = seg.rotZ;
    segMesh.castShadow = true;
    singleNeedle.add(segMesh);
  }

  // Tiny crimson ribbon bow tied cleanly near the bottom of the single needle
  const needleBow = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.015, 8, 16), santaRedMat);
  needleBow.rotation.x = Math.PI / 2;
  needleBow.position.set(0.01, 0.28, 0);
  singleNeedle.add(needleBow);

  // Golden star perched right on top of the single needle tip
  const starGroup = new THREE.Group();
  starGroup.position.set(-0.008, 1.54, 0);
  for (let i = 0; i < 2; i++) {
    const ray = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), goldMat);
    ray.scale.set(0.42, 1.25, 0.42);
    ray.rotation.z = i === 0 ? 0 : Math.PI / 4;
    starGroup.add(ray);
  }
  const starHoriz = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), goldMat);
  starHoriz.scale.set(1.25, 0.42, 0.42);
  starGroup.add(starHoriz);

  const starHaloMat = trackMat(
    owned,
    new THREE.SpriteMaterial({
      ...(glowTex ? { map: glowTex } : {}),
      color: 0xffe484,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  const starHalo = new THREE.Sprite(starHaloMat);
  starHalo.scale.setScalar(0.55);
  starGroup.add(starHalo);
  singleNeedle.add(starGroup);

  // 4 glossy miniature baubles dangling right from the single needle
  const baubleColors = [0xe8384f, 0xffc83d, 0x4cc9f0, 0xf7799b];
  const baubleSpecs: Array<[number, number, number]> = [
    [-0.068, 0.46, 0.03],
    [0.095, 0.72, -0.02],
    [-0.048, 0.98, 0.035],
    [0.068, 1.22, -0.02]
  ];
  const baubles: THREE.Group[] = [];
  baubleSpecs.forEach(([bx, by, bz], idx) => {
    const bPivot = new THREE.Group();
    bPivot.position.set(bx * 0.55, by + 0.05, bz);
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.065, 6), goldMat);
    thread.position.set(bx * 0.45, -0.025, 0);
    thread.rotation.z = bx < 0 ? -0.35 : 0.35;
    bPivot.add(thread);

    const ballMat = trackMat(
      owned,
      new THREE.MeshStandardMaterial({
        color: baubleColors[idx % baubleColors.length],
        metalness: 0.35,
        roughness: 0.2
      })
    );
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 12), ballMat);
    ball.position.set(bx * 0.55, -0.065, 0);
    ball.castShadow = true;
    bPivot.add(ball);
    singleNeedle.add(bPivot);
    baubles.push(bPivot);
  });

  // Warm fairy lights spiraling gently around the single pine needle
  const fairyLights: Array<{ sprite: THREE.Sprite; phase: number }> = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const ang = t * Math.PI * 3.4;
    const r = 0.065 - t * 0.02;
    const bulbMat = trackMat(
      owned,
      new THREE.SpriteMaterial({
        ...(glowTex ? { map: glowTex } : {}),
        color: i % 2 === 0 ? 0xffeb85 : 0xff9f68,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    const bulb = new THREE.Sprite(bulbMat);
    bulb.position.set(Math.cos(ang) * r + 0.015, 0.32 + t * 1.06, Math.sin(ang) * r);
    bulb.scale.setScalar(0.16);
    singleNeedle.add(bulb);
    fairyLights.push({ sprite: bulb, phase: i * 0.85 });
  }

  treeGroup.add(singleNeedle);

  // Tiny colorful wrapped gift boxes under the single-needle stand
  const giftSpecs: Array<{
    pos: [number, number, number];
    size: [number, number, number];
    rotY: number;
    boxCol: number;
    ribCol: number;
  }> = [
    { pos: [-0.36, 0.075, 0.26], size: [0.16, 0.12, 0.15], rotY: 0.3, boxCol: 0xe04352, ribCol: 0xffe066 },
    { pos: [0.34, 0.065, 0.24], size: [0.14, 0.1, 0.14], rotY: -0.42, boxCol: 0x4aa865, ribCol: 0xfff3d6 },
    { pos: [-0.26, 0.06, -0.26], size: [0.13, 0.09, 0.13], rotY: 0.65, boxCol: 0xf4b942, ribCol: 0xc92a3f },
    { pos: [0.3, 0.07, -0.2], size: [0.15, 0.11, 0.13], rotY: -0.22, boxCol: 0x62a8e5, ribCol: 0xffd166 }
  ];
  for (const g of giftSpecs) {
    const gift = new THREE.Group();
    gift.position.set(...g.pos);
    gift.rotation.y = g.rotY;
    const bMat = trackMat(owned, new THREE.MeshStandardMaterial({ color: g.boxCol, roughness: 0.55 }));
    const rMat = trackMat(owned, new THREE.MeshStandardMaterial({ color: g.ribCol, roughness: 0.35 }));
    const box = new THREE.Mesh(new THREE.BoxGeometry(...g.size), bMat);
    box.castShadow = true;
    gift.add(box);
    const ribA = new THREE.Mesh(
      new THREE.BoxGeometry(g.size[0] + 0.012, g.size[1] + 0.012, g.size[2] * 0.22),
      rMat
    );
    const ribB = new THREE.Mesh(
      new THREE.BoxGeometry(g.size[0] * 0.22, g.size[1] + 0.012, g.size[2] + 0.012),
      rMat
    );
    gift.add(ribA, ribB);
    treeGroup.add(gift);
  }

  // Warm Christmas tree glow light inside the hive alcove
  const treeGlowLight = new THREE.PointLight(0xffcb6b, 1.15, 5.2, 2);
  treeGlowLight.position.set(0, 1.35, 0.55);
  root.add(treeGlowLight);

  // Festive festive honeypot next to Frau Honig
  const honeyPot = createHoneyPotModel();
  honeyPot.position.set(-2.12, 0.34, 0.52);
  honeyPot.scale.setScalar(0.54);
  root.add(honeyPot);

  // 4 bees wearing tiny red Santa hats dancing & admiring the single pine needle
  const attachSantaHat = (bee: THREE.Group): void => {
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.23, 0.24);
    hatGroup.rotation.set(-0.22, 0, -0.1);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 16), whiteFluffMat);
    cuff.rotation.x = Math.PI / 2;
    hatGroup.add(cuff);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.24, 12), santaRedMat);
    cone.position.y = 0.11;
    hatGroup.add(cone);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), whiteFluffMat);
    pom.position.set(-0.015, 0.23, -0.01);
    hatGroup.add(pom);
    bee.add(hatGroup);
  };

  const festiveBees: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const b = assets.createRescuedBee();
    b.scale.setScalar(0.56);
    attachSantaHat(b);
    root.add(b);
    festiveBees.push(b);
  }

  // Soft snowflakes & warm winter sparkles drifting through the scene
  const snowMat = trackMat(
    owned,
    new THREE.SpriteMaterial({
      ...(glowTex ? { map: glowTex } : {}),
      color: 0xfff8e6,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  const snowflakes: Array<{
    sprite: THREE.Sprite;
    bx: number;
    bz: number;
    phase: number;
    speed: number;
  }> = [];
  for (let i = 0; i < 18; i++) {
    const flake = new THREE.Sprite(snowMat);
    const bx = -2.2 + ((i * 1.13) % 4.4);
    const bz = -0.8 + ((i * 0.67) % 1.85);
    root.add(flake);
    snowflakes.push({
      sprite: flake,
      bx,
      bz,
      phase: i * 0.55,
      speed: 0.22 + (i % 4) * 0.07
    });
  }

  // Frau Honig and both children smiling beside the bees' single-needle Christmas tree
  const mixers: THREE.AnimationMixer[] = [];
  const frauHonig = attachCharacter(
    root,
    owned,
    mixers,
    assets,
    'frau_honig',
    1.05,
    [-1.68, 0.14, 0.36],
    0.56
  );
  const girl = attachCharacter(
    root,
    owned,
    mixers,
    assets,
    'child_girl',
    0.86,
    [1.48, 0.14, 0.42],
    -0.6
  );
  const boy = attachCharacter(
    root,
    owned,
    mixers,
    assets,
    'child_boy',
    0.88,
    [2.02, 0.14, -0.06],
    -0.84
  );

  return {
    root,
    lidBackdropColor: 0x3b2640,
    trayFloorColor: 0xe6b554,
    ambientLightColor: 0xfff0cc,
    accentLightColor: 0xffc857,
    ownedMaterials: owned,
    ownedTextures,
    mixers,
    update: (sceneTime, dt, reveal) => {
      const pop = easeOutBack(Math.min(1, reveal * 1.2));
      treeGroup.scale.setScalar(pop);
      hiveBackdrop.scale.setScalar(pop);
      honeyPot.scale.setScalar(0.54 * pop);
      frauHonig.root.scale.setScalar(1.05 * pop);
      girl.root.scale.setScalar(0.86 * pop);
      boy.root.scale.setScalar(0.88 * pop);

      frauHonig.update(sceneTime, dt, 'wave');
      girl.update(sceneTime + 0.5, dt, 'cheer');
      boy.update(sceneTime + 1.0, dt, 'wave');

      // Gentle sway on the proud single needle + star + hanging baubles
      singleNeedle.rotation.z = Math.sin(sceneTime * 1.4) * 0.022;
      starGroup.rotation.y = sceneTime * 0.9;
      starHalo.scale.setScalar(0.5 + Math.sin(sceneTime * 3.8) * 0.1);
      treeGlowLight.intensity = (1.1 + Math.sin(sceneTime * 3.4) * 0.18) * reveal;

      baubles.forEach((b, idx) => {
        b.rotation.z = Math.sin(sceneTime * 2.3 + idx * 1.4) * 0.08;
      });

      fairyLights.forEach((fl) => {
        const pulse = 0.72 + 0.45 * Math.sin(sceneTime * 4.4 + fl.phase);
        fl.sprite.scale.setScalar(0.16 * pulse);
      });

      // 3 bees orbit & celebrate around the needle; 1 admirer hovers near the star
      festiveBees.forEach((bee, idx) => {
        if (idx < 3) {
          const ang = sceneTime * 1.35 + (idx / 3) * Math.PI * 2;
          const r = 0.88 + Math.sin(sceneTime * 2 + idx) * 0.08;
          bee.position.set(
            Math.cos(ang) * r,
            0.78 + Math.sin(sceneTime * 3.2 + idx * 1.7) * 0.16,
            0.08 + Math.sin(ang) * r * 0.75
          );
          bee.rotation.y = Math.atan2(-Math.sin(ang), Math.cos(ang));
        } else {
          const hoverX = 0.42 + Math.sin(sceneTime * 1.5) * 0.08;
          const hoverZ = 0.36 + Math.cos(sceneTime * 1.2) * 0.07;
          bee.position.set(hoverX, 1.52 + Math.sin(sceneTime * 3.6) * 0.08, hoverZ);
          bee.rotation.y = -2.25 + Math.sin(sceneTime * 1.9) * 0.16;
        }
        animateBeeWings(bee, sceneTime + idx * 0.35, 26, 0.7);
      });

      // Drifting winter snowflakes & golden dust
      snowflakes.forEach((sf) => {
        const cyc = (sceneTime * sf.speed + sf.phase) % 1;
        const fade = Math.sin(cyc * Math.PI);
        sf.sprite.position.set(
          sf.bx + Math.sin(sceneTime * 1.4 + sf.phase) * 0.16,
          2.65 - cyc * 2.35,
          sf.bz + Math.cos(sceneTime * 1.1 + sf.phase) * 0.12
        );
        sf.sprite.scale.setScalar(0.14 * (0.55 + fade * 0.6) * reveal);
      });
    }
  };
}

export const SUITCASE_SCENES: SuitcaseSceneDefinition[] = [
  {
    id: 'cherry_tree',
    emoji: '🌸',
    title: 'Der blühende Zauber-Kirschbaum',
    caption: 'Frau Honig und die Kinder staunen unter dem blühenden Kirschbaum aus dem Koffer!',
    build: buildCherryTreeScene
  },
  {
    id: 'honey_teaparty',
    emoji: '🫖',
    title: 'Die schwebende Honig-Teeparty',
    caption: 'Mit Frau Honig fliegen Porzellankanne und Tassen fröhlich durch die Luft!',
    build: buildTeaPartyScene
  },
  {
    id: 'bee_heart',
    emoji: '💛',
    title: 'Das tanzende Bienen-Herz',
    caption: 'Frau Honig und die Kinder jubeln, als die Bienen über dem Honigtopf ein goldenes Herz formen!',
    build: buildBeeHeartScene
  },
  {
    id: 'umbrella_flight',
    emoji: '☂️',
    title: 'Der Regenschirm-Windflug',
    caption: 'Hui! Frau Honig segelt mit ihrem bunten Schirm über die Dächer und die Kinder winken ihr zu!',
    build: buildUmbrellaFlightScene
  },
  {
    id: 'soap_bubbles',
    emoji: '🫧',
    title: 'Der Seifenblasen-Zauber',
    caption: 'Frau Honig zaubert riesige schillernde Seifenblasen mit Sternen für die Kinder!',
    build: buildSoapBubblesScene
  },
  {
    id: 'firefly_night',
    emoji: '✨',
    title: 'Die Glühwürmchen-Sternennacht',
    caption: 'Auf der Gartenbank schauen Frau Honig und die Kinder in eine funkelnde Glühwürmchen-Nacht.',
    build: buildFireflyNightScene
  },
  {
    id: 'bee_christmas_needle',
    emoji: '🎄',
    title: 'Der Bienenstock-Weihnachtsbaum',
    caption:
      'Im Bienenstock feiern die Bienen Weihnachten – natürlich mit einer einzigen, festlich geschmückten Tannennadel!',
    build: buildBeeChristmasNeedleScene
  }
];

export function getSuitcaseSceneForLevel(levelNumber: number): SuitcaseSceneDefinition {
  const index = (Math.max(1, levelNumber) - 1) % SUITCASE_SCENES.length;
  return SUITCASE_SCENES[index];
}

export function getSuitcaseSceneById(id: string): SuitcaseSceneDefinition | undefined {
  return SUITCASE_SCENES.find((s) => s.id === id);
}
