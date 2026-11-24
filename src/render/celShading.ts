import * as THREE from 'three';

export interface CelShadingOptions {
  outlineColor?: number;
  outlineThickness?: number;
  wobbleAmp?: number;
  wobbleFreq?: number;
}

export interface CelShadingHandle {
  ownedMaterials: THREE.Material[];
  ownedTextures: THREE.Texture[];
  outlineCount: number;
  convertedMaterialCount: number;
  restore: () => void;
}

interface MaterialBackup {
  mesh: THREE.Mesh;
  originalMaterial: THREE.Material | THREE.Material[];
}

const OUTLINE_VERTEX_SHADER = `
uniform float uThickness;
uniform float uWobbleAmp;
uniform float uWobbleFreq;

float organicWave(vec3 p) {
  return sin(p.x * 1.7 + sin(p.y * 2.3)) * cos(p.z * 1.9 + cos(p.x * 1.3));
}

void main() {
  float nLen = length(normal);
  vec3 n = nLen > 0.0001 ? normal / nLen : normalize(position + vec3(0.0001));
  float w = organicWave(position * uWobbleFreq);
  float disp = uThickness * (1.0 + uWobbleAmp * w);
  vec3 extruded = position + n * disp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(extruded, 1.0);
}
`;

const OUTLINE_FRAGMENT_SHADER = `
uniform vec3 uColor;

void main() {
  gl_FragColor = vec4(uColor, 1.0);
}
`;

/**
 * Generates a sharp 4-step grayscale DataTexture for Three.js MeshToonMaterial
 * to match hand-colored storybook illustrations without muddy gradients.
 */
export function createStorybookGradientMap(): THREE.DataTexture {
  const bands = new Uint8Array([95, 165, 225, 255]);
  const tex = new THREE.DataTexture(bands, bands.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function shouldSkipMaterial(mat: THREE.Material): boolean {
  if (mat.blending === THREE.AdditiveBlending) return true;
  if (mat.transparent && mat.opacity < 0.65) return true;
  return false;
}

function toToonMaterial(
  mat: THREE.Material,
  gradientMap: THREE.DataTexture
): THREE.MeshToonMaterial | null {
  if (shouldSkipMaterial(mat)) return null;
  if (mat instanceof THREE.MeshToonMaterial) return null;

  const isLitSurface =
    mat instanceof THREE.MeshStandardMaterial ||
    mat instanceof THREE.MeshPhysicalMaterial ||
    mat instanceof THREE.MeshPhongMaterial ||
    mat instanceof THREE.MeshLambertMaterial;
  if (!isLitSurface) return null;

  const toon = new THREE.MeshToonMaterial({
    color: mat.color.clone(),
    gradientMap,
    map: mat.map ?? null,
    transparent: mat.transparent,
    opacity: mat.opacity,
    alphaTest: mat.alphaTest,
    side: mat.side,
    vertexColors: mat.vertexColors,
    emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: mat.emissiveIntensity ?? 1
  });
  toon.name = mat.name;
  return toon;
}

/**
 * Applies storybook cel-shading (4-band toon materials + slightly uneven hand-drawn
 * inverted-hull ink outlines) to an object tree, returning a reversible handle.
 */
export function applyStorybookCelShading(
  root: THREE.Object3D,
  options: CelShadingOptions = {}
): CelShadingHandle {
  const outlineColor = options.outlineColor ?? 0x2b1d14;
  const outlineThickness = options.outlineThickness ?? 0.018;
  const wobbleAmp = options.wobbleAmp ?? 0.38;
  const wobbleFreq = options.wobbleFreq ?? 18.0;

  const gradientMap = createStorybookGradientMap();
  const ownedMaterials: THREE.Material[] = [];
  const ownedTextures: THREE.Texture[] = [gradientMap];
  const backups: MaterialBackup[] = [];
  const outlineMeshes: THREE.Mesh[] = [];
  let convertedMaterialCount = 0;

  root.updateMatrixWorld(true);

  const candidateMeshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || obj.userData?.isCelOutline) return;
    candidateMeshes.push(mesh);
  });

  const worldScale = new THREE.Vector3();
  const colorVec = new THREE.Color(outlineColor);

  for (const mesh of candidateMeshes) {
    const orig = mesh.material;
    let hasOpaqueSurface = false;

    if (Array.isArray(orig)) {
      let replacedAny = false;
      const nextMats = orig.map((m) => {
        if (!shouldSkipMaterial(m)) hasOpaqueSurface = true;
        const toon = toToonMaterial(m, gradientMap);
        if (toon) {
          ownedMaterials.push(toon);
          convertedMaterialCount++;
          replacedAny = true;
          return toon;
        }
        return m;
      });
      if (replacedAny) {
        backups.push({ mesh, originalMaterial: orig });
        mesh.material = nextMats;
      }
    } else if (orig) {
      if (!shouldSkipMaterial(orig)) hasOpaqueSurface = true;
      const toon = toToonMaterial(orig, gradientMap);
      if (toon) {
        backups.push({ mesh, originalMaterial: orig });
        ownedMaterials.push(toon);
        convertedMaterialCount++;
        mesh.material = toon;
      }
    }

    // Add inverted-hull hand-drawn ink outline for non-skinned opaque meshes
    const isSkinned = Boolean((mesh as THREE.SkinnedMesh).isSkinnedMesh);
    if (hasOpaqueSurface && !isSkinned && mesh.geometry) {
      mesh.getWorldScale(worldScale);
      const avgScale = Math.max(
        0.001,
        (Math.abs(worldScale.x) + Math.abs(worldScale.y) + Math.abs(worldScale.z)) / 3
      );
      const localThickness = outlineThickness / avgScale;

      const outlineMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: colorVec },
          uThickness: { value: localThickness },
          uWobbleAmp: { value: wobbleAmp },
          uWobbleFreq: { value: wobbleFreq }
        },
        vertexShader: OUTLINE_VERTEX_SHADER,
        fragmentShader: OUTLINE_FRAGMENT_SHADER,
        side: THREE.BackSide
      });
      ownedMaterials.push(outlineMat);

      const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
      outlineMesh.name = `${mesh.name || 'mesh'}_cel_outline`;
      outlineMesh.userData.isCelOutline = true;
      outlineMesh.userData.sharedGeo = true;
      outlineMesh.castShadow = false;
      outlineMesh.receiveShadow = false;
      mesh.add(outlineMesh);
      outlineMeshes.push(outlineMesh);
    }
  }

  let restored = false;
  return {
    ownedMaterials,
    ownedTextures,
    outlineCount: outlineMeshes.length,
    convertedMaterialCount,
    restore: () => {
      if (restored) return;
      restored = true;
      for (const b of backups) {
        b.mesh.material = b.originalMaterial;
      }
      for (const om of outlineMeshes) {
        om.parent?.remove(om);
      }
      for (const mat of ownedMaterials) {
        mat.dispose();
      }
      for (const tex of ownedTextures) {
        tex.dispose();
      }
    }
  };
}
