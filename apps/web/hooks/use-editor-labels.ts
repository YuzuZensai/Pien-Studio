import React from "react";

type Translator = (key: string, params?: Record<string, string | number>) => string;

export function useEditorLabels(t: Translator) {
  const headerLabels = React.useMemo(
    () => ({
      file: t("editor.file"),
      edit: t("editor.edit"),
      view: t("editor.view"),
      settings: t("editor.settings"),
      save: t("editor.save"),
      exportPng: t("editor.exportPng"),
      exportProjectFile: t("editor.exportProjectFile"),
      importImage: t("editor.importImage"),
      canvasSize: t("editor.canvasSize"),
      undo: t("editor.undo"),
      redo: t("editor.redo"),
      copy: t("editor.copy"),
      cut: t("editor.cut"),
      paste: t("editor.paste"),
      preferences: t("editor.preferences"),
      panTool: t("editor.panTool"),
      pointerTool: t("editor.pointerTool"),
      unsavedChanges: t("editor.unsavedChanges"),
      saved: t("editor.saved"),
    }),
    [t],
  );

  const contextMenuLabels = React.useMemo(
    () => ({ copy: t("editor.copy"), cut: t("editor.cut"), paste: t("editor.paste") }),
    [t],
  );

  const mobileLabels = React.useMemo(
    () => ({
      resize: t("editor.resize"),
      faceMlFailedShort: t("editor.faceMlFailedShort"),
      detectingFacesShort: t("editor.detectingFacesShort"),
      faceDetectionTip: (count: number) => t("editor.faceDetectionTip", { count }),
      import: t("editor.import"),
      mood: t("editor.mood"),
      quick: t("editor.quick"),
      face: t("editor.face"),
      decor: t("editor.decor"),
    }),
    [t],
  );

  return { headerLabels, contextMenuLabels, mobileLabels };
}
