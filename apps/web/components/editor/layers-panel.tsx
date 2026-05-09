"use client";

import type { Layer } from "@pien-studio/types";
import Image from "next/image";
import { useTranslations } from "../../hooks/use-translations";
import { panelClass, panelCounterClass, panelInsetClass, panelTitleClass } from "../../lib/theme";

type Props = {
  layers: Layer[];
  selectedLayerId: string | null;
  isDark: boolean;
  onSelectLayer: (layerId: string) => void;
  onMoveLayerOrder: (direction: "up" | "down") => void;
  onRemoveSelectedLayer: () => void;
};

export function LayersPanel({ layers, selectedLayerId, isDark, onSelectLayer, onMoveLayerOrder, onRemoveSelectedLayer }: Props) {
  const { t } = useTranslations();

  return (
    <div className={panelClass(isDark)}>
      <div className="flex items-center justify-between">
        <h2 className={`text-xs font-semibold uppercase tracking-wide ${panelTitleClass(isDark)}`}>{t("editor.layers")}</h2>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${panelCounterClass(isDark)}`}>
          {layers.length}
        </span>
      </div>
      <div className={`mt-3 max-h-[320px] space-y-1 overflow-auto rounded-md border p-1 ${panelInsetClass(isDark)}`}>
        {layers.slice().reverse().map((layer, idx) => {
          const isSelected = layer.id === selectedLayerId;
          const isImageLayer = layer.type === "image" || layer.type === "sticker";
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onSelectLayer(layer.id)}
              className={`group flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition ${
                isSelected
                  ? "bg-[var(--color-accent-strong)] text-white"
                  : isDark
                    ? "text-[#d7dae0] hover:bg-white/10"
                    : "text-[#1f2430] hover:bg-black/5"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-6 text-[10px] font-semibold ${isSelected ? "text-white/90" : isDark ? "text-[#9aa1ad]" : "text-[#6b7280]"}`}>{idx + 1}</span>
                <div className={`h-9 w-9 shrink-0 overflow-hidden rounded border ${isSelected ? "border-white/60 bg-white/10" : isDark ? "border-white/15 bg-[#1f2126]" : "border-black/10 bg-[#eef1f6]"}`}>
                  {isImageLayer && layer.sourceUri ? (
                    <Image src={layer.sourceUri} alt={layer.name ?? layer.type} width={36} height={36} unoptimized className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center text-[9px] font-semibold uppercase tracking-wide ${isSelected ? "text-white/90" : isDark ? "text-[#b7bdc8]" : "text-[#596274]"}`}>
                      {layer.type}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{layer.name ?? layer.type}</p>
                  <p className={`${isSelected ? "text-white/80" : isDark ? "text-[#9aa1ad]" : "text-[#7b8392]"}`}>{layer.type}</p>
                </div>
              </div>
              <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : isDark ? "bg-[#3d424c]" : "bg-[#d4d8e0]"}`} />
            </button>
          );
        })}
        {layers.length === 0 ? <div className={`px-2 py-6 text-center text-xs ${isDark ? "text-[#aeb3bc]" : "text-[#5f6672]"}`}>{t("editor.noLayersYet")}</div> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onMoveLayerOrder("up")} className={`flex-1 rounded border px-2 py-1 text-xs ${isDark ? "border-white/20 text-[#d7dae0] hover:bg-white/10" : "border-black/20 text-[#1f2430] hover:bg-black/5"}`}>{t("editor.up")}</button>
        <button type="button" onClick={() => onMoveLayerOrder("down")} className={`flex-1 rounded border px-2 py-1 text-xs ${isDark ? "border-white/20 text-[#d7dae0] hover:bg-white/10" : "border-black/20 text-[#1f2430] hover:bg-black/5"}`}>{t("editor.down")}</button>
        <button type="button" onClick={onRemoveSelectedLayer} className={`flex-1 rounded border px-2 py-1 text-xs ${isDark ? "border-red-400/30 bg-red-400/10 text-red-200 hover:bg-red-400/20" : "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/15"}`}>{t("editor.delete")}</button>
      </div>
    </div>
  );
}
