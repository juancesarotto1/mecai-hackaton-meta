import { describe, expect, it } from "vitest";
import { inlineFourDohcTurboFixture } from "@motormind/engine-schema/fixture";
import { DisassemblyGraph, ReversibleDisassembly, graphFromProcedure } from "./index";

describe("disassembly graph", () => {
  it("plans prerequisites before the piston", () => {
    const graph = graphFromProcedure(inlineFourDohcTurboFixture.procedures[0]!);
    expect(graph.plan("piston-2")).toEqual({
      ok: true,
      steps: ["intake-camshaft", "exhaust-camshaft", "spark-plug-2", "piston-2"],
    });
  });
  it("blocks invalid removal and supports undo", () => {
    const graph = graphFromProcedure(inlineFourDohcTurboFixture.procedures[0]!);
    const state = new ReversibleDisassembly(graph);
    expect(state.remove("piston-2").ok).toBe(false);
    expect(state.remove("intake-camshaft").ok).toBe(true);
    expect(state.undo()).toEqual([]);
  });
  it("detects cycles", () => {
    const graph = new DisassemblyGraph([
      { id: "a", blockedBy: ["b"] },
      { id: "b", blockedBy: ["a"] },
    ]);
    expect(graph.validate().valid).toBe(false);
  });
});
