import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasRenderer } from "./canvas-renderer";
import type { Layer } from "@pien-studio/types";

vi.mock("next/image", () => ({
  default: ({ alt, src, unoptimized: _unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => React.createElement("img", { alt, src, ...props }),
}));

vi.mock("../hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe("CanvasRenderer", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
  });

  it("keeps the rotation handle interactive", () => {
    const layer: Layer = {
      id: "layer-1",
      type: "image",
      sourceUri: "data:image/png;base64,test",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    const onRotateLayer = vi.fn();

    render(
      <CanvasRenderer
        layers={[layer]}
        canvasWidth={200}
        canvasHeight={200}
        selectedLayerId={layer.id}
        onSelectLayer={() => undefined}
        onMoveLayer={() => undefined}
        onResizeLayer={() => undefined}
        onRotateLayer={onRotateLayer}
        isDark={false}
      />,
    );

    const rotateHandle = screen.getByTitle("editor.rotate");
    expect(rotateHandle).toHaveClass("pointer-events-auto");

    fireEvent(rotateHandle, new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 50, clientY: 0 }));
    fireEvent(rotateHandle, new MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 50 }));

    expect(onRotateLayer).toHaveBeenCalledWith(layer.id, 90);
  });
});
