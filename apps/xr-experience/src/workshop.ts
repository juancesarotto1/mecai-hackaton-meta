import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
} from "@iwsdk/core";
import { bakeStatic } from "./bake";
import type { EngineMaterials } from "./materials";

export const BENCH_TOP_Y = 0.632;
/** Crank axis above the bench origin: bench top + rubber mounts + oil-pan depth below the crank. */
export const ENGINE_ON_BENCH = new Vector3(0.17, BENCH_TOP_Y + 0.03 + 0.19, 0);

function contactShadow(width: number, depth: number, strength: number): Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
  gradient.addColorStop(0.55, `rgba(0,0,0,${strength * 0.45})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new Mesh(
    new PlaneGeometry(width, depth),
    new MeshBasicMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}

/** Floor plus a steel training bench with a parts mat; the bench frame holds removed parts. */
export function createWorkshop(materials: EngineMaterials): { floor: Group; bench: Group } {
  const floor = new Group();
  const ground = new Mesh(new CircleGeometry(6, 64), materials.floor);
  ground.rotation.x = -Math.PI / 2;
  floor.add(ground);

  const bench = new Group();
  bench.name = "bench";
  const tube = 0.04;
  const length = 1.1;
  const depth = 0.56;
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material = materials.paintedFrame,
  ) => {
    const part = new Mesh(new BoxGeometry(w, h, d), material);
    part.position.set(x, y, z);
    bench.add(part);
    return part;
  };
  const railY = BENCH_TOP_Y - 0.012 - tube / 2;
  for (const z of [-depth / 2 + tube / 2, depth / 2 - tube / 2])
    box(length, tube, tube, 0, railY, z);
  for (const x of [-length / 2 + tube / 2, length / 2 - tube / 2])
    box(tube, tube, depth, x, railY, 0);
  for (const x of [-length / 2 + tube / 2, length / 2 - tube / 2]) {
    for (const z of [-depth / 2 + tube / 2, depth / 2 - tube / 2]) {
      box(tube, railY, tube, x, railY / 2, z);
      box(0.07, 0.012, 0.07, x, 0.006, z, materials.rubber);
    }
  }
  for (const z of [-depth / 2 + tube / 2, depth / 2 - tube / 2])
    box(length, tube * 0.75, tube * 0.75, 0, 0.16, z);
  box(length - 0.06, 0.008, depth - 0.06, 0, 0.18, 0, materials.darkSteel);
  box(length, 0.012, depth, 0, BENCH_TOP_Y - 0.006, 0, materials.darkSteel);
  box(0.36, 0.004, depth - 0.08, -0.35, BENCH_TOP_Y + 0.002, 0, materials.mat);
  for (const x of [ENGINE_ON_BENCH.x - 0.14, ENGINE_ON_BENCH.x + 0.14]) {
    box(0.07, 0.022, 0.07, x, BENCH_TOP_Y + 0.011, -0.05, materials.rubber);
    box(0.08, 0.008, 0.08, x, BENCH_TOP_Y + 0.026, -0.05, materials.darkSteel);
  }

  const underBench = contactShadow(1.5, 0.95, 0.55);
  underBench.position.y = 0.002;
  bench.add(underBench);
  const underEngine = contactShadow(0.62, 0.32, 0.5);
  underEngine.position.set(ENGINE_ON_BENCH.x, BENCH_TOP_Y + 0.001, -0.03);
  bench.add(underEngine);
  bakeStatic(bench);
  return { floor, bench };
}
