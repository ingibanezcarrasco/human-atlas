import * as T from 'three';
import { SYSTEMS } from '../anatomy';

/**
 * Per-structure state lives in two 1-pixel-high textures indexed by the `partIndex` vertex
 * attribute: `partState` holds the translation (xyz) and visibility (w), `selectionState` holds
 * the selection highlight (r). Updating a texel moves, hides or highlights a structure without
 * rebuilding the merged batch geometry.
 */
export interface PartStateTextures {
  partTexture: T.DataTexture;
  selectionTexture: T.DataTexture;
  width: number;
}

export function createPartMaterial(system: string, state: PartStateTextures) {
  const m = new T.MeshStandardMaterial({
    color: SYSTEMS.find((s) => s.id === system)?.color ?? '#aebbb8',
    metalness: 0.08,
    roughness: 0.53,
    side: T.DoubleSide,
    transparent: system === 'integumentary',
    opacity: system === 'integumentary' ? 0.1 : 1,
    depthWrite: system !== 'integumentary',
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.partState = { value: state.partTexture };
    shader.uniforms.selectionState = { value: state.selectionTexture };
    shader.uniforms.stateWidth = { value: state.width };
    shader.vertexShader =
      'attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r;',
    );
    shader.fragmentShader =
      'varying float partVisible; varying float partSelected;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.85, 0.78), partSelected * 0.75);',
    );
  };
  return m;
}

/** Round screen-space dots drawn at each structure's center in the exploded inventory. */
export function createMarkers(count: number) {
  const positions = new Float32Array(count * 3),
    geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
  const material = new T.PointsMaterial({
    color: 0x64748b,
    size: 5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.72,
    depthTest: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;',
    );
  };
  const points = new T.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 10;
  points.visible = false;
  return { points, positions, geometry, material };
}
