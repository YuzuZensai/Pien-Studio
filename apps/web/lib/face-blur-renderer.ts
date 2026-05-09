import type { FaceBlurSettings } from "@pien-studio/types";

type BlurRegion = FaceBlurSettings["regions"][number];

function drawPixelatedRegion(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceX: number,
  sourceY: number,
  sourceWidth: number,
  sourceHeight: number,
  targetX: number,
  targetY: number,
  targetWidth: number,
  targetHeight: number,
  blockSize: number,
) {
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = Math.max(1, Math.round(targetWidth / blockSize));
  sampleCanvas.height = Math.max(1, Math.round(targetHeight / blockSize));
  const sampleCtx = sampleCanvas.getContext("2d");
  if (!sampleCtx) return;
  sampleCtx.imageSmoothingEnabled = false;
  sampleCtx.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sampleCanvas.width, sampleCanvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sampleCanvas, 0, 0, sampleCanvas.width, sampleCanvas.height, targetX, targetY, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
}

export function renderFaceBlurRegions(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  blur: { method: FaceBlurSettings["method"]; amount: number; regions: BlurRegion[]; censorColor?: string },
  targetWidth: number,
  targetHeight: number,
): void {
  if (!blur.regions.length) return;
  const legacyScaleX = image.naturalWidth / Math.max(1, targetWidth);
  const legacyScaleY = image.naturalHeight / Math.max(1, targetHeight);

  for (const region of blur.regions) {
    const hasSourceDims = typeof region.sourceWidth === "number" && typeof region.sourceHeight === "number" && region.sourceWidth > 0 && region.sourceHeight > 0;
    const scaleX = hasSourceDims ? targetWidth / region.sourceWidth : 1;
    const scaleY = hasSourceDims ? targetHeight / region.sourceHeight : 1;

    const x = Math.max(0, Math.floor(region.x * scaleX));
    const y = Math.max(0, Math.floor(region.y * scaleY));
    const w = Math.max(1, Math.floor(region.width * scaleX));
    const h = Math.max(1, Math.floor(region.height * scaleY));
    const sx0 = hasSourceDims ? region.x : Math.max(0, Math.floor(region.x * legacyScaleX));
    const sy0 = hasSourceDims ? region.y : Math.max(0, Math.floor(region.y * legacyScaleY));
    const sw = hasSourceDims ? region.width : Math.max(1, Math.floor(region.width * legacyScaleX));
    const sh = hasSourceDims ? region.height : Math.max(1, Math.floor(region.height * legacyScaleY));

    if (blur.method === "censor") {
      ctx.fillStyle = region.censorColor ?? blur.censorColor ?? "#111111";
      ctx.fillRect(x, y, w, h);
      continue;
    }

    if (blur.method === "pixelate") {
      const pixelSize = Math.max(4, Math.round(blur.amount / 2));
      drawPixelatedRegion(ctx, image, sx0, sy0, sw, sh, x, y, w, h, pixelSize);
      continue;
    }

    ctx.save();
    ctx.filter = `blur(${blur.amount}px)`;
    ctx.drawImage(image, sx0, sy0, sw, sh, x, y, w, h);
    ctx.restore();
  }
}
