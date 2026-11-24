import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PestKind, TileType } from '../game/types';
import {
  createBeeModel,
  createFlowerBudModel,
  createFlowerModel,
  createGrubModel,
  createHoneyBowlModel,
  createHoneyGateModel,
  createHoneyPotModel,
  createHoneySourceModel,
  createLiquidHoneyModel,
  createMiteModel,
  createPetalGateModel,
  createPortalModel,
  createPressurePlateModel,
  createSuitcaseModel,
  createTrappedBeeModel,
  createWallModel,
  createWaxModel
} from './proceduralModels';

export type ModelKey =
  | 'bee'
  | 'bee_higgsfield_multiview'
  | 'bee_higgsfield'
  | 'bee_higgsfield_v2'
  | 'honeypot'
  | 'honeypot_higgsfield'
  | 'flower'
  | 'trapped_bee'
  | 'suitcase'
  | 'wax'
  | 'wall'
  | 'rounded_wall'
  | 'honey_source';

interface AssetManifest {
  models?: Partial<Record<ModelKey, string>>;
  characters?: Record<string, string>;
  audio?: Record<string, string>;
}

export class AssetFactory {
  private loader = new GLTFLoader();
  private customModels = new Map<ModelKey, THREE.Object3D>();
  private characterModels = new Map<
    string,
    { scene: THREE.Group; animations: THREE.AnimationClip[] }
  >();
  private manifestAudio: Record<string, string> = {};

  async init(): Promise<void> {
    try {
      const response = await fetch('assets/manifest.json', { cache: 'no-cache' });
      if (!response.ok) return;
      const manifest = (await response.json()) as AssetManifest;
      this.manifestAudio = manifest.audio ?? {};

      const entries = Object.entries(manifest.models ?? {}) as Array<[ModelKey, string]>;
      const charEntries = Object.entries(manifest.characters ?? {}) as Array<[string, string]>;
      await Promise.all([
        ...entries.map(async ([key, url]) => {
          if (!url) return;
          try {
            const gltf = await this.loader.loadAsync(url);
            const normalized = this.normalizeLoadedModel(gltf.scene);
            this.customModels.set(key, normalized);
          } catch (err) {
            console.warn(
              `Konnte 3D-Modell "${key}" (${url}) nicht laden, nutze Standardmodell.`,
              err
            );
          }
        }),
        ...charEntries.map(async ([key, url]) => {
          if (!url) return;
          try {
            const gltf = await this.loader.loadAsync(url);
            const normalized = this.normalizeCharacterModel(gltf.scene);
            normalized.traverse((child) => {
              child.userData.isCustomModel = true;
            });
            this.characterModels.set(key, {
              scene: normalized,
              animations: gltf.animations ?? []
            });
          } catch (err) {
            console.warn(`Konnte Charakter-Modell "${key}" (${url}) nicht laden.`, err);
          }
        })
      ]);
    } catch {
      // Fallback seamlessly to built-in procedural 3D models
    }
  }

  getAudioManifest(): Record<string, string> {
    return { ...this.manifestAudio };
  }

  createCharacterModel(
    key: string
  ): { object: THREE.Group; animations: THREE.AnimationClip[] } | null {
    const entry = this.characterModels.get(key);
    if (!entry) return null;
    const cloned = SkeletonUtils.clone(entry.scene);
    const group = cloned instanceof THREE.Group ? cloned : new THREE.Group().add(cloned);
    group.traverse((child) => {
      child.userData.isCustomModel = true;
    });
    return {
      object: group,
      animations: entry.animations
    };
  }

  private normalizeLoadedModel(model: THREE.Object3D): THREE.Group {
    const wrapper = new THREE.Group();
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 0.88 / maxDim;

    model.scale.multiplyScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    wrapper.add(model);
    return wrapper;
  }

  private normalizeCharacterModel(model: THREE.Object3D): THREE.Group {
    const wrapper = new THREE.Group();
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const scale = 1.0 / Math.max(size.y, 0.001);
    model.scale.multiplyScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    wrapper.add(model);
    return wrapper;
  }

  createCustomModel(key: ModelKey): THREE.Group | null {
    const custom = this.customModels.get(key);
    if (!custom) return null;
    const clone = SkeletonUtils.clone(custom);
    const group = clone instanceof THREE.Group ? clone : new THREE.Group().add(clone);
    group.userData.isCustomModel = true;
    return group;
  }

  createBee(): THREE.Group {
    const custom = this.customModels.get('bee');
    if (custom) {
      const clone = custom.clone(true);
      const group = clone instanceof THREE.Group ? clone : new THREE.Group().add(clone);
      group.userData.isCustomModel = true;
      return group;
    }
    return createBeeModel(1);
  }

  createRescuedBee(): THREE.Group {
    const custom = this.customModels.get('bee');
    if (custom) {
      const clone = custom.clone(true);
      const group = clone instanceof THREE.Group ? clone : new THREE.Group().add(clone);
      group.scale.multiplyScalar(0.78);
      group.userData.isCustomModel = true;
      return group;
    }
    return createBeeModel(0.78);
  }

  createPressurePlate(): THREE.Group {
    return createPressurePlateModel();
  }

  createPortal(pair: 0 | 1): THREE.Group {
    return createPortalModel(pair);
  }

  createPest(kind: PestKind): THREE.Group {
    return kind === 'grub' ? createGrubModel() : createMiteModel();
  }

  createFlowerBud(variant = 0): THREE.Group {
    return createFlowerBudModel(variant);
  }

  createTileObject(type: TileType, variant = 0): THREE.Group | null {
    const keyMap: Partial<Record<TileType, ModelKey>> = {
      honeypot: 'honeypot',
      flower: 'flower',
      trapped_bee: 'trapped_bee',
      exit: 'suitcase',
      wax: 'wax',
      wall: 'wall',
      rounded_wall: 'rounded_wall',
      honey_source: 'honey_source'
    };

    const customKey = keyMap[type];
    if (customKey && this.customModels.has(customKey)) {
      const clone = this.customModels.get(customKey)!.clone(true);
      const group = clone instanceof THREE.Group ? clone : new THREE.Group().add(clone);
      group.userData.isCustomModel = true;
      return group;
    }

    switch (type) {
      case 'wall':
        return createWallModel(false);
      case 'rounded_wall':
        return createWallModel(true);
      case 'wax':
        return createWaxModel(variant);
      case 'flower':
        return createFlowerModel(variant);
      case 'trapped_bee':
        return createTrappedBeeModel();
      case 'honeypot':
        return createHoneyPotModel();
      case 'honey_source':
        return createHoneySourceModel();
      case 'honey_liquid':
        return createLiquidHoneyModel();
      case 'honey_bowl':
        return createHoneyBowlModel();
      case 'honey_gate':
        return createHoneyGateModel();
      case 'petal_gate':
        return createPetalGateModel();
      case 'exit':
        return createSuitcaseModel();
      case 'empty':
      default:
        return null;
    }
  }
}
