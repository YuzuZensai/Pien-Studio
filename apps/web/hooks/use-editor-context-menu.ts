import React from "react";
import { CONTEXT_MENU_SIZE } from "../lib/editor-constants";

type ContextMenuPosition = { x: number; y: number };

export function useEditorContextMenu() {
  const [contextMenu, setContextMenu] = React.useState<ContextMenuPosition | null>(null);

  const openContextMenu = React.useCallback((x: number, y: number) => {
    const rect = document.documentElement.getBoundingClientRect();
    const { width: menuWidth, height: menuHeight, viewportPadding: pad } = CONTEXT_MENU_SIZE;
    const maxX = rect.width - menuWidth - pad;
    const maxY = rect.height - menuHeight - pad;
    setContextMenu({ x: Math.max(pad, Math.min(x, maxX)), y: Math.max(pad, Math.min(y, maxY)) });
  }, []);

  const closeContextMenu = React.useCallback(() => {
    setContextMenu(null);
  }, []);

  return { contextMenu, openContextMenu, closeContextMenu };
}
