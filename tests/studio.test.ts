import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AssetFactory } from '../src/render/assetFactory';
import { applyStorybookCelShading } from '../src/render/celShading';
import {
  buildStudioStageItem,
  disposeStudioInstance,
  STUDIO_BEE_TRICKS,
  STUDIO_ITEMS,
  STUDIO_POSES
} from '../src/render/studioCatalog';
import { SUITCASE_SCENES } from '../src/render/suitcaseScenes';

describe('BeeDash 3D-Atelier Katalog & Builder', () => {
  it('defines unique items covering characters, all 6 suitcase scenes, and gameplay objects', () => {
    const ids = new Set<string>();
    for (const item of STUDIO_ITEMS) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.description.trim().length).toBeGreaterThan(0);
      expect(item.minRadius).toBeGreaterThan(0);
      expect(item.defaultRadius).toBeGreaterThan(item.minRadius);
      expect(item.maxRadius).toBeGreaterThan(item.defaultRadius);
    }

    expect(ids.has('frau_honig')).toBe(true);
    expect(ids.has('child_girl')).toBe(true);
    expect(ids.has('child_boy')).toBe(true);
    expect(ids.has('alberta')).toBe(true);
    expect(ids.has('bee')).toBe(true);
    expect(ids.has('bee_higgsfield_multiview')).toBe(true);
    expect(ids.has('bee_higgsfield_multiview_stripes')).toBe(true);
    expect(ids.has('bee_higgsfield')).toBe(true);
    expect(ids.has('bee_higgsfield_v2')).toBe(true);

    for (const sceneDef of SUITCASE_SCENES) {
      expect(ids.has(`scene_${sceneDef.id}`)).toBe(true);
    }

    for (const objId of [
      'honeypot_higgsfield',
      'honeypot',
      'flower_0',
      'flower_1',
      'flower_2',
      'trapped_bee',
      'honey_liquid',
      'honey_source',
      'honey_bowl',
      'honey_gate',
      'pressure_plate',
      'petal_gate',
      'portal_0',
      'portal_1',
      'exit',
      'wall',
      'rounded_wall',
      'wax',
      'grub',
      'mite',
      'flower_bud'
    ]) {
      expect(ids.has(objId)).toBe(true);
    }

    expect(STUDIO_POSES).toHaveLength(6);
    expect(STUDIO_BEE_TRICKS).toHaveLength(3);
  });

  it('builds, animates across all poses/tricks/toggles, and disposes every studio item cleanly', () => {
    const assets = new AssetFactory();

    for (const item of STUDIO_ITEMS) {
      const instance = buildStudioStageItem(item, assets);
      expect(instance.root).toBeInstanceOf(THREE.Group);
      expect(instance.root.children.length).toBeGreaterThan(0);

      for (const pose of STUDIO_POSES) {
        expect(() =>
          instance.update(0.8, 0.016, {
            pose: pose.id,
            toggles: {
              sticky: false,
              dizzy: false,
              bowlFilled: false,
              platePressed: false,
              suitcaseOpen: false
            },
            revealElapsed: 0.4,
            beeTrick: null
          })
        ).not.toThrow();

        expect(() =>
          instance.update(2.4, 0.016, {
            pose: pose.id,
            toggles: {
              sticky: true,
              dizzy: true,
              bowlFilled: true,
              platePressed: true,
              suitcaseOpen: true
            },
            revealElapsed: 2.0,
            beeTrick: null
          })
        ).not.toThrow();
      }

      if (item.isBee) {
        for (const trick of STUDIO_BEE_TRICKS) {
          for (const progress of [0, 0.5, 1]) {
            expect(() =>
              instance.update(1.5, 0.016, {
                pose: 'wave',
                toggles: {
                  sticky: true,
                  dizzy: false,
                  bowlFilled: true,
                  platePressed: true,
                  suitcaseOpen: true
                },
                revealElapsed: 1.5,
                beeTrick: { kind: trick.id, progress }
              })
            ).not.toThrow();
          }
        }
      }

      expect(() => disposeStudioInstance(instance)).not.toThrow();
    }
  });

  it('applies storybook cel-shading with hand-drawn outline hulls and restores cleanly', () => {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.9, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe69f24, roughness: 0.4 });
    const mesh = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(mesh);

    const haloGeo = new THREE.SphereGeometry(0.6, 12, 10);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.25
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    group.add(halo);

    const handle = applyStorybookCelShading(group);
    expect(handle.convertedMaterialCount).toBe(1);
    expect(handle.outlineCount).toBe(1);
    expect(mesh.material).toBeInstanceOf(THREE.MeshToonMaterial);
    expect(halo.material).toBe(haloMat);
    const outlineChild = mesh.children.find(
      (c): c is THREE.Mesh => c.userData.isCelOutline === true
    );
    expect(outlineChild).toBeDefined();
    const outlineMat = outlineChild!.material as THREE.ShaderMaterial;
    expect(outlineMat.transparent).toBe(true);
    expect(outlineMat.depthWrite).toBe(false);
    expect(outlineMat.uniforms.uOpacity.value).toBeLessThan(1);
    expect(outlineMat.uniforms.uGrainStrength.value).toBeGreaterThan(0);

    handle.restore();
    expect(mesh.material).toBe(bodyMat);
    expect(mesh.children.some((c) => c.userData.isCelOutline === true)).toBe(false);

    bodyGeo.dispose();
    bodyMat.dispose();
    haloGeo.dispose();
    haloMat.dispose();
  });

  it('creates bound SkinnedMesh outlines with cel-shading and verifies rigged bee GLB structure', () => {
    const root = new THREE.Group();
    const boneRoot = new THREE.Bone();
    const wingL = new THREE.Bone();
    boneRoot.add(wingL);
    root.add(boneRoot);

    const geo = new THREE.BoxGeometry(0.4, 0.2, 0.2);
    const count = geo.attributes.position.count;
    geo.setAttribute(
      'skinIndex',
      new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4)
    );
    const weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) weights[i * 4] = 1;
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));

    const mat = new THREE.MeshStandardMaterial({ color: 0xe8ab54 });
    const skinned = new THREE.SkinnedMesh(geo, mat);
    skinned.bind(new THREE.Skeleton([boneRoot, wingL]));
    root.add(skinned);

    const handle = applyStorybookCelShading(root);
    expect(handle.convertedMaterialCount).toBe(1);
    expect(handle.outlineCount).toBe(1);
    const skinnedOutline = root.children.find(
      (c): c is THREE.SkinnedMesh =>
        c instanceof THREE.SkinnedMesh && c.userData.isCelOutline === true
    );
    expect(skinnedOutline).toBeDefined();
    expect(skinnedOutline!.skeleton).toBe(skinned.skeleton);

    handle.restore();
    expect(
      root.children.some((c) => c.userData.isCelOutline === true)
    ).toBe(false);
    geo.dispose();
    mat.dispose();
  });
});
