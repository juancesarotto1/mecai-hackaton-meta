---
name: xr-performance
description: Profile and improve immersive rendering performance. Use for XR frame budgets, draw calls, triangles, texture memory, shader cost, garbage collection, LOD, thermal testing, or Quest performance evidence.
---

# XR Performance

## Inputs

Require a build, target device/runtime, scene, test route, quality profile, and measurement tooling.

## Procedure

1. Establish a repeatable baseline and record device, refresh target, build, and thermal state.
2. Measure CPU frame, GPU frame, dropped frames, draw calls, triangles, texture memory, and allocations.
3. Fix the dominant measured bottleneck using batching, LOD, compression, simpler materials, or lower resolution.
4. Re-run the same route and compare distributions, not a single best frame.

## References

Use Meta profiling guidance and `docs/XR_COMPATIBILITY.md`.

## Output

Produce before/after evidence, chosen budgets, device notes, and remaining bottlenecks.

## Validation

Do not claim 72 FPS from desktop or emulator results; require sustained device measurements for a hardware claim.
