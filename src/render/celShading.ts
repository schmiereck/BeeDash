import * as THREE from 'three';

export interface CelShadingOptions {
  outlineColor?: number;
  outlineThickness?: number;
  outlineOpacity?: number;
  grainStrength?: number;
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

varying vec3 vWorldPos;
varying vec3 vViewNormal;
varying vec3 vViewDir;

#include <skinning_pars_vertex>

float organicWave(vec3 p) {
  float w1 = sin(p.x * 1.7 + sin(p.y * 2.3)) * cos(p.z * 1.9 + cos(p.x * 1.3));
  float w2 = sin(p.y * 3.7 - cos(p.z * 4.1)) * cos(p.x * 3.1 + sin(p.y * 2.9));
  return 0.65 * w1 + 0.35 * w2;
}

void main() {
  float nLen = length(normal);
  vec3 objectNormal = nLen > 0.0001 ? normal / nLen : normalize(position + vec3(0.0001));
  vec3 transformed = position;

  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>

  vec4 worldPos4 = modelMatrix * vec4(transformed, 1.0);
  vWorldPos = worldPos4.xyz;

  vec3 viewN = normalMatrix * objectNormal;
  vViewNormal = length(viewN) > 0.0001 ? normalize(viewN) : vec3(0.0, 0.0, 1.0);

  float w = organicWave(vWorldPos * uWobbleFreq);
  float disp = uThickness * (1.0 + uWobbleAmp * w);

  vec4 mvPos = modelViewMatrix * vec4(transformed, 1.0);
  mvPos.xyz += vViewNormal * disp;
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

const OUTLINE_FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uGrainStrength;
uniform float uWobbleFreq;

varying vec3 vWorldPos;
varying vec3 vViewNormal;
varying vec3 vViewDir;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float valueNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);

  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, u.x);
  float nx10 = mix(n010, n110, u.x);
  float nx01 = mix(n001, n101, u.x);
  float nx11 = mix(n011, n111, u.x);
  float nxy0 = mix(nx00, nx10, u.y);
  float nxy1 = mix(nx01, nx11, u.y);
  return mix(nxy0, nxy1, u.z);
}

void main() {
  float n1 = valueNoise3(vWorldPos * (uWobbleFreq * 2.2));
  float n2 = valueNoise3(vWorldPos * (uWobbleFreq * 5.1) + vec3(7.3, 2.9, 5.1));
  float tooth = mix(n1, n2, 0.45);
  float pigment = mix(1.0, smoothstep(0.18, 0.85, tooth), uGrainStrength);

  float ndotv = abs(dot(normalize(vViewNormal), normalize(vViewDir)));
  float feather = smoothstep(0.0, 0.38, ndotv);
  float alpha = clamp(uOpacity * feather * pigment, 0.0, 1.0);
  if (alpha < 0.03) discard;

  vec3 softTint = mix(uColor + vec3(0.09, 0.08, 0.07), uColor, pigment);
  gl_FragColor = vec4(softTint, alpha);
}
`;

/**
 * Generates a gentle 4-step grayscale DataTexture for Three.js MeshToonMaterial
 * to match warm watercolor / colored-pencil storybook illustrations.
 */
export function createStorybookGradientMap(): THREE.DataTexture {
  const bands = new Uint8Array([122, 178, 224, 255]);
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
 * Applies storybook cel-shading (gentle 4-band toon materials + soft uneven
 * pencil/chalk inverted-hull contours) to an object tree, returning a reversible handle.
 */
export function applyStorybookCelShading(
  root: THREE.Object3D,
  options: CelShadingOptions = {}
): CelShadingHandle {
  const outlineColor = options.outlineColor ?? 0x4b3b30;
  const outlineThickness = options.outlineThickness ?? 0.016;
  const outlineOpacity = options.outlineOpacity ?? 0.82;
  const grainStrength = options.grainStrength ?? 0.42;
  const wobbleAmp = options.wobbleAmp ?? 0.45;
  const wobbleFreq = options.wobbleFreq ?? 16.0;

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

    // Add inverted-hull soft pencil/chalk contour for static and skinned opaque meshes
    const isSkinned =
      mesh instanceof THREE.SkinnedMesh || Boolean((mesh as THREE.SkinnedMesh).isSkinnedMesh);
    if (hasOpaqueSurface && mesh.geometry) {
      const outlineMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: colorVec },
          uThickness: { value: outlineThickness },
          uOpacity: { value: outlineOpacity },
          uGrainStrength: { value: grainStrength },
          uWobbleAmp: { value: wobbleAmp },
          uWobbleFreq: { value: wobbleFreq }
        },
        vertexShader: OUTLINE_VERTEX_SHADER,
        fragmentShader: OUTLINE_FRAGMENT_SHADER,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        depthTest: true
      });
      ownedMaterials.push(outlineMat);

      let outlineMesh: THREE.Mesh;
      if (isSkinned) {
        const skinnedSrc = mesh as THREE.SkinnedMesh;
        const skinnedOutline = new THREE.SkinnedMesh(mesh.geometry, outlineMat);
        if (skinnedSrc.skeleton) {
          skinnedOutline.bind(skinnedSrc.skeleton, skinnedSrc.bindMatrix);
        }
        skinnedOutline.position.copy(mesh.position);
        skinnedOutline.rotation.copy(mesh.rotation);
        skinnedOutline.scale.copy(mesh.scale);
        skinnedOutline.matrixAutoUpdate = mesh.matrixAutoUpdate;
        if (!mesh.matrixAutoUpdate) {
          skinnedOutline.matrix.copy(mesh.matrix);
        }
        skinnedOutline.frustumCulled = mesh.frustumCulled;
        (mesh.parent ?? mesh).add(skinnedOutline);
        outlineMesh = skinnedOutline;
      } else {
        outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
        mesh.add(outlineMesh);
      }

      outlineMesh.name = `${mesh.name || 'mesh'}_cel_outline`;
      outlineMesh.userData.isCelOutline = true;
      outlineMesh.userData.sharedGeo = true;
      outlineMesh.castShadow = false;
      outlineMesh.receiveShadow = false;
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
