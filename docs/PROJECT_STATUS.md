# Project status

Updated: 2026-10-12

## Current deliverable

The 72-hour vertical slice is implemented and locally verified: typed schema, deterministic crank-slider simulation, procedural 3D inline-four, RPM/cycle controls, picking/isolation/transparency/explode, constrained disassembly, fault telemetry, deterministic local copilot, secure provider route boundaries and an IWSDK 1.0.1 app. The XR runtime includes an eight-action hands-first diagnostic mission with ray, poke, pinch rotation, pause/resume, reset and no locomotion dependency.

## Latest session: realistic cutaway bench

User feedback on the live build: the XR engine looked like a cartoon. The scene was rebuilt as a 1:1 training cutaway, still procedural and entrant-built (ADR-0001):

- The engine is modelled from the fixture's SI dimensions (86 × 86 mm, 143 mm rod) and uses the same rigid slider-crank solution. It shows a cut block, head and sump with machined cut faces, honed bores, a counterweighted crank and ringed pistons. It also has profiled rods, 16 inclined valves with springs and bucket tappets driven by phased cam lobes, a timing chain, a flywheel ring gear, coil-on-plug ignition, the exhaust manifold and turbo, and oil in the sump.
- PBR materials reflect a prefiltered studio environment, under ACES tone mapping, linear fog and contact shadows. The engine sits on a steel training bench.
- Removed parts glide onto a parts mat on the bench and return on repair. The worn rings on piston 2 are highlighted, a callout marks cylinder 2, and a weak cylinder makes the block rock on its mounts.
- Motion plays at 1/20 speed and the UI says so. Panels and a tilted control console within seated reach were redesigned, and the copy uses proper Spanish.
- Static geometry is merged per material and the valvetrain is instanced. In XR this cut draw calls from 538 to 184 (stereo) and meshes from 259 to 102, at about 130k triangles per eye.

## Previous session: XR runtime repaired and emulator-verified

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
- IWER emulator (emulated Quest 3, hand input only): the full mission on the new bench passed, including pause/resume, parts travel and reset. Pinch rotation and exit/re-entry passed in the previous session. Evidence: `docs/evidence/xr-emulator-hands-mission.png`, `docs/evidence/xr-cutaway-closeup.png`.
- Production bundle, desktop mouse: clicks on the console advanced the mission with no page errors (`docs/evidence/xr-production-desktop.png`).
- Near poke while seated: not verified. The console now sits about 0.55 m from a seated user's shoulder, within reach, but only ray + pinch was exercised in the emulator.
- Quest hardware: not tested and not claimed.
- OpenAI Responses/Realtime: integration boundaries implemented; no live API test without a server key.

## Next incomplete deliverable

These steps need the entrant:

1. Done: the public repository is https://github.com/juancesarotto1/mecai-hackaton-meta, and the XR build is live at https://juancesarotto1.github.io/mecai-hackaton-meta/. GitHub Actions `quality` passed on Linux, and the deployed page rendered with no errors in a headless smoke test.
2. Run the full mission hands-only on a Quest from that URL, seated, and profile frame rate.
3. Record the under-three-minute video from the device or simulator with `DEMO_SCRIPT.md`.
4. Complete the placeholders in `SUBMISSION_DRAFT.md` and do the final policy review.

Provider-backed AI and voice require `OPENAI_API_KEY`; the judged XR flow does not need them.
