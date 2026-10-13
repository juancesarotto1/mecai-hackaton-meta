---
name: release-quality-gates
description: Audit MotorMind XR deliverables against release evidence. Use before phase closure, demos, releases, compatibility claims, or when updating project status and test results.
---

# Release Quality Gates

## Inputs

Require acceptance criteria, changed files, build target, test commands, asset inventory, and claimed compatibility.

## Procedure

1. Map every claim to a test, inspection, or explicitly unresolved dependency.
2. Run formatting/lint, strict typecheck, unit/integration tests, and production builds.
3. Exercise the core user path and record real output, date, environment, and failures.
4. Review secrets, dependency versions, licenses, simulation limitations, accessibility, and performance evidence.
5. Update `PROJECT_STATUS`, `TEST_RESULTS`, and compatibility docs; never convert an unrun check into a pass.

## References

Use `AGENTS.md`, `docs/PROJECT_STATUS.md`, and phase acceptance criteria.

## Output

Produce a pass/fail gate, exact commands/results, limitations, blockers, and next deliverable.

## Validation

A phase passes only when mandatory criteria have evidence. Emulation and hardware tests must remain separate.
