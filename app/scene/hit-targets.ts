import * as T from 'three';
import type { Part } from '../anatomy';

/** A structure's projected screen-space box, used for hover and forgiving taps in the inventory. */
export interface HitTarget {
  index: number;
  x: number;
  y: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Nearest target whose box lies within `radius` px, favoring the one whose center is closest. */
export function findTarget(targets: HitTarget[], x: number, y: number, radius: number) {
  let best = -1,
    score = Infinity;
  for (const t of targets) {
    const dx = Math.max(t.left - x, 0, x - t.right),
      dy = Math.max(t.top - y, 0, y - t.bottom),
      distance = Math.hypot(dx, dy);
    if (distance > radius) continue;
    const candidate = distance + Math.hypot(t.x - x, t.y - y) * 0.025;
    if (candidate < score) {
      score = candidate;
      best = t.index;
    }
  }
  return best;
}

/**
 * True when any non-skin structure is visible; the translucent body surface is then skipped so it
 * does not swallow taps meant for what lies beneath it.
 */
export function hasSolidVisible(parts: Part[], state: Float32Array) {
  return parts.some((p, i) => p.system !== 'integumentary' && state[i * 4 + 3] > 0.5);
}

const projected = new T.Vector3();

export function projectTargets(
  parts: Part[],
  centers: T.Vector3[],
  state: Float32Array,
  camera: T.Camera,
  width: number,
  height: number,
) {
  const targets: HitTarget[] = [],
    hasSolid = hasSolidVisible(parts, state);
  parts.forEach((p, i) => {
    if (state[i * 4 + 3] < 0.5 || (hasSolid && p.system === 'integumentary')) return;
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    for (let corner = 0; corner < 8; corner++) {
      projected
        .set(
          p.bounds[corner & 1 ? 1 : 0][0] + state[i * 4],
          p.bounds[corner & 2 ? 1 : 0][1] + state[i * 4 + 1],
          p.bounds[corner & 4 ? 1 : 0][2] + state[i * 4 + 2],
        )
        .project(camera);
      const x = ((projected.x + 1) * width) / 2,
        y = ((1 - projected.y) * height) / 2;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    projected
      .copy(centers[i])
      .add(new T.Vector3(state[i * 4], state[i * 4 + 1], state[i * 4 + 2]))
      .project(camera);
    if (projected.z < -1 || projected.z > 1) return;
    targets.push({
      index: i,
      x: ((projected.x + 1) * width) / 2,
      y: ((1 - projected.y) * height) / 2,
      left,
      right,
      top,
      bottom,
    });
  });
  return targets;
}
