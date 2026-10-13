---
name: mechanical-disassembly
description: Model, plan, and verify reversible mechanical disassembly. Use for dependency graphs, blockers, fasteners, removal plans, alternatives, assembly reversal, preview, undo/redo, or invalid-operation handling.
---

# Mechanical Disassembly

## Inputs

Require stable part IDs, relationships, active assembly state, target part, and procedure alternatives.

## Procedure

1. Encode blockers and prerequisites as directed edges with explicit semantics.
2. Validate referential integrity and reject cycles unless the relation explicitly permits them.
3. Topologically plan only from the current state; never reuse a stale plan after a mutation.
4. Recheck preconditions before every operation and emit an auditable semantic event.
5. Make removal reversible and validate restoration constraints.

## References

Use `packages/disassembly-graph` and `docs/ARCHITECTURE.md`.

## Output

Produce a typed plan, blockers, executable next action, audit events, and undo/redo state.

## Validation

Test blocked removals, correct prerequisite ordering, cycles, unknown IDs, repeated commands, reset, undo, and redo.
