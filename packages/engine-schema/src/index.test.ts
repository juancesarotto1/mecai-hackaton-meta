import { describe, expect, it } from "vitest";
import { inlineFourDohcTurboFixture } from "./fixture";
import { validateEngineDefinition } from "./index";

describe("Engine Schema v1", () => {
  it("validates the generic inline-four fixture", () => {
    expect(validateEngineDefinition(inlineFourDohcTurboFixture).parts.length).toBeGreaterThan(10);
  });
  it("rejects duplicate part identifiers", () => {
    const invalid = {
      ...inlineFourDohcTurboFixture,
      parts: [...inlineFourDohcTurboFixture.parts, inlineFourDohcTurboFixture.parts[0]],
    };
    expect(() => validateEngineDefinition(invalid)).toThrow(/unique/i);
  });
});
