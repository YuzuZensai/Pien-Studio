import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEditorStore } from "../store/editor-store";
import { useEditorBindings } from "./use-editor-bindings";

describe("useEditorBindings", () => {
  it("returns selected layer derived from store state", () => {
    useEditorStore.getState().resetProject();
    useEditorStore.getState().addLayerByType("text");

    const { result } = renderHook(() => useEditorBindings());

    expect(result.current.state.project.layers.length).toBe(1);
    expect(result.current.state.selectedLayer?.id).toBe(result.current.state.selectedLayerId);
    expect(typeof result.current.actions.undo).toBe("function");
  });
});
