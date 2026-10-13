# ADR-0003: Project skill location

Status: accepted with environment constraint, 2026-10-12.

The specification prefers `.agents/skills/`, but the managed workspace exposes `.agents` as read-only. Store valid skills in root `skills/` and reference them from `AGENTS.md`. No official-provider status is claimed for these project skills.
