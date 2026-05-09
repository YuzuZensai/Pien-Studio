import React from "react";
import type { EditorToolId } from "../store/editor-store";
import { buildFacePreviews, loadImageFromUri, toFaceDetectionOverlays } from "../lib/face-detection-utils";

export type FaceDetectionOverlay = {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  label: string;
  gender?: string;
  genderScore?: number;
};

export type FacePreview = {
  id: string;
  src: string;
};

type SelectedImageLayer = {
  id: string;
  sourceUri: string;
  width?: number;
  height?: number;
};

type UseFaceDetectionOptions = {
  tool: EditorToolId;
  selectedLayerId: string | null;
  selectedImageLayer: SelectedImageLayer | null;
  activeLayerStillSelected: (layerId: string) => boolean;
};

export function useFaceDetection(options: UseFaceDetectionOptions) {
  const { tool, selectedLayerId, selectedImageLayer, activeLayerStillSelected } = options;
  const selectedImageLayerId = selectedImageLayer?.id ?? null;
  const selectedImageSourceUri = selectedImageLayer?.sourceUri ?? null;
  const selectedImageWidth = selectedImageLayer?.width;
  const selectedImageHeight = selectedImageLayer?.height;
  const [faceDetections, setFaceDetections] = React.useState<FaceDetectionOverlay[]>([]);
  const [faceDetectionsLayerId, setFaceDetectionsLayerId] = React.useState<string | null>(null);
  const [faceStatus, setFaceStatus] = React.useState<"idle" | "detecting" | "unsupported">("idle");
  const [facePreviews, setFacePreviews] = React.useState<FacePreview[]>([]);

  const resetFaceState = React.useCallback((status: "idle" | "detecting" | "unsupported" = "idle") => {
    setFaceDetections((prev) => (prev.length === 0 ? prev : []));
    setFaceDetectionsLayerId((prev) => (prev === null ? prev : null));
    setFaceStatus((prev) => (prev === status ? prev : status));
  }, []);

  React.useEffect(() => {
    let canceled = false;

    async function detectFaces() {
      const layerId = selectedImageLayerId;
      if (tool !== "face" || !layerId || !selectedImageSourceUri) {
        resetFaceState("idle");
        return;
      }

      resetFaceState("detecting");
      const image = await loadImageFromUri(selectedImageSourceUri);
      if (!image) {
        if (!canceled) {
          resetFaceState("idle");
        }
        return;
      }

      try {
        const { detectFaceBoxes } = await import("../lib/face-ml");
        const faces = await detectFaceBoxes(image);
        if (canceled) return;
        if (!activeLayerStillSelected(layerId) || tool !== "face") return;
        const overlays = toFaceDetectionOverlays(faces, image, selectedImageWidth, selectedImageHeight);
        setFaceDetections(overlays);
        setFaceDetectionsLayerId(layerId);
        setFaceStatus((prev) => (prev === "idle" ? prev : "idle"));
      } catch (err) {
        console.error("[face-detection] detectFaces error:", err);
        if (!canceled) {
          resetFaceState("unsupported");
        }
      }
    }

    detectFaces();
    return () => {
      canceled = true;
    };
  }, [activeLayerStillSelected, resetFaceState, selectedImageHeight, selectedImageLayerId, selectedImageSourceUri, selectedImageWidth, tool]);

  React.useEffect(() => {
    if (tool !== "face") {
      setFaceDetections([]);
      setFaceDetectionsLayerId(null);
      setFacePreviews([]);
      return;
    }
    setFaceDetections([]);
    setFaceDetectionsLayerId(null);
    setFacePreviews([]);
  }, [tool, selectedLayerId]);

  React.useEffect(() => {
    let canceled = false;

    async function generateFacePreviews() {
      if (tool !== "face" || !selectedImageSourceUri || faceDetections.length === 0) {
        setFacePreviews([]);
        return;
      }

      const image = await loadImageFromUri(selectedImageSourceUri);
      if (!image || canceled) {
        setFacePreviews([]);
        return;
      }

      const previews = buildFacePreviews(image, faceDetections, selectedImageWidth, selectedImageHeight);

      if (!canceled) setFacePreviews(previews);
    }

    generateFacePreviews();
    return () => {
      canceled = true;
    };
  }, [faceDetections, selectedImageHeight, selectedImageSourceUri, selectedImageWidth, tool]);

  return { faceDetections, faceDetectionsLayerId, facePreviews, faceStatus };
}
