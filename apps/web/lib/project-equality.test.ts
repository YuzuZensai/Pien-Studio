import { describe, expect, it } from "vitest";
import type { Project } from "@pien-studio/types";
import { hasProjectChanged } from "./project-equality";

function makeProject(): Project {
  return {
    id: "p1",
    title: "Project",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    aspectRatio: "1:1",
    canvas: { width: 100, height: 100, unit: "px" },
    layers: [{ id: "l1", type: "text", x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }],
  };
}

describe("hasProjectChanged", () => {
  it("returns false for equal projects", () => {
    const a = makeProject();
    const b = makeProject();
    expect(hasProjectChanged(a, b)).toBe(false);
  });

  it("detects canvas changes", () => {
    const a = makeProject();
    const b = makeProject();
    b.canvas.width = 101;
    expect(hasProjectChanged(a, b)).toBe(true);
  });

  it("detects face blur region changes", () => {
    const a = makeProject();
    const b = makeProject();
    a.layers[0].type = "image";
    b.layers[0].type = "image";
    a.layers[0].faceBlur = { method: "gaussian", amount: 14, regions: [{ x: 1, y: 1, width: 10, height: 10 }] };
    b.layers[0].faceBlur = { method: "gaussian", amount: 14, regions: [{ x: 1, y: 1, width: 11, height: 10 }] };
    expect(hasProjectChanged(a, b)).toBe(true);
  });

  it("detects layer order changes", () => {
    const a = makeProject();
    const b = makeProject();
    a.layers.push({ id: "l2", type: "text", x: 3, y: 4, scale: 1, rotation: 0, opacity: 1 });
    b.layers.push({ id: "l2", type: "text", x: 3, y: 4, scale: 1, rotation: 0, opacity: 1 });
    b.layers = [b.layers[1], b.layers[0]];
    expect(hasProjectChanged(a, b)).toBe(true);
  });

  it("treats missing optional fields and undefined as equal", () => {
    const a = makeProject();
    const b = makeProject();
    a.layers[0].name = undefined;
    b.layers[0].name = undefined;
    expect(hasProjectChanged(a, b)).toBe(false);
  });

  it("detects face blur removal", () => {
    const a = makeProject();
    const b = makeProject();
    a.layers[0].type = "image";
    b.layers[0].type = "image";
    a.layers[0].faceBlur = { method: "gaussian", amount: 14, regions: [{ x: 1, y: 1, width: 10, height: 10 }] };
    expect(hasProjectChanged(a, b)).toBe(true);
  });
});
