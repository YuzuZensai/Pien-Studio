"use client";

import { create } from "zustand";
import {
  addLayer,
  createLayer,
  createProject,
  parseProjectFile,
  removeLayer,
  reorderLayer,
  serializeProjectFile,
  setCanvasSize as applyCanvasSize,
  updateLayerTransform,
  normalizeProject,
} from "@pien-studio/editor-core";
import type { FaceBlurSettings, Layer, Project } from "@pien-studio/types";
import { getProjectById, releaseProjectObjectUrls, upsertProject } from "@pien-studio/storage";
import { DEFAULT_IMAGE_IMPORT, MIN_LAYER_SIZE } from "../lib/editor-constants";
import { hasProjectChanged } from "../lib/project-equality";
import {
  capHistory,
  cloneLayer,
  cloneProject,
  computeHistoryFlags,
  makeHistory,
  resolveSelectedLayerId,
  type HistoryState,
} from "./editor-store-helpers";

const DRAFT_TRANSFORM_EPSILON = 0.01;

export const EDITOR_TOOLS = {
  pointer: { id: "pointer", allowsSelection: true, allowsLayerEditing: true },
  hand: { id: "hand", allowsSelection: false, allowsLayerEditing: false },
  face: { id: "face", allowsSelection: true, allowsLayerEditing: false },
} as const;

export type EditorToolId = keyof typeof EDITOR_TOOLS;

type TransactionState = {
  baselineProject: Project;
  baselineSelectedLayerId: string | null;
};

type EditorState = {
  project: Project;
  selectedLayerId: string | null;
  tool: EditorToolId;
  history: HistoryState;
  canUndo: boolean;
  canRedo: boolean;
  clipboardLayer: Layer | null;
  isDirty: boolean;
  transaction: TransactionState | null;
  tools: typeof EDITOR_TOOLS;
  startTransaction: () => void;
  commitTransaction: () => void;
  cancelTransaction: () => void;
  applyProjectDraft: (project: Project) => void;
  setTool: (tool: EditorToolId) => void;
  addLayerByType: (type: Layer["type"]) => void;
  setSelectedLayerPosition: (x: number, y: number) => void;
  setSelectedLayerPositionDraft: (x: number, y: number) => void;
  setSelectedLayerSize: (width: number, height: number) => void;
  setSelectedLayerSizeDraft: (width: number, height: number) => void;
  setSelectedLayerRotation: (rotation: number) => void;
  setSelectedLayerRotationDraft: (rotation: number) => void;
  removeSelectedLayer: () => void;
  moveSelectedLayerOrder: (direction: "up" | "down") => void;
  selectLayer: (layerId: string | null) => void;
  copySelectedLayer: () => void;
  cutSelectedLayer: () => void;
  pasteLayer: () => void;
  resetProject: () => void;
  saveCurrentProject: () => Promise<void>;
  loadProjectById: (projectId: string) => Promise<boolean>;
  setProject: (project: Project) => void;
  importProjectFromJson: (raw: string) => { ok: boolean; error?: string };
  importImageFromFile: (file: File) => Promise<void>;
  updateImageLayerSource: (layerId: string, sourceUri: string) => void;
  setImageLayerFaceBlur: (layerId: string, faceBlur: FaceBlurSettings | undefined) => void;
  setCanvasSize: (width: number, height: number) => void;
  exportProjectToJson: () => string;
  undo: () => void;
  redo: () => void;
  jumpToPast: (idx: number) => void;
  jumpToFuture: (idx: number) => void;
};

const initialProject = createProject("Untitled Project");

function withCommittedProject(state: EditorState, nextProject: Project, extras?: Partial<EditorState>) {
  const past = capHistory([...state.history.past, state.history.present]);
  const history = { past, present: cloneProject(nextProject), future: [] };
  return {
    project: nextProject,
    history,
    selectedLayerId: resolveSelectedLayerId(nextProject, state.selectedLayerId),
    transaction: null,
    ...computeHistoryFlags(history),
    isDirty: true,
    ...extras,
  } satisfies Partial<EditorState>;
}

function makeStableProjectState(previousSelectedLayerId: string | null, project: Project) {
  const history = makeHistory(project);
  return {
    project,
    selectedLayerId: resolveSelectedLayerId(project, previousSelectedLayerId),
    history,
    ...computeHistoryFlags(history),
    clipboardLayer: null,
    transaction: null,
    isDirty: false,
  };
}

function getProjectAssetIds(project: Project): string[] {
  return project.layers.map((layer) => layer.assetId).filter((assetId): assetId is string => Boolean(assetId));
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: initialProject,
  selectedLayerId: null,
  tool: "pointer",
  history: makeHistory(initialProject),
  ...computeHistoryFlags(makeHistory(initialProject)),
  clipboardLayer: null,
  isDirty: false,
  transaction: null,
  tools: EDITOR_TOOLS,

  startTransaction: () =>
    set((state) => {
      if (state.transaction) return state;
      return {
        transaction: {
          baselineProject: cloneProject(state.project),
          baselineSelectedLayerId: state.selectedLayerId,
        },
      };
    }),

  commitTransaction: () =>
    set((state) => {
      if (!state.transaction) return state;
      if (!hasProjectChanged(state.transaction.baselineProject, state.project)) {
        return { transaction: null };
      }

      const past = capHistory([...state.history.past, cloneProject(state.transaction.baselineProject)]);
      const history = { past, present: cloneProject(state.project), future: [] };
      return {
        history,
        transaction: null,
        ...computeHistoryFlags(history),
        isDirty: true,
      };
    }),

  cancelTransaction: () =>
    set((state) => {
      if (!state.transaction) return state;
      return {
        project: cloneProject(state.transaction.baselineProject),
        selectedLayerId: resolveSelectedLayerId(state.transaction.baselineProject, state.transaction.baselineSelectedLayerId),
        transaction: null,
      };
    }),

  applyProjectDraft: (project) => set(() => ({ project })),

  setTool: (tool) => {
    if (!(tool in EDITOR_TOOLS)) return;
    set({ tool });
  },

  addLayerByType: (type) =>
    set((state) => {
      const layer = createLayer(type);
      const nextProject = addLayer(state.project, layer);
      return withCommittedProject(state, nextProject, { selectedLayerId: layer.id });
    }),

  setSelectedLayerPosition: (x, y) =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      const committed = state.history.present.layers.find((layer) => layer.id === state.selectedLayerId);
      if (committed && committed.x === x && committed.y === y) return state;
      const nextProject = updateLayerTransform(state.project, state.selectedLayerId, { x, y });
      return withCommittedProject(state, nextProject);
    }),

  setSelectedLayerPositionDraft: (x, y) =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return state;
      const current = state.project.layers.find((layer) => layer.id === state.selectedLayerId);
      if (current && current.x === x && current.y === y) return state;
      return { project: updateLayerTransform(state.project, state.selectedLayerId, { x, y }) };
    }),

  setSelectedLayerSize: (width, height) =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      const committed = state.history.present.layers.find((layer) => layer.id === state.selectedLayerId);
      if (committed && committed.width === width && committed.height === height) return state;
      return withCommittedProject(state, updateLayerTransform(state.project, state.selectedLayerId, { width, height }));
    }),

  setSelectedLayerSizeDraft: (width, height) =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      if (!Number.isFinite(width) || !Number.isFinite(height)) return state;
      const current = state.project.layers.find((layer) => layer.id === state.selectedLayerId);
      const nextWidth = Math.max(MIN_LAYER_SIZE, width);
      const nextHeight = Math.max(MIN_LAYER_SIZE, height);

      if (current) {
        const currentWidth = current.width ?? (current.type === "image" ? Math.round(200 * current.scale) : undefined);
        const currentHeight = current.height ?? (current.type === "image" ? Math.round(150 * current.scale) : undefined);

        if (
          typeof currentWidth === "number" &&
          typeof currentHeight === "number" &&
          Math.abs(currentWidth - nextWidth) < DRAFT_TRANSFORM_EPSILON &&
          Math.abs(currentHeight - nextHeight) < DRAFT_TRANSFORM_EPSILON
        ) {
          return state;
        }
      }
      return { project: updateLayerTransform(state.project, state.selectedLayerId, { width: nextWidth, height: nextHeight }) };
    }),

  removeSelectedLayer: () =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      const nextProject = removeLayer(state.project, state.selectedLayerId);
      return withCommittedProject(state, nextProject);
    }),

  moveSelectedLayerOrder: (direction) =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      const idx = state.project.layers.findIndex((layer) => layer.id === state.selectedLayerId);
      if (idx < 0) return state;
      const nextIndex = direction === "up" ? idx + 1 : idx - 1;
      return withCommittedProject(state, reorderLayer(state.project, state.selectedLayerId, nextIndex));
    }),

  selectLayer: (layerId) => set((state) => ({ selectedLayerId: resolveSelectedLayerId(state.project, layerId) })),

  setSelectedLayerRotation: (rotation) =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      const committed = state.history.present.layers.find((layer) => layer.id === state.selectedLayerId);
      if (committed && committed.rotation === rotation) return state;
      return withCommittedProject(state, updateLayerTransform(state.project, state.selectedLayerId, { rotation }));
    }),

  setSelectedLayerRotationDraft: (rotation) =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      const current = state.project.layers.find((layer) => layer.id === state.selectedLayerId);
      if (current && current.rotation === rotation) return state;
      return { project: updateLayerTransform(state.project, state.selectedLayerId, { rotation }) };
    }),

  copySelectedLayer: () =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId);
      if (!layer) return state;
      return { clipboardLayer: cloneLayer(layer) };
    }),

  cutSelectedLayer: () =>
    set((state) => {
      if (!state.selectedLayerId) return state;
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId);
      if (!layer) return state;
      const nextProject = removeLayer(state.project, state.selectedLayerId);
      return withCommittedProject(state, nextProject, { clipboardLayer: cloneLayer(layer) });
    }),

  pasteLayer: () =>
    set((state) => {
      if (!state.clipboardLayer) return state;
      const base = state.clipboardLayer;
      const pasted: Layer = { ...base, id: crypto.randomUUID(), x: base.x + 20, y: base.y + 20 };
      const nextProject = addLayer(state.project, pasted);
      return withCommittedProject(state, nextProject, { selectedLayerId: pasted.id });
    }),

  resetProject: () => {
    releaseProjectObjectUrls(get().project);
    const project = createProject("Untitled Project");
    const history = makeHistory(project);
    set({
      project,
      selectedLayerId: null,
      history,
      ...computeHistoryFlags(history),
      clipboardLayer: null,
      transaction: null,
      isDirty: false,
    });
  },

  saveCurrentProject: async () => {
    await upsertProject(normalizeProject(get().project));
    set({ isDirty: false });
  },

  loadProjectById: async (projectId) => {
    const project = await getProjectById(projectId);
    if (!project) return false;
    const normalized = normalizeProject(project);
    releaseProjectObjectUrls(get().project, getProjectAssetIds(normalized));
    set(makeStableProjectState(get().selectedLayerId, normalized));
    return true;
  },

  setProject: (project) => {
    const normalized = normalizeProject(project);
    releaseProjectObjectUrls(get().project, getProjectAssetIds(normalized));
    set(makeStableProjectState(get().selectedLayerId, normalized));
  },

  importProjectFromJson: (raw) => {
    const parsed = parseProjectFile(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const normalized = normalizeProject(parsed.project);
    releaseProjectObjectUrls(get().project, getProjectAssetIds(normalized));
    set(makeStableProjectState(get().selectedLayerId, normalized));
    return { ok: true };
  },

  exportProjectToJson: () => {
    const project = normalizeProject(get().project);
    const history = get().history;
    return serializeProjectFile(project, { checkpointCount: history.past.length + history.future.length });
  },

  importImageFromFile: async (file) => {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const name = file.name.replace(/\.[^/.]+$/, "") || "Image";
    const imageSize = await new Promise<{ width: number; height: number }>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () =>
        resolve({ width: DEFAULT_IMAGE_IMPORT.fallbackWidth, height: DEFAULT_IMAGE_IMPORT.fallbackHeight });
      image.src = dataUrl;
    });
    const layer = createLayer("image", {
      name,
      sourceUri: dataUrl,
      x: DEFAULT_IMAGE_IMPORT.offsetX,
      y: DEFAULT_IMAGE_IMPORT.offsetY,
      width: Math.max(1, Math.round(imageSize.width)),
      height: Math.max(1, Math.round(imageSize.height)),
    });

    set((state) => withCommittedProject(state, addLayer(state.project, layer), { selectedLayerId: layer.id }));
  },

  updateImageLayerSource: (layerId, sourceUri) =>
    set((state) => {
      if (!sourceUri) return state;
      const layer = state.project.layers.find((item) => item.id === layerId);
      if (!layer || layer.type !== "image") return state;
      if (layer.sourceUri === sourceUri) return state;
      const nextProject = updateLayerTransform(state.project, layerId, { sourceUri });
      return withCommittedProject(state, nextProject);
    }),

  setImageLayerFaceBlur: (layerId, faceBlur) =>
    set((state) => {
      const layer = state.project.layers.find((item) => item.id === layerId);
      if (!layer || layer.type !== "image") return state;
      const nextProject = updateLayerTransform(state.project, layerId, { faceBlur });
      return withCommittedProject(state, nextProject);
    }),

  setCanvasSize: (width, height) => set((state) => withCommittedProject(state, applyCanvasSize(state.project, width, height))),

  undo: () =>
    set((state) => {
      if (state.history.past.length === 0) return state;
      const past = [...state.history.past];
      const previous = past.pop();
      if (!previous) return state;
      const future = [state.history.present, ...state.history.future];
      const history = { past, present: cloneProject(previous), future };
      return {
        project: cloneProject(previous),
        history,
        selectedLayerId: resolveSelectedLayerId(previous, state.selectedLayerId),
        transaction: null,
        ...computeHistoryFlags(history),
        isDirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.history.future.length === 0) return state;
      const future = [...state.history.future];
      const next = future.shift();
      if (!next) return state;
      const past = capHistory([...state.history.past, state.history.present]);
      const history = { past, present: cloneProject(next), future };
      return {
        project: cloneProject(next),
        history,
        selectedLayerId: resolveSelectedLayerId(next, state.selectedLayerId),
        transaction: null,
        ...computeHistoryFlags(history),
        isDirty: true,
      };
    }),

  jumpToPast: (idx) =>
    set((state) => {
      const targetPastLength = Math.max(0, Math.min(state.history.past.length, idx - 1));
      if (state.history.past.length === targetPastLength) return state;
      const moved = state.history.past.slice(targetPastLength);
      if (moved.length === 0) return state;
      const previous = moved[0];
      if (!previous) return state;
      const past = state.history.past.slice(0, targetPastLength);
      const future = [state.history.present, ...moved.slice(1), ...state.history.future];
      const history = { past, present: cloneProject(previous), future };
      return {
        project: cloneProject(previous),
        history,
        selectedLayerId: resolveSelectedLayerId(previous, state.selectedLayerId),
        transaction: null,
        ...computeHistoryFlags(history),
        isDirty: true,
      };
    }),

  jumpToFuture: (idx) =>
    set((state) => {
      const targetFutureLength = Math.max(0, Math.min(state.history.future.length, idx));
      if (state.history.future.length === targetFutureLength) return state;
      const redoCount = state.history.future.length - targetFutureLength;
      const next = state.history.future[redoCount - 1];
      if (!next) return state;
      const consumedFuture = state.history.future.slice(0, redoCount - 1);
      const future = state.history.future.slice(redoCount);
      const past = capHistory([...state.history.past, state.history.present, ...consumedFuture]);
      const history = { past, present: cloneProject(next), future };
      return {
        project: cloneProject(next),
        history,
        selectedLayerId: resolveSelectedLayerId(next, state.selectedLayerId),
        transaction: null,
        ...computeHistoryFlags(history),
        isDirty: true,
      };
    }),
}));
