import { z } from "zod";

export const LayerTypeSchema = z.enum(["image", "text", "sticker"]);

export const FaceBlurMethodSchema = z.enum(["gaussian", "pixelate", "censor"]);

export const FaceBlurRegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  sourceWidth: z.number().optional(),
  sourceHeight: z.number().optional(),
  censorColor: z.string().optional(),
});

export const FaceBlurSettingsSchema = z.object({
  method: FaceBlurMethodSchema,
  amount: z.number().int().min(4).max(40),
  regions: z.array(FaceBlurRegionSchema),
  censorColor: z.string().optional(),
});

export const LayerSchema = z.object({
  id: z.string(),
  type: LayerTypeSchema,
  name: z.string().optional(),
  assetId: z.string().optional(),
  sourceUri: z.string().optional(),
  faceBlur: FaceBlurSettingsSchema.optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().default(1),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
});

export const AspectRatioSchema = z.enum([
  "1:1",    // square feed
  "4:5",    // portrait 4:5
  "9:16",   // story / vertical
  "16:9",   // widescreen
  "4:3",    // classic photo
  "3:2",    // landscape photo
  "free",   // custom
]);

export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export const CanvasSizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  unit: z.enum(["px", "in", "cm"]).default("px"),
});

export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  canvas: CanvasSizeSchema,
  aspectRatio: AspectRatioSchema,
  layers: z.array(LayerSchema),
});

export const PresetAspectRatioSchema = z.object({
  label: z.string(),
  value: AspectRatioSchema,
  width: z.number(),
  height: z.number(),
});

export type PresetAspectRatio = z.infer<typeof PresetAspectRatioSchema>;

export const PRESET_CANVAS_SIZES: PresetAspectRatio[] = [
  { label: "Square (1:1)", value: "1:1", width: 1080, height: 1080 },
  { label: "Portrait (4:5)", value: "4:5", width: 1080, height: 1350 },
  { label: "Story (9:16)", value: "9:16", width: 1080, height: 1920 },
  { label: "Widescreen (16:9)", value: "16:9", width: 1920, height: 1080 },
  { label: "Photo (4:3)", value: "4:3", width: 1440, height: 1080 },
  { label: "Classic (3:2)", value: "3:2", width: 1620, height: 1080 },
];

export const DeviceSessionSchema = z.object({
  deviceId: z.string().min(4),
  locale: z.enum(["en", "th", "ja"]),
});

export const ProjectFileV1Schema = z.object({
  format: z.literal("pien.project"),
  version: z.literal(1),
  exportedAt: z.string(),
  app: z.object({
    name: z.literal("pien.studio"),
    platform: z.enum(["web", "mobile", "desktop"]).default("web"),
  }),
  project: ProjectSchema,
  assets: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["image", "sticker", "font", "frame"]),
      name: z.string(),
      uri: z.string(),
      checksum: z.string().optional(),
    }),
  ),
  history: z.object({
    checkpointCount: z.number().int().nonnegative().default(0),
  }),
});

export const ProjectFileSchema = ProjectFileV1Schema;

export type Project = z.infer<typeof ProjectSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type LayerType = z.infer<typeof LayerTypeSchema>;
export type FaceBlurMethod = z.infer<typeof FaceBlurMethodSchema>;
export type FaceBlurRegion = z.infer<typeof FaceBlurRegionSchema>;
export type FaceBlurSettings = z.infer<typeof FaceBlurSettingsSchema>;
export type ProjectFile = z.infer<typeof ProjectFileSchema>;
