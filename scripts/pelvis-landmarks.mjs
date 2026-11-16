// Landmarks and standard measurements of the BodyParts3D bony pelvis, found from the geometry.
// Used by build-female-hybrid.mjs to reshape the pelvis and to report its measurements.
// Coordinates: metres, +X = left, +Y = up, +Z = anterior. Left-side landmarks; mirror X for right.

const verts = (g) => {
  const out = [];
  for (let i = 0; i < g.positions.length; i += 3)
    out.push([g.positions[i], g.positions[i + 1], g.positions[i + 2]]);
  return out;
};
const pick = (pts, filter, score) => {
  let best = null,
    bs = -Infinity;
  for (const p of pts)
    if (filter(p)) {
      const s = score(p);
      if (s > bs) {
        bs = s;
        best = p;
      }
    }
  if (!best) throw new Error('landmark not found');
  return best;
};
const mean = (pts) => [0, 1, 2].map((k) => pts.reduce((a, p) => a + p[k], 0) / pts.length);

/** @param parts Map id -> {positions} for the hip bones (FJ3288 left, FJ3152 right), sacrum (FJ3393) and left femur (FJ3259). */
export function pelvisLandmarks(parts) {
  const hipL = verts(parts.get('FJ3288')),
    hipR = verts(parts.get('FJ3152')),
    sacrum = verts(parts.get('FJ3393')),
    femur = verts(parts.get('FJ3259'));
  // Femoral head: the medial half of the top 5 cm of the femur.
  const top = Math.max(...femur.map((p) => p[1]));
  const upper = femur.filter((p) => p[1] > top - 0.05),
    xs = upper.map((p) => p[0]).sort((a, b) => a - b),
    xMed = xs[Math.floor(xs.length / 2)];
  const acetabulum = mean(upper.filter((p) => p[0] < xMed));
  const [ax, ay, az] = acetabulum;
  const sym = hipL.filter((p) => p[0] < 0.012 && p[2] > az);
  const L = {
    acetabulum,
    tuberosity: pick(
      hipL,
      () => true,
      (p) => -p[1],
    ),
    spine: pick(
      hipL,
      (p) => p[1] > ay - 0.045 && p[1] < ay - 0.005 && p[2] < az - 0.02,
      (p) => -p[0],
    ),
    symphysisTop: pick(
      sym,
      () => true,
      (p) => p[1],
    ),
    symphysisBottom: pick(
      sym,
      () => true,
      (p) => -p[1],
    ),
    asis: pick(
      hipL,
      (p) => p[1] > ay + 0.03,
      (p) => p[2],
    ),
    crestTop: pick(
      hipL,
      () => true,
      (p) => p[1],
    ),
    crestLateral: pick(
      hipL,
      () => true,
      (p) => p[0],
    ),
    psis: pick(
      hipL,
      (p) => p[1] > ay + 0.03 && p[0] < ax,
      (p) => -p[2],
    ),
    // Pelvic brim: most lateral point of the inner surface at the level of the arcuate line.
    brim: pick(
      hipL,
      (p) => Math.abs(p[1] - (ay + 0.03)) < 0.008 && p[0] < ax - 0.01,
      (p) => -Math.abs(p[2] - (az - 0.01)) - p[0],
    ),
  };
  // Ischiopubic ramus: medial edge of the pubic arch 60% of the way from the symphysis down to the
  // tuberosity.
  const yRamus = L.symphysisBottom[1] - 0.6 * (L.symphysisBottom[1] - L.tuberosity[1]);
  L.ramus = pick(
    hipL,
    (p) => Math.abs(p[1] - yRamus) < 0.003 && p[2] > az - 0.04,
    (p) => -p[0],
  );
  const sTop = Math.max(...sacrum.map((p) => p[1]));
  const S = {
    promontory: pick(
      sacrum,
      (p) => p[1] > sTop - 0.03 && Math.abs(p[0]) < 0.01,
      (p) => p[2],
    ),
    tip: pick(
      sacrum,
      () => true,
      (p) => -p[1],
    ),
    alaL: pick(
      sacrum,
      () => true,
      (p) => p[0],
    ),
    mid: pick(
      sacrum,
      (p) => Math.abs(p[0]) < 0.01 && Math.abs(p[1] - (sTop - 0.07)) < 0.01,
      (p) => -p[2],
    ),
  };
  return { L, S, hipR };
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Standard pelvimetry from the landmarks (mm and degrees). */
export function measure({ L, S }) {
  // Subpubic angle in the plane of the arch: apex at the lower border of the symphysis, sides to
  // the medial edges of the two ischiopubic rami (symmetric about the midline).
  const apex = [0, L.symphysisBottom[1], L.symphysisBottom[2]],
    v = L.ramus.map((x, k) => x - apex[k]),
    w = [-v[0], v[1], v[2]];
  const subpubic =
    (Math.acos((v[0] * w[0] + v[1] * w[1] + v[2] * w[2]) / (Math.hypot(...v) * Math.hypot(...w))) *
      180) /
    Math.PI;
  const mm = (v) => Math.round(v * 1000);
  return {
    intertuberous: mm(2 * L.tuberosity[0]),
    interspinous: mm(2 * L.spine[0]),
    inletTransverse: mm(2 * L.brim[0]),
    inletConjugate: mm(dist(S.promontory, [0, L.symphysisTop[1], L.symphysisTop[2]])),
    outletAP: mm(dist(S.tip, [0, L.symphysisBottom[1], L.symphysisBottom[2]])),
    subpubicAngle: Math.round(subpubic),
    symphysisHeight: mm(L.symphysisTop[1] - L.symphysisBottom[1]),
    interASIS: mm(2 * L.asis[0]),
    intercristal: mm(2 * L.crestLateral[0]),
    pelvicHeight: mm(L.crestTop[1] - L.tuberosity[1]),
    sacralWidth: mm(2 * S.alaL[0]),
    sacralLength: mm(dist(S.promontory, S.tip)),
  };
}
