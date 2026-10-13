import type { EngineRuntimeState, PartId } from "@motormind/engine-schema";
import { z } from "zod";

export const engineCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start_engine") }),
  z.object({ type: z.literal("stop_engine") }),
  z.object({ type: z.literal("set_engine_rpm"), rpm: z.number().min(0).max(8000) }),
  z.object({ type: z.literal("select_part"), partId: z.string().nullable() }),
  z.object({ type: z.literal("set_xray_mode"), enabled: z.boolean() }),
  z.object({ type: z.literal("explode_engine"), enabled: z.boolean() }),
  z.object({ type: z.literal("simulate_fault"), faultId: z.string() }),
  z.object({ type: z.literal("clear_faults") }),
  z.object({ type: z.literal("remove_part"), partId: z.string() }),
  z.object({ type: z.literal("restore_part"), partId: z.string() }),
  z.object({ type: z.literal("reset_engine") }),
]);
export type EngineCommand = z.infer<typeof engineCommandSchema>;

export interface CommandAuditEvent {
  id: string;
  timestamp: string;
  source: "user" | "copilot" | "system";
  command: EngineCommand;
  ok: boolean;
  message: string;
}
export interface CommandResult {
  state: EngineRuntimeState;
  event: CommandAuditEvent;
}

export const initialEngineState: EngineRuntimeState = {
  running: false,
  rpm: 900,
  crankAngleRad: 0,
  cycleAngleDeg: 0,
  selectedPartId: null,
  removedPartIds: [],
  activeFaultIds: [],
  xray: false,
  exploded: false,
  simulationVersion: "1.0.0",
};

export function reduceCommand(
  state: EngineRuntimeState,
  commandInput: unknown,
  source: CommandAuditEvent["source"] = "user",
): CommandResult {
  const command = engineCommandSchema.parse(commandInput);
  let next: EngineRuntimeState = { ...state };
  switch (command.type) {
    case "start_engine":
      next = { ...next, running: true, rpm: next.rpm || 900 };
      break;
    case "stop_engine":
      next = { ...next, running: false };
      break;
    case "set_engine_rpm":
      next = { ...next, rpm: command.rpm, running: command.rpm > 0 && next.running };
      break;
    case "select_part":
      next = { ...next, selectedPartId: command.partId as PartId | null };
      break;
    case "set_xray_mode":
      next = { ...next, xray: command.enabled };
      break;
    case "explode_engine":
      next = { ...next, exploded: command.enabled };
      break;
    case "simulate_fault":
      next = { ...next, activeFaultIds: [...new Set([...next.activeFaultIds, command.faultId])] };
      break;
    case "clear_faults":
      next = { ...next, activeFaultIds: [] };
      break;
    case "remove_part":
      next = {
        ...next,
        removedPartIds: [...new Set([...next.removedPartIds, command.partId as PartId])],
      };
      break;
    case "restore_part":
      next = { ...next, removedPartIds: next.removedPartIds.filter((id) => id !== command.partId) };
      break;
    case "reset_engine":
      next = { ...initialEngineState };
      break;
  }
  return {
    state: next,
    event: {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source,
      command,
      ok: true,
      message: command.type,
    },
  };
}
