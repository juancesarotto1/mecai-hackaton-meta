# ADR-0002: Separate desktop and IWSDK render runtimes

Status: accepted, 2026-10-12.

Run desktop in Next.js with current Three.js and XR in Vite/IWSDK with IWSDK's exact Three alias. Share pure TypeScript domain packages, not renderer objects or render loops. This avoids two incompatible Three/physics runtimes in one page.
