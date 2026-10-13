import type { CylinderState, SimulationConfiguration } from "@motormind/engine-schema";

export const TAU = Math.PI * 2;
export const FOUR_STROKE_RADIANS = TAU * 2;

export function rpmToAngularVelocity(rpm: number): number {
  if (!Number.isFinite(rpm) || rpm < 0) throw new RangeError("RPM must be finite and non-negative");
  return (rpm * TAU) / 60;
}

export function angularVelocityToRpm(radiansPerSecond: number): number {
  if (!Number.isFinite(radiansPerSecond) || radiansPerSecond < 0)
    throw new RangeError("Angular velocity must be finite and non-negative");
  return (radiansPerSecond * 60) / TAU;
}

export function normalizeAngle(angleRad: number, period = FOUR_STROKE_RADIANS): number {
  const normalized = angleRad % period;
  return normalized < 0 ? normalized + period : normalized;
}

export function advanceAngle(angleRad: number, rpm: number, deltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0)
    throw new RangeError("Delta time must be finite and non-negative");
  return normalizeAngle(angleRad + rpmToAngularVelocity(rpm) * deltaSeconds);
}

export interface SliderCrankResult {
  displacementFromTdcM: number;
  velocityMps: number;
  crankPin: { y: number; z: number };
  wristPin: { y: number; z: number };
}

export function sliderCrank(
  crankAngleRad: number,
  strokeM: number,
  connectingRodLengthM: number,
  rpm = 0,
): SliderCrankResult {
  const radius = strokeM / 2;
  if (radius <= 0 || connectingRodLengthM <= radius)
    throw new RangeError("Connecting rod length must exceed crank radius");
  const theta = normalizeAngle(crankAngleRad, TAU);
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  const radical = Math.sqrt(connectingRodLengthM ** 2 - radius ** 2 * sin ** 2);
  const wristY = radius * cos + radical;
  const displacement = radius + connectingRodLengthM - wristY;
  const derivative = radius * sin + (radius ** 2 * sin * cos) / radical;
  return {
    displacementFromTdcM: displacement,
    velocityMps: derivative * rpmToAngularVelocity(rpm),
    crankPin: { y: radius * cos, z: radius * sin },
    wristPin: { y: wristY, z: 0 },
  };
}

export type StrokePhase = CylinderState["phase"];

export function phaseAtCycleAngle(cycleDeg: number): StrokePhase {
  const angle = ((cycleDeg % 720) + 720) % 720;
  if (angle < 180) return "power";
  if (angle < 360) return "exhaust";
  if (angle < 540) return "intake";
  return "compression";
}

export function cylinderCycleAngle(
  globalCycleDeg: number,
  cylinder: number,
  firingOrder: readonly number[],
): number {
  const firingIndex = firingOrder.indexOf(cylinder);
  if (firingIndex < 0) throw new RangeError(`Cylinder ${cylinder} is absent from the firing order`);
  return (((globalCycleDeg - firingIndex * 180) % 720) + 720) % 720;
}

function smoothValveLift(
  localDeg: number,
  openDeg: number,
  closeDeg: number,
  maxLiftM = 0.009,
): number {
  const span = closeDeg - openDeg;
  const relative = localDeg - openDeg;
  if (relative < 0 || relative > span) return 0;
  return maxLiftM * Math.sin((Math.PI * relative) / span) ** 2;
}

export function cylinderState(
  globalCrankAngleRad: number,
  cylinder: number,
  configuration: SimulationConfiguration,
  rpm: number,
  combustionEnabled = true,
): CylinderState {
  const globalCycleDeg = (normalizeAngle(globalCrankAngleRad) * 180) / Math.PI;
  const cycleDeg = cylinderCycleAngle(globalCycleDeg, cylinder, configuration.firingOrder);
  const crankPhase = cylinder === 1 || cylinder === 4 ? 0 : Math.PI;
  const mechanism = sliderCrank(
    globalCrankAngleRad + crankPhase,
    configuration.strokeM,
    configuration.connectingRodLengthM,
    rpm,
  );
  const phase = phaseAtCycleAngle(cycleDeg);
  return {
    cylinder,
    cycleDeg,
    phase,
    pistonPositionM: mechanism.displacementFromTdcM,
    pistonVelocityMps: mechanism.velocityMps,
    intakeLiftM: smoothValveLift(cycleDeg, 345, 555),
    exhaustLiftM: smoothValveLift(cycleDeg, 165, 375),
    combustionIntensity:
      combustionEnabled && cycleDeg < 90 ? Math.sin((Math.PI * cycleDeg) / 90) : 0,
  };
}

export function allCylinderStates(
  angleRad: number,
  configuration: SimulationConfiguration,
  rpm: number,
  disabledCombustion = new Set<number>(),
): CylinderState[] {
  return [1, 2, 3, 4].map((cylinder) =>
    cylinderState(angleRad, cylinder, configuration, rpm, !disabledCombustion.has(cylinder)),
  );
}

export class FixedStepClock {
  private accumulator = 0;
  constructor(readonly stepSeconds: number) {
    if (stepSeconds <= 0) throw new RangeError("Fixed step must be positive");
  }
  consume(deltaSeconds: number, step: (dt: number) => void): number {
    this.accumulator += Math.min(Math.max(deltaSeconds, 0), 0.25);
    let count = 0;
    while (this.accumulator + Number.EPSILON >= this.stepSeconds) {
      step(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      count += 1;
    }
    return count;
  }
  reset(): void {
    this.accumulator = 0;
  }
}
