import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from "@iwsdk/core";
import { bakeStatic } from "./bake";
import { cylinderState, sliderCrank } from "@motormind/engine-kinematics";
import type { SimulationConfiguration } from "@motormind/engine-schema";
import type { EngineMaterials } from "./materials";

// Engine frame: metres, crank axis on +X through the origin, Y up, cutaway face at Z = 0 toward +Z.
export const CYLINDER_X = [-0.144, -0.048, 0.048, 0.144] as const;
const MAIN_X = [-0.192, -0.096, 0, 0.096, 0.192];
const BLOCK_HALF_LENGTH = 0.215;
const COMPRESSION_HEIGHT = 0.03;
const HEAD_TOP_Y = 0.3;
const CAM_Y = 0.335;
const CAM_Z = { intake: 0.045, exhaust: -0.045 } as const;
const CAM_BASE_RADIUS = 0.017;
const CASTING_DEPTH = 0.095;
const VALVE_SEAT_Y = 0.236;
const VALVE_SEAT_Z = 0.022;
const VALVE_OFFSET_X = 0.017;
const TAPPET_HEIGHT = 0.014;

// Shape space (x, y) + extrusion z → engine (y, z, x): profiles drawn in the crank plane.
const CRANK_PLANE = new Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
// Shape (x, y) + extrusion z → engine (-z, y, x): profiles drawn in the rod plane.
const ROD_PLANE = new Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);

function extrudeAlongX(shape: Shape | Shape[], depth: number, plane: Matrix4, bevel = 0.0015) {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.applyMatrix4(plane);
  return geometry;
}

function mesh(geometry: BufferGeometry, material: Material | Material[], name?: string): Mesh {
  const result = new Mesh(geometry, material);
  if (name) result.name = name;
  return result;
}

function alongX(geometry: BufferGeometry): BufferGeometry {
  return geometry.rotateZ(Math.PI / 2);
}

function gearShape(radius: number, teeth: number, depth: number, hole = 0): Shape {
  const shape = new Shape();
  for (let index = 0; index < teeth; index += 1) {
    const step = (Math.PI * 2) / teeth;
    const a = index * step;
    const points = [
      [radius, a],
      [radius + depth, a + step * 0.2],
      [radius + depth, a + step * 0.45],
      [radius, a + step * 0.65],
    ] as const;
    points.forEach(([r, angle], pointIndex) => {
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (index === 0 && pointIndex === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  if (hole > 0) {
    const path = new Shape();
    path.absarc(0, 0, hole, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  return shape;
}

/** Half casting: cut face at z = 0 extruded back to -depth, with a closed back plate. */
function halfCasting(
  shapes: Shape[],
  depth: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  materials: EngineMaterials,
): Group {
  const group = new Group();
  const body = new ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.0012,
    bevelSegments: 1,
    curveSegments: 32,
  });
  body.translate(0, 0, -depth);
  group.add(mesh(body, [materials.machinedAluminum, materials.castAluminum]));
  const back = new BoxGeometry(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 0.004);
  back.translate((bounds.maxX + bounds.minX) / 2, (bounds.maxY + bounds.minY) / 2, -depth - 0.002);
  group.add(mesh(back, materials.interior));
  return group;
}

export interface ValveRig {
  cylinder: number;
  side: "intake" | "exhaust";
  seat: Vector3;
  axis: Vector3;
  orientation: Quaternion;
}

export interface CamRig {
  assembly: Group;
  shaft: Group;
}

export interface PistonPose {
  piston: Vector3;
  rod: Vector3;
  rodRotationX: number;
}

export interface EngineModel {
  root: Group;
  crank: Group;
  pistons: Group[];
  rods: Group[];
  ringMaterials: MeshStandardMaterial[];
  cams: { intake: CamRig; exhaust: CamRig };
  valves: ValveRig[];
  ignition: Group[];
  pistonPose(cylinder: number, angle: number): PistonPose;
  update(angle: number, combustion: readonly number[], detached: ReadonlySet<number>): void;
}

export function createEngineModel(
  config: SimulationConfiguration,
  materials: EngineMaterials,
): EngineModel {
  const root = new Group();
  root.name = "engine";
  const radius = config.strokeM / 2;
  const boreRadius = config.boreM / 2;
  const deckY = radius + config.connectingRodLengthM + COMPRESSION_HEIGHT + 0.001;

  // ── Block: cut face with bores and crankcase opening, plus siamesed walls between bores.
  const boreTop = deckY;
  const boreBottom = 0.04;
  const crankcaseBottom = -0.075;
  const outer = new Shape();
  const innerHalf = CYLINDER_X[3] + boreRadius;
  outer.moveTo(-BLOCK_HALF_LENGTH, -0.085);
  outer.lineTo(BLOCK_HALF_LENGTH, -0.085);
  outer.lineTo(BLOCK_HALF_LENGTH, boreTop);
  outer.lineTo(innerHalf, boreTop);
  outer.lineTo(innerHalf, crankcaseBottom);
  outer.lineTo(-innerHalf, crankcaseBottom);
  outer.lineTo(-innerHalf, boreTop);
  outer.lineTo(-BLOCK_HALF_LENGTH, boreTop);
  outer.closePath();
  const walls = [0, 1, 2].map((index) => {
    const wall = new Shape();
    const left = CYLINDER_X[index]! + boreRadius;
    const right = CYLINDER_X[index + 1]! - boreRadius;
    wall.moveTo(left, boreBottom);
    wall.lineTo(right, boreBottom);
    wall.lineTo(right, boreTop);
    wall.lineTo(left, boreTop);
    wall.closePath();
    return wall;
  });
  const block = halfCasting(
    [outer, ...walls],
    CASTING_DEPTH,
    { minX: -BLOCK_HALF_LENGTH, maxX: BLOCK_HALF_LENGTH, minY: -0.085, maxY: boreTop },
    materials,
  );
  block.name = "block";
  root.add(block);
  for (const x of CYLINDER_X) {
    const liner = new CylinderGeometry(
      boreRadius,
      boreRadius,
      boreTop - boreBottom,
      48,
      1,
      true,
      Math.PI / 2,
      Math.PI,
    );
    liner.translate(x, (boreTop + boreBottom) / 2, 0);
    root.add(mesh(liner, materials.boreSteel));
  }
  for (const x of MAIN_X) {
    const cap = new BoxGeometry(0.018, 0.03, 0.05);
    cap.translate(x, -0.045, -0.025);
    root.add(mesh(cap, materials.castIron));
  }
  const filter = new CylinderGeometry(0.038, 0.038, 0.09, 32);
  filter.rotateX(Math.PI / 2).translate(-0.06, -0.01, -CASTING_DEPTH - 0.05);
  root.add(
    mesh(
      filter,
      new MeshStandardMaterial({
        color: 0x1f3f7a,
        metalness: 0.3,
        roughness: 0.4,
        envMap: materials.castAluminum.envMap,
      }),
    ),
  );

  // ── Oil pan, cut like the block, with oil in the sump.
  const pan = new Shape();
  pan.moveTo(-0.205, -0.085);
  pan.lineTo(0.205, -0.085);
  pan.lineTo(0.205, -0.12);
  pan.lineTo(0.17, -0.19);
  pan.lineTo(-0.17, -0.19);
  pan.lineTo(-0.205, -0.12);
  pan.closePath();
  const panHollow = new Shape();
  panHollow.moveTo(-0.199, -0.091);
  panHollow.lineTo(-0.199, -0.12);
  panHollow.lineTo(-0.165, -0.185);
  panHollow.lineTo(0.165, -0.185);
  panHollow.lineTo(0.199, -0.12);
  panHollow.lineTo(0.199, -0.091);
  panHollow.closePath();
  pan.holes.push(panHollow);
  root.add(
    halfCasting(
      [pan],
      CASTING_DEPTH,
      { minX: -0.205, maxX: 0.205, minY: -0.19, maxY: -0.085 },
      materials,
    ),
  );
  const oil = new BoxGeometry(0.33, 0.035, CASTING_DEPTH - 0.004);
  oil.translate(0, -0.1665, -CASTING_DEPTH / 2);
  root.add(
    mesh(
      oil,
      new MeshStandardMaterial({
        color: 0x4a2c06,
        metalness: 0,
        roughness: 0.04,
        transparent: true,
        opacity: 0.88,
        envMap: materials.castAluminum.envMap,
      }),
    ),
  );

  // ── Cylinder head: combustion-chamber domes on the cut face.
  const head = new Shape();
  head.moveTo(-BLOCK_HALF_LENGTH, deckY);
  for (const x of CYLINDER_X) {
    head.lineTo(x - 0.036, deckY);
    head.absarc(x, deckY, 0.036, Math.PI, 0, true);
  }
  head.lineTo(BLOCK_HALF_LENGTH, deckY);
  head.lineTo(BLOCK_HALF_LENGTH, HEAD_TOP_Y);
  head.lineTo(-BLOCK_HALF_LENGTH, HEAD_TOP_Y);
  head.closePath();
  const headCasting = halfCasting(
    [head],
    CASTING_DEPTH,
    { minX: -BLOCK_HALF_LENGTH, maxX: BLOCK_HALF_LENGTH, minY: deckY, maxY: HEAD_TOP_Y },
    materials,
  );
  root.add(headCasting);
  const gasket = new BoxGeometry(BLOCK_HALF_LENGTH * 2, 0.0016, CASTING_DEPTH);
  gasket.translate(0, deckY + 0.0008, -CASTING_DEPTH / 2);
  root.add(mesh(gasket, materials.darkSteel));
  for (const x of MAIN_X) {
    const bolt = new CylinderGeometry(0.0065, 0.0065, 0.008, 6);
    bolt.translate(x, HEAD_TOP_Y + 0.004, -0.083);
    root.add(mesh(bolt, materials.darkSteel));
  }

  // ── Crankshaft.
  const crank = new Group();
  crank.name = "crankshaft";
  root.add(crank);
  const webThickness = 0.02;
  const pinLength = 0.022;
  const mainLength = 0.096 - 2 * (pinLength / 2 + webThickness);
  for (const x of MAIN_X) {
    crank.add(
      mesh(
        alongX(new CylinderGeometry(0.026, 0.026, mainLength, 40)).translate(x, 0, 0),
        materials.polishedSteel,
      ),
    );
  }
  const web = new Shape();
  web.moveTo(-0.032, 0.06);
  web.absarc(0, 0, 0.068, Math.PI - 1.08, Math.PI + 1.08, false);
  web.lineTo(radius - 0.004, -0.031);
  web.absarc(radius, 0, 0.032, -Math.PI / 2, Math.PI / 2, false);
  web.closePath();
  const webGeometry = extrudeAlongX(web, webThickness - 0.003, CRANK_PLANE);
  CYLINDER_X.forEach((x, index) => {
    const throwAngle = index === 0 || index === 3 ? 0 : Math.PI;
    const throwGroup = new Group();
    throwGroup.rotation.x = throwAngle;
    throwGroup.position.x = x;
    for (const side of [-1, 1]) {
      const plate = mesh(webGeometry, materials.forgedSteel);
      plate.position.x = side * (pinLength / 2 + webThickness / 2);
      throwGroup.add(plate);
    }
    throwGroup.add(
      mesh(
        alongX(new CylinderGeometry(0.0225, 0.0225, pinLength, 40)).translate(0, radius, 0),
        materials.polishedSteel,
      ),
    );
    crank.add(throwGroup);
  });
  crank.add(
    mesh(
      alongX(new CylinderGeometry(0.02, 0.02, 0.08, 32)).translate(-BLOCK_HALF_LENGTH - 0.03, 0, 0),
      materials.forgedSteel,
    ),
  );
  crank.add(
    mesh(
      extrudeAlongX(gearShape(0.026, 18, 0.0045, 0.012), 0.012, CRANK_PLANE, 0.0006).translate(
        -0.235,
        0,
        0,
      ),
      materials.darkSteel,
    ),
  );
  const pulleyProfile: Vector2[] = [];
  for (let groove = 0; groove <= 6; groove += 1) {
    const y = -0.015 + groove * 0.005;
    pulleyProfile.push(new Vector2(groove % 2 ? 0.062 : 0.068, y));
  }
  const pulley = new LatheGeometry(
    [new Vector2(0.02, -0.016), ...pulleyProfile, new Vector2(0.02, 0.016)],
    64,
  );
  pulley.rotateZ(Math.PI / 2).translate(-0.272, 0, 0);
  crank.add(mesh(pulley, materials.darkSteel));
  const flywheel = new Group();
  flywheel.add(
    mesh(
      extrudeAlongX(gearShape(0.128, 96, 0.006, 0.03), 0.012, CRANK_PLANE, 0.0008),
      materials.forgedSteel,
    ),
  );
  flywheel.add(mesh(alongX(new CylinderGeometry(0.12, 0.12, 0.02, 64)), materials.castIron));
  flywheel.position.x = BLOCK_HALF_LENGTH + 0.035;
  crank.add(flywheel);

  // ── Pistons (origin at the wrist pin) and connecting rods (origin at the small end).
  const pistonProfile = [
    [0.0405, -0.025],
    [0.0425, -0.02],
    [0.0425, 0.009],
    [0.0408, 0.0095],
    [0.0408, 0.0135],
    [0.0425, 0.014],
    [0.0425, 0.0165],
    [0.0408, 0.017],
    [0.0408, 0.0205],
    [0.0425, 0.021],
    [0.0425, 0.0235],
    [0.0408, 0.024],
    [0.0408, 0.0265],
    [0.0425, 0.027],
    [0.0425, 0.029],
    [0.04, 0.0302],
    [0.025, 0.0312],
    [0, 0.0314],
  ].map(([r, y]) => new Vector2(r!, y!));
  const pistonGeometry = new LatheGeometry(pistonProfile, 56);
  const ringGeometry = new TorusGeometry(0.0416, 0.0011, 6, 56).rotateX(Math.PI / 2);
  const rodShape = new Shape();
  const rodLength = config.connectingRodLengthM;
  rodShape.moveTo(-0.0085, -0.006);
  rodShape.lineTo(-0.013, -rodLength + 0.024);
  rodShape.absarc(0, -rodLength, 0.033, Math.PI - 0.75, 0.75 + Math.PI * 2, false);
  rodShape.lineTo(0.0085, -0.006);
  rodShape.absarc(0, 0, 0.0145, 0.6, Math.PI - 0.6, false);
  rodShape.closePath();
  const bigEnd = new Shape();
  bigEnd.absarc(0, -rodLength, 0.0228, 0, Math.PI * 2, true);
  const smallEnd = new Shape();
  smallEnd.absarc(0, 0, 0.0104, 0, Math.PI * 2, true);
  rodShape.holes.push(bigEnd, smallEnd);
  const rodGeometry = extrudeAlongX(rodShape, 0.017, ROD_PLANE, 0.0012);
  const boltGeometry = new CylinderGeometry(0.0042, 0.0042, 0.012, 12);
  const pistons: Group[] = [];
  const rods: Group[] = [];
  const ringMaterials: MeshStandardMaterial[] = [];
  CYLINDER_X.forEach((x, index) => {
    const piston = new Group();
    piston.name = `piston-${index + 1}`;
    piston.add(mesh(pistonGeometry, materials.machinedAluminum));
    const ringMaterial = materials.darkSteel.clone();
    for (const y of [0.0115, 0.0187, 0.0252]) {
      const ring = mesh(ringGeometry, ringMaterial);
      ring.position.y = y;
      piston.add(ring);
    }
    piston.add(
      mesh(alongX(new CylinderGeometry(0.0102, 0.0102, 0.072, 24)), materials.polishedSteel),
    );
    root.add(piston);
    pistons.push(piston);
    ringMaterials.push(ringMaterial);

    const rod = new Group();
    rod.name = `rod-${index + 1}`;
    rod.add(mesh(rodGeometry, materials.forgedSteel));
    for (const side of [-1, 1]) {
      const bolt = mesh(boltGeometry, materials.darkSteel);
      bolt.position.set(0, -rodLength - 0.03, side * 0.026);
      rod.add(bolt);
    }
    rod.position.x = x;
    root.add(rod);
    rods.push(rod);
  });

  // ── Camshafts with bearing caps, lobes phased to the firing order.
  const lobe = new Shape();
  lobe.moveTo(-0.00295, 0.01674);
  lobe.absarc(0, 0, CAM_BASE_RADIUS, (100 * Math.PI) / 180, (260 * Math.PI) / 180, false);
  lobe.lineTo(0.0214, -0.00658);
  lobe.absarc(0.019, 0, 0.007, (-70 * Math.PI) / 180, (70 * Math.PI) / 180, false);
  lobe.closePath();
  const lobeGeometry = extrudeAlongX(lobe, 0.01, CRANK_PLANE, 0.0008);
  function camRig(side: "intake" | "exhaust"): CamRig {
    const assembly = new Group();
    assembly.name = `${side}-camshaft`;
    assembly.position.set(0, CAM_Y, CAM_Z[side]);
    const shaft = new Group();
    assembly.add(shaft);
    shaft.add(
      mesh(
        alongX(new CylinderGeometry(0.0115, 0.0115, BLOCK_HALF_LENGTH * 2 + 0.01, 24)),
        materials.polishedSteel,
      ),
    );
    for (const x of MAIN_X) {
      shaft.add(
        mesh(
          alongX(new CylinderGeometry(0.0135, 0.0135, 0.016, 32)).translate(x, 0, 0),
          materials.polishedSteel,
        ),
      );
      const cap = new BoxGeometry(0.02, 0.012, 0.034);
      cap.translate(x, CAM_BASE_RADIUS - 0.002, 0);
      assembly.add(mesh(cap, materials.castAluminum));
      const tower = new BoxGeometry(0.02, CAM_Y - HEAD_TOP_Y - 0.004, 0.034);
      tower.translate(x, -(CAM_Y - HEAD_TOP_Y) / 2 - 0.004, 0);
      assembly.add(mesh(tower, materials.castAluminum));
    }
    const maxLiftDeg = side === "intake" ? 450 : 270;
    CYLINDER_X.forEach((x, index) => {
      const firingIndex = config.firingOrder.indexOf(index + 1);
      const camAtMaxLift = (((maxLiftDeg + firingIndex * 180) / 2) * Math.PI) / 180;
      for (const offset of [-VALVE_OFFSET_X, VALVE_OFFSET_X]) {
        const lobeMesh = mesh(lobeGeometry, materials.polishedSteel);
        lobeMesh.position.x = x + offset;
        lobeMesh.rotation.x = Math.PI - camAtMaxLift;
        shaft.add(lobeMesh);
      }
    });
    shaft.add(
      mesh(
        extrudeAlongX(gearShape(0.037, 24, 0.0045, 0.012), 0.01, CRANK_PLANE, 0.0006).translate(
          -0.235,
          0,
          0,
        ),
        materials.darkSteel,
      ),
    );
    root.add(assembly);
    return { assembly, shaft };
  }
  const cams = { intake: camRig("intake"), exhaust: camRig("exhaust") };

  // ── Valves, springs and bucket tappets, inclined between seat and cam.
  const valveGeometry = new LatheGeometry(
    [
      [0, 0],
      [0.0135, 0],
      [0.0135, 0.0018],
      [0.0085, 0.004],
      [0.0034, 0.011],
      [0.0029, 0.016],
      [0.0029, 0.07],
      [0, 0.07],
    ].map(([r, y]) => new Vector2(r!, y!)),
    32,
  );
  const helix: Vector3[] = [];
  for (let step = 0; step <= 120; step += 1) {
    const t = step / 120;
    const a = t * Math.PI * 2 * 6;
    helix.push(new Vector3(0.0095 * Math.cos(a), t, 0.0095 * Math.sin(a)));
  }
  const springGeometry = new TubeGeometry(new CatmullRomCurve3(helix), 160, 0.0012, 5, false);
  const valves: ValveRig[] = [];
  const up = new Vector3(0, 1, 0);
  CYLINDER_X.forEach((x, index) => {
    for (const side of ["intake", "exhaust"] as const) {
      const sign = Math.sign(CAM_Z[side]);
      for (const offset of [-VALVE_OFFSET_X, VALVE_OFFSET_X]) {
        const seat = new Vector3(x + offset, VALVE_SEAT_Y, sign * VALVE_SEAT_Z);
        const top = new Vector3(x + offset, CAM_Y - CAM_BASE_RADIUS - TAPPET_HEIGHT, CAM_Z[side]);
        const axis = top.clone().sub(seat).normalize();
        const orientation = new Quaternion().setFromUnitVectors(up, axis);
        valves.push({ cylinder: index + 1, side, seat, axis, orientation });
      }
    }
  });
  // Every valve shares one stem length, so the tappet sits at a fixed offset along the stem.
  const stemLength = new Vector3(
    0,
    CAM_Y - CAM_BASE_RADIUS - TAPPET_HEIGHT - VALVE_SEAT_Y,
    CAM_Z.intake - VALVE_SEAT_Z,
  ).length();
  const tappetGeometry = new CylinderGeometry(0.0135, 0.0135, TAPPET_HEIGHT, 32).translate(
    0,
    stemLength + TAPPET_HEIGHT / 2,
    0,
  );
  const valveInstances = new InstancedMesh(valveGeometry, materials.polishedSteel, valves.length);
  const tappetInstances = new InstancedMesh(tappetGeometry, materials.forgedSteel, valves.length);
  const springInstances = new InstancedMesh(springGeometry, materials.darkSteel, valves.length);
  for (const instances of [valveInstances, tappetInstances, springInstances]) {
    instances.frustumCulled = false;
    instances.instanceMatrix.setUsage(DynamicDrawUsage);
    root.add(instances);
  }

  // ── Timing chain around the crank and cam sprockets.
  const chainPoints: Vector3[] = [];
  const arc = (cz: number, cy: number, r: number, from: number, to: number, steps: number) => {
    for (let step = 0; step <= steps; step += 1) {
      const a = from + ((to - from) * step) / steps;
      chainPoints.push(new Vector3(-0.235, cy + r * Math.sin(a), cz + r * Math.cos(a)));
    }
  };
  arc(0, 0, 0.0315, Math.PI * 1.2, Math.PI * 1.8, 8);
  arc(CAM_Z.intake, CAM_Y, 0.0415, -0.2, Math.PI / 2, 10);
  arc(CAM_Z.exhaust, CAM_Y, 0.0415, Math.PI / 2, Math.PI + 0.2, 10);
  root.add(
    mesh(
      new TubeGeometry(new CatmullRomCurve3(chainPoints, true), 200, 0.0035, 6, true),
      materials.chain,
    ),
  );

  // ── Ignition: spark plug and coil-on-plug for each cylinder.
  const ignition = CYLINDER_X.map((x, index) => {
    const unit = new Group();
    unit.name = `ignition-${index + 1}`;
    unit.position.set(x, 0, 0);
    unit.add(
      mesh(
        new CylinderGeometry(0.0065, 0.0065, 0.018, 16).translate(0, 0.262, 0),
        materials.polishedSteel,
      ),
    );
    unit.add(
      mesh(
        new CylinderGeometry(0.009, 0.009, 0.012, 6).translate(0, 0.277, 0),
        materials.forgedSteel,
      ),
    );
    unit.add(
      mesh(
        new CylinderGeometry(0.0062, 0.0075, 0.05, 20).translate(0, 0.308, 0),
        materials.ceramic,
      ),
    );
    unit.add(
      mesh(
        new CylinderGeometry(0.0115, 0.0115, 0.04, 24).translate(0, 0.35, 0),
        materials.blackPlastic,
      ),
    );
    const coil = new BoxGeometry(0.03, 0.03, 0.05);
    coil.translate(0, 0.385, 0.004);
    unit.add(mesh(coil, materials.blackPlastic));
    unit.add(
      mesh(new BoxGeometry(0.014, 0.012, 0.02).translate(0, 0.39, 0.036), materials.blackPlastic),
    );
    root.add(unit);
    return unit;
  });

  // ── Exhaust manifold and turbocharger on the back face.
  const collector = new Vector3(0.11, 0.16, -0.19);
  CYLINDER_X.forEach((x) => {
    const curve = new CatmullRomCurve3([
      new Vector3(x, 0.262, -CASTING_DEPTH),
      new Vector3(x, 0.262, -0.13),
      new Vector3(x * 0.6 + 0.04, 0.2, -0.18),
      collector,
    ]);
    root.add(mesh(new TubeGeometry(curve, 40, 0.0165, 14, false), materials.exhaustIron));
    root.add(
      mesh(
        new BoxGeometry(0.05, 0.04, 0.008).translate(x, 0.262, -CASTING_DEPTH - 0.004),
        materials.exhaustIron,
      ),
    );
  });
  const turbo = new Group();
  turbo.position.set(0.25, 0.16, -0.2);
  turbo.add(
    mesh(new TorusGeometry(0.042, 0.024, 16, 40).rotateY(Math.PI / 2), materials.exhaustIron),
  );
  turbo.add(
    mesh(
      alongX(new CylinderGeometry(0.03, 0.03, 0.06, 28)).translate(0.04, 0, 0),
      materials.castIron,
    ),
  );
  turbo.add(
    mesh(
      new TorusGeometry(0.046, 0.022, 16, 40).rotateY(Math.PI / 2).translate(0.085, 0, 0),
      materials.machinedAluminum,
    ),
  );
  turbo.add(
    mesh(
      alongX(new CylinderGeometry(0.028, 0.03, 0.06, 28)).translate(0.13, 0, 0),
      materials.machinedAluminum,
    ),
  );
  turbo.add(
    mesh(
      alongX(new CylinderGeometry(0.031, 0.031, 0.05, 28)).translate(0.18, 0, 0),
      materials.rubber,
    ),
  );
  turbo.add(
    mesh(
      new CylinderGeometry(0.025, 0.025, 0.12, 24).translate(0, -0.08, 0),
      materials.exhaustIron,
    ),
  );
  root.add(turbo);
  root.add(
    mesh(
      new TubeGeometry(
        new CatmullRomCurve3([
          collector,
          new Vector3(0.18, 0.16, -0.2),
          new Vector3(0.22, 0.16, -0.2),
        ]),
        12,
        0.022,
        14,
      ),
      materials.exhaustIron,
    ),
  );

  // ── Combustion glow inside each chamber (scaled by combustion intensity each frame).
  const glowMaterial = new MeshBasicMaterial({
    color: 0xff8a3d,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const glows = CYLINDER_X.map((x) => {
    const glow = mesh(new SphereGeometry(0.034, 20, 12), glowMaterial.clone());
    glow.scale.set(1, 0.45, 0.6);
    glow.position.set(x, deckY + 0.006, 0);
    root.add(glow);
    return glow;
  });

  const scratch = new Vector3();
  const matrix = new Matrix4();
  const unitScale = new Vector3(1, 1, 1);
  const springScale = new Vector3(1, 1, 1);
  function pistonPose(cylinder: number, angle: number): PistonPose {
    const throwAngle = cylinder === 1 || cylinder === 4 ? 0 : Math.PI;
    const { crankPin, wristPin } = sliderCrank(
      angle + throwAngle,
      config.strokeM,
      config.connectingRodLengthM,
    );
    const x = CYLINDER_X[cylinder - 1]!;
    const wrist = new Vector3(x, wristPin.y, 0);
    const dy = crankPin.y - wristPin.y;
    const dz = crankPin.z - wristPin.z;
    return { piston: wrist, rod: wrist.clone(), rodRotationX: Math.atan2(-dz, -dy) };
  }

  function update(
    angle: number,
    combustion: readonly number[],
    detached: ReadonlySet<number>,
  ): void {
    crank.rotation.x = angle;
    cams.intake.shaft.rotation.x = angle / 2;
    cams.exhaust.shaft.rotation.x = angle / 2;
    for (let cylinder = 1; cylinder <= 4; cylinder += 1) {
      const state = cylinderState(angle, cylinder, config, 0);
      const glow = glows[cylinder - 1]!;
      (glow.material as MeshBasicMaterial).opacity =
        0.75 * state.combustionIntensity * (combustion[cylinder - 1] ?? 0);
      if (detached.has(cylinder)) continue;
      const pose = pistonPose(cylinder, angle);
      pistons[cylinder - 1]!.position.copy(pose.piston);
      rods[cylinder - 1]!.position.copy(pose.rod);
      rods[cylinder - 1]!.rotation.set(pose.rodRotationX, 0, 0);
    }
    valves.forEach((valve, index) => {
      const state = cylinderState(angle, valve.cylinder, config, 0);
      const lift = valve.side === "intake" ? state.intakeLiftM : state.exhaustLiftM;
      scratch.copy(valve.axis).multiplyScalar(-lift).add(valve.seat);
      matrix.compose(scratch, valve.orientation, unitScale);
      valveInstances.setMatrixAt(index, matrix);
      tappetInstances.setMatrixAt(index, matrix);
      const springBase = scratch.copy(valve.seat).addScaledVector(valve.axis, 0.034);
      springScale.set(1, 0.036 - lift, 1);
      matrix.compose(springBase, valve.orientation, springScale);
      springInstances.setMatrixAt(index, matrix);
    });
    valveInstances.instanceMatrix.needsUpdate = true;
    tappetInstances.instanceMatrix.needsUpdate = true;
    springInstances.instanceMatrix.needsUpdate = true;
  }

  // Merge static geometry per material: same image, far fewer draw calls on the headset.
  const live = new Set<Object3D>([
    crank,
    ...pistons,
    ...rods,
    cams.intake.assembly,
    cams.exhaust.assembly,
    ...ignition,
    ...glows,
    valveInstances,
    tappetInstances,
    springInstances,
  ]);
  bakeStatic(root, live);
  bakeStatic(crank);
  [...pistons, ...rods, ...ignition].forEach((part) => bakeStatic(part));
  for (const cam of [cams.intake, cams.exhaust]) {
    bakeStatic(cam.assembly, new Set([cam.shaft]));
    bakeStatic(cam.shaft);
  }

  return { root, crank, pistons, rods, ringMaterials, cams, valves, ignition, pistonPose, update };
}
