# Decision log

- ADR-0001: use a procedural mechanism until a licensed segmented asset exists.
- ADR-0002: isolate Next/Three desktop and Vite/IWSDK runtimes while sharing pure mechanics.
- ADR-0003: keep project skills in `skills/` because `.agents/skills/` is read-only in this managed workspace.
- ADR-0004: ship a deterministic local copilot; real provider calls remain server-only and configuration-gated.
- ADR-0005: use the official IWSDK Vite plugin for development and production builds, with Vite's runner config loader in the managed Windows workspace.
