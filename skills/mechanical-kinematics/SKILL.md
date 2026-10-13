---
name: mechanical-kinematics
description: Implement and review deterministic reciprocating-engine kinematics. Use for crank-slider equations, 720-degree cycles, firing order, cam timing, valve lift, RPM integration, or mathematical engine-motion tests.
---

# Mechanical Kinematics

## Inputs

Require explicit SI units, stroke, rod length, cylinder count, firing order, RPM range, timestep, and the requested fidelity level.

## Procedure

1. Make crank angle the master state and normalize it over 4π radians.
2. Derive piston position from `x = r cos θ + sqrt(l² - r² sin² θ)`; never animate pistons independently.
3. Phase each cylinder from the configured firing order. Drive cams at half crank speed.
4. Separate rigid kinematics from approximate torque, pressure, temperature, and vibration models.
5. Integrate with a fixed timestep and keep render interpolation independent.

## References

Use `packages/engine-kinematics` and `packages/engine-schema`; consult cited engineering sources before changing assumptions.

## Output

Return typed calculations, explicit units, fidelity notes, and deterministic tests.

## Validation

Prove stroke bounds, 720° periodicity, finite values, firing-order phase, RPM-angle consistency, frame-rate independence, and reproducibility.
