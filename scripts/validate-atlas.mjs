import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
await MeshoptDecoder.ready;
const filename = process.argv[2] ?? 'atlas.json';
const base = new URL('../public/models/', import.meta.url),
  atlas = JSON.parse(fs.readFileSync(new URL(filename, base)));
assert.equal(atlas.parts.length, 2234);
assert.equal(atlas.concepts.length, 3432);
const ids = new Set(atlas.parts.map((p) => p.id));
assert.equal(ids.size, 2234);
const files = atlas.chunks.map((c) => {
  const gz = fs.readFileSync(new URL(c.url.split('/').pop(), base));
  assert.equal(gz.length, c.gzipBytes);
  const b = gunzipSync(gz);
  assert.equal(b.length, c.bytes);
  return b;
});
let tris = 0;
for (const p of atlas.parts) {
  assert.ok(p.name.trim() && p.name !== '-' && !p.name.includes('Bounds('));
  assert.ok(p.conceptId !== '-');
  assert.ok(p.system);
  const b = files[p.chunk];
  assert.ok(p.indices + p.indicesBytes <= b.length);
  const view = (offset, length) => new Uint8Array(b.buffer, b.byteOffset + offset, length);
  const indices = new Uint32Array(p.indexCount),
    normals = new Int8Array(p.vertexCount * 4);
  // The decoders throw on malformed or truncated data.
  MeshoptDecoder.decodeVertexBuffer(
    new Uint8Array(p.vertexCount * 8),
    p.vertexCount,
    8,
    view(p.positions, p.positionsBytes),
  );
  MeshoptDecoder.decodeVertexBuffer(
    new Uint8Array(normals.buffer),
    p.vertexCount,
    4,
    view(p.normals, p.normalsBytes),
  );
  MeshoptDecoder.decodeIndexBuffer(
    new Uint8Array(indices.buffer),
    p.indexCount,
    4,
    view(p.indices, p.indicesBytes),
  );
  assert.ok(indices.length >= 3 && indices.length % 3 === 0);
  for (const i of indices) assert.ok(i < p.vertexCount, `${p.id}: invalid vertex`);
  for (let v = 0; v < p.vertexCount; v++)
    assert.ok(normals[v * 4] || normals[v * 4 + 1] || normals[v * 4 + 2], `${p.id}: zero normal`);
  for (const value of p.bounds.flat()) assert.ok(Number.isFinite(value));
  tris += p.indexCount / 3;
}
for (const c of atlas.concepts) {
  assert.ok(c.elements.length);
  for (const id of c.elements) assert.ok(ids.has(id), `${c.id}: missing ${id}`);
}
assert.equal(tris, atlas.triangles);
console.log(
  `Verified ${ids.size} individually indexed meshes, ${atlas.concepts.length} complete concept mappings, ${tris.toLocaleString()} triangles, and every binary buffer.`,
);
