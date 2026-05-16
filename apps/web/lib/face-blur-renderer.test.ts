import { describe, expect, it, vi } from "vitest";
import {
  renderFaceBlurRegions,
  renderImageWithFaceBlur,
} from "./face-blur-renderer";

function makeContext() {
  return {
    fillStyle: "",
    filter: "none",
    imageSmoothingEnabled: true,
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function makeImage(width = 1200, height = 800) {
  return { naturalWidth: width, naturalHeight: height } as HTMLImageElement;
}

describe("renderFaceBlurRegions", () => {
  it("renders gaussian blur region with source dimensions", () => {
    const ctx = makeContext();
    const image = makeImage();
    renderFaceBlurRegions(
      ctx,
      image,
      {
        method: "gaussian",
        amount: 24,
        regions: [
          {
            x: 120,
            y: 80,
            width: 300,
            height: 200,
            sourceWidth: 1200,
            sourceHeight: 800,
          },
        ],
      },
      600,
      400,
    );

    expect(ctx.save).toHaveBeenCalledOnce();
    expect(ctx.filter).toBe("blur(24px)");
    expect(ctx.drawImage).toHaveBeenCalledWith(
      image,
      120,
      80,
      300,
      200,
      60,
      40,
      150,
      100,
    );
    expect(ctx.restore).toHaveBeenCalledOnce();
  });

  it("renders pixelate using sampled offscreen canvas", () => {
    const doc = globalThis.document;
    expect(doc).toBeDefined();
    if (!doc) return;
    const ctx = makeContext();
    const image = makeImage();
    const sampleDrawImage = vi.fn();
    const sampleCtx = {
      imageSmoothingEnabled: true,
      drawImage: sampleDrawImage,
    } as unknown as CanvasRenderingContext2D;
    const sampleCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => sampleCtx),
    } as unknown as HTMLCanvasElement;
    const nativeCreateElement = doc.createElement.bind(doc);
    const createElement = vi
      .spyOn(doc, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "canvas") return sampleCanvas;
        return nativeCreateElement(tagName);
      });

    renderFaceBlurRegions(
      ctx,
      image,
      {
        method: "pixelate",
        amount: 10,
        regions: [
          {
            x: 200,
            y: 100,
            width: 160,
            height: 120,
            sourceWidth: 1200,
            sourceHeight: 800,
          },
        ],
      },
      600,
      400,
    );

    expect(sampleCanvas.width).toBe(16);
    expect(sampleCanvas.height).toBe(12);
    expect(sampleDrawImage).toHaveBeenCalledWith(
      image,
      200,
      100,
      160,
      120,
      0,
      0,
      16,
      12,
    );
    expect(ctx.drawImage).toHaveBeenCalledWith(
      sampleCanvas,
      0,
      0,
      16,
      12,
      100,
      50,
      80,
      60,
    );
    createElement.mockRestore();
  });

  it("renders censor with region color priority", () => {
    const ctx = makeContext();
    const image = makeImage();
    renderFaceBlurRegions(
      ctx,
      image,
      {
        method: "censor",
        amount: 20,
        censorColor: "#ff0000",
        regions: [
          {
            x: 20,
            y: 30,
            width: 40,
            height: 50,
            sourceWidth: 1200,
            sourceHeight: 800,
            censorColor: "#00ff00",
          },
        ],
      },
      600,
      400,
    );

    expect(ctx.fillStyle).toBe("#00ff00");
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 15, 20, 25);
  });

  it("falls back to legacy region scaling when source dimensions are missing", () => {
    const ctx = makeContext();
    const image = makeImage(2400, 1600);
    renderFaceBlurRegions(
      ctx,
      image,
      {
        method: "gaussian",
        amount: 16,
        regions: [{ x: 100, y: 120, width: 300, height: 200 }],
      },
      600,
      400,
    );

    expect(ctx.drawImage).toHaveBeenCalledWith(
      image,
      400,
      480,
      1200,
      800,
      100,
      120,
      300,
      200,
    );
  });

  it("applies blur to source-sized image before drawing the resized layer", () => {
    const doc = globalThis.document;
    expect(doc).toBeDefined();
    if (!doc) return;
    const ctx = makeContext();
    const image = makeImage();
    const sourceDrawImage = vi.fn();
    const sourceCtx = {
      ...makeContext(),
      drawImage: sourceDrawImage,
    } as unknown as CanvasRenderingContext2D;
    const sourceCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => sourceCtx),
    } as unknown as HTMLCanvasElement;
    const nativeCreateElement = doc.createElement.bind(doc);
    const createElement = vi
      .spyOn(doc, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName === "canvas") return sourceCanvas;
        return nativeCreateElement(tagName);
      });

    renderImageWithFaceBlur(
      ctx,
      image,
      {
        method: "gaussian",
        amount: 24,
        regions: [
          {
            x: 120,
            y: 80,
            width: 300,
            height: 200,
            sourceWidth: 1200,
            sourceHeight: 800,
          },
        ],
      },
      600,
      400,
    );

    expect(sourceCanvas.width).toBe(1200);
    expect(sourceCanvas.height).toBe(800);
    expect(sourceDrawImage).toHaveBeenNthCalledWith(1, image, 0, 0, 1200, 800);
    expect(sourceDrawImage).toHaveBeenNthCalledWith(
      2,
      image,
      120,
      80,
      300,
      200,
      120,
      80,
      300,
      200,
    );
    expect(ctx.drawImage).toHaveBeenCalledWith(
      sourceCanvas,
      0,
      0,
      1200,
      800,
      0,
      0,
      600,
      400,
    );
    createElement.mockRestore();
  });

  it("uses a canvas-filter fallback for gaussian blur when filters are unavailable", () => {
    const doc = globalThis.document;
    expect(doc).toBeDefined();
    if (!doc) return;
    const ctx = makeContext();
    delete (ctx as Partial<CanvasRenderingContext2D>).filter;
    const image = makeImage();
    const regionDrawImage = vi.fn();
    const blurDrawImage = vi.fn();
    const regionCtx = {
      ...makeContext(),
      clearRect: vi.fn(),
      drawImage: regionDrawImage,
    } as unknown as CanvasRenderingContext2D;
    const blurCtx = {
      ...makeContext(),
      clearRect: vi.fn(),
      drawImage: blurDrawImage,
    } as unknown as CanvasRenderingContext2D;
    const regionCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => regionCtx),
    } as unknown as HTMLCanvasElement;
    const blurCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => blurCtx),
    } as unknown as HTMLCanvasElement;
    const nativeCreateElement = doc.createElement.bind(doc);
    const createElement = vi
      .spyOn(doc, "createElement")
      .mockImplementation((tagName: string) => {
        if (tagName !== "canvas") return nativeCreateElement(tagName);
        return createElement.mock.calls.length === 1
          ? regionCanvas
          : blurCanvas;
      });

    renderFaceBlurRegions(
      ctx,
      image,
      {
        method: "gaussian",
        amount: 24,
        regions: [
          {
            x: 120,
            y: 80,
            width: 300,
            height: 200,
            sourceWidth: 1200,
            sourceHeight: 800,
          },
        ],
      },
      600,
      400,
    );

    expect(ctx.save).not.toHaveBeenCalled();
    expect(regionCanvas.width).toBe(150);
    expect(regionCanvas.height).toBe(100);
    expect(regionDrawImage).toHaveBeenCalledWith(
      image,
      120,
      80,
      300,
      200,
      0,
      0,
      150,
      100,
    );
    expect(ctx.drawImage).toHaveBeenCalledWith(
      regionCanvas,
      0,
      0,
      150,
      100,
      60,
      40,
      150,
      100,
    );
    createElement.mockRestore();
  });
});
