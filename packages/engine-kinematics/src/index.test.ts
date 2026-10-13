import { describe, expect, it } from "vitest";
import { inlineFourDohcTurboFixture } from "@motormind/engine-schema/fixture";
import {
  FixedStepClock,
  TAU,
  advanceAngle,
  allCylinderStates,
  cylinderCycleAngle,
  rpmToAngularVelocity,
  sliderCrank,
} from "./index";

const config = inlineFourDohcTurboFixture.configuration;

describe("engine kinematics", () => {
  it("converts RPM to angular velocity", () => expect(rpmToAngularVelocity(60)).toBeCloseTo(TAU));
  it("keeps piston displacement within the stroke", () => {
    for (let degree = 0; degree <= 720; degree += 0.5) {
      const value = sliderCrank(
        (degree * Math.PI) / 180,
        config.strokeM,
        config.connectingRodLengthM,
        6500,
      );
      expect(value.displacementFromTdcM).toBeGreaterThanOrEqual(-1e-12);
      expect(value.displacementFromTdcM).toBeLessThanOrEqual(config.strokeM + 1e-12);
      expect(Number.isFinite(value.velocityMps)).toBe(true);
    }
  });
  it("keeps the connecting rod rigid so renderers can place both pins directly", () => {
    for (let degree = 0; degree < 360; degree += 0.5) {
      const { crankPin, wristPin } = sliderCrank(
        (degree * Math.PI) / 180,
        config.strokeM,
        config.connectingRodLengthM,
      );
      expect(Math.hypot(wristPin.y - crankPin.y, wristPin.z - crankPin.z)).toBeCloseTo(
        config.connectingRodLengthM,
        12,
      );
    }
  });
  it("is periodic over the 720 degree cycle", () =>
    expect(advanceAngle(0, 1200, 0.1)).toBeCloseTo(advanceAngle(4 * Math.PI, 1200, 0.1)));
  it("maps the configured firing order every 180 degrees", () => {
    expect(cylinderCycleAngle(0, 1, config.firingOrder)).toBe(0);
    expect(cylinderCycleAngle(180, 3, config.firingOrder)).toBe(0);
    expect(cylinderCycleAngle(360, 4, config.firingOrder)).toBe(0);
    expect(cylinderCycleAngle(540, 2, config.firingOrder)).toBe(0);
  });
  it("is independent of render frame grouping with a fixed timestep", () => {
    const simulate = (frames: number[]) => {
      let angle = 0;
      const clock = new FixedStepClock(1 / 120);
      for (const frame of frames)
        clock.consume(frame, (dt) => {
          angle = advanceAngle(angle, 1800, dt);
        });
      return angle;
    };
    expect(simulate(Array(60).fill(1 / 60))).toBeCloseTo(simulate(Array(30).fill(1 / 30)), 10);
  });
  it("returns finite, reproducible cylinder states", () => {
    expect(allCylinderStates(1.234, config, 1500)).toEqual(allCylinderStates(1.234, config, 1500));
    expect(JSON.stringify(allCylinderStates(1.234, config, 1500))).not.toMatch(/NaN|Infinity/);
  });
});
