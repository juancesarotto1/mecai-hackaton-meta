# XR compatibility

IWSDK packages are pinned at 1.0.1 and the app uses a project manifest, native `iwsdk.scene.v1`, `World.create`, an ECS update system and `super-three@0.181.0`. The official `@iwsdk/vite-plugin-dev` builds both development and production (ADR-0005). Hand tracking is required by the immersive session, and the session is re-offered after every exit (`offer: "always"`). Controls use ray and poke targets, engine rotation uses pinch-compatible distance grabbing, and locomotion is intentionally disabled for seated use.

| Target                 | Status           | Evidence                                                                                                                   |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Desktop Next/Three     | locally verified | production build, WebGL canvas and desktop/mobile Chromium interactions passed                                             |
| IWSDK production build | locally verified | 7.1 MB `dist/`; headless Chromium renders the scene with no page errors (`docs/evidence/xr-production-desktop.png`)        |
| IWSDK emulator (IWER)  | verified, hands  | emulated Quest 3, hand input only: full mission, pause/resume, pinch rotation, reset, exit and re-entry (`docs/evidence/`) |
| Near poke while seated | not verified     | panels sit about 1.6 m from a seated user, so ray + pinch is the seated path; poke needs the user to lean or stand         |
| Meta XR Simulator      | not tested       | the desktop Meta XR Simulator app is a separate product from IWER                                                          |
| Meta Quest hardware    | not tested       | requires a physical device and an HTTPS session                                                                            |

The bench scene measures 184 draw calls and about 130k triangles per eye in the emulator; frame time on Quest is still unmeasured.

Emulator results show that the IWSDK input path works end to end. They are not device evidence: tracking quality, comfort, legibility at headset resolution and frame rate still need a Quest.

Official references: [project setup](https://developers.meta.com/vr/documentation/iwsdk/guides/01-project-setup/), [project manifest](https://developers.meta.com/vr/documentation/iwsdk/guides/01a-project-manifest/), [minimal scene](https://developers.meta.com/vr/documentation/iwsdk/guides/01b-minimal-scene/), [custom systems](https://developers.meta.com/vr/documentation/iwsdk/guides/07-custom-systems/).
