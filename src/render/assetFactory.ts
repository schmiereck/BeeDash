import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TileType } from '../game/types';
import {
  createBeeModel,
  createFlowerModel,
  createHoneyBowlModel,
  createHoneyGateModel,
  createHoneyPotModel,
  createHoneySourceModel,
  createLiquidHoneyModel,
  createSuitcaseModel,
  createTrappedBeeModel,
  createWallModel,
  createWaxModel
} from './proceduralModels';

export type ModelKey =
  | 'bee'
  | 'honeypot'
  | 'flower'
  | 'trapped_bee'
  | 'suitcase'
  | 'wax'
  | 'wall'
  | 'rounded_wall'
  | 'honey_source';

interface AssetManifest {
  models?: Partial<Record<ModelKey, string>>;
  audio?: Record<string, string>;
}

export class AssetFactory {
  private loader = new GLTFLoader();
  private customModels = new Map<ModelKey, THREE.Object3D>();
  private manifestAudio: Record<string, string> = {};

  async init(): Promise<void> {
    try {
      const response = await fetch('assets/manifest.json', { cache: 'no-cache' });
      if (!response.ok) return;
      const manifest = (await response.json()) as AssetManifest;
      this.manifestAudio = manifest.audio ?? {};

      const entries = Object.entries(manifest.models ?? {}) as Array<[ModelKey, string]>;
      await Promise.all(
        entries.map(async ([key, url]) => {
          if (!url) return;
          try {
            const gltf = await this.loader.loadAsync(url);
            const normalized = this.normalizeLoadedModel(gltf.scene);
            this.customModels.set(key, normalized);
          } catch (err) {
            console.warn(`Konnte 3D-Modell "${key}" (${url}) nicht laden, nutze Standardmodell.`, err);
          }
        })
      );
    } catch {
      // Fallback seamlessly to built-in procedural 3D models
    }
  }

  getAudioManifest(): Record<string, string> {
    return { ...this.manifestAudio };
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
      case 'exit':
        return createSuitcaseModel();
      case 'empty':
      default:
        return null;
    }
  }
}
