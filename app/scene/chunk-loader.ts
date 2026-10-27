import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import type { Atlas, Part } from '../anatomy';
import { ViewerError } from '../errors';
import { decodeModelResponse } from '../model-download';

export async function fetchChunk(atlas: Atlas, ci: number, signal: AbortSignal) {
  const chunk = atlas.chunks[ci];
  const [buffer] = await Promise.all([
    fetch(chunk.url, { signal }).then((r) => decodeModelResponse(r, chunk.bytes, true)),
    MeshoptDecoder.ready,
  ]);
  return buffer;
}

/** Decodes one part's buffers (see scripts/encode-models.mjs for the format). */
function decodePart(buffer: ArrayBuffer, p: Part) {
  const source = (offset: number, length: number) => new Uint8Array(buffer, offset, length);
  const quantized = new Uint16Array(p.vertexCount * 4),
    packedNormals = new Int8Array(p.vertexCount * 4),
    indices = new Uint32Array(p.indexCount);
  MeshoptDecoder.decodeVertexBuffer(
    new Uint8Array(quantized.buffer),
    p.vertexCount,
    8,
    source(p.positions, p.positionsBytes),
  );
  MeshoptDecoder.decodeVertexBuffer(
    new Uint8Array(packedNormals.buffer),
    p.vertexCount,
    4,
    source(p.normals, p.normalsBytes),
  );
  MeshoptDecoder.decodeIndexBuffer(
    new Uint8Array(indices.buffer),
    p.indexCount,
    4,
    source(p.indices, p.indicesBytes),
  );
  const [lo, hi] = p.bounds,
    scale = (Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1) / 65535;
  const positions = new Float32Array(p.vertexCount * 3),
    normals = new Int8Array(p.vertexCount * 3);
  for (let v = 0; v < p.vertexCount; v++)
    for (let k = 0; k < 3; k++) {
      positions[v * 3 + k] = lo[k] + quantized[v * 4 + k] * scale;
      normals[v * 3 + k] = packedNormals[v * 4 + k];
    }
  return { positions, normals, indices };
}

/**
 * Builds one geometry per structure in the chunk (kept for accurate picking) and one merged
 * geometry per anatomical system (used for drawing).
 */
export function buildChunkGeometry(
  atlas: Atlas,
  ci: number,
  buffer: ArrayBuffer,
  bounds: T.Box3[],
) {
  const parts = new Map<number, T.BufferGeometry>(),
    groups = new Map<string, T.BufferGeometry[]>();
  atlas.parts.forEach((p, i) => {
    if (p.chunk !== ci) return;
    const g = new T.BufferGeometry(),
      { positions, normals, indices } = decodePart(buffer, p);
    g.setAttribute('position', new T.BufferAttribute(positions, 3));
    // GPU-normalized signed-byte normals keep the complete atlas compact in memory.
    g.setAttribute('normal', new T.BufferAttribute(normals, 3, true));
    g.setIndex(new T.BufferAttribute(indices, 1));
    g.boundingBox = bounds[i].clone();
    g.computeBoundingSphere();
    parts.set(i, g);
    g.setAttribute('partIndex', new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i), 1));
    const list = groups.get(p.system) ?? [];
    list.push(g);
    groups.set(p.system, list);
  });
  const merged = new Map<string, T.BufferGeometry>();
  groups.forEach((gs, system) => {
    const geometry = mergeGeometries(gs, false);
    if (!geometry) throw new ViewerError('assemble', 'Could not assemble anatomy geometry.');
    merged.set(system, geometry);
  });
  return { parts, merged };
}

/** Runs `load` for every chunk index with at most `concurrency` loads in flight. */
export async function loadAll(
  count: number,
  concurrency: number,
  load: (i: number) => Promise<void>,
) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < count) {
        const i = cursor++;
        await load(i);
      }
    }),
  );
}
