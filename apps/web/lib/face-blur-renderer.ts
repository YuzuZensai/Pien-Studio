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
  sampleCtx.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
  );
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sampleCanvas,
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
  );
  ctx.imageSmoothingEnabled = true;
}

function canUseCanvasFilter(ctx: CanvasRenderingContext2D) {
  return "filter" in ctx && typeof ctx.filter === "string";
}

function drawBlurredRegionFallback(
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
  amount: number,
) {
  const regionCanvas = document.createElement("canvas");
  regionCanvas.width = Math.max(1, Math.round(targetWidth));
  regionCanvas.height = Math.max(1, Math.round(targetHeight));
  const regionCtx = regionCanvas.getContext("2d");
  if (!regionCtx) return;

  regionCtx.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    regionCanvas.width,
    regionCanvas.height,
  );

  const scale = Math.max(0.04, Math.min(0.5, 1 / Math.max(2, amount / 2)));
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = Math.max(1, Math.round(regionCanvas.width * scale));
  blurCanvas.height = Math.max(1, Math.round(regionCanvas.height * scale));
  const blurCtx = blurCanvas.getContext("2d");
  if (!blurCtx) return;

  blurCtx.imageSmoothingEnabled = true;
  blurCtx.drawImage(regionCanvas, 0, 0, blurCanvas.width, blurCanvas.height);
  regionCtx.imageSmoothingEnabled = true;
  for (let i = 0; i < 3; i++) {
    regionCtx.clearRect(0, 0, regionCanvas.width, regionCanvas.height);
    regionCtx.drawImage(
      blurCanvas,
      0,
      0,
      blurCanvas.width,
      blurCanvas.height,
      0,
      0,
      regionCanvas.width,
      regionCanvas.height,
    );
    blurCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
    blurCtx.drawImage(
      regionCanvas,
      0,
      0,
      regionCanvas.width,
      regionCanvas.height,
      0,
      0,
      blurCanvas.width,
      blurCanvas.height,
    );
  }

  ctx.drawImage(
    regionCanvas,
    0,
    0,
    regionCanvas.width,
    regionCanvas.height,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
  );
}

export function renderFaceBlurRegions(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  blur: {
    method: FaceBlurSettings["method"];
    amount: number;
    regions: BlurRegion[];
    censorColor?: string;
  },
  targetWidth: number,
  targetHeight: number,
): void {
  if (!blur.regions.length) return;
  const legacyScaleX = image.naturalWidth / Math.max(1, targetWidth);
  const legacyScaleY = image.naturalHeight / Math.max(1, targetHeight);

  for (const region of blur.regions) {
    const sourceWidth = region.sourceWidth ?? 0;
    const sourceHeight = region.sourceHeight ?? 0;
    const hasSourceDims = sourceWidth > 0 && sourceHeight > 0;
    const scaleX = hasSourceDims ? targetWidth / sourceWidth : 1;
    const scaleY = hasSourceDims ? targetHeight / sourceHeight : 1;

    const x = Math.max(0, Math.floor(region.x * scaleX));
    const y = Math.max(0, Math.floor(region.y * scaleY));
    const w = Math.max(1, Math.floor(region.width * scaleX));
    const h = Math.max(1, Math.floor(region.height * scaleY));
    const sx0 = hasSourceDims
      ? region.x
      : Math.max(0, Math.floor(region.x * legacyScaleX));
    const sy0 = hasSourceDims
      ? region.y
      : Math.max(0, Math.floor(region.y * legacyScaleY));
    const sw = hasSourceDims
      ? region.width
      : Math.max(1, Math.floor(region.width * legacyScaleX));
    const sh = hasSourceDims
      ? region.height
      : Math.max(1, Math.floor(region.height * legacyScaleY));

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

    if (canUseCanvasFilter(ctx)) {
      ctx.save();
      ctx.filter = `blur(${blur.amount}px)`;
      ctx.drawImage(image, sx0, sy0, sw, sh, x, y, w, h);
      ctx.restore();
      continue;
    }

    drawBlurredRegionFallback(
      ctx,
      image,
      sx0,
      sy0,
      sw,
      sh,
      x,
      y,
      w,
      h,
      blur.amount,
    );
  }
}

export function renderImageWithFaceBlur(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  blur:
    | {
        method: FaceBlurSettings["method"];
        amount: number;
        regions: BlurRegion[];
        censorColor?: string;
      }
    | undefined,
  targetWidth: number,
  targetHeight: number,
): void {
  if (!blur || blur.regions.length === 0) {
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    return;
  }

  const canBlurAtSourceSize = blur.regions.every(
    (region) => (region.sourceWidth ?? 0) > 0 && (region.sourceHeight ?? 0) > 0,
  );
  if (!canBlurAtSourceSize) {
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    renderFaceBlurRegions(ctx, image, blur, targetWidth, targetHeight);
    return;
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = Math.max(1, image.naturalWidth);
  sourceCanvas.height = Math.max(1, image.naturalHeight);
  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) {
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    return;
  }

  sourceCtx.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
  renderFaceBlurRegions(
    sourceCtx,
    image,
    blur,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );
}
