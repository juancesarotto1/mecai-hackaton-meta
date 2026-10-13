"use client";

import { create } from "zustand";
import {
  reduceCommand,
  initialEngineState,
  type CommandAuditEvent,
  type EngineCommand,
} from "@motormind/command-bus";
import { graphFromProcedure, ReversibleDisassembly } from "@motormind/disassembly-graph";
import { stepEngine } from "@motormind/engine-core";
import { inlineFourDohcTurboFixture } from "@motormind/engine-schema/fixture";
import type { EngineRuntimeState, PartId } from "@motormind/engine-schema";

const graph = graphFromProcedure(inlineFourDohcTurboFixture.procedures[0]!);
const assembly = new ReversibleDisassembly(graph);

interface EngineStore extends EngineRuntimeState {
  audit: CommandAuditEvent[];
  notice: string;
  isolatedPartId: PartId | null;
  dispatch: (command: EngineCommand, source?: CommandAuditEvent["source"]) => void;
  tick: (dt: number) => void;
  setAngle: (angle: number) => void;
  setIsolated: (partId: PartId | null) => void;
  planPistonTwo: () => PartId[];
  executeNextRemoval: () => void;
  undo: () => void;
  redo: () => void;
}

export const useEngineStore = create<EngineStore>((set, get) => ({
  ...initialEngineState,
  audit: [],
  notice: "Banco listo",
  isolatedPartId: null,
  dispatch(command, source = "user") {
    if (command.type === "remove_part") {
      const result = assembly.remove(command.partId);
      if (!result.ok) {
        set({ notice: `Bloqueado por: ${result.blockers.join(", ")}` });
        return;
      }
    }
    if (command.type === "restore_part") assembly.restore(command.partId);
    if (command.type === "reset_engine") assembly.reset();
    const result = reduceCommand(get(), command, source);
    set({
      ...result.state,
      audit: [...get().audit.slice(-49), result.event],
      notice: humanize(command),
      isolatedPartId: command.type === "reset_engine" ? null : get().isolatedPartId,
    });
  },
  tick(dt) {
    set((state) => stepEngine(state, dt));
  },
  setAngle(angle) {
    set({ crankAngleRad: angle, cycleAngleDeg: ((angle * 180) / Math.PI) % 720 });
  },
  setIsolated(partId) {
    set({ isolatedPartId: partId, notice: partId ? "Pieza aislada" : "Aislamiento desactivado" });
  },
  planPistonTwo() {
    return graph.plan("piston-2", new Set(get().removedPartIds)).steps;
  },
  executeNextRemoval() {
    const next = get().planPistonTwo()[0];
    if (next) get().dispatch({ type: "remove_part", partId: next }, "user");
    else set({ notice: "Acceso al pistón 2 completado" });
  },
  undo() {
    const ids = assembly.undo();
    set({ removedPartIds: ids, notice: "Última operación revertida" });
  },
  redo() {
    const ids = assembly.redo();
    set({ removedPartIds: ids, notice: "Operación rehecha" });
  },
}));

function humanize(command: EngineCommand): string {
  switch (command.type) {
    case "start_engine":
      return "Motor en marcha";
    case "stop_engine":
      return "Motor detenido";
    case "set_engine_rpm":
      return `${command.rpm} RPM`;
    case "simulate_fault":
      return "Falla inyectada en la simulación";
    case "clear_faults":
      return "Fallas eliminadas";
    case "reset_engine":
      return "Estado original restaurado";
    default:
      return "Estado actualizado";
  }
}
