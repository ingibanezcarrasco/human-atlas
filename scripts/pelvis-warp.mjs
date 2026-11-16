// Smooth space deformation that turns the BodyParts3D (male) bony pelvis into a female one.
//
// Control points are pelvic landmarks (pelvis-landmarks.mjs). Each gets a displacement that moves a
// standard measurement toward typical female/male proportions from anatomy textbooks; the hip joints,
// femora and fifth lumbar vertebra are held fixed so the legs and spine do not move. The field is
// interpolated with compactly supported Wendland C2 radial functions, so it is smooth and fades to
// zero a few centimetres away from the pelvis. It is applied to every structure in the region
// (bones, muscles, vessels, organs, body surface) so attachments stay attached.
//
// Female/male ratios used (typical textbook proportions, applied to this model's own measurements):
//   outlet: intertuberous ×1.25, interspinous ×1.20, outlet AP ×1.10 (coccyx further back)
//   inlet: transverse ×1.08, conjugate ×1.06; pubic arch wider; symphysis height ×0.85
//   iliac wings lower and a little more flared: pelvic height ×0.95, intercristal and inter-ASIS ×1.02
//   sacrum wider and shorter: width ×1.06, length ×0.92
// It is an educational approximation, not a model of a particular female pelvis.

export const RATIOS = {
  intertuberous: 1.25,
  interspinous: 1.2,
  outletAP: 1.1,
  inletTransverse: 1.08,
  inletConjugate: 1.06,
  symphysisHeight: 0.85,
  pelvicHeight: 0.95,
  intercristal: 1.02,
  interASIS: 1.02,
  sacralWidth: 1.06,
  sacralLength: 0.92,
};

const RADIUS = 0.08;
// Neighbouring control points interact, so a few displacements need a gain for the measured result
// to reach its target (calibrated against the measurements build-female-hybrid.mjs prints).
const GAIN = { inletConjugate: 2, symphysisHeight: 0.4, sacralLength: 1.4, outletAP: 0.45 };
const wendland = (r) => (r >= 1 ? 0 : (1 - r) ** 4 * (4 * r + 1));
const mirror = (p) => [-p[0], p[1], p[2]];

function solve(A, B) {
  // Gaussian elimination with partial pivoting; B has 3 columns.
  const n = A.length,
    M = A.map((row, i) => [...row, ...B[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < n + 3; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => [row[n] / row[i], row[n + 1] / row[i], row[n + 2] / row[i]]);
}

/** @param lm landmarks from pelvisLandmarks(); @param m measurements from measure() (mm) */
export function femalePelvisWarp(lm, m, fixed) {
  const { L, S } = lm;
  const half = (key) => ((RATIOS[key] - 1) * m[key]) / 2000; // lateral shift per side, metres
  const lower = (1 - RATIOS.pelvicHeight) * (m.pelvicHeight / 1000);
  const symDrop = GAIN.symphysisHeight * (1 - RATIOS.symphysisHeight) * (m.symphysisHeight / 1000);
  const conj = (GAIN.inletConjugate * (RATIOS.inletConjugate - 1) * m.inletConjugate) / 1000;
  const outAP = (GAIN.outletAP * (RATIOS.outletAP - 1) * m.outletAP) / 1000;
  const sacShort = GAIN.sacralLength * (1 - RATIOS.sacralLength) * (m.sacralLength / 1000);

  // [point, displacement] for the left side; mirrored to the right below.
  const left = [
    [L.tuberosity, [half('intertuberous'), 0, 0]],
    [L.ramus, [half('intertuberous') * 0.7, 0, 0]],
    [L.spine, [half('interspinous'), 0, 0]],
    [L.brim, [half('inletTransverse'), 0, 0]],
    [L.crestLateral, [half('intercristal'), -lower * 0.6, 0]],
    [L.crestTop, [half('intercristal'), -lower, 0]],
    [L.asis, [half('interASIS'), -lower * 0.6, 0]],
    // posterior ilium back and down: wider greater sciatic notch
    [L.psis, [0, -lower * 0.5, -0.003]],
  ];
  const midline = [
    // the pubis is longer: symphysis forward; and shorter: its lower border rises
    [
      [0, L.symphysisTop[1], L.symphysisTop[2]],
      [0, 0, conj / 2],
    ],
    [
      [0, L.symphysisBottom[1], L.symphysisBottom[2]],
      [0, symDrop, conj / 2],
    ],
    [S.promontory, [0, 0, -conj / 2]],
    [S.tip, [0, sacShort, -outAP]],
  ];
  const sacral = [[S.alaL, [half('sacralWidth'), 0, 0]]];
  const anchors = fixed.map((p) => [p, [0, 0, 0]]);
  const ctrl = [
    ...left,
    ...left.map(([p, d]) => [mirror(p), mirror(d)]),
    ...sacral,
    ...sacral.map(([p, d]) => [mirror(p), mirror(d)]),
    ...midline,
    ...anchors,
  ];
  const C = ctrl.map(([p]) => p),
    D = ctrl.map(([, d]) => d);
  const A = C.map((a) =>
    C.map((b) => wendland(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / RADIUS)),
  );
  const W = solve(A, D);

  const near = (p) => p[1] > 0.7 && p[1] < 1.15 && Math.abs(p[0]) < 0.3 && Math.abs(p[2]) < 0.25;
  const displacement = (p) => {
    const d = [0, 0, 0];
    if (!near(p)) return d;
    for (let i = 0; i < C.length; i++) {
      const r = Math.hypot(p[0] - C[i][0], p[1] - C[i][1], p[2] - C[i][2]) / RADIUS;
      if (r >= 1) continue;
      const f = wendland(r);
      d[0] += f * W[i][0];
      d[1] += f * W[i][1];
      d[2] += f * W[i][2];
    }
    return d;
  };
  const point = (p) => {
    const d = displacement(p);
    return [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
  };
  /** Jacobian of the map by central differences. */
  const jacobian = (p) => {
    const h = 1e-4,
      J = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
    for (let k = 0; k < 3; k++) {
      const a = [...p],
        b = [...p];
      a[k] += h;
      b[k] -= h;
      const da = point(a),
        db = point(b);
      for (let i = 0; i < 3; i++) J[i][k] = (da[i] - db[i]) / (2 * h);
    }
    return J;
  };
  const det = (J) =>
    J[0][0] * (J[1][1] * J[2][2] - J[1][2] * J[2][1]) -
    J[0][1] * (J[1][0] * J[2][2] - J[1][2] * J[2][0]) +
    J[0][2] * (J[1][0] * J[2][1] - J[1][1] * J[2][0]);
  /** Normal transform: inverse transpose of the Jacobian (cofactor matrix, up to scale). */
  const normal = (p, n) => {
    if (!near(p)) return n;
    const J = jacobian(p);
    const cof = [
      [
        J[1][1] * J[2][2] - J[1][2] * J[2][1],
        J[1][2] * J[2][0] - J[1][0] * J[2][2],
        J[1][0] * J[2][1] - J[1][1] * J[2][0],
      ],
      [
        J[0][2] * J[2][1] - J[0][1] * J[2][2],
        J[0][0] * J[2][2] - J[0][2] * J[2][0],
        J[0][1] * J[2][0] - J[0][0] * J[2][1],
      ],
      [
        J[0][1] * J[1][2] - J[0][2] * J[1][1],
        J[0][2] * J[1][0] - J[0][0] * J[1][2],
        J[0][0] * J[1][1] - J[0][1] * J[1][0],
      ],
    ];
    const out = [0, 1, 2].map((i) => cof[i][0] * n[0] + cof[i][1] * n[1] + cof[i][2] * n[2]),
      l = Math.hypot(...out) || 1;
    return out.map((v) => v / l);
  };
  return { point, normal, jacobian, det, near, controls: ctrl.length };
}
