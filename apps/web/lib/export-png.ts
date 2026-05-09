import type { Layer, Project } from "@pien-studio/types";
import { renderFaceBlurRegions } from "./face-blur-renderer";

type ExportOptions = {
  isDark: boolean;
  pixelRatio?: number;
};

function clampOpacity(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawFallbackLayer(ctx: CanvasRenderingContext2D, layer: Layer, isDark: boolean) {
  const text = layer.name ?? layer.type;
  const width = Math.max(80, layer.width ?? 120);
  const height = Math.max(34, layer.height ?? 40);
  const radius = 8;

  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();

  ctx.fillStyle = isDark ? "#2d3036" : "#ffffff";
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isDark ? "#d7dae0" : "#1f2430";
  ctx.font = "600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
}

async function drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, isDark: boolean) {
  const width = layer.width ?? (layer.type === "image" ? Math.round(200 * layer.scale) : 120);
  const height = layer.height ?? (layer.type === "image" ? Math.round(150 * layer.scale) : 40);

  ctx.save();
  ctx.globalAlpha = clampOpacity(layer.opacity);
  ctx.translate(layer.x + width / 2, layer.y + height / 2);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  if ((layer.type === "image" || layer.type === "sticker") && layer.sourceUri) {
    try {
      const image = await loadImage(layer.sourceUri);
      ctx.drawImage(image, 0, 0, width, height);
      if (layer.faceBlur && layer.faceBlur.regions.length > 0) {
        renderFaceBlurRegions(ctx, image, layer.faceBlur, width, height);
      }
    } catch {
      drawFallbackLayer(ctx, layer, isDark);
    }
  } else {
    drawFallbackLayer(ctx, layer, isDark);
  }

  ctx.restore();
}

export async function exportProjectAsPng(project: Project, options: ExportOptions) {
  const pixelRatio = Math.max(1, Math.floor(options.pixelRatio ?? window.devicePixelRatio ?? 1));
  const { width, height } = project.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot create export canvas context");

  ctx.scale(pixelRatio, pixelRatio);
  ctx.fillStyle = options.isDark ? "#17181b" : "#ffffff";
  ctx.fillRect(0, 0, width, height);

  for (const layer of project.layers) {
    await drawLayer(ctx, layer, options.isDark);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${project.title || "pien-project"}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
