---
name: engine-asset-pipeline
description: Inspect and prepare segmented engine assets for MotorMind XR. Use for GLB or glTF intake, licensing, scale, pivots, hierarchy, materials, compression, semantic IDs, or asset-manifest validation.
---

# Engine Asset Pipeline

## Inputs

Require the source asset, license, intended engine definition, target device, and polygon/texture budgets.

## Procedure

1. Record provenance and commercial-use permission before conversion.
2. Inspect units, orientation, mesh count, hierarchy, materials, UVs, and node names.
3. Split only mechanically independent parts; place pivots on real axes of motion.
4. Map source nodes to stable schema IDs in a manifest; never use display names as identity.
5. Optimize geometry and textures, export GLB, and retain the editable source.

## References

Use `docs/ASSET_INVENTORY.md`, glTF 2.0, and official Khronos validation tools.

## Output

Produce a validated GLB, semantic manifest, license record, budgets, and known limitations.

## Validation

Reject unknown scale, missing provenance, duplicate IDs, monolithic meshes claimed as removable parts, broken pivots, or budget overruns without justification.
