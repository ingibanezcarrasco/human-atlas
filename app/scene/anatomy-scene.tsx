import { useEffect, useRef } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createExplosionLayout } from '../explosion-layout';
import { PointerTap } from '../pointer-tap';
import { SYSTEMS, type Atlas, type SceneState } from '../anatomy';
import { errorCode, type ErrorCode } from '../errors';
import { buildChunkGeometry, fetchChunk, loadAll } from './chunk-loader';
import { findTarget, hasSolidVisible, projectTargets, type HitTarget } from './hit-targets';
import { createMarkers, createPartMaterial } from './part-material';
import { createStudio } from './studio';
interface Props {
  atlas: Atlas;
  state: SceneState;
  onSelect: (id: string) => void;
  onProgress: (n: number) => void;
  onError: (code: ErrorCode) => void;
  /** Accessible description of the canvas, in the active language. */
  label: string;
  /** Display name for a structure's source name, used by the hover tooltip (empty hides it). */
  nameOf: (name: string) => string;
}
export default function AnatomyScene({
  atlas,
  state,
  onSelect,
  onProgress,
  onError,
  label,
  nameOf,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(state),
    select = useRef(onSelect),
    displayName = useRef(nameOf);
  latest.current = state;
  select.current = onSelect;
  displayName.current = nameOf;
  useEffect(() => {
    const el = host.current!;
    let disposed = false,
      frame = 0,
      dirty = true,
      ready = false,
      lastView = '',
      lastReset = -1,
      lastIsolate = '',
      layoutKey = '',
      amount = 0;
    let lastState: SceneState | null = null;
    const abort = new AbortController();
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      onError('webgl');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.5 : 2));
    renderer.setClearColor('#f2f3f3');
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(34, 1, 0.005, 100),
      controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(1.4, 1.05, 3.6);
    controls.target.set(0, 0.85, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.minDistance = 0.07;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI * 0.96;
    controls.addEventListener('change', () => {
      dirty = true;
    });
    const studio = createStudio(renderer, scene);
    const width = T.MathUtils.ceilPowerOfTwo(atlas.parts.length),
      data = new Float32Array(width * 4),
      partTexture = new T.DataTexture(data, width, 1, T.RGBAFormat, T.FloatType);
    partTexture.needsUpdate = true;
    const selectedData = new Uint8Array(width * 4),
      selectionTexture = new T.DataTexture(selectedData, width, 1);
    selectionTexture.needsUpdate = true;
    const materials: T.Material[] = [],
      geometries: T.BufferGeometry[] = [],
      pickers: (T.Mesh | undefined)[] = [],
      centers = atlas.parts.map((p) =>
        new T.Vector3()
          .fromArray(p.bounds[0])
          .add(new T.Vector3().fromArray(p.bounds[1]))
          .multiplyScalar(0.5),
      );
    const offsets: T.Vector3[] = [],
      bounds = atlas.parts.map(
        (p) =>
          new T.Box3(
            new T.Vector3().fromArray(p.bounds[0]),
            new T.Vector3().fromArray(p.bounds[1]),
          ),
      );
    let packingWidth = 1,
      packingHeight = 1;
    const {
      points: markers,
      positions: markerPositions,
      geometry: markerGeometry,
      material: markerMaterial,
    } = createMarkers(atlas.parts.length);
    scene.add(markers);
    const hover = document.createElement('div');
    hover.className = 'part-hover';
    hover.setAttribute('role', 'tooltip');
    hover.hidden = true;
    el.appendChild(hover);
    let targets: HitTarget[] = [];
    const mats = new Map(
      SYSTEMS.map((s) => {
        const m = createPartMaterial(s.id, { partTexture, selectionTexture, width });
        materials.push(m);
        return [s.id, m];
      }),
    );
    let loaded = 0;
    const loadChunk = async (ci: number) => {
      const buffer = await fetchChunk(atlas, ci, abort.signal);
      if (disposed) return;
      const { parts, merged } = buildChunkGeometry(atlas, ci, buffer, bounds);
      parts.forEach((g, i) => {
        const pick = new T.Mesh(g);
        pick.matrixAutoUpdate = false;
        pickers[i] = pick;
        geometries.push(g);
      });
      merged.forEach((geometry, system) => {
        geometries.push(geometry);
        const mesh = new T.Mesh(geometry, mats.get(system as never));
        mesh.frustumCulled = false;
        scene.add(mesh);
      });
      lastState = null;
      loaded++;
      onProgress(Math.round((loaded / atlas.chunks.length) * 100));
      dirty = true;
    };
    (async () => {
      try {
        await loadAll(atlas.chunks.length, 3, loadChunk);
        if (!disposed) {
          ready = true;
          dirty = true;
        }
      } catch (e) {
        if (!disposed) onError(errorCode(e, 'load'));
      }
    })();
    const fit = (view: string, extent = 0) => {
      const mobile = el.clientWidth < 768,
        normalDistance = mobile
          ? Math.max(
              4.5,
              (1.8 * el.clientHeight) /
                Math.max(160, el.clientHeight - 350) /
                (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2))),
            )
          : 4;
      const reservedHeight = mobile ? 350 : 270;
      const availableAspect = Math.max(
        0.35,
        (el.clientWidth - (mobile ? 40 : 340)) / Math.max(160, el.clientHeight - reservedHeight),
      );
      const atlasDistance =
        (Math.max(packingHeight, packingWidth / availableAspect) /
          (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)))) *
        (el.clientHeight / Math.max(160, el.clientHeight - reservedHeight)) *
        1.08;
      const distance = T.MathUtils.lerp(normalDistance, Math.max(0.2, atlasDistance), extent);
      if (extent > 0.8) view = 'front';
      const direction =
        view === 'front'
          ? new T.Vector3(0, 0.02, 1)
          : view === 'back'
            ? new T.Vector3(0, 0.02, -1)
            : view === 'side'
              ? new T.Vector3(1, 0.02, 0)
              : new T.Vector3(0.35, 0.06, 1).normalize();
      controls.target.set(
        extent > 0.1 && el.clientWidth > 767 ? -packingWidth * 0.12 : 0,
        extent > 0.1 || mobile ? 0.85 : 0.68,
        0,
      );
      camera.position.copy(controls.target).addScaledVector(direction, distance);
      controls.update();
      dirty = true;
    };
    const resize = () => {
      layoutKey = '';
      lastState = null;
      renderer.setPixelRatio(
        Math.min(devicePixelRatio, el.clientWidth < 768 || el.clientHeight < 600 ? 1.5 : 2),
      );
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      fit(latest.current.view, amount);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const raycaster = new T.Raycaster(),
      pointer = new T.Vector2(),
      tap = new PointerTap(),
      worldBox = new T.Box3(),
      hitPoint = new T.Vector3();
    const down = (e: PointerEvent) => {
      hover.hidden = true;
      tap.down(e.pointerId, e.clientX, e.clientY, e.pointerType === 'touch' ? 12 : 5);
    };
    const move = (e: PointerEvent) => {
      tap.move(e.pointerId, e.clientX, e.clientY);
      if (e.buttons || amount < 0.5 || e.pointerType === 'touch') {
        hover.hidden = true;
        return;
      }
      const rect = el.getBoundingClientRect(),
        x = e.clientX - rect.left,
        y = e.clientY - rect.top,
        index = findTarget(targets, x, y, 12),
        text = index < 0 ? '' : displayName.current(atlas.parts[index].name);
      hover.hidden = !text;
      renderer.domElement.style.cursor = index < 0 ? 'grab' : 'pointer';
      if (text) {
        hover.textContent = text;
        hover.style.left = `${Math.max(8, Math.min(x + 14, el.clientWidth - 260))}px`;
        hover.style.top = `${Math.max(8, Math.min(y + 18, el.clientHeight - 55))}px`;
      }
    };
    const cancel = (e: PointerEvent) => tap.cancel(e.pointerId);
    const up = (e: PointerEvent) => {
      const validTap = tap.up(e.pointerId, e.clientX, e.clientY);
      if (!validTap || !ready) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      let nearest = Infinity,
        found = -1;
      const hasSolid = hasSolidVisible(atlas.parts, data);
      pickers.forEach((mesh, i) => {
        if (
          !mesh ||
          data[i * 4 + 3] < 0.5 ||
          (hasSolid && atlas.parts[i].system === 'integumentary')
        )
          return;
        worldBox.copy(bounds[i]).translate(mesh.position);
        if (!raycaster.ray.intersectBox(worldBox, hitPoint)) return;
        const hits = raycaster.intersectObject(mesh, false);
        if (hits[0] && hits[0].distance < nearest) {
          nearest = hits[0].distance;
          found = i;
        }
      });
      if (found < 0 && amount > 0.45)
        found = findTarget(
          targets,
          e.clientX - rect.left,
          e.clientY - rect.top,
          e.pointerType === 'touch' ? 24 : 16,
        );
      if (found >= 0) {
        hover.hidden = true;
        select.current(atlas.parts[found].id);
      }
    };
    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);
    renderer.domElement.addEventListener('pointercancel', cancel);
    const clock = new T.Clock();
    let lastExtent = -1;
    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05),
        s = latest.current;
      const changed =
        lastState?.visible !== s.visible ||
        lastState?.selected !== s.selected ||
        lastState?.isolate !== s.isolate;
      const moving = Math.abs(amount - s.explode) > 0.0001;
      if (moving) {
        amount = T.MathUtils.damp(amount, s.explode, 8, dt);
        dirty = true;
      }
      if (changed || moving || lastExtent < 0) {
        const visible = new Set(s.visible),
          selection = new Set(s.selected);
        const visibleParts = atlas.parts.filter((p) =>
          s.isolate ? selection.has(p.id) : visible.has(p.system) || selection.has(p.id),
        );
        const nextLayoutKey =
          visibleParts.map((p) => p.id).join(',') + ':' + camera.aspect.toFixed(3);
        if (nextLayoutKey !== layoutKey) {
          const layout = createExplosionLayout(visibleParts, camera.aspect);
          packingWidth = layout.width;
          packingHeight = layout.height;
          atlas.parts.forEach((p, i) => {
            const cell = layout.cells.get(p.id);
            offsets[i] = cell ? new T.Vector3(cell.x, cell.y + 0.85, 0) : centers[i].clone();
          });
          layoutKey = nextLayoutKey;
          if (amount > 0.05 && !s.isolate) fit(s.view, Math.max(0, (amount - 0.3) / 0.7));
        }

        atlas.parts.forEach((p, i) => {
          const c = centers[i],
            destination = offsets[i];
          let dx = 0,
            dy = 0,
            dz = 0;
          if (amount <= 0.45) {
            const t = amount / 0.45;
            const group = SYSTEMS.findIndex((sys) => sys.id === p.system);
            const angle = (group / SYSTEMS.length) * Math.PI * 2;
            dx = Math.sin(angle) * t * 0.48;
            dy = (c.y - 0.85) * t * 0.28;
            dz = Math.cos(angle) * t * 0.48;
          } else {
            const t = (amount - 0.45) / 0.55,
              group = SYSTEMS.findIndex((sys) => sys.id === p.system),
              angle = (group / SYSTEMS.length) * Math.PI * 2;
            dx = T.MathUtils.lerp(Math.sin(angle) * 0.48, destination.x - c.x, t);
            dy = T.MathUtils.lerp((c.y - 0.85) * 0.28, destination.y - c.y, t);
            dz = T.MathUtils.lerp(Math.cos(angle) * 0.48, -c.z, t);
          }
          const selected = selection.has(p.id);
          data.set(
            [dx, dy, dz, (s.isolate ? selected : visible.has(p.system) || selected) ? 1 : 0],
            i * 4,
          );
          selectedData[i * 4] = selected ? 255 : 0;
          markerPositions.set(
            data[i * 4 + 3] > 0.5 ? [c.x + dx, c.y + dy, c.z + dz] : [10000, 10000, 10000],
            i * 3,
          );
          const mesh = pickers[i];
          if (mesh) {
            mesh.position.set(dx, dy, dz);
            mesh.updateMatrix();
            mesh.updateMatrixWorld(true);
          }
        });
        partTexture.needsUpdate = true;
        selectionTexture.needsUpdate = true;
        markerGeometry.attributes.position.needsUpdate = true;
        lastState = s;
        lastExtent = amount;
        dirty = true;
      }
      if (s.view !== lastView || s.reset !== lastReset) {
        fit(s.view, amount);
        lastView = s.view;
        lastReset = s.reset;
      }
      if (moving && !s.isolate)
        fit(amount > 0.5 ? 'front' : s.view, Math.max(0, (amount - 0.3) / 0.7));
      const isolateKey = s.isolate
        ? s.selected.join(',') + ':' + s.reset + ':' + s.inspectorOpen + ':' + camera.aspect
        : '';
      if (isolateKey !== lastIsolate || (s.isolate && moving)) {
        if (s.isolate) {
          const box = new T.Box3();
          atlas.parts.forEach((p, i) => {
            if (s.selected.includes(p.id))
              box.union(
                bounds[i]
                  .clone()
                  .translate(new T.Vector3(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])),
              );
          });
          if (!box.isEmpty()) {
            const center = box.getCenter(new T.Vector3()),
              size = box.getSize(new T.Vector3());
            const w = el.clientWidth,
              h = el.clientHeight,
              mobile = w < 768,
              landscape = w > h && h <= 600;
            let left = 20,
              right = w - 20,
              top = mobile ? 175 : 110,
              bottom = h - 170;
            if (s.inspectorOpen) {
              if (landscape) {
                right = w - 335;
                top = 100;
                bottom = h - 125;
              } else if (mobile) {
                const sheet = document
                    .querySelector('.detail-sheet, .quiz-panel')
                    ?.getBoundingClientRect(),
                  header = document.querySelector('.identity')?.getBoundingClientRect();
                top = (header?.bottom ?? 94) + 16;
                bottom = (sheet?.top ?? h * 0.58 - 139) - 16;
              } else {
                right = w - 370;
                left = w > 1100 ? 285 : 25;
              }
            }
            const availableWidth = Math.max(150, right - left),
              availableHeight = Math.max(40, bottom - top);
            camera.setViewOffset(
              w,
              h,
              w / 2 - (left + right) / 2,
              h / 2 - (top + bottom) / 2,
              w,
              h,
            );
            const distance = Math.max(
              0.07,
              (Math.max(
                (size.y * h) / availableHeight,
                (size.x * w) / availableWidth / camera.aspect,
                size.z,
              ) /
                (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)))) *
                1.35,
            );
            controls.maxDistance = Math.max(40, distance * 2);
            controls.target.copy(center);
            camera.position
              .copy(center)
              .add(new T.Vector3(0.2, 0.1, 1).normalize().multiplyScalar(distance));
            controls.update();
            dirty = true;
          }
        } else if (lastIsolate) {
          camera.clearViewOffset();
          fit(s.view, amount);
        }
        lastIsolate = isolateKey;
      }
      controls.enableRotate = amount < 0.8;
      controls.mouseButtons.LEFT = amount < 0.8 ? T.MOUSE.ROTATE : T.MOUSE.PAN;
      controls.touches.ONE = amount < 0.8 ? T.TOUCH.ROTATE : T.TOUCH.PAN;
      studio.setPlatformVisible(amount < 0.5 && !s.isolate);
      markers.visible = amount > 0.75;
      controls.autoRotate = s.rotate && !s.isolate && amount < 0.4;
      controls.autoRotateSpeed = 0.65;
      controls.update();
      if (controls.autoRotate) dirty = true;
      if (dirty) {
        renderer.render(scene, camera);
        targets =
          amount > 0.45
            ? projectTargets(atlas.parts, centers, data, camera, el.clientWidth, el.clientHeight)
            : [];
        dirty = false;
      }
    };
    animate();
    const contextLost = (e: Event) => {
      e.preventDefault();
      onError('contextLost');
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      scene.traverse((o) => {
        if (o instanceof T.Mesh && !geometries.includes(o.geometry)) {
          o.geometry.dispose();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => m.dispose());
        }
      });
      studio.environment.dispose();
      partTexture.dispose();
      selectionTexture.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      hover.remove();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [atlas]);
  useEffect(() => {
    host.current?.querySelector('canvas')?.setAttribute('aria-label', label);
  }, [atlas, label]);
  return <div className="scene" ref={host} />;
}
