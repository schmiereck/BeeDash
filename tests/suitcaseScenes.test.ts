import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AssetFactory } from '../src/render/assetFactory';
import {
  CharacterKey,
  CharacterPose,
  createStageCharacter
} from '../src/render/suitcaseCharacters';
import {
  getSuitcaseSceneById,
  getSuitcaseSceneForLevel,
  SUITCASE_SCENES
} from '../src/render/suitcaseScenes';

describe('Suitcase 3D Magic Scenes', () => {
  it('defines 6 unique scenes with non-empty metadata', () => {
    expect(SUITCASE_SCENES).toHaveLength(6);
    const ids = new Set<string>();

    for (const def of SUITCASE_SCENES) {
      expect(def.id.trim().length).toBeGreaterThan(0);
      expect(def.title.trim().length).toBeGreaterThan(0);
      expect(def.caption.trim().length).toBeGreaterThan(0);
      expect(def.emoji.trim().length).toBeGreaterThan(0);
      expect(ids.has(def.id)).toBe(false);
      ids.add(def.id);
    }
  });

  it('maps levels 1..6 to distinct scenes and cycles cleanly for 7..12', () => {
    const firstSix = [1, 2, 3, 4, 5, 6].map((n) => getSuitcaseSceneForLevel(n).id);
    expect(new Set(firstSix).size).toBe(6);

    for (let n = 1; n <= 6; n++) {
      expect(getSuitcaseSceneForLevel(n + 6).id).toBe(getSuitcaseSceneForLevel(n).id);
    }
  });

  it('resolves known scene IDs and returns undefined for unknown IDs', () => {
    for (const def of SUITCASE_SCENES) {
      expect(getSuitcaseSceneById(def.id)).toBe(def);
    }
    expect(getSuitcaseSceneById('nonexistent_scene')).toBeUndefined();
  });

  it('builds and updates every scene cleanly without throwing', () => {
    const assets = new AssetFactory();
    const samples: Array<[number, number]> = [
      [0, 0],
      [0.5, 0.43],
      [2.0, 1],
      [6.0, 1]
    ];

    for (const def of SUITCASE_SCENES) {
      const runtime = def.build(assets);
      expect(runtime.root).toBeInstanceOf(THREE.Group);
      expect(runtime.root.children.length).toBeGreaterThan(0);
      expect(runtime.ownedMaterials.length).toBeGreaterThan(0);

      for (const mat of runtime.ownedMaterials) {
        expect(mat).toBeInstanceOf(THREE.Material);
      }

      for (const [sceneTime, reveal] of samples) {
        expect(() => runtime.update(sceneTime, 0.016, reveal)).not.toThrow();
      }

      for (const mat of runtime.ownedMaterials) {
        mat.dispose();
      }
      for (const tex of runtime.ownedTextures ?? []) {
        tex.dispose();
      }
    }
  });

  it('builds Frau Honig and both children with feet grounded near y=0 and supports all poses', () => {
    const assets = new AssetFactory();
    const keys: CharacterKey[] = ['frau_honig', 'child_girl', 'child_boy'];
    const poses: CharacterPose[] = [
      'wave',
      'cheer',
      'sip_tea',
      'fly_umbrella',
      'blow_bubbles',
      'sit_stargaze'
    ];

    for (const key of keys) {
      const char = createStageCharacter(assets, key);
      expect(char.root).toBeInstanceOf(THREE.Group);
      expect(char.root.children.length).toBeGreaterThan(0);
      expect(char.ownedMaterials.length).toBeGreaterThan(0);

      char.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(char.root);
      const height = box.max.y - box.min.y;
      expect(box.min.y).toBeGreaterThanOrEqual(-0.08);
      expect(box.min.y).toBeLessThanOrEqual(0.08);
      expect(height).toBeGreaterThanOrEqual(0.85);
      expect(height).toBeLessThanOrEqual(1.25);

      for (const pose of poses) {
        expect(() => char.update(0.5, 0.016, pose)).not.toThrow();
        expect(() => char.update(2.2, 0.016, pose)).not.toThrow();
      }

      for (const mat of char.ownedMaterials) {
        mat.dispose();
      }
    }
  });
});
