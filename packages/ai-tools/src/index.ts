import type { EngineCommand } from "@motormind/command-bus";
import type { EngineRuntimeState } from "@motormind/engine-schema";
import { z } from "zod";

export const toolNames = [
  "get_engine_state",
  "get_part_info",
  "highlight_part",
  "isolate_system",
  "set_engine_rpm",
  "start_engine",
  "stop_engine",
  "set_xray_mode",
  "explode_engine",
  "plan_disassembly",
  "execute_disassembly",
  "restore_part",
  "simulate_fault",
  "clear_faults",
  "reset_engine",
] as const;
export type ToolName = (typeof toolNames)[number];

export const sceneToolCallSchema = z.object({
  name: z.enum(toolNames),
  arguments: z.record(z.string(), z.unknown()),
});
export type SceneToolCall = z.infer<typeof sceneToolCallSchema>;

export interface CopilotInterpretation {
  reply: string;
  commands: EngineCommand[];
  confidence: number;
  mode: "local-deterministic";
}

const partAliases: Record<string, string> = {
  cigüeñal: "crankshaft",
  cigueñal: "crankshaft",
  crankshaft: "crankshaft",
  turbo: "turbo",
  "árbol de admisión": "intake-camshaft",
  "arbol de admision": "intake-camshaft",
  "árbol de escape": "exhaust-camshaft",
  "arbol de escape": "exhaust-camshaft",
};

export function interpretLocalCommand(
  text: string,
  state: EngineRuntimeState,
): CopilotInterpretation {
  const normalized = text.toLocaleLowerCase("es").trim();
  const commands: EngineCommand[] = [];
  let reply =
    "Puedo mostrar piezas, controlar RPM, activar rayos X, simular el misfire del cilindro 3 o reiniciar el banco.";
  const rpmMatch = normalized.match(/(?:a|en)\s*(\d{2,4})\s*rpm|\b(\d{2,4})\s*rpm/);
  if (/encend|arranc/.test(normalized)) {
    commands.push({ type: "start_engine" });
    reply = "Motor encendido en el banco virtual.";
  }
  if (/apag|deten|pará|para el motor/.test(normalized)) {
    commands.push({ type: "stop_engine" });
    reply = "Motor detenido.";
  }
  if (rpmMatch) {
    const rpm = Math.min(8000, Number(rpmMatch[1] ?? rpmMatch[2]));
    commands.push({ type: "set_engine_rpm", rpm });
    if (
      rpm > 0 &&
      !state.running &&
      /encend|arranc/.test(normalized) &&
      !commands.some((command) => command.type === "start_engine")
    )
      commands.unshift({ type: "start_engine" });
    reply = `Régimen objetivo establecido en ${rpm} RPM.`;
  }
  for (const [alias, partId] of Object.entries(partAliases))
    if (normalized.includes(alias) && /mostr|seleccion|dónde|donde/.test(normalized)) {
      commands.push({ type: "select_part", partId });
      reply = `Seleccioné ${alias} y centré el contexto mecánico.`;
      break;
    }
  if (/rayos x|x-ray|transparen/.test(normalized)) {
    commands.push({ type: "set_xray_mode", enabled: !/desactiv|quitar|sacar/.test(normalized) });
    reply = "Actualicé la transparencia estructural.";
  }
  if (/explotad|separá|separa las piezas/.test(normalized)) {
    commands.push({ type: "explode_engine", enabled: true });
    reply = "Vista explotada activada.";
  }
  if (/misfire|sin chispa|falla.*cilindro 3|cilindro 3.*falla/.test(normalized)) {
    commands.push({ type: "simulate_fault", faultId: "misfire-cylinder-3" });
    reply =
      "Anulé la combustión del cilindro 3. Verás menor aporte de par y mayor irregularidad; es un modelo de primer orden.";
  }
  if (/limpi.*falla|sin fallas/.test(normalized)) {
    commands.push({ type: "clear_faults" });
    reply = "Fallas simuladas eliminadas.";
  }
  if (/estado original|reinici|reset/.test(normalized)) {
    commands.splice(0, commands.length, { type: "reset_engine" });
    reply = "Banco restablecido a su estado inicial.";
  }
  return {
    reply,
    commands,
    confidence: commands.length ? 0.93 : 0.45,
    mode: "local-deterministic",
  };
}

export const openAiToolDefinitions = [
  {
    type: "function",
    name: "set_engine_rpm",
    description: "Set the engine target speed in RPM.",
    strict: true,
    parameters: {
      type: "object",
      properties: { rpm: { type: "number", minimum: 0, maximum: 8000 } },
      required: ["rpm"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "highlight_part",
    description: "Select and highlight a known mechanical part.",
    strict: true,
    parameters: {
      type: "object",
      properties: { partId: { type: "string" } },
      required: ["partId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "simulate_fault",
    description: "Activate a known validated fault model.",
    strict: true,
    parameters: {
      type: "object",
      properties: { faultId: { type: "string" } },
      required: ["faultId"],
      additionalProperties: false,
    },
  },
] as const;
