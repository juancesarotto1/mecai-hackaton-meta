# Architecture

MotorMind XR usa un estado mecánico compartido y comandos tipados. `engine-schema` fija IDs y unidades; `engine-kinematics` deriva todas las transformaciones del ángulo del cigüeñal; `fault-simulator` calcula una aproximación de primer orden; `disassembly-graph` valida operaciones; `command-bus` es el único límite de mutación; renderizadores web e IWSDK consumen esos paquetes sin que el dominio dependa de React o Three.js.

```text
mouse · touch · voz · IA · XR
             │
        comandos tipados
             │
    validación + command bus
       ┌─────┴─────┐
cinemática      desmontaje/fallas
       └─────┬─────┘
        runtime state
       ┌─────┴─────┐
 Next/Three      IWSDK ECS
```

La app Next contiene el laboratorio desktop y proxies server-only para OpenAI. La app Vite/IWSDK es un runtime XR independiente con el mismo núcleo matemático. El backend NestJS, persistencia y catálogo quedan fuera del slice de 72 horas; `apps/api` reserva el límite sin fingir infraestructura no implementada.

## Specialist contracts

- Architecture: contracts, boundaries, ADRs, dependency direction.
- Graphics: selection, materials, disposal, budgets, progressive assets.
- Mechanics: equations, units, fidelity, deterministic tests.
- XR: one IWSDK world/runtime, capability detection, emulator/device separation.
- AI: allowlisted tools, server validation, no direct scene access.
- Assets: provenance, segmentation, pivots, manifest.
- Backend: secrets server-side, schema validation, safe errors.
- UX: usable first minute, keyboard/focus, responsive work surface.
- QA: evidence-backed claims and regression tests.
- DevSecOps: lockfile, CI, headers, no secrets.
