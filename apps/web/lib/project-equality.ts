import type { Project } from "@pien-studio/types";

export function hasProjectChanged(left: Project, right: Project): boolean {
  if (left.id !== right.id) return true;
  if (left.title !== right.title) return true;
  if (left.createdAt !== right.createdAt) return true;
  if (left.updatedAt !== right.updatedAt) return true;
  if (left.aspectRatio !== right.aspectRatio) return true;
  if (left.canvas.width !== right.canvas.width || left.canvas.height !== right.canvas.height || left.canvas.unit !== right.canvas.unit) {
    return true;
  }
  if (left.layers.length !== right.layers.length) return true;

  for (let index = 0; index < left.layers.length; index += 1) {
    const a = left.layers[index];
    const b = right.layers[index];
    if (!a || !b) return true;
    if (
      a.id !== b.id ||
      a.type !== b.type ||
      a.name !== b.name ||
      a.assetId !== b.assetId ||
      a.sourceUri !== b.sourceUri ||
      a.x !== b.x ||
      a.y !== b.y ||
      a.width !== b.width ||
      a.height !== b.height ||
      a.scale !== b.scale ||
      a.rotation !== b.rotation ||
      a.opacity !== b.opacity
    ) {
      return true;
    }

    const blurA = a.faceBlur;
    const blurB = b.faceBlur;
    if (!blurA && !blurB) continue;
    if (!blurA || !blurB) return true;
    if (blurA.method !== blurB.method || blurA.amount !== blurB.amount || blurA.censorColor !== blurB.censorColor) return true;
    if (blurA.regions.length !== blurB.regions.length) return true;
    for (let regionIndex = 0; regionIndex < blurA.regions.length; regionIndex += 1) {
      const regionA = blurA.regions[regionIndex];
      const regionB = blurB.regions[regionIndex];
      if (!regionA || !regionB) return true;
      if (
        regionA.x !== regionB.x ||
        regionA.y !== regionB.y ||
        regionA.width !== regionB.width ||
        regionA.height !== regionB.height ||
        regionA.censorColor !== regionB.censorColor
      ) {
        return true;
      }
    }
  }

  return false;
}
