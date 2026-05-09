"use client";

import { Redo2, Undo2 } from "lucide-react";
import type { Project } from "@pien-studio/types";
import { useTranslations } from "../../hooks/use-translations";
import { panelClass, panelTitleClass } from "../../lib/theme";

type Props = {
  history: { past: Project[]; future: Project[] };
  isDark: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onJumpToPast: (idx: number) => void;
  onJumpToFuture: (idx: number) => void;
};

export function HistoryPanel({ history, isDark, canUndo, canRedo, onUndo, onRedo, onJumpToPast, onJumpToFuture }: Props) {
  const { t } = useTranslations();

  return (
    <div className={panelClass(isDark)}>
      <div className="flex items-center justify-between">
        <h2 className={`text-xs font-semibold uppercase tracking-wide ${panelTitleClass(isDark)}`}>{t("editor.history")}</h2>
        <div className="flex gap-1">
          <button type="button" onClick={onUndo} disabled={!canUndo} title={t("editor.undo")} className={`rounded p-1 ${!canUndo ? "opacity-30" : isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}>
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title={t("editor.redo")} className={`rounded p-1 ${!canRedo ? "opacity-30" : isDark ? "hover:bg-white/10" : "hover:bg-black/5"}`}>
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className={`mt-2 flex max-h-[240px] flex-col gap-1 overflow-y-auto ${isDark ? "[&::-webkit-scrollbar-thumb]:bg-white/20" : "[&::-webkit-scrollbar-thumb]:bg-black/20"}`}>
        {[...history.past].reverse().map((_, i) => {
          const idx = history.past.length - i;
          return (
            <button
              key={`past-${idx}`}
              type="button"
              onClick={() => onJumpToPast(idx)}
              className={`w-full rounded px-2 py-1 text-left text-[10px] ${isDark ? "text-[#9aa1ad] hover:bg-white/10" : "text-[#6b7280] hover:bg-black/5"}`}
            >
              {idx > history.past.length - 2 ? t("editor.beforeLastAction") : `${t("editor.step")} ${idx}`}
            </button>
          );
        })}
        <button type="button" className={`w-full rounded px-2 py-1 text-left text-[10px] font-semibold ${isDark ? "bg-white/10 text-[#e2e5ea]" : "bg-black/5 text-[#1f2430]"}`} disabled>
          {t("editor.now")}
        </button>
        {[...history.future].map((_, i) => (
          <button
            key={`future-${i}`}
            type="button"
            onClick={() => onJumpToFuture(i)}
            className={`w-full rounded px-2 py-1 text-left text-[10px] ${isDark ? "text-[#9aa1ad] hover:bg-white/10" : "text-[#6b7280] hover:bg-black/5"}`}
          >
            {t("editor.undoneStep")} {i + 1}
          </button>
        ))}
        {history.past.length === 0 && history.future.length === 0 ? <p className={`py-2 text-center text-[10px] ${isDark ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>{t("editor.noHistoryYet")}</p> : null}
      </div>
    </div>
  );
}
