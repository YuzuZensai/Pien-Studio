import React from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "../store/editor-store";

export function useEditorBindings() {
  const state = useEditorStore(
    useShallow((s) => ({
      project: s.project,
      selectedLayerId: s.selectedLayerId,
      canUndo: s.canUndo,
      canRedo: s.canRedo,
      history: s.history,
      isDirty: s.isDirty,
      tool: s.tool,
    })),
  );

  const bindings = useEditorStore(
    useShallow((s) => ({
      loadProjectById: s.loadProjectById,
      setProject: s.setProject,
      saveCurrentProject: s.saveCurrentProject,
      selectLayer: s.selectLayer,
      setSelectedLayerPosition: s.setSelectedLayerPosition,
      setSelectedLayerPositionDraft: s.setSelectedLayerPositionDraft,
      setSelectedLayerSize: s.setSelectedLayerSize,
      setSelectedLayerSizeDraft: s.setSelectedLayerSizeDraft,
      setSelectedLayerRotation: s.setSelectedLayerRotation,
      setSelectedLayerRotationDraft: s.setSelectedLayerRotationDraft,
      startTransaction: s.startTransaction,
      commitTransaction: s.commitTransaction,
      removeSelectedLayer: s.removeSelectedLayer,
      addLayerByType: s.addLayerByType,
      moveSelectedLayerOrder: s.moveSelectedLayerOrder,
      importImageFromFile: s.importImageFromFile,
      setImageLayerFaceBlur: s.setImageLayerFaceBlur,
      setCanvasSize: s.setCanvasSize,
      setTool: s.setTool,
      undo: s.undo,
      redo: s.redo,
      exportProjectToJson: s.exportProjectToJson,
      jumpToPast: s.jumpToPast,
      jumpToFuture: s.jumpToFuture,
      copySelectedLayer: s.copySelectedLayer,
      cutSelectedLayer: s.cutSelectedLayer,
      pasteLayer: s.pasteLayer,
    })),
  );

  const selectedLayer = React.useMemo(
    () => state.project.layers.find((layer) => layer.id === state.selectedLayerId) ?? null,
    [state.project.layers, state.selectedLayerId],
  );

  return { state: { ...state, selectedLayer }, actions: bindings };
}
