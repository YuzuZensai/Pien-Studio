import React from "react";
import { hoverSubtleClass } from "../../lib/theme";

type CanvasContextMenuProps = {
  isDark: boolean;
  x: number;
  y: number;
  labels: {
    copy: string;
    cut: string;
    paste: string;
  };
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
};

export function CanvasContextMenu({ isDark, x, y, labels, onCopy, onCut, onPaste }: CanvasContextMenuProps) {
  return (
    <div
      className={`absolute z-40 min-w-[160px] rounded border p-1 text-[12px] shadow-2xl ${
        isDark ? "border-white/10 bg-[#2a2c31] text-[#e2e5ea]" : "border-black/10 bg-white text-[#1f2430]"
      }`}
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" onClick={onCopy} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>
        {labels.copy}
      </button>
      <button type="button" onClick={onCut} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>
        {labels.cut}
      </button>
      <button type="button" onClick={onPaste} className={`w-full rounded px-2 py-1 text-left ${hoverSubtleClass(isDark)}`}>
        {labels.paste}
      </button>
    </div>
  );
}
