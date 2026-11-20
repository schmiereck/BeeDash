import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AssetFactory } from '../src/render/assetFactory';
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
    }
  });
});
