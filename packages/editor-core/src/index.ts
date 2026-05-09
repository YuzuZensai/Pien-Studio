import {
  PRESET_CANVAS_SIZES,
  ProjectFileSchema,
  type AspectRatio,
  type FaceBlurSettings,
  type Layer,
  type Project,
  type ProjectFile,
} from "@pien-studio/types";

const DEFAULT_ASPECT: AspectRatio = "4:5";

function defaultCanvas(aspect: AspectRatio) {
  const preset = PRESET_CANVAS_SIZES.find((p) => p.value === aspect) ?? PRESET_CANVAS_SIZES[1];
  return { width: preset.width, height: preset.height, unit: "px" as const };
}

export function createProject(title: string, aspect: AspectRatio = DEFAULT_ASPECT): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    canvas: defaultCanvas(aspect),
    aspectRatio: aspect,
    layers: [],
  };
}

function withUpdatedTimestamp(project: Project, layers: Layer[]): Project {
  return { ...project, layers, updatedAt: new Date().toISOString() };
}

type Delta = { dx: number; dy: number };
export type TransformPatch = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  sourceUri?: string;
  faceBlur?: FaceBlurSettings;
};

export type LayerFactoryOptions = {
  id?: string;
  name?: string;
  sourceUri?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type EditorOperation =
  | { type: "addLayer"; layer: Layer }
  | { type: "removeLayer"; layerId: string }
  | { type: "moveLayer"; layerId: string; delta: Delta }
  | { type: "updateLayerTransform"; layerId: string; patch: TransformPatch }
  | { type: "reorderLayer"; layerId: string; toIndex: number }
  | { type: "setCanvasSize"; width: number; height: number; unit?: "px" | "in" | "cm" };

export function normalizeProject(project: Project): Project {
  const normalizedLayers = project.layers.map((layer) => ({
    ...layer,
    width: layer.width !== undefined ? Math.max(1, Math.round(layer.width)) : undefined,
    height: layer.height !== undefined ? Math.max(1, Math.round(layer.height)) : undefined,
    scale: Number.isFinite(layer.scale) ? layer.scale : 1,
    rotation: Number.isFinite(layer.rotation) ? layer.rotation : 0,
    opacity: Number.isFinite(layer.opacity) ? Math.max(0, Math.min(1, layer.opacity)) : 1,
    faceBlur:
      layer.faceBlur && Array.isArray(layer.faceBlur.regions)
        ? {
            method: layer.faceBlur.method,
            amount: Math.max(4, Math.min(40, Math.round(layer.faceBlur.amount))),
            regions: layer.faceBlur.regions.map((region) => ({
              x: Number.isFinite(region.x) ? region.x : 0,
              y: Number.isFinite(region.y) ? region.y : 0,
              width: Math.max(1, Number.isFinite(region.width) ? region.width : 1),
              height: Math.max(1, Number.isFinite(region.height) ? region.height : 1),
              sourceWidth: Number.isFinite(region.sourceWidth) ? region.sourceWidth : undefined,
              sourceHeight: Number.isFinite(region.sourceHeight) ? region.sourceHeight : undefined,
              censorColor: region.censorColor,
            })),
            censorColor: layer.faceBlur.censorColor,
          }
        : undefined,
  }));

  return {
    ...project,
    canvas: {
      width: Math.max(1, Math.round(project.canvas.width)),
      height: Math.max(1, Math.round(project.canvas.height)),
      unit: project.canvas.unit,
    },
    layers: normalizedLayers,
  };
}

export function addLayer(project: Project, layer: Layer): Project {
  return withUpdatedTimestamp(project, [...project.layers, layer]);
}

export function createLayer(type: Layer["type"], options: LayerFactoryOptions = {}): Layer {
  return {
    id: options.id ?? crypto.randomUUID(),
    type,
    name: options.name,
    sourceUri: options.sourceUri,
    x: options.x ?? 110,
    y: options.y ?? 90,
    width: options.width,
    height: options.height,
    scale: 1,
    rotation: 0,
    opacity: 1,
  };
}

export function removeLayer(project: Project, layerId: string): Project {
  const layers = project.layers.filter((layer) => layer.id !== layerId);
  return withUpdatedTimestamp(project, layers);
}

export function moveLayer(project: Project, layerId: string, delta: Delta): Project {
  const layers = project.layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    return { ...layer, x: layer.x + delta.dx, y: layer.y + delta.dy };
  });
  return withUpdatedTimestamp(project, layers);
}

export function updateLayerTransform(project: Project, layerId: string, patch: TransformPatch): Project {
  const layers = project.layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer));
  return withUpdatedTimestamp(project, layers);
}

export function reorderLayer(project: Project, layerId: string, toIndex: number): Project {
  const fromIndex = project.layers.findIndex((l) => l.id === layerId);
  if (fromIndex < 0) return project;
  const layers = [...project.layers];
  const [picked] = layers.splice(fromIndex, 1);
  if (!picked) return project;
  const bounded = Math.max(0, Math.min(toIndex, layers.length));
  layers.splice(bounded, 0, picked);
  return withUpdatedTimestamp(project, layers);
}

export function setCanvasSize(project: Project, width: number, height: number, unit: "px" | "in" | "cm" = "px"): Project {
  return {
    ...project,
    canvas: {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
      unit,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function applyOperation(project: Project, operation: EditorOperation): Project {
  switch (operation.type) {
    case "addLayer":
      return addLayer(project, operation.layer);
    case "removeLayer":
      return removeLayer(project, operation.layerId);
    case "moveLayer":
      return moveLayer(project, operation.layerId, operation.delta);
    case "updateLayerTransform":
      return updateLayerTransform(project, operation.layerId, operation.patch);
    case "reorderLayer":
      return reorderLayer(project, operation.layerId, operation.toIndex);
    case "setCanvasSize":
      return setCanvasSize(project, operation.width, operation.height, operation.unit);
    default:
      return project;
  }
}

export function serializeProjectFile(project: Project, options?: { checkpointCount?: number }): string {
  const document: ProjectFile = {
    format: "pien.project",
    version: 1,
    exportedAt: new Date().toISOString(),
    app: { name: "pien.studio", platform: "web" },
    project,
    assets: [],
    history: {
      checkpointCount: options?.checkpointCount ?? 0,
    },
  };

  return JSON.stringify(document, null, 2);
}

export function parseProjectFile(raw: string): { ok: true; project: Project } | { ok: false; error: string } {
  try {
    const data = JSON.parse(raw) as unknown;
    const parsedEnvelope = ProjectFileSchema.safeParse(data);
    if (parsedEnvelope.success) {
      return { ok: true, project: normalizeProject(parsedEnvelope.data.project) };
    }

    return { ok: false, error: "Invalid project format" };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}
