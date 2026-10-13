# Test results

Verified on 2026-10-12 with Node 24.19.0 and pnpm 11.25.0 on Windows.

## Quality gate

`pnpm quality` completed with exit code 0:

- Prettier: all matched files use the configured style (`pnpm-lock.yaml` is excluded because pnpm rewrites it).
- ESLint: no errors or warnings.
- TypeScript/Turbo: 15 of 15 workspaces passed type checking.
- Vitest: 7 files and 21 tests passed. New coverage includes rigid connecting-rod geometry, pause availability per mission stage, and validation of the XR project manifest and scene with IWSDK's own validators and built-in component catalog.
- Production builds: 15 of 15 workspaces passed.
- Next.js produced `/`, `/api/ai/respond`, and `/api/realtime/token`.
- IWSDK/Vite transformed 2,197 modules. `dist/` is 7.1 MB, without Havok WASM or unused UIKit fonts.

## Realistic cutaway bench (second pass)

- Scene and manifest validation: `project.test.ts` still passes, including the new linear fog and ACES tone mapping.
- IWER emulator, hand input only: all eight console actions plus pause/resume and reset passed on the new scene. Captures confirm parts travelling to the mat, the cylinder 2 callout and the worn-ring highlight (`docs/evidence/xr-emulator-hands-mission.png`).
- Render statistics measured in the emulated XR session: 184 draw calls and 260,448 triangles across both eyes, 102 meshes. Before merging static geometry and instancing the valvetrain, the same scene used 538 draw calls and 259 meshes.
- Production bundle at 1920 × 1080: mouse clicks on the projected console buttons advanced "Banco listo" → "Motor en marcha estable" → "Baja compresión en C2" with no page errors (`docs/evidence/xr-production-desktop.png`).
- A first draft of the geometry merge rendered box and cylinder faces white: face groups were read as material slots. This was fixed and visually re-verified (`docs/evidence/xr-cutaway-closeup.png`).

## GitHub Actions and live deployment

On the first push, the `quality` workflow passed on `ubuntu-latest`. `deploy-xr-pages` built and published the XR bundle to https://juancesarotto1.github.io/mecai-hackaton-meta/. A headless Chromium smoke test against that live URL found one WebGL canvas, the "BANCO LISTO" badge, and no page errors.

## XR production smoke test

Headless Chromium against `vite preview` of the production bundle, 1440 × 900: one WebGL canvas, the mission badge reads "BANCO LISTO", no page errors, no failed requests, and no duplicate Three.js warning. Evidence: `docs/evidence/xr-production-desktop.png`.

Before this session the same test showed an empty scene. `World.create` threw on the custom manifest adapter, and the level loader rejected `environment.background`.

## IWER emulator session

`pnpm dev:xr` in headless mode with an emulated Meta Quest 3. The session was `immersive-vr` with `hand-tracking` granted. All input came from emulated hands driven through `iwsdk xr` commands: ray aim plus pinch on the right hand, and pinch-grab on the left.

Every step passed, and screenshots confirmed the visible state:

1. Start engine; pause and resume (status switches between "MOTOR DETENIDO" and "MOTOR 1200 RPM").
2. Inject the cylinder 2 fault (piston 2 highlighted), then safe stop.
3. Pinch the disabled pause button after the stop: state unchanged.
4. Remove the intake camshaft, exhaust camshaft and spark plug, then extract piston 2. The status panel stays readable.
5. Pinch-grab and rotate the engine with the left hand.
6. Repair: "DIAGNOSTICO COMPLETO".
7. Reset: "BANCO LISTO", with the engine orientation restored.
8. Two XR exit and re-entry cycles; mission state persists across sessions.

The console showed only D3D shader-compiler precision warnings. Evidence: `docs/evidence/xr-emulator-hands-mission.png`.

## Desktop web smoke test

The production Next server rendered the engine with one WebGL canvas and connected rods after the kinematics change. One 404 for a static resource remains.

## Not yet verified

- Physical Meta Quest behavior, comfort and performance: requires an HTTPS device session.
- Near poke while seated: panels are about 1.6 m away; ray + pinch is the seated path.
- Live OpenAI Responses or Realtime traffic: requires a server-side API key.

The XR build still reports a 6.5 MB upstream IWSDK runtime chunk and two removable Zod annotation warnings. Neither fails the build; chunk splitting remains a follow-up.
