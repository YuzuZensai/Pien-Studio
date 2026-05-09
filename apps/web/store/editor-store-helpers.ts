import type { Layer, Project } from "@pien-studio/types";

export const HISTORY_LIMIT = 120;

export type HistoryState = {
  past: Project[];
  present: Project;
  future: Project[];
};

export function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneProject(project: Project): Project {
  return deepClone(project);
}

export function cloneLayer(layer: Layer): Layer {
  return deepClone(layer);
}

export function makeHistory(project: Project): HistoryState {
  return { past: [], present: cloneProject(project), future: [] };
}

export function computeHistoryFlags(history: HistoryState) {
  return { canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}

export function capHistory(items: Project[]): Project[] {
  if (items.length <= HISTORY_LIMIT) return items;
  return items.slice(items.length - HISTORY_LIMIT);
}

export function resolveSelectedLayerId(project: Project, preferred: string | null): string | null {
  if (preferred && project.layers.some((layer) => layer.id === preferred)) return preferred;
  return project.layers[0]?.id ?? null;
}
