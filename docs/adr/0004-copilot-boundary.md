# ADR-0004: Deterministic local copilot first

Status: accepted, 2026-10-12.

Provide executable, testable local intent mapping for the demo. Optional Responses calls go through a server route with strict tools and never directly mutate Three.js. Realtime tokens are issued only by a server route and only when a server API key is configured.
