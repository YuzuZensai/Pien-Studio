"use client";

import React from "react";
import { useParams } from "next/navigation";
import { MousePointer2, Hand, ScanFace, Type, ImagePlus } from "lucide-react";
import { useEditorStore } from "../../../store/editor-store";
import { useUiStore } from "../../../store/ui-store";
import { CanvasSizeModal } from "../../../components/canvas-size-modal";
import { EditorCanvasStage } from "../../../components/editor/editor-canvas-stage";
import { EditorHeader } from "../../../components/editor/editor-header";
import { EditorMobileSection } from "../../../components/editor/editor-mobile-section";
import { EditorSidebar } from "../../../components/editor/editor-sidebar";
import { ToolRail } from "../../../components/editor/tool-rail";
import { exportProjectAsPng } from "../../../lib/export-png";
import { createEditorToolControllers } from "../../../lib/editor-tool-controller";
import { useFaceDetection } from "../../../hooks/use-face-detection";
import { useFaceBlurWorkflow } from "../../../hooks/use-face-blur-workflow";
import { useEditorAutosave } from "../../../hooks/use-editor-autosave";
import { useEditorBindings } from "../../../hooks/use-editor-bindings";
import { useEditorContextMenu } from "../../../hooks/use-editor-context-menu";
import { useEditorLabels } from "../../../hooks/use-editor-labels";
import { useEditorProjectLifecycle } from "../../../hooks/use-editor-project-lifecycle";
import { useEditorShortcuts } from "../../../hooks/use-editor-shortcuts";
import { useAssetCleanupJob } from "../../../hooks/use-asset-cleanup-job";
import { useTranslations } from "../../../hooks/use-translations";
import type { AspectRatio } from "@pien-studio/types";

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pointer: MousePointer2,
  hand: Hand,
  face: ScanFace,
  "add-text": Type,
  "import-image": ImagePlus,
};

export default function EditorPage() {
  useAssetCleanupJob();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { state, actions } = useEditorBindings();
  const {
    project,
    selectedLayerId,
    selectedLayer,
    canUndo,
    canRedo,
    history,
    isDirty,
    tool,
  } = state;
  const {
    loadProjectById,
    setProject,
    saveCurrentProject,
    selectLayer,
    setSelectedLayerPosition,
    setSelectedLayerPositionDraft,
    setSelectedLayerSize,
    setSelectedLayerSizeDraft,
    setSelectedLayerRotation,
    setSelectedLayerRotationDraft,
    startTransaction,
    commitTransaction,
    removeSelectedLayer,
    addLayerByType,
    moveSelectedLayerOrder,
    importImageFromFile,
    setImageLayerFaceBlur,
    setCanvasSize,
    setTool,
    undo,
    redo,
    exportProjectToJson,
    jumpToPast,
    jumpToFuture,
    copySelectedLayer,
    cutSelectedLayer,
    pasteLayer,
  } = actions;
  const { theme, hydrate } = useUiStore((s) => s);
  const { t } = useTranslations();
  const { headerLabels, contextMenuLabels, mobileLabels } = useEditorLabels(t);
  const { contextMenu, openContextMenu, closeContextMenu } = useEditorContextMenu();
  const [canvasModalOpen, setCanvasModalOpen] = React.useState(false);
  const [faceMlErrorModalOpen, setFaceMlErrorModalOpen] = React.useState(false);
  const previousFaceStatusRef = React.useRef<"idle" | "detecting" | "unsupported">("idle");
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedImageLayer = React.useMemo(() => {
    if (!selectedLayer || selectedLayer.type !== "image" || !selectedLayer.sourceUri) {
      return null;
    }
    return {
      id: selectedLayer.id,
      sourceUri: selectedLayer.sourceUri,
      width: selectedLayer.width,
      height: selectedLayer.height,
    };
  }, [selectedLayer?.id, selectedLayer?.type, selectedLayer?.sourceUri, selectedLayer?.width, selectedLayer?.height]);

  const isLayerStillSelected = React.useCallback((layerId: string) => {
    const state = useEditorStore.getState();
    return state.selectedLayerId === layerId;
  }, []);

  const { faceDetections, faceDetectionsLayerId, facePreviews, faceStatus } = useFaceDetection({
    tool,
    selectedLayerId,
    selectedImageLayer,
    activeLayerStillSelected: isLayerStillSelected,
  });

  const {
    blurMethod,
    setBlurMethod,
    blurAmount,
    setBlurAmount,
    censorColor,
    setCensorColor,
    selectedFaceIndices,
    faceBlurPreview,
    toggleFaceIndex,
    clearBlur,
    blurFaces,
  } = useFaceBlurWorkflow({
    selectedLayer,
    faceDetectionsLayerId,
    faceDetections,
    setImageLayerFaceBlur,
  });

  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEditorProjectLifecycle({
    projectId,
    hydrate,
    loadProjectById,
    setProject,
    t,
  });

  const isDark = theme === "dark";
  const { width: cw, height: ch } = project.canvas;

  const handleSave = React.useCallback(async () => {
    await saveCurrentProject();
  }, [saveCurrentProject]);

  const handleExportPng = React.useCallback(async () => {
    await exportProjectAsPng(project, { isDark });
  }, [isDark, project, exportProjectAsPng]);

  const handleExportProjectFile = React.useCallback(() => {
    const json = exportProjectToJson();
    const blob = new Blob([json], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${project.title || "project"}.pien.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }, [exportProjectToJson, project.title]);

  useEditorShortcuts({
    onSave: handleSave,
    onCopy: copySelectedLayer,
    onCut: cutSelectedLayer,
    onPaste: pasteLayer,
    onDelete: removeSelectedLayer,
  });

  useEditorAutosave({
    isDirty,
    projectUpdatedAt: project.updatedAt,
    saveCurrentProject,
  });

  React.useEffect(() => {
    if (faceStatus === "unsupported" && previousFaceStatusRef.current !== "unsupported") {
      setFaceMlErrorModalOpen(true);
    }
    previousFaceStatusRef.current = faceStatus;
  }, [faceStatus]);

  async function handleImageImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await importImageFromFile(file);
    event.target.value = "";
  }

  function handleCanvasApply(width: number, height: number, aspect: AspectRatio) {
    setCanvasSize(width, height);
  }

  const toolControllers = React.useMemo(
    () =>
      createEditorToolControllers({
        onAddTextLayer: () => addLayerByType("text"),
        onImportImage: () => imageInputRef.current?.click(),
        labels: {
          pointer: t("editor.toolPointer"),
          pan: t("editor.toolPan"),
          face: t("editor.toolFace"),
          text: t("editor.toolText"),
          image: t("editor.toolImage"),
        },
      }),
    [addLayerByType, t],
  );

  const canvasBindings = {
    onMoveLayer: (_id: string, x: number, y: number) => setSelectedLayerPositionDraft(x, y),
    onMoveLayerEnd: (_id: string, x: number, y: number) => setSelectedLayerPosition(x, y),
    onResizeLayer: (_id: string, width: number, height: number) => setSelectedLayerSizeDraft(width, height),
    onResizeLayerEnd: (_id: string, width: number, height: number) => setSelectedLayerSize(width, height),
    onRotateLayer: (_id: string, rotation: number) => setSelectedLayerRotationDraft(rotation),
    onRotateLayerEnd: (_id: string, rotation: number) => setSelectedLayerRotation(rotation),
    onInteractionStart: startTransaction,
    onInteractionEnd: commitTransaction,
  };

  return (
    <main
      className={`h-screen p-0 overflow-hidden ${isDark ? "bg-[#202124] text-[#e8eaed]" : "bg-[#f2f4f8] text-[#1f2430]"}`}
      onClick={closeContextMenu}
    >
      <div className="h-full w-full overflow-hidden">
        <EditorHeader
          isDark={isDark}
          projectTitle={project.title}
          canvasWidth={cw}
          canvasHeight={ch}
          canUndo={canUndo}
          canRedo={canRedo}
          isDirty={isDirty}
          labels={headerLabels}
          onSave={handleSave}
          onExportPng={handleExportPng}
          onExportProjectFile={handleExportProjectFile}
          onImportImage={() => imageInputRef.current?.click()}
          onOpenCanvasSize={() => setCanvasModalOpen(true)}
          onUndo={undo}
          onRedo={redo}
          onCopy={copySelectedLayer}
          onCut={cutSelectedLayer}
          onPaste={pasteLayer}
          onSetHandTool={() => setTool("hand")}
          onSetPointerTool={() => setTool("pointer")}
        />

        <section className="hidden h-[calc(100vh-56px)] grid-cols-[68px_1fr_300px] lg:grid">
          <ToolRail
            controllers={toolControllers}
            selectedTool={tool}
            isDark={isDark}
            icons={TOOL_ICONS}
            onSetTool={setTool}
          />

          <EditorCanvasStage
            isDark={isDark}
            layers={project.layers}
            canvasWidth={cw}
            canvasHeight={ch}
            selectedLayerId={selectedLayerId}
            tool={tool}
            faceDetections={faceDetections}
            faceOverlayLayerId={faceDetectionsLayerId}
            faceBlurPreview={faceBlurPreview}
            contextMenu={contextMenu}
            labels={contextMenuLabels}
            onSelectLayer={selectLayer}
            onMoveLayer={canvasBindings.onMoveLayer}
            onMoveLayerEnd={canvasBindings.onMoveLayerEnd}
            onResizeLayer={canvasBindings.onResizeLayer}
            onResizeLayerEnd={canvasBindings.onResizeLayerEnd}
            onRotateLayer={canvasBindings.onRotateLayer}
            onRotateLayerEnd={canvasBindings.onRotateLayerEnd}
            onInteractionStart={canvasBindings.onInteractionStart}
            onInteractionEnd={canvasBindings.onInteractionEnd}
            onContextMenu={openContextMenu}
            onCloseContextMenu={closeContextMenu}
            onCopy={copySelectedLayer}
            onCut={cutSelectedLayer}
            onPaste={pasteLayer}
          />

          <EditorSidebar
            isDark={isDark}
            tool={tool}
            layers={project.layers}
            selectedLayerId={selectedLayerId}
            selectedLayer={selectedLayer}
            history={history}
            canUndo={canUndo}
            canRedo={canRedo}
            faceDetections={faceDetections}
            facePreviews={facePreviews}
            faceStatus={faceStatus}
            blurMethod={blurMethod}
            blurAmount={blurAmount}
            censorColor={censorColor}
            selectedFaceIndices={selectedFaceIndices}
            onSelectLayer={selectLayer}
            onMoveLayerOrder={moveSelectedLayerOrder}
            onRemoveSelectedLayer={removeSelectedLayer}
            onUndo={undo}
            onRedo={redo}
            onJumpToPast={jumpToPast}
            onJumpToFuture={jumpToFuture}
            onSetBlurMethod={setBlurMethod}
            onSetBlurAmount={setBlurAmount}
            onSetCensorColor={setCensorColor}
            onToggleFaceIndex={toggleFaceIndex}
            onBlur={(indices) => void blurFaces(indices)}
            onClearBlur={clearBlur}
          />
        </section>

        <EditorMobileSection
          isDark={isDark}
          canvasWidth={cw}
          canvasHeight={ch}
          layers={project.layers}
          selectedLayerId={selectedLayerId}
          tool={tool}
          faceDetections={faceDetections}
          faceOverlayLayerId={faceDetectionsLayerId}
          faceStatus={faceStatus}
          faceBlurPreview={faceBlurPreview}
          labels={mobileLabels}
          onOpenCanvasSize={() => setCanvasModalOpen(true)}
          onImportImage={() => imageInputRef.current?.click()}
          onSelectLayer={selectLayer}
          onMoveLayer={canvasBindings.onMoveLayer}
          onMoveLayerEnd={canvasBindings.onMoveLayerEnd}
          onResizeLayer={canvasBindings.onResizeLayer}
          onResizeLayerEnd={canvasBindings.onResizeLayerEnd}
          onRotateLayer={canvasBindings.onRotateLayer}
          onRotateLayerEnd={canvasBindings.onRotateLayerEnd}
          onInteractionStart={canvasBindings.onInteractionStart}
          onInteractionEnd={canvasBindings.onInteractionEnd}
        />
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageImport} />

        <CanvasSizeModal
          isOpen={canvasModalOpen}
          onClose={() => setCanvasModalOpen(false)}
          currentWidth={cw}
          currentHeight={ch}
          currentAspect={project.aspectRatio}
          onApply={handleCanvasApply}
          isDark={isDark}
        />

        {faceMlErrorModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFaceMlErrorModalOpen(false)}>
            <div
              className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
                isDark ? "border-white/15 bg-[#2b2d31]" : "border-black/15 bg-white"
              }`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className={`text-base font-semibold ${isDark ? "text-[#f5f7fa]" : "text-[#1f2430]"}`}>{t("editor.faceTool")}</h2>
                <button
                  type="button"
                  onClick={() => setFaceMlErrorModalOpen(false)}
                  className={`rounded border px-2 py-0.5 text-xs ${isDark ? "border-white/20 text-[#d7dae0]" : "border-black/20 text-[#1f2430]"}`}
                >
                  ✕
                </button>
              </div>
              <p className={`text-sm ${isDark ? "text-[#d7dae0]" : "text-[#374151]"}`}>{t("editor.faceMlFailed")}</p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setFaceMlErrorModalOpen(false)}
                  className="rounded border border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {t("editor.dismiss")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
