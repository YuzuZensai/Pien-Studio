import type { Layer } from "@pien-studio/types";

type FaceDetection = { x: number; y: number; width: number; height: number; label?: string };

type Viewport = { x: number; y: number; scale: number };

export function buildFaceLabelOverlays(
  layers: Layer[],
  faceOverlayLayerId: string,
  faceDetections: FaceDetection[],
  viewport: Viewport,
) {
  const layer = layers.find((item) => item.id === faceOverlayLayerId);
  if (!layer) return [];

  const isImage = layer.type === "image";
  const layerWidth = layer.width ?? (isImage ? Math.round(200 * layer.scale) : undefined);
  const layerHeight = layer.height ?? (isImage ? Math.round(150 * layer.scale) : undefined);
  if (!layerWidth || !layerHeight) return [];

  const centerX = layer.x + layerWidth / 2;
  const centerY = layer.y + layerHeight / 2;
  const radians = (layer.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const placed: Array<{ left: number; top: number; width: number; height: number }> = [];

  return faceDetections.map((face, index) => {
    const worldX = layer.x + face.x;
    const worldY = layer.y + face.y;
    const dx = worldX - centerX;
    const dy = worldY - centerY;
    const rotatedWorldX = centerX + dx * cos - dy * sin;
    const rotatedWorldY = centerY + dx * sin + dy * cos;

    const text = face.label ?? `Person ${index + 1}`;
    const estimatedWidth = Math.max(72, Math.min(260, text.length * 6 + 14));
    const estimatedHeight = 18;
    const left = viewport.x + rotatedWorldX * viewport.scale;
    let top = viewport.y + rotatedWorldY * viewport.scale - 22;

    while (
      placed.some((rect) => {
        const intersectsX = left < rect.left + rect.width && left + estimatedWidth > rect.left;
        const intersectsY = top < rect.top + rect.height && top + estimatedHeight > rect.top;
        return intersectsX && intersectsY;
      })
    ) {
      top -= estimatedHeight + 4;
    }

    placed.push({ left, top, width: estimatedWidth, height: estimatedHeight });
    return { id: `${layer.id}-face-label-${index}`, text, left, top };
  });
}
