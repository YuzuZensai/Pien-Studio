import { describe, expect, it } from "vitest";
import {
  addLayer,
  createProject,
  moveLayer,
  reorderLayer,
  updateLayerTransform,
} from "./index";

describe("editor-core", () => {
  it("creates project with defaults", () => {
    const project = createProject("new");
    expect(project.title).toBe("new");
    expect(project.aspectRatio).toBe("4:5");
    expect(project.layers).toHaveLength(0);
  });

  it("adds a new layer and updates timestamp", () => {
    const project = createProject("new");
    const updated = addLayer(project, {
      id: "l1",
      type: "image",
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });

    expect(updated.layers).toHaveLength(1);
    expect(updated.layers[0]?.id).toBe("l1");
    expect(updated.updatedAt >= project.updatedAt).toBe(true);
  });

  it("moves a layer by delta", () => {
    const project = addLayer(createProject("move"), {
      id: "l1",
      type: "sticker",
      x: 10,
      y: 20,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });

    const moved = moveLayer(project, "l1", { dx: 15, dy: -5 });
    expect(moved.layers[0]?.x).toBe(25);
    expect(moved.layers[0]?.y).toBe(15);
  });

  it("updates transform fields", () => {
    const project = addLayer(createProject("transform"), {
      id: "l1",
      type: "text",
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });

    const updated = updateLayerTransform(project, "l1", { scale: 1.35, rotation: 22 });
    expect(updated.layers[0]?.scale).toBe(1.35);
    expect(updated.layers[0]?.rotation).toBe(22);
  });

  it("reorders layer to the front", () => {
    const base = createProject("reorder");
    const withFirst = addLayer(base, {
      id: "l1",
      type: "text",
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });
    const withSecond = addLayer(withFirst, {
      id: "l2",
      type: "sticker",
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });

    const reordered = reorderLayer(withSecond, "l1", 1);
    expect(reordered.layers.map((layer) => layer.id)).toEqual(["l2", "l1"]);
  });
});
