# Hackathon compliance matrix

Updated: 2026-10-12

This matrix distinguishes implemented evidence from external verification. It is not a legal certification; the entrant must complete the final policy review, device test, hosting, video, and submission.

## Entry classification

| Requirement        | Project position                                     | Evidence / remaining action                                                                                                                                                    |
| ------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Track              | **Productivity**                                     | MotorMind XR is a focused training and diagnostic workspace for understanding mechanical systems.                                                                              |
| Division           | **New Experience — proposed**                        | This repository was created from a blank workspace during the competition period. The entrant must confirm that no pre-September 24, 2026 code or published build was reused.  |
| Meta VR experience | Implemented; emulator verified, device proof pending | IWSDK 1.0.1 app, immersive VR project manifest, production bundle, required hand tracking. The full mission ran hands-only in the IWER emulator. Run the final build on Quest. |

## Hard requirements

| Requirement            | Status                                                                         | Evidence / remaining action                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hands-first end-to-end | **Verified in the IWER emulator with hand input; device verification pending** | Required WebXR hand tracking; large `RayInteractable` + `PokeInteractable` controls; pinch-driven `DistanceGrabbable` engine rotation. Start, fault injection, safe stop, four disassembly actions, repair, pause/resume, reset, pinch rotation, XR exit and re-entry all ran with emulated hands only (`docs/evidence/xr-emulator-hands-mission.png`). |
| Policy compliance      | **Preliminary technical screen passed; final review pending**                  | No ads, payments, user-generated content, social behavior, authentication, location, camera, microphone, or personal-data collection in the XR build. Educational mechanical approximations are labeled. Entrant must review the current terms and policies immediately before submission.                                                              |

## Design guidelines

| Guideline               | Status                            | Evidence / remaining action                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seated-optimized        | Implemented                       | Locomotion is disabled. The engine and controls stay in front of a seated user and are operated by far-ray pinch. Panels sit about 1.6 m away, so near poke is not reachable seated. Validate comfort and reach on Quest within a two-foot radius. |
| Easy entry and exit     | Implemented; timing study pending | One guided eight-action mission, immediate onboarding, deterministic reset, and explicit pause/resume. Time the full flow with a first-time tester and keep it below ten minutes.                                                                  |
| Original, not a wrapper | Meets architectural test          | The procedural engine, kinematics, fault model, disassembly graph, state machine, rendering, and XR interaction are entrant-built. The complete XR mission works without OpenAI or any third-party service.                                        |

## Submission package

| Deliverable         | Status                   | Action                                                                                                                                                                                     |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Playable build      | Production bundle passes | Publish `apps/xr-experience/dist` to a public HTTPS host. The included `deploy-xr-pages.yml` workflow supports GitHub Pages once this folder is in a GitHub repository with Pages enabled. |
| Demonstration video | Pending external capture | Record real Quest or XR Simulator footage using `DEMO_SCRIPT.md`; publish an under-three-minute public YouTube or Vimeo video.                                                             |
| Submission form     | Draft ready              | Complete identity, team, URL, video, target date, and division confirmation in `SUBMISSION_DRAFT.md`.                                                                                      |
| Availability freeze | Pending                  | After the entry deadline, do not modify the hosted submission. Keep the exact judged build reachable throughout judging.                                                                   |

## Policy references for final human review

- [Meta VR Start Program Terms](https://developers.meta.com/horizon/start/terms/)
- [Community Standards](https://transparency.fb.com/policies/community-standards/)
- [Code of Conduct in VR Policy](https://support.oculus.com/articles/accounts/privacy-information-and-settings/conduct-in-vr-policy)
- [Developer policy overview](https://developers.meta.com/vr/policy/)
- [App policies](https://developers.meta.com/vr/policy/app-policies/)
- [Content guidelines](https://developers.meta.com/vr/policy/content-guidelines/)
