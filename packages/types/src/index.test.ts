import { describe, expect, it } from "vitest";
import { DeviceSessionSchema, ProjectFileSchema, ProjectSchema } from "./index";

describe("types schemas", () => {
  it("accepts valid device session payload", () => {
    const result = DeviceSessionSchema.safeParse({
      deviceId: "abcd1234",
      locale: "ja",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown locale", () => {
    const result = DeviceSessionSchema.safeParse({
      deviceId: "abcd1234",
      locale: "fr",
    });
    expect(result.success).toBe(false);
  });

  it("validates project shape", () => {
    const result = ProjectSchema.safeParse({
      id: "p1",
      title: "test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aspectRatio: "4:5",
      canvas: { width: 1080, height: 1350, unit: "px" },
      layers: [],
    });
    expect(result.success).toBe(true);
  });

  it("validates versioned project file envelope", () => {
    const now = new Date().toISOString();
    const result = ProjectFileSchema.safeParse({
      format: "pien.project",
      version: 1,
      exportedAt: now,
      app: { name: "pien.studio", platform: "web" },
      project: {
        id: "p1",
        title: "test",
        createdAt: now,
        updatedAt: now,
        aspectRatio: "4:5",
        canvas: { width: 1080, height: 1350, unit: "px" },
        layers: [],
      },
      assets: [],
      history: { checkpointCount: 0 },
    });
    expect(result.success).toBe(true);
  });
});
