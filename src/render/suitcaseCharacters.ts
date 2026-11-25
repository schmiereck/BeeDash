import * as THREE from 'three';
import { AssetFactory } from './assetFactory';

export type CharacterKey = 'frau_honig' | 'child_girl' | 'child_boy' | 'alberta';

export type CharacterPose =
  | 'wave'
  | 'cheer'
  | 'sip_tea'
  | 'fly_umbrella'
  | 'blow_bubbles'
  | 'sit_stargaze';

export interface AnimatedCharacter {
  root: THREE.Group;
  ownedMaterials: THREE.Material[];
  mixer: THREE.AnimationMixer | null;
  isCustomGlb: boolean;
  update: (t: number, dt: number, pose: CharacterPose) => void;
}

interface CharacterRig {
  bodyGroup: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  scarfTailPivot?: THREE.Group;
  scarfTipPivot?: THREE.Group;
  leftPigtail?: THREE.Group;
  rightPigtail?: THREE.Group;
}

function trackMat<T extends THREE.Material>(owned: THREE.Material[], mat: T): T {
  owned.push(mat);
  return mat;
}

function addLegLimb(
  pivot: THREE.Group,
  legMat: THREE.Material,
  bootMat: THREE.Material,
  stripeMat?: THREE.Material
): void {
  if (stripeMat) {
    // Bee-striped stockings like Frau Honig's illustration
    for (let i = 0; i < 4; i++) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.039 - i * 0.002, 0.037 - i * 0.002, 0.064, 12),
        i % 2 === 0 ? legMat : stripeMat
      );
      band.position.y = -0.04 - i * 0.06;
      band.castShadow = true;
      pivot.add(band);
    }
  } else {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.032, 0.25, 12),
      legMat
    );
    leg.position.y = -0.13;
    leg.castShadow = true;
    pivot.add(leg);
  }

  // Foot / boot extending cleanly down to y = -0.34 from hip (total y = 0 at rest)
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.046, 0.07, 12), bootMat);
  cuff.position.set(0, -0.275, 0.004);
  cuff.castShadow = true;
  pivot.add(cuff);

  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), bootMat);
  toe.scale.set(0.95, 0.72, 1.38);
  toe.position.set(0, -0.305, 0.032);
  toe.castShadow = true;
  pivot.add(toe);
}

function addArmLimb(
  pivot: THREE.Group,
  sleeveMat: THREE.Material,
  skinMat: THREE.Material
): void {
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.031, 0.21, 10),
    sleeveMat
  );
  sleeve.position.y = -0.105;
  sleeve.castShadow = true;
  pivot.add(sleeve);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), skinMat);
  hand.position.y = -0.22;
  hand.castShadow = true;
  pivot.add(hand);
}

function createCuteFace(
  headPivot: THREE.Group,
  owned: THREE.Material[],
  skinMat: THREE.Material,
  radius: number
): void {
  const head = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 14), skinMat);
  head.position.y = radius;
  head.castShadow = true;
  headPivot.add(head);

  const eyeMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x1e130c, roughness: 0.22 })
  );
  const shineMat = trackMat(
    owned,
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  const cheekMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf48fa3, roughness: 0.6 })
  );
  const smileMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xb5534b, roughness: 0.45 })
  );

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.14, 10, 8), eyeMat);
    eye.position.set(side * radius * 0.34, radius * 1.06, radius * 0.9);
    headPivot.add(eye);

    const shine = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.055, 6, 6), shineMat);
    shine.position.set(side * radius * 0.36, radius * 1.11, radius * 1.02);
    headPivot.add(shine);

    const cheek = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.17, 10, 8), cheekMat);
    cheek.scale.set(1.15, 0.72, 0.45);
    cheek.position.set(side * radius * 0.56, radius * 0.84, radius * 0.78);
    headPivot.add(cheek);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.11, 8, 8), skinMat);
  nose.position.set(0, radius * 0.94, radius * 0.98);
  headPivot.add(nose);

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.22, radius * 0.045, 6, 12, Math.PI),
    smileMat
  );
  smile.position.set(0, radius * 0.78, radius * 0.88);
  smile.rotation.z = Math.PI;
  smile.rotation.x = 0.25;
  headPivot.add(smile);
}

function buildFrauHonigRig(owned: THREE.Material[]): { root: THREE.Group; rig: CharacterRig } {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf9d6b5, roughness: 0.62 })
  );
  const bootMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x2c2420, roughness: 0.55 })
  );
  const tightsYellowMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xe8ba32, roughness: 0.65 })
  );
  const tightsBrownMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x5c5222, roughness: 0.68 })
  );
  const skirtMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x8aa054, roughness: 0.72 })
  );
  const coatMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf0ad2e, roughness: 0.58 })
  );
  const buttonMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x7a4822, roughness: 0.5 })
  );
  const scarfMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x84a666, roughness: 0.72 })
  );
  const hairMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({
      color: 0x6b472b,
      roughness: 0.68,
      side: THREE.DoubleSide
    })
  );
  const hatMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x74a89a, roughness: 0.65, side: THREE.DoubleSide })
  );
  const hatFlowerMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x9ad1c0, roughness: 0.5 })
  );

  // Legs (hip at y = 0.34, striped tights + lace-up boots down to y = 0)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.068, 0.34, 0);
  addLegLimb(leftLegPivot, tightsYellowMat, bootMat, tightsBrownMat);
  bodyGroup.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.068, 0.34, 0);
  addLegLimb(rightLegPivot, tightsYellowMat, bootMat, tightsBrownMat);
  bodyGroup.add(rightLegPivot);

  // Olive-green skirt
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.21, 0.19, 18), skirtMat);
  skirt.position.set(0, 0.38, 0);
  skirt.scale.z = 0.88;
  skirt.castShadow = true;
  bodyGroup.add(skirt);

  // Warm honey-ochre buttoned coat
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.15, 0.27, 16), coatMat);
  coat.position.set(0, 0.55, 0);
  coat.scale.z = 0.85;
  coat.castShadow = true;
  bodyGroup.add(coat);

  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.012, 10), buttonMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, 0.6 - i * 0.068, 0.106 + i * 0.008);
    bodyGroup.add(btn);
  }

  // Sage-green neck scarf & animated fluttering scarf tail
  const neckScarf = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.036, 10, 18), scarfMat);
  neckScarf.rotation.x = Math.PI / 2;
  neckScarf.position.set(0, 0.68, 0.005);
  neckScarf.castShadow = true;
  bodyGroup.add(neckScarf);

  const scarfTailPivot = new THREE.Group();
  scarfTailPivot.position.set(-0.085, 0.66, -0.04);
  const scarfSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.042, 0.025), scarfMat);
  scarfSeg1.position.set(-0.065, 0.01, -0.03);
  scarfSeg1.rotation.y = 0.45;
  scarfSeg1.castShadow = true;
  scarfTailPivot.add(scarfSeg1);

  const scarfTipPivot = new THREE.Group();
  scarfTipPivot.position.set(-0.12, 0.01, -0.055);
  const scarfSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.036, 0.02), scarfMat);
  scarfSeg2.position.set(-0.055, 0, -0.02);
  scarfSeg2.rotation.y = 0.25;
  scarfSeg2.castShadow = true;
  scarfTipPivot.add(scarfSeg2);
  scarfTailPivot.add(scarfTipPivot);
  bodyGroup.add(scarfTailPivot);

  // Arms
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.132, 0.635, 0);
  addArmLimb(leftArmPivot, coatMat, skinMat);
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.132, 0.635, 0);
  addArmLimb(rightArmPivot, coatMat, skinMat);
  bodyGroup.add(rightArmPivot);

  // Head + chestnut bob (open in front so her face is fully visible) + wide-brimmed flower hat
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.7, 0);
  createCuteFace(headPivot, owned, skinMat, 0.125);

  const backHair = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.132,
      0.16,
      0.195,
      18,
      1,
      true,
      Math.PI * 0.36,
      Math.PI * 1.28
    ),
    hairMat
  );
  backHair.position.set(0, 0.105, -0.012);
  backHair.castShadow = true;
  backHair.userData.isHair = true;
  headPivot.add(backHair);

  const topHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.132, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hairMat
  );
  topHair.position.set(0, 0.132, -0.014);
  topHair.rotation.x = -0.42;
  topHair.userData.isHair = true;
  headPivot.add(topHair);

  // Soft side temple wisps framing cheeks without blocking her face
  const wispGeo = new THREE.SphereGeometry(0.036, 10, 8);
  for (const side of [-1, 1]) {
    const wisp = new THREE.Mesh(wispGeo, hairMat);
    wisp.scale.set(0.65, 1.35, 0.9);
    wisp.position.set(side * 0.105, 0.165, 0.048);
    wisp.rotation.z = side * 0.22;
    wisp.userData.isHair = true;
    headPivot.add(wisp);
  }

  // Wide-brimmed sage-teal sunhat matching the reference illustration
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.022, 24), hatMat);
  brim.position.set(0, 0.205, 0.01);
  brim.scale.set(1.06, 1, 0.9);
  brim.rotation.x = -0.06;
  brim.castShadow = true;
  headPivot.add(brim);

  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.148, 0.095, 18), hatMat);
  hatCrown.position.set(0, 0.25, 0.005);
  hatCrown.castShadow = true;
  headPivot.add(hatCrown);

  // Decorative 5-petal sage hat flower pinned to brim
  const hatFlower = new THREE.Group();
  hatFlower.position.set(-0.14, 0.245, 0.12);
  hatFlower.rotation.set(0.25, -0.25, 0.2);
  const fCenter = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), coatMat);
  hatFlower.add(fCenter);
  const pGeo = new THREE.SphereGeometry(0.028, 8, 6);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const pet = new THREE.Mesh(pGeo, hatFlowerMat);
    pet.scale.set(1, 0.65, 1);
    pet.position.set(Math.cos(a) * 0.042, Math.sin(a) * 0.042, 0);
    hatFlower.add(pet);
  }
  headPivot.add(hatFlower);

  bodyGroup.add(headPivot);

  return {
    root,
    rig: {
      bodyGroup,
      headPivot,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      scarfTailPivot,
      scarfTipPivot
    }
  };
}

function buildChildGirlRig(owned: THREE.Material[]): { root: THREE.Group; rig: CharacterRig } {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xfbd8ba, roughness: 0.62 })
  );
  const bootMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x8f2d45, roughness: 0.55 })
  );
  const tightsMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xfff3de, roughness: 0.72 })
  );
  const dressMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xe66c85, roughness: 0.6 })
  );
  const collarMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xffd54f, roughness: 0.55 })
  );
  const hairMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x7d4e2d, roughness: 0.68 })
  );

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.065, 0.34, 0);
  addLegLimb(leftLegPivot, tightsMat, bootMat);
  bodyGroup.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.065, 0.34, 0);
  addLegLimb(rightLegPivot, tightsMat, bootMat);
  bodyGroup.add(rightLegPivot);

  const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.2, 0.34, 18), dressMat);
  dress.position.set(0, 0.45, 0);
  dress.scale.z = 0.88;
  dress.castShadow = true;
  bodyGroup.add(dress);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.026, 8, 16), collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.615, 0.005);
  bodyGroup.add(collar);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.125, 0.59, 0);
  addArmLimb(leftArmPivot, dressMat, skinMat);
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.125, 0.59, 0);
  addArmLimb(rightArmPivot, dressMat, skinMat);
  bodyGroup.add(rightArmPivot);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.65, 0);
  createCuteFace(headPivot, owned, skinMat, 0.135);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.143, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairCap.position.set(0, 0.142, -0.014);
  hairCap.rotation.x = -0.4;
  hairCap.userData.isHair = true;
  headPivot.add(hairCap);

  // Two playful bouncing ponytails with golden hairbows
  const createPigtail = (side: -1 | 1): THREE.Group => {
    const pg = new THREE.Group();
    pg.position.set(side * 0.135, 0.21, -0.02);
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), collarMat);
    pg.add(bow);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.17, 10), hairMat);
    tail.position.set(side * 0.03, -0.08, -0.01);
    tail.rotation.z = side * 0.35;
    tail.castShadow = true;
    tail.userData.isHair = true;
    pg.add(tail);
    return pg;
  };
  const leftPigtail = createPigtail(-1);
  const rightPigtail = createPigtail(1);
  headPivot.add(leftPigtail, rightPigtail);
  bodyGroup.add(headPivot);

  return {
    root,
    rig: {
      bodyGroup,
      headPivot,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      leftPigtail,
      rightPigtail
    }
  };
}

function buildChildBoyRig(owned: THREE.Material[]): { root: THREE.Group; rig: CharacterRig } {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xfad7b6, roughness: 0.62 })
  );
  const shoeMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.6 })
  );
  const denimMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x5682b0, roughness: 0.68 })
  );
  const shirtMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xfff0c2, roughness: 0.65 })
  );
  const stripeMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf0ad2e, roughness: 0.58 })
  );
  const brassMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf2c94c, metalness: 0.45, roughness: 0.35 })
  );
  const hairMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x8c5a32, roughness: 0.68 })
  );

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.068, 0.34, 0);
  addLegLimb(leftLegPivot, denimMat, shoeMat);
  bodyGroup.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.068, 0.34, 0);
  addLegLimb(rightLegPivot, denimMat, shoeMat);
  bodyGroup.add(rightLegPivot);

  const torsoShirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.125, 0.25, 16),
    shirtMat
  );
  torsoShirt.position.set(0, 0.515, 0);
  torsoShirt.scale.z = 0.85;
  torsoShirt.castShadow = true;
  bodyGroup.add(torsoShirt);

  const bibShorts = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.135, 0.16, 16), denimMat);
  bibShorts.position.set(0, 0.39, 0);
  bibShorts.scale.z = 0.9;
  bibShorts.castShadow = true;
  bodyGroup.add(bibShorts);

  const frontBib = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.04), denimMat);
  frontBib.position.set(0, 0.52, 0.095);
  bodyGroup.add(frontBib);

  for (const bx of [-0.045, 0.045]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.15, 0.18), denimMat);
    strap.position.set(bx, 0.56, 0);
    bodyGroup.add(strap);

    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), brassMat);
    btn.position.set(bx, 0.56, 0.116);
    bodyGroup.add(btn);
  }

  const shirtBand = new THREE.Mesh(new THREE.CylinderGeometry(0.114, 0.118, 0.045, 16), stripeMat);
  shirtBand.position.set(0, 0.52, -0.005);
  shirtBand.scale.z = 0.86;
  bodyGroup.add(shirtBand);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.132, 0.6, 0);
  addArmLimb(leftArmPivot, shirtMat, skinMat);
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.132, 0.6, 0);
  addArmLimb(rightArmPivot, shirtMat, skinMat);
  bodyGroup.add(rightArmPivot);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.66, 0);
  createCuteFace(headPivot, owned, skinMat, 0.135);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.143, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairCap.position.set(0, 0.142, -0.014);
  hairCap.rotation.x = -0.4;
  hairCap.userData.isHair = true;
  headPivot.add(hairCap);

  // Tousled front tufts
  for (let i = -1; i <= 1; i++) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.085, 8), hairMat);
    tuft.position.set(i * 0.045, 0.255, 0.078);
    tuft.rotation.set(0.65, 0, -i * 0.35);
    tuft.userData.isHair = true;
    headPivot.add(tuft);
  }
  bodyGroup.add(headPivot);

  return {
    root,
    rig: {
      bodyGroup,
      headPivot,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot
    }
  };
}

function buildAlbertaRig(owned: THREE.Material[]): { root: THREE.Group; rig: CharacterRig } {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf9d5b4, roughness: 0.62 })
  );
  const bootMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x5c361c, roughness: 0.56 })
  );
  const overallMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x3b7fa8, roughness: 0.62 })
  );
  const shirtMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xffe482, roughness: 0.58 })
  );
  const scarfMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xf26449, roughness: 0.65 })
  );
  const hairMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x8f4324, roughness: 0.66 })
  );
  const strapMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0x6b3e21, roughness: 0.65 })
  );
  const brassMat = trackMat(
    owned,
    new THREE.MeshStandardMaterial({ color: 0xe6b52e, metalness: 0.58, roughness: 0.28 })
  );
  const goggleLensMat = trackMat(
    owned,
    new THREE.MeshPhysicalMaterial({
      color: 0x7fd8ff,
      emissive: 0x2a7fb8,
      emissiveIntensity: 0.16,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1.0
    })
  );

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.068, 0.34, 0);
  addLegLimb(leftLegPivot, overallMat, bootMat);
  bodyGroup.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.068, 0.34, 0);
  addLegLimb(rightLegPivot, overallMat, bootMat);
  bodyGroup.add(rightLegPivot);

  // Cozy inventor dungarees / overalls over bright yellow shirt
  const shirtChest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.106, 0.124, 0.25, 16),
    shirtMat
  );
  shirtChest.position.set(0, 0.515, 0);
  shirtChest.scale.z = 0.86;
  shirtChest.castShadow = true;
  bodyGroup.add(shirtChest);

  const pants = new THREE.Mesh(
    new THREE.CylinderGeometry(0.122, 0.138, 0.17, 16),
    overallMat
  );
  pants.position.set(0, 0.39, 0);
  pants.scale.z = 0.9;
  pants.castShadow = true;
  bodyGroup.add(pants);

  const frontBib = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.145, 0.045), overallMat);
  frontBib.position.set(0, 0.52, 0.095);
  bodyGroup.add(frontBib);

  const toolPocket = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.068, 0.02), scarfMat);
  toolPocket.position.set(0, 0.495, 0.118);
  bodyGroup.add(toolPocket);

  for (const bx of [-0.048, 0.048]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.15, 0.18), overallMat);
    strap.position.set(bx, 0.56, 0);
    bodyGroup.add(strap);

    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), brassMat);
    btn.position.set(bx, 0.565, 0.118);
    bodyGroup.add(btn);
  }

  // Little inventor collar kerchief
  const neckScarf = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.024, 8, 16), scarfMat);
  neckScarf.rotation.x = Math.PI / 2;
  neckScarf.position.set(0, 0.625, 0.005);
  bodyGroup.add(neckScarf);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.132, 0.6, 0);
  addArmLimb(leftArmPivot, shirtMat, skinMat);
  bodyGroup.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.132, 0.6, 0);
  addArmLimb(rightArmPivot, shirtMat, skinMat);
  bodyGroup.add(rightArmPivot);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.66, 0);
  createCuteFace(headPivot, owned, skinMat, 0.135);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.143, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairCap.position.set(0, 0.142, -0.016);
  hairCap.rotation.x = -0.44;
  hairCap.userData.isHair = true;
  headPivot.add(hairCap);

  // Side curls + playful inventor bun at back
  for (const side of [-1, 1]) {
    const sideCurl = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 8), hairMat);
    sideCurl.position.set(side * 0.125, 0.135, -0.045);
    sideCurl.userData.isHair = true;
    headPivot.add(sideCurl);
  }
  const backBun = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), hairMat);
  backBun.position.set(0, 0.18, -0.145);
  backBun.userData.isHair = true;
  headPivot.add(backBun);

  // Signature aviator goggles (Fliegerbrille) worn proudly on forehead!
  const goggleStrap = new THREE.Mesh(
    new THREE.TorusGeometry(0.142, 0.015, 8, 24),
    strapMat
  );
  goggleStrap.rotation.x = Math.PI / 2 - 0.34;
  goggleStrap.position.set(0, 0.212, -0.005);
  headPivot.add(goggleStrap);

  const goggleBridge = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.016, 0.018), brassMat);
  goggleBridge.position.set(0, 0.218, 0.118);
  goggleBridge.rotation.x = -0.34;
  headPivot.add(goggleBridge);

  for (const side of [-1, 1]) {
    const lensGroup = new THREE.Group();
    lensGroup.position.set(side * 0.052, 0.222, 0.11);
    lensGroup.rotation.x = -0.34;
    lensGroup.rotation.y = side * 0.22;

    const brassRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.038, 0.011, 10, 20),
      brassMat
    );
    lensGroup.add(brassRim);

    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.014, 16),
      goggleLensMat
    );
    glass.rotation.x = Math.PI / 2;
    lensGroup.add(glass);

    headPivot.add(lensGroup);
  }

  bodyGroup.add(headPivot);

  return {
    root,
    rig: {
      bodyGroup,
      headPivot,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot
    }
  };
}

function animateProceduralRig(rig: CharacterRig, t: number, pose: CharacterPose): void {
  // Neutral defaults
  rig.bodyGroup.position.set(0, 0, 0);
  rig.bodyGroup.rotation.set(0, 0, 0);
  rig.headPivot.rotation.set(0, 0, 0);
  rig.leftArmPivot.rotation.set(0, 0, 0);
  rig.rightArmPivot.rotation.set(0, 0, 0);
  rig.leftLegPivot.rotation.set(0, 0, 0);
  rig.rightLegPivot.rotation.set(0, 0, 0);

  let scarfEnergy = 1;
  let hairBounce = Math.abs(Math.sin(t * 2.2)) * 0.08;

  switch (pose) {
    case 'wave': {
      rig.bodyGroup.position.y = Math.abs(Math.sin(t * 2.4)) * 0.022;
      rig.bodyGroup.rotation.z = Math.sin(t * 2.0) * 0.04;
      rig.headPivot.rotation.z = Math.sin(t * 1.8) * 0.08;
      rig.headPivot.rotation.y = Math.sin(t * 1.2) * 0.12;
      rig.leftArmPivot.rotation.z = -0.18 + Math.sin(t * 2.2) * 0.06;
      rig.rightArmPivot.rotation.z = 2.28 + Math.sin(t * 6.2) * 0.34;
      rig.rightArmPivot.rotation.x = -0.2;
      break;
    }
    case 'cheer': {
      const hop = Math.abs(Math.sin(t * 4.4));
      rig.bodyGroup.position.y = hop * 0.075;
      rig.bodyGroup.rotation.z = Math.sin(t * 2.2) * 0.06;
      rig.leftArmPivot.rotation.z = -2.35 - Math.sin(t * 5.4) * 0.25;
      rig.rightArmPivot.rotation.z = 2.35 + Math.sin(t * 5.4) * 0.25;
      rig.leftLegPivot.rotation.x = -hop * 0.22;
      rig.rightLegPivot.rotation.x = hop * 0.18;
      rig.headPivot.rotation.z = Math.sin(t * 3.0) * 0.1;
      hairBounce = 0.22 + hop * 0.26;
      scarfEnergy = 1.6;
      break;
    }
    case 'sip_tea': {
      rig.bodyGroup.position.y = Math.sin(t * 2.0) * 0.015;
      rig.bodyGroup.rotation.z = Math.sin(t * 1.6) * 0.045;
      rig.headPivot.rotation.x = 0.08 + Math.sin(t * 2.4) * 0.07;
      rig.headPivot.rotation.y = Math.sin(t * 1.3) * 0.14;
      rig.rightArmPivot.rotation.x = -1.15 - Math.sin(t * 2.6) * 0.28;
      rig.rightArmPivot.rotation.z = 0.25;
      rig.leftArmPivot.rotation.z = -0.22;
      break;
    }
    case 'fly_umbrella': {
      // Both arms reach overhead to grip the umbrella handle while boots dangle playfully
      rig.bodyGroup.rotation.x = 0.1 + Math.sin(t * 2.3) * 0.06;
      rig.leftArmPivot.rotation.x = -Math.PI * 0.88;
      rig.rightArmPivot.rotation.x = -Math.PI * 0.88;
      rig.leftArmPivot.rotation.z = -0.18;
      rig.rightArmPivot.rotation.z = 0.18;
      rig.leftLegPivot.rotation.x = Math.sin(t * 3.6) * 0.28 + 0.12;
      rig.rightLegPivot.rotation.x = -Math.sin(t * 3.6) * 0.28 + 0.12;
      rig.headPivot.rotation.x = -0.12 + Math.sin(t * 2.0) * 0.06;
      scarfEnergy = 2.8;
      break;
    }
    case 'blow_bubbles': {
      rig.bodyGroup.rotation.z = -0.05 + Math.sin(t * 1.9) * 0.045;
      rig.leftArmPivot.rotation.x = -0.95 + Math.sin(t * 1.9) * 0.28;
      rig.leftArmPivot.rotation.z = -0.28;
      rig.rightArmPivot.rotation.z = 0.35 + Math.sin(t * 2.5) * 0.15;
      rig.headPivot.rotation.y = -0.18 + Math.sin(t * 1.7) * 0.12;
      rig.headPivot.rotation.x = -0.12;
      break;
    }
    case 'sit_stargaze': {
      // Bend legs forward cleanly over bench edge (-angle rotates -Y toward +Z)
      rig.leftLegPivot.rotation.x = -Math.PI * 0.44;
      rig.rightLegPivot.rotation.x = -Math.PI * 0.44;
      rig.bodyGroup.rotation.z = Math.sin(t * 1.2) * 0.025;
      rig.headPivot.rotation.x = -0.26 + Math.sin(t * 1.1) * 0.06;
      rig.headPivot.rotation.y = Math.sin(t * 0.85) * 0.16;
      rig.leftArmPivot.rotation.x = -0.35;
      rig.rightArmPivot.rotation.x = -0.35;
      rig.leftArmPivot.rotation.z = -0.14;
      rig.rightArmPivot.rotation.z = 0.14;
      scarfEnergy = 0.7;
      break;
    }
  }

  if (rig.scarfTailPivot) {
    rig.scarfTailPivot.rotation.y = Math.sin(t * 3.4 * scarfEnergy) * 0.24 * scarfEnergy;
    rig.scarfTailPivot.rotation.z = 0.12 + Math.cos(t * 2.8 * scarfEnergy) * 0.12 * scarfEnergy;
  }
  if (rig.scarfTipPivot) {
    rig.scarfTipPivot.rotation.y = Math.sin(t * 4.5 * scarfEnergy + 0.8) * 0.28 * scarfEnergy;
  }
  if (rig.leftPigtail && rig.rightPigtail) {
    rig.leftPigtail.rotation.z = -hairBounce - Math.sin(t * 4.5) * 0.1;
    rig.rightPigtail.rotation.z = hairBounce + Math.sin(t * 4.5) * 0.1;
  }
}

type BoneRestEntry = {
  bone: THREE.Bone;
  restLocalQuat: THREE.Quaternion;
  restRel: THREE.Quaternion;
  restRelInv: THREE.Quaternion;
};

type HumanoidBones = {
  hips?: BoneRestEntry;
  spineLower?: BoneRestEntry;
  chest?: BoneRestEntry;
  neck?: BoneRestEntry;
  head?: BoneRestEntry;
  leftShoulder?: BoneRestEntry;
  leftArm?: BoneRestEntry;
  leftForeArm?: BoneRestEntry;
  rightShoulder?: BoneRestEntry;
  rightArm?: BoneRestEntry;
  rightForeArm?: BoneRestEntry;
  leftUpLeg?: BoneRestEntry;
  leftLeg?: BoneRestEntry;
  rightUpLeg?: BoneRestEntry;
  rightLeg?: BoneRestEntry;
};

function findHumanoidBone(
  byName: Map<string, BoneRestEntry>,
  patterns: RegExp[]
): BoneRestEntry | undefined {
  for (const re of patterns) {
    for (const [name, entry] of byName) {
      if (re.test(name)) return entry;
    }
  }
  return undefined;
}

/**
 * Drives pose animations on rigged humanoid GLB skeletons that lack authored
 * multi-frame animation clips by applying character-space joint deltas relative
 * to the captured bind pose.
 */
function createHumanoidBoneDriver(
  root: THREE.Object3D
): ((t: number, pose: CharacterPose) => void) | null {
  root.updateMatrixWorld(true);
  const rootWorldInv = new THREE.Quaternion();
  root.getWorldQuaternion(rootWorldInv);
  rootWorldInv.invert();

  const byName = new Map<string, BoneRestEntry>();
  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone && obj.name) {
      const worldQ = new THREE.Quaternion();
      obj.getWorldQuaternion(worldQ);
      const restRel = rootWorldInv.clone().multiply(worldQ);
      byName.set(obj.name.toLowerCase(), {
        bone: obj as THREE.Bone,
        restLocalQuat: obj.quaternion.clone(),
        restRel,
        restRelInv: restRel.clone().invert()
      });
    }
  });

  const bones: HumanoidBones = {
    hips: findHumanoidBone(byName, [/^hips$/, /^pelvis$/]),
    spineLower: findHumanoidBone(byName, [/^spine02$/, /^spine_01$/, /^spine1$/]),
    chest: findHumanoidBone(byName, [/^spine$/, /^chest$/, /^spine2$/]),
    neck: findHumanoidBone(byName, [/^neck$/]),
    head: findHumanoidBone(byName, [/^head$/]),
    leftShoulder: findHumanoidBone(byName, [/^leftshoulder$/, /shoulder.*l$/]),
    leftArm: findHumanoidBone(byName, [/^leftarm$/, /^leftupperarm$/, /upperarm.*l$/]),
    leftForeArm: findHumanoidBone(byName, [/^leftforearm$/, /^leftlowerarm$/, /forearm.*l$/]),
    rightShoulder: findHumanoidBone(byName, [/^rightshoulder$/, /shoulder.*r$/]),
    rightArm: findHumanoidBone(byName, [/^rightarm$/, /^rightupperarm$/, /upperarm.*r$/]),
    rightForeArm: findHumanoidBone(byName, [/^rightforearm$/, /^rightlowerarm$/, /forearm.*r$/]),
    leftUpLeg: findHumanoidBone(byName, [/^leftupleg$/, /^leftthigh$/, /thigh.*l$/]),
    leftLeg: findHumanoidBone(byName, [/^leftleg$/, /^leftshin$/, /shin.*l$/]),
    rightUpLeg: findHumanoidBone(byName, [/^rightupleg$/, /^rightthigh$/, /thigh.*r$/]),
    rightLeg: findHumanoidBone(byName, [/^rightleg$/, /^rightshin$/, /shin.*r$/])
  };

  const allEntries = Object.values(bones).filter((e): e is BoneRestEntry => Boolean(e));
  if (allEntries.length < 4) return null;

  const baseHipsPos = bones.hips ? bones.hips.bone.position.clone() : null;
  const charEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const charDeltaQ = new THREE.Quaternion();

  const applyCharEuler = (
    entry: BoneRestEntry | undefined,
    rx: number,
    ry: number,
    rz: number
  ): void => {
    if (!entry) return;
    if (Math.abs(rx) < 1e-5 && Math.abs(ry) < 1e-5 && Math.abs(rz) < 1e-5) return;
    charEuler.set(rx, ry, rz, 'YXZ');
    charDeltaQ.setFromEuler(charEuler);
    entry.bone.quaternion
      .copy(entry.restLocalQuat)
      .multiply(entry.restRelInv)
      .multiply(charDeltaQ)
      .multiply(entry.restRel);
  };

  return (t: number, pose: CharacterPose): void => {
    for (const entry of allEntries) {
      entry.bone.quaternion.copy(entry.restLocalQuat);
    }
    if (bones.hips && baseHipsPos) {
      bones.hips.bone.position.copy(baseHipsPos);
    }

    // Gentle default resting posture from A-pose without pulling coat armpits
    let leftArmUp = -0.34;
    let leftArmFwd = 0.06;
    let leftElbowUp = 0.08;
    let leftElbowFwd = 0.14;
    let rightArmUp = -0.34;
    let rightArmFwd = 0.06;
    let rightElbowUp = 0.08;
    let rightElbowFwd = 0.14;
    let hipHop = 0;

    switch (pose) {
      case 'wave': {
        hipHop = Math.abs(Math.sin(t * 2.4)) * 1.4;
        applyCharEuler(bones.chest, 0, 0, Math.sin(t * 2.0) * 0.04);
        applyCharEuler(bones.head, 0, Math.sin(t * 1.2) * 0.12, Math.sin(t * 1.8) * 0.08);
        rightArmUp = 0.58;
        rightArmFwd = 0.28;
        rightElbowUp = 1.15 + Math.sin(t * 6.0) * 0.24;
        rightElbowFwd = 0.25;
        break;
      }
      case 'cheer': {
        const hop = Math.abs(Math.sin(t * 4.4));
        hipHop = hop * 3.8;
        applyCharEuler(bones.chest, 0, 0, Math.sin(t * 2.2) * 0.05);
        applyCharEuler(bones.head, 0, 0, Math.sin(t * 3.0) * 0.09);
        leftArmUp = 0.82 + Math.sin(t * 5.4) * 0.12;
        rightArmUp = 0.82 + Math.sin(t * 5.4) * 0.12;
        leftArmFwd = 0.18;
        rightArmFwd = 0.18;
        leftElbowUp = 0.82 + Math.sin(t * 5.4) * 0.14;
        rightElbowUp = 0.82 + Math.sin(t * 5.4) * 0.14;
        leftElbowFwd = 0.22;
        rightElbowFwd = 0.22;
        applyCharEuler(bones.leftUpLeg, -hop * 0.2, 0, 0);
        applyCharEuler(bones.leftLeg, hop * 0.28, 0, 0);
        applyCharEuler(bones.rightUpLeg, hop * 0.14, 0, 0);
        break;
      }
      case 'sip_tea': {
        hipHop = Math.sin(t * 2.0) * 0.8;
        applyCharEuler(bones.chest, 0, 0, Math.sin(t * 1.6) * 0.04);
        applyCharEuler(bones.head, 0.08 + Math.sin(t * 2.4) * 0.07, Math.sin(t * 1.3) * 0.12, 0);
        leftArmUp = -0.38;
        leftElbowFwd = 0.18;
        rightArmUp = -0.18;
        rightArmFwd = 0.48;
        rightElbowUp = 0.68 + Math.sin(t * 2.6) * 0.16;
        rightElbowFwd = 0.65;
        break;
      }
      case 'fly_umbrella': {
        applyCharEuler(bones.spineLower, 0.09 + Math.sin(t * 2.3) * 0.05, 0, 0);
        applyCharEuler(bones.head, -0.1 + Math.sin(t * 2.0) * 0.05, 0, 0);
        leftArmUp = 0.78;
        rightArmUp = 0.78;
        leftArmFwd = 0.52;
        rightArmFwd = 0.52;
        leftElbowUp = 0.82;
        rightElbowUp = 0.82;
        leftElbowFwd = 0.38;
        rightElbowFwd = 0.38;
        applyCharEuler(bones.leftUpLeg, Math.sin(t * 3.6) * 0.24 - 0.08, 0, 0);
        applyCharEuler(bones.rightUpLeg, -Math.sin(t * 3.6) * 0.24 - 0.08, 0, 0);
        applyCharEuler(bones.leftLeg, 0.22 + Math.max(0, Math.sin(t * 3.6)) * 0.2, 0, 0);
        applyCharEuler(bones.rightLeg, 0.22 + Math.max(0, -Math.sin(t * 3.6)) * 0.2, 0, 0);
        break;
      }
      case 'blow_bubbles': {
        applyCharEuler(bones.chest, 0, 0, -0.04 + Math.sin(t * 1.9) * 0.04);
        applyCharEuler(bones.head, -0.1, -0.16 + Math.sin(t * 1.7) * 0.1, 0);
        leftArmUp = 0.12;
        leftArmFwd = 0.52;
        leftElbowUp = 0.72;
        leftElbowFwd = 0.58;
        rightArmUp = -0.24 + Math.sin(t * 2.5) * 0.12;
        break;
      }
      case 'sit_stargaze': {
        applyCharEuler(bones.hips, -0.08, 0, 0);
        applyCharEuler(bones.chest, 0, 0, Math.sin(t * 1.2) * 0.025);
        applyCharEuler(bones.head, -0.22 + Math.sin(t * 1.1) * 0.05, Math.sin(t * 0.85) * 0.15, 0);
        applyCharEuler(bones.leftUpLeg, -0.95, 0, 0);
        applyCharEuler(bones.rightUpLeg, -0.95, 0, 0);
        applyCharEuler(bones.leftLeg, 0.95, 0, 0);
        applyCharEuler(bones.rightLeg, 0.95, 0, 0);
        leftArmUp = -0.34;
        rightArmUp = -0.34;
        leftArmFwd = 0.22;
        rightArmFwd = 0.22;
        leftElbowUp = 0.2;
        rightElbowUp = 0.2;
        leftElbowFwd = 0.34;
        rightElbowFwd = 0.34;
        break;
      }
    }

    if (bones.hips && baseHipsPos && hipHop !== 0) {
      bones.hips.bone.position.y = baseHipsPos.y + hipHop;
    }
    applyCharEuler(bones.leftArm, 0, -leftArmFwd, leftArmUp);
    applyCharEuler(bones.leftForeArm, 0, -leftElbowFwd, leftElbowUp);
    applyCharEuler(bones.rightArm, 0, rightArmFwd, -rightArmUp);
    applyCharEuler(bones.rightForeArm, 0, rightElbowFwd, -rightElbowUp);
  };
}

export function createStageCharacter(
  assets: AssetFactory,
  key: CharacterKey,
  customAssetKey?: string
): AnimatedCharacter {
  const custom = assets.createCharacterModel(customAssetKey ?? key);
  if (custom) {
    const { object, animations } = custom;
    const playableAnimations = animations.filter((clip) => clip.duration > 0.1);
    let mixer: THREE.AnimationMixer | null = null;
    if (playableAnimations.length > 0) {
      mixer = new THREE.AnimationMixer(object);
      const preferred =
        playableAnimations.find((clip) => /wave|cheer|idle|dance|happy/i.test(clip.name)) ??
        playableAnimations[0];
      mixer.clipAction(preferred).play();
    }

    const inner = object;
    const boneDriver = mixer ? null : createHumanoidBoneDriver(inner);
    return {
      root: inner,
      ownedMaterials: [],
      mixer,
      isCustomGlb: true,
      update: (t, dt, pose) => {
        if (mixer) {
          mixer.update(dt);
        } else if (boneDriver) {
          boneDriver(t, pose);
        } else {
          // Subtle lifelike motion for static imported .glb meshes
          inner.rotation.z = pose === 'cheer' ? Math.sin(t * 3.8) * 0.06 : Math.sin(t * 1.8) * 0.03;
          inner.rotation.x = pose === 'fly_umbrella' ? 0.1 + Math.sin(t * 2.2) * 0.05 : 0;
        }
      }
    };
  }

  const ownedMaterials: THREE.Material[] = [];
  const built =
    key === 'frau_honig'
      ? buildFrauHonigRig(ownedMaterials)
      : key === 'child_girl'
        ? buildChildGirlRig(ownedMaterials)
        : key === 'alberta'
          ? buildAlbertaRig(ownedMaterials)
          : buildChildBoyRig(ownedMaterials);

  built.root.userData.rig = built.rig;

  return {
    root: built.root,
    ownedMaterials,
    mixer: null,
    isCustomGlb: false,
    update: (t, _dt, pose) => {
      animateProceduralRig(built.rig, t, pose);
    }
  };
}

export function animateCharacterWalk(
  root: THREE.Object3D,
  elapsed: number,
  isMoving: boolean,
  holdingWire: boolean,
  celebrating: boolean
): void {
  const rig = root.userData?.rig as CharacterRig | undefined;
  if (!rig) {
    root.position.y = celebrating ? Math.abs(Math.sin(elapsed * 5.2)) * 0.14 : 0;
    return;
  }

  if (celebrating) {
    animateProceduralRig(rig, elapsed, 'cheer');
    return;
  }

  rig.bodyGroup.rotation.set(0, 0, 0);
  rig.headPivot.rotation.set(0, 0, 0);
  rig.leftArmPivot.rotation.set(0, 0, 0);
  rig.rightArmPivot.rotation.set(0, 0, 0);
  rig.leftLegPivot.rotation.set(0, 0, 0);
  rig.rightLegPivot.rotation.set(0, 0, 0);

  if (isMoving) {
    const stride = Math.sin(elapsed * 13);
    rig.bodyGroup.position.set(0, Math.abs(Math.cos(elapsed * 13)) * 0.038, 0);
    rig.bodyGroup.rotation.z = stride * 0.04;
    rig.leftLegPivot.rotation.x = stride * 0.58;
    rig.rightLegPivot.rotation.x = -stride * 0.58;
    rig.leftArmPivot.rotation.x = -stride * 0.45;
    rig.rightArmPivot.rotation.x = holdingWire ? -1.15 : stride * 0.45;
    rig.rightArmPivot.rotation.z = holdingWire ? -0.15 : 0.12;
    rig.headPivot.rotation.y = Math.sin(elapsed * 6.5) * 0.06;
  } else {
    rig.bodyGroup.position.set(0, Math.sin(elapsed * 2.4) * 0.012, 0);
    rig.leftArmPivot.rotation.z = -0.12;
    rig.rightArmPivot.rotation.x = holdingWire ? -1.05 + Math.sin(elapsed * 3.2) * 0.06 : 0;
    rig.rightArmPivot.rotation.z = holdingWire ? -0.14 : 0.12;
    rig.headPivot.rotation.y = Math.sin(elapsed * 1.4) * 0.1;
  }
}
