import React from "react";
import type { FaceBlurMethod, Layer } from "@pien-studio/types";
import type { FaceDetectionOverlay } from "./use-face-detection";

type FaceBlurPreview = {
  layerId: string;
  method: FaceBlurMethod;
  amount: number;
  regions: { x: number; y: number; width: number; height: number; sourceWidth: number; sourceHeight: number; censorColor?: string }[];
  censorColor?: string;
};

type UseFaceBlurWorkflowOptions = {
  selectedLayer: Layer | null;
  faceDetectionsLayerId: string | null;
  faceDetections: FaceDetectionOverlay[];
  setImageLayerFaceBlur: (layerId: string, faceBlur: Layer["faceBlur"] | undefined) => void;
};

export function useFaceBlurWorkflow(options: UseFaceBlurWorkflowOptions) {
  const { selectedLayer, faceDetectionsLayerId, faceDetections, setImageLayerFaceBlur } = options;
  const [blurMethod, setBlurMethod] = React.useState<FaceBlurMethod>("gaussian");
  const [blurAmount, setBlurAmount] = React.useState(14);
  const [censorColor, setCensorColor] = React.useState("#111111");
  const [selectedFaceIndices, setSelectedFaceIndices] = React.useState<number[]>([]);
  const [faceBlurPreview, setFaceBlurPreview] = React.useState<FaceBlurPreview | null>(null);
  const hasDetectableSelection = Boolean(selectedLayer && selectedLayer.type === "image" && faceDetectionsLayerId === selectedLayer.id);

  const buildBlurRegions = React.useCallback(
    (indices: number[]) => {
      if (!selectedLayer || selectedLayer.type !== "image") return [];
      if (faceDetectionsLayerId !== selectedLayer.id || faceDetections.length === 0) return [];
      const indexSet = new Set(indices);
      return faceDetections
        .filter((_, index) => indexSet.has(index))
        .map((face) => {
          const baseWidth = Math.max(1, selectedLayer.width ?? face.sourceWidth);
          const baseHeight = Math.max(1, selectedLayer.height ?? face.sourceHeight);
          const scaleX = face.sourceWidth / baseWidth;
          const scaleY = face.sourceHeight / baseHeight;
          return {
            x: Math.max(0, Math.floor(face.x * scaleX)),
            y: Math.max(0, Math.floor(face.y * scaleY)),
            width: Math.max(1, Math.floor(face.width * scaleX)),
            height: Math.max(1, Math.floor(face.height * scaleY)),
            sourceWidth: face.sourceWidth,
            sourceHeight: face.sourceHeight,
            censorColor,
          };
        });
    },
    [censorColor, faceDetections, faceDetectionsLayerId, selectedLayer],
  );

  const toggleFaceIndex = React.useCallback((index: number) => {
    setSelectedFaceIndices((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]));
  }, []);

  const clearBlur = React.useCallback(() => {
    if (!selectedLayer || selectedLayer.type !== "image") return;
    setImageLayerFaceBlur(selectedLayer.id, undefined);
    setFaceBlurPreview(null);
  }, [selectedLayer, setImageLayerFaceBlur]);

  const blurFaces = React.useCallback(
    (indices: number[]) => {
      if (!selectedLayer || selectedLayer.type !== "image" || !selectedLayer.sourceUri) return;
      if (faceDetectionsLayerId !== selectedLayer.id || faceDetections.length === 0) return;
      const regions = buildBlurRegions(indices);
      setImageLayerFaceBlur(selectedLayer.id, {
        method: blurMethod,
        amount: blurAmount,
        regions,
        censorColor,
      });
      setSelectedFaceIndices([]);
      setFaceBlurPreview(null);
    },
    [blurAmount, blurMethod, buildBlurRegions, censorColor, faceDetections.length, faceDetectionsLayerId, selectedLayer, setImageLayerFaceBlur],
  );

  React.useEffect(() => {
    if (!hasDetectableSelection) {
      setSelectedFaceIndices((prev) => (prev.length === 0 ? prev : []));
      setFaceBlurPreview(null);
      return;
    }
    if (selectedLayer?.faceBlur) {
      setSelectedFaceIndices((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setSelectedFaceIndices((prev) => {
      const next = faceDetections.map((_, i) => i);
      if (prev.length === next.length && prev.every((value, index) => value === next[index])) return prev;
      return next;
    });
  }, [faceDetections, hasDetectableSelection, selectedLayer?.faceBlur]);

  React.useEffect(() => {
    if (!hasDetectableSelection || !selectedLayer || selectedLayer.type !== "image") {
      setFaceBlurPreview(null);
      return;
    }

    if (selectedFaceIndices.length === 0) {
      setFaceBlurPreview(null);
      return;
    }

    setFaceBlurPreview({
      layerId: selectedLayer.id,
      method: blurMethod,
      amount: blurAmount,
      regions: buildBlurRegions(selectedFaceIndices),
      censorColor,
    });
  }, [blurAmount, blurMethod, buildBlurRegions, censorColor, hasDetectableSelection, selectedFaceIndices, selectedLayer]);

  return {
    blurMethod,
    setBlurMethod,
    blurAmount,
    setBlurAmount,
    censorColor,
    setCensorColor,
    selectedFaceIndices,
    faceBlurPreview,
    toggleFaceIndex,
    clearBlur,
    blurFaces,
  };
}
