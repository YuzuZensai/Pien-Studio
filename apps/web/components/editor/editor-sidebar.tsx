import React from "react";
import type { FaceBlurMethod, Layer, Project } from "@pien-studio/types";
import { FacePanel } from "./face-panel";
import { HistoryPanel } from "./history-panel";
import { LayersPanel } from "./layers-panel";
import type { FaceDetectionOverlay, FacePreview } from "../../hooks/use-face-detection";

type EditorSidebarProps = {
  isDark: boolean;
  tool: "pointer" | "hand" | "face";
  layers: Layer[];
  selectedLayerId: string | null;
  selectedLayer: Layer | null;
  history: { past: Project[]; future: Project[] };
  canUndo: boolean;
  canRedo: boolean;
  faceDetections: FaceDetectionOverlay[];
  facePreviews: FacePreview[];
  faceStatus: "idle" | "detecting" | "unsupported";
  blurMethod: FaceBlurMethod;
  blurAmount: number;
  censorColor: string;
  selectedFaceIndices: number[];
  onSelectLayer: (layerId: string | null) => void;
  onMoveLayerOrder: (direction: "up" | "down") => void;
  onRemoveSelectedLayer: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToPast: (idx: number) => void;
  onJumpToFuture: (idx: number) => void;
  onSetBlurMethod: (method: FaceBlurMethod) => void;
  onSetBlurAmount: (amount: number) => void;
  onSetCensorColor: (color: string) => void;
  onToggleFaceIndex: (index: number) => void;
  onBlur: (indices: number[]) => void;
  onClearBlur: () => void;
};

export function EditorSidebar({
  isDark,
  tool,
  layers,
  selectedLayerId,
  selectedLayer,
  history,
  canUndo,
  canRedo,
  faceDetections,
  facePreviews,
  faceStatus,
  blurMethod,
  blurAmount,
  censorColor,
  selectedFaceIndices,
  onSelectLayer,
  onMoveLayerOrder,
  onRemoveSelectedLayer,
  onUndo,
  onRedo,
  onJumpToPast,
  onJumpToFuture,
  onSetBlurMethod,
  onSetBlurAmount,
  onSetCensorColor,
  onToggleFaceIndex,
  onBlur,
  onClearBlur,
}: EditorSidebarProps) {
  return (
    <aside className={`border-l p-3 ${isDark ? "border-white/10 bg-[#24262a]" : "border-black/10 bg-[#eceff3]"}`}>
      <div className="space-y-3">
        <LayersPanel
          layers={layers}
          selectedLayerId={selectedLayerId}
          isDark={isDark}
          onSelectLayer={(layerId) => onSelectLayer(layerId)}
          onMoveLayerOrder={onMoveLayerOrder}
          onRemoveSelectedLayer={onRemoveSelectedLayer}
        />

        {tool === "face" ? (
          <FacePanel
            isDark={isDark}
            selectedLayer={selectedLayer}
            faceDetections={faceDetections}
            facePreviews={facePreviews}
            faceStatus={faceStatus}
            blurMethod={blurMethod}
            blurAmount={blurAmount}
            censorColor={censorColor}
            selectedFaceIndices={selectedFaceIndices}
            hasActiveBlur={Boolean(selectedLayer && selectedLayer.type === "image" && selectedLayer.faceBlur)}
            onSetBlurMethod={onSetBlurMethod}
            onSetBlurAmount={onSetBlurAmount}
            onSetCensorColor={onSetCensorColor}
            onToggleFaceIndex={onToggleFaceIndex}
            onBlur={onBlur}
            onClearBlur={onClearBlur}
          />
        ) : null}

        <HistoryPanel
          history={history}
          isDark={isDark}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          onJumpToPast={onJumpToPast}
          onJumpToFuture={onJumpToFuture}
        />
      </div>
    </aside>
  );
}
