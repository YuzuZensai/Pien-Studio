import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Layer } from "@pien-studio/types";
import { useFaceBlurWorkflow } from "./use-face-blur-workflow";

function makeImageLayer(overrides: Partial<Layer> = {}): Layer {
  return {
    id: "layer-1",
    type: "image",
    sourceUri: "data:image/png;base64,abc",
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    ...overrides,
  };
}

describe("useFaceBlurWorkflow", () => {
  it("selects all detected faces by default when no existing face blur", async () => {
    const setImageLayerFaceBlur = vi.fn();
    const selectedLayer = makeImageLayer();
    const faceDetections = [
      { x: 1, y: 2, width: 10, height: 12, label: "a", sourceWidth: 100, sourceHeight: 100 },
      { x: 5, y: 8, width: 7, height: 9, label: "b", sourceWidth: 100, sourceHeight: 100 },
    ];

    const { result } = renderHook(() =>
      useFaceBlurWorkflow({
        selectedLayer,
        faceDetectionsLayerId: "layer-1",
        faceDetections,
        setImageLayerFaceBlur,
      }),
    );

    await waitFor(() => {
      expect(result.current.selectedFaceIndices).toEqual([0, 1]);
      expect(result.current.faceBlurPreview?.regions).toHaveLength(2);
    });
  });

  it("keeps selection empty when selected image already has blur", async () => {
    const setImageLayerFaceBlur = vi.fn();
    const selectedLayer = makeImageLayer({
      faceBlur: { method: "gaussian", amount: 14, regions: [{ x: 0, y: 0, width: 4, height: 4 }] },
    });

    const { result } = renderHook(() =>
      useFaceBlurWorkflow({
        selectedLayer,
        faceDetectionsLayerId: "layer-1",
        faceDetections: [{ x: 1, y: 2, width: 10, height: 12, label: "a", sourceWidth: 100, sourceHeight: 100 }],
        setImageLayerFaceBlur,
      }),
    );

    await waitFor(() => {
      expect(result.current.selectedFaceIndices).toEqual([]);
      expect(result.current.faceBlurPreview).toBeNull();
    });
  });

  it("toggles face selection and applies blur to selected regions", async () => {
    const setImageLayerFaceBlur = vi.fn();
    const selectedLayer = makeImageLayer();
    const faceDetections = [
      { x: 1, y: 2, width: 10, height: 12, label: "a", sourceWidth: 100, sourceHeight: 100 },
      { x: 50, y: 60, width: 20, height: 22, label: "b", sourceWidth: 100, sourceHeight: 100 },
    ];

    const { result } = renderHook(() =>
      useFaceBlurWorkflow({
        selectedLayer,
        faceDetectionsLayerId: "layer-1",
        faceDetections,
        setImageLayerFaceBlur,
      }),
    );

    await waitFor(() => {
      expect(result.current.selectedFaceIndices).toEqual([0, 1]);
    });

    act(() => {
      result.current.toggleFaceIndex(1);
    });

    expect(result.current.selectedFaceIndices).toEqual([0]);

    act(() => {
      result.current.blurFaces(result.current.selectedFaceIndices);
    });

    expect(setImageLayerFaceBlur).toHaveBeenCalledTimes(1);
    expect(setImageLayerFaceBlur).toHaveBeenCalledWith(
      "layer-1",
      expect.objectContaining({
        method: "gaussian",
        amount: 14,
        regions: expect.arrayContaining([
          expect.objectContaining({ x: 1, y: 2, width: 10, height: 12, censorColor: "#111111", sourceWidth: 100, sourceHeight: 100 }),
        ]),
      }),
    );
    expect(result.current.selectedFaceIndices).toEqual([]);
    expect(result.current.faceBlurPreview).toBeNull();
  });
});
