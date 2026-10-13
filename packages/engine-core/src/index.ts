import { advanceAngle } from "@motormind/engine-kinematics";
import type { EngineRuntimeState } from "@motormind/engine-schema";

export function stepEngine(state: EngineRuntimeState, deltaSeconds: number): EngineRuntimeState {
  if (!state.running) return state;
  const crankAngleRad = advanceAngle(state.crankAngleRad, state.rpm, deltaSeconds);
  return { ...state, crankAngleRad, cycleAngleDeg: (crankAngleRad * 180) / Math.PI };
}

export const labMissionStages = [
  "ready",
  "running",
  "faulted",
  "safe-stop",
  "intake-removed",
  "exhaust-removed",
  "plug-removed",
  "piston-accessed",
  "complete",
] as const;

export type LabMissionStage = (typeof labMissionStages)[number];

export interface LabMissionState {
  stage: LabMissionStage;
  running: boolean;
  faultId: "low-compression-cylinder-2" | null;
}

export interface LabMissionCopy {
  eyebrow: string;
  title: string;
  instruction: string;
  action: string;
}

export const initialLabMissionState: LabMissionState = {
  stage: "ready",
  running: false,
  faultId: null,
};

export const labMissionCopy: Record<LabMissionStage, LabMissionCopy> = {
  ready: {
    eyebrow: "Puesta en marcha",
    title: "Banco listo",
    instruction: "Apuntá y pellizcá Encender motor para iniciar la prueba.",
    action: "Encender motor",
  },
  running: {
    eyebrow: "Diagnóstico",
    title: "Motor en marcha estable",
    instruction: "Introducí una falla controlada de compresión en el cilindro 2.",
    action: "Inyectar falla C2",
  },
  faulted: {
    eyebrow: "Diagnóstico",
    title: "Baja compresión en C2",
    instruction: "La combustión del cilindro 2 es débil. Detené el motor antes de intervenir.",
    action: "Parada segura",
  },
  "safe-stop": {
    eyebrow: "Seguridad",
    title: "Energía aislada",
    instruction: "Retirá el árbol de levas de admisión.",
    action: "Retirar árbol de admisión",
  },
  "intake-removed": {
    eyebrow: "Desmontaje",
    title: "Admisión retirada",
    instruction: "Retirá el árbol de levas de escape.",
    action: "Retirar árbol de escape",
  },
  "exhaust-removed": {
    eyebrow: "Desmontaje",
    title: "Culata liberada",
    instruction: "Retirá la bobina y la bujía del cilindro 2.",
    action: "Retirar bujía 2",
  },
  "plug-removed": {
    eyebrow: "Desmontaje",
    title: "Cilindro 2 abierto",
    instruction: "Extraé el conjunto pistón-biela del cilindro 2.",
    action: "Extraer pistón 2",
  },
  "piston-accessed": {
    eyebrow: "Reparación",
    title: "Falla confirmada",
    instruction: "Segmentos del pistón 2 desgastados. Reemplazalos y validá el banco.",
    action: "Reparar y validar",
  },
  complete: {
    eyebrow: "Resultado",
    title: "Diagnóstico completo",
    instruction: "Compresión restablecida en los cuatro cilindros. Podés repetir la sesión.",
    action: "Nueva sesión",
  },
};

export function advanceLabMission(state: LabMissionState): LabMissionState {
  const index = labMissionStages.indexOf(state.stage);
  const nextStage = labMissionStages[(index + 1) % labMissionStages.length]!;

  return {
    stage: nextStage,
    running: nextStage === "running" || nextStage === "faulted",
    faultId:
      nextStage === "faulted" ||
      nextStage === "safe-stop" ||
      nextStage === "intake-removed" ||
      nextStage === "exhaust-removed" ||
      nextStage === "plug-removed" ||
      nextStage === "piston-accessed"
        ? "low-compression-cylinder-2"
        : null,
  };
}

export function canPauseLabMission(state: LabMissionState): boolean {
  return state.stage === "running" || state.stage === "faulted";
}

export function toggleLabMissionPause(state: LabMissionState): LabMissionState {
  if (!canPauseLabMission(state)) return state;
  return { ...state, running: !state.running };
}

export function resetLabMission(): LabMissionState {
  return { ...initialLabMissionState };
}
