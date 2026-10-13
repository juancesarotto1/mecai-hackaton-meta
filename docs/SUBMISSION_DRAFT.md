# Submission form draft

Complete every bracketed field before submission. Do not submit placeholders.

## Core fields

- **Submission name:** MotorMind XR
- **Tagline:** See, diagnose, disassemble, and repair a living engine with your bare hands in an immersive mechanical lab.
- **Track:** Productivity
- **Division:** New Experience — entrant confirmation required
- **Playable HTTPS URL:** `[ADD FINAL URL]`
- **Public video URL:** `[ADD YOUTUBE OR VIMEO URL]`
- **Target launch date:** `[ADD DATE]`

## Description

MotorMind XR turns a complex mechanical system into a spatial workspace that can be understood in one short session. The experience places a running inline-four DOHC turbo engine directly in front of a seated user. Instead of reading a diagram, the user watches the crankshaft, connecting rods, pistons, camshafts, and valves move through a deterministic 720-degree four-stroke cycle.

The guided mission begins by starting the engine and introducing a controlled low-compression fault in cylinder two. The user observes the highlighted fault, performs a safe shutdown, follows the dependency-aware disassembly sequence, exposes the affected piston, and completes the repair. A local mechanical command system, fault simulation, telemetry, and educational explanations support exploration without becoming dependencies of the core XR experience.

We built the project as a TypeScript monorepo with a pure mechanical domain shared by a desktop Three.js laboratory and an immersive IWSDK runtime. The engine is procedural, with stable component identifiers and SI-unit configuration. Crank-slider equations drive the moving assembly; typed state machines control the mission and disassembly; IWSDK pointer components provide hand rays, near poke, pinch selection, and distance rotation. OpenAI integration is optional and server-isolated—the complete judged XR loop works without it.

Future work includes validated Quest performance budgets, a licensed segmented production engine asset, richer acoustics and haptics, additional fault scenarios, collaborative instruction, and a curriculum authoring system for technical training.

## Hand interactions

The experience requires WebXR hand tracking and is designed to be completed without pairing controllers. Users can point and pinch at large spatial controls or touch them directly. The same hands can distance-grab and rotate the engine for inspection. Every required action—start, fault injection, safe stop, disassembly, repair, pause/resume, reset—is available through this shared pointer path, with hover color changes, state panels, and audio confirmation.

What excites us about VR is the ability to turn abstract systems into embodied understanding: learners can see causality, scale, motion, and procedure in the same place instead of translating between a manual and a physical machine.

## Team

| Name     | Email     | Role     |
| -------- | --------- | -------- |
| `[NAME]` | `[EMAIL]` | `[ROLE]` |
