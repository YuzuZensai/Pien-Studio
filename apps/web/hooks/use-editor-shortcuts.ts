import React from "react";

type UseEditorShortcutsOptions = {
  onSave: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
};

export function useEditorShortcuts(options: UseEditorShortcutsOptions) {
  const { onSave, onCopy, onCut, onPaste, onDelete } = options;

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          onSave();
          return;
        }
        if (e.key.toLowerCase() === "c") {
          e.preventDefault();
          onCopy();
          return;
        }
        if (e.key.toLowerCase() === "x") {
          e.preventDefault();
          onCut();
          return;
        }
        if (e.key.toLowerCase() === "v") {
          e.preventDefault();
          onPaste();
          return;
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (!(e.target instanceof HTMLElement) || /^(input|textarea|select)$/i.test(e.target.tagName)) return;
        e.preventDefault();
        onDelete();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCopy, onCut, onDelete, onPaste, onSave]);
}
