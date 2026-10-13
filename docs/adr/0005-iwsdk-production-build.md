# ADR-0005: Official IWSDK plugin for development and production builds

Status: accepted, 2026-10-12. Supersedes the same-day decision to use a custom production manifest adapter.

The default Vite config bundler asks esbuild to scan parent directories up to the Windows filesystem root. The managed workspace correctly denies that broad read, preventing config startup. Vite's supported `--configLoader runner` avoids that scan and stays in the XR build script.

The first production build replaced `@iwsdk/vite-plugin-dev` with a hand-written `virtual:iwsdk-project` adapter. It compiled, but the bundle never rendered: the adapter exported `components: []`, and `World.create` rejects component lists that were not built by IWSDK's own Elics registry. The bundled scene also used `environment.background`, which `iwsdk.scene.v1` does not allow. A headless browser smoke test exposed both failures.

Production now uses the official plugin, the same as development. In build mode it generates the project module exactly as the runtime expects, drops the Havok and unused UIKit font payloads, and dedupes Three.js. The bundle shrank from 16 MB to about 7 MB, and the duplicate Three.js warning is gone. IWER emulation is not injected into production builds unless `injectOnBuild` is set. `vite preview` loads no plugins because it only serves `dist/`.

`apps/xr-experience/src/project.test.ts` validates the manifest and the scene with IWSDK's own validators and its built-in component catalog, so either regression now fails `pnpm test`.
