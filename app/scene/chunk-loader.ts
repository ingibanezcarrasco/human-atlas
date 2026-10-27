import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Atlas } from '../anatomy';
import { decodeModelResponse } from '../model-download';

export async function fetchChunk(atlas: Atlas, ci: number, signal: AbortSignal) {
  const chunk = atlas.chunks[ci],
    compressed = !!chunk.gzip && typeof DecompressionStream !== 'undefined';
  const response = await fetch(compressed ? chunk.gzip! : chunk.url, { signal });
  return decodeModelResponse(response, chunk.bytes, compressed);
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
    const g = new T.BufferGeometry();
    g.setAttribute(
      'position',
      new T.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3),
    );
    // GPU normalized signed-short normals keep the complete atlas compact in memory.
    g.setAttribute(
      'normal',
      new T.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true),
    );
    g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
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
    if (!geometry) throw new Error('Could not assemble anatomy geometry.');
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
