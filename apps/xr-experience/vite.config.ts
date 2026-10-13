import { iwsdkDev } from "@iwsdk/vite-plugin-dev";
import { defineConfig } from "vite";

// The official plugin serves the emulator in development and, for builds, generates the
// project module, drops unused Havok/UIKit font payloads and dedupes Three.js. IWER is not
// injected into production builds unless `injectOnBuild` is set.
export default defineConfig(({ isPreview }) => ({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: isPreview ? [] : [iwsdkDev()],
  server: { host: "0.0.0.0", open: false },
}));
