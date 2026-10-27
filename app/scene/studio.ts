import * as T from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Adds the environment map, lights and the display platform the body stands on. */
export function createStudio(renderer: T.WebGLRenderer, scene: T.Scene) {
  const pmrem = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffffff, 0xa7acb2, 1.05));
  const key = new T.DirectionalLight(0xfffaf4, 2.3);
  key.position.set(-2, 4, 3);
  scene.add(key);
  const rim = new T.DirectionalLight(0xe9f0ff, 1.8);
  rim.position.set(2, 2, -3);
  scene.add(rim);
  const ground = new T.Mesh(
    new T.CircleGeometry(30, 96),
    new T.MeshStandardMaterial({ color: 0xd5d9dc, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.019;
  scene.add(ground);
  const platform = new T.Mesh(
    new T.CylinderGeometry(0.68, 0.7, 0.028, 100),
    new T.MeshStandardMaterial({ color: 0xeeeeec, metalness: 0.12, roughness: 0.67 }),
  );
  platform.position.y = -0.016;
  scene.add(platform);
  const ring = new T.Mesh(
    new T.RingGeometry(0.63, 0.632, 128),
    new T.MeshBasicMaterial({
      color: 0x8c969f,
      transparent: true,
      opacity: 0.4,
      side: T.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.001;
  scene.add(ring);
  const innerRing = new T.Mesh(
    new T.RingGeometry(0.55, 0.551, 128),
    new T.MeshBasicMaterial({
      color: 0xa4aeb8,
      transparent: true,
      opacity: 0.16,
      side: T.DoubleSide,
    }),
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.001;
  scene.add(innerRing);
  return {
    environment: env,
    setPlatformVisible(visible: boolean) {
      ground.visible = platform.visible = ring.visible = innerRing.visible = visible;
    },
  };
}
