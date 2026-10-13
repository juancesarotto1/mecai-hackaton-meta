# MotorMind XR repository guidance

Start every session by reading `docs/PROJECT_STATUS.md`, then verify the repository before choosing the next incomplete deliverable.

## Product invariants

- Keep simulation deterministic and independent from React, Three.js, and provider SDKs.
- Treat the client runtime state as the source of truth for the interactive engine.
- Route AI requests through typed commands; never let model output mutate the scene directly.
- Keep provider credentials server-side and never log secrets or ephemeral tokens.
- Use stable part IDs and explicit SI units at package boundaries.
- Distinguish rigid kinematics from approximate dynamics and thermodynamics in code and UI.
- Do not claim Quest hardware validation from desktop emulation.

## Required verification

Run `pnpm quality` before considering a vertical slice complete. Record real results in `docs/TEST_RESULTS.md` and update `docs/PROJECT_STATUS.md`.

## Destructive actions

Always ask the user for explicit permission before deleting any file, directory, data, or artifact. Never delete anything important without that confirmation, even when cleanup appears routine.

## Project skills

Reusable workflows live in `skills/`. The preferred `.agents/skills/` path is read-only in the current managed workspace, so this repository uses the compatible root-level location and records the exception in ADR-0003.

## Specialist review lenses

Apply the relevant lens for every change: architecture, graphics, mechanical simulation, XR, AI, asset pipeline, backend, frontend/UX, QA, and DevSecOps. Their concrete contracts are in `docs/ARCHITECTURE.md`; do not simulate conversations between roles.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.

<!-- END:turborepo-agent-rules -->
