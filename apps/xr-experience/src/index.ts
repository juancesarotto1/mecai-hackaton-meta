import {
  BoxGeometry,
  DirectionalLight,
  DistanceGrabbable,
  Euler,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MovementMode,
  PokeInteractable,
  Quaternion,
  RayInteractable,
  Vector3,
  World,
  createSystem,
  type Object3D,
} from "@iwsdk/core";
import projectOptions from "virtual:iwsdk-project";
import {
  advanceLabMission,
  canPauseLabMission,
  labMissionCopy,
  labMissionStages,
  resetLabMission,
  toggleLabMissionPause,
  type LabMissionStage,
} from "@motormind/engine-core";
import { TAU } from "@motormind/engine-kinematics";
import { inlineFourDohcTurboFixture } from "@motormind/engine-schema/fixture";
import { createEngineModel, CYLINDER_X } from "./engine-model";
import { createEngineMaterials, createStudioEnvironment } from "./materials";
import {
  createCanvasPanel,
  drawButton,
  drawCallout,
  drawStatus,
  palette,
  type CanvasPanel,
} from "./ui";
import { createWorkshop, ENGINE_ON_BENCH } from "./workshop";

const container = document.getElementById("scene-container");
if (!(container instanceof HTMLDivElement)) throw new Error("Missing #scene-container");

const config = inlineFourDohcTurboFixture.configuration;
const SIMULATED_RPM = 1200;
// The model runs at 1200 rpm; the view plays it 20× slower so motion stays readable.
const VIEW_SLOW_MOTION = 20;
const FAULT_COMBUSTION = 0.3;
const PART_TRAVEL_S = 0.9;

let mission = resetLabMission();
let crankAngle = 0;
let elapsed = 0;

const stageIndex = (stage: LabMissionStage): number => labMissionStages.indexOf(stage);
const isAtOrAfter = (stage: LabMissionStage): boolean =>
  stageIndex(mission.stage) >= stageIndex(stage) && mission.stage !== "complete";

const world = await World.create(container, projectOptions);
const environment = createStudioEnvironment(world.renderer);
const materials = createEngineMaterials(environment);

world.createTransformEntity(new HemisphereLight(0xe4ebf2, 0x1a1a1a, 0.35));
const key = new DirectionalLight(0xfff6ec, 1.7);
key.position.set(-1.2, 3.2, 1.6);
world.createTransformEntity(key);
const rim = new DirectionalLight(0xbcd4ff, 0.7);
rim.position.set(1.8, 1.6, -2.2);
world.createTransformEntity(rim);

// ── Workshop: floor, bench and the engine on its mounts.
const { floor, bench } = createWorkshop(materials);
world.createTransformEntity(floor);
bench.position.set(-0.13, 0, -0.85);
bench.rotation.y = 0.2;
world.createTransformEntity(bench);
bench.updateMatrixWorld(true);

const engine = createEngineModel(config, materials);
const engineMount = new Group();
engineMount.name = "engine-mount";
engineMount.position.copy(bench.localToWorld(ENGINE_ON_BENCH.clone()));
engineMount.quaternion.copy(bench.quaternion);
const engineBody = new Group();
engineBody.add(engine.root);
engineMount.add(engineBody);
const restingOrientation = engineMount.quaternion.clone();
world
  .createTransformEntity(engineMount)
  .addComponent(RayInteractable)
  .addComponent(DistanceGrabbable, {
    movementMode: MovementMode.RotateAtSource,
    translate: false,
    scale: false,
    rotate: true,
    rotateMin: [-0.5, -Math.PI, -0.5],
    rotateMax: [0.5, Math.PI, 0.5],
  });

// ── Removable assemblies travel between their engine pose and the parts mat on the bench.
interface Pose {
  position: Vector3;
  quaternion: Quaternion;
}
interface Removable {
  object: Object3D;
  removed: boolean;
  progress: number;
  from: Pose;
  tray: Pose;
  home: () => Pose;
}
const pose = (x: number, y: number, z: number, euler = new Euler()): Pose => ({
  position: new Vector3(x, y, z),
  quaternion: new Quaternion().setFromEuler(euler),
});
const fixedHome = (object: Object3D): (() => Pose) => {
  const home = { position: object.position.clone(), quaternion: object.quaternion.clone() };
  return () => home;
};
const removable = (object: Object3D, tray: Pose, home = fixedHome(object)): Removable => ({
  object,
  removed: false,
  progress: 1,
  from: home(),
  tray,
  home,
});
const layFlatAlongZ = new Quaternion()
  .setFromEuler(new Euler(0, -Math.PI / 2, 0))
  .multiply(new Quaternion().setFromEuler(new Euler(0, 0, Math.PI / 2)));
const removables = {
  intake: removable(
    engine.cams.intake.assembly,
    pose(-0.5, 0.678, 0, new Euler(0, Math.PI / 2, 0)),
  ),
  exhaust: removable(
    engine.cams.exhaust.assembly,
    pose(-0.4, 0.678, 0, new Euler(0, Math.PI / 2, 0)),
  ),
  plug: removable(
    engine.ignition[1]!,
    pose(-0.25 + 0.33, 0.652, 0.17, new Euler(0, 0, Math.PI / 2)),
  ),
  piston: removable(engine.pistons[1]!, pose(-0.24, 0.661, -0.15), () => {
    const live = engine.pistonPose(2, crankAngle);
    return { position: live.piston, quaternion: new Quaternion() };
  }),
  rod: removable(
    engine.rods[1]!,
    { position: new Vector3(-0.31, 0.646, -0.07), quaternion: layFlatAlongZ },
    () => {
      const live = engine.pistonPose(2, crankAngle);
      return {
        position: live.rod,
        quaternion: new Quaternion().setFromEuler(new Euler(live.rodRotationX, 0, 0)),
      };
    },
  ),
};

function setRemoved(item: Removable, removed: boolean, instant: boolean): void {
  if (item.removed === removed) return;
  item.removed = removed;
  item.object.updateWorldMatrix(true, false);
  (removed ? bench : engine.root).attach(item.object);
  item.from = {
    position: item.object.position.clone(),
    quaternion: item.object.quaternion.clone(),
  };
  item.progress = instant ? 1 : 0;
  if (instant) {
    const target = removed ? item.tray : item.home();
    item.object.position.copy(target.position);
    item.object.quaternion.copy(target.quaternion);
  }
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function stepRemovable(item: Removable, delta: number): void {
  if (item.progress >= 1) return; // settled: the tray holds it, or kinematics drives it
  item.progress = Math.min(1, item.progress + delta / PART_TRAVEL_S);
  const target = item.removed ? item.tray : item.home();
  const t = ease(item.progress);
  item.object.position.lerpVectors(item.from.position, target.position, t);
  item.object.quaternion.slerpQuaternions(item.from.quaternion, target.quaternion, t);
}

// ── Diagnostic callout above cylinder 2.
const callout = createCanvasPanel(0.22, 0.058, "callout-c2");
drawCallout(callout, "C2 · compresión baja", "≈ 42 % de la nominal · combustión débil");
callout.mesh.position.set(CYLINDER_X[1], 0.5, 0.03);
const leader = new Mesh(
  new BoxGeometry(0.0018, 0.07, 0.0018),
  new MeshBasicMaterial({ color: palette.warning }),
);
leader.position.set(CYLINDER_X[1], 0.437, 0.03);
const calloutGroup = new Group();
calloutGroup.add(callout.mesh, leader);
engine.root.add(calloutGroup);

// ── Status panel at eye level and a control console within seated reach.
const status = createCanvasPanel(0.56, 0.35, "status-panel");
status.mesh.position.set(0.66, 1.2, -0.74);
status.mesh.rotation.y = -0.72;
world.createTransformEntity(status.mesh);

const consolePlacement = new Group();
consolePlacement.position.set(0.45, 0.84, -0.42);
consolePlacement.rotation.copy(new Euler(-0.85, -0.78, 0, "YXZ"));
consolePlacement.updateMatrixWorld(true);
const consoleBack = createCanvasPanel(0.34, 0.2, "console");
{
  const { context, canvas, texture } = consoleBack;
  context.beginPath();
  context.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 40);
  context.fillStyle = "rgba(10, 13, 17, 0.96)";
  context.fill();
  context.strokeStyle = palette.stroke;
  context.lineWidth = 3;
  context.stroke();
  texture.needsUpdate = true;
}
function placeOnConsole(object: Object3D, x: number, y: number, z: number): void {
  const anchor = new Group();
  anchor.position.set(x, y, z);
  consolePlacement.add(anchor);
  anchor.updateMatrixWorld(true);
  anchor.matrixWorld.decompose(object.position, object.quaternion, object.scale);
  consolePlacement.remove(anchor);
}
placeOnConsole(consoleBack.mesh, 0, 0, 0);
world.createTransformEntity(consoleBack.mesh);

interface MissionButton {
  panel: CanvasPanel;
  primary: boolean;
  label: () => string;
  hint?: () => string | undefined;
  enabled: () => boolean;
  activate: () => void;
  hovered: boolean;
}
const buttons: MissionButton[] = [
  {
    panel: createCanvasPanel(0.3, 0.078, "action-button"),
    primary: true,
    label: () => labMissionCopy[mission.stage].action,
    hint: () => "Apuntá y pellizcá, o tocá",
    enabled: () => true,
    activate: () => {
      mission = advanceLabMission(mission);
    },
    hovered: false,
  },
  {
    panel: createCanvasPanel(0.145, 0.06, "pause-button"),
    primary: false,
    label: () => (canPauseLabMission(mission) && !mission.running ? "Reanudar" : "Pausar"),
    enabled: () => canPauseLabMission(mission),
    activate: () => {
      mission = toggleLabMissionPause(mission);
    },
    hovered: false,
  },
  {
    panel: createCanvasPanel(0.145, 0.06, "reset-button"),
    primary: false,
    label: () => "Reiniciar",
    enabled: () => true,
    activate: () => {
      mission = resetLabMission();
      crankAngle = 0;
      engineMount.quaternion.copy(restingOrientation);
    },
    hovered: false,
  },
];
const buttonLayout = [
  [0, 0.036],
  [-0.0775, -0.05],
  [0.0775, -0.05],
] as const;

function drawMissionButton(button: MissionButton): void {
  const enabled = button.enabled();
  const hint = button.hint?.();
  drawButton(button.panel, button.label(), {
    primary: button.primary,
    hovered: button.hovered && enabled,
    enabled,
    ...(hint ? { hint } : {}),
  });
}

function playTone(frequency: number): void {
  const audio = new window.AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.03, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.09);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.09);
  oscillator.addEventListener("ended", () => void audio.close());
}

buttons.forEach((button, index) => {
  const [x, y] = buttonLayout[index]!;
  placeOnConsole(button.panel.mesh, x, y, 0.004);
  const entity = world.createTransformEntity(button.panel.mesh);
  entity.addComponent(RayInteractable);
  entity.addComponent(PokeInteractable);
  entity.object3D!.addEventListener("pointerenter", () => {
    button.hovered = true;
    drawMissionButton(button);
  });
  entity.object3D!.addEventListener("pointerleave", () => {
    button.hovered = false;
    drawMissionButton(button);
  });
  entity.object3D!.addEventListener("click", () => {
    if (!button.enabled()) {
      playTone(220);
      return;
    }
    playTone(button.primary ? 660 : 480);
    button.activate();
    applyMissionState(false);
  });
});

function applyMissionState(instant: boolean): void {
  setRemoved(removables.intake, isAtOrAfter("intake-removed"), instant);
  setRemoved(removables.exhaust, isAtOrAfter("exhaust-removed"), instant);
  setRemoved(removables.plug, isAtOrAfter("plug-removed"), instant);
  const pistonOut = isAtOrAfter("piston-accessed");
  setRemoved(removables.piston, pistonOut, instant);
  setRemoved(removables.rod, pistonOut, instant);
  // Worn compression rings glow amber once the piston is out for inspection.
  const rings = engine.ringMaterials[1]!;
  rings.emissive.setHex(pistonOut ? 0x8a3b00 : 0x000000);
  rings.emissiveIntensity = pistonOut ? 1.4 : 0;
  calloutGroup.visible = isAtOrAfter("faulted");

  const copy = labMissionCopy[mission.stage];
  drawStatus(status, {
    step: stageIndex(mission.stage),
    steps: labMissionStages.length - 1,
    stepLabel:
      mission.stage === "complete"
        ? "MISIÓN COMPLETA"
        : `PASO ${stageIndex(mission.stage) + 1} DE ${labMissionStages.length - 1}`,
    phase: copy.eyebrow,
    title: copy.title,
    instruction: copy.instruction,
    running: mission.running,
    paused: canPauseLabMission(mission) && !mission.running,
    fault: mission.faultId ? "Falla activa: compresión C2" : null,
    complete: mission.stage === "complete",
  });
  buttons.forEach(drawMissionButton);
  const badge = document.querySelector(".badge span");
  if (badge) badge.textContent = copy.title;
}

class BenchSystem extends createSystem({}) {
  update(delta: number): void {
    const dt = Math.min(delta, 0.05);
    elapsed += dt;
    if (mission.running) {
      crankAngle = (crankAngle + ((SIMULATED_RPM * TAU) / 60 / VIEW_SLOW_MOTION) * dt) % (TAU * 2);
    }
    const faulty = mission.faultId !== null;
    const combustion = mission.running ? [1, faulty ? FAULT_COMBUSTION : 1, 1, 1] : [0, 0, 0, 0];
    const pistonHome = !removables.piston.removed && removables.piston.progress >= 1;
    engine.update(crankAngle, combustion, pistonHome ? new Set() : new Set([2]));
    for (const item of Object.values(removables)) stepRemovable(item, dt);

    // A weak cylinder makes the block rock on its mounts.
    const rough = mission.running && faulty ? 1 : 0;
    engineBody.position.y = rough * 0.0012 * Math.sin(elapsed * TAU * 2.5);
    engineBody.rotation.x = rough * 0.0035 * Math.sin(elapsed * TAU * 1.25 + 0.6);
  }
}
world.registerSystem(BenchSystem);
applyMissionState(true);
