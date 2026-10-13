import { describe, expect, it } from "vitest";
import { inlineFourDohcTurboFixture } from "@motormind/engine-schema/fixture";
import { allCylinderStates } from "@motormind/engine-kinematics";
import { simulateTorque } from "./index";

describe("fault simulation", () => {
  it("a misfire removes one cylinder combustion contribution", () => {
    const states = allCylinderStates(Math.PI / 4, inlineFourDohcTurboFixture.configuration, 1500);
    const healthy = simulateTorque(states, [], 1500);
    const fault = inlineFourDohcTurboFixture.faults.find(
      (item) => item.id === "misfire-cylinder-3",
    )!;
    const failed = simulateTorque(states, [fault], 1500);
    expect(failed.perCylinderNm[2]).toBe(0);
    expect(failed.indicatedNm).toBeLessThanOrEqual(healthy.indicatedNm);
  });
});
