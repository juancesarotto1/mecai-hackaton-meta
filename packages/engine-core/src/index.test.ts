import { describe, expect, it } from "vitest";
import {
  advanceLabMission,
  canPauseLabMission,
  initialLabMissionState,
  labMissionStages,
  resetLabMission,
  toggleLabMissionPause,
} from "./index";

describe("hands-first lab mission", () => {
  it("completes the full diagnostic loop deterministically", () => {
    let state = resetLabMission();
    const visited = [state.stage];

    for (let index = 1; index < labMissionStages.length; index += 1) {
      state = advanceLabMission(state);
      visited.push(state.stage);
    }

    expect(visited).toEqual(labMissionStages);
    expect(state).toEqual({ stage: "complete", running: false, faultId: null });
    expect(advanceLabMission(state)).toEqual(initialLabMissionState);
  });

  it("keeps the controlled fault active until repair", () => {
    let state = advanceLabMission(initialLabMissionState);
    state = advanceLabMission(state);

    expect(state.faultId).toBe("low-compression-cylinder-2");
    expect(state.running).toBe(true);

    while (state.stage !== "complete") state = advanceLabMission(state);
    expect(state.faultId).toBeNull();
  });

  it("supports clean pause and resume only while the engine can run", () => {
    const running = advanceLabMission(initialLabMissionState);
    const paused = toggleLabMissionPause(running);

    expect(paused.running).toBe(false);
    expect(toggleLabMissionPause(paused).running).toBe(true);
    expect(toggleLabMissionPause(initialLabMissionState)).toEqual(initialLabMissionState);
  });

  it("exposes pause only in the stages where the crank can move", () => {
    let state = resetLabMission();
    const pausable: string[] = [];
    for (const stage of labMissionStages) {
      expect(state.stage).toBe(stage);
      if (canPauseLabMission(state)) pausable.push(stage);
      state = advanceLabMission(state);
    }

    expect(pausable).toEqual(["running", "faulted"]);
  });
});
