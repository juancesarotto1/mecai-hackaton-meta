import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  type Texture,
  type WebGLRenderer,
} from "@iwsdk/core";

/** Studio light box baked into a prefiltered environment map, so metals have something to reflect. */
export function createStudioEnvironment(renderer: WebGLRenderer): Texture {
  const room = new Scene();
  room.background = new Color(0x111316);
  const shell = new Mesh(
    new BoxGeometry(12, 6, 12),
    new MeshBasicMaterial({ color: 0x15171a, side: BackSide }),
  );
  shell.position.y = 2;
  room.add(shell);
  const softbox = (
    intensity: number,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const material = new MeshBasicMaterial({ color: new Color().setScalar(intensity) });
    const box = new Mesh(new BoxGeometry(w, h, d), material);
    box.position.set(x, y, z);
    room.add(box);
  };
  softbox(5, 5, 0.1, 2.2, 0, 4.9, 0); // overhead key
  softbox(1.6, 0.1, 2.5, 4, -5.9, 2.2, 0); // left fill
  softbox(2.4, 0.1, 2, 3, 5.9, 2.5, -1); // right rim
  softbox(1, 4, 2, 0.1, 0, 2, 5.9); // front bounce
  softbox(0.35, 6, 0.1, 6, 0, -0.9, 0); // floor bounce
  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(room, 0.03).texture;
  pmrem.dispose();
  return texture;
}

/** Tileable value noise for cast and painted surfaces; keeps materials from looking like flat CG. */
function noiseTexture(size: number, base: number, spread: number, scale: number): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(size, size);
  let seed = 1337;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grid = Array.from({ length: scale * scale }, random);
  const at = (x: number, y: number) => grid[((y + scale) % scale) * scale + ((x + scale) % scale)]!;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const gx = (x / size) * scale;
      const gy = (y / size) * scale;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = gx - x0;
      const ty = gy - y0;
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      const smooth = top * (1 - ty) + bottom * ty;
      const value = base + (smooth - 0.5) * spread + (random() - 0.5) * spread * 0.6;
      const byte = Math.max(0, Math.min(255, Math.round(value * 255)));
      const offset = (y * size + x) * 4;
      image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = byte;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

export interface EngineMaterials {
  castAluminum: MeshStandardMaterial;
  machinedAluminum: MeshStandardMaterial;
  castIron: MeshStandardMaterial;
  interior: MeshStandardMaterial;
  forgedSteel: MeshStandardMaterial;
  polishedSteel: MeshStandardMaterial;
  boreSteel: MeshStandardMaterial;
  darkSteel: MeshStandardMaterial;
  exhaustIron: MeshStandardMaterial;
  blackPlastic: MeshStandardMaterial;
  ceramic: MeshStandardMaterial;
  brass: MeshStandardMaterial;
  paintedFrame: MeshStandardMaterial;
  rubber: MeshStandardMaterial;
  chain: MeshStandardMaterial;
  floor: MeshStandardMaterial;
  mat: MeshStandardMaterial;
}

export function createEngineMaterials(environment: Texture): EngineMaterials {
  const castRoughness = noiseTexture(256, 0.62, 0.35, 32);
  castRoughness.repeat.set(3, 3);
  const castBump = noiseTexture(256, 0.5, 0.9, 64);
  castBump.repeat.set(4, 4);
  const brushed = noiseTexture(128, 0.32, 0.18, 8);
  const floorRoughness = noiseTexture(512, 0.55, 0.18, 6);
  floorRoughness.repeat.set(3, 3);
  const floorColor = noiseTexture(512, 0.5, 0.08, 8);
  floorColor.colorSpace = SRGBColorSpace;
  floorColor.repeat.set(3, 3);

  const pbr = (parameters: ConstructorParameters<typeof MeshStandardMaterial>[0]) =>
    new MeshStandardMaterial({ envMap: environment, envMapIntensity: 0.75, ...parameters });

  return {
    castAluminum: pbr({
      color: 0x8a8e93,
      metalness: 0.6,
      roughness: 1,
      roughnessMap: castRoughness,
      bumpMap: castBump,
      bumpScale: 0.35,
    }),
    machinedAluminum: pbr({
      color: 0xb4b8bd,
      metalness: 0.85,
      roughness: 0.5,
      roughnessMap: brushed,
    }),
    castIron: pbr({
      color: 0x4a4e53,
      metalness: 0.75,
      roughness: 1,
      roughnessMap: castRoughness,
      bumpMap: castBump,
      bumpScale: 0.8,
    }),
    interior: pbr({
      color: 0x2a2d31,
      metalness: 0.35,
      roughness: 1,
      roughnessMap: castRoughness,
      bumpMap: castBump,
      bumpScale: 0.5,
      envMapIntensity: 0.45,
    }),
    forgedSteel: pbr({ color: 0x6b7075, metalness: 0.9, roughness: 0.48 }),
    polishedSteel: pbr({ color: 0xa9adb2, metalness: 1, roughness: 0.28 }),
    boreSteel: pbr({ color: 0x7d8186, metalness: 0.9, roughness: 0.42, side: DoubleSide }),
    darkSteel: pbr({ color: 0x33363b, metalness: 0.8, roughness: 0.45 }),
    exhaustIron: pbr({
      color: 0x5c4a40,
      metalness: 0.6,
      roughness: 1,
      roughnessMap: castRoughness,
      bumpMap: castBump,
      bumpScale: 1,
    }),
    blackPlastic: pbr({ color: 0x18191b, metalness: 0, roughness: 0.55 }),
    ceramic: pbr({ color: 0xe9e6de, metalness: 0, roughness: 0.35 }),
    brass: pbr({ color: 0xc9a25a, metalness: 1, roughness: 0.3 }),
    paintedFrame: pbr({ color: 0x2a3038, metalness: 0.3, roughness: 0.55 }),
    rubber: pbr({ color: 0x111214, metalness: 0, roughness: 0.9 }),
    chain: pbr({ color: 0x6d7177, metalness: 1, roughness: 0.3 }),
    floor: pbr({
      color: 0x55585c,
      map: floorColor,
      metalness: 0,
      roughness: 1,
      roughnessMap: floorRoughness,
      envMapIntensity: 0.5,
    }),
    mat: pbr({ color: 0x0f1113, metalness: 0, roughness: 0.95, envMapIntensity: 0.2 }),
  };
}
