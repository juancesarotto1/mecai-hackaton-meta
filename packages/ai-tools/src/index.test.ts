import { describe, expect, it } from "vitest";
import { initialEngineState } from "@motormind/command-bus";
import { interpretLocalCommand } from "./index";

describe("local copilot", () => {
  it("turns a Spanish request into typed commands", () => {
    expect(
      interpretLocalCommand("Encendé el motor a 1500 RPM", initialEngineState).commands,
    ).toEqual([{ type: "start_engine" }, { type: "set_engine_rpm", rpm: 1500 }]);
  });
  it("never invents a scientific result for unknown text", () =>
    expect(interpretLocalCommand("diagnóstico definitivo", initialEngineState).commands).toEqual(
      [],
    ));
});
