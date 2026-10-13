import { componentCatalogFromComponents, IWSDK_BUILTIN_COMPONENTS } from "@iwsdk/core";
import { normalizeProjectWorldOptions, validateIwsdkProjectManifest } from "@iwsdk/core/project";
import { validateSceneDocument } from "@iwsdk/scene-composition";
import { describe, expect, it } from "vitest";
import manifest from "../iwsdk.config.json";
import scene from "../public/scenes/main.iwsdk.scene.json";

describe("IWSDK project files", () => {
  it("declares a valid immersive, hands-required project", () => {
    expect(validateIwsdkProjectManifest(manifest).issues).toEqual([]);

    const options = normalizeProjectWorldOptions(manifest as never);
    expect(options.xr).toMatchObject({
      features: { handTracking: { required: true } },
    });
    // Seated use: the judged flow must not depend on artificial locomotion.
    expect(options.features?.locomotion ?? false).toBe(false);
  });

  it("ships a scene the runtime level loader accepts", () => {
    const componentCatalog = componentCatalogFromComponents(IWSDK_BUILTIN_COMPONENTS, {
      source: "iwsdk",
    });

    expect(validateSceneDocument(scene, { componentCatalog }).issues).toEqual([]);
  });
});
