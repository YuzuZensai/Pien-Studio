import type {
  FaceDetectionOverlay,
  FacePreview,
} from "../hooks/use-face-detection";

export async function loadImageFromUri(
  uri: string,
): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = uri;
  });
  if (!image.naturalWidth || !image.naturalHeight) return null;
  return image;
}

export function toFaceDetectionOverlays(
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    gender?: string;
    genderScore?: number;
  }>,
  image: { naturalWidth: number; naturalHeight: number },
  layerWidth?: number,
  layerHeight?: number,
): FaceDetectionOverlay[] {
  const width = layerWidth ?? image.naturalWidth;
  const height = layerHeight ?? image.naturalHeight;
  const scaleX = width / image.naturalWidth;
  const scaleY = height / image.naturalHeight;

  return faces.map((face, index) => {
    const genderLabel = face.gender ?? "unknown";
    const scoreLabel =
      face.genderScore != null ? `${Math.round(face.genderScore * 100)}%` : "";
    const label = scoreLabel
      ? `Person ${index + 1} - ${genderLabel} ${scoreLabel}`
      : `Person ${index + 1} - ${genderLabel}`;

    return {
      x: face.x * scaleX,
      y: face.y * scaleY,
      width: face.width * scaleX,
      height: face.height * scaleY,
      sourceWidth: image.naturalWidth,
      sourceHeight: image.naturalHeight,
      label,
      gender: face.gender,
      genderScore: face.genderScore,
    };
  });
}

export function buildFacePreviews(
  image: HTMLImageElement,
  faceDetections: FaceDetectionOverlay[],
  layerWidth?: number,
  layerHeight?: number,
): FacePreview[] {
  const width = layerWidth ?? image.naturalWidth;
  const height = layerHeight ?? image.naturalHeight;
  const toImageScaleX = image.naturalWidth / Math.max(1, width);
  const toImageScaleY = image.naturalHeight / Math.max(1, height);

  return faceDetections
    .map((face, index) => {
      const sx = Math.max(0, Math.floor(face.x * toImageScaleX));
      const sy = Math.max(0, Math.floor(face.y * toImageScaleY));
      const sw = Math.max(1, Math.floor(face.width * toImageScaleX));
      const sh = Math.max(1, Math.floor(face.height * toImageScaleY));
      const ex = Math.min(image.naturalWidth, sx + sw);
      const ey = Math.min(image.naturalHeight, sy + sh);
      const cw = Math.max(1, ex - sx);
      const ch = Math.max(1, ey - sy);
      const canvas = document.createElement("canvas");
      const targetWidth = 84;
      const scale = targetWidth / cw;
      canvas.width = targetWidth;
      canvas.height = Math.max(1, Math.round(ch * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return { id: `face-${index + 1}`, src: "" };
      ctx.drawImage(image, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
      return {
        id: `face-${index + 1}`,
        src: canvas.toDataURL("image/jpeg", 0.9),
      };
    })
    .filter((preview) => preview.src);
}
