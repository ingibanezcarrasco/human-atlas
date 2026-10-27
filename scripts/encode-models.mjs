// Final step of the geometry pipeline (after optimize-anatomy.mjs): turn the raw optimized chunks
// into compact, priority-ordered download chunks.
//
// Per part: positions are quantized to 16 bits within the part's bounds (rounded to 1 µm; error
// well under 0.1 mm), normals to 8 bits, and triangles/vertices are reordered for the GPU vertex
// cache. Each buffer is then encoded with meshoptimizer's codecs and every chunk is gzipped.
// Parts are packed by system priority so the skeleton and organs appear before the muscles and
// vessels that cover them. Part order in the manifest (and so each part's index) is unchanged.
//
// Usage: node scripts/encode-models.mjs [atlas.json]
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { MeshoptEncoder } from 'meshoptimizer/encoder';

await MeshoptEncoder.ready;
const name = process.argv[2] ?? 'atlas.json',
  prefix = name.includes('female') ? 'female' : 'body';
const dir = new URL('../public/models/', import.meta.url),
  manifest = JSON.parse(fs.readFileSync(new URL(name, dir), 'utf8'));
if (manifest.encoding) throw new Error('Already encoded. Re-run the optimizer first.');
const sourceFiles = manifest.chunks.map((c) => c.url.split('/').pop());
const source = sourceFiles.map((f) => fs.readFileSync(new URL(f, dir)));

const PRIORITY = [
  'skeletal',
  'cardiac',
  'respiratory',
  'digestive',
  'urinary',
  'endocrine',
  'reproductive',
  'pregnancy',
  'nervous',
  'sensory',
  'lymphatic',
  'connective',
  'arterial',
  'venous',
  'muscular',
  'integumentary',
];
const rank = (system) => (PRIORITY.indexOf(system) + 1 || PRIORITY.length + 1) * 1e6;
const order = manifest.parts
  .map((p, i) => ({ p, i }))
  .sort((a, b) => rank(a.p.system) + a.i - (rank(b.p.system) + b.i));

const TARGET_CHUNK_BYTES = 1_200_000;
const chunks = [];
let segments = [],
  bytes = 0;
const flush = () => {
  if (!bytes) return;
  const file = `${prefix}-${chunks.length}.mesh.gz`,
    payload = Buffer.concat(segments),
    compressed = gzipSync(payload, { level: 9 });
  fs.writeFileSync(new URL(file, dir), compressed);
  chunks.push({ url: `/models/${file}`, bytes: payload.length, gzipBytes: compressed.length });
  segments = [];
  bytes = 0;
};
const append = (data) => {
  const offset = bytes;
  segments.push(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  bytes += data.byteLength;
  return offset;
};

const round = (v) => Math.round(v * 1e6) / 1e6;
for (const { p } of order) {
  const b = source[p.chunk];
  const pos = new Float32Array(b.buffer, b.byteOffset + p.positions, p.vertexCount * 3),
    normal = new Int16Array(b.buffer, b.byteOffset + p.normals, p.vertexCount * 3),
    indices = Uint32Array.from(new Uint32Array(b.buffer, b.byteOffset + p.indices, p.indexCount));
  // Reorders `indices` in place; remap[old] is the new vertex index (unused vertices dropped).
  const [remap, unique] = MeshoptEncoder.reorderMesh(indices, true, true);
  const lo = p.bounds[0].map(round),
    hi = p.bounds[1].map(round),
    size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1;
  // Stride must be a multiple of 4: xyz + one padding component.
  const q = new Uint16Array(unique * 4),
    n = new Int8Array(unique * 4);
  for (let v = 0; v < p.vertexCount; v++) {
    const d = remap[v];
    if (d === 0xffffffff) continue;
    for (let k = 0; k < 3; k++) {
      const x = Math.round(((pos[v * 3 + k] - lo[k]) / size) * 65535);
      q[d * 4 + k] = Math.min(65535, Math.max(0, x));
      n[d * 4 + k] = Math.round((normal[v * 3 + k] / 32767) * 127);
    }
  }
  if (bytes > TARGET_CHUNK_BYTES) flush();
  p.chunk = chunks.length;
  p.bounds = [lo, hi];
  p.vertexCount = unique;
  const encoded = [
    MeshoptEncoder.encodeVertexBuffer(new Uint8Array(q.buffer), unique, 8),
    MeshoptEncoder.encodeVertexBuffer(new Uint8Array(n.buffer), unique, 4),
    MeshoptEncoder.encodeIndexBuffer(new Uint8Array(indices.buffer), p.indexCount, 4),
  ];
  p.positions = append(encoded[0]);
  p.positionsBytes = encoded[0].length;
  p.normals = append(encoded[1]);
  p.normalsBytes = encoded[1].length;
  p.indices = append(encoded[2]);
  p.indicesBytes = encoded[2].length;
}
flush();

manifest.chunks = chunks;
manifest.encoding = {
  method: 'meshoptimizer vertex/index codecs, gzip',
  positions: 'uint16 normalized to part bounds',
  normals: 'int8 normalized',
};
fs.writeFileSync(new URL(name, dir), JSON.stringify(manifest));
for (const f of sourceFiles) {
  fs.unlinkSync(new URL(f, dir));
  if (fs.existsSync(new URL(`${f}.gz`, dir))) fs.unlinkSync(new URL(`${f}.gz`, dir));
}
const total = chunks.reduce((sum, c) => sum + c.gzipBytes, 0);
console.log(`${name}: ${chunks.length} chunks, ${(total / 1e6).toFixed(1)} MB download`);
