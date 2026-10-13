---
name: immersive-web-sdk
description: Build and verify Meta Immersive Web SDK experiences. Use for IWSDK manifests, native scene JSON, ECS systems, WebXR entry, controllers, hands, grabbing, locomotion, emulation, or Quest validation.
---

# Immersive Web SDK

## Inputs

Require installed IWSDK versions, target mode, requested WebXR features, interaction needs, and target hardware.

## Procedure

1. Keep all `@iwsdk/*` packages on one verified version and preserve IWSDK's Three.js alias.
2. Use `iwsdk.config.json`, `iwsdk.scene.v1`, `virtual:iwsdk-project`, and `World.create`.
3. Put behavior in ECS systems using their `update(delta,time)` lifecycle; do not add a competing render loop or physics runtime.
4. Request optional features progressively and offer a desktop fallback.
5. Test build, emulator entry/exit, input, and state restoration; test hardware separately.

## References

Use current Meta documentation and the installed schemas/types as authority. Record URLs and versions in `docs/XR_COMPATIBILITY.md`.

## Output

Produce a buildable IWSDK app plus an evidence matrix separating emulator and device results.

## Validation

Never claim Quest compatibility, 72 FPS, hands, passthrough, or anchors without corresponding real-device evidence.
