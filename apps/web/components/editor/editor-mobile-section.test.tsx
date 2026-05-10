import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorMobileSection } from "./editor-mobile-section";

vi.mock("../canvas-renderer", () => ({
  CanvasRenderer: () => React.createElement("div", { "data-testid": "canvas-renderer" }),
}));

describe("EditorMobileSection", () => {
  it("shows face detection helper message in face mode", () => {
    render(
      React.createElement(EditorMobileSection, {
        isDark: false,
        canvasWidth: 100,
        canvasHeight: 120,
        layers: [],
        selectedLayerId: null,
        tool: "face",
        faceDetections: [{ x: 1, y: 1, width: 10, height: 10, label: "f" }],
        faceOverlayLayerId: null,
        faceStatus: "idle",
        faceBlurPreview: null,
        labels: {
          resize: "Resize",
          faceMlFailedShort: "Face failed",
          detectingFacesShort: "Detecting",
          faceDetectionTip: (count) => `Faces ${count}`,
          import: "Import",
          mood: "Mood",
          quick: "Quick",
          face: "Face",
          decor: "Decor",
        },
        onOpenCanvasSize: () => undefined,
        onImportImage: () => undefined,
        onSelectLayer: () => undefined,
        onMoveLayer: () => undefined,
        onMoveLayerEnd: () => undefined,
        onResizeLayer: () => undefined,
        onResizeLayerEnd: () => undefined,
        onRotateLayer: () => undefined,
        onRotateLayerEnd: () => undefined,
        onInteractionStart: () => undefined,
        onInteractionEnd: () => undefined,
      }),
    );

    expect(screen.getByText("Faces 1")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });
});
