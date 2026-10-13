---
name: simulation-validation
description: Validate deterministic mechanical simulations and their numerical boundaries. Use for invariants, unit consistency, seeds, fixed-step behavior, fault effects, property tests, regression baselines, or fidelity claims.
---

# Simulation Validation

## Inputs

Require model version, equations, units, configuration, timestep, seeds, expected invariants, and fidelity statement.

## Procedure

1. Isolate pure calculations from rendering and wall-clock time.
2. Test boundaries, periodicity, conservation or monotonic rules where applicable, and invalid input rejection.
3. Compare equal simulated time under different render-frame groupings.
4. Test each fault against a healthy baseline and quantify only modeled values.
5. Store failures with inputs sufficient to reproduce them.

## References

Use package tests and `docs/SIMULATION_LIMITATIONS.md`.

## Output

Return automated tests, results, counterexamples, and an updated limitation statement.

## Validation

Require finite outputs, deterministic replays, explicit units, unchanged results across frame grouping, and no scientific claim beyond the implemented model.
