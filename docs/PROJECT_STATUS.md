# Project status

Updated: 2026-10-12

## Current deliverable

The 72-hour vertical slice is implemented and locally verified: typed schema, deterministic crank-slider simulation, procedural 3D inline-four, RPM/cycle controls, picking/isolation/transparency/explode, constrained disassembly, fault telemetry, deterministic local copilot, secure provider route boundaries and an IWSDK 1.0.1 app. The XR runtime includes an eight-action hands-first diagnostic mission with ray, poke, pinch rotation, pause/resume, reset and no locomotion dependency.

## Latest session: XR runtime repaired and emulator-verified

The previous XR production bundle compiled but rendered an empty scene. A headless browser smoke test found two startup failures, both now fixed and covered by `apps/xr-experience/src/project.test.ts`:

- The hand-written production manifest adapter exported `components: []`, which `World.create` rejects. Production now uses the official IWSDK plugin (ADR-0005). The bundle shrank from 16 MB to 7.1 MB, and the duplicate Three.js warning is gone.
- The scene used `environment.background`, which `iwsdk.scene.v1` does not allow. The scene now uses `DomeGradient` and `IBLGradient`, so metal parts are lit.

Further fixes found while verifying:

- Rods in both renderers stretched through the cycle (XR rods also sat about 1.4 m behind the engine). Both renderers now place the wrist and crank pins straight from the rigid slider-crank solution, and a test locks the rod length.
- `pnpm dev:xr` failed: the IWSDK CLI needs a `dev:runtime` script, and pnpm hid `three-viewport-gizmo` from the editor runtime. Both are added.
- XR could not be re-entered after exiting (`offer: "once"`); it now uses `"always"`.
- The pause button read "REANUDAR" while the engine could not move. It is now disabled outside the running and faulted stages.
- The removed exhaust camshaft covered the status panel; removed parts now stack on the left.
- Reset now also restores the engine orientation after a pinch rotation.
- The desktop pre-XR camera frames both the engine and the panels.
- `.iwsdk/` (local HTTPS key and runtime logs) is git-ignored, and Prettier skips the pnpm-managed lockfile.

## Verification state

- `pnpm quality`: passed on 2026-10-12 — 15/15 typechecks, 21 tests in 7 files, 15/15 builds (details in `docs/TEST_RESULTS.md`).
- IWER emulator (emulated Quest 3, hand input only): full mission, pause/resume, disabled pause, pinch rotation, reset, and two XR exit/re-entry cycles passed. Evidence: `docs/evidence/xr-emulator-hands-mission.png`.
- Near poke while seated: not verified. Panels are about 1.6 m away, so ray + pinch is the seated path.
- Quest hardware: not tested and not claimed.
- OpenAI Responses/Realtime: integration boundaries implemented; no live API test without a server key.

## Next incomplete deliverable

These steps need the entrant:

1. Done: the public repository is https://github.com/juancesarotto1/mecai-hackaton-meta, and the XR build is live at https://juancesarotto1.github.io/mecai-hackaton-meta/. GitHub Actions `quality` passed on Linux, and the deployed page rendered with no errors in a headless smoke test.
2. Run the full mission hands-only on a Quest from that URL, seated, and profile frame rate.
3. Record the under-three-minute video from the device or simulator with `DEMO_SCRIPT.md`.
4. Complete the placeholders in `SUBMISSION_DRAFT.md` and do the final policy review.

Provider-backed AI and voice require `OPENAI_API_KEY`; the judged XR flow does not need them.
