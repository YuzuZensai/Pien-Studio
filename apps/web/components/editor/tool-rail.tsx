import React from "react";
import { MousePointer2 } from "lucide-react";
import type { EditorToolController } from "../../lib/editor-tool-controller";
import type { EditorToolId } from "../../store/editor-store";

type Props = {
  controllers: EditorToolController[];
  selectedTool: EditorToolId;
  isDark: boolean;
  icons: Record<string, React.ComponentType<{ className?: string }>>;
  onSetTool: (tool: EditorToolId) => void;
};

export function ToolRail({ controllers, selectedTool, isDark, icons, onSetTool }: Props) {
  return (
    <aside className={`border-r p-2 ${isDark ? "border-white/10 bg-[#24262a]" : "border-black/10 bg-[#eceff3]"}`}>
      <div className="flex flex-col gap-2">
        {controllers.map((controller) => {
          const Icon = icons[controller.id] ?? MousePointer2;
          const isSelected = controller.kind === "mode" && controller.id === selectedTool;
          return (
            <button
              key={controller.id}
              type="button"
              title={controller.label}
              onClick={() => (controller.kind === "mode" ? onSetTool(controller.id) : controller.run())}
              className={`rounded border p-2 text-[11px] font-medium ${
                isSelected
                  ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white"
                  : isDark
                    ? "border-white/10 bg-[#2d3036] text-[#d7dae0] hover:bg-[#353942]"
                    : "border-black/10 bg-white text-[#1f2430] hover:bg-[#f4f6f9]"
              }`}
            >
              <Icon className="mx-auto h-4 w-4" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
