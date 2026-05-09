import type { EditorToolId } from "../store/editor-store";

export type ToolModeController = {
  kind: "mode";
  id: EditorToolId;
  label: string;
};

export type ToolActionController = {
  kind: "action";
  id: string;
  label: string;
  run: () => void;
};

export type EditorToolController = ToolModeController | ToolActionController;

type CreateEditorToolControllersOptions = {
  onAddTextLayer: () => void;
  onImportImage: () => void;
  labels: {
    pointer: string;
    pan: string;
    face: string;
    text: string;
    image: string;
  };
};

export function createEditorToolControllers(options: CreateEditorToolControllersOptions): EditorToolController[] {
  return [
    { kind: "mode", id: "pointer", label: options.labels.pointer },
    { kind: "mode", id: "hand", label: options.labels.pan },
    { kind: "mode", id: "face", label: options.labels.face },
    { kind: "action", id: "add-text", label: options.labels.text, run: options.onAddTextLayer },
    { kind: "action", id: "import-image", label: options.labels.image, run: options.onImportImage },
  ];
}
