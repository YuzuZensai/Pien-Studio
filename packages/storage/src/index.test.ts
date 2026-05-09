import { beforeAll, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { getProjectById, loadProjects } from "./index";
import type { Project } from "@pien-studio/types";

const DB_NAME = "pien.db";
const DB_VERSION = 4;
const PROJECTS_STORE = "projects";
const ASSETS_STORE = "assets";
const ASSETS_BY_HASH_INDEX = "byHash";
const ASSET_LINKS_STORE = "assetLinks";
const LINKS_BY_PROJECT_INDEX = "byProjectId";
const LINKS_BY_ASSET_INDEX = "byAssetId";

function ensureSchema(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
    db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
  }

  if (!db.objectStoreNames.contains(ASSETS_STORE)) {
    const assetsStore = db.createObjectStore(ASSETS_STORE, { keyPath: "id" });
    assetsStore.createIndex(ASSETS_BY_HASH_INDEX, "hash", { unique: false });
  }

  if (!db.objectStoreNames.contains(ASSET_LINKS_STORE)) {
    const linksStore = db.createObjectStore(ASSET_LINKS_STORE, { keyPath: "id" });
    linksStore.createIndex(LINKS_BY_PROJECT_INDEX, "projectId", { unique: false });
    linksStore.createIndex(LINKS_BY_ASSET_INDEX, "assetId", { unique: false });
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seedProject(project: Project): Promise<void> {
  const openRequest = indexedDB.open(DB_NAME, DB_VERSION);
  openRequest.onupgradeneeded = () => ensureSchema(openRequest.result);
  const db = await requestToPromise(openRequest);
  const tx = db.transaction(PROJECTS_STORE, "readwrite");
  await requestToPromise(tx.objectStore(PROJECTS_STORE).put(project));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function readRawProject(projectId: string): Promise<Project | undefined> {
  const openRequest = indexedDB.open(DB_NAME, DB_VERSION);
  openRequest.onupgradeneeded = () => ensureSchema(openRequest.result);
  const db = await requestToPromise(openRequest);
  const tx = db.transaction(PROJECTS_STORE, "readonly");
  const record = (await requestToPromise(tx.objectStore(PROJECTS_STORE).get(projectId))) as Project | undefined;
  db.close();
  return record;
}

function makeMalformedProject(id: string): Project {
  const now = new Date().toISOString();
  return {
    id,
    title: "seed",
    createdAt: now,
    updatedAt: now,
    aspectRatio: "4:5",
    canvas: { width: 1200, height: 1200, unit: "px" },
    layers: [
      {
        id: "layer-1",
        type: "image",
        x: 10,
        y: 10,
        width: 10.4,
        height: 11.6,
        scale: 0,
        rotation: 720.4,
        opacity: 0.75,
      },
    ],
  };
}

function makeLegacyFaceBlurProject(id: string): Project {
  const now = new Date().toISOString();
  return {
    id,
    title: "legacy",
    createdAt: now,
    updatedAt: now,
    aspectRatio: "4:5",
    canvas: { width: 1200, height: 1500, unit: "px" },
    layers: [
      {
        id: "image-legacy",
        type: "image",
        x: 30,
        y: 40,
        width: 600,
        height: 800,
        scale: 1,
        rotation: 0,
        opacity: 1,
        faceBlur: {
          method: "gaussian",
          amount: 14,
          regions: [{ x: 120, y: 160, width: 180, height: 200 }],
        },
      },
    ],
  };
}

describe("storage read flows", () => {
  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  it("loadProjects hydrates normalized values without persisting writes", async () => {
    const source = makeMalformedProject("project-load");
    await seedProject(source);

    const byId = await getProjectById(source.id);
    expect(byId?.canvas.height).toBe(1200);
    expect(byId?.layers[0]?.height).toBe(12);

    const rawAfterById = await readRawProject(source.id);
    expect(rawAfterById?.layers[0]?.height).toBe(11.6);

    const loaded = await loadProjects();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.canvas.width).toBe(1200);
    expect(loaded[0]?.layers[0]?.width).toBe(10);
    expect(loaded[0]?.layers[0]?.height).toBe(12);

    const raw = await readRawProject(source.id);
    expect(raw?.canvas.width).toBe(1200);
    expect(raw?.layers[0]?.width).toBe(10.4);
    expect(raw?.layers[0]?.height).toBe(11.6);
  });

  it("loads legacy projects without source dimensions through storage and normalize flow", async () => {
    const source = makeLegacyFaceBlurProject("project-legacy-faceblur");
    await seedProject(source);

    const loaded = await getProjectById(source.id);
    const region = loaded?.layers[0]?.faceBlur?.regions[0];
    expect(region).toBeDefined();
    expect(region?.x).toBe(120);
    expect(region?.sourceWidth).toBeUndefined();
    expect(region?.sourceHeight).toBeUndefined();

    const listed = await loadProjects();
    const listedRegion = listed[0]?.layers[0]?.faceBlur?.regions[0];
    expect(listedRegion?.width).toBe(180);
    expect(listedRegion?.sourceWidth).toBeUndefined();
    expect(listedRegion?.sourceHeight).toBeUndefined();
  }, 15_000);
});
