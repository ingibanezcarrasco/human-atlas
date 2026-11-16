// Procedural female external genitalia and urethra for the hybrid female model.
//
// Neither source collection has them (HRA stops at the vagina; BodyParts3D is male), so they are
// generated as parametric meshes anchored to the finished model: the pubic symphysis and the
// ischiopubic rami (after the pelvis warp), the bladder neck, the lower end of the vagina and the
// anal canal. Sizes are typical adult values from anatomy textbooks; this is an educational
// approximation, not a model of a particular person.
//
// Coordinates: metres, +X = left, +Y = up, +Z = anterior.

const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, s) => a.map((v) => v * s);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => mul(a, 1 / (Math.hypot(...a) || 1));
const mirror = (p) => [-p[0], p[1], p[2]];
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Uniform Catmull-Rom spline through `pts`, `n` samples. */
export function spline(pts, n) {
  const P = [sub(mul(pts[0], 2), pts[1]), ...pts, sub(mul(pts.at(-1), 2), pts.at(-2))];
  const out = [];
  for (let s = 0; s < n; s++) {
    const u = (s / (n - 1)) * (pts.length - 1),
      i = Math.min(Math.floor(u), pts.length - 2),
      t = u - i;
    const [p0, p1, p2, p3] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
    out.push(
      [0, 1, 2].map(
        (k) =>
          0.5 *
          (2 * p1[k] +
            (-p0[k] + p2[k]) * t +
            (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t +
            (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t),
      ),
    );
  }
  return out;
}

class MeshBuilder {
  constructor() {
    this.p = [];
    this.n = [];
    this.i = [];
  }
  vertex(p, n) {
    this.p.push(...p);
    this.n.push(...norm(n));
    return this.p.length / 3 - 1;
  }
  tri(a, b, c) {
    this.i.push(a, b, c);
  }
  /** Flip triangles whose winding disagrees with their vertex normals (outward faces). */
  orient() {
    const P = this.p,
      N = this.n;
    for (let t = 0; t < this.i.length; t += 3) {
      const [a, b, c] = this.i.slice(t, t + 3);
      const e1 = [0, 1, 2].map((k) => P[b * 3 + k] - P[a * 3 + k]),
        e2 = [0, 1, 2].map((k) => P[c * 3 + k] - P[a * 3 + k]);
      const fn = cross(e1, e2),
        vn = [0, 1, 2].map((k) => N[a * 3 + k] + N[b * 3 + k] + N[c * 3 + k]);
      if (dot(fn, vn) < 0) [this.i[t + 1], this.i[t + 2]] = [c, b];
    }
    return this;
  }
  geometry() {
    this.orient();
    return {
      positions: Float32Array.from(this.p),
      normals: Float32Array.from(this.n),
      indices: Uint32Array.from(this.i),
    };
  }
}

/**
 * Tube along `path` with an elliptical cross-section. `radius(t)` returns [a, b]: `a` along the
 * lateral axis (world X projected off the tangent), `b` along tangent × lateral.
 */
export function tube(path, radius, { segments = 18, lateral = [1, 0, 0], caps = true } = {}) {
  const m = new MeshBuilder(),
    rings = [];
  path.forEach((c, j) => {
    const t = j / (path.length - 1),
      T = norm(sub(path[Math.min(j + 1, path.length - 1)], path[Math.max(j - 1, 0)]));
    let X = sub(lateral, mul(T, dot(lateral, T)));
    if (Math.hypot(...X) < 1e-6)
      X = Math.abs(T[1]) < 0.9 ? cross(T, [0, 1, 0]) : cross(T, [1, 0, 0]);
    X = norm(X);
    const Y = cross(T, X),
      [a, b] = radius(t);
    const ring = [];
    for (let s = 0; s < segments; s++) {
      const th = (s / segments) * 2 * Math.PI,
        cs = Math.cos(th),
        sn = Math.sin(th);
      ring.push(
        m.vertex(add(c, add(mul(X, a * cs), mul(Y, b * sn))), add(mul(X, cs / a), mul(Y, sn / b))),
      );
    }
    rings.push({ ring, c, T });
  });
  for (let j = 0; j + 1 < rings.length; j++)
    for (let s = 0; s < segments; s++) {
      const a = rings[j].ring[s],
        b = rings[j].ring[(s + 1) % segments],
        c = rings[j + 1].ring[s],
        d = rings[j + 1].ring[(s + 1) % segments];
      m.tri(a, b, d);
      m.tri(a, d, c);
    }
  if (caps)
    for (const [r, sign] of [
      [rings[0], -1],
      [rings.at(-1), 1],
    ]) {
      const centre = m.vertex(r.c, mul(r.T, sign));
      // cap rim vertices get their own copies so the cap stays flat-shaded
      const rim = r.ring.map((v) => m.vertex(m.p.slice(v * 3, v * 3 + 3), mul(r.T, sign)));
      for (let s = 0; s < segments; s++) m.tri(centre, rim[s], rim[(s + 1) % segments]);
    }
  return m.geometry();
}

/** Ellipsoid with radii along the given orthonormal axes (default: world axes). */
export function ellipsoid(
  c,
  r,
  axes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  { rings = 12, segments = 18 } = {},
) {
  const m = new MeshBuilder(),
    idx = [];
  for (let i = 0; i <= rings; i++) {
    const v = (i / rings) * Math.PI,
      row = [];
    for (let s = 0; s < segments; s++) {
      const u = (s / segments) * 2 * Math.PI,
        unit = [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)];
      const p = add(
        c,
        add(
          add(mul(axes[0], r[0] * unit[0]), mul(axes[1], r[1] * unit[1])),
          mul(axes[2], r[2] * unit[2]),
        ),
      );
      const n = add(
        add(mul(axes[0], unit[0] / r[0]), mul(axes[1], unit[1] / r[1])),
        mul(axes[2], unit[2] / r[2]),
      );
      row.push(m.vertex(p, n));
    }
    idx.push(row);
  }
  for (let i = 0; i < rings; i++)
    for (let s = 0; s < segments; s++) {
      const a = idx[i][s],
        b = idx[i][(s + 1) % segments],
        c2 = idx[i + 1][s],
        d = idx[i + 1][(s + 1) % segments];
      if (i > 0) m.tri(a, b, d);
      if (i < rings - 1) m.tri(a, d, c2);
    }
  return m.geometry();
}

// ---------------------------------------------------------------------------------------------

/** Medial edge of the left ischiopubic ramus, from the symphysis down to the tuberosity. */
export function ramusEdge(hipL, lm) {
  const P = hipL.positions,
    { symphysisBottom: sb, tuberosity: tb, acetabulum: ac } = lm.L,
    edge = [];
  for (let y = sb[1]; y >= tb[1] + 0.003; y -= 0.003) {
    let best = null;
    for (let i = 0; i < P.length; i += 3)
      if (
        Math.abs(P[i + 1] - y) < 0.0025 &&
        P[i + 2] > ac[2] - 0.045 &&
        P[i] > 0.004 &&
        (!best || P[i] < best[0])
      )
        best = [P[i], P[i + 1], P[i + 2]];
    if (best) edge.push(best);
  }
  return edge;
}

/**
 * @param a anchors: sb (symphysis lower border, midline), ramus (left medial ramus edge polyline),
 *   bladderNeck, vaginaLow (lowest point of the vagina), vaginaFront(y) -> z of its anterior wall,
 *   anus (lower centre of the external anal sphincter)
 * @returns {{ parts: {id, name, system, geom}[], landmarks: object }}
 */
export function buildVulva(a) {
  // Midline landmarks of the vestibule, from front to back.
  const Vf = a.vaginaLow[1] - 0.02; // vestibule floor: ~2 cm below the pelvic floor hiatus
  const I = [0, Vf, a.vaginaLow[2]]; // vaginal orifice, under the lower end of the vagina
  const U = [0, Vf + 0.001, I[2] + 0.016]; // external urethral orifice, ~1.6 cm in front of it
  const G = [0, Vf + 0.003, a.sb[2] + 0.014]; // glans of the clitoris, below/in front of the symphysis
  const P = [0, Vf + 0.002, I[2] - 0.016]; // posterior commissure (fourchette)
  const root = [0, a.sb[1] - 0.009, a.sb[2] - 0.003]; // where the body divides into the crura
  const parts = [];
  const part = (id, name, system, geom) => parts.push({ id: `HYB_${id}`, name, system, geom });

  // Female urethra: ~4 cm, from the bladder neck along the anterior vaginal wall to the meatus.
  const midY = (a.bladderNeck[1] + U[1]) / 2;
  const urethraPath = spline(
    [
      add(a.bladderNeck, [0, 0.004, 0]),
      a.bladderNeck,
      [0, midY, a.vaginaFront(midY) + 0.006],
      add(U, [0, 0.004, 0.001]),
      U,
    ],
    28,
  );
  part(
    'female_urethra',
    'Female urethra',
    'urinary',
    tube(urethraPath, (t) => [0.0032 - 0.0008 * t, 0.0028 - 0.0006 * t]),
  );

  // Lower vagina and vaginal orifice: from the HRA vagina down to the vestibule (flattened tube).
  const vagPath = spline(
    [add(a.vaginaLow, [0, 0.006, 0]), a.vaginaLow, add(I, [0, 0.004, 0.001]), I],
    16,
  );
  part(
    'vaginal_orifice',
    'Vaginal orifice',
    'reproductive',
    tube(vagPath, (t) => [0.0105 - 0.002 * t, 0.0055 - 0.001 * t]),
  );

  // Clitoris: glans, body (bent at the angle) and the two crura along the ischiopubic rami.
  part(
    'glans_clitoris',
    'Glans of clitoris',
    'reproductive',
    ellipsoid(G, [0.0035, 0.004, 0.0045]),
  );
  const bodyPath = spline([G, add(G, [0, 0.006, -0.004]), add(root, [0, -0.002, 0.004]), root], 18);
  part(
    'body_clitoris',
    'Body of clitoris',
    'reproductive',
    tube(bodyPath, (t) => [0.0036 + 0.0008 * t, 0.0034 + 0.0008 * t]),
  );
  // Crus: on the inner, lower edge of the ramus (2-3 mm medial and below the bone).
  const ramus = a.ramus.map((p) => add(p, [-0.003, -0.003, 0]));
  const crusLen = 0.055;
  const crusPts = [root, add(root, [0.006, -0.002, -0.002])];
  let len = 0;
  for (let i = 1; i < ramus.length && len < crusLen; i++) {
    len += Math.hypot(...sub(ramus[i], ramus[i - 1]));
    if (ramus[i][0] > crusPts.at(-1)[0] + 0.004) crusPts.push(ramus[i]);
  }
  const crusPath = spline(crusPts, 30);
  const crusR = (t) => {
    const r = 0.0042 * (1 - 0.55 * t);
    return [r, r];
  };
  part('crus_clitoris_L', 'Left crus of clitoris', 'reproductive', tube(crusPath, crusR));
  part(
    'crus_clitoris_R',
    'Right crus of clitoris',
    'reproductive',
    tube(crusPath.map(mirror), crusR),
  );

  // Bulbs of the vestibule: from beside the root of the clitoris back along the vestibule,
  // thicker behind. Greater vestibular glands at their posterior ends.
  const bulbPath = spline(
    [
      add(root, [0.006, -0.004, -0.002]),
      [0.011, Vf + 0.006, U[2]],
      [0.013, Vf + 0.005, I[2]],
      [0.012, Vf + 0.004, P[2] + 0.004],
    ],
    24,
  );
  const bulbR = (t) => {
    const r = 0.0015 + 0.0055 * Math.sin(Math.PI * (0.12 + 0.82 * t)) ** 0.8 * (0.6 + 0.4 * t);
    return [r * 0.75, r];
  };
  part('bulb_vestibule_L', 'Left bulb of vestibule', 'reproductive', tube(bulbPath, bulbR));
  part(
    'bulb_vestibule_R',
    'Right bulb of vestibule',
    'reproductive',
    tube(bulbPath.map(mirror), bulbR),
  );
  const glandC = [0.012, Vf + 0.002, P[2] + 0.001];
  part(
    'greater_vestibular_gland_L',
    'Left greater vestibular gland',
    'reproductive',
    ellipsoid(glandC, [0.004, 0.0035, 0.006]),
  );
  part(
    'greater_vestibular_gland_R',
    'Right greater vestibular gland',
    'reproductive',
    ellipsoid(mirror(glandC), [0.004, 0.0035, 0.006]),
  );

  // Labia minora: thin folds hanging from the margins of the vestibule, joined in front as the
  // prepuce over the glans and behind at the fourchette.
  const minusPath = spline(
    [
      add(G, [0.001, 0.003, 0.006]),
      [0.006, Vf, G[2] - 0.004],
      [0.009, Vf, U[2]],
      [0.009, Vf, I[2]],
      [0.004, Vf, P[2] + 0.002],
      add(P, [0.001, 0, -0.002]),
    ],
    40,
  );
  const minusR = (t) => {
    const h = 0.003 + 0.015 * Math.sin(Math.PI * t) ** 0.7; // fold height
    return [0.0016, h / 2];
  };
  // centre the fold below its attachment line
  const hang = (path) =>
    path.map((p, j) => {
      const t = j / (path.length - 1),
        h = 0.003 + 0.015 * Math.sin(Math.PI * t) ** 0.7;
      return add(p, [0, -h / 2 + 0.001, 0]);
    });
  part(
    'labium_minus_L',
    'Left labium minus',
    'reproductive',
    tube(hang(minusPath), minusR, { segments: 14 }),
  );
  part(
    'labium_minus_R',
    'Right labium minus',
    'reproductive',
    tube(hang(minusPath.map(mirror)), minusR, { segments: 14 }),
  );

  // Perineal body: between the fourchette and the anal canal.
  const pb = [0, (Vf + a.anus[1]) / 2 + 0.004, (P[2] + a.anus[2]) / 2];
  part('perineal_body', 'Perineal body', 'connective', ellipsoid(pb, [0.009, 0.008, 0.007]));

  return {
    parts,
    landmarks: { Vf, I, U, G, P, root, pb },
    shape: { crusPath, crusR, bulbPath, bulbR, urethraPath, vagPath },
  };
}

/**
 * Superficial muscles of the urogenital triangle, around the structures built by buildVulva:
 * ischiocavernosus over each crus (from the ischial tuberosity and ramus), bulbospongiosus over the
 * lateral surface of each bulb (from the perineal body to the body of the clitoris), and the
 * superficial transverse perineal muscle (from the tuberosity to the perineal body).
 * @param a anchors (needs `tuberosity`, the lowest point of the left ischial tuberosity)
 * @param v result of buildVulva
 */
export function perinealMuscles(a, v) {
  const { crusPath, crusR, bulbPath, bulbR } = v.shape,
    { pb, root } = v.landmarks;
  const parts = [];
  const pair = (id, name, geomL) => {
    parts.push({ id: `HYB_${id}_L`, name: `Left ${name}`, system: 'muscular', geom: geomL(1) });
    parts.push({ id: `HYB_${id}_R`, name: `Right ${name}`, system: 'muscular', geom: geomL(-1) });
  };
  const side = (p, s) => (s > 0 ? p : mirror(p));
  // Medial face of the tuberosity, a little above its lowest point.
  const tbMed = add(a.tuberosity, [-0.007, 0.01, 0.006]);

  // Ischiocavernosus: a sleeve over the crus from 20 % of its length, continued as a tapering
  // origin to the tuberosity. Concentric with the crus, 1.6 mm thicker.
  const j0 = Math.round(0.2 * (crusPath.length - 1));
  const sleeve = crusPath.slice(j0),
    tOf = sleeve.map((_, j) => (j0 + j) / (crusPath.length - 1));
  const end = sleeve.at(-1),
    ext = [];
  for (let k = 1; k <= 6; k++) ext.push(add(end, mul(sub(tbMed, end), k / 6)));
  const icPath = [...sleeve, ...ext];
  const icR = (t) => {
    const j = Math.round(t * (icPath.length - 1));
    if (j < sleeve.length) {
      const [r] = crusR(tOf[j]);
      return [r + 0.0016, r + 0.0016];
    }
    const k = (j - sleeve.length + 1) / ext.length,
      r = crusR(1)[0] + 0.0016;
    return [r * (1 - 0.55 * k), r * (1 - 0.3 * k)];
  };
  pair('ischiocavernosus', 'ischiocavernosus', (s) =>
    tube(
      icPath.map((p) => side(p, s)),
      icR,
    ),
  );

  // Bulbospongiosus: a band against the lateral surface of the bulb, from the side of the perineal
  // body to the body of the clitoris.
  const nb = bulbPath.length - 1;
  const offBulb = (t) => {
    const p = bulbPath[Math.round(t * nb)],
      [ra] = bulbR(t);
    return add(p, [ra + 0.0019, -0.0005, 0]);
  };
  const bsPath = spline(
    [
      [0.007, pb[1] + 0.001, pb[2] + 0.004],
      offBulb(1),
      offBulb(0.7),
      offBulb(0.4),
      offBulb(0.12),
      [0.0055, root[1] - 0.001, root[2] + 0.005],
    ],
    36,
  );
  const bsR = (t) => [0.0015, 0.0018 + 0.0065 * Math.sin(Math.PI * t) ** 0.6];
  pair('bulbospongiosus', 'bulbospongiosus', (s) =>
    tube(
      bsPath.map((p) => side(p, s)),
      bsR,
    ),
  );

  // Superficial transverse perineal muscle: a thin strap from the tuberosity to the perineal body.
  const stpPath = spline(
    [tbMed, add(mul(add(tbMed, pb), 0.5), [0, -0.002, 0.002]), [0.008, pb[1], pb[2]]],
    16,
  );
  const stpR = (t) => [0.0042 - 0.0012 * t, 0.0022 - 0.0004 * t];
  pair('superficial_transverse_perineal', 'superficial transverse perineal muscle', (s) =>
    tube(
      stpPath.map((p) => side(p, s)),
      stpR,
      { lateral: [0, 0, 1] },
    ),
  );
  return { parts, landmarks: { tbMed } };
}

/**
 * Deep perineal plane (deep perineal pouch): the perineal membrane, a sheet stretched between the
 * ischiopubic rami with openings for the urethra and the vagina, and the muscles just above it:
 * external urethral sphincter, compressor urethrae, sphincter urethrovaginalis and deep transverse
 * perineal muscles.
 * @param a anchors (needs `ramus` and `tuberosity`)
 * @param v result of buildVulva
 * @param m result of perinealMuscles
 */
export function deepPerineum(a, v, m) {
  const { urethraPath, vagPath } = v.shape,
    { pb, root } = v.landmarks,
    { tbMed } = m.landmarks;
  const parts = [];
  const part = (id, name, system, geom) => parts.push({ id: `HYB_${id}`, name, system, geom });
  const pair = (id, name, geomOf) => {
    part(`${id}_L`, `Left ${name}`, 'muscular', geomOf(1));
    part(`${id}_R`, `Right ${name}`, 'muscular', geomOf(-1));
  };
  const lerp = (x0, x1, t) => x0 + (x1 - x0) * t;

  // Medial edge of the ramus as functions of z (the polyline runs from the symphysis backwards).
  // The detected edge stops partway down the ramus; continue it to the tuberosity.
  const ramus = [...a.ramus, add(tbMed, [0.001, -0.002, 0])].sort((p, q) => q[2] - p[2]);
  const along = (z, k) => {
    if (z >= ramus[0][2]) return ramus[0][k];
    for (let i = 1; i < ramus.length; i++)
      if (z >= ramus[i][2]) {
        const t = (z - ramus[i - 1][2]) / (ramus[i][2] - ramus[i - 1][2]);
        return lerp(ramus[i - 1][k], ramus[i][k], t);
      }
    return lerp(ramus.at(-1)[k], tbMed[k], 1);
  };
  // Outline: from just behind the symphysis (transverse perineal ligament) back to a posterior
  // border that runs from each tuberosity to the perineal body.
  const zFront = root[2] - 0.006,
    zt = tbMed[2],
    xt = tbMed[0] - 0.002,
    zMid = pb[2] + 0.007;
  const halfWidth = (z) => {
    const xr = z >= ramus.at(-1)[2] ? along(z, 0) : lerp(ramus.at(-1)[0], xt, 1);
    if (z >= zt) return Math.min(xr, xt) - 0.001;
    return Math.min(xt * ((z - zMid) / (zt - zMid)) ** (1 / 1.5), xt);
  };
  // Height: on the inner edge of the ramus, 2 mm above it (just above the crura), sloping to the
  // top of the perineal body behind the tuberosities.
  const yt = along(zt, 1) + 0.002;
  const height = (z) =>
    z >= zt ? along(z, 1) + 0.002 : lerp(yt, pb[1] + 0.006, (zt - z) / (zt - zMid));

  // Where the urethra and the vagina pierce the membrane.
  const cross = (path) =>
    path.reduce((b, p) => (Math.abs(p[1] - height(p[2])) < Math.abs(b[1] - height(b[2])) ? p : b));
  const uX = cross(urethraPath),
    vX = cross(vagPath);
  const holes = [
    { c: uX, r: [0.0045, 0.0045] },
    { c: vX, r: [0.012, 0.0065] },
  ];
  const inHole = (x, z) =>
    holes.some(({ c, r }) => ((x - c[0]) / r[0]) ** 2 + ((z - c[2]) / r[1]) ** 2 < 1);

  {
    const mb = new MeshBuilder(),
      NU = 40,
      zs = [];
    for (let z = zFront; z >= zMid; z -= 0.0012) zs.push(z);
    const grid = zs.map((z) => {
      const w = halfWidth(z);
      return Array.from({ length: NU + 1 }, (_, i) => {
        const x = (2 * i) / NU - 1;
        return mb.vertex([x * w, height(z) + 0.0015 * (1 - x * x), z], [0, 1, 0]);
      });
    });
    const P = mb.p;
    for (let j = 0; j + 1 < zs.length; j++)
      for (let i = 0; i < NU; i++) {
        const q = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
        const cx = q.reduce((s, k) => s + P[k * 3], 0) / 4,
          cz = q.reduce((s, k) => s + P[k * 3 + 2], 0) / 4;
        if (inHole(cx, cz)) continue;
        mb.tri(q[0], q[1], q[2]);
        mb.tri(q[0], q[2], q[3]);
      }
    part('perineal_membrane', 'Perineal membrane', 'connective', mb.geometry());
  }

  // External urethral sphincter: a sleeve around the middle third of the urethra, above the
  // membrane.
  const ju = urethraPath.indexOf(uX),
    eus = [uX];
  for (let j = ju - 1, len = 0; j >= 1 && len < 0.015; j--) {
    len += Math.hypot(...sub(urethraPath[j], urethraPath[j + 1]));
    eus.unshift(urethraPath[j]);
  }
  part(
    'external_urethral_sphincter',
    'External urethral sphincter',
    'muscular',
    tube(eus, (t) => [0.0058 - 0.0006 * t, 0.0052 - 0.0006 * t]),
  );

  // Compressor urethrae: an arch from one ramus to the other over the front of the urethra, just
  // above the membrane and below the sphincter.
  const zc = uX[2] + 0.002,
    yc = height(zc) + 0.0035,
    wc = halfWidth(zc) - 0.002;
  const compPath = spline(
    [
      [wc, height(zc) + 0.002, zc - 0.004],
      [wc * 0.5, yc, zc + 0.002],
      [0, yc + 0.001, uX[2] + 0.0075],
      [-wc * 0.5, yc, zc + 0.002],
      [-wc, height(zc) + 0.002, zc - 0.004],
    ],
    40,
  );
  part(
    'compressor_urethrae',
    'Compressor urethrae',
    'muscular',
    tube(compPath, (t) => [0.0022, 0.0035 - 0.0012 * Math.abs(2 * t - 1)], {
      lateral: [0, 1, 0],
    }),
  );

  // Sphincter urethrovaginalis: a loop in front of the urethra that runs back along both sides of
  // the vagina to the perineal body.
  const yv = (z) => height(z) + 0.003;
  const svPath = spline(
    [
      [0.006, pb[1] + 0.004, pb[2] + 0.006],
      [0.014, yv(vX[2] - 0.006), vX[2] - 0.006],
      [0.0145, yv(vX[2] + 0.004), vX[2] + 0.004],
      [0.008, yv(uX[2] - 0.002), uX[2] - 0.002],
      [0, yv(uX[2] + 0.006) + 0.001, uX[2] + 0.0065],
      [-0.008, yv(uX[2] - 0.002), uX[2] - 0.002],
      [-0.0145, yv(vX[2] + 0.004), vX[2] + 0.004],
      [-0.014, yv(vX[2] - 0.006), vX[2] - 0.006],
      [-0.006, pb[1] + 0.004, pb[2] + 0.006],
    ],
    60,
  );
  part(
    'sphincter_urethrovaginalis',
    'Sphincter urethrovaginalis',
    'muscular',
    tube(svPath, () => [0.0018, 0.0026], { lateral: [0, 1, 0] }),
  );

  // Deep transverse perineal muscle: from the inner surface of the ramus near the tuberosity to
  // the perineal body and the lateral wall of the vagina, just above the membrane.
  const zd = zt + 0.004;
  const dtpPath = spline(
    [
      [halfWidth(zd) - 0.002, height(zd) + 0.0045, zd],
      [0.026, height(lerp(zd, pb[2] + 0.008, 0.5)) + 0.005, lerp(zd, pb[2] + 0.008, 0.5)],
      [0.01, height(pb[2] + 0.008) + 0.005, pb[2] + 0.008],
    ],
    20,
  );
  pair('deep_transverse_perineal', 'deep transverse perineal muscle', (s) =>
    tube(
      dtpPath.map((p) => (s > 0 ? p : mirror(p))),
      (t) => [0.0045 - 0.0015 * t, 0.0016],
      { lateral: [0, 0, 1] },
    ),
  );

  return { parts, landmarks: { urethraCross: uX, vaginaCross: vX, zFront, zMid } };
}

/**
 * Replaces the genital region of the body surface with a female one: the labia majora either side
 * of the pudendal cleft, which rises to the vestibule; joins the existing skin at the edges.
 * @returns {{ skin: geom, labia: {id, name, system, geom}[] }}
 */
export function vulvaSkin(skin, lm, { xMax = 0.032 } = {}) {
  const { Vf, G, P } = lm;
  const zAnt = G[2] + 0.022,
    zPost = P[2] - 0.013;
  const P0 = skin.positions,
    N0 = skin.normals;
  const inside = (x, z) => Math.abs(x) < xMax && z > zPost && z < zAnt;
  // 1. Remove the old surface inside the region (between the thighs, above their junction).
  const keep = [];
  for (let t = 0; t < skin.indices.length; t += 3) {
    const tri = [skin.indices[t], skin.indices[t + 1], skin.indices[t + 2]];
    const c = [0, 1, 2].map((k) => tri.reduce((s, v) => s + P0[v * 3 + k], 0) / 3);
    if (inside(c[0], c[2]) && c[1] > 0.772 && c[1] < 0.87) continue;
    keep.push(...tri);
  }
  const newSkin = { positions: P0, normals: N0, indices: Uint32Array.from(keep) };

  // Height of the skin that stays, just outside the region, so the new surface joins it: the top
  // of the kept surface (where the inner thighs meet the floor) near each point of the border.
  const used = new Uint8Array(P0.length / 3);
  for (const v of keep) used[v] = 1;
  const C = 0.004,
    hkey = (x, z) => `${Math.round(x / C)},${Math.round(z / C)}`,
    hmap = new Map();
  for (let v = 0; v < used.length; v++) {
    const [x, y, z] = [P0[v * 3], P0[v * 3 + 1], P0[v * 3 + 2]];
    if (!used[v] || y < 0.74 || y > 0.86 || inside(x, z)) continue;
    if (Math.abs(x) > xMax + 0.012 || z < zPost - 0.012 || z > zAnt + 0.012) continue;
    const k = hkey(x, z);
    hmap.set(k, Math.max(hmap.get(k) ?? -9, y));
  }
  const H = (x, z) => {
    for (let r = 1; r < 8; r++) {
      let s = 0,
        n = 0;
      for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++) {
          const h = hmap.get(hkey(x + i * C, z + j * C));
          if (h !== undefined) {
            s += h;
            n++;
          }
        }
      if (n) return s / n;
    }
    return Vf - 0.02;
  };

  // 2. Designed surface: labia majora as rounded folds, the cleft between them.
  const len = zAnt - zPost;
  const surface = (x, z) => {
    const u = (z - zPost) / len; // 0 at the back, 1 in front
    const along = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 0.6;
    const cleft = 0.0015 + 0.004 * along; // half-width of the pudendal cleft
    const bottom = Vf - 0.004 - 0.02 * along; // lowest line of the labia majora
    const crest = cleft + 0.009; // where each labium is lowest
    const ax = Math.abs(x);
    let y;
    if (ax < cleft) y = Vf - 0.001 - (Vf - 0.001 - (bottom + 0.004)) * smooth(0, cleft, ax) ** 2;
    else if (ax < crest) y = bottom + 0.004 * ((crest - ax) / (crest - cleft)) ** 2;
    else y = bottom + 0.9 * (ax - crest) ** 2 * 60;
    // blend into the existing skin toward the edges of the region
    const edge = Math.min(xMax - ax, (z - zPost) * 0.6, (zAnt - z) * 0.6);
    const w = smooth(0, 0.007, edge);
    return w * y + (1 - w) * H(x, z);
  };
  const xs = [];
  for (let x = 0; x <= xMax + 1e-9;) {
    xs.push(x);
    x += x < 0.008 ? 0.0005 : 0.0015;
  }
  const zs = [];
  for (let z = zPost; z <= zAnt + 1e-9; z += 0.0015) zs.push(z);
  const labium = (side) => {
    const m = new MeshBuilder(),
      grid = zs.map((z) => xs.map((x) => [side * x, surface(side * x, z), z]));
    const ids = grid.map((row, j) =>
      row.map((p, i) => {
        const dx =
          (surface(side * (xs[Math.min(i + 1, xs.length - 1)] + 1e-4), zs[j]) -
            surface(side * Math.max(0, xs[i] - 1e-4), zs[j])) /
          (Math.min(xs[i] + 1e-4, xs.at(-1)) - Math.max(0, xs[i] - 1e-4) || 1e-4);
        const dz =
          (surface(side * xs[i], zs[Math.min(j + 1, zs.length - 1)]) -
            surface(side * xs[i], zs[Math.max(j - 1, 0)])) /
          (zs[Math.min(j + 1, zs.length - 1)] - zs[Math.max(j - 1, 0)] || 1e-4);
        return m.vertex(p, [side * dx, -1, dz]); // facing down/out
      }),
    );
    for (let j = 0; j + 1 < zs.length; j++)
      for (let i = 0; i + 1 < xs.length; i++) {
        m.tri(ids[j][i], ids[j][i + 1], ids[j + 1][i + 1]);
        m.tri(ids[j][i], ids[j + 1][i + 1], ids[j + 1][i]);
      }
    return m.geometry();
  };
  return {
    skin: newSkin,
    labia: [
      {
        id: 'HYB_labium_majus_L',
        name: 'Left labium majus',
        system: 'integumentary',
        geom: labium(1),
      },
      {
        id: 'HYB_labium_majus_R',
        name: 'Right labium majus',
        system: 'integumentary',
        geom: labium(-1),
      },
    ],
  };
}
