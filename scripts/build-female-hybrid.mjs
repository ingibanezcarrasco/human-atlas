// Builds the female model as a hybrid of the two reference collections:
//
//   * Everything that is common to both sexes comes from BodyParts3D (the male model): the complete
//     skeleton, muscles, vessels, nerves and organs that the HRA female set lacks.
//   * The male-only structures are removed: penis, testes, epididymides, deferent ducts, seminal
//     vesicles, prostate, and the penile and scrotal vessels.
//   * The female structures come from the Human Reference Atlas female set (data/hra-female/):
//     uterus, uterine tubes, ovaries, vagina and their ligaments, uterine vessels, the breasts, and
//     the pregnancy reference layer. They are fitted into the BodyParts3D pelvis and chest.
//   * Sex-neutral structures whose course differs are adapted: the gonadal vessels keep their origin
//     and stop at the pelvic brim (ovarian instead of testicular), the urethra keeps only its
//     proximal 4 cm, and the body surface is reshaped (no external male genitalia, breasts).
//   * The bony pelvis is reshaped toward female proportions by a smooth space deformation
//     (pelvis-warp.mjs) applied to everything around it, with the hip joints and spine held fixed.
//
// The output is a raw manifest + .bin chunks that scripts/encode-models.mjs then encodes.
// Usage: node scripts/build-female-hybrid.mjs && node scripts/encode-models.mjs atlas-female.json
import fs from 'node:fs';
import { readAtlas, modelsDir, centroid, bounds } from './atlas-geometry.mjs';
import { pelvisLandmarks, measure } from './pelvis-landmarks.mjs';
import { femalePelvisWarp, RATIOS } from './pelvis-warp.mjs';
import { buildVulva, vulvaSkin, ramusEdge } from './vulva.mjs';

const hraDir = new URL('../data/hra-female/', import.meta.url);
const M = await readAtlas('atlas.json'),
  F = await readAtlas('atlas-female.json', hraDir);
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------------------------------------
// 1. Male-only structures (by BodyParts3D id) and the female ones taken from HRA
const MALE_ONLY = new Set([
  // reproductive system: penis, testes, epididymides, deferent ducts, seminal vesicles, prostate
  'FJ3132',
  'FJ3133',
  'FJ3134',
  'FJ3135',
  'FJ3136',
  'FJ3137',
  'FJ3138',
  'FJ3139',
  'FJ3140',
  'FJ3141',
  'FJ3142',
  'FJ3143',
  // dorsal arteries and veins of the penis
  'FJ3496',
  'FJ3497',
  'FJ3592',
  'FJ3593',
  'FJ2056',
  'FJ2208',
  'FJ3426',
  'FJ3637',
]);
const GONADAL = {
  FJ3532: 'Left ovarian artery',
  FJ3617: 'Right ovarian artery',
  FJ3533: 'Left ovarian vein',
  FJ3618: 'Right ovarian vein',
};
const URETHRA = 'FJ3148',
  SKIN = 'FJ2810';
for (const id of [...MALE_ONLY, ...Object.keys(GONADAL), URETHRA, SKIN])
  if (!M.parts.has(id)) throw new Error(`BodyParts3D part ${id} not found`);

const hra = [...F.parts.values()];
const BREAST = hra.filter((g) => g.part.system === 'integumentary' && g.part.id !== 'VH_F_skin');
const PELVIC = hra.filter(
  (g) =>
    g.part.system === 'reproductive' ||
    g.part.system === 'pregnancy' ||
    /^VH_F_(left|right)_uterine_(artery|vein)$/.test(g.part.id),
);

// ---------------------------------------------------------------------------------------------
// 2. Pelvic fit: female landmarks -> male landmarks. Rotation about the left-right axis (pelvic
//    tilt), a width scale and a translation, by least squares over a grid of angles.
const byName = (A, re) => [...A.parts.values()].filter((g) => re.test(g.part.name));
const femurHead = (g) => {
  const [, hi] = bounds(g.positions),
    pts = [];
  for (let i = 0; i < g.positions.length; i += 3)
    if (g.positions[i + 1] > hi[1] - 0.04) pts.push(...g.positions.slice(i, i + 3));
  return { positions: Float32Array.from(pts) };
};
const one = (A, re) => {
  const r = byName(A, re);
  if (!r.length) throw new Error(`landmark ${re} not found`);
  return r;
};
const landmarks = [
  ['urinary bladder', one(M, /^urinary bladder$/i), one(F, /urinary bladder/i)],
  ['rectum', one(M, /^rectum$/i), one(F, /^rectum$/i)],
  ['sacrum', one(M, /^sacrum$/i), one(F, /^(fused sacrum|coccyx)$/i)],
  [
    'left femoral head',
    one(M, /^left femur$/i).map(femurHead),
    one(F, /^left femur$/i).map(femurHead),
  ],
  [
    'right femoral head',
    one(M, /^right femur$/i).map(femurHead),
    one(F, /^right femur$/i).map(femurHead),
  ],
].map(([n, m, f]) => [n, centroid(m), centroid(f)]);

const rotX = (a) => {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
};
const mul = (R, p) => R.map((row) => row[0] * p[0] + row[1] * p[1] + row[2] * p[2]);
let fit = null;
for (let deg = -30; deg <= 30; deg += 0.25) {
  const R = rotX((deg * Math.PI) / 180),
    rotated = landmarks.map(([, , f]) => mul(R, f));
  const scale = [],
    shift = [];
  let err = 0;
  for (let k = 0; k < 3; k++) {
    const xs = rotated.map((p) => p[k]),
      ys = landmarks.map(([, m]) => m[k]);
    const mx = xs.reduce((a, b) => a + b) / xs.length,
      my = ys.reduce((a, b) => a + b) / ys.length;
    let sxy = 0,
      sxx = 0;
    xs.forEach((x, i) => ((sxy += (x - mx) * (ys[i] - my)), (sxx += (x - mx) ** 2)));
    // Only the width is scaled (the female pelvis is wider than the male one); height and depth
    // keep the organs at their real size.
    const s = k === 0 ? Math.min(1.1, Math.max(0.75, sxy / sxx)) : 1;
    scale.push(s);
    shift.push(my - s * mx);
    xs.forEach((x, i) => (err += (s * x + shift[k] - ys[i]) ** 2));
  }
  if (!fit || err < fit.err) fit = { deg, R, scale, shift, err };
}
log(
  `Pelvic fit: tilt ${fit.deg}°, scale ${fit.scale.map((s) => s.toFixed(3)).join(' / ')}, ` +
    `RMS ${(Math.sqrt(fit.err / landmarks.length) * 1000) | 0} mm`,
);
for (const [n, m, f] of landmarks) {
  const p = mul(fit.R, f).map((v, k) => fit.scale[k] * v + fit.shift[k]);
  log(`  ${n.padEnd(20)} ${(Math.hypot(...p.map((v, k) => v - m[k])) * 1000).toFixed(0)} mm off`);
}
const bony = {
  point: (p) => mul(fit.R, p).map((v, k) => fit.scale[k] * v + fit.shift[k]),
  // normals: inverse transpose of diag(scale)·R  =  diag(1/scale)·R
  normal: (n) => mul(fit.R, n).map((v, k) => v / fit.scale[k]),
};

// Placement. The male bladder sits higher than the female one (the prostate is below it), so the
// bony fit alone leaves the uterus inside it. Instead the lower end of the vagina goes to the
// urogenital hiatus of the pelvic floor (where the male membranous urethra runs: below the
// prostate apex, in front of the anal canal), and the organs keep their source orientation except
// for a small turn about that point that keeps the uterus, cervix, vagina and ovaries out of the
// bladder, rectum and pelvic bones as far as possible.
const obstacles = [
  ...one(M, /^urinary bladder$/i),
  ...one(M, /^rectum$/i),
  ...one(M, /hip bone$/i),
  ...one(M, /^sacrum$/i),
];
const HC = 0.006,
  hkey = (x, y, z) => `${Math.floor(x / HC)},${Math.floor(y / HC)},${Math.floor(z / HC)}`,
  hash = new Map();
for (const g of obstacles)
  for (let i = 0; i < g.positions.length; i += 3) {
    const k = hkey(g.positions[i], g.positions[i + 1], g.positions[i + 2]);
    if (!hash.has(k)) hash.set(k, []);
    hash.get(k).push([...g.positions.slice(i, i + 3), ...g.normals.slice(i, i + 3)]);
  }
/** Inside an obstacle: the nearest obstacle vertex has its outward normal pointing away from p. */
function inside(p) {
  let best = null,
    bd = 0.012;
  const [cx, cy, cz] = p.map((v) => Math.floor(v / HC));
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++)
      for (let l = -2; l <= 2; l++)
        for (const v of hash.get(`${cx + i},${cy + j},${cz + l}`) ?? []) {
          const d = Math.hypot(p[0] - v[0], p[1] - v[1], p[2] - v[2]);
          if (d < bd) {
            bd = d;
            best = v;
          }
        }
  if (!best) return false;
  const dot = (p[0] - best[0]) * best[3] + (p[1] - best[1]) * best[4] + (p[2] - best[2]) * best[5];
  return dot < -0.001;
}
const organs = PELVIC.filter(
  (g) =>
    g.part.system === 'reproductive' &&
    /uter|cervi|vagina|ovary|cornua|fundus/i.test(g.part.name) &&
    !/ligament|pouch|meso|artery|vein|tube|ostium/i.test(g.part.name),
);
const sample = [];
for (const g of organs)
  for (let i = 0; i < g.positions.length; i += 3 * 7)
    sample.push(bony.point(g.positions.slice(i, i + 3)));
const vagina = F.parts.get('VH_F_vagina').positions;
let vagLow = null;
for (let i = 0; i < vagina.length; i += 3)
  if (!vagLow || vagina[i + 1] < vagLow[1]) vagLow = Array.from(vagina.slice(i, i + 3));
vagLow = bony.point(vagLow);
const [prLo, prHi] = bounds(M.parts.get('FJ3139').positions), // prostate
  [, anHi] = bounds(one(M, /^external anal sphincter$/i)[0].positions);
const hiatus = [0, prLo[1] - 0.008, ((prLo[2] + prHi[2]) / 2 + anHi[2]) / 2];
// The lower end of the vagina is pinned to the hiatus; the organs only turn about that point.
const pivot = vagLow,
  toHiatus = [0, hiatus[1] - vagLow[1], hiatus[2] - vagLow[2]];
const place = (deg, d) => {
  const R = rotX((deg * Math.PI) / 180);
  return (p) =>
    mul(
      R,
      p.map((v, k) => v - pivot[k]),
    ).map((v, k) => v + pivot[k] + toHiatus[k] + d[k]);
};
function cost(deg, d) {
  const f = place(deg, d);
  let hits = 0;
  for (const p of sample) if (inside(f(p))) hits++;
  // a small preference for the source orientation breaks ties
  return {
    c: hits / sample.length + Math.abs(deg) * 0.002 + Math.hypot(...d) * 0.5,
    hits: hits / sample.length,
  };
}
const before = cost(0, [0, 0, 0]),
  bonyHits = (() => {
    let h = 0;
    for (const p of sample) if (inside(p)) h++;
    return h / sample.length;
  })();
let best = { deg: 0, d: [0, 0, 0], ...before };
for (let deg = -12; deg <= 12; deg += 1)
  for (let z = -0.006; z <= 0.006 + 1e-9; z += 0.003) {
    const r = cost(deg, [0, 0, z]);
    if (r.c < best.c) best = { deg, d: [0, 0, z], ...r };
  }
log(
  `  vagina end pinned to the pelvic floor hiatus (moved ${toHiatus.map((v) => (v * 1000).toFixed(0)).join('/')} mm), ` +
    `turned ${best.deg}°: organ samples inside bladder/rectum/bone ${(bonyHits * 100).toFixed(1)}% (bony fit) -> ` +
    `${(before.hits * 100).toFixed(1)}% (pinned) -> ${(best.hits * 100).toFixed(1)}%`,
);
const R2 = rotX((best.deg * Math.PI) / 180),
  placeBest = place(best.deg, best.d);
const pelvic = {
  point: (p) => placeBest(bony.point(p)),
  normal: (n) => mul(R2, bony.normal(n)),
};

// ---------------------------------------------------------------------------------------------
// 3. Breast fit: scale by body height, centre on the midline, and set the depth so the back of
//    the breast rests on the front of pectoralis major.
const heightOf = (A, id) => bounds(A.parts.get(id).positions)[1][1];
const hs = heightOf(M, SKIN) / heightOf(F, 'VH_F_skin');
const femMid = (landmarks[3][2][0] + landmarks[4][2][0]) / 2; // HRA midline is off x = 0
const pect = byName(M, /pectoralis major/i);
const GRID = 0.01,
  cell = (x, y) => `${Math.round(x / GRID)},${Math.round(y / GRID)}`;
const front = new Map(),
  back = new Map();
for (const g of pect)
  for (let i = 0; i < g.positions.length; i += 3) {
    const k = cell(g.positions[i], g.positions[i + 1]);
    front.set(k, Math.max(front.get(k) ?? -9, g.positions[i + 2]));
  }
const breastXY = (p) => [hs * (p[0] - femMid), hs * p[1], hs * p[2]];
for (const g of BREAST.filter((g) => /adipose|mammary lobe/i.test(g.part.name)))
  for (let i = 0; i < g.positions.length; i += 3) {
    const [x, y, z] = breastXY(g.positions.slice(i, i + 3)),
      k = cell(x, y);
    back.set(k, Math.min(back.get(k) ?? 9, z));
  }
const gaps = [...back].filter(([k]) => front.has(k)).map(([k, z]) => front.get(k) - z);
gaps.sort((a, b) => a - b);
const dz = gaps[Math.floor(gaps.length * 0.5)] + 0.003; // median, plus a little fascia
log(
  `Breast fit: height scale ${hs.toFixed(3)}, depth shift ${(dz * 1000).toFixed(0)} mm (${gaps.length} cells)`,
);
const breast = {
  point: (p) => {
    const [x, y, z] = breastXY(p);
    return [x, y, z + dz];
  },
  normal: (n) => n,
};

// ---------------------------------------------------------------------------------------------
// Geometry helpers
const transformed = (g, t) => {
  const positions = new Float32Array(g.positions.length),
    normals = new Float32Array(g.normals.length);
  for (let i = 0; i < positions.length; i += 3) {
    positions.set(t.point(g.positions.slice(i, i + 3)), i);
    const n = t.normal(g.normals.slice(i, i + 3)),
      l = Math.hypot(...n) || 1;
    normals.set(
      n.map((v) => v / l),
      i,
    );
  }
  return { positions, normals, indices: g.indices };
};

/** Keeps the triangles whose three vertices pass `keep`, and drops unused vertices. */
function cut(g, keep) {
  const ok = new Uint8Array(g.positions.length / 3);
  for (let v = 0; v < ok.length; v++) ok[v] = keep(g.positions.slice(v * 3, v * 3 + 3)) ? 1 : 0;
  const tris = [];
  for (let t = 0; t < g.indices.length; t += 3)
    if (ok[g.indices[t]] && ok[g.indices[t + 1]] && ok[g.indices[t + 2]])
      tris.push(g.indices[t], g.indices[t + 1], g.indices[t + 2]);
  const remap = new Map(),
    pos = [],
    nor = [];
  const indices = Uint32Array.from(tris, (v) => {
    if (!remap.has(v)) {
      remap.set(v, remap.size);
      pos.push(...g.positions.slice(v * 3, v * 3 + 3));
      nor.push(...g.normals.slice(v * 3, v * 3 + 3));
    }
    return remap.get(v);
  });
  return { positions: Float32Array.from(pos), normals: Float32Array.from(nor), indices };
}

function recomputeNormals(g, only) {
  const acc = new Float32Array(g.positions.length),
    P = g.positions;
  for (let t = 0; t < g.indices.length; t += 3) {
    const [a, b, c] = [g.indices[t], g.indices[t + 1], g.indices[t + 2]];
    const e1 = [0, 1, 2].map((k) => P[b * 3 + k] - P[a * 3 + k]),
      e2 = [0, 1, 2].map((k) => P[c * 3 + k] - P[a * 3 + k]);
    const n = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) acc[v * 3 + k] += n[k];
  }
  for (let v = 0; v < P.length / 3; v++) {
    if (!only[v]) continue;
    const l = Math.hypot(acc[v * 3], acc[v * 3 + 1], acc[v * 3 + 2]);
    if (l) for (let k = 0; k < 3; k++) g.normals[v * 3 + k] = acc[v * 3 + k] / l;
  }
}

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------------------------
// 4. Body surface: remove the external male genitalia and give the chest the breast contour.
function reshapeSkin(g, breasts) {
  const P = Float32Array.from(g.positions),
    moved = new Uint8Array(P.length / 3);
  // Pubic contour, from the midline profile of the body surface just above the genitalia.
  const profile = (y0) => {
    let z = -9;
    for (let i = 0; i < P.length; i += 3)
      if (Math.abs(P[i]) < 0.02 && Math.abs(P[i + 1] - y0) < 0.004) z = Math.max(z, P[i + 2]);
    return z;
  };
  const top = 0.885,
    zTop = profile(top);
  // Mons pubis -> vulva -> perineum: the surface recedes smoothly toward the gap between thighs.
  const target = (x, y) => {
    const t = smooth(0.765, top, y);
    return zTop - 0.012 * (1 - t) - 0.075 * (1 - t) ** 2 - 25 * x * x;
  };
  let genital = 0;
  for (let v = 0; v < P.length / 3; v++) {
    const [x, y, z] = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
    if (y > top + 0.01 || y < 0.74 || Math.abs(x) > 0.075 || z < -0.03) continue;
    const w = (1 - smooth(0.045, 0.075, Math.abs(x))) * (1 - smooth(top - 0.01, top + 0.01, y));
    const zt = target(x, y);
    if (z > zt) {
      P[v * 3 + 2] = z - w * (z - zt);
      // the scrotum hangs below the perineum: draw it up toward the junction of the thighs,
      // compressing rather than clamping so no horizontal edge is left
      if (y < 0.8) P[v * 3 + 1] = y + w * 0.6 * (0.8 - y);
      moved[v] = 1;
      genital++;
    }
  }
  // Breasts: height map of their front surface; the skin is pushed out to cover it.
  const G = 0.004,
    key = (x, y) => `${Math.round(x / G)},${Math.round(y / G)}`,
    hmap = new Map();
  for (const b of breasts)
    for (let i = 0; i < b.positions.length; i += 3) {
      const k = key(b.positions[i], b.positions[i + 1]);
      hmap.set(k, Math.max(hmap.get(k) ?? -9, b.positions[i + 2]));
    }
  const near = (x, y, r) => {
    let z = -9;
    for (let i = -r; i <= r; i++)
      for (let j = -r; j <= r; j++) {
        const h = hmap.get(key(x + i * G, y + j * G));
        if (h !== undefined) z = Math.max(z, h - 0.35 * Math.hypot(i, j) * G);
      }
    return z;
  };
  let chest = 0;
  for (let v = 0; v < P.length / 3; v++) {
    const [x, y, z] = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
    if (g.normals[v * 3 + 2] < 0.15 || y < 1.1 || y > 1.42) continue;
    const zb = near(x, y, 3) + 0.0025;
    if (zb > z) {
      P[v * 3 + 2] = zb;
      moved[v] = 1;
      chest++;
    }
  }
  const out = { positions: P, normals: Float32Array.from(g.normals), indices: g.indices };
  // Recompute normals around every moved vertex (one ring is enough at this mesh density).
  const ring = Uint8Array.from(moved);
  for (let t = 0; t < g.indices.length; t += 3) {
    const tri = [g.indices[t], g.indices[t + 1], g.indices[t + 2]];
    if (tri.some((v) => moved[v])) for (const v of tri) ring[v] = 1;
  }
  recomputeNormals(out, ring);
  log(`Body surface: ${genital} vertices reshaped at the pelvis, ${chest} over the breasts`);
  return out;
}

// ---------------------------------------------------------------------------------------------
// 5. Assemble
const out = []; // { part, geometry }
const pelvicGeoms = new Map(PELVIC.map((g) => [g.part.id, transformed(g, pelvic)]));
const breastGeoms = new Map(BREAST.map((g) => [g.part.id, transformed(g, breast)]));

for (const g of M.parts.values()) {
  const id = g.part.id;
  if (MALE_ONLY.has(id)) continue;
  let geom = g,
    part = { ...g.part };
  if (GONADAL[id]) {
    // Same origin as the testicular vessels; the ovarian ones turn into the pelvis at its brim.
    geom = cut(g, (p) => p[1] > 0.95);
    part.name = GONADAL[id];
    part.conceptId = `HYB:${GONADAL[id].toLowerCase().replaceAll(' ', '-')}`;
  } else if (id === URETHRA) {
    continue; // replaced by the female urethra built in step 7
  } else if (id === SKIN) {
    geom = reshapeSkin(g, [...breastGeoms.values()]);
  }
  if (!geom.indices.length) throw new Error(`${id} lost all its triangles`);
  out.push({ part, geom });
}
for (const g of [...PELVIC, ...BREAST]) {
  const geom = pelvicGeoms.get(g.part.id) ?? breastGeoms.get(g.part.id);
  out.push({ part: { ...g.part }, geom });
}

// ---------------------------------------------------------------------------------------------
// 6. Female bony pelvis: deform the whole region (see pelvis-warp.mjs).
const maleLm = pelvisLandmarks(M.parts),
  maleM = measure(maleLm);
// Held fixed: both femoral heads (centre and six points on a 2 cm sphere, so they stay rigid), the
// greater trochanters and the fifth lumbar vertebra.
const fixed = [];
for (const s of [1, -1]) {
  const c = [s * maleLm.L.acetabulum[0], maleLm.L.acetabulum[1], maleLm.L.acetabulum[2]];
  fixed.push(c);
  for (let k = 0; k < 3; k++)
    for (const d of [0.02, -0.02]) fixed.push(c.map((v, i) => (i === k ? v + d : v)));
  const femur = M.parts.get(s > 0 ? 'FJ3259' : 'FJ3365').positions;
  let troch = null;
  for (let i = 0; i < femur.length; i += 3)
    if (femur[i + 1] > c[1] - 0.04 && (!troch || s * femur[i] > s * troch[0]))
      troch = Array.from(femur.slice(i, i + 3));
  fixed.push(troch);
}
fixed.push(centroid([M.parts.get('FJ3168')]));
const warp = femalePelvisWarp(maleLm, maleM, fixed);
let warped = 0,
  minDet = Infinity;
for (const o of out) {
  const g = o.geom,
    P = g.positions;
  let touched = false;
  for (let i = 0; i < P.length; i += 3) {
    const p = [P[i], P[i + 1], P[i + 2]];
    if (!warp.near(p)) continue;
    const q = warp.point(p);
    if (q[0] === p[0] && q[1] === p[1] && q[2] === p[2]) continue;
    if (!touched) {
      o.geom = {
        positions: Float32Array.from(P),
        normals: Float32Array.from(g.normals),
        indices: g.indices,
      };
      touched = true;
    }
    o.geom.positions.set(q, i);
    o.geom.normals.set(warp.normal(p, Array.from(g.normals.slice(i, i + 3))), i);
    if (i % 30 === 0) minDet = Math.min(minDet, warp.det(warp.jacobian(p)));
  }
  if (touched) warped++;
}
const femLm = pelvisLandmarks(
    new Map(out.map((o) => [o.part.id, o.geom])).set('FJ3259', M.parts.get('FJ3259')),
  ),
  femM = measure(femLm);
log(
  `Female pelvis: ${warp.controls} control points, ${warped} structures deformed, minimum Jacobian ${minDet.toFixed(2)}`,
);
log('  measurement       male  female  (target ratio)');
for (const k of Object.keys(maleM))
  log(
    `  ${k.padEnd(16)} ${String(maleM[k]).padStart(5)} ${String(femM[k]).padStart(6)}   ${RATIOS[k] ? '×' + RATIOS[k] + ' → ' + Math.round(maleM[k] * RATIOS[k]) : ''}`,
  );

// ---------------------------------------------------------------------------------------------
// 7. Vulva and female urethra (vulva.mjs), anchored to the finished pelvis and organs.
const geomOf = (id) => out.find((o) => o.part.id === id).geom;
const pointsOf = (id) => {
  const P = geomOf(id).positions,
    pts = [];
  for (let i = 0; i < P.length; i += 3) pts.push([P[i], P[i + 1], P[i + 2]]);
  return pts;
};
const lowest = (pts) => pts.reduce((a, p) => (p[1] < a[1] ? p : a));
const vaginaPts = pointsOf('VH_F_vagina'),
  analPts = [...pointsOf('FJ2548'), ...pointsOf('FJ1450M')];
const anchors = {
  sb: [0, femLm.L.symphysisBottom[1], femLm.L.symphysisBottom[2]],
  ramus: ramusEdge(geomOf('FJ3288'), femLm),
  bladderNeck: [0, ...lowest(pointsOf('FJ3149').filter((p) => Math.abs(p[0]) < 0.008)).slice(1)],
  vaginaLow: [0, ...lowest(vaginaPts).slice(1)],
  vaginaFront: (y) => {
    const near = vaginaPts.filter((p) => Math.abs(p[1] - y) < 0.004 && Math.abs(p[0]) < 0.01);
    return near.length ? Math.max(...near.map((p) => p[2])) : lowest(vaginaPts)[2] + 0.006;
  },
  anus: [0, lowest(analPts)[1], analPts.reduce((s, p) => s + p[2], 0) / analPts.length],
};
const vulva = buildVulva(anchors);
const skinOut = out.find((o) => o.part.id === SKIN),
  vskin = vulvaSkin(skinOut.geom, vulva.landmarks);
skinOut.geom = vskin.skin;
for (const v of [...vulva.parts, ...vskin.labia])
  out.push({
    part: {
      id: v.id,
      name: v.name,
      system: v.system,
      conceptId: `HYB:${v.name.toLowerCase().replaceAll(' ', '-')}`,
    },
    geom: v.geom,
  });
// Group concepts so the whole vulva and the clitoris can be searched for and isolated.
const vulvaGroups = [
  {
    id: 'HYB:clitoris',
    name: 'Clitoris',
    elements: vulva.parts.filter((v) => /clitoris/i.test(v.name)).map((v) => v.id),
  },
  {
    id: 'HYB:vulva',
    name: 'Vulva',
    elements: [...vulva.parts, ...vskin.labia]
      .filter((v) => /clitoris|labium|bulb|vestibular|vaginal orifice/i.test(v.name))
      .map((v) => v.id),
  },
];
const f3 = (p) => p.map((v) => (v * 1000).toFixed(0)).join('/');
log(
  `Vulva: ${vulva.parts.length + vskin.labia.length} structures; vestibule floor ${f3([vulva.landmarks.Vf])} mm, ` +
    `glans ${f3(vulva.landmarks.G)}, meatus ${f3(vulva.landmarks.U)}, orifice ${f3(vulva.landmarks.I)}, ` +
    `bladder neck ${f3(anchors.bladderNeck)}, vagina end ${f3(anchors.vaginaLow)}, anus ${f3(anchors.anus)}, ` +
    `${anchors.ramus.length} ramus points`,
);

// Concepts: male concepts without the removed parts, the HRA concepts of the imported parts, and
// one concept per renamed part.
const ids = new Set(out.map((o) => o.part.id));
const concepts = [];
const seen = new Set();
const addConcept = (c) => {
  const elements = c.elements.filter((e) => ids.has(e));
  if (!elements.length || seen.has(c.id)) return;
  seen.add(c.id);
  concepts.push({ ...c, elements });
};
M.manifest.concepts.forEach(addConcept);
F.manifest.concepts.filter((c) => c.name !== 'VH F').forEach(addConcept);
vulvaGroups.forEach(addConcept);
for (const { part } of out)
  if (part.conceptId.startsWith('HYB:'))
    addConcept({ id: part.conceptId, name: part.name, elements: [part.id] });
// Every part must belong to its concept.
for (const { part } of out) {
  const c = concepts.find((c) => c.id === part.conceptId);
  if (!c) addConcept({ id: part.conceptId, name: part.name, elements: [part.id] });
  else if (!c.elements.includes(part.id)) c.elements.push(part.id);
}

// ---------------------------------------------------------------------------------------------
// 6. Raw chunks in the optimizer's format (Float32 positions, Int16 normals, Uint32 indices)
for (const f of fs.readdirSync(modelsDir))
  if (/^female-.*\.(mesh\.gz|bin)$/.test(f)) fs.unlinkSync(new URL(f, modelsDir));
const RAW_CHUNK = 24_000_000,
  chunks = [],
  parts = [];
let segs = [],
  size = 0;
const flush = () => {
  if (!size) return;
  const file = `female-raw-${chunks.length}.bin`;
  fs.writeFileSync(new URL(file, modelsDir), Buffer.concat(segs));
  chunks.push({ url: `/models/${file}`, bytes: size });
  segs = [];
  size = 0;
};
const push = (typed) => {
  const off = size,
    b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength),
    pad = (4 - (b.length % 4)) % 4;
  segs.push(b, Buffer.alloc(pad));
  size += b.length + pad;
  return off;
};
let triangles = 0;
for (const { part, geom } of out) {
  if (size > RAW_CHUNK) flush();
  const n = geom.positions.length / 3,
    normals = Int16Array.from(geom.normals, (v) =>
      Math.round(Math.max(-1, Math.min(1, v)) * 32767),
    );
  const [lo, hi] = bounds(geom.positions);
  parts.push({
    ...part,
    chunk: chunks.length,
    positions: push(geom.positions),
    normals: push(normals),
    indices: push(geom.indices),
    vertexCount: n,
    indexCount: geom.indices.length,
    bounds: [lo, hi],
  });
  for (const k of ['positionsBytes', 'normalsBytes', 'indicesBytes']) delete parts.at(-1)[k];
  triangles += geom.indices.length / 3;
}
flush();

const manifest = {
  version: 'BodyParts3D 4.0 + HRA united-female v1.5',
  sex: 'female',
  source: 'BodyParts3D + Human Reference Atlas',
  scope: `Female reference anatomy · ${parts.length} source meshes`,
  parts,
  concepts,
  chunks,
  triangles,
  sourceTriangles: triangles,
  optimized: M.manifest.optimized,
  hybrid: {
    base: 'BodyParts3D 4.0 (adult male) without male-only structures',
    female: `${PELVIC.length + BREAST.length} meshes from HRA united-female v1.5`,
    pelvicFit: { tiltDegrees: fit.deg, scale: fit.scale, shift: fit.shift },
    breastFit: { heightScale: hs, depthShift: dz },
  },
};
fs.writeFileSync(new URL('atlas-female.json', modelsDir), JSON.stringify(manifest));
log(
  `atlas-female.json: ${parts.length} parts (${parts.filter((p) => p.id.startsWith('FJ')).length} BodyParts3D + ` +
    `${PELVIC.length + BREAST.length} HRA + ${parts.filter((p) => p.id.startsWith('HYB_')).length} generated), ` +
    `${concepts.length} concepts, ${triangles.toLocaleString()} triangles`,
);
