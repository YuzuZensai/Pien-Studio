"use client";

import React from "react";
import NextImage from "next/image";
import { RotateCw } from "lucide-react";
import { CANVAS_HANDLE_BASE_SIZE, CANVAS_ROTATE_HANDLE_BASE_SIZE } from "../lib/editor-constants";
import { buildFaceLabelOverlays } from "../lib/canvas-geometry";
import { renderFaceBlurRegions } from "../lib/face-blur-renderer";
import { useCanvasInteractions } from "../hooks/use-canvas-interactions";
import { useTranslations } from "../hooks/use-translations";
import type { FaceBlurMethod, Layer } from "@pien-studio/types";

interface CanvasRendererProps {
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onMoveLayer: (id: string, x: number, y: number) => void;
  onMoveLayerEnd?: (id: string, x: number, y: number) => void;
  onResizeLayer?: (id: string, width: number, height: number) => void;
  onResizeLayerEnd?: (id: string, width: number, height: number) => void;
  onRotateLayer?: (id: string, rotation: number) => void;
  onRotateLayerEnd?: (id: string, rotation: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  onContextMenu?: (x: number, y: number) => void;
  isDark: boolean;
  tool?: "pointer" | "hand" | "face";
  faceDetections?: { x: number; y: number; width: number; height: number; label?: string }[];
  faceOverlayLayerId?: string | null;
  faceBlurPreview?: {
    layerId: string;
    method: FaceBlurMethod;
    amount: number;
    regions: { x: number; y: number; width: number; height: number }[];
  } | null;
}

function BlurredImageLayer({
  layer,
  width,
  height,
  faceBlurOverride,
}: {
  layer: Layer;
  width: number;
  height: number;
  faceBlurOverride?: {
    method: FaceBlurMethod;
    amount: number;
    regions: { x: number; y: number; width: number; height: number; censorColor?: string }[];
    censorColor?: string;
  } | null;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(image, 0, 0, cw, ch);
    const blur = faceBlurOverride ?? layer.faceBlur;
    if (!blur || blur.regions.length === 0) return;
    renderFaceBlurRegions(ctx, image, blur, cw, ch);
  }, [faceBlurOverride, layer.faceBlur]);

  React.useEffect(() => {
    if (!layer.sourceUri) return;
    let canceled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (canceled) return;
      imageRef.current = image;
      draw();
    };
    image.src = layer.sourceUri;
    return () => {
      canceled = true;
    };
  }, [draw, layer.sourceUri]);

  React.useEffect(() => {
    draw();
  }, [draw, width, height]);

  return <canvas ref={canvasRef} width={Math.max(1, Math.round(width))} height={Math.max(1, Math.round(height))} className="pointer-events-none h-full w-full rounded object-cover" />;
}

export function CanvasRenderer({
  layers,
  canvasWidth,
  canvasHeight,
  selectedLayerId,
  onSelectLayer,
  onMoveLayer,
  onMoveLayerEnd,
  onResizeLayer,
  onResizeLayerEnd,
  onRotateLayer,
  onRotateLayerEnd,
  onInteractionStart,
  onInteractionEnd,
  onContextMenu,
  isDark,
  tool = "pointer",
  faceDetections = [],
  faceOverlayLayerId = null,
  faceBlurPreview = null,
}: CanvasRendererProps) {
  const { t } = useTranslations();
  const {
    containerRef,
    viewport,
    isSpacePan,
    onContainerPointerDown,
    onContainerPointerMove,
    onContainerPointerUp,
    onLayerPointerDown,
    onResizeHandleDown,
    onRotateHandleDown,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onContextMenuOpen,
  } = useCanvasInteractions({
    canvasWidth,
    canvasHeight,
    tool,
    onSelectLayer,
    onMoveLayer,
    onMoveLayerEnd,
    onResizeLayer,
    onResizeLayerEnd,
    onRotateLayer,
    onRotateLayerEnd,
    onInteractionStart,
    onInteractionEnd,
    onContextMenu,
  });

  const faceLabelOverlays = React.useMemo(() => {
    if (tool !== "face" || !faceOverlayLayerId || faceDetections.length === 0) return [];
    return buildFaceLabelOverlays(layers, faceOverlayLayerId, faceDetections, viewport);
  }, [faceDetections, faceOverlayLayerId, layers, tool, viewport.scale, viewport.x, viewport.y]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ width: "100%", height: "100%", touchAction: "none", userSelect: "none", cursor: tool === "hand" || isSpacePan ? "grab" : "default" }}
      onPointerDown={(e) => {
        if (tool === "pointer" && e.button === 0) onSelectLayer(null);
        onContainerPointerDown(e);
      }}
      onMouseDown={(e) => e.preventDefault()}
      onPointerMove={onContainerPointerMove}
      onPointerUp={onContainerPointerUp}
      onPointerCancel={onContainerPointerUp}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onContextMenu={onContextMenuOpen}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          willChange: "transform",
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          boxShadow: "0 0 0 1px var(--color-accent-strong)",
          background: isDark ? "#17181b" : "#ffffff",
        }}
      >
        {layers.map((layer, idx) => {
          const isSelected = layer.id === selectedLayerId;
          const isImage = layer.type === "image";
          const layerWidth = layer.width ?? (isImage ? Math.round(200 * layer.scale) : undefined);
          const layerHeight = layer.height ?? (isImage ? Math.round(150 * layer.scale) : undefined);
          const handleSize = CANVAS_HANDLE_BASE_SIZE / viewport.scale;
          const handleSizePx = `${handleSize}px`;
          const largeHandleSize = CANVAS_ROTATE_HANDLE_BASE_SIZE / viewport.scale;
          const largeHandleSizePx = `${largeHandleSize}px`;

          return (
            <div
              key={layer.id}
              className="absolute"
              style={{
                left: layer.x,
                top: layer.y,
                width: layerWidth,
                height: layerHeight,
                transform: `rotate(${layer.rotation}deg)`,
                opacity: layer.opacity,
                cursor: "move",
                border: isSelected ? "2px solid var(--color-accent-strong)" : "1px dashed transparent",
                outline: isSelected ? "2px solid var(--color-accent-strong)" : "none",
                outlineOffset: "2px",
                zIndex: idx,
              }}
              onPointerDown={(e) => onLayerPointerDown(e, layer)}
              onClick={() => onSelectLayer(layer.id)}
            >
              {isImage && layer.sourceUri ? (
                (faceBlurPreview && faceBlurPreview.layerId === layer.id && faceBlurPreview.regions.length > 0) ||
                (layer.faceBlur && layer.faceBlur.regions.length > 0) ? (
                  <BlurredImageLayer
                    layer={layer}
                    width={layerWidth ?? 1}
                    height={layerHeight ?? 1}
                    faceBlurOverride={faceBlurPreview && faceBlurPreview.layerId === layer.id ? faceBlurPreview : null}
                  />
                ) : (
                  <NextImage
                    src={layer.sourceUri}
                    alt={layer.name ?? t("editor.layer")}
                    width={layerWidth ?? 1}
                    height={layerHeight ?? 1}
                    unoptimized
                    className="pointer-events-none h-full w-full rounded object-cover"
                    draggable={false}
                  />
                )
              ) : (
                <div
                  className={`flex items-center justify-center rounded border px-2 py-1 text-xs font-semibold ${
                    isSelected
                      ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white"
                      : isDark
                        ? "border-white/20 bg-[#2d3036] text-[#d7dae0]"
                        : "border-black/15 bg-white text-[#1f2430]"
                  }`}
                >
                  {layer.type}
                </div>
              )}
              {tool === "face" && faceOverlayLayerId === layer.id
                ? faceDetections.map((face, index) => (
                    <div
                      key={`${layer.id}-face-${index}`}
                      className="absolute pointer-events-none border-2 border-[#00d2ff]"
                      style={{
                        left: face.x,
                        top: face.y,
                        width: face.width,
                        height: face.height,
                        zIndex: layers.length + 20 + index,
                        boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
                      }}
                    />
                  ))
                : null}
              {isSelected && tool === "pointer" && isImage && onResizeLayer ? (
                <>
                  <button
                    type="button"
                    className="absolute rounded-full border-2 border-white/80 bg-[var(--color-accent-strong)] shadow"
                    style={{ width: handleSizePx, height: handleSizePx, top: -handleSize / 2, left: -handleSize / 2 }}
                    onPointerDown={(e) => onResizeHandleDown(e, layer, "tl")}
                    title={t("editor.resize")}
                  />
                  <button
                    type="button"
                    className="absolute rounded-full border-2 border-white/80 bg-[var(--color-accent-strong)] shadow"
                    style={{ width: handleSizePx, height: handleSizePx, top: -handleSize / 2, right: -handleSize / 2 }}
                    onPointerDown={(e) => onResizeHandleDown(e, layer, "tr")}
                    title={t("editor.resize")}
                  />
                  <button
                    type="button"
                    className="absolute rounded-full border-2 border-white/80 bg-[var(--color-accent-strong)] shadow"
                    style={{ width: handleSizePx, height: handleSizePx, bottom: -handleSize / 2, left: -handleSize / 2 }}
                    onPointerDown={(e) => onResizeHandleDown(e, layer, "bl")}
                    title={t("editor.resize")}
                  />
                  <button
                    type="button"
                    className="absolute rounded-full border-2 border-white/80 bg-[var(--color-accent-strong)] shadow"
                    style={{ width: handleSizePx, height: handleSizePx, bottom: -handleSize / 2, right: -handleSize / 2 }}
                    onPointerDown={(e) => onResizeHandleDown(e, layer, "br")}
                    title={t("editor.resize")}
                  />
                  <div className="absolute pointer-events-none" style={{ top: -largeHandleSize, left: "50%", transform: "translateX(-50%)", height: largeHandleSize }}>
                    <div className="w-px bg-[var(--color-accent-strong)]" style={{ width: "1px", height: "100%", marginLeft: "0px" }} />
                    <button
                      type="button"
                      className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full border-2 border-white/90 bg-[var(--color-accent-strong)] shadow flex items-center justify-center"
                      style={{ width: largeHandleSizePx, height: largeHandleSizePx }}
                      onPointerDown={(e) => onRotateHandleDown(e, layer)}
                      title={t("editor.rotate")}
                    >
                      <RotateCw className="text-white" style={{ width: handleSize * 0.6, height: handleSize * 0.6 }} />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
      {faceLabelOverlays.map((label) => (
        <span
          key={label.id}
          className="pointer-events-none absolute rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white"
          style={{
            left: label.left,
            top: label.top,
            background: "rgba(0, 210, 255, 0.9)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.22)",
            textShadow: "0 1px 1px rgba(0,0,0,0.35)",
            zIndex: layers.length + 100,
          }}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}
