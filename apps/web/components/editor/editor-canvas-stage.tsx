import React from "react";
import type { FaceBlurMethod, Layer } from "@pien-studio/types";
import type { FaceDetectionOverlay } from "../../hooks/use-face-detection";
import { CanvasRenderer } from "../canvas-renderer";
import { CanvasContextMenu } from "./canvas-context-menu";

type EditorCanvasStageProps = {
  isDark: boolean;
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  selectedLayerId: string | null;
  tool: "pointer" | "hand" | "face";
  faceDetections: FaceDetectionOverlay[];
  faceOverlayLayerId: string | null;
  faceBlurPreview: {
    layerId: string;
    method: FaceBlurMethod;
    amount: number;
    regions: { x: number; y: number; width: number; height: number }[];
  } | null;
  contextMenu: { x: number; y: number } | null;
  labels: { copy: string; cut: string; paste: string };
  onSelectLayer: (id: string | null) => void;
  onMoveLayer: (id: string, x: number, y: number) => void;
  onMoveLayerEnd: (id: string, x: number, y: number) => void;
  onResizeLayer: (id: string, width: number, height: number) => void;
  onResizeLayerEnd: (id: string, width: number, height: number) => void;
  onRotateLayer: (id: string, rotation: number) => void;
  onRotateLayerEnd: (id: string, rotation: number) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  onContextMenu: (x: number, y: number) => void;
  onCloseContextMenu: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
};

export function EditorCanvasStage(props: EditorCanvasStageProps) {
  const {
    isDark,
    layers,
    canvasWidth,
    canvasHeight,
    selectedLayerId,
    tool,
    faceDetections,
    faceOverlayLayerId,
    faceBlurPreview,
    contextMenu,
    labels,
    onSelectLayer,
    onMoveLayer,
    onMoveLayerEnd,
    onResizeLayer,
    onResizeLayerEnd,
    onRotateLayer,
    onRotateLayerEnd,
    onInteractionStart,
    onInteractionEnd,
    onContextMenu,
    onCloseContextMenu,
    onCopy,
    onCut,
    onPaste,
  } = props;

  return (
    <div className={`h-full overflow-hidden p-4 ${isDark ? "bg-[#1e1f23]" : "bg-[#f2f4f8]"}`}>
      <div
        className="flex h-full items-center justify-center"
        style={{
          backgroundImage: isDark
            ? "linear-gradient(#2b2d31 1px, transparent 1px), linear-gradient(90deg, #2b2d31 1px, transparent 1px)"
            : "linear-gradient(#e8eaed 1px, transparent 1px), linear-gradient(90deg, #e8eaed 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden shadow-2xl ring-1 ring-black/10">
          <CanvasRenderer
            layers={layers}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            selectedLayerId={selectedLayerId}
            onSelectLayer={onSelectLayer}
            onMoveLayer={onMoveLayer}
            onMoveLayerEnd={onMoveLayerEnd}
            onResizeLayer={onResizeLayer}
            onResizeLayerEnd={onResizeLayerEnd}
            onRotateLayer={onRotateLayer}
            onRotateLayerEnd={onRotateLayerEnd}
            onInteractionStart={onInteractionStart}
            onInteractionEnd={onInteractionEnd}
            onContextMenu={onContextMenu}
            isDark={isDark}
            tool={tool}
            faceDetections={faceDetections}
            faceOverlayLayerId={faceOverlayLayerId}
            faceBlurPreview={faceBlurPreview}
          />
          {contextMenu ? (
            <CanvasContextMenu
              isDark={isDark}
              x={contextMenu.x}
              y={contextMenu.y}
              labels={labels}
              onCopy={() => {
                onCopy();
                onCloseContextMenu();
              }}
              onCut={() => {
                onCut();
                onCloseContextMenu();
              }}
              onPaste={() => {
                onPaste();
                onCloseContextMenu();
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
