import * as THREE from 'three';

const SHARED_MATERIALS = {
  beeYellow: new THREE.MeshStandardMaterial({
    color: 0xf7c22c,
    roughness: 0.42,
    metalness: 0.05
  }),
  beeStripe: new THREE.MeshStandardMaterial({
    color: 0x3b2616,
    roughness: 0.55,
    metalness: 0.05
  }),
  beeCheek: new THREE.MeshStandardMaterial({
    color: 0xf58fa3,
    roughness: 0.6
  }),
  eyeDark: new THREE.MeshStandardMaterial({
    color: 0x1e130c,
    roughness: 0.25
  }),
  eyeShine: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.35
  }),
  wing: new THREE.MeshStandardMaterial({
    color: 0xf2fbff,
    transparent: true,
    opacity: 0.72,
    roughness: 0.15,
    side: THREE.DoubleSide
  }),
  potCeramic: new THREE.MeshStandardMaterial({
    color: 0xe38b29,
    roughness: 0.36,
    metalness: 0.08
  }),
  potRim: new THREE.MeshStandardMaterial({
    color: 0xc26516,
    roughness: 0.4
  }),
  potCloth: new THREE.MeshStandardMaterial({
    color: 0xf46d7a,
    roughness: 0.75
  }),
  potRibbon: new THREE.MeshStandardMaterial({
    color: 0xffe485,
    roughness: 0.45
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x8e572b,
    roughness: 0.72
  }),
  waxVariants: [
    new THREE.MeshStandardMaterial({ color: 0xf6c344, roughness: 0.62 }),
    new THREE.MeshStandardMaterial({ color: 0xefba38, roughness: 0.64 }),
    new THREE.MeshStandardMaterial({ color: 0xf9cd58, roughness: 0.6 })
  ],
  waxRidge: new THREE.MeshStandardMaterial({
    color: 0xdd9b1e,
    roughness: 0.58
  }),
  wallWood: new THREE.MeshStandardMaterial({
    color: 0x6f4324,
    roughness: 0.78
  }),
  wallTrim: new THREE.MeshStandardMaterial({
    color: 0x8d5832,
    roughness: 0.7
  }),
  roundedWall: new THREE.MeshStandardMaterial({
    color: 0xa5622a,
    roughness: 0.48,
    metalness: 0.06
  }),
  honeyLiquid: new THREE.MeshPhysicalMaterial({
    color: 0xffae08,
    emissive: 0xd96b00,
    emissiveIntensity: 0.2,
    roughness: 0.12,
    metalness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.07
  }),
  honeySource: new THREE.MeshStandardMaterial({
    color: 0xc97614,
    roughness: 0.45
  }),
  bubble: new THREE.MeshStandardMaterial({
    color: 0xfff3b8,
    emissive: 0xf5b731,
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.36,
    roughness: 0.12
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xf2c94c,
    roughness: 0.32,
    metalness: 0.55
  }),
  suitcaseGlow: new THREE.MeshStandardMaterial({
    color: 0xffe875,
    emissive: 0xffc107,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0
  }),
  stemGreen: new THREE.MeshStandardMaterial({
    color: 0x56a84a,
    roughness: 0.6
  }),
  flowerCenter: new THREE.MeshStandardMaterial({
    color: 0xffb703,
    roughness: 0.45
  }),
  petalVariants: [
    new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.5 }), // Sonnenblume
    new THREE.MeshStandardMaterial({ color: 0xf89cb0, roughness: 0.5 }), // Kirschblüte
    new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.5 }) // Gänseblümchen
  ],
  petalGatePink: new THREE.MeshStandardMaterial({
    color: 0xf46d91,
    roughness: 0.42
  }),
  petalBarCream: new THREE.MeshStandardMaterial({
    color: 0xfff3db,
    roughness: 0.5
  }),
  grubBody: new THREE.MeshStandardMaterial({
    color: 0xf6f0c2,
    roughness: 0.52
  }),
  grubStripe: new THREE.MeshStandardMaterial({
    color: 0x9cd66d,
    roughness: 0.55
  }),
  grubHead: new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    roughness: 0.45
  }),
  miteBody: new THREE.MeshStandardMaterial({
    color: 0xd94854,
    roughness: 0.36,
    metalness: 0.05
  }),
  miteSpot: new THREE.MeshStandardMaterial({
    color: 0xffb74d,
    roughness: 0.4
  }),
  miteLeg: new THREE.MeshStandardMaterial({
    color: 0x6e272e,
    roughness: 0.5
  }),
  budCalyx: new THREE.MeshStandardMaterial({
    color: 0x6ac266,
    roughness: 0.52
  }),
  sleepZ: new THREE.MeshStandardMaterial({
    color: 0xa5d8ff,
    emissive: 0x639cd9,
    emissiveIntensity: 0.45,
    roughness: 0.3
  })
};

const HONEY_SHARED_GEOS = {
  blobSphere: new THREE.SphereGeometry(1, 20, 16),
  bridgePill: new THREE.SphereGeometry(1, 14, 12),
  dripThread: new THREE.CylinderGeometry(0.055, 0.032, 1, 10),
  dripBulb: new THREE.SphereGeometry(1, 16, 12)
};

function enableShadows(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

export function createBeeModel(scale = 1): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Main chubby oval abdomen + thorax built from alternating colored spheres/bands
  const abdomen = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 14),
    SHARED_MATERIALS.beeYellow
  );
  abdomen.scale.set(1.0, 0.92, 1.25);
  abdomen.position.set(0, -0.02, -0.06);
  body.add(abdomen);

  // Two dark brown stripes wrapping the abdomen
  for (const zOff of [-0.14, 0.02]) {
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.225, 0.052, 10, 22),
      SHARED_MATERIALS.beeStripe
    );
    stripe.position.set(0, -0.02, zOff);
    stripe.scale.set(1.02, 0.95, 1.0);
    body.add(stripe);
  }

  // Cute round head facing +Z
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 14),
    SHARED_MATERIALS.beeStripe
  );
  head.position.set(0, 0.05, 0.25);
  body.add(head);

  // Eyes & rosy cheeks
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 10),
      SHARED_MATERIALS.eyeDark
    );
    eye.position.set(side * 0.085, 0.09, 0.43);
    body.add(eye);

    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      SHARED_MATERIALS.eyeShine
    );
    shine.position.set(side * 0.095, 0.11, 0.468);
    body.add(shine);

    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      SHARED_MATERIALS.beeCheek
    );
    cheek.scale.set(1.1, 0.75, 0.5);
    cheek.position.set(side * 0.13, 0.01, 0.39);
    body.add(cheek);

    // Antennae
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.016, 0.17, 8),
      SHARED_MATERIALS.beeStripe
    );
    stem.position.set(side * 0.075, 0.26, 0.28);
    stem.rotation.z = -side * 0.35;
    stem.rotation.x = 0.25;
    body.add(stem);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 10, 8),
      SHARED_MATERIALS.beeYellow
    );
    tip.position.set(side * 0.11, 0.34, 0.31);
    body.add(tip);
  }

  // Wings (pivoted on back for rapid fluttering)
  const wingGeo = new THREE.SphereGeometry(0.18, 12, 10);
  const leftWingGroup = new THREE.Group();
  leftWingGroup.position.set(-0.1, 0.17, 0.02);
  const leftWing = new THREE.Mesh(wingGeo, SHARED_MATERIALS.wing);
  leftWing.scale.set(1.15, 0.18, 0.75);
  leftWing.position.set(-0.16, 0.04, -0.02);
  leftWingGroup.add(leftWing);
  body.add(leftWingGroup);

  const rightWingGroup = new THREE.Group();
  rightWingGroup.position.set(0.1, 0.17, 0.02);
  const rightWing = new THREE.Mesh(wingGeo, SHARED_MATERIALS.wing);
  rightWing.scale.set(1.15, 0.18, 0.75);
  rightWing.position.set(0.16, 0.04, -0.02);
  rightWingGroup.add(rightWing);
  body.add(rightWingGroup);

  // Sticky honey globs (hidden unless wings got sticky from liquid honey)
  const stickyGroup = new THREE.Group();
  stickyGroup.visible = false;
  const stickySpecs: Array<{
    pos: [number, number, number];
    scale: [number, number, number];
    phase: number;
  }> = [
    { pos: [0, 0.22, 0.22], scale: [0.13, 0.08, 0.13], phase: 0.2 },
    { pos: [0, 0.23, -0.04], scale: [0.15, 0.08, 0.16], phase: 1.4 },
    { pos: [-0.18, 0.18, 0.01], scale: [0.13, 0.06, 0.11], phase: 2.5 },
    { pos: [0.18, 0.18, 0.01], scale: [0.13, 0.06, 0.11], phase: 3.7 },
    { pos: [-0.14, 0.02, -0.14], scale: [0.12, 0.1, 0.11], phase: 4.8 },
    { pos: [0.05, -0.26, -0.02], scale: [0.075, 0.12, 0.075], phase: 5.5 }
  ];
  for (const spec of stickySpecs) {
    const splat = new THREE.Mesh(
      HONEY_SHARED_GEOS.blobSphere,
      SHARED_MATERIALS.honeyLiquid
    );
    splat.position.set(...spec.pos);
    splat.scale.set(...spec.scale);
    splat.userData = {
      sharedGeo: true,
      baseY: spec.pos[1],
      baseScale: spec.scale,
      phase: spec.phase
    };
    stickyGroup.add(splat);
  }
  body.add(stickyGroup);

  root.scale.setScalar(scale);
  root.userData = {
    bodyGroup: body,
    leftWing: leftWingGroup,
    rightWing: rightWingGroup,
    stickyGroup
  };
  enableShadows(root, true, true);
  leftWing.castShadow = false;
  rightWing.castShadow = false;
  stickyGroup.traverse((c) => {
    c.castShadow = false;
  });
  return root;
}

export function createHoneyPotModel(): THREE.Group {
  const root = new THREE.Group();

  // Lathe pot profile
  const pts = [
    new THREE.Vector2(0.0, -0.38),
    new THREE.Vector2(0.22, -0.38),
    new THREE.Vector2(0.35, -0.2),
    new THREE.Vector2(0.37, 0.02),
    new THREE.Vector2(0.26, 0.2),
    new THREE.Vector2(0.3, 0.27),
    new THREE.Vector2(0.24, 0.28),
    new THREE.Vector2(0.0, 0.28)
  ];
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), SHARED_MATERIALS.potCeramic);
  root.add(pot);

  // Cloth topper
  const cloth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.31, 0.12, 16),
    SHARED_MATERIALS.potCloth
  );
  cloth.position.y = 0.28;
  root.add(cloth);

  const clothTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    SHARED_MATERIALS.potCloth
  );
  clothTop.position.y = 0.33;
  clothTop.scale.y = 0.45;
  root.add(clothTop);

  // Golden ribbon band
  const ribbon = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.032, 8, 20),
    SHARED_MATERIALS.potRibbon
  );
  ribbon.rotation.x = Math.PI / 2;
  ribbon.position.y = 0.22;
  root.add(ribbon);

  // Tiny honey dipper handle sticking out at angle
  const dipperStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.25, 8),
    SHARED_MATERIALS.wood
  );
  dipperStick.position.set(0.14, 0.37, 0.08);
  dipperStick.rotation.z = -0.45;
  root.add(dipperStick);

  // Cute honey label emblem on front
  const emblem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.03, 6),
    SHARED_MATERIALS.potRibbon
  );
  emblem.rotation.x = Math.PI / 2;
  emblem.position.set(0, -0.02, 0.36);
  root.add(emblem);

  enableShadows(root, true, true);
  return root;
}

export function createFlowerModel(variant = 0): THREE.Group {
  const root = new THREE.Group();
  const blossom = new THREE.Group();
  blossom.rotation.x = 0.38; // Tilt flower slightly toward camera
  root.add(blossom);

  const petalMat =
    SHARED_MATERIALS.petalVariants[Math.abs(variant) % SHARED_MATERIALS.petalVariants.length];

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 12),
    SHARED_MATERIALS.flowerCenter
  );
  center.scale.z = 0.65;
  blossom.add(center);

  const petalGeo = new THREE.SphereGeometry(0.125, 10, 10);
  const petalCount = 6;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.scale.set(0.85, 1.3, 0.42);
    petal.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, -0.02);
    petal.rotation.z = angle - Math.PI / 2;
    blossom.add(petal);
  }

  // Short green stem & leaf
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.28, 8),
    SHARED_MATERIALS.stemGreen
  );
  stem.position.set(0, -0.27, -0.05);
  root.add(stem);

  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    SHARED_MATERIALS.stemGreen
  );
  leaf.scale.set(1.2, 0.45, 0.35);
  leaf.position.set(0.12, -0.29, -0.02);
  leaf.rotation.z = 0.35;
  root.add(leaf);

  root.userData = { blossomGroup: blossom };
  enableShadows(root, true, true);
  return root;
}

export function createTrappedBeeModel(): THREE.Group {
  const root = new THREE.Group();
  const miniBee = createBeeModel(0.72);
  root.add(miniBee);

  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 22, 18),
    SHARED_MATERIALS.bubble
  );
  bubble.castShadow = false;
  bubble.receiveShadow = false;
  root.add(bubble);

  // Thin glowing wax ring highlight
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.41, 0.02, 8, 28),
    SHARED_MATERIALS.potRibbon
  );
  ring.rotation.x = 0.45;
  ring.rotation.y = -0.3;
  root.add(ring);

  root.userData = {
    miniBee,
    bubble
  };
  return root;
}

export function createSuitcaseModel(): THREE.Group {
  const root = new THREE.Group();
  const bodyTilt = new THREE.Group();
  bodyTilt.rotation.x = 0.62;
  bodyTilt.position.y = -0.04;
  root.add(bodyTilt);

  const disposableMaterials: THREE.Material[] = [];

  // Slim hollow lower tray (flat lying suitcase)
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.03, 0.54),
    SHARED_MATERIALS.beeYellow
  );
  floor.position.y = -0.11;
  bodyTilt.add(floor);

  const wallSpecs: Array<[number, number, number, number, number, number]> = [
    [0.86, 0.14, 0.04, 0, -0.055, 0.26],   // front
    [0.86, 0.14, 0.04, 0, -0.055, -0.26],  // back
    [0.04, 0.14, 0.48, -0.41, -0.055, 0],  // left
    [0.04, 0.14, 0.48, 0.41, -0.055, 0]    // right
  ];
  for (const [w, h, d, x, y, z] of wallSpecs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), SHARED_MATERIALS.beeYellow);
    wall.position.set(x, y, z);
    bodyTilt.add(wall);
  }

  // Dark-brown luggage straps & bottom corner protectors
  for (const xPos of [-0.23, 0.23]) {
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.145, 0.57),
      SHARED_MATERIALS.beeStripe
    );
    strap.position.set(xPos, -0.055, 0);
    bodyTilt.add(strap);

    const clasp = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.06, 0.04),
      SHARED_MATERIALS.brass
    );
    clasp.position.set(xPos, 0.01, 0.285);
    bodyTilt.add(clasp);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.08, 0.1),
        SHARED_MATERIALS.beeStripe
      );
      cap.position.set(sx * 0.4, -0.08, sz * 0.25);
      bodyTilt.add(cap);
    }
  }

  // Front leather carry handle along +Z edge
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.024, 8, 16, Math.PI),
    SHARED_MATERIALS.beeStripe
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, -0.05, 0.29);
  bodyTilt.add(handle);

  // Hinged flat matching top lid along back edge
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.015, -0.28);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.09, 0.56),
    SHARED_MATERIALS.beeYellow
  );
  lid.position.set(0, 0.045, 0.28);
  lidGroup.add(lid);

  for (const xPos of [-0.23, 0.23]) {
    const lidStrap = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.095, 0.57),
      SHARED_MATERIALS.beeStripe
    );
    lidStrap.position.set(xPos, 0.045, 0.28);
    lidGroup.add(lidStrap);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [0.03, 0.53]) {
      const lidCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.06, 0.1),
        SHARED_MATERIALS.beeStripe
      );
      lidCap.position.set(sx * 0.4, 0.065, sz);
      lidGroup.add(lidCap);
    }
  }

  const tagMat = new THREE.MeshStandardMaterial({ color: 0xfff3d1, roughness: 0.65 });
  disposableMaterials.push(tagMat);
  const travelTag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.14), tagMat);
  travelTag.position.set(0, 0.095, 0.28);
  lidGroup.add(travelTag);

  bodyTilt.add(lidGroup);

  // Mysterious warm amber interior glow & glitter motes
  const amberBedMat = new THREE.MeshStandardMaterial({
    color: 0xffa000,
    emissive: 0xff7700,
    emissiveIntensity: 0,
    roughness: 0.25
  });
  disposableMaterials.push(amberBedMat);
  const amberBed = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.04, 0.44),
    amberBedMat
  );
  amberBed.position.set(0, -0.07, 0);
  bodyTilt.add(amberBed);

  const amberHazeMat = new THREE.MeshBasicMaterial({
    color: 0xffae24,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  disposableMaterials.push(amberHazeMat);
  const amberHaze = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.24, 0.42),
    amberHazeMat
  );
  amberHaze.position.set(0, 0.06, 0);
  bodyTilt.add(amberHaze);

  const amberLight = new THREE.PointLight(0xff9e1b, 0, 3.6, 2);
  amberLight.position.set(0, 0.16, 0.04);
  bodyTilt.add(amberLight);

  const sparkleGroup = new THREE.Group();
  sparkleGroup.visible = false;
  const moteColors = [0xffe066, 0xffae24, 0xffd166];
  const moteGeo = new THREE.OctahedronGeometry(0.032, 0);
  for (let i = 0; i < 7; i++) {
    const moteMat = new THREE.MeshBasicMaterial({
      color: moteColors[i % moteColors.length],
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    disposableMaterials.push(moteMat);
    const mote = new THREE.Mesh(moteGeo, moteMat);
    const baseX = -0.26 + (i / 6) * 0.52;
    const baseZ = ((i * 37) % 100) / 100 * 0.28 - 0.14;
    mote.userData = {
      baseX,
      baseZ,
      phase: i * 0.9,
      speed: 0.75 + (i % 3) * 0.25,
      mat: moteMat
    };
    sparkleGroup.add(mote);
  }
  bodyTilt.add(sparkleGroup);

  enableShadows(root, true, true);
  amberBed.castShadow = false;
  amberHaze.castShadow = false;
  amberHaze.receiveShadow = false;
  sparkleGroup.traverse((c) => {
    c.castShadow = false;
    c.receiveShadow = false;
  });

  root.userData = {
    lidGroup,
    amberBedMat,
    amberHazeMat,
    amberLight,
    sparkleGroup,
    disposableMaterials
  };
  return root;
}

export function createWaxModel(variant = 0): THREE.Group {
  const root = new THREE.Group();
  const mat =
    SHARED_MATERIALS.waxVariants[Math.abs(variant) % SHARED_MATERIALS.waxVariants.length];

  const block = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.7), mat);
  root.add(block);

  // Raised hexagonal honeycomb embossing on the front face
  const hex = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.36, 0.1, 6),
    SHARED_MATERIALS.waxRidge
  );
  hex.rotation.x = Math.PI / 2;
  hex.position.z = 0.35;
  root.add(hex);

  const innerHex = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.12, 6),
    mat
  );
  innerHex.rotation.x = Math.PI / 2;
  innerHex.position.z = 0.36;
  root.add(innerHex);

  enableShadows(root, true, true);
  return root;
}

let cachedStrawMaterials: {
  border: THREE.MeshStandardMaterial;
  strawPanel: THREE.MeshStandardMaterial;
  strawRound: THREE.MeshStandardMaterial;
  ring: THREE.MeshStandardMaterial;
} | null = null;

function getStrawMaterials() {
  if (cachedStrawMaterials) return cachedStrawMaterials;

  let colorMap: THREE.Texture | null = null;
  let bumpMap: THREE.Texture | null = null;

  if (typeof document !== 'undefined') {
    const loader = new THREE.TextureLoader();
    colorMap = loader.load('assets/textures/straw_skep.png');
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.wrapS = THREE.ClampToEdgeWrapping;
    colorMap.wrapT = THREE.ClampToEdgeWrapping;

    bumpMap = loader.load('assets/textures/straw_skep_bump.png');
    bumpMap.wrapS = THREE.ClampToEdgeWrapping;
    bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  }

  cachedStrawMaterials = {
    border: new THREE.MeshStandardMaterial({
      color: 0x4e2e16,
      roughness: 0.85
    }),
    strawPanel: new THREE.MeshStandardMaterial({
      color: colorMap ? 0xa47448 : 0x7c4f28,
      map: colorMap,
      bumpMap,
      bumpScale: 0.035,
      roughness: 0.82
    }),
    strawRound: new THREE.MeshStandardMaterial({
      color: colorMap ? 0xb88452 : 0x8d5a2d,
      map: colorMap,
      bumpMap,
      bumpScale: 0.035,
      roughness: 0.72
    }),
    ring: new THREE.MeshStandardMaterial({
      color: 0xd9a13b,
      roughness: 0.45,
      metalness: 0.2
    })
  };
  return cachedStrawMaterials;
}

const WALL_SHARED_GEOS = {
  outerBox: new THREE.BoxGeometry(0.99, 0.99, 0.8),
  innerPanel: new THREE.BoxGeometry(0.85, 0.85, 0.86),
  roundSphere: new THREE.SphereGeometry(0.54, 18, 14),
  roundRing: new THREE.TorusGeometry(0.36, 0.05, 8, 18)
};

export function createWallModel(rounded = false): THREE.Group {
  const root = new THREE.Group();
  const straw = getStrawMaterials();

  if (rounded) {
    // Pillowed rounded wall with woven straw skep texture so rolling pots make visual sense
    const sphere = new THREE.Mesh(WALL_SHARED_GEOS.roundSphere, straw.strawRound);
    sphere.scale.set(0.96, 0.96, 0.78);
    sphere.userData.sharedGeo = true;
    root.add(sphere);

    const ring = new THREE.Mesh(WALL_SHARED_GEOS.roundRing, straw.ring);
    ring.position.z = 0.34;
    ring.userData.sharedGeo = true;
    root.add(ring);
  } else {
    // Crisp dark-brown framed square block with real woven straw skep texture inset
    const outer = new THREE.Mesh(WALL_SHARED_GEOS.outerBox, straw.border);
    outer.userData.sharedGeo = true;
    root.add(outer);

    const inner = new THREE.Mesh(WALL_SHARED_GEOS.innerPanel, straw.strawPanel);
    inner.userData.sharedGeo = true;
    root.add(inner);
  }

  enableShadows(root, true, true);
  return root;
}

export interface HoneyBlobMotion {
  rx: number;
  ry: number;
  rz: number;
  baseZ: number;
  orbitX: number;
  orbitY: number;
  freqX: number;
  freqY: number;
  freqZ: number;
  pulseFreq: number;
  phaseX: number;
  phaseY: number;
  phaseP: number;
  leadBias: number;
}

const HONEY_BLOB_MOTIONS: HoneyBlobMotion[] = [
  {
    rx: 0.3,
    ry: 0.27,
    rz: 0.28,
    baseZ: 0.0,
    orbitX: 0.05,
    orbitY: 0.04,
    freqX: 0.85,
    freqY: 1.05,
    freqZ: 0.7,
    pulseFreq: 1.25,
    phaseX: 0.0,
    phaseY: 0.8,
    phaseP: 0.2,
    leadBias: 0.0
  },
  {
    rx: 0.24,
    ry: 0.22,
    rz: 0.24,
    baseZ: 0.03,
    orbitX: 0.17,
    orbitY: 0.13,
    freqX: 0.95,
    freqY: 1.35,
    freqZ: 0.9,
    pulseFreq: 1.45,
    phaseX: 1.9,
    phaseY: 0.3,
    phaseP: 2.1,
    leadBias: 0.12
  },
  {
    rx: 0.23,
    ry: 0.21,
    rz: 0.23,
    baseZ: -0.02,
    orbitX: 0.16,
    orbitY: 0.14,
    freqX: 1.25,
    freqY: 0.88,
    freqZ: 1.1,
    pulseFreq: 1.15,
    phaseX: 4.1,
    phaseY: 2.6,
    phaseP: 4.0,
    leadBias: -0.09
  },
  {
    rx: 0.19,
    ry: 0.18,
    rz: 0.22,
    baseZ: 0.08,
    orbitX: 0.14,
    orbitY: 0.15,
    freqX: 1.45,
    freqY: 1.12,
    freqZ: 1.3,
    pulseFreq: 1.65,
    phaseX: 2.9,
    phaseY: 4.7,
    phaseP: 1.1,
    leadBias: 0.06
  }
];

export function createHoneySourceModel(): THREE.Group {
  const root = new THREE.Group();

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.36, 0.5, 6),
    SHARED_MATERIALS.honeySource
  );
  cap.position.y = 0.12;
  root.add(cap);

  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.11, 0.35, 12),
    SHARED_MATERIALS.honeyLiquid
  );
  spout.position.y = -0.18;
  root.add(spout);

  const dripNeck = new THREE.Mesh(
    HONEY_SHARED_GEOS.dripThread,
    SHARED_MATERIALS.honeyLiquid
  );
  dripNeck.userData.sharedGeo = true;
  dripNeck.position.y = -0.32;
  dripNeck.scale.set(1, 0.1, 1);
  root.add(dripNeck);

  const hangingDrop = new THREE.Mesh(
    HONEY_SHARED_GEOS.dripBulb,
    SHARED_MATERIALS.honeyLiquid
  );
  hangingDrop.userData.sharedGeo = true;
  hangingDrop.position.y = -0.37;
  hangingDrop.scale.set(0.13, 0.15, 0.13);
  root.add(hangingDrop);

  const hangingBubbler = new THREE.Mesh(
    HONEY_SHARED_GEOS.dripBulb,
    SHARED_MATERIALS.honeyLiquid
  );
  hangingBubbler.userData.sharedGeo = true;
  hangingBubbler.position.set(0.08, -0.35, 0.04);
  hangingBubbler.scale.set(0.07, 0.07, 0.07);
  root.add(hangingBubbler);

  root.userData = { hangingDrop, hangingBubbler, dripNeck };
  enableShadows(root, true, true);
  return root;
}

export function createLiquidHoneyModel(): THREE.Group {
  const root = new THREE.Group();

  const blobCluster = new THREE.Group();
  root.add(blobCluster);

  const blobs: THREE.Mesh[] = [];
  for (const motion of HONEY_BLOB_MOTIONS) {
    const blob = new THREE.Mesh(
      HONEY_SHARED_GEOS.blobSphere,
      SHARED_MATERIALS.honeyLiquid
    );
    blob.position.set(
      Math.sin(motion.phaseX) * motion.orbitX * 0.6,
      Math.cos(motion.phaseY) * motion.orbitY * 0.6,
      motion.baseZ
    );
    blob.scale.set(motion.rx, motion.ry, motion.rz);
    blob.userData = { sharedGeo: true, motion };
    blobCluster.add(blob);
    blobs.push(blob);
  }

  const makeBridge = () => {
    const bridge = new THREE.Mesh(
      HONEY_SHARED_GEOS.bridgePill,
      SHARED_MATERIALS.honeyLiquid
    );
    bridge.visible = false;
    bridge.userData.sharedGeo = true;
    root.add(bridge);
    return bridge;
  };

  const bridges = {
    left: makeBridge(),
    right: makeBridge(),
    up: makeBridge(),
    down: makeBridge()
  };

  const dripThread = new THREE.Mesh(
    HONEY_SHARED_GEOS.dripThread,
    SHARED_MATERIALS.honeyLiquid
  );
  dripThread.visible = false;
  dripThread.userData.sharedGeo = true;
  root.add(dripThread);

  const dripBulb = new THREE.Mesh(
    HONEY_SHARED_GEOS.dripBulb,
    SHARED_MATERIALS.honeyLiquid
  );
  dripBulb.visible = false;
  dripBulb.userData.sharedGeo = true;
  root.add(dripBulb);

  const dripBubbler = new THREE.Mesh(
    HONEY_SHARED_GEOS.dripBulb,
    SHARED_MATERIALS.honeyLiquid
  );
  dripBubbler.visible = false;
  dripBubbler.userData.sharedGeo = true;
  root.add(dripBubbler);

  root.userData = { blobCluster, blobs, bridges, dripThread, dripBulb, dripBubbler };
  enableShadows(root, false, true);
  return root;
}

export function createHoneyBowlModel(): THREE.Group {
  const root = new THREE.Group();

  // Dark wooden pedestal
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.14, 18),
    SHARED_MATERIALS.wallWood
  );
  base.position.y = -0.35;
  root.add(base);

  // Curved golden brass bowl
  const bowlPts = [
    new THREE.Vector2(0.0, -0.28),
    new THREE.Vector2(0.24, -0.28),
    new THREE.Vector2(0.38, -0.14),
    new THREE.Vector2(0.42, 0.08),
    new THREE.Vector2(0.44, 0.16),
    new THREE.Vector2(0.37, 0.17),
    new THREE.Vector2(0.33, 0.02),
    new THREE.Vector2(0.18, -0.15),
    new THREE.Vector2(0.0, -0.17)
  ];
  const bowlMesh = new THREE.Mesh(
    new THREE.LatheGeometry(bowlPts, 24),
    SHARED_MATERIALS.brass
  );
  root.add(bowlMesh);

  // Wooden accent band & small front honey emblem
  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.03, 10, 24),
    SHARED_MATERIALS.wallWood
  );
  accentRing.rotation.x = Math.PI / 2;
  accentRing.position.y = -0.05;
  root.add(accentRing);

  const emblem = new THREE.Mesh(
    HONEY_SHARED_GEOS.dripBulb,
    SHARED_MATERIALS.honeyLiquid
  );
  emblem.userData.sharedGeo = true;
  emblem.position.set(0, -0.05, 0.4);
  emblem.scale.set(0.07, 0.09, 0.05);
  root.add(emblem);

  // Liquid honey fill inside the chalice (revealed when filled)
  const fillGroup = new THREE.Group();
  fillGroup.visible = false;
  fillGroup.scale.setScalar(0.01);
  fillGroup.position.set(0, 0.07, 0);

  const honeyPool = new THREE.Mesh(
    HONEY_SHARED_GEOS.blobSphere,
    SHARED_MATERIALS.honeyLiquid
  );
  honeyPool.userData.sharedGeo = true;
  honeyPool.scale.set(0.34, 0.12, 0.34);
  fillGroup.add(honeyPool);

  const fillBlobs: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(
      HONEY_SHARED_GEOS.blobSphere,
      SHARED_MATERIALS.honeyLiquid
    );
    b.userData.sharedGeo = true;
    b.position.set(i === 0 ? -0.11 : 0.12, 0.05, i === 0 ? 0.06 : -0.05);
    b.scale.set(0.13, 0.09, 0.13);
    fillGroup.add(b);
    fillBlobs.push(b);
  }
  root.add(fillGroup);

  root.userData = { fillGroup, fillBlobs };
  enableShadows(root, true, true);
  return root;
}

export function createHoneyGateModel(): THREE.Group {
  const root = new THREE.Group();

  // Outer gate frame
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.14, 0.64),
    SHARED_MATERIALS.wallWood
  );
  topBar.position.y = 0.42;
  root.add(topBar);

  const bottomBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.12, 0.64),
    SHARED_MATERIALS.wallWood
  );
  bottomBar.position.y = -0.43;
  root.add(bottomBar);

  for (const sx of [-0.42, 0.42]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.96, 0.64),
      SHARED_MATERIALS.wallWood
    );
    post.position.x = sx;
    root.add(post);
  }

  // Four vertical gate bars
  for (const bx of [-0.24, -0.08, 0.08, 0.24]) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.82, 10),
      SHARED_MATERIALS.wallTrim
    );
    bar.position.x = bx;
    root.add(bar);
  }

  // Leafy vines woven across the bars
  for (let i = 0; i < 2; i++) {
    const vine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.86, 8),
      SHARED_MATERIALS.stemGreen
    );
    vine.rotation.z = Math.PI / 2 + (i === 0 ? 0.22 : -0.22);
    vine.position.set(0, i === 0 ? 0.18 : -0.18, 0.12);
    root.add(vine);
  }

  // Central golden honey crest seal
  const crestMesh = new THREE.Group();
  crestMesh.position.set(0, 0, 0.22);

  const sealPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.08, 6),
    SHARED_MATERIALS.brass
  );
  sealPlate.rotation.x = Math.PI / 2;
  crestMesh.add(sealPlate);

  const sealDrop = new THREE.Mesh(
    HONEY_SHARED_GEOS.dripBulb,
    SHARED_MATERIALS.honeyLiquid
  );
  sealDrop.userData.sharedGeo = true;
  sealDrop.position.set(0, -0.01, 0.05);
  sealDrop.scale.set(0.095, 0.125, 0.07);
  crestMesh.add(sealDrop);

  root.add(crestMesh);

  root.userData = { crestMesh };
  enableShadows(root, true, true);
  return root;
}

function createBlossomEmblem(petalMat: THREE.Material, centerMat: THREE.Material): THREE.Group {
  const emblem = new THREE.Group();
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), centerMat);
  center.scale.z = 0.65;
  emblem.add(center);

  const petalGeo = new THREE.SphereGeometry(0.06, 8, 8);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.scale.set(0.85, 1.25, 0.48);
    petal.position.set(Math.cos(angle) * 0.105, Math.sin(angle) * 0.105, -0.01);
    petal.rotation.z = angle - Math.PI / 2;
    emblem.add(petal);
  }
  return emblem;
}

export function createPressurePlateModel(): THREE.Group {
  const root = new THREE.Group();
  const disposableMaterials: THREE.Material[] = [];

  // Wooden base anchored cleanly at the bottom of the tile
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.08, 0.72),
    SHARED_MATERIALS.wallWood
  );
  base.position.set(0, -0.45, 0);
  root.add(base);

  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.04, 0.76),
    SHARED_MATERIALS.brass
  );
  rim.position.set(0, -0.42, 0);
  root.add(rim);

  // Glowing pink cushion pad that depresses when a honeypot rests on it
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xf46d91,
    emissive: 0xd65a72,
    emissiveIntensity: 0.25,
    roughness: 0.38
  });
  disposableMaterials.push(glowMat);

  const padGroup = new THREE.Group();
  padGroup.position.set(0, -0.37, 0);

  const padPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.08, 12), glowMat);
  padGroup.add(padPlate);

  const topDot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12),
    SHARED_MATERIALS.flowerCenter
  );
  topDot.position.y = 0.045;
  padGroup.add(topDot);
  root.add(padGroup);

  // Back-wall blossom medallion visible even when a honeypot sits on the plate
  const backPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16),
    SHARED_MATERIALS.wallTrim
  );
  backPlate.rotation.x = Math.PI / 2;
  backPlate.position.set(0, 0.12, -0.32);
  root.add(backPlate);

  const wallBlossom = createBlossomEmblem(glowMat, SHARED_MATERIALS.flowerCenter);
  wallBlossom.position.set(0, 0.12, -0.28);
  root.add(wallBlossom);

  root.userData = { padGroup, glowMat, disposableMaterials };
  enableShadows(root, true, true);
  return root;
}

export function createPetalGateModel(): THREE.Group {
  const root = new THREE.Group();

  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.14, 0.64),
    SHARED_MATERIALS.wallWood
  );
  topBar.position.y = 0.42;
  root.add(topBar);

  const bottomBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.12, 0.64),
    SHARED_MATERIALS.wallWood
  );
  bottomBar.position.y = -0.43;
  root.add(bottomBar);

  for (const sx of [-0.42, 0.42]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.96, 0.64),
      SHARED_MATERIALS.wallWood
    );
    post.position.x = sx;
    root.add(post);
  }

  for (const bx of [-0.24, -0.08, 0.08, 0.24]) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.82, 10),
      SHARED_MATERIALS.petalBarCream
    );
    bar.position.x = bx;
    root.add(bar);
  }

  for (let i = 0; i < 2; i++) {
    const vine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.86, 8),
      SHARED_MATERIALS.stemGreen
    );
    vine.rotation.z = Math.PI / 2 + (i === 0 ? 0.22 : -0.22);
    vine.position.set(0, i === 0 ? 0.18 : -0.18, 0.12);
    root.add(vine);
  }

  const crestMesh = new THREE.Group();
  crestMesh.position.set(0, 0, 0.22);

  const sealPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.07, 16),
    SHARED_MATERIALS.brass
  );
  sealPlate.rotation.x = Math.PI / 2;
  crestMesh.add(sealPlate);

  const sealFlower = createBlossomEmblem(
    SHARED_MATERIALS.petalGatePink,
    SHARED_MATERIALS.flowerCenter
  );
  sealFlower.position.set(0, 0, 0.06);
  sealFlower.scale.setScalar(1.08);
  crestMesh.add(sealFlower);

  root.add(crestMesh);

  root.userData = { crestMesh };
  enableShadows(root, true, true);
  return root;
}

export function createPortalModel(pair: 0 | 1): THREE.Group {
  const root = new THREE.Group();
  root.position.z = -0.22;
  const disposableMaterials: THREE.Material[] = [];

  const isViolet = pair === 0;
  const petalColor = isViolet ? 0xb975ff : 0x38d9d2;
  const emissiveColor = isViolet ? 0x843dff : 0x0fa3b1;
  const ringColor = isViolet ? 0xffe066 : 0xa8ffeb;
  const discColor = isViolet ? 0xdcb8ff : 0x9ef7f2;

  const petalMat = new THREE.MeshStandardMaterial({
    color: petalColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.45,
    roughness: 0.28
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: ringColor,
    emissive: ringColor,
    emissiveIntensity: 0.35,
    roughness: 0.32,
    metalness: 0.25
  });
  const discMat = new THREE.MeshBasicMaterial({
    color: discColor,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const beadMat = new THREE.MeshBasicMaterial({
    color: 0xfff8cf
  });
  disposableMaterials.push(petalMat, ringMat, discMat, beadMat);

  // Outer flower petals
  const petalCount = isViolet ? 6 : 8;
  const petalGeo = new THREE.SphereGeometry(isViolet ? 0.13 : 0.1, 10, 8);
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.scale.set(isViolet ? 0.9 : 0.65, isViolet ? 1.35 : 1.55, 0.36);
    petal.position.set(Math.cos(angle) * 0.31, Math.sin(angle) * 0.31, -0.02);
    petal.rotation.z = angle - Math.PI / 2;
    root.add(petal);
  }

  // Glowing inner ring & shimmering vortex disc
  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.036, 10, 24), ringMat);
  root.add(coreRing);

  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.25, 22), discMat);
  disc.position.z = 0.01;
  root.add(disc);

  // Rotating fairy beads
  const swirlGroup = new THREE.Group();
  swirlGroup.position.z = 0.04;
  const beadGeo = new THREE.SphereGeometry(0.048, 8, 8);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const bead = new THREE.Mesh(beadGeo, beadMat);
    bead.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0);
    swirlGroup.add(bead);
  }
  root.add(swirlGroup);

  root.userData = {
    swirlGroup,
    coreRing,
    glowMat: petalMat,
    discMat,
    disposableMaterials
  };
  return root;
}

export function createGrubModel(): THREE.Group {
  const root = new THREE.Group();
  const segments: THREE.Group[] = [];

  const tailSpecs = [
    { z: -0.24, r: 0.145, mat: SHARED_MATERIALS.grubStripe },
    { z: -0.09, r: 0.175, mat: SHARED_MATERIALS.grubBody },
    { z: 0.07, r: 0.185, mat: SHARED_MATERIALS.grubStripe }
  ];

  for (const spec of tailSpecs) {
    const segGroup = new THREE.Group();
    segGroup.position.set(0, -0.02, spec.z);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.r, 14, 12), spec.mat);
    mesh.scale.set(1.02, 0.92, 1.05);
    segGroup.add(mesh);
    root.add(segGroup);
    segments.push(segGroup);
  }

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.02, 0.22);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 14),
    SHARED_MATERIALS.grubHead
  );
  head.scale.set(1.02, 0.96, 0.95);
  headGroup.add(head);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 10, 8),
      SHARED_MATERIALS.eyeDark
    );
    eye.position.set(side * 0.068, 0.045, 0.125);
    headGroup.add(eye);

    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.011, 8, 6),
      SHARED_MATERIALS.eyeShine
    );
    shine.position.set(side * 0.068 + 0.01, 0.056, 0.15);
    headGroup.add(shine);

    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 8),
      SHARED_MATERIALS.beeCheek
    );
    cheek.scale.set(1.1, 0.72, 0.55);
    cheek.position.set(side * 0.105, -0.02, 0.1);
    headGroup.add(cheek);

    const feeler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.014, 0.085, 6),
      SHARED_MATERIALS.grubStripe
    );
    feeler.position.set(side * 0.045, 0.155, 0.05);
    feeler.rotation.z = -side * 0.3;
    feeler.rotation.x = 0.25;
    headGroup.add(feeler);
  }

  root.add(headGroup);

  const sleepGroup = new THREE.Group();
  sleepGroup.visible = false;
  for (let i = 0; i < 3; i++) {
    const zOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.042 + i * 0.012, 8, 8),
      SHARED_MATERIALS.sleepZ
    );
    zOrb.position.set(0.06 + i * 0.05, 0.24 + i * 0.11, 0.15);
    sleepGroup.add(zOrb);
  }
  root.add(sleepGroup);

  enableShadows(root, true, true);
  root.userData = {
    segments,
    headGroup,
    sleepGroup
  };
  return root;
}

export function createMiteModel(): THREE.Group {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.03, 0);
  root.add(bodyGroup);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 18, 14),
    SHARED_MATERIALS.miteBody
  );
  shell.scale.set(1.06, 0.78, 1.16);
  bodyGroup.add(shell);

  // Warm amber spots on back
  const spotSpecs: Array<[number, number, number, number]> = [
    [0, 0.17, -0.05, 0.055],
    [-0.1, 0.14, 0.05, 0.042],
    [0.1, 0.14, 0.05, 0.042]
  ];
  for (const [sx, sy, sz, sr] of spotSpecs) {
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(sr, 10, 8),
      SHARED_MATERIALS.miteSpot
    );
    spot.scale.set(1, 0.45, 1);
    spot.position.set(sx, sy, sz);
    bodyGroup.add(spot);
  }

  // Cute round front eyes + antennae
  const antennae: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 10, 8),
      SHARED_MATERIALS.eyeDark
    );
    eye.position.set(side * 0.082, 0.045, 0.235);
    bodyGroup.add(eye);

    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 8, 6),
      SHARED_MATERIALS.eyeShine
    );
    shine.position.set(side * 0.082 + 0.01, 0.06, 0.27);
    bodyGroup.add(shine);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.014, 0.14, 6),
      SHARED_MATERIALS.miteLeg
    );
    antenna.position.set(side * 0.055, 0.125, 0.22);
    antenna.rotation.x = 0.55;
    antenna.rotation.z = -side * 0.35;
    bodyGroup.add(antenna);
    antennae.push(antenna);
  }

  // 6 lively little scurry legs (3 left, 3 right)
  const leftLegs: THREE.Group[] = [];
  const rightLegs: THREE.Group[] = [];
  const legZOffsets = [0.11, 0, -0.11];
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.2, -0.02, legZOffsets[i]);

      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.024, 0.1, 4, 8),
        SHARED_MATERIALS.miteLeg
      );
      leg.position.set(side * 0.065, -0.05, 0);
      leg.rotation.z = side * 0.72;
      pivot.add(leg);

      bodyGroup.add(pivot);
      if (side < 0) leftLegs.push(pivot);
      else rightLegs.push(pivot);
    }
  }

  const sleepGroup = new THREE.Group();
  sleepGroup.visible = false;
  for (let i = 0; i < 3; i++) {
    const zOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.042 + i * 0.012, 8, 8),
      SHARED_MATERIALS.sleepZ
    );
    zOrb.position.set(0.06 + i * 0.05, 0.26 + i * 0.11, 0.12);
    sleepGroup.add(zOrb);
  }
  root.add(sleepGroup);

  enableShadows(root, true, true);
  root.userData = {
    bodyGroup,
    leftLegs,
    rightLegs,
    antennae,
    sleepGroup
  };
  return root;
}

export function createFlowerBudModel(variant = 0): THREE.Group {
  const root = new THREE.Group();
  const petalMat =
    SHARED_MATERIALS.petalVariants[Math.abs(variant) % SHARED_MATERIALS.petalVariants.length];

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.04, 0.26, 8),
    SHARED_MATERIALS.stemGreen
  );
  stem.position.set(0, -0.18, 0);
  root.add(stem);

  const leaves: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 10, 8),
      SHARED_MATERIALS.stemGreen
    );
    leaf.scale.set(1.15, 0.42, 0.35);
    leaf.position.set(side * 0.11, -0.22, 0);
    leaf.rotation.z = side * 0.45;
    root.add(leaf);
    leaves.push(leaf);
  }

  const budHead = new THREE.Group();
  budHead.position.set(0, -0.02, 0.02);
  root.add(budHead);

  const calyx = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 10),
    SHARED_MATERIALS.budCalyx
  );
  calyx.scale.set(1.05, 0.78, 1.05);
  calyx.position.y = -0.02;
  budHead.add(calyx);

  // 4 curled closed petals hugging the bud tip
  const petalGeo = new THREE.SphereGeometry(0.085, 10, 8);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.scale.set(0.75, 1.45, 0.75);
    petal.position.set(Math.cos(angle) * 0.048, 0.06, Math.sin(angle) * 0.048);
    petal.rotation.z = -Math.cos(angle) * 0.28;
    petal.rotation.x = Math.sin(angle) * 0.28;
    budHead.add(petal);
  }

  enableShadows(root, true, true);
  root.userData = {
    budHead,
    leaves
  };
  return root;
}
