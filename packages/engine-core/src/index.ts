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
    eyebrow: "MISION 0 / 8",
    title: "BANCO LISTO",
    instruction: "Apunta y pellizca para iniciar el motor.",
    action: "ENCENDER MOTOR",
  },
  running: {
    eyebrow: "MISION 1 / 8",
    title: "MOTOR ESTABLE",
    instruction: "Introduce una falla controlada en el cilindro 2.",
    action: "INYECTAR FALLA C2",
  },
  faulted: {
    eyebrow: "MISION 2 / 8",
    title: "BAJA COMPRESION C2",
    instruction: "Deten el motor antes de intervenirlo.",
    action: "PARADA SEGURA",
  },
  "safe-stop": {
    eyebrow: "MISION 3 / 8",
    title: "ENERGIA AISLADA",
    instruction: "Retira el arbol de admision.",
    action: "RETIRAR ADMISION",
  },
  "intake-removed": {
    eyebrow: "MISION 4 / 8",
    title: "ADMISION RETIRADA",
    instruction: "Retira el arbol de escape.",
    action: "RETIRAR ESCAPE",
  },
  "exhaust-removed": {
    eyebrow: "MISION 5 / 8",
    title: "CULATA LIBERADA",
    instruction: "Retira la bujia del cilindro 2.",
    action: "RETIRAR BUJIA 2",
  },
  "plug-removed": {
    eyebrow: "MISION 6 / 8",
    title: "CILINDRO 2 ABIERTO",
    instruction: "Extrae el conjunto piston-biela.",
    action: "EXTRAER PISTON 2",
  },
  "piston-accessed": {
    eyebrow: "MISION 7 / 8",
    title: "FALLA CONFIRMADA",
    instruction: "Repara y valida el banco.",
    action: "REPARAR Y VALIDAR",
  },
  complete: {
    eyebrow: "MISION 8 / 8",
    title: "DIAGNOSTICO COMPLETO",
    instruction: "Sesion terminada. Puedes repetirla.",
    action: "NUEVA SESION",
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
