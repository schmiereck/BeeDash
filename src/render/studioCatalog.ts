import * as THREE from 'three';
import { AssetFactory } from './assetFactory';
import { attachBeeStickyGroup, HoneyBlobMotion } from './proceduralModels';
import {
  CharacterKey,
  CharacterPose,
  createStageCharacter
} from './suitcaseCharacters';
import { SUITCASE_SCENES } from './suitcaseScenes';

export type StudioCategory = 'characters' | 'scenes' | 'objects';
export type StudioBeeTrick = 'flip' | 'spin' | 'waggle';

export interface StudioToggleState {
  sticky: boolean;
  dizzy: boolean;
  bowlFilled: boolean;
  platePressed: boolean;
  suitcaseOpen: boolean;
}

export interface StudioItemSpec {
  id: string;
  category: StudioCategory;
  emoji: string;
  label: string;
  description: string;
  defaultRadius: number;
  minRadius: number;
  maxRadius: number;
  targetY: number;
  defaultYaw: number;
  defaultPitch: number;
  pedestalRadius: number;
  characterKey?: CharacterKey;
  customCharacterAssetKey?: string;
  isBee?: boolean;
  sceneIndex?: number;
  toggleKind?: 'bowl' | 'plate' | 'suitcase';
}

export interface StudioStageUpdateOptions {
  pose: CharacterPose;
  toggles: StudioToggleState;
  revealElapsed: number;
  beeTrick: { kind: StudioBeeTrick; progress: number } | null;
}

export interface StudioStageInstance {
  root: THREE.Group;
  ownedMaterials: THREE.Material[];
  ownedTextures: THREE.Texture[];
  mixers: THREE.AnimationMixer[];
  isCustomGlb: boolean;
  floorColor: number;
  ambientColor: number;
  accentColor: number;
  update: (elapsed: number, dt: number, opts: StudioStageUpdateOptions) => void;
}

export const STUDIO_POSES: Array<{ id: CharacterPose; emoji: string; label: string }> = [
  { id: 'wave', emoji: '👋', label: 'Winken' },
  { id: 'cheer', emoji: '🎉', label: 'Jubeln' },
  { id: 'sip_tea', emoji: '🫖', label: 'Teeparty' },
  { id: 'fly_umbrella', emoji: '☂️', label: 'Schirmflug' },
  { id: 'blow_bubbles', emoji: '🫧', label: 'Seifenblasen' },
  { id: 'sit_stargaze', emoji: '✨', label: 'Sternennacht' }
];

export const STUDIO_BEE_TRICKS: Array<{ id: StudioBeeTrick; emoji: string; label: string }> = [
  { id: 'flip', emoji: '🔄', label: 'Purzelbaum' },
  { id: 'spin', emoji: '💃', label: 'Pirouette' },
  { id: 'waggle', emoji: '🐝', label: 'Schwänzeltanz' }
];

const STUDIO_DIZZY_STAR_GEO = (() => {
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.17 : 0.075;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starShape.closePath();
  const geo = new THREE.ExtrudeGeometry(starShape, { depth: 0.032, bevelEnabled: false });
  geo.translate(0, 0, -0.016);
  return geo;
})();

const STUDIO_DIZZY_STAR_COLORS = [0xffe045, 0xfff5a5, 0xffc233, 0xff9ec4];

const STANDING_OBJECT_SPECS: StudioItemSpec[] = [
  {
    id: 'honeypot_higgsfield',
    category: 'objects',
    emoji: '🧪',
    label: 'Honigglas (Higgsfield 3D)',
    description:
      'Aus dem Buch-Scan mit Higgsfield generiertes 3D-Honigglas (.glb) – im Buch-Stil (Cel-Shaded + Bleistift-/Kreide-Kontur) oder Original vergleichbar.',
    defaultRadius: 2.6,
    minRadius: 1.3,
    maxRadius: 5.5,
    targetY: 0.62,
    defaultYaw: 0.3,
    defaultPitch: 0.25,
    pedestalRadius: 1.35
  },
  {
    id: 'honeypot',
    category: 'objects',
    emoji: '🍯',
    label: 'Honigtopf',
    description: 'Schwerer Keramik-Honigtopf mit Stofftuch, Schleife und kleinem Honiglöffel.',
    defaultRadius: 2.8,
    minRadius: 1.5,
    maxRadius: 5.5,
    targetY: 0.55,
    defaultYaw: 0.45,
    defaultPitch: 0.35,
    pedestalRadius: 1.35
  },
  {
    id: 'flower_0',
    category: 'objects',
    emoji: '🌻',
    label: 'Blume – Sonnenblume',
    description: 'Goldgelbe Sonnenblume zum Sammeln für die Bienen.',
    defaultRadius: 2.7,
    minRadius: 1.4,
    maxRadius: 5.2,
    targetY: 0.58,
    defaultYaw: 0.35,
    defaultPitch: 0.32,
    pedestalRadius: 1.25
  },
  {
    id: 'flower_1',
    category: 'objects',
    emoji: '🌸',
    label: 'Blume – Kirschblüte',
    description: 'Rosa Kirschblüte mit goldenem Blütenzentrum.',
    defaultRadius: 2.7,
    minRadius: 1.4,
    maxRadius: 5.2,
    targetY: 0.58,
    defaultYaw: 0.35,
    defaultPitch: 0.32,
    pedestalRadius: 1.25
  },
  {
    id: 'flower_2',
    category: 'objects',
    emoji: '🌼',
    label: 'Blume – Gänseblümchen',
    description: 'Weißes Gänseblümchen auf kleinem grünem Stängel.',
    defaultRadius: 2.7,
    minRadius: 1.4,
    maxRadius: 5.2,
    targetY: 0.58,
    defaultYaw: 0.35,
    defaultPitch: 0.32,
    pedestalRadius: 1.25
  },
  {
    id: 'trapped_bee',
    category: 'objects',
    emoji: '🫧',
    label: 'Gefangene Biene',
    description: 'Kleine Biene in einer schillernden Wachsblase – befreie sie per Berührung!',
    defaultRadius: 2.8,
    minRadius: 1.5,
    maxRadius: 5.5,
    targetY: 0.72,
    defaultYaw: 0.5,
    defaultPitch: 0.28,
    pedestalRadius: 1.3
  },
  {
    id: 'honey_liquid',
    category: 'objects',
    emoji: '💧',
    label: 'Flüssiger Honig',
    description: 'Wabbelnder goldener Honig-Tropfen, der durch Gänge fließt.',
    defaultRadius: 2.8,
    minRadius: 1.5,
    maxRadius: 5.5,
    targetY: 0.72,
    defaultYaw: 0.45,
    defaultPitch: 0.32,
    pedestalRadius: 1.3
  },
  {
    id: 'honey_source',
    category: 'objects',
    emoji: '🫗',
    label: 'Honigquelle',
    description: 'Sechseckige Waben-Zapfstelle, aus der stetig goldener Honig tropft.',
    defaultRadius: 2.9,
    minRadius: 1.5,
    maxRadius: 5.5,
    targetY: 0.72,
    defaultYaw: 0.48,
    defaultPitch: 0.28,
    pedestalRadius: 1.35
  },
  {
    id: 'honey_bowl',
    category: 'objects',
    emoji: '🥣',
    label: 'Honigschale',
    description: 'Messing-Kelch auf Holzsockel – füllt sich mit flüssigem Honig und öffnet das Honig-Tor.',
    defaultRadius: 2.8,
    minRadius: 1.5,
    maxRadius: 5.5,
    targetY: 0.55,
    defaultYaw: 0.45,
    defaultPitch: 0.36,
    pedestalRadius: 1.35,
    toggleKind: 'bowl'
  },
  {
    id: 'honey_gate',
    category: 'objects',
    emoji: '🚧',
    label: 'Honig-Tor',
    description: 'Holztor mit goldenem Honig-Wappen – öffnet sich bei gefüllter Honigschale.',
    defaultRadius: 3.1,
    minRadius: 1.6,
    maxRadius: 6.0,
    targetY: 0.65,
    defaultYaw: 0.45,
    defaultPitch: 0.3,
    pedestalRadius: 1.45
  },
  {
    id: 'pressure_plate',
    category: 'objects',
    emoji: '🌺',
    label: 'Blüten-Druckplatte',
    description: 'Leuchtendes Blütenkissen – wird es von einem Honigtopf beschwert, öffnet das Blüten-Tor.',
    defaultRadius: 2.9,
    minRadius: 1.5,
    maxRadius: 5.5,
    targetY: 0.5,
    defaultYaw: 0.45,
    defaultPitch: 0.4,
    pedestalRadius: 1.4,
    toggleKind: 'plate'
  },
  {
    id: 'petal_gate',
    category: 'objects',
    emoji: '🌷',
    label: 'Blüten-Tor',
    description: 'Cremefarbenes Gatter mit rosa Blüten-Medaillon, gesteuert über Blüten-Druckplatten.',
    defaultRadius: 3.1,
    minRadius: 1.6,
    maxRadius: 6.0,
    targetY: 0.65,
    defaultYaw: 0.45,
    defaultPitch: 0.3,
    pedestalRadius: 1.45
  },
  {
    id: 'portal_0',
    category: 'objects',
    emoji: '🟣',
    label: 'Blüten-Portal (Lila)',
    description: 'Magischer violetter Blütenwirbel, der die Biene zum Partner-Portal zaubert.',
    defaultRadius: 2.9,
    minRadius: 1.5,
    maxRadius: 5.6,
    targetY: 0.72,
    defaultYaw: 0.32,
    defaultPitch: 0.25,
    pedestalRadius: 1.35
  },
  {
    id: 'portal_1',
    category: 'objects',
    emoji: '🩵',
    label: 'Blüten-Portal (Türkis)',
    description: 'Funkelndes türkises Blüten-Portal als zweites Zauber-Paar in größeren Waben.',
    defaultRadius: 2.9,
    minRadius: 1.5,
    maxRadius: 5.6,
    targetY: 0.72,
    defaultYaw: 0.32,
    defaultPitch: 0.25,
    pedestalRadius: 1.35
  },
  {
    id: 'exit',
    category: 'objects',
    emoji: '🧳',
    label: 'Koffer (Spielfeld)',
    description: 'Frau Honigs goldener Reisekoffer – öffnet sich magisch leuchtend als Ziel.',
    defaultRadius: 3.0,
    minRadius: 1.6,
    maxRadius: 5.8,
    targetY: 0.58,
    defaultYaw: 0.52,
    defaultPitch: 0.36,
    pedestalRadius: 1.45,
    toggleKind: 'suitcase'
  },
  {
    id: 'wall',
    category: 'objects',
    emoji: '🧱',
    label: 'Bienenkorb-Wand (eckig)',
    description: 'Geflochtener Bienenkorb-Block im dunklen Holzrahmen.',
    defaultRadius: 3.1,
    minRadius: 1.6,
    maxRadius: 6.0,
    targetY: 0.66,
    defaultYaw: 0.58,
    defaultPitch: 0.34,
    pedestalRadius: 1.45
  },
  {
    id: 'rounded_wall',
    category: 'objects',
    emoji: '🟤',
    label: 'Bienenkorb-Wand (rund)',
    description: 'Abgerundeter Stroh-Bienenkorb, von dem Honigtöpfe seitlich abrollen.',
    defaultRadius: 3.1,
    minRadius: 1.6,
    maxRadius: 6.0,
    targetY: 0.66,
    defaultYaw: 0.52,
    defaultPitch: 0.34,
    pedestalRadius: 1.45
  },
  {
    id: 'wax',
    category: 'objects',
    emoji: '🟨',
    label: 'Waben-Wachs',
    description: 'Weiches goldenes Bienenwachs, durch das sich die Biene hindurchgraben kann.',
    defaultRadius: 3.1,
    minRadius: 1.6,
    maxRadius: 6.0,
    targetY: 0.66,
    defaultYaw: 0.55,
    defaultPitch: 0.34,
    pedestalRadius: 1.45
  },
  {
    id: 'grub',
    category: 'objects',
    emoji: '🐛',
    label: 'Waben-Made',
    description: 'Gemütliche creme-grüne Made, die sich langsam durch weiches Wachs futtert und Blüten vernascht.',
    defaultRadius: 2.5,
    minRadius: 1.2,
    maxRadius: 4.8,
    targetY: 0.45,
    defaultYaw: 0.55,
    defaultPitch: 0.34,
    pedestalRadius: 1.15
  },
  {
    id: 'mite',
    category: 'objects',
    emoji: '🕷️',
    label: 'Honig-Milbe',
    description: 'Flinke kleine Bienen-Milbe mit bernsteinfarbenen Punkten, die durch offene Gänge flitzt.',
    defaultRadius: 2.5,
    minRadius: 1.2,
    maxRadius: 4.8,
    targetY: 0.48,
    defaultYaw: 0.52,
    defaultPitch: 0.36,
    pedestalRadius: 1.15
  },
  {
    id: 'flower_bud',
    category: 'objects',
    emoji: '🌱',
    label: 'Nachwachsende Blüte',
    description: 'Frische Blütenknospe an einer vernaschten Stelle – wächst nach kurzer Zeit wieder zu einer vollen Blüte nach!',
    defaultRadius: 2.5,
    minRadius: 1.2,
    maxRadius: 4.8,
    targetY: 0.52,
    defaultYaw: 0.38,
    defaultPitch: 0.32,
    pedestalRadius: 1.15
  }
];

export const STUDIO_ITEMS: StudioItemSpec[] = [
  {
    id: 'frau_honig',
    category: 'characters',
    emoji: '🎩',
    label: 'Frau Honig',
    description: 'Magische Kinderbuch-Figur mit Blütenhut, grünem Schal, Honigmantel und Ringelstrümpfen.',
    defaultRadius: 3.4,
    minRadius: 1.6,
    maxRadius: 6.5,
    targetY: 0.85,
    defaultYaw: 0.38,
    defaultPitch: 0.25,
    pedestalRadius: 1.45,
    characterKey: 'frau_honig'
  },
  {
    id: 'frau_honig_higgsfield',
    category: 'characters',
    emoji: '✨',
    label: 'Frau Honig (Higgsfield 3D)',
    description:
      'Aus dem orthographischen 3-Ansichten-Turnaround mit Higgsfield erzeugte und geriggte 3D-Frau-Honig (.glb) zum direkten Vergleich.',
    defaultRadius: 3.4,
    minRadius: 1.6,
    maxRadius: 6.5,
    targetY: 0.85,
    defaultYaw: 0.38,
    defaultPitch: 0.25,
    pedestalRadius: 1.45,
    characterKey: 'frau_honig',
    customCharacterAssetKey: 'frau_honig_higgsfield'
  },
  {
    id: 'child_girl',
    category: 'characters',
    emoji: '👧',
    label: 'Kind (Mädchen)',
    description: 'Abenteuerlustiges Kind mit hüpfenden Zöpfen und frühlingsgrünem Mantel.',
    defaultRadius: 3.1,
    minRadius: 1.5,
    maxRadius: 6.0,
    targetY: 0.72,
    defaultYaw: 0.38,
    defaultPitch: 0.25,
    pedestalRadius: 1.35,
    characterKey: 'child_girl'
  },
  {
    id: 'child_boy',
    category: 'characters',
    emoji: '👦',
    label: 'Kind (Junge)',
    description: 'Freundlicher kleiner Entdecker in Latzhose und warmem Honigpullover.',
    defaultRadius: 3.1,
    minRadius: 1.5,
    maxRadius: 6.0,
    targetY: 0.72,
    defaultYaw: 0.38,
    defaultPitch: 0.25,
    pedestalRadius: 1.35,
    characterKey: 'child_boy'
  },
  {
    id: 'alberta',
    category: 'characters',
    emoji: '🥽',
    label: 'Alberta (Erfinderin)',
    description: 'Schlaue kleine Tüftlerin aus der Frau-Honig-Welt mit großer Messing-Fliegerbrille und Latzhose.',
    defaultRadius: 3.1,
    minRadius: 1.5,
    maxRadius: 6.0,
    targetY: 0.72,
    defaultYaw: 0.38,
    defaultPitch: 0.25,
    pedestalRadius: 1.35,
    characterKey: 'alberta'
  },
  {
    id: 'alberta_higgsfield',
    category: 'characters',
    emoji: '✨',
    label: 'Alberta (Higgsfield 3D)',
    description:
      'Aus dem orthographischen 3-Ansichten-Turnaround mit Higgsfield erzeugte und geriggte 3D-Alberta (.glb) zum direkten Vergleich.',
    defaultRadius: 3.1,
    minRadius: 1.5,
    maxRadius: 6.0,
    targetY: 0.72,
    defaultYaw: 0.38,
    defaultPitch: 0.25,
    pedestalRadius: 1.35,
    characterKey: 'alberta',
    customCharacterAssetKey: 'alberta_higgsfield'
  },
  {
    id: 'bee',
    category: 'characters',
    emoji: '🐝',
    label: 'Spieler-Biene',
    description: 'Unsere pummelige Heldin – teste ihren Purzelbaum, die Pirouette, den Schwänzeltanz und Honigkleber!',
    defaultRadius: 2.8,
    minRadius: 1.4,
    maxRadius: 5.5,
    targetY: 0.78,
    defaultYaw: 0.55,
    defaultPitch: 0.3,
    pedestalRadius: 1.3,
    isBee: true
  },
  {
    id: 'bee_higgsfield_multiview',
    category: 'characters',
    emoji: '🎨',
    label: 'Biene (Seedream Multiview)',
    description:
      'Allererste Multiview-Seedream-Biene (.glb) mit ursprünglicher Tripo-Textur und 4-Knochen-Flügelskelett zum Vergleich.',
    defaultRadius: 2.7,
    minRadius: 1.4,
    maxRadius: 5.5,
    targetY: 0.78,
    defaultYaw: 0.45,
    defaultPitch: 0.28,
    pedestalRadius: 1.3,
    isBee: true
  },
  {
    id: 'bee_higgsfield_multiview_stripes',
    category: 'characters',
    emoji: '🦓',
    label: 'Biene (Multiview – Streifen)',
    description:
      'Multiview-Seedream-Biene (.glb), bei der die 6 erhabenen 3D-Streifen-Drähte separiert, kopiert und nach innen in die 3 Streifen versetzt wurden.',
    defaultRadius: 2.7,
    minRadius: 1.4,
    maxRadius: 5.5,
    targetY: 0.78,
    defaultYaw: 0.45,
    defaultPitch: 0.28,
    pedestalRadius: 1.3,
    isBee: true
  },
  {
    id: 'bee_higgsfield',
    category: 'characters',
    emoji: '🧪',
    label: 'Biene (Seedream Original)',
    description:
      'Originale 3/4-Seedream-Biene (.glb) mit 4-Knochen-Flügelskelett zum direkten Vergleich.',
    defaultRadius: 2.7,
    minRadius: 1.4,
    maxRadius: 5.5,
    targetY: 0.78,
    defaultYaw: 0.45,
    defaultPitch: 0.28,
    pedestalRadius: 1.3,
    isBee: true
  },
  {
    id: 'bee_higgsfield_v2',
    category: 'characters',
    emoji: '✨',
    label: 'Biene (Seedream – korrigiert)',
    description:
      'Reparierte Seedream-Biene (.glb): Flügel seitlich & symmetrisch ausgerichtet, flacher gedreht, ohne Rücken-Zipfel und mit rundem Frau-Honig-Hinterteil.',
    defaultRadius: 2.7,
    minRadius: 1.4,
    maxRadius: 5.5,
    targetY: 0.78,
    defaultYaw: 0.45,
    defaultPitch: 0.28,
    pedestalRadius: 1.3,
    isBee: true
  },
  ...SUITCASE_SCENES.map((sceneDef, idx) => ({
    id: `scene_${sceneDef.id}`,
    category: 'scenes' as const,
    emoji: sceneDef.emoji,
    label: sceneDef.title,
    description: sceneDef.caption,
    defaultRadius: 6.4,
    minRadius: 2.6,
    maxRadius: 11.5,
    targetY: 0.95,
    defaultYaw: 0.42,
    defaultPitch: 0.32,
    pedestalRadius: 3.3,
    sceneIndex: idx
  })),
  ...STANDING_OBJECT_SPECS
];

function hasCustomModelAncestor(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData?.isCustomModel) return true;
    cur = cur.parent;
  }
  return false;
}

function collectDisposableMaterials(obj: THREE.Object3D, out: THREE.Material[]): void {
  obj.traverse((child) => {
    const mats = child.userData?.disposableMaterials as THREE.Material[] | undefined;
    if (Array.isArray(mats)) {
      out.push(...mats);
    }
  });
}

function liftStandingObjectToPedestal(obj: THREE.Object3D, clearanceY = 0.02): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (Number.isFinite(box.min.y)) {
    obj.position.y += clearanceY - box.min.y;
  }
}

export function buildStudioStageItem(
  item: StudioItemSpec,
  assets: AssetFactory
): StudioStageInstance {
  const root = new THREE.Group();
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [];
  const mixers: THREE.AnimationMixer[] = [];

  if (item.characterKey) {
    const ch = createStageCharacter(assets, item.characterKey, item.customCharacterAssetKey);
    ch.root.scale.setScalar(1.45);
    ownedMaterials.push(...ch.ownedMaterials);
    if (ch.mixer) mixers.push(ch.mixer);
    root.add(ch.root);

    return {
      root,
      ownedMaterials,
      ownedTextures,
      mixers,
      isCustomGlb: ch.isCustomGlb,
      floorColor: 0xdfb97a,
      ambientColor: 0xfff3d4,
      accentColor: 0xffd07a,
      update: (elapsed, dt, opts) => {
        // createStageCharacter.update advances ch.mixer internally.
        ch.update(elapsed, dt, opts.pose);
      }
    };
  }

  if (item.isBee) {
    const bee =
      item.id === 'bee_higgsfield_multiview'
        ? assets.createCustomModel('bee_higgsfield_multiview') ?? assets.createBee()
        : item.id === 'bee_higgsfield_multiview_stripes'
          ? assets.createCustomModel('bee_higgsfield_multiview_stripes') ?? assets.createBee()
          : item.id === 'bee_higgsfield'
            ? assets.createCustomModel('bee_higgsfield') ?? assets.createBee()
            : item.id === 'bee_higgsfield_v2'
              ? assets.createCustomModel('bee_higgsfield_v2') ?? assets.createBee()
              : assets.createBee();
    bee.scale.setScalar(1.45);
    bee.position.set(0, 0.78, 0);
    const isCustomGlb = hasCustomModelAncestor(bee);
    attachBeeStickyGroup(bee, isCustomGlb ? 'custom' : 'procedural');
    root.add(bee);

    // 14 trailing 3D stars + 3 orbiting halo stars shown during dizzy stun mode
    const dizzyStarGroup = new THREE.Group();
    dizzyStarGroup.visible = false;
    const trailStars: THREE.Mesh[] = [];
    const trailBaseOpacity: number[] = [];
    for (let i = 0; i < 14; i++) {
      const baseOp = 0.98 - (i / 13) * 0.7;
      const mat = new THREE.MeshBasicMaterial({
        color: STUDIO_DIZZY_STAR_COLORS[i % STUDIO_DIZZY_STAR_COLORS.length],
        transparent: true,
        opacity: baseOp
      });
      ownedMaterials.push(mat);
      const st = new THREE.Mesh(STUDIO_DIZZY_STAR_GEO, mat);
      st.userData.sharedGeo = true;
      dizzyStarGroup.add(st);
      trailStars.push(st);
      trailBaseOpacity.push(baseOp);
    }

    const haloStars: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: STUDIO_DIZZY_STAR_COLORS[i % STUDIO_DIZZY_STAR_COLORS.length],
        transparent: true,
        opacity: 0.95
      });
      ownedMaterials.push(mat);
      const st = new THREE.Mesh(STUDIO_DIZZY_STAR_GEO, mat);
      st.userData.sharedGeo = true;
      dizzyStarGroup.add(st);
      haloStars.push(st);
    }
    root.add(dizzyStarGroup);

    let wingPhase = 0;

    return {
      root,
      ownedMaterials,
      ownedTextures,
      mixers,
      isCustomGlb,
      floorColor: 0xdfb97a,
      ambientColor: 0xfff4d9,
      accentColor: 0xffd56e,
      update: (elapsed, dt, opts) => {
        const isSticky = opts.toggles.sticky;
        const isDizzy = opts.toggles.dizzy;
        const trick = opts.beeTrick;
        const p = trick ? THREE.MathUtils.clamp(trick.progress, 0, 1) : 0;
        const ease = p * p * (3 - 2 * p);

        let posX = 0;
        let posY = 0.78 + Math.sin(elapsed * 3.4) * 0.05;
        let posZ = 0;
        let rotX = 0.08;
        let rotY = 0;
        let rotZ = 0;
        let scaleY = 1.45;
        let scaleXZ = 1.45;

        if (isDizzy) {
          const w = 2.65;
          const phase = elapsed * w;
          posX = Math.sin(phase) * 0.62;
          posZ = Math.sin(phase * 2) * 0.34;
          posY = 0.92 + Math.cos(phase * 2) * 0.11;
          rotY = Math.atan2(Math.cos(phase) * 0.62 * w, Math.cos(phase * 2) * 0.68 * w);
          rotX = 0.14;
          rotZ = Math.sin(phase * 3) * 0.34;

          dizzyStarGroup.visible = true;
          trailStars.forEach((st, idx) => {
            const lagPhase = Math.max(0, elapsed - (idx + 1) * 0.105) * w;
            const wobble = Math.sin(idx * 1.9 + elapsed * 3) * 0.04;
            st.position.set(
              Math.sin(lagPhase) * 0.62 + wobble,
              0.92 + Math.cos(lagPhase * 2) * 0.11 + idx * 0.022,
              Math.sin(lagPhase * 2) * 0.34 + wobble * 0.7
            );
            st.rotation.y = elapsed * 2.5 + idx;
            st.rotation.z = elapsed * 4.0 + idx * 0.9;
            const s = (1.15 - (idx / 13) * 0.77) * (0.9 + Math.sin(elapsed * 5 + idx) * 0.14);
            st.scale.setScalar(Math.max(0.3, s));
            (st.material as THREE.MeshBasicMaterial).opacity = trailBaseOpacity[idx];
          });

          const haloY = posY + 0.62;
          haloStars.forEach((st, idx) => {
            const a = elapsed * 3.6 + (idx * Math.PI * 2) / 3;
            st.position.set(
              posX + Math.cos(a) * 0.36,
              haloY + Math.sin(a * 2) * 0.04,
              posZ + Math.sin(a) * 0.36
            );
            st.rotation.y = -a;
            st.rotation.z = elapsed * 3.2 + idx;
            st.scale.setScalar(0.88 + Math.sin(elapsed * 6 + idx) * 0.12);
          });
        } else {
          dizzyStarGroup.visible = false;
        }

        if (trick) {
          if (trick.kind === 'flip') {
            posY += Math.sin(p * Math.PI) * 0.25;
            rotX += ease * Math.PI * 2;
          } else if (trick.kind === 'spin') {
            posY += Math.sin(p * Math.PI) * 0.22;
            rotY += ease * Math.PI * 4;
            rotZ = Math.sin(p * Math.PI * 4) * 0.2;
          } else if (trick.kind === 'waggle') {
            const hop = Math.abs(Math.sin(p * Math.PI * 2));
            posX = Math.sin(p * Math.PI * 4) * 0.18;
            posY += hop * 0.22;
            const stretch = 1 + (hop - 0.35) * 0.18;
            scaleY = 1.45 * stretch;
            scaleXZ = 1.45 / Math.sqrt(stretch);
            rotZ = Math.sin(p * Math.PI * 8) * 0.28;
          }
        }

        bee.position.set(posX, posY, posZ);
        bee.rotation.set(rotX, rotY, rotZ);
        bee.scale.set(scaleXZ, scaleY, scaleXZ);

        const baseWingSpeed = isDizzy ? 38 : trick ? 52 : 22;
        wingPhase += dt * (isSticky ? baseWingSpeed * 0.62 : baseWingSpeed);
        const wingAmp = isDizzy ? 0.44 : trick ? 0.56 : 0.44;
        const { leftWing, rightWing, stickyGroup } = bee.userData as {
          leftWing?: THREE.Object3D;
          rightWing?: THREE.Object3D;
          stickyGroup?: THREE.Group;
        };
        const flap = Math.sin(wingPhase) * wingAmp;
        if (leftWing) leftWing.rotation.z = 0.25 + flap;
        if (rightWing) rightWing.rotation.z = -0.25 - flap;

        const boneWingL = bee.getObjectByName('WingL');
        const boneWingR = bee.getObjectByName('WingR');
        if (boneWingL) boneWingL.rotation.z = flap;
        if (boneWingR) boneWingR.rotation.z = -flap;

        if (stickyGroup) {
          stickyGroup.visible = isSticky;
          if (isSticky) {
            for (const child of stickyGroup.children) {
              const { baseY, baseScale, phase } = child.userData as {
                baseY?: number;
                baseScale?: [number, number, number];
                phase?: number;
              };
              if (baseY !== undefined && baseScale && phase !== undefined) {
                const pulse = 1 + Math.sin(elapsed * 4.2 + phase) * 0.14;
                child.position.y = baseY + Math.sin(elapsed * 2.5 + phase) * 0.015;
                child.scale.set(
                  baseScale[0] * pulse,
                  baseScale[1] / Math.sqrt(pulse),
                  baseScale[2] * pulse
                );
              }
            }
          }
        }
      }
    };
  }

  if (item.sceneIndex !== undefined) {
    const sceneDef = SUITCASE_SCENES[item.sceneIndex] ?? SUITCASE_SCENES[0];
    const runtime = sceneDef.build(assets);
    ownedMaterials.push(...runtime.ownedMaterials);
    ownedTextures.push(...(runtime.ownedTextures ?? []));
    mixers.push(...(runtime.mixers ?? []));
    root.add(runtime.root);

    return {
      root,
      ownedMaterials,
      ownedTextures,
      mixers,
      isCustomGlb: false,
      floorColor: runtime.trayFloorColor,
      ambientColor: runtime.ambientLightColor,
      accentColor: runtime.accentLightColor,
      update: (elapsed, dt, opts) => {
        const revealProgress = THREE.MathUtils.clamp(opts.revealElapsed / 1.15, 0.02, 1);
        const popScale =
          revealProgress < 1
            ? THREE.MathUtils.lerp(0.15, 1, 1 - Math.pow(1 - revealProgress, 3))
            : 1;
        runtime.root.scale.setScalar(popScale);
        runtime.update(elapsed, dt, revealProgress);
      }
    };
  }

  // Gameplay tile objects
  let obj: THREE.Group | null = null;
  let standing = true;

  switch (item.id) {
    case 'honeypot_higgsfield':
      obj =
        assets.createCustomModel('honeypot_higgsfield') ??
        assets.createTileObject('honeypot');
      break;
    case 'honeypot':
      obj = assets.createTileObject('honeypot');
      break;
    case 'flower_0':
      obj = assets.createTileObject('flower', 0);
      break;
    case 'flower_1':
      obj = assets.createTileObject('flower', 1);
      break;
    case 'flower_2':
      obj = assets.createTileObject('flower', 2);
      break;
    case 'trapped_bee':
      obj = assets.createTileObject('trapped_bee');
      standing = false;
      break;
    case 'honey_liquid':
      obj = assets.createTileObject('honey_liquid');
      standing = false;
      break;
    case 'honey_source':
      obj = assets.createTileObject('honey_source');
      standing = false;
      break;
    case 'honey_bowl':
      obj = assets.createTileObject('honey_bowl');
      break;
    case 'honey_gate':
      obj = assets.createTileObject('honey_gate');
      break;
    case 'pressure_plate':
      obj = assets.createPressurePlate();
      break;
    case 'petal_gate':
      obj = assets.createTileObject('petal_gate');
      break;
    case 'portal_0':
      obj = assets.createPortal(0);
      standing = false;
      break;
    case 'portal_1':
      obj = assets.createPortal(1);
      standing = false;
      break;
    case 'exit':
      obj = assets.createTileObject('exit');
      break;
    case 'wall':
      obj = assets.createTileObject('wall');
      break;
    case 'rounded_wall':
      obj = assets.createTileObject('rounded_wall');
      break;
    case 'wax':
      obj = assets.createTileObject('wax', 0);
      break;
    case 'grub':
      obj = assets.createPest('grub');
      break;
    case 'mite':
      obj = assets.createPest('mite');
      break;
    case 'flower_bud':
      obj = assets.createFlowerBud(1);
      break;
    default:
      obj = assets.createTileObject('honeypot');
      break;
  }

  if (!obj) {
    obj = new THREE.Group();
  }

  // Portals offset z = -0.22 for board wall mounting; center cleanly for turntable inspection.
  if (item.id === 'portal_0' || item.id === 'portal_1') {
    obj.position.z = 0;
  }

  obj.scale.multiplyScalar(1.3);
  if (standing) {
    liftStandingObjectToPedestal(obj, 0.02);
  } else {
    obj.position.y = 0.72;
  }

  collectDisposableMaterials(obj, ownedMaterials);
  root.add(obj);

  const isCustomGlb = hasCustomModelAncestor(obj);
  const targetObj = obj;

  return {
    root,
    ownedMaterials,
    ownedTextures,
    mixers,
    isCustomGlb,
    floorColor: 0xdfb97a,
    ambientColor: 0xfff3d4,
    accentColor: 0xffd07a,
    update: (elapsed, dt, opts) => {
      if (item.id.startsWith('flower_')) {
        targetObj.rotation.z = Math.sin(elapsed * 2.1) * 0.06;
        return;
      }

      if (item.id === 'trapped_bee') {
        targetObj.position.y = 0.72 + Math.sin(elapsed * 2.8) * 0.05;
        const { miniBee } = targetObj.userData as { miniBee?: THREE.Object3D };
        if (miniBee) {
          miniBee.rotation.y = Math.sin(elapsed * 2.4) * 0.45;
          const { leftWing, rightWing } = miniBee.userData as {
            leftWing?: THREE.Object3D;
            rightWing?: THREE.Object3D;
          };
          const flap = Math.sin(elapsed * 30) * 0.35;
          if (leftWing) leftWing.rotation.z = 0.2 + flap;
          if (rightWing) rightWing.rotation.z = -0.2 - flap;
        }
        return;
      }

      if (item.id === 'honey_liquid') {
        const { blobs } = targetObj.userData as { blobs?: THREE.Mesh[] };
        if (blobs) {
          for (const blob of blobs) {
            const m = blob.userData.motion as HoneyBlobMotion | undefined;
            if (!m) continue;
            const bx = Math.sin(elapsed * m.freqX + m.phaseX) * m.orbitX;
            const by = Math.cos(elapsed * m.freqY + m.phaseY) * m.orbitY;
            const bz = m.baseZ + Math.sin(elapsed * m.freqZ + m.phaseX) * 0.03;
            const stretch = 1 + Math.sin(elapsed * m.pulseFreq + m.phaseP) * 0.1;
            blob.position.set(bx, by, bz);
            blob.scale.set(m.rx * stretch, m.ry / Math.sqrt(stretch), m.rz);
          }
        }
        return;
      }

      if (item.id === 'honey_source') {
        const { hangingDrop, hangingBubbler, dripNeck } = targetObj.userData as {
          hangingDrop?: THREE.Object3D;
          hangingBubbler?: THREE.Object3D;
          dripNeck?: THREE.Object3D;
        };
        if (hangingDrop) {
          const cycle = (elapsed * 0.68) % 1;
          const stretch = Math.pow(cycle, 1.35);
          const dropRadius = THREE.MathUtils.lerp(0.08, 0.175, stretch);
          const dropY = THREE.MathUtils.lerp(-0.34, -0.52, stretch);
          const sway = Math.sin(elapsed * 8.5);
          const breathe = Math.sin(elapsed * 6.0);

          hangingDrop.position.set(sway * 0.032 * stretch, dropY, 0.01);
          hangingDrop.rotation.z = -sway * 0.18 * stretch;
          hangingDrop.scale.set(
            dropRadius * (0.94 + breathe * 0.14),
            dropRadius * (1.18 - breathe * 0.14),
            dropRadius * 0.94
          );

          const spoutY = -0.28;
          const dropTopY = dropY + dropRadius * 0.65;
          if (dripNeck) {
            const neckLen = Math.max(0.04, spoutY - dropTopY);
            dripNeck.visible = spoutY > dropTopY + 0.01;
            dripNeck.position.set(hangingDrop.position.x * 0.45, (spoutY + dropTopY) * 0.5, 0);
            dripNeck.rotation.z = Math.atan2(
              hangingDrop.position.x,
              Math.max(0.1, spoutY - dropTopY)
            );
            const neckThickness =
              THREE.MathUtils.lerp(1.15, 0.62, stretch) * (1 + breathe * 0.12);
            dripNeck.scale.set(neckThickness, neckLen, neckThickness);
          }

          if (hangingBubbler) {
            hangingBubbler.visible = true;
            const bubR = dropRadius * (0.56 + 0.18 * Math.sin(elapsed * 7.4 + 1.2));
            hangingBubbler.position.set(
              hangingDrop.position.x + Math.cos(elapsed * 4.6) * dropRadius * 0.72,
              dropY + 0.04 + Math.sin(elapsed * 5.4) * dropRadius * 0.48,
              0.05
            );
            hangingBubbler.scale.set(bubR * 1.08, bubR * 0.94, bubR);
          }
        }
        return;
      }

      if (item.id === 'honey_bowl') {
        const { fillGroup, fillBlobs } = targetObj.userData as {
          fillGroup?: THREE.Group;
          fillBlobs?: THREE.Mesh[];
        };
        if (fillGroup) {
          if (opts.toggles.bowlFilled) {
            fillGroup.visible = true;
            const s = THREE.MathUtils.lerp(fillGroup.scale.x, 1, Math.min(1, dt * 8));
            fillGroup.scale.setScalar(s);
            if (fillBlobs) {
              for (let i = 0; i < fillBlobs.length; i++) {
                const b = fillBlobs[i];
                const wave = elapsed * (1.8 + i * 0.45) + i * 2.1;
                const bx = (i === 0 ? -0.11 : 0.12) + Math.sin(wave) * 0.04;
                const bz = (i === 0 ? 0.06 : -0.05) + Math.cos(wave * 1.1) * 0.04;
                const p = 1 + Math.sin(wave * 1.4) * 0.14;
                b.position.set(bx, 0.05, bz);
                b.scale.set(0.13 * p, 0.09 / Math.sqrt(p), 0.13 * p);
              }
            }
          } else {
            const s = THREE.MathUtils.lerp(fillGroup.scale.x, 0.01, Math.min(1, dt * 10));
            fillGroup.scale.setScalar(s);
            fillGroup.visible = s > 0.03;
          }
        }
        return;
      }

      if (item.id === 'honey_gate' || item.id === 'petal_gate') {
        const { crestMesh } = targetObj.userData as { crestMesh?: THREE.Object3D };
        if (crestMesh) {
          const p = 1 + Math.sin(elapsed * 2.8) * 0.06;
          crestMesh.scale.setScalar(p);
        }
        return;
      }

      if (item.id === 'pressure_plate') {
        const { padGroup, glowMat } = targetObj.userData as {
          padGroup?: THREE.Group;
          glowMat?: THREE.MeshStandardMaterial;
        };
        const pressed = opts.toggles.platePressed;
        if (padGroup) {
          const targetY = pressed ? -0.425 : -0.37;
          padGroup.position.y = THREE.MathUtils.lerp(
            padGroup.position.y,
            targetY,
            Math.min(1, dt * 14)
          );
        }
        if (glowMat) {
          const targetEmissive = pressed
            ? 0.72 + Math.sin(elapsed * 5) * 0.14
            : 0.2 + Math.sin(elapsed * 2.4) * 0.08;
          glowMat.emissiveIntensity = THREE.MathUtils.lerp(
            glowMat.emissiveIntensity,
            targetEmissive,
            Math.min(1, dt * 12)
          );
        }
        return;
      }

      if (item.id === 'portal_0' || item.id === 'portal_1') {
        const { swirlGroup, coreRing, glowMat } = targetObj.userData as {
          swirlGroup?: THREE.Group;
          coreRing?: THREE.Object3D;
          glowMat?: THREE.MeshStandardMaterial;
        };
        if (swirlGroup) {
          swirlGroup.rotation.z = elapsed * (item.id === 'portal_0' ? 2.4 : -2.6);
        }
        if (coreRing) {
          coreRing.scale.setScalar(1 + Math.sin(elapsed * 3.4) * 0.08);
        }
        if (glowMat) {
          glowMat.emissiveIntensity = 0.4 + Math.sin(elapsed * 3) * 0.15;
        }
        return;
      }

      if (item.id === 'exit') {
        const {
          lidGroup,
          amberBedMat,
          amberHazeMat,
          amberLight,
          sparkleGroup
        } = targetObj.userData as {
          lidGroup?: THREE.Object3D;
          amberBedMat?: THREE.MeshStandardMaterial;
          amberHazeMat?: THREE.MeshBasicMaterial;
          amberLight?: THREE.PointLight;
          sparkleGroup?: THREE.Group;
        };
        const open = opts.toggles.suitcaseOpen;
        const blend = Math.min(1, dt * 8);
        const shimmer = 0.5 + 0.5 * Math.sin(elapsed * 4.2);

        if (lidGroup) {
          lidGroup.rotation.x = THREE.MathUtils.lerp(
            lidGroup.rotation.x,
            open ? -1.55 : 0,
            blend
          );
        }
        if (amberBedMat) {
          amberBedMat.emissiveIntensity = THREE.MathUtils.lerp(
            amberBedMat.emissiveIntensity,
            open ? 1.55 + shimmer * 0.35 : 0,
            blend
          );
        }
        if (amberHazeMat) {
          amberHazeMat.opacity = THREE.MathUtils.lerp(
            amberHazeMat.opacity,
            open ? 0.36 + shimmer * 0.18 : 0,
            blend
          );
        }
        if (amberLight) {
          amberLight.intensity = THREE.MathUtils.lerp(
            amberLight.intensity,
            open ? 2.1 + shimmer * 0.7 : 0,
            blend
          );
        }
        if (sparkleGroup) {
          sparkleGroup.visible = open;
          if (open) {
            for (const child of sparkleGroup.children) {
              const { baseX, baseZ, phase, speed, mat } = child.userData as {
                baseX: number;
                baseZ: number;
                phase: number;
                speed: number;
                mat: THREE.MeshBasicMaterial;
              };
              const cycle = (elapsed * speed + phase) % 1;
              child.position.set(
                baseX + Math.sin(elapsed * 3.1 + phase) * 0.04,
                0.02 + cycle * 0.38,
                baseZ
              );
              child.rotation.y += dt * 4;
              child.rotation.z += dt * 3;
              const twinkle = Math.sin(cycle * Math.PI);
              mat.opacity = 0.2 + twinkle * 0.75;
              child.scale.setScalar(0.65 + twinkle * 0.55);
            }
          }
        }
        return;
      }

      if (item.id === 'grub') {
        const { segments, headGroup } = targetObj.userData as {
          segments?: THREE.Group[];
          headGroup?: THREE.Group;
        };
        if (segments) {
          segments.forEach((seg, idx) => {
            const ph = elapsed * 5.2 + idx * 1.15;
            seg.position.y = -0.02 + Math.max(0, Math.sin(ph)) * 0.045;
            const squish = 1 + Math.sin(ph) * 0.1;
            seg.scale.set(squish, 1 / Math.sqrt(squish), squish);
          });
        }
        if (headGroup) {
          headGroup.position.y = 0.02 + Math.sin(elapsed * 5.2) * 0.03;
          headGroup.rotation.z = Math.sin(elapsed * 3.6) * 0.12;
        }
        return;
      }

      if (item.id === 'mite') {
        const { bodyGroup, leftLegs, rightLegs, antennae } = targetObj.userData as {
          bodyGroup?: THREE.Group;
          leftLegs?: THREE.Group[];
          rightLegs?: THREE.Group[];
          antennae?: THREE.Object3D[];
        };
        if (bodyGroup) {
          bodyGroup.position.y = 0.03 + Math.abs(Math.sin(elapsed * 8.5)) * 0.035;
          bodyGroup.rotation.z = Math.sin(elapsed * 7.5) * 0.07;
        }
        if (leftLegs && rightLegs) {
          leftLegs.forEach((leg, i) => {
            const ph = elapsed * 16 + i * 2.1;
            leg.rotation.y = Math.sin(ph) * 0.38;
            leg.rotation.x = Math.cos(ph) * 0.22;
          });
          rightLegs.forEach((leg, i) => {
            const ph = elapsed * 16 + i * 2.1 + Math.PI;
            leg.rotation.y = Math.sin(ph) * 0.38;
            leg.rotation.x = Math.cos(ph) * 0.22;
          });
        }
        if (antennae) {
          antennae.forEach((ant, i) => {
            ant.rotation.x = 0.55 + Math.sin(elapsed * 6.5 + i * 1.4) * 0.2;
          });
        }
        return;
      }

      if (item.id === 'flower_bud') {
        const cycle = (elapsed * 0.32) % 1;
        const grow = 0.5 + 0.5 * Math.sin(cycle * Math.PI * 2 - Math.PI / 2);
        const s = THREE.MathUtils.lerp(0.65, 1.42, grow);
        targetObj.scale.setScalar(s);
        targetObj.rotation.z = Math.sin(elapsed * 2.2) * 0.08;
      }
    }
  };
}

export function disposeStudioInstance(instance: StudioStageInstance): void {
  for (const mixer of instance.mixers) {
    mixer.stopAllAction();
  }

  const disposedGeos = new Set<THREE.BufferGeometry>();
  instance.root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (
      mesh.isMesh &&
      mesh.geometry &&
      !disposedGeos.has(mesh.geometry) &&
      !obj.userData?.sharedGeo &&
      !hasCustomModelAncestor(obj)
    ) {
      disposedGeos.add(mesh.geometry);
      mesh.geometry.dispose();
    }
  });

  const disposedMats = new Set<THREE.Material>();
  for (const mat of instance.ownedMaterials) {
    if (!disposedMats.has(mat)) {
      disposedMats.add(mat);
      mat.dispose();
    }
  }

  const disposedTexs = new Set<THREE.Texture>();
  for (const tex of instance.ownedTextures) {
    if (!disposedTexs.has(tex)) {
      disposedTexs.add(tex);
      tex.dispose();
    }
  }
}
