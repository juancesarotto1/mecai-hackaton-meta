import { z } from "zod";

export const partIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/);
export type PartId = z.infer<typeof partIdSchema>;

export const vector3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});
export type Vector3Value = z.infer<typeof vector3Schema>;

export const sourceReferenceSchema = z.object({
  title: z.string().min(1),
  url: z.url().optional(),
  note: z.string().optional(),
});
export type SourceReference = z.infer<typeof sourceReferenceSchema>;

export const partTransformSchema = z.object({
  positionM: vector3Schema,
  rotationRad: vector3Schema,
  scale: vector3Schema.default({ x: 1, y: 1, z: 1 }),
});
export type PartTransform = z.infer<typeof partTransformSchema>;

export const mechanicalPartSchema = z.object({
  id: partIdSchema,
  name: z.string().min(1),
  system: z.enum(["bottom-end", "valvetrain", "induction", "ignition", "structure"]),
  kind: z.enum([
    "block",
    "crankshaft",
    "piston",
    "rod",
    "camshaft",
    "valve",
    "spark-plug",
    "turbo",
    "fastener",
  ]),
  transform: partTransformSchema,
  selectable: z.boolean().default(true),
  removable: z.boolean().default(false),
});
export type MechanicalPart = z.infer<typeof mechanicalPartSchema>;

export const mechanicalConnectionSchema = z.object({
  id: z.string().min(1),
  from: partIdSchema,
  to: partIdSchema,
  type: z.enum(["connected-to", "fastened-by", "blocked-by", "drives", "requires-removal"]),
});
export type MechanicalConnection = z.infer<typeof mechanicalConnectionSchema>;

export const fastenerSchema = z.object({
  id: partIdSchema,
  partId: partIdSchema,
  targetPartId: partIdSchema,
  quantity: z.number().int().positive(),
});
export type Fastener = z.infer<typeof fastenerSchema>;

export const procedureStepSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["remove", "restore", "inspect"]),
  partId: partIdSchema,
  instruction: z.string().min(1),
  requires: z.array(z.string()).default([]),
});
export type ProcedureStep = z.infer<typeof procedureStepSchema>;

export const mechanicalProcedureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  targetPartId: partIdSchema,
  steps: z.array(procedureStepSchema).min(1),
});
export type MechanicalProcedure = z.infer<typeof mechanicalProcedureSchema>;

export const faultDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cylinder: z.number().int().min(1).max(4).nullable(),
  fidelity: z.enum(["kinematic", "first-order", "qualitative"]),
  torqueFactor: z.number().min(0).max(1),
  explanation: z.string().min(1),
});
export type FaultDefinition = z.infer<typeof faultDefinitionSchema>;

export const cylinderStateSchema = z.object({
  cylinder: z.number().int().min(1),
  cycleDeg: z.number().min(0).lt(720),
  phase: z.enum(["intake", "compression", "power", "exhaust"]),
  pistonPositionM: z.number().finite(),
  pistonVelocityMps: z.number().finite(),
  intakeLiftM: z.number().nonnegative(),
  exhaustLiftM: z.number().nonnegative(),
  combustionIntensity: z.number().min(0).max(1),
});
export type CylinderState = z.infer<typeof cylinderStateSchema>;

export const engineRuntimeStateSchema = z.object({
  running: z.boolean(),
  rpm: z.number().min(0).max(8000),
  crankAngleRad: z.number().finite(),
  cycleAngleDeg: z.number().min(0).lt(720),
  selectedPartId: partIdSchema.nullable(),
  removedPartIds: z.array(partIdSchema),
  activeFaultIds: z.array(z.string()),
  xray: z.boolean(),
  exploded: z.boolean(),
  simulationVersion: z.literal("1.0.0"),
});
export type EngineRuntimeState = z.infer<typeof engineRuntimeStateSchema>;

export const simulationConfigurationSchema = z.object({
  boreM: z.number().positive(),
  strokeM: z.number().positive(),
  connectingRodLengthM: z.number().positive(),
  compressionRatio: z.number().gt(1),
  firingOrder: z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()]),
  fixedTimestepS: z.number().positive().max(0.1),
});
export type SimulationConfiguration = z.infer<typeof simulationConfigurationSchema>;

export const technicalSpecificationSchema = z.object({
  key: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().min(1),
  source: sourceReferenceSchema.optional(),
});
export type TechnicalSpecification = z.infer<typeof technicalSpecificationSchema>;

export const engineDefinitionSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    cylinderCount: z.literal(4),
    layout: z.literal("inline"),
    valvetrain: z.literal("DOHC"),
    induction: z.literal("turbocharged"),
    configuration: simulationConfigurationSchema,
    parts: z.array(mechanicalPartSchema),
    connections: z.array(mechanicalConnectionSchema),
    procedures: z.array(mechanicalProcedureSchema),
    faults: z.array(faultDefinitionSchema),
    specifications: z.array(technicalSpecificationSchema),
  })
  .superRefine((engine, context) => {
    const ids = new Set(engine.parts.map((part) => part.id));
    if (ids.size !== engine.parts.length)
      context.addIssue({ code: "custom", message: "Part IDs must be unique", path: ["parts"] });
    for (const [index, connection] of engine.connections.entries()) {
      if (!ids.has(connection.from) || !ids.has(connection.to))
        context.addIssue({
          code: "custom",
          message: "Connection references an unknown part",
          path: ["connections", index],
        });
    }
    const firing = new Set(engine.configuration.firingOrder);
    if (firing.size !== 4 || [...firing].some((cylinder) => cylinder < 1 || cylinder > 4))
      context.addIssue({
        code: "custom",
        message: "Firing order must contain cylinders 1-4 exactly once",
        path: ["configuration", "firingOrder"],
      });
  });
export type EngineDefinition = z.infer<typeof engineDefinitionSchema>;

export interface EngineVariant {
  id: string;
  engineId: string;
  name: string;
  overrides: Partial<SimulationConfiguration>;
}
export interface Assembly {
  id: string;
  name: string;
  partIds: PartId[];
}

export function validateEngineDefinition(input: unknown): EngineDefinition {
  return engineDefinitionSchema.parse(input);
}
