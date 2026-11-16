// Reads an encoded atlas (manifest + .mesh.gz chunks) back into plain geometry, for build scripts
// that combine or adjust models. Mirrors decodePart() in app/scene/chunk-loader.ts.
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { MeshoptDecoder } from 'meshoptimizer/decoder';

export const modelsDir = new URL('../public/models/', import.meta.url);

/** @returns {{ manifest: any, parts: Map<string, {part: any, positions: Float32Array, normals: Float32Array, indices: Uint32Array}> }} */
export async function readAtlas(name, dir = modelsDir) {
  await MeshoptDecoder.ready;
  const manifest = JSON.parse(fs.readFileSync(new URL(name, dir), 'utf8'));
  if (!manifest.encoding) throw new Error(`${name} is not encoded`);
  const chunks = manifest.chunks.map((c) =>
    gunzipSync(fs.readFileSync(new URL(c.url.split('/').pop(), dir))),
  );
  const parts = new Map();
  for (const p of manifest.parts) {
    const buf = chunks[p.chunk];
    const src = (o, n) => new Uint8Array(buf.buffer, buf.byteOffset + o, n);
    const q = new Uint16Array(p.vertexCount * 4),
      pn = new Int8Array(p.vertexCount * 4),
      indices = new Uint32Array(p.indexCount);
    MeshoptDecoder.decodeVertexBuffer(
      new Uint8Array(q.buffer),
      p.vertexCount,
      8,
      src(p.positions, p.positionsBytes),
    );
    MeshoptDecoder.decodeVertexBuffer(
      new Uint8Array(pn.buffer),
      p.vertexCount,
      4,
      src(p.normals, p.normalsBytes),
    );
    MeshoptDecoder.decodeIndexBuffer(
      new Uint8Array(indices.buffer),
      p.indexCount,
      4,
      src(p.indices, p.indicesBytes),
    );
    const [lo, hi] = p.bounds,
      scale = (Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1) / 65535;
    const positions = new Float32Array(p.vertexCount * 3),
      normals = new Float32Array(p.vertexCount * 3);
    for (let v = 0; v < p.vertexCount; v++) {
      for (let k = 0; k < 3; k++) {
        positions[v * 3 + k] = lo[k] + q[v * 4 + k] * scale;
        normals[v * 3 + k] = pn[v * 4 + k] / 127;
      }
    }
    parts.set(p.id, { part: p, positions, normals, indices });
  }
  return { manifest, parts };
}

export function centroid(geoms) {
  const c = [0, 0, 0];
  let n = 0;
  for (const g of geoms)
    for (let i = 0; i < g.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) c[k] += g.positions[i + k];
      n++;
    }
  return c.map((x) => x / n);
}

export function bounds(positions) {
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], positions[i + k]);
      hi[k] = Math.max(hi[k], positions[i + k]);
    }
  return [lo, hi];
}
