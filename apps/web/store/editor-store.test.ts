import { describe, expect, it } from "vitest";
import { useEditorStore } from "./editor-store";

describe("editor store", () => {
  it("saves and loads project from indexeddb", async () => {
    useEditorStore.getState().resetProject();
    useEditorStore.getState().addLayerByType("sticker");
    const savedId = useEditorStore.getState().project.id;

    await useEditorStore.getState().saveCurrentProject();
    useEditorStore.getState().resetProject();
    expect(useEditorStore.getState().project.id).not.toBe(savedId);

    await useEditorStore.getState().loadProjectById(savedId);
    expect(useEditorStore.getState().project.id).toBe(savedId);
  });

  it("imports and exports project json", () => {
    useEditorStore.getState().resetProject();
    useEditorStore.getState().addLayerByType("image");
    const json = useEditorStore.getState().exportProjectToJson();

    useEditorStore.getState().resetProject();
    const result = useEditorStore.getState().importProjectFromJson(json);

    expect(result.ok).toBe(true);
    expect(useEditorStore.getState().project.layers.length).toBe(1);
  });

  it("adds layer by type and removes selected layer", () => {
    useEditorStore.getState().resetProject();
    useEditorStore.getState().addLayerByType("text");
    expect(useEditorStore.getState().project.layers[0]?.type).toBe("text");
    useEditorStore.getState().removeSelectedLayer();
    expect(useEditorStore.getState().project.layers).toHaveLength(0);
  });

  it("updates selected layer position directly", () => {
    useEditorStore.getState().resetProject();
    useEditorStore.getState().addLayerByType("text");
    useEditorStore.getState().setSelectedLayerPosition(220, 140);
    const layer = useEditorStore.getState().project.layers[0];
    expect(layer?.x).toBe(220);
    expect(layer?.y).toBe(140);
  });

  it("records pointer draft transforms in undo history on commit", () => {
    useEditorStore.getState().resetProject();
    useEditorStore.getState().addLayerByType("image");
    const initial = useEditorStore.getState().project.layers[0];
    expect(initial).toBeDefined();

    useEditorStore.getState().setSelectedLayerPositionDraft(180, 150);
    useEditorStore.getState().setSelectedLayerPosition(180, 150);
    expect(useEditorStore.getState().canUndo).toBe(true);

    useEditorStore.getState().undo();
    const movedBack = useEditorStore.getState().project.layers[0];
    expect(movedBack?.x).toBe(initial?.x);
    expect(movedBack?.y).toBe(initial?.y);
  });

  it("reorders layers up and down", () => {
    useEditorStore.getState().resetProject();
    useEditorStore.getState().addLayerByType("text");
    useEditorStore.getState().addLayerByType("image");
    const layers = useEditorStore.getState().project.layers;
    const [first, second] = layers;
    expect(first.id).not.toBe(second.id);

    useEditorStore.getState().selectLayer(first.id);
    useEditorStore.getState().moveSelectedLayerOrder("up");
    const after = useEditorStore.getState().project.layers;
    expect(after[0].id).toBe(second.id);
    expect(after[1].id).toBe(first.id);
  });
});
