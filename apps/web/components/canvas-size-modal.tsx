"use client";

import React from "react";
import type { AspectRatio } from "@pien-studio/types";
import { useTranslations } from "../hooks/use-translations";

interface CanvasSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  currentAspect: AspectRatio;
  onApply: (width: number, height: number, aspect: AspectRatio) => void;
  isDark: boolean;
}

const PRESETS = [
  { labelKey: "editor.presetSquare", sublabel: "1080 × 1080", aspect: "1:1" as AspectRatio, width: 1080, height: 1080 },
  { labelKey: "editor.presetPortrait45", sublabel: "1080 × 1350", aspect: "4:5" as AspectRatio, width: 1080, height: 1350 },
  { labelKey: "editor.presetStory916", sublabel: "1080 × 1920", aspect: "9:16" as AspectRatio, width: 1080, height: 1920 },
  { labelKey: "editor.presetWidescreen", sublabel: "1920 × 1080", aspect: "16:9" as AspectRatio, width: 1920, height: 1080 },
  { labelKey: "editor.presetPhoto43", sublabel: "1440 × 1080", aspect: "4:3" as AspectRatio, width: 1440, height: 1080 },
  { labelKey: "editor.presetClassic32", sublabel: "1620 × 1080", aspect: "3:2" as AspectRatio, width: 1620, height: 1080 },
];

export function CanvasSizeModal({
  isOpen,
  onClose,
  currentWidth,
  currentHeight,
  currentAspect,
  onApply,
  isDark,
}: CanvasSizeModalProps) {
  const { t } = useTranslations();
  const [mode, setMode] = React.useState<"preset" | "custom">(
    PRESETS.some((p) => p.aspect === currentAspect) ? "preset" : "custom",
  );
  const [customWidth, setCustomWidth] = React.useState(currentWidth.toString());
  const [customHeight, setCustomHeight] = React.useState(currentHeight.toString());
  const [selectedPreset, setSelectedPreset] = React.useState<AspectRatio>(currentAspect);

  if (!isOpen) return null;

  function handleApply() {
    if (mode === "preset") {
      const preset = PRESETS.find((p) => p.aspect === selectedPreset)!;
      onApply(preset.width, preset.height, preset.aspect);
    } else {
      const w = parseInt(customWidth, 10);
      const h = parseInt(customHeight, 10);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        onApply(w, h, "free");
      }
    }
    onClose();
  }

  const overlay = "fixed inset-0 z-50 flex items-center justify-center bg-black/40";
  const panel = `w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
    isDark ? "border-white/15 bg-[#2b2d31]" : "border-black/15 bg-white"
  }`;

  return (
    <div className={overlay} onClick={onClose}>
      <div className={panel} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-base font-semibold ${isDark ? "text-[#f5f7fa]" : "text-[#1f2430]"}`}>
            {t("editor.canvasSizeTitle")}
          </h2>
          <button
            onClick={onClose}
            className={`rounded border px-2 py-0.5 text-xs ${isDark ? "border-white/20 text-[#d7dae0]" : "border-black/20 text-[#1f2430]"}`}
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {(["preset", "custom"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded border py-1.5 text-xs font-semibold capitalize ${
                mode === m
                  ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white"
                  : isDark
                    ? "border-white/20 text-[#d7dae0]"
                    : "border-black/20 text-[#1f2430]"
              }`}
            >
              {m === "preset" ? t("editor.modePreset") : t("editor.modeCustom")}
            </button>
          ))}
        </div>

        {mode === "preset" ? (
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.aspect}
                onClick={() => setSelectedPreset(p.aspect)}
                className={`rounded border p-3 text-left ${
                  selectedPreset === p.aspect
                    ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white"
                    : isDark
                      ? "border-white/10 bg-[#343841] text-[#d7dae0]"
                      : "border-black/10 bg-[#f6f8fb] text-[#1f2430]"
                }`}
              >
                <div className="text-xs font-semibold">{t(p.labelKey)}</div>
                <div className={`text-[10px] ${selectedPreset === p.aspect ? "text-white/70" : isDark ? "text-[#aeb3bc]" : "text-[#6c7382]"}`}>
                  {p.sublabel}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className={`w-16 text-xs ${isDark ? "text-[#aeb3bc]" : "text-[#5f6672]"}`}>{t("editor.widthShort")}</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                min={1}
                className={`flex-1 rounded border px-2 py-1.5 text-sm ${
                  isDark ? "border-white/20 bg-[#25272b] text-[#e8eaed]" : "border-black/20 bg-[#f6f8fb] text-[#1f2430]"
                }`}
              />
              <span className={`text-xs ${isDark ? "text-[#aeb3bc]" : "text-[#5f6672]"}`}>px</span>
            </div>
            <div className="flex items-center gap-2">
              <label className={`w-16 text-xs ${isDark ? "text-[#aeb3bc]" : "text-[#5f6672]"}`}>{t("editor.heightShort")}</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                min={1}
                className={`flex-1 rounded border px-2 py-1.5 text-sm ${
                  isDark ? "border-white/20 bg-[#25272b] text-[#e8eaed]" : "border-black/20 bg-[#f6f8fb] text-[#1f2430]"
                }`}
              />
              <span className={`text-xs ${isDark ? "text-[#aeb3bc]" : "text-[#5f6672]"}`}>px</span>
            </div>
            <div className="rounded border border-dashed border-black/20 p-2 text-center">
              <span className={`text-xs ${isDark ? "text-[#aeb3bc]" : "text-[#5f6672]"}`}>
                {parseInt(customWidth) || 0} × {parseInt(customHeight) || 0} px
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className={`rounded border px-3 py-1.5 text-xs font-medium ${
              isDark ? "border-white/20 text-[#d7dae0]" : "border-black/20 text-[#1f2430]"
            }`}
          >
            {t("editor.cancel")}
          </button>
          <button
            onClick={handleApply}
            className="rounded border border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {t("editor.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
