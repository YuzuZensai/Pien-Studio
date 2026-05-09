import { describe, expect, it } from "vitest";
import { buildFaceLabelOverlays } from "./canvas-geometry";

describe("buildFaceLabelOverlays", () => {
  it("returns no overlays when target layer is missing", () => {
    const overlays = buildFaceLabelOverlays([], "missing", [{ x: 10, y: 10, width: 20, height: 20 }], { x: 0, y: 0, scale: 1 });
    expect(overlays).toEqual([]);
  });

  it("stacks overlapping labels to avoid collisions", () => {
    const layers = [
      {
        id: "layer-1",
        type: "image" as const,
        x: 20,
        y: 30,
        width: 180,
        height: 120,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
    ];

    const overlays = buildFaceLabelOverlays(
      layers,
      "layer-1",
      [
        { x: 16, y: 20, width: 30, height: 30, label: "A" },
        { x: 17, y: 21, width: 30, height: 30, label: "B" },
      ],
      { x: 0, y: 0, scale: 1 },
    );

    expect(overlays).toHaveLength(2);
    expect(overlays[0]?.top).toBeGreaterThan(overlays[1]?.top ?? 0);
  });
});
