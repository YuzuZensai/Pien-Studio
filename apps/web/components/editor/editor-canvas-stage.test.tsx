import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorCanvasStage } from "./editor-canvas-stage";

vi.mock("../canvas-renderer", () => ({
  CanvasRenderer: ({ onContextMenu }: { onContextMenu?: (x: number, y: number) => void }) => (
    React.createElement(
      "button",
      { type: "button", "data-testid": "canvas-renderer", onClick: () => onContextMenu?.(10, 12) },
      "canvas",
    )
  ),
}));

describe("EditorCanvasStage", () => {
  it("wires context menu actions", () => {
    const onCopy = vi.fn();
    const onCloseContextMenu = vi.fn();

    render(
      React.createElement(EditorCanvasStage, {
        isDark: false,
        layers: [],
        canvasWidth: 100,
        canvasHeight: 100,
        selectedLayerId: null,
        tool: "pointer",
        faceDetections: [],
        faceOverlayLayerId: null,
        faceBlurPreview: null,
        contextMenu: { x: 10, y: 20 },
        labels: { copy: "Copy", cut: "Cut", paste: "Paste" },
        onSelectLayer: () => undefined,
        onMoveLayer: () => undefined,
        onMoveLayerEnd: () => undefined,
        onResizeLayer: () => undefined,
        onResizeLayerEnd: () => undefined,
        onRotateLayer: () => undefined,
        onRotateLayerEnd: () => undefined,
        onInteractionStart: () => undefined,
        onInteractionEnd: () => undefined,
        onContextMenu: () => undefined,
        onCloseContextMenu,
        onCopy,
        onCut: () => undefined,
        onPaste: () => undefined,
      }),
    );

    fireEvent.click(screen.getByText("Copy"));
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCloseContextMenu).toHaveBeenCalledTimes(1);
  });
});
