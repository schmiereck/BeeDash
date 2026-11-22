import * as THREE from 'three';
import { Direction, GridPos } from '../game/types';
import { CLOCK_COLORS, GATE_COLORS } from './albertaLevels';
import {
  LogicBlockDef,
  SocketDef,
  SourceBlockDef,
  TargetBlockDef
} from './albertaTypes';

export interface AlbertaModelBundle {
  root: THREE.Group;
  ownedMaterials: THREE.Material[];
  ownedTextures: THREE.Texture[];
}

export interface SourceCubeVisual extends AlbertaModelBundle {
  socketRings: Map<string, THREE.Mesh>;
  setLit: (lit: boolean) => void;
}

export interface LogicBlockVisual extends AlbertaModelBundle {
  socketRings: Map<string, THREE.Mesh>;
  setOutputLit: (lit: boolean) => void;
}

export interface TargetBlockVisual extends AlbertaModelBundle {
  socketRings: Map<string, THREE.Mesh>;
  setStates: (inputLit: boolean, targetLit: boolean, matched: boolean) => void;
}

export interface WireVisual extends AlbertaModelBundle {
  updateSignal: (isOn: boolean, elapsed: number) => void;
}

const SIDE_OFFSET: Record<Direction, { dx: number; dz: number; rotY: number }> = {
  right: { dx: 0.45, dz: 0, rotY: Math.PI / 2 },
  left: { dx: -0.45, dz: 0, rotY: -Math.PI / 2 },
  down: { dx: 0, dz: 0.45, rotY: 0 },
  up: { dx: 0, dz: -0.45, rotY: Math.PI }
};

export function getSocketPlugWorldPos(sock: SocketDef): THREE.Vector3 {
  const off = SIDE_OFFSET[sock.side];
  return new THREE.Vector3(sock.tileX + off.dx, 0.24, sock.tileY + off.dz);
}

function createBadgeTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ownedTextures: THREE.Texture[],
  w = 192,
  h = 192
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  ownedTextures.push(tex);
  return tex;
}

function addSocketPlugPort(
  parent: THREE.Group,
  ownedMaterials: THREE.Material[],
  socket: SocketDef,
  localPos: THREE.Vector3,
  isOutput: boolean,
  socketRings: Map<string, THREE.Mesh>
): void {
  const portGroup = new THREE.Group();
  portGroup.position.copy(localPos);
  portGroup.rotation.y = SIDE_OFFSET[socket.side].rotY;

  const collarMat = new THREE.MeshStandardMaterial({
    color: isOutput ? 0xe0aa2b : 0xb8c5d6,
    metalness: 0.48,
    roughness: 0.34
  });
  const holeMat = new THREE.MeshStandardMaterial({
    color: 0x261a10,
    roughness: 0.85
  });
  const ringMat = new THREE.MeshBasicMaterial({
    color: isOutput ? 0xffe066 : 0x74c0fc,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide
  });
  ownedMaterials.push(collarMat, holeMat, ringMat);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145, 0.16, 0.08, 16),
    collarMat
  );
  collar.rotation.x = Math.PI / 2;
  collar.userData.socketId = socket.id;
  portGroup.add(collar);

  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.09, 14),
    holeMat
  );
  hole.rotation.x = Math.PI / 2;
  hole.position.z = 0.008;
  hole.userData.socketId = socket.id;
  portGroup.add(hole);

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.145, 0.215, 22), ringMat);
  ring.position.z = 0.055;
  ring.userData.socketId = socket.id;
  ring.userData.ringMat = ringMat;
  ring.userData.isOutput = isOutput;
  portGroup.add(ring);
  socketRings.set(socket.id, ring);

  parent.add(portGroup);
}

export function createWorkbenchFloor(width: number, height: number): AlbertaModelBundle {
  const root = new THREE.Group();
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];

  const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x704523, roughness: 0.78 });
  const woodMidMat = new THREE.MeshStandardMaterial({ color: 0x9b6538, roughness: 0.72 });
  const deskMat = new THREE.MeshStandardMaterial({ color: 0xdfb784, roughness: 0.74 });
  const tilePadEven = new THREE.MeshStandardMaterial({ color: 0xf4dfb8, roughness: 0.72 });
  const tilePadOdd = new THREE.MeshStandardMaterial({ color: 0xedd3a3, roughness: 0.72 });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xe6b52e,
    metalness: 0.5,
    roughness: 0.35
  });
  ownedMaterials.push(woodDarkMat, woodMidMat, deskMat, tilePadEven, tilePadOdd, brassMat);

  const cx = (width - 1) / 2;
  const cz = (height - 1) / 2;

  const baseSlab = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.55, 0.4, height + 0.55),
    deskMat
  );
  baseSlab.position.set(cx, -0.22, cz);
  baseSlab.receiveShadow = true;
  root.add(baseSlab);

  // Subtle checkerboard wooden inlay tiles on inner walkable workbench area
  const padGeo = new THREE.BoxGeometry(0.92, 0.03, 0.92);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pad = new THREE.Mesh(padGeo, (x + y) % 2 === 0 ? tilePadEven : tilePadOdd);
      pad.position.set(x, -0.005, y);
      pad.receiveShadow = true;
      pad.userData.floorX = x;
      pad.userData.floorY = y;
      root.add(pad);
    }
  }

  // Raised wooden border rim around perimeter
  const rimH = 0.32;
  const rimTopBottomGeo = new THREE.BoxGeometry(width + 0.45, rimH, 0.76);
  for (const rz of [0, height - 1]) {
    const rim = new THREE.Mesh(rimTopBottomGeo, woodMidMat);
    rim.position.set(cx, rimH / 2 - 0.02, rz);
    rim.castShadow = true;
    rim.receiveShadow = true;
    root.add(rim);
  }
  const rimLeftRightGeo = new THREE.BoxGeometry(0.76, rimH, height + 0.45);
  for (const rx of [0, width - 1]) {
    const rim = new THREE.Mesh(rimLeftRightGeo, woodMidMat);
    rim.position.set(rx, rimH / 2 - 0.02, cz);
    rim.castShadow = true;
    rim.receiveShadow = true;
    root.add(rim);
  }

  // Brass rivets on the 4 corners
  const cornerCoords: Array<[number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ];
  for (const [rx, rz] of cornerCoords) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.38, 0.84), woodDarkMat);
    post.position.set(rx, 0.17, rz);
    post.castShadow = true;
    root.add(post);

    const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), brassMat);
    rivet.position.set(rx, 0.38, rz);
    root.add(rivet);
  }

  return { root, ownedMaterials, ownedTextures };
}

export function createSourceCubeMesh(
  block: SourceBlockDef,
  sockets: SocketDef[]
): SourceCubeVisual {
  const root = new THREE.Group();
  root.position.set(block.x, 0, block.y);
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];
  const socketRings = new Map<string, THREE.Mesh>();

  const colorMeta = CLOCK_COLORS[block.period];
  const colorObj = new THREE.Color(colorMeta.hex);

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x7c502b,
    roughness: 0.65
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: colorMeta.hex,
    roughness: 0.42
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: colorMeta.hex,
    emissive: colorMeta.hex,
    emissiveIntensity: 0.08,
    roughness: 0.18,
    metalness: 0.05
  });
  const baseRingMat = new THREE.MeshStandardMaterial({
    color: 0xd9a738,
    metalness: 0.45,
    roughness: 0.34
  });
  ownedMaterials.push(housingMat, capMat, bulbMat, baseRingMat);

  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.48, 0.84), housingMat);
  cube.position.y = 0.24;
  cube.castShadow = true;
  cube.receiveShadow = true;
  root.add(cube);

  const coloredRim = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.1, 0.87), capMat);
  coloredRim.position.y = 0.45;
  root.add(coloredRim);

  const tex = createBadgeTexture((ctx, w, h) => {
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = colorMeta.css;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);
    ctx.fillStyle = '#3b2616';
    ctx.font = 'bold 58px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${block.period}s`, w / 2, h - 38);
  }, ownedTextures);

  const labelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    ...(tex ? { map: tex } : {}),
    roughness: 0.5
  });
  ownedMaterials.push(labelMat);
  const topLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), labelMat);
  topLabel.rotation.x = -Math.PI / 2;
  topLabel.position.y = 0.505;
  root.add(topLabel);

  // Bulb collar + bright glass bulb shifted slightly toward back-top so label stays super readable
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.21, 0.1, 18),
    baseRingMat
  );
  collar.position.set(0, 0.54, -0.09);
  root.add(collar);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), bulbMat);
  bulb.position.set(0, 0.78, -0.09);
  bulb.scale.set(1, 1.15, 1);
  bulb.castShadow = true;
  root.add(bulb);

  for (const sock of sockets) {
    const off = SIDE_OFFSET[sock.side];
    addSocketPlugPort(
      root,
      ownedMaterials,
      sock,
      new THREE.Vector3(off.dx, 0.24, off.dz),
      true,
      socketRings
    );
  }

  return {
    root,
    ownedMaterials,
    ownedTextures,
    socketRings,
    setLit: (lit: boolean) => {
      if (lit) {
        bulbMat.color.copy(colorObj).lerp(new THREE.Color(0xffffff), 0.35);
        bulbMat.emissiveIntensity = 1.65;
        bulb.scale.setScalar(1.06);
      } else {
        bulbMat.color.copy(colorObj).multiplyScalar(0.32);
        bulbMat.emissiveIntensity = 0.05;
        bulb.scale.setScalar(0.97);
      }
    }
  };
}

export function createLogicBlockMesh(
  block: LogicBlockDef,
  sockets: SocketDef[]
): LogicBlockVisual {
  const root = new THREE.Group();
  const isTall = block.gate === 'AND' || block.gate === 'OR';
  const spanZ = isTall ? 1 : 0;
  root.position.set(block.x, 0, block.y + spanZ * 0.5);

  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];
  const socketRings = new Map<string, THREE.Mesh>();

  const gateHex = GATE_COLORS[block.gate];
  const gateCss = `#${gateHex.toString(16).padStart(6, '0')}`;

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.66 });
  const trimMat = new THREE.MeshStandardMaterial({ color: gateHex, roughness: 0.4 });
  const ledMat = new THREE.MeshStandardMaterial({
    color: gateHex,
    emissive: gateHex,
    emissiveIntensity: 0.08,
    roughness: 0.2
  });
  ownedMaterials.push(bodyMat, trimMat, ledMat);

  const heightZ = isTall ? 1.84 : 0.84;
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.5, heightZ),
    bodyMat
  );
  housing.position.y = 0.25;
  housing.castShadow = true;
  housing.receiveShadow = true;
  root.add(housing);

  const trimBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.89, 0.1, heightZ + 0.03),
    trimMat
  );
  trimBand.position.y = 0.47;
  root.add(trimBand);

  const tex = createBadgeTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#fff9ed';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = gateCss;
      ctx.lineWidth = 14;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      // Draw crisp classic IEC/DIN logic box & bold German label
      ctx.fillStyle = '#3b2616';
      ctx.strokeStyle = '#3b2616';
      ctx.lineWidth = 8;
      const symbol = block.gate === 'AND' ? '&' : block.gate === 'OR' ? '>=1' : '1';
      const label = block.gate === 'AND' ? 'UND' : block.gate === 'OR' ? 'ODER' : 'NICHT';

      ctx.font = 'bold 74px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, w / 2, h * 0.44);

      if (block.gate === 'NOT') {
        ctx.beginPath();
        ctx.arc(w * 0.8, h * 0.44, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = gateCss;
      ctx.font = 'bold 42px Nunito, sans-serif';
      ctx.fillText(label, w / 2, h * 0.78);
    },
    ownedTextures,
    192,
    isTall ? 320 : 192
  );

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    ...(tex ? { map: tex } : {}),
    roughness: 0.45
  });
  ownedMaterials.push(plateMat);

  const facePlate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, isTall ? 1.68 : 0.72),
    plateMat
  );
  facePlate.rotation.x = -Math.PI / 2;
  facePlate.position.y = 0.525;
  root.add(facePlate);

  // Live output status dome near the top-right output corner
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), ledMat);
  led.position.set(0.22, 0.58, isTall ? -0.52 : -0.18);
  root.add(led);

  for (const sock of sockets) {
    const off = SIDE_OFFSET[sock.side];
    const localX = sock.tileX - block.x + off.dx;
    const localZ = sock.tileY - (block.y + spanZ * 0.5) + off.dz;
    addSocketPlugPort(
      root,
      ownedMaterials,
      sock,
      new THREE.Vector3(localX, 0.24, localZ),
      sock.role === 'output',
      socketRings
    );
  }

  const baseColor = new THREE.Color(gateHex);
  return {
    root,
    ownedMaterials,
    ownedTextures,
    socketRings,
    setOutputLit: (lit: boolean) => {
      if (lit) {
        ledMat.color.copy(baseColor).lerp(new THREE.Color(0xffffff), 0.35);
        ledMat.emissiveIntensity = 1.65;
        led.scale.setScalar(1.12);
      } else {
        ledMat.color.copy(baseColor).multiplyScalar(0.32);
        ledMat.emissiveIntensity = 0.06;
        led.scale.setScalar(0.95);
      }
    }
  };
}

export function createTargetBlockMesh(
  block: TargetBlockDef,
  sockets: SocketDef[]
): TargetBlockVisual {
  const root = new THREE.Group();
  root.position.set(block.x + 0.5, 0, block.y);

  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];
  const socketRings = new Map<string, THREE.Mesh>();

  const housingMat = new THREE.MeshStandardMaterial({ color: 0x4f351f, roughness: 0.64 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.42 });
  const inputBulbMat = new THREE.MeshStandardMaterial({
    color: 0x6b6052,
    emissive: 0xffe066,
    emissiveIntensity: 0,
    roughness: 0.22
  });
  const targetBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffd43b,
    emissive: 0xffc107,
    emissiveIntensity: 0.1,
    roughness: 0.2
  });
  const matchBadgeMat = new THREE.MeshStandardMaterial({
    color: 0x6b6052,
    emissive: 0x40c057,
    emissiveIntensity: 0,
    roughness: 0.25
  });
  ownedMaterials.push(housingMat, rimMat, inputBulbMat, targetBulbMat, matchBadgeMat);

  // Two side-by-side cubes (2x1): left bulb controlled by input, right bulb displays target pulse
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.5, 0.86), housingMat);
  frame.position.y = 0.25;
  frame.castShadow = true;
  frame.receiveShadow = true;
  root.add(frame);

  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(1.89, 0.09, 0.89), rimMat);
  topTrim.position.y = 0.465;
  root.add(topTrim);

  const tex = createBadgeTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#fff8e7';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#6ac266';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = '#4a321f';
      ctx.font = 'bold 34px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EINGANG', w * 0.26, h * 0.84);
      ctx.fillStyle = '#2b7a2a';
      ctx.fillText(`ZIEL: ${block.targetLabel}`, w * 0.74, h * 0.84);
    },
    ownedTextures,
    384,
    192
  );
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    ...(tex ? { map: tex } : {}),
    roughness: 0.5
  });
  ownedMaterials.push(labelMat);

  const topPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.74, 0.74), labelMat);
  topPlate.rotation.x = -Math.PI / 2;
  topPlate.position.y = 0.515;
  root.add(topPlate);

  // Left (input-driven) & Right (target reference) light bulbs
  const collarGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.09, 18);
  const bulbGeo = new THREE.SphereGeometry(0.23, 20, 16);

  const leftCollar = new THREE.Mesh(collarGeo, rimMat);
  leftCollar.position.set(-0.48, 0.55, -0.06);
  const leftBulb = new THREE.Mesh(bulbGeo, inputBulbMat);
  leftBulb.position.set(-0.48, 0.79, -0.06);
  leftBulb.scale.set(1, 1.15, 1);
  leftBulb.castShadow = true;

  const rightCollar = new THREE.Mesh(collarGeo, rimMat);
  rightCollar.position.set(0.48, 0.55, -0.06);
  const rightBulb = new THREE.Mesh(bulbGeo, targetBulbMat);
  rightBulb.position.set(0.48, 0.79, -0.06);
  rightBulb.scale.set(1, 1.15, 1);
  rightBulb.castShadow = true;

  const matchGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    matchBadgeMat
  );
  matchGem.position.set(0, 0.66, -0.05);

  root.add(leftCollar, leftBulb, rightCollar, rightBulb, matchGem);

  for (const sock of sockets) {
    const off = SIDE_OFFSET[sock.side];
    const localX = sock.tileX - (block.x + 0.5) + off.dx;
    const localZ = sock.tileY - block.y + off.dz;
    addSocketPlugPort(
      root,
      ownedMaterials,
      sock,
      new THREE.Vector3(localX, 0.24, localZ),
      false,
      socketRings
    );
  }

  const litYellow = new THREE.Color(0xfff08a);
  const dimInput = new THREE.Color(0x554c42);
  const litGreen = new THREE.Color(0x74f288);
  const dimTarget = new THREE.Color(0x6e5418);
  const offGem = new THREE.Color(0x786c5f);

  return {
    root,
    ownedMaterials,
    ownedTextures,
    socketRings,
    setStates: (inputLit: boolean, targetLit: boolean, matched: boolean) => {
      if (inputLit) {
        inputBulbMat.color.copy(matched ? litGreen : litYellow);
        inputBulbMat.emissive.setHex(matched ? 0x40c057 : 0xffd43b);
        inputBulbMat.emissiveIntensity = 1.6;
        leftBulb.scale.setScalar(1.06);
      } else {
        inputBulbMat.color.copy(dimInput);
        inputBulbMat.emissiveIntensity = 0;
        leftBulb.scale.setScalar(0.96);
      }

      if (targetLit) {
        targetBulbMat.color.copy(matched ? litGreen : litYellow);
        targetBulbMat.emissive.setHex(matched ? 0x40c057 : 0xffc107);
        targetBulbMat.emissiveIntensity = 1.6;
        rightBulb.scale.setScalar(1.06);
      } else {
        targetBulbMat.color.copy(dimTarget);
        targetBulbMat.emissiveIntensity = 0.04;
        rightBulb.scale.setScalar(0.96);
      }

      if (matched) {
        matchBadgeMat.color.setHex(0x8ce99a);
        matchBadgeMat.emissiveIntensity = 1.5;
        matchGem.rotation.y += 0.03;
      } else {
        matchBadgeMat.color.copy(offGem);
        matchBadgeMat.emissiveIntensity = 0.05;
      }
    }
  };
}

export function createWireMesh(
  path: GridPos[],
  startSocket: SocketDef,
  endSocket: SocketDef | null,
  albertaHandWorldPos: THREE.Vector3 | null,
  crossingKeys: Set<string>,
  colorHex: number
): WireVisual {
  const root = new THREE.Group();
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];

  const points: THREE.Vector3[] = [];
  const startPlug = getSocketPlugWorldPos(startSocket);
  points.push(startPlug);

  const floorY = 0.08;
  const archPeakY = 0.36;

  if (path.length > 0) {
    points.push(new THREE.Vector3(path[0].x, floorY, path[0].y));
    for (let i = 1; i < path.length; i++) {
      const p = path[i];
      const key = `${p.x},${p.y}`;
      if (crossingKeys.has(key) && i < path.length - 1) {
        const prev = path[i - 1];
        const next = path[i + 1];
        const dxIn = p.x - prev.x;
        const dzIn = p.y - prev.y;
        const dxOut = next.x - p.x;
        const dzOut = next.y - p.y;
        points.push(new THREE.Vector3(p.x - dxIn * 0.36, floorY, p.y - dzIn * 0.36));
        points.push(new THREE.Vector3(p.x - dxIn * 0.18, 0.28, p.y - dzIn * 0.18));
        points.push(new THREE.Vector3(p.x, archPeakY, p.y));
        points.push(new THREE.Vector3(p.x + dxOut * 0.18, 0.28, p.y + dzOut * 0.18));
        points.push(new THREE.Vector3(p.x + dxOut * 0.36, floorY, p.y + dzOut * 0.36));
      } else {
        points.push(new THREE.Vector3(p.x, floorY, p.y));
      }
    }
  }

  let endPos: THREE.Vector3 | null = null;
  if (endSocket) {
    endPos = getSocketPlugWorldPos(endSocket);
    points.push(endPos);
  } else if (albertaHandWorldPos) {
    endPos = albertaHandWorldPos.clone();
    points.push(endPos);
  }

  // Deduplicate virtually identical consecutive points so CatmullRomCurve3 stays smooth
  const cleanPoints: THREE.Vector3[] = [];
  for (const pt of points) {
    if (
      cleanPoints.length === 0 ||
      cleanPoints[cleanPoints.length - 1].distanceToSquared(pt) > 0.0004
    ) {
      cleanPoints.push(pt);
    }
  }
  if (cleanPoints.length < 2) {
    cleanPoints.push(startPlug.clone().add(new THREE.Vector3(0.05, 0.02, 0.05)));
  }

  const curve = new THREE.CatmullRomCurve3(cleanPoints, false, 'centripetal', 0.35);
  const segCount = Math.max(20, cleanPoints.length * 8);
  const tubeGeo = new THREE.TubeGeometry(curve, segCount, 0.068, 10, false);

  const baseColor = new THREE.Color(colorHex);
  const cableMat = new THREE.MeshStandardMaterial({
    color: baseColor.clone().multiplyScalar(0.55),
    emissive: baseColor,
    emissiveIntensity: 0.12,
    roughness: 0.32,
    metalness: 0.08
  });
  const plugMat = new THREE.MeshStandardMaterial({
    color: 0xe6b52e,
    metalness: 0.55,
    roughness: 0.3
  });
  const pulseBeadMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
  });
  ownedMaterials.push(cableMat, plugMat, pulseBeadMat);

  const cableMesh = new THREE.Mesh(tubeGeo, cableMat);
  cableMesh.castShadow = true;
  root.add(cableMesh);

  // Brass connectors at start & end
  const plugGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.14, 12);
  const startCap = new THREE.Mesh(plugGeo, plugMat);
  startCap.position.copy(startPlug);
  startCap.rotation.z =
    startSocket.side === 'left' || startSocket.side === 'right' ? Math.PI / 2 : 0;
  startCap.rotation.x =
    startSocket.side === 'up' || startSocket.side === 'down' ? Math.PI / 2 : 0;
  root.add(startCap);

  if (endPos) {
    const endCap = new THREE.Mesh(plugGeo, plugMat);
    endCap.position.copy(endPos);
    if (endSocket) {
      endCap.rotation.z =
        endSocket.side === 'left' || endSocket.side === 'right' ? Math.PI / 2 : 0;
      endCap.rotation.x =
        endSocket.side === 'up' || endSocket.side === 'down' ? Math.PI / 2 : 0;
    }
    root.add(endCap);
  }

  // Animated traveling energy beads along the cable when signal is ON
  const beads: THREE.Mesh[] = [];
  const beadGeo = new THREE.SphereGeometry(0.085, 8, 8);
  const beadCount = Math.min(5, Math.max(2, Math.floor(path.length / 2)));
  for (let i = 0; i < beadCount; i++) {
    const bead = new THREE.Mesh(beadGeo, pulseBeadMat);
    bead.visible = false;
    root.add(bead);
    beads.push(bead);
  }

  return {
    root,
    ownedMaterials,
    ownedTextures,
    updateSignal: (isOn: boolean, elapsed: number) => {
      if (isOn) {
        cableMat.color.copy(baseColor).lerp(new THREE.Color(0xffffff), 0.28);
        cableMat.emissiveIntensity = 1.25;
        beads.forEach((b, idx) => {
          b.visible = true;
          const u = (elapsed * 0.55 + idx / beads.length) % 1;
          curve.getPointAt(u, b.position);
        });
      } else {
        cableMat.color.copy(baseColor).multiplyScalar(0.45);
        cableMat.emissiveIntensity = 0.08;
        for (const b of beads) b.visible = false;
      }
    }
  };
}
