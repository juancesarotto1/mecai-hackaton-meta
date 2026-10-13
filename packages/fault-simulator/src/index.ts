import type { CylinderState, FaultDefinition } from "@motormind/engine-schema";

export interface TorqueSnapshot {
  indicatedNm: number;
  resistingNm: number;
  netNm: number;
  smoothness: number;
  perCylinderNm: number[];
  fidelity: "first-order";
}

export function simulateTorque(
  cylinders: CylinderState[],
  activeFaults: FaultDefinition[],
  rpm: number,
): TorqueSnapshot {
  const cylinderFault = new Map(
    activeFaults
      .filter((fault) => fault.cylinder !== null)
      .map((fault) => [fault.cylinder!, fault]),
  );
  const globalFactor = activeFaults
    .filter((fault) => fault.cylinder === null)
    .reduce((factor, fault) => factor * fault.torqueFactor, 1);
  const speedFactor = Math.max(0.35, 1 - Math.max(0, rpm - 4200) / 8000);
  const perCylinderNm = cylinders.map((state) => {
    const factor = cylinderFault.get(state.cylinder)?.torqueFactor ?? 1;
    return state.combustionIntensity * 95 * factor * speedFactor;
  });
  const indicatedNm = perCylinderNm.reduce((sum, value) => sum + value, 0) * globalFactor;
  const resistingNm =
    7 + rpm * 0.0035 + (activeFaults.some((fault) => fault.id === "excessive-load") ? 35 : 0);
  const average =
    perCylinderNm.reduce((sum, value) => sum + value, 0) / Math.max(perCylinderNm.length, 1);
  const variance =
    perCylinderNm.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    Math.max(perCylinderNm.length, 1);
  return {
    indicatedNm,
    resistingNm,
    netNm: indicatedNm - resistingNm,
    smoothness: Math.max(0, 1 - Math.sqrt(variance) / 95),
    perCylinderNm,
    fidelity: "first-order",
  };
}
