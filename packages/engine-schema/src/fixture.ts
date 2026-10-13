import type { EngineDefinition, MechanicalPart, PartTransform } from "./index";
import { validateEngineDefinition } from "./index";

const transform = (x: number, y: number, z: number): PartTransform => ({
  positionM: { x, y, z },
  rotationRad: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
});

const parts: MechanicalPart[] = [
  {
    id: "engine-block",
    name: "Bloque",
    system: "structure",
    kind: "block",
    transform: transform(0, 0, 0),
    selectable: true,
    removable: false,
  },
  {
    id: "crankshaft",
    name: "Cigüeñal",
    system: "bottom-end",
    kind: "crankshaft",
    transform: transform(0, -0.12, 0),
    selectable: true,
    removable: true,
  },
  {
    id: "intake-camshaft",
    name: "Árbol de admisión",
    system: "valvetrain",
    kind: "camshaft",
    transform: transform(0, 0.2, -0.06),
    selectable: true,
    removable: true,
  },
  {
    id: "exhaust-camshaft",
    name: "Árbol de escape",
    system: "valvetrain",
    kind: "camshaft",
    transform: transform(0, 0.2, 0.06),
    selectable: true,
    removable: true,
  },
  {
    id: "turbo",
    name: "Turbocompresor",
    system: "induction",
    kind: "turbo",
    transform: transform(0.32, 0.05, 0.12),
    selectable: true,
    removable: true,
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `piston-${index + 1}`,
    name: `Pistón ${index + 1}`,
    system: "bottom-end" as const,
    kind: "piston" as const,
    transform: transform((index - 1.5) * 0.095, 0.02, 0),
    selectable: true,
    removable: true,
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `rod-${index + 1}`,
    name: `Biela ${index + 1}`,
    system: "bottom-end" as const,
    kind: "rod" as const,
    transform: transform((index - 1.5) * 0.095, -0.04, 0),
    selectable: true,
    removable: true,
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `spark-plug-${index + 1}`,
    name: `Bujía ${index + 1}`,
    system: "ignition" as const,
    kind: "spark-plug" as const,
    transform: transform((index - 1.5) * 0.095, 0.23, 0),
    selectable: true,
    removable: true,
  })),
];

export const inlineFourDohcTurboFixture: EngineDefinition = validateEngineDefinition({
  schemaVersion: "1.0.0",
  id: "generic-i4-dohc-turbo",
  name: "I4 DOHC Turbo — banco genérico",
  description: "Mecanismo paramétrico educativo; no representa parámetros de un motor comercial.",
  cylinderCount: 4,
  layout: "inline",
  valvetrain: "DOHC",
  induction: "turbocharged",
  configuration: {
    boreM: 0.086,
    strokeM: 0.086,
    connectingRodLengthM: 0.143,
    compressionRatio: 9.5,
    firingOrder: [1, 3, 4, 2],
    fixedTimestepS: 1 / 120,
  },
  parts,
  connections: [
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `conn-crank-rod-${index + 1}`,
      from: "crankshaft",
      to: `rod-${index + 1}`,
      type: "drives" as const,
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `conn-rod-piston-${index + 1}`,
      from: `rod-${index + 1}`,
      to: `piston-${index + 1}`,
      type: "drives" as const,
    })),
    { id: "conn-head-blocks-crank", from: "intake-camshaft", to: "crankshaft", type: "blocked-by" },
    {
      id: "conn-exhaust-blocks-crank",
      from: "exhaust-camshaft",
      to: "crankshaft",
      type: "blocked-by",
    },
  ],
  procedures: [
    {
      id: "access-piston-2",
      name: "Acceder al pistón 2",
      targetPartId: "piston-2",
      steps: [
        {
          id: "remove-intake-cam",
          action: "remove",
          partId: "intake-camshaft",
          instruction: "Retirar el árbol de admisión.",
          requires: [],
        },
        {
          id: "remove-exhaust-cam",
          action: "remove",
          partId: "exhaust-camshaft",
          instruction: "Retirar el árbol de escape.",
          requires: [],
        },
        {
          id: "remove-plug-2",
          action: "remove",
          partId: "spark-plug-2",
          instruction: "Retirar la bujía del cilindro 2.",
          requires: [],
        },
        {
          id: "remove-piston-2",
          action: "remove",
          partId: "piston-2",
          instruction: "Extraer el conjunto pistón-biela 2.",
          requires: ["remove-intake-cam", "remove-exhaust-cam", "remove-plug-2"],
        },
      ],
    },
  ],
  faults: [
    {
      id: "misfire-cylinder-3",
      name: "Fallo de encendido · cilindro 3",
      cylinder: 3,
      fidelity: "first-order",
      torqueFactor: 0,
      explanation:
        "Anula el pulso de combustión del cilindro 3 y aumenta la irregularidad del par.",
    },
    {
      id: "low-compression-cylinder-2",
      name: "Compresión reducida · cilindro 2",
      cylinder: 2,
      fidelity: "first-order",
      torqueFactor: 0.42,
      explanation:
        "Reduce el aporte de par estimado del cilindro 2; no constituye un diagnóstico definitivo.",
    },
    {
      id: "excessive-load",
      name: "Carga excesiva",
      cylinder: null,
      fidelity: "qualitative",
      torqueFactor: 0.7,
      explanation:
        "Aumenta la carga resistente y reduce la reserva de par del modelo simplificado.",
    },
  ],
  specifications: [
    { key: "bore", value: 86, unit: "mm" },
    { key: "stroke", value: 86, unit: "mm" },
    { key: "connectingRodLength", value: 143, unit: "mm" },
  ],
});
