import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DistanceGrabbable,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MovementMode,
  PlaneGeometry,
  PointLight,
  PokeInteractable,
  RayInteractable,
  TorusGeometry,
  Vector3,
  World,
  createSystem,
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
import { sliderCrank, TAU } from "@motormind/engine-kinematics";
import { inlineFourDohcTurboFixture } from "@motormind/engine-schema/fixture";

const container = document.getElementById("scene-container");
if (!(container instanceof HTMLDivElement)) throw new Error("Missing #scene-container");

const config = inlineFourDohcTurboFixture.configuration;
// Bench frame (rig-local metres). Both pins come from the rigid slider-crank solution, so the
// rendered rod keeps its length through the cycle.
const CRANK_AXIS_Y = 0.5;
const KINEMATIC_SCALE = 2.6;
const CROWN_ABOVE_WRIST = 0.12;
let mission = resetLabMission();

const rig = {
  root: new Group(),
  crank: new Group(),
  pistons: [] as Group[],
  rods: [] as Mesh[],
  cams: [] as Mesh[],
  plugs: [] as Mesh[],
  pistonMaterials: [] as MeshStandardMaterial[],
  angle: 0,
};

const stageIndex = (stage: LabMissionStage): number => labMissionStages.indexOf(stage);

function isAtOrAfter(stage: LabMissionStage): boolean {
  return stageIndex(mission.stage) >= stageIndex(stage) && mission.stage !== "complete";
}

class EngineMotionSystem extends createSystem({}) {
  update(delta: number): void {
    if (mission.running) {
      rig.angle = (rig.angle + ((1200 * TAU) / 60) * Math.min(delta, 0.05)) % (TAU * 2);
    }
    rig.crank.rotation.x = rig.angle;
    const xs = [-0.54, -0.18, 0.18, 0.54];
    const up = new Vector3(0, 1, 0);
    xs.forEach((x, index) => {
      const piston = rig.pistons[index]!;
      const rod = rig.rods[index]!;
      if (index === 1 && isAtOrAfter("piston-accessed")) {
        piston.position.set(0.72, 0.68, 0.48);
        piston.rotation.z = -0.32;
        rod.position.set(0.54, 0.48, 0.48);
        rod.rotation.set(0, 0, -0.8);
        rod.scale.y = 0.82;
        return;
      }

      const phase = index === 0 || index === 3 ? 0 : Math.PI;
      const mechanism = sliderCrank(
        rig.angle + phase,
        config.strokeM,
        config.connectingRodLengthM,
        1200,
      );
      const crankPin = new Vector3(
        x,
        CRANK_AXIS_Y + mechanism.crankPin.y * KINEMATIC_SCALE,
        mechanism.crankPin.z * KINEMATIC_SCALE,
      );
      const wrist = new Vector3(x, CRANK_AXIS_Y + mechanism.wristPin.y * KINEMATIC_SCALE, 0);
      piston.position.set(0, wrist.y + CROWN_ABOVE_WRIST, 0);
      piston.rotation.set(0, 0, 0);
      const direction = wrist.clone().sub(crankPin);
      rod.position.copy(wrist.clone().add(crankPin).multiplyScalar(0.5));
      rod.scale.y = direction.length();
      rod.quaternion.setFromUnitVectors(up, direction.normalize());
    });
  }
}

const world = await World.create(container, projectOptions);
rig.root.position.set(-0.42, 0.18, -2);
rig.root.rotation.y = -0.2;
rig.root.scale.setScalar(0.72);
const restingOrientation = rig.root.quaternion.clone();
const steel = new MeshStandardMaterial({ color: 0x81929d, metalness: 0.82, roughness: 0.28 });
const dark = new MeshStandardMaterial({ color: 0x25333e, metalness: 0.86, roughness: 0.22 });
const orange = new MeshStandardMaterial({ color: 0xff6a2a, metalness: 0.62, roughness: 0.3 });
const block = new Mesh(
  new BoxGeometry(1.65, 0.86, 0.82),
  new MeshStandardMaterial({
    color: 0x25445a,
    metalness: 0.65,
    roughness: 0.35,
    transparent: true,
    opacity: 0.35,
  }),
);
block.position.y = 0.85;
rig.root.add(block);
const shaft = new Mesh(new CylinderGeometry(0.09, 0.09, 2, 24), dark);
shaft.rotation.z = Math.PI / 2;
rig.crank.add(shaft);
rig.crank.position.set(0, CRANK_AXIS_Y, 0);
rig.root.add(rig.crank);
[-0.54, -0.18, 0.18, 0.54].forEach((x) => {
  const piston = new Group();
  const pistonMaterial = steel.clone();
  const crown = new Mesh(new CylinderGeometry(0.21, 0.21, 0.25, 28), pistonMaterial);
  crown.position.x = x;
  piston.add(crown);
  rig.root.add(piston);
  rig.pistons.push(piston);
  rig.pistonMaterials.push(pistonMaterial);
  const rod = new Mesh(new CylinderGeometry(0.035, 0.05, 1, 14), orange);
  rig.root.add(rod);
  rig.rods.push(rod);
});
for (const z of [-0.27, 0.27]) {
  const cam = new Mesh(new CylinderGeometry(0.055, 0.055, 1.8, 18), dark);
  cam.rotation.z = Math.PI / 2;
  cam.position.set(0, 1.55, z);
  rig.root.add(cam);
  rig.cams.push(cam);
}
[-0.54, -0.18, 0.18, 0.54].forEach((x) => {
  const plug = new Mesh(new CylinderGeometry(0.026, 0.026, 0.28, 12), orange);
  plug.position.set(x, 1.42, 0);
  rig.root.add(plug);
  rig.plugs.push(plug);
});
const turbo = new Mesh(new TorusGeometry(0.24, 0.09, 16, 32), steel);
turbo.position.set(1.15, 1.02, 0.38);
turbo.rotation.y = Math.PI / 2;
rig.root.add(turbo);
const warm = new PointLight(0xff6a2a, 5, 5);
warm.position.set(-1.5, 2.5, 0);
rig.root.add(warm);
world.createTransformEntity(new AmbientLight(0xa8c8e8, 1.7));
world
  .createTransformEntity(rig.root)
  .addComponent(RayInteractable)
  .addComponent(DistanceGrabbable, {
    movementMode: MovementMode.RotateAtSource,
    translate: false,
    scale: false,
    rotate: true,
    rotateMin: [-0.45, -Math.PI, -0.45],
    rotateMax: [0.45, Math.PI, 0.45],
  });
world.registerSystem(EngineMotionSystem);

interface CanvasSurface {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
}

function createCanvasSurface(width: number, height: number, worldWidth: number): CanvasSurface {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  const texture = new CanvasTexture(canvas);
  const material = new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide });
  const mesh = new Mesh(new PlaneGeometry(worldWidth, worldWidth * (height / width)), material);
  return { canvas, context, texture, mesh };
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = candidate;
    }
  }
  context.fillText(line, x, currentY);
}

const statusSurface = createCanvasSurface(1024, 520, 0.9);
statusSurface.mesh.position.set(0.9, 1.52, -1.62);
world.createTransformEntity(statusSurface.mesh);

const actionSurface = createCanvasSurface(1024, 220, 0.9);
actionSurface.mesh.position.set(0.9, 1.12, -1.58);

const pauseSurface = createCanvasSurface(480, 190, 0.42);
pauseSurface.mesh.position.set(0.66, 0.9, -1.57);

const resetSurface = createCanvasSurface(480, 190, 0.42);
resetSurface.mesh.position.set(1.14, 0.9, -1.57);

function drawStatus(): void {
  const { context, canvas, texture } = statusSurface;
  const copy = labMissionCopy[mission.stage];
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#08131d";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = mission.stage === "complete" ? "#58e3aa" : "#4aa9ff";
  context.lineWidth = 8;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  context.fillStyle = mission.faultId ? "#ff6a2a" : "#4aa9ff";
  context.font = "700 34px monospace";
  context.fillText(copy.eyebrow, 54, 72);
  context.fillStyle = "#f4f8fb";
  context.font = "800 54px system-ui";
  context.fillText(copy.title, 54, 158);
  context.fillStyle = "#a9bfd0";
  context.font = "34px system-ui";
  wrapText(context, copy.instruction, 54, 228, 900, 48);
  context.fillStyle = mission.running ? "#58e3aa" : "#7890a2";
  context.font = "700 28px monospace";
  context.fillText(mission.running ? "MOTOR 1200 RPM" : "MOTOR DETENIDO", 54, 430);
  context.fillStyle = "#7890a2";
  context.fillText("MANOS: APUNTAR + PELLIZCAR / TOCAR", 420, 430);
  texture.needsUpdate = true;
}

function drawButton(
  surface: CanvasSurface,
  label: string,
  primary: boolean,
  hovered = false,
  disabled = false,
): void {
  const { context, canvas, texture } = surface;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = disabled ? "#0b1620" : hovered ? "#66baff" : primary ? "#369df5" : "#122433";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = disabled ? "#24394a" : hovered ? "#ffffff" : "#4aa9ff";
  context.lineWidth = 10;
  context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  context.fillStyle = disabled ? "#4d6577" : primary || hovered ? "#03101a" : "#eaf5ff";
  context.font = `${primary ? 800 : 700} ${primary ? 48 : 38}px monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, canvas.width / 2, canvas.height / 2);
  context.textAlign = "start";
  context.textBaseline = "alphabetic";
  texture.needsUpdate = true;
}

function playConfirmation(tone = 520): void {
  const AudioContextClass = window.AudioContext;
  const audio = new AudioContextClass();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = tone;
  gain.gain.setValueAtTime(0.035, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.08);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.08);
  oscillator.addEventListener("ended", () => void audio.close());
}

function applyMissionVisuals(): void {
  const intakeRemoved = isAtOrAfter("intake-removed");
  const exhaustRemoved = isAtOrAfter("exhaust-removed");
  const plugRemoved = isAtOrAfter("plug-removed");

  rig.cams[0]!.position.set(intakeRemoved ? -0.75 : 0, intakeRemoved ? 2.05 : 1.55, -0.27);
  // Removed parts stack on the left, clear of the status panel on the right.
  rig.cams[1]!.position.set(exhaustRemoved ? -0.75 : 0, exhaustRemoved ? 2.35 : 1.55, 0.27);
  rig.plugs[1]!.position.set(plugRemoved ? 0.38 : -0.18, plugRemoved ? 2.04 : 1.42, 0.18);
  rig.pistonMaterials.forEach((material, index) => {
    material.emissive.setHex(index === 1 && mission.faultId ? 0x8b2100 : 0x000000);
    material.emissiveIntensity = index === 1 && mission.faultId ? 1.2 : 0;
  });

  drawStatus();
  buttons.forEach((button) => drawMissionButton(button));

  const badge = document.querySelector(".badge span");
  if (badge) badge.textContent = labMissionCopy[mission.stage].title;
}

interface MissionButton {
  surface: CanvasSurface;
  primary: boolean;
  label: () => string;
  enabled: () => boolean;
  activate: () => void;
}

const buttons: MissionButton[] = [
  {
    surface: actionSurface,
    primary: true,
    label: () => labMissionCopy[mission.stage].action,
    enabled: () => true,
    activate: () => {
      mission = advanceLabMission(mission);
    },
  },
  {
    surface: pauseSurface,
    primary: false,
    label: () => (canPauseLabMission(mission) && !mission.running ? "REANUDAR" : "PAUSAR"),
    enabled: () => canPauseLabMission(mission),
    activate: () => {
      mission = toggleLabMissionPause(mission);
    },
  },
  {
    surface: resetSurface,
    primary: false,
    label: () => "REINICIAR",
    enabled: () => true,
    activate: () => {
      mission = resetLabMission();
      rig.angle = 0;
      rig.root.quaternion.copy(restingOrientation);
    },
  },
];

function drawMissionButton(button: MissionButton, hovered = false): void {
  const enabled = button.enabled();
  drawButton(button.surface, button.label(), button.primary, hovered && enabled, !enabled);
}

for (const button of buttons) {
  const entity = world.createTransformEntity(button.surface.mesh);
  entity.addComponent(RayInteractable);
  entity.addComponent(PokeInteractable);
  entity.object3D!.addEventListener("pointerenter", () => drawMissionButton(button, true));
  entity.object3D!.addEventListener("pointerleave", () => drawMissionButton(button));
  entity.object3D!.addEventListener("click", () => {
    if (!button.enabled()) {
      playConfirmation(220);
      return;
    }
    playConfirmation(button.primary ? 620 : 460);
    button.activate();
    applyMissionVisuals();
  });
}

applyMissionVisuals();
