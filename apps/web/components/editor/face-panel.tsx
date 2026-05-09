"use client";

import type { Layer } from "@pien-studio/types";
import Image from "next/image";
import type { FaceDetectionOverlay, FacePreview } from "../../hooks/use-face-detection";
import { useTranslations } from "../../hooks/use-translations";
import { panelClass, panelCounterClass, panelInsetClass, panelTitleClass } from "../../lib/theme";

type Props = {
  isDark: boolean;
  selectedLayer: Layer | null;
  faceDetections: FaceDetectionOverlay[];
  facePreviews: FacePreview[];
  faceStatus: "idle" | "detecting" | "unsupported";
  blurMethod: "gaussian" | "pixelate" | "censor";
  blurAmount: number;
  censorColor: string;
  selectedFaceIndices: number[];
  hasActiveBlur: boolean;
  onSetBlurMethod: (method: "gaussian" | "pixelate" | "censor") => void;
  onSetBlurAmount: (amount: number) => void;
  onSetCensorColor: (color: string) => void;
  onToggleFaceIndex: (index: number) => void;
  onBlur: (indices: number[]) => void;
  onClearBlur: () => void;
};

export function FacePanel({
  isDark,
  selectedLayer,
  faceDetections,
  facePreviews,
  faceStatus,
  blurMethod,
  blurAmount,
  censorColor,
  selectedFaceIndices,
  hasActiveBlur,
  onSetBlurMethod,
  onSetBlurAmount,
  onSetCensorColor,
  onToggleFaceIndex,
  onBlur,
  onClearBlur,
}: Props) {
  const { t } = useTranslations();
  const hasFaces = faceDetections.length > 0;

  return (
    <div className={panelClass(isDark)}>
      <div className="flex items-center justify-between">
        <h2 className={`text-xs font-semibold uppercase tracking-wide ${panelTitleClass(isDark)}`}>{t("editor.faceTool")}</h2>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${panelCounterClass(isDark)}`}>{faceDetections.length}</span>
      </div>
      <p className={`mt-2 text-[11px] ${isDark ? "text-[#9aa1ad]" : "text-[#6b7280]"}`}>
        {faceStatus === "unsupported"
          ? t("editor.faceMlFailed")
          : faceStatus === "detecting"
            ? t("editor.detectingFaces")
            : selectedLayer?.type !== "image"
              ? t("editor.selectImageLayer")
              : faceDetections.length === 0
                ? t("editor.noFacesFound")
                : t("editor.facesDetected")}
      </p>
      {hasFaces ? (
        <div className={`mt-3 max-h-[180px] space-y-1 overflow-auto rounded-md border p-1 ${panelInsetClass(isDark)}`}>
          {faceDetections.map((face, index) => (
            <button
              key={`face-result-${index}`}
              type="button"
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[11px] ${isDark ? "bg-white/5 text-[#d7dae0]" : "bg-white text-[#1f2430]"} ${
                selectedFaceIndices.includes(index)
                  ? isDark
                    ? "ring-1 ring-[#7cdcff]"
                    : "ring-1 ring-[#00b7f0]"
                  : ""
              }`}
              onClick={() => onToggleFaceIndex(index)}
            >
              {facePreviews[index]?.src ? (
                <Image src={facePreviews[index].src} alt={`Face preview ${index + 1}`} width={40} height={40} unoptimized className="h-10 w-10 rounded object-cover" draggable={false} />
              ) : (
                <div className={`h-10 w-10 rounded ${isDark ? "bg-white/10" : "bg-black/10"}`} />
              )}
              <div>
                <p className="font-semibold">{t("editor.person")} {index + 1}</p>
                <p>{`${face.gender ?? t("editor.unknown")}${face.genderScore != null ? ` ${Math.round(face.genderScore * 100)}%` : ""}`}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className={`mt-3 space-y-2 rounded-md border p-2 ${panelInsetClass(isDark)}`}>
        <label className="block text-[11px] font-semibold">{t("editor.blurMethod")}</label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: "gaussian", label: t("editor.soft") },
            { id: "pixelate", label: t("editor.pixelate") },
            { id: "censor", label: t("editor.censor") },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded px-2 py-1 text-[11px] font-semibold ${
                blurMethod === option.id
                  ? "bg-[var(--color-accent-strong)] text-white"
                  : isDark
                    ? "bg-white/10 text-[#d7dae0]"
                    : "bg-white text-[#1f2430]"
              }`}
              onClick={() => onSetBlurMethod(option.id as "gaussian" | "pixelate" | "censor")}
            >
              {option.label}
            </button>
          ))}
        </div>
        {blurMethod !== "censor" ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span>{t("editor.strength")}</span>
              <span>{blurAmount}</span>
            </div>
            <input
              type="range"
              min={4}
              max={40}
              value={blurAmount}
              onChange={(event) => onSetBlurAmount(Number(event.target.value))}
              className="w-full"
            />
          </div>
        ) : null}
        {blurMethod === "censor" ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span>{t("editor.color")}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={censorColor}
                onChange={(event) => onSetCensorColor(event.target.value)}
                className="h-6 w-6 cursor-pointer rounded border-none"
              />
              <input
                type="text"
                value={censorColor}
                onChange={(event) => onSetCensorColor(event.target.value)}
                className={`flex-1 rounded border px-1 py-0.5 text-[11px] ${isDark ? "border-white/20 bg-white/10 text-white" : "border-black/20 bg-white text-black"}`}
              />
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onBlur(selectedFaceIndices)}
          disabled={!hasFaces || selectedFaceIndices.length === 0}
          className={`w-full rounded px-2 py-1 text-[11px] font-semibold ${
            !hasFaces || selectedFaceIndices.length === 0
              ? "opacity-50"
              : "bg-[var(--color-accent-strong)] text-white"
          }`}
        >
          {hasFaces && selectedFaceIndices.length === 0
            ? t("editor.selectFacesToBlur")
            : t("editor.blurFaces", { count: selectedFaceIndices.length })}
        </button>
        {hasActiveBlur ? (
          <button
            type="button"
            onClick={onClearBlur}
            className={`w-full rounded px-2 py-1 text-[11px] font-semibold ${
              isDark ? "bg-white/10 text-[#d7dae0]" : "bg-white text-[#1f2430]"
            }`}
          >
            {t("editor.clearBlur")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
