import { normalizeProject } from "@pien-studio/editor-core";
import { ProjectSchema, type Layer, type Project } from "@pien-studio/types";

const DB_NAME = "pien.db";
const DB_VERSION = 4;
const PROJECTS_STORE = "projects";
const ASSETS_STORE = "assets";
const ASSETS_BY_HASH_INDEX = "byHash";
const ASSET_LINKS_STORE = "assetLinks";
const LINKS_BY_PROJECT_INDEX = "byProjectId";
const LINKS_BY_ASSET_INDEX = "byAssetId";

type AssetRecord = {
  id: string;
  mimeType: string;
  blob: Blob;
  hash: string;
  createdAt: string;
  updatedAt: string;
};

type AssetLinkRecord = {
  id: string;
  projectId: string;
  layerId: string;
  assetId: string;
  updatedAt: string;
};

const objectUrlByAssetId = new Map<string, string>();

function getIndexedDb(): IDBFactory | null {
  if (typeof indexedDB === "undefined") return null;
  return indexedDB;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(): Promise<IDBDatabase | null> {
  const idb = getIndexedDb();
  if (!idb) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        const assetsStore = db.createObjectStore(ASSETS_STORE, { keyPath: "id" });
        assetsStore.createIndex(ASSETS_BY_HASH_INDEX, "hash", { unique: false });
      } else {
        const tx = request.transaction;
        if (tx) {
          const assetsStore = tx.objectStore(ASSETS_STORE);
          if (!assetsStore.indexNames.contains(ASSETS_BY_HASH_INDEX)) {
            assetsStore.createIndex(ASSETS_BY_HASH_INDEX, "hash", { unique: false });
          }
        }
      }

      if (!db.objectStoreNames.contains(ASSET_LINKS_STORE)) {
        const linksStore = db.createObjectStore(ASSET_LINKS_STORE, { keyPath: "id" });
        linksStore.createIndex(LINKS_BY_PROJECT_INDEX, "projectId", { unique: false });
        linksStore.createIndex(LINKS_BY_ASSET_INDEX, "assetId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Array.from(new Uint8Array(buffer)).slice(0, 64).join("-");
}

function makeLinkId(projectId: string, layerId: string): string {
  return `${projectId}:${layerId}`;
}

function isBinaryLayer(layer: Layer): boolean {
  return layer.type === "image" || layer.type === "sticker";
}

function inferMimeType(layer: Layer): string {
  if (layer.sourceUri?.startsWith("data:image/png")) return "image/png";
  if (layer.sourceUri?.startsWith("data:image/webp")) return "image/webp";
  return "image/jpeg";
}

async function putAssetFromLayer(assetStore: IDBObjectStore, layer: Layer): Promise<string | undefined> {
  if (!isBinaryLayer(layer)) return layer.assetId;

  if (layer.sourceUri?.startsWith("data:image/")) {
    const blob = await dataUrlToBlob(layer.sourceUri);
    const hash = await hashBlob(blob);
    const hashIndex = assetStore.index(ASSETS_BY_HASH_INDEX);
    const matching = (await requestToPromise(hashIndex.getAll(hash))) as AssetRecord[];
    const reusable = matching.find((asset) => asset.blob.size === blob.size);
    const now = new Date().toISOString();
    const id = layer.assetId ?? reusable?.id ?? crypto.randomUUID();

    await requestToPromise(
      assetStore.put({
        id,
        mimeType: blob.type || inferMimeType(layer),
        blob,
        hash,
        createdAt: reusable?.createdAt ?? now,
        updatedAt: now,
      } satisfies AssetRecord),
    );

    return id;
  }

  return layer.assetId;
}

type PreparedLayerAsset = {
  layerIndex: number;
  blob: Blob;
  hash: string;
  mimeType: string;
};

async function prepareLayerAssets(layers: Layer[]): Promise<PreparedLayerAsset[]> {
  const prepared: PreparedLayerAsset[] = [];
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index];
    if (!layer || !isBinaryLayer(layer) || !layer.sourceUri?.startsWith("data:image/")) continue;
    const blob = await dataUrlToBlob(layer.sourceUri);
    const hash = await hashBlob(blob);
    prepared.push({
      layerIndex: index,
      blob,
      hash,
      mimeType: blob.type || inferMimeType(layer),
    });
  }
  return prepared;
}

async function syncLinksForProject(db: IDBDatabase, project: Project): Promise<Set<string>> {
  const tx = db.transaction(ASSET_LINKS_STORE, "readwrite");
  const store = tx.objectStore(ASSET_LINKS_STORE);
  const byProject = store.index(LINKS_BY_PROJECT_INDEX);
  const existing = (await requestToPromise(byProject.getAll(project.id))) as AssetLinkRecord[];
  const existingMap = new Map(existing.map((link) => [link.id, link]));
  const now = new Date().toISOString();

  const referenced = new Set<string>();
  for (const layer of project.layers) {
    if (!layer.assetId || !isBinaryLayer(layer)) continue;
    const id = makeLinkId(project.id, layer.id);
    referenced.add(layer.assetId);
    await requestToPromise(
      store.put({
        id,
        projectId: project.id,
        layerId: layer.id,
        assetId: layer.assetId,
        updatedAt: now,
      } satisfies AssetLinkRecord),
    );
    existingMap.delete(id);
  }

  const removedAssetIds = new Set<string>();
  for (const stale of existingMap.values()) {
    removedAssetIds.add(stale.assetId);
    await requestToPromise(store.delete(stale.id));
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  for (const id of removedAssetIds) referenced.add(id);
  return referenced;
}

async function cleanupOrphansInternal(db: IDBDatabase, candidateAssetIds?: Iterable<string>): Promise<number> {
  const assetsTx = db.transaction([ASSETS_STORE, ASSET_LINKS_STORE], "readwrite");
  const assetsStore = assetsTx.objectStore(ASSETS_STORE);
  const linksStore = assetsTx.objectStore(ASSET_LINKS_STORE);
  const byAsset = linksStore.index(LINKS_BY_ASSET_INDEX);

  const candidates = candidateAssetIds
    ? Array.from(new Set(candidateAssetIds)).filter(Boolean)
    : ((await requestToPromise(assetsStore.getAllKeys())) as string[]);

  let removed = 0;
  for (const assetId of candidates) {
    const links = (await requestToPromise(byAsset.getAll(assetId))) as AssetLinkRecord[];
    if (links.length > 0) continue;
    await requestToPromise(assetsStore.delete(assetId));
    const url = objectUrlByAssetId.get(assetId);
    if (url?.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(url);
    }
    objectUrlByAssetId.delete(assetId);
    removed += 1;
  }

  await new Promise<void>((resolve, reject) => {
    assetsTx.oncomplete = () => resolve();
    assetsTx.onerror = () => reject(assetsTx.error);
    assetsTx.onabort = () => reject(assetsTx.error);
  });

  return removed;
}

async function persistProject(db: IDBDatabase, project: Project): Promise<Project> {
  const normalized = normalizeProject(project);
  const preparedAssets = await prepareLayerAssets(normalized.layers);
  const assetTx = db.transaction(ASSETS_STORE, "readwrite");
  const assetStore = assetTx.objectStore(ASSETS_STORE);
  const layers = [...normalized.layers];
  const hashIndex = assetStore.index(ASSETS_BY_HASH_INDEX);

  for (const prepared of preparedAssets) {
    const layer = layers[prepared.layerIndex];
    if (!layer) continue;
    const matching = (await requestToPromise(hashIndex.getAll(prepared.hash))) as AssetRecord[];
    const reusable = matching.find((asset) => asset.blob.size === prepared.blob.size);
    const now = new Date().toISOString();
    const id = layer.assetId ?? reusable?.id ?? crypto.randomUUID();

    await requestToPromise(
      assetStore.put({
        id,
        mimeType: prepared.mimeType,
        blob: prepared.blob,
        hash: prepared.hash,
        createdAt: reusable?.createdAt ?? now,
        updatedAt: now,
      } satisfies AssetRecord),
    );

    layers[prepared.layerIndex] = {
      ...layer,
      assetId: id,
      sourceUri: undefined,
    };
  }

  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index];
    if (!layer || !isBinaryLayer(layer)) continue;
    const assetId = await putAssetFromLayer(assetStore, layer);
    if (!assetId) continue;
    layers[index] = {
      ...layer,
      assetId,
      sourceUri: layer.sourceUri?.startsWith("data:image/") ? undefined : layer.sourceUri,
    };
  }

  await new Promise<void>((resolve, reject) => {
    assetTx.oncomplete = () => resolve();
    assetTx.onerror = () => reject(assetTx.error);
    assetTx.onabort = () => reject(assetTx.error);
  });

  const persisted = { ...normalized, layers };
  const candidateAssets = await syncLinksForProject(db, persisted);

  const projectTx = db.transaction(PROJECTS_STORE, "readwrite");
  await requestToPromise(projectTx.objectStore(PROJECTS_STORE).put(persisted));
  await new Promise<void>((resolve, reject) => {
    projectTx.oncomplete = () => resolve();
    projectTx.onerror = () => reject(projectTx.error);
    projectTx.onabort = () => reject(projectTx.error);
  });

  await cleanupOrphansInternal(db, candidateAssets);
  return persisted;
}

async function hydrateProject(db: IDBDatabase, project: Project): Promise<Project> {
  const tx = db.transaction(ASSETS_STORE, "readonly");
  const store = tx.objectStore(ASSETS_STORE);

  const layers = await Promise.all(
    project.layers.map(async (layer) => {
      if (!layer.assetId) return layer;
      const record = (await requestToPromise(store.get(layer.assetId))) as AssetRecord | undefined;
      if (!record?.blob) return layer;
      const existing = objectUrlByAssetId.get(layer.assetId);
      if (existing) return { ...layer, sourceUri: existing };
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        const objectUrl = URL.createObjectURL(record.blob);
        objectUrlByAssetId.set(layer.assetId, objectUrl);
        return { ...layer, sourceUri: objectUrl };
      }
      return layer;
    }),
  );

  return { ...project, layers };
}

export function releaseProjectObjectUrls(project: Project, keepAssetIds?: Iterable<string>): void {
  const keep = keepAssetIds ? new Set(Array.from(keepAssetIds).filter(Boolean)) : null;
  for (const layer of project.layers) {
    if (!layer.assetId) continue;
    if (keep?.has(layer.assetId)) continue;
    const url = objectUrlByAssetId.get(layer.assetId);
    if (!url) continue;
    if (url.startsWith("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(url);
    }
    objectUrlByAssetId.delete(layer.assetId);
  }
}

export async function cleanupOrphanAssets(): Promise<number> {
  const db = await openDatabase();
  if (!db) return 0;
  return cleanupOrphansInternal(db);
}

export function startAssetCleanupJob(intervalMs = 45_000): () => void {
  if (typeof window === "undefined") return () => undefined;
  const id = window.setInterval(() => {
    void cleanupOrphanAssets();
  }, intervalMs);
  return () => window.clearInterval(id);
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  const existing = await loadProjects();
  const keep = new Set(projects.map((project) => project.id));
  for (const project of existing) {
    if (!keep.has(project.id)) {
      await deleteProject(project.id);
    }
  }

  for (const project of projects) {
    await persistProject(db, project);
  }
}

export async function loadProjects(): Promise<Project[]> {
  const db = await openDatabase();
  if (!db) return [];

  const tx = db.transaction(PROJECTS_STORE, "readonly");
  const records = await requestToPromise(tx.objectStore(PROJECTS_STORE).getAll());
  const parsed = (records as unknown[])
    .map((record) => ProjectSchema.safeParse(record))
    .filter((result) => result.success)
    .map((result) => normalizeProject(result.data));

  const hydrated = await Promise.all(parsed.map((project) => hydrateProject(db, project)));
  void cleanupOrphansInternal(db);
  return hydrated.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const db = await openDatabase();
  if (!db) return null;

  const tx = db.transaction(PROJECTS_STORE, "readonly");
  const record = await requestToPromise(tx.objectStore(PROJECTS_STORE).get(projectId));
  const parsed = ProjectSchema.safeParse(record);
  if (!parsed.success) return null;
  return hydrateProject(db, normalizeProject(parsed.data));
}

export async function upsertProject(project: Project): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  await persistProject(db, { ...project, updatedAt: new Date().toISOString() });
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  const linksTx = db.transaction(ASSET_LINKS_STORE, "readwrite");
  const linksStore = linksTx.objectStore(ASSET_LINKS_STORE);
  const byProject = linksStore.index(LINKS_BY_PROJECT_INDEX);
  const links = (await requestToPromise(byProject.getAll(projectId))) as AssetLinkRecord[];
  for (const link of links) {
    await requestToPromise(linksStore.delete(link.id));
  }
  await new Promise<void>((resolve, reject) => {
    linksTx.oncomplete = () => resolve();
    linksTx.onerror = () => reject(linksTx.error);
    linksTx.onabort = () => reject(linksTx.error);
  });

  const projectTx = db.transaction(PROJECTS_STORE, "readwrite");
  await requestToPromise(projectTx.objectStore(PROJECTS_STORE).delete(projectId));
  await cleanupOrphansInternal(db, links.map((link) => link.assetId));
}

export async function duplicateProject(projectId: string): Promise<Project | null> {
  const source = await getProjectById(projectId);
  if (!source) return null;
  const now = new Date().toISOString();
  const copy: Project = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} Copy`,
    createdAt: now,
    updatedAt: now,
    layers: source.layers.map((layer) => ({ ...layer, id: crypto.randomUUID() })),
  };
  await upsertProject(copy);
  return getProjectById(copy.id);
}
