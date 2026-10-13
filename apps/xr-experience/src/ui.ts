import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "@iwsdk/core";

export const palette = {
  surface: "rgba(13, 17, 22, 0.94)",
  surfaceRaised: "#1a2129",
  stroke: "rgba(255, 255, 255, 0.09)",
  text: "#f2f5f8",
  muted: "#93a1ae",
  faint: "#5c6976",
  accent: "#3d8bfd",
  accentHover: "#6aa6ff",
  success: "#3ccf91",
  warning: "#f5a524",
  danger: "#ff6b4a",
};

const FONT = "'Inter', 'Segoe UI', Roboto, system-ui, sans-serif";

export interface CanvasPanel {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
}

/** A plane whose texture is a canvas drawn at ~2,800 px per metre for legibility in headset. */
export function createCanvasPanel(widthM: number, heightM: number, name: string): CanvasPanel {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthM * 2800);
  canvas.height = Math.round(heightM * 2800);
  const context = canvas.getContext("2d")!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: DoubleSide,
    toneMapped: false,
  });
  const mesh = new Mesh(new PlaneGeometry(widthM, heightM), material);
  mesh.name = name;
  return { canvas, context, texture, mesh };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
}

function wrap(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  let line = "";
  let cursor = y;
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else line = candidate;
  }
  context.fillText(line, x, cursor);
  return cursor;
}

export interface StatusView {
  step: number;
  steps: number;
  stepLabel: string;
  phase: string;
  title: string;
  instruction: string;
  running: boolean;
  paused: boolean;
  fault: string | null;
  complete: boolean;
}

export function drawStatus(panel: CanvasPanel, view: StatusView): void {
  const { context: c, canvas, texture } = panel;
  const w = canvas.width;
  const h = canvas.height;
  const pad = w * 0.06;
  c.clearRect(0, 0, w, h);
  roundedRect(c, 4, 4, w - 8, h - 8, 44);
  c.fillStyle = palette.surface;
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = palette.stroke;
  c.stroke();

  c.textBaseline = "alphabetic";
  c.font = `600 34px ${FONT}`;
  c.fillStyle = palette.faint;
  c.fillText("MOTORMIND XR  ·  BANCO I4 DOHC TURBO", pad, pad + 20);
  c.textAlign = "right";
  c.fillText(view.stepLabel, w - pad, pad + 20);
  c.textAlign = "left";

  const barY = pad + 52;
  const gap = 10;
  const segment = (w - pad * 2 - gap * (view.steps - 1)) / view.steps;
  for (let index = 0; index < view.steps; index += 1) {
    roundedRect(c, pad + index * (segment + gap), barY, segment, 10, 5);
    c.fillStyle =
      index < view.step
        ? view.complete
          ? palette.success
          : palette.accent
        : "rgba(255,255,255,0.1)";
    c.fill();
  }

  c.font = `600 40px ${FONT}`;
  c.fillStyle = view.complete ? palette.success : view.fault ? palette.warning : palette.accent;
  c.fillText(view.phase.toUpperCase(), pad, barY + 104);
  c.font = `700 88px ${FONT}`;
  c.fillStyle = palette.text;
  c.fillText(view.title, pad, barY + 204);
  c.font = `400 46px ${FONT}`;
  c.fillStyle = palette.muted;
  wrap(c, view.instruction, pad, barY + 280, w - pad * 2, 62);

  const chipY = h - pad - 64;
  let chipX = pad;
  const chip = (label: string, color: string) => {
    c.font = `600 36px ${FONT}`;
    const width = c.measureText(label).width + 84;
    roundedRect(c, chipX, chipY, width, 64, 32);
    c.fillStyle = "rgba(255,255,255,0.06)";
    c.fill();
    c.beginPath();
    c.arc(chipX + 34, chipY + 32, 9, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
    c.fillStyle = palette.text;
    c.fillText(label, chipX + 56, chipY + 45);
    chipX += width + 18;
  };
  if (view.running) chip("1200 rpm · cámara lenta ×1/20", palette.success);
  else if (view.paused) chip("En pausa", palette.warning);
  else chip("Motor detenido", palette.faint);
  if (view.fault) chip(view.fault, palette.warning);
  texture.needsUpdate = true;
}

export function drawButton(
  panel: CanvasPanel,
  label: string,
  options: { primary: boolean; hovered: boolean; enabled: boolean; hint?: string },
): void {
  const { context: c, canvas, texture } = panel;
  const w = canvas.width;
  const h = canvas.height;
  c.clearRect(0, 0, w, h);
  roundedRect(c, 6, 6, w - 12, h - 12, Math.min(40, h * 0.3));
  if (!options.enabled) {
    c.fillStyle = "rgba(26, 33, 41, 0.75)";
    c.fill();
  } else if (options.primary) {
    c.fillStyle = options.hovered ? palette.accentHover : palette.accent;
    c.fill();
  } else {
    c.fillStyle = options.hovered ? "#26313c" : palette.surfaceRaised;
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = options.hovered ? "rgba(255,255,255,0.4)" : palette.stroke;
    c.stroke();
  }
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = options.enabled ? (options.primary ? "#ffffff" : palette.text) : palette.faint;
  const size = options.primary ? Math.round(h * 0.26) : Math.round(h * 0.28);
  c.font = `${options.primary ? 700 : 600} ${size}px ${FONT}`;
  c.fillText(label, w / 2, options.hint ? h * 0.42 : h / 2);
  if (options.hint) {
    c.font = `500 ${Math.round(h * 0.15)}px ${FONT}`;
    c.fillStyle = options.enabled ? "rgba(255,255,255,0.75)" : palette.faint;
    c.fillText(options.hint, w / 2, h * 0.72);
  }
  c.textAlign = "left";
  c.textBaseline = "alphabetic";
  texture.needsUpdate = true;
}

/** Largest font size (px) at which `text` fits in `maxWidth`, capped at `size`. */
function fitFont(
  context: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  maxWidth: number,
): string {
  let px = size;
  do {
    context.font = `${weight} ${px}px ${FONT}`;
    px -= 2;
  } while (context.measureText(text).width > maxWidth && px > 8);
  return context.font;
}

export function drawCallout(panel: CanvasPanel, title: string, detail: string): void {
  const { context: c, canvas, texture } = panel;
  const w = canvas.width;
  const h = canvas.height;
  const inset = Math.round(h * 0.16);
  c.clearRect(0, 0, w, h);
  roundedRect(c, 4, 4, w - 8, h - 8, 28);
  c.fillStyle = "rgba(13, 17, 22, 0.92)";
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = palette.warning;
  c.stroke();
  c.font = fitFont(c, title, 700, Math.round(h * 0.3), w - inset * 2);
  c.fillStyle = palette.warning;
  c.fillText(title, inset, h * 0.44);
  c.font = fitFont(c, detail, 500, Math.round(h * 0.2), w - inset * 2);
  c.fillStyle = palette.text;
  c.fillText(detail, inset, h * 0.78);
  texture.needsUpdate = true;
}
