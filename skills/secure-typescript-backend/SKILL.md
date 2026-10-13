---
name: secure-typescript-backend
description: Implement secure typed TypeScript backend boundaries. Use for NestJS or Next route handlers, validation, OpenAI proxies, ephemeral tokens, persistence, rate limits, headers, logging, or secret management.
---

# Secure TypeScript Backend

## Inputs

Require endpoint purpose, caller identity, data classification, schema, authorization rule, provider dependency, and operational limits.

## Procedure

1. Validate body, params, and headers at the boundary; reject unknown fields for sensitive actions.
2. Authenticate and authorize server-side; constrain tenant/resource IDs.
3. Keep secrets in server environment variables and issue the least-capable short-lived credential when needed.
4. Apply size, rate, timeout, retry, and idempotency controls appropriate to the action.
5. Log correlation and outcome without request secrets, tokens, or sensitive payloads.

## References

Use OWASP ASVS/API guidance and the provider's current official documentation.

## Output

Produce typed handlers/services, sanitized errors, configuration documentation, and tests.

## Validation

Test malformed, oversized, cross-site, unauthenticated, unauthorized, timeout, upstream-failure, and missing-secret paths.
