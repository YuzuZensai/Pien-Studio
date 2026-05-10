import React from "react";
import { CanvasRenderer } from "../canvas-renderer";
import type { FaceBlurMethod, Layer } from "@pien-studio/types";
import type { FaceDetectionOverlay } from "../../hooks/use-face-detection";

type EditorMobileSectionProps = {
  isDark: boolean;
  canvasWidth: number;
  canvasHeight: number;
  layers: Layer[];
  selectedLayerId: string | null;
  tool: "pointer" | "hand" | "face";
  faceDetections: FaceDetectionOverlay[];
  faceOverlayLayerId: string | null;
  faceStatus: "idle" | "detecting" | "unsupported";
  faceBlurPreview: {
    layerId: string;
    method: FaceBlurMethod;
    amount: number;
    regions: { x: number; y: number; width: number; height: number }[];
  } | null;
  labels: {
    resize: string;
    faceMlFailedShort: string;
    detectingFacesShort: string;
    faceDetectionTip: (count: number) => string;
    import: string;
    mood: string;
    quick: string;
    face: string;
    decor: string;
  };
  onOpenCanvasSize: () => void;
  onImportImage: () => void;
  onSelectLayer: (id: string | null) => void;
  onMoveLayer: (id: string, x: number, y: number) => void;
  onMoveLayerEnd: (id: string, x: number, y: number) => void;
  onResizeLayer: (id: string, width: number, height: number) => void;
  onResizeLayerEnd: (id: string, width: number, height: number) => void;
  onRotateLayer: (id: string, rotation: number) => void;
  onRotateLayerEnd: (id: string, rotation: number) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
};

export function EditorMobileSection(props: EditorMobileSectionProps) {
  const {
    isDark,
    canvasWidth,
    canvasHeight,
    layers,
    selectedLayerId,
    tool,
    faceDetections,
    faceOverlayLayerId,
    faceStatus,
    faceBlurPreview,
    labels,
    onOpenCanvasSize,
    onImportImage,
    onSelectLayer,
    onMoveLayer,
    onMoveLayerEnd,
    onResizeLayer,
    onResizeLayerEnd,
    onRotateLayer,
    onRotateLayerEnd,
    onInteractionStart,
    onInteractionEnd,
  } = props;

  return (
    <section className="lg:hidden">
      <div className={`rounded-2xl border p-3 ${isDark ? "border-white/10 bg-[#2a2c31]" : "border-black/10 bg-white"}`}>
        <div className="mb-2 flex items-center justify-between">
          <p className={`text-sm font-semibold ${isDark ? "text-[#dfe3ea]" : "text-[#1f2430]"}`}>
            {canvasWidth} x {canvasHeight}px
          </p>
          <button
            onClick={onOpenCanvasSize}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              isDark ? "border-white/20 text-[#d7dae0]" : "border-black/20 text-[#1f2430]"
            }`}
          >
            {labels.resize}
          </button>
        </div>
        <div
          className={`relative overflow-hidden rounded-2xl border ${isDark ? "border-white/10 bg-[#17181b]" : "border-black/10 bg-[#f7f8fa]"}`}
          style={{ height: "55vw", maxHeight: "70vh" }}
        >
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
            isDark={isDark}
            tool={tool}
            faceDetections={faceDetections}
            faceOverlayLayerId={faceOverlayLayerId}
            faceBlurPreview={faceBlurPreview}
          />
        </div>
        {tool === "face" && (
          <p className={`mt-2 text-[11px] ${isDark ? "text-[#9aa1ad]" : "text-[#6b7280]"}`}>
            {faceStatus === "unsupported"
              ? labels.faceMlFailedShort
              : faceStatus === "detecting"
                ? labels.detectingFacesShort
                : labels.faceDetectionTip(faceDetections.length)}
          </p>
        )}
      </div>

      <div className={`mt-3 rounded-2xl border p-3 ${isDark ? "border-white/10 bg-[#2a2c31]" : "border-black/10 bg-white"}`}>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={onImportImage}
            className={`rounded-xl border px-2 py-3 text-[11px] font-semibold ${
              isDark ? "border-white/20 bg-[#25272b] text-[#dfe3ea]" : "border-black/20 bg-[#f5f6f8] text-[#1f2430]"
            }`}
          >
            {labels.import}
          </button>
          {[labels.mood, labels.quick, labels.face, labels.decor].map((toolLabel) => (
            <button
              key={toolLabel}
              className={`rounded-xl border px-2 py-3 text-[11px] font-semibold ${
                isDark ? "border-white/20 bg-[#25272b] text-[#dfe3ea]" : "border-black/20 bg-[#f5f6f8] text-[#1f2430]"
              }`}
            >
              {toolLabel}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
