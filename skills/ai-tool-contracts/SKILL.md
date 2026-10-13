---
name: ai-tool-contracts
description: Design safe typed AI tools for MotorMind XR. Use for Responses API function tools, structured outputs, scene commands, schemas, authorization, preconditions, audit logs, tool-loop errors, or prompt-injection defenses.
---

# AI Tool Contracts

## Inputs

Require user intent, scene state, allowed tools, authority, preconditions, effects, and recovery behavior.

## Procedure

1. Define a narrow allowlisted tool with Zod and strict JSON Schema; set `additionalProperties:false`.
2. Validate model arguments again server-side and resolve IDs against current state.
3. Route accepted actions through the command bus; never expose Three.js objects or provider credentials.
4. Return typed recoverable errors and append a redacted audit event.
5. Cap tool-loop iterations and prevent duplicate execution by call ID.

## References

Use current official OpenAI function-calling/Structured Outputs docs plus `packages/ai-tools`.

## Output

Produce schemas, executor mapping, precondition/effect documentation, tests, and audit examples.

## Validation

Test valid, malformed, unauthorized, stale-state, duplicate, timeout, refusal, and injection-shaped inputs. Never let retrieved text redefine tool permissions.
