import type { FaceBox, FaceDetectionResult } from "./face-ml";

type FaceDetectionWorkerRequest = {
  id: number;
  sourceUri: string;
};

type FaceDetectionWorkerResponse = {
  id: number;
  result?: FaceDetectionResult;
  error?: string;
};

type TinyFaceOptions = { inputSize: number; scoreThreshold: number };
type FaceApiDet = {
  gender: string;
  genderProbability: number;
  detection: { box: { x: number; y: number; width: number; height: number } };
};
type FaceApiRuntime = {
  tf: {
    browser: {
      fromPixels: (pixels: ImageData) => Tensor3DLike;
    };
  };
  faceapi: {
    detectAllFaces: (
      img: unknown,
      options: TinyFaceOptions,
    ) => {
      withFaceLandmarks: (useTinyLandmarkNet: boolean) => {
        withAgeAndGender: () => Promise<FaceApiDet[]>;
      };
    };
  };
  TinyFaceDetectorOptions: new (options: TinyFaceOptions) => TinyFaceOptions;
};
type Tensor3DLike = {
  dispose: () => void;
};

let faceApiModelsPromise: Promise<FaceApiRuntime> | null = null;

self.onmessage = async (event: MessageEvent<FaceDetectionWorkerRequest>) => {
  const { id, sourceUri } = event.data;
  let bitmap: ImageBitmap | null = null;
  let tensor: Tensor3DLike | null = null;

  try {
    const runtime = await loadFaceApiModels();
    bitmap = await loadImageBitmap(sourceUri);
    const imageData = await imageBitmapToImageData(bitmap);
    tensor = runtime.tf.browser.fromPixels(imageData);
    const faces = await runDetectorPasses(
      tensor,
      runtime.faceapi,
      runtime.TinyFaceDetectorOptions,
    );
    const result = {
      faces,
      naturalWidth: bitmap.width,
      naturalHeight: bitmap.height,
    };

    self.postMessage({ id, result } satisfies FaceDetectionWorkerResponse);
  } catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    } satisfies FaceDetectionWorkerResponse);
  } finally {
    tensor?.dispose();
    bitmap?.close();
  }
};

async function loadFaceApiModels(): Promise<FaceApiRuntime> {
  if (faceApiModelsPromise) return faceApiModelsPromise;

  faceApiModelsPromise = (async () => {
    const tf = await import("@tensorflow/tfjs");
    await tf.ready();

    const faceapi = await import("@vladmandic/face-api");
    faceapi.env.setEnv({
      Canvas: OffscreenCanvas,
      CanvasRenderingContext2D: OffscreenCanvasRenderingContext2D,
      Image: class WorkerImage {},
      ImageData,
      Video: class WorkerVideo {},
      createCanvasElement: () => new OffscreenCanvas(1, 1),
      createImageElement: () => {
        throw new Error(
          "HTMLImageElement is unavailable in face detection worker",
        );
      },
      createVideoElement: () => {
        throw new Error(
          "HTMLVideoElement is unavailable in face detection worker",
        );
      },
      fetch,
      readFile: () => {
        throw new Error("readFile is unavailable in face detection worker");
      },
    } as unknown as Parameters<typeof faceapi.env.setEnv>[0]);

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(
        "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights",
      ),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(
        "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights",
      ),
      faceapi.nets.ageGenderNet.loadFromUri(
        "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights",
      ),
    ]);

    const TinyFaceDetectorOptions = (
      faceapi as unknown as {
        TinyFaceDetectorOptions: new (
          options: TinyFaceOptions,
        ) => TinyFaceOptions;
      }
    ).TinyFaceDetectorOptions;

    return {
      tf,
      faceapi,
      TinyFaceDetectorOptions,
    } as unknown as FaceApiRuntime;
  })();

  return faceApiModelsPromise;
}

async function loadImageBitmap(sourceUri: string): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "undefined") {
    throw new Error("createImageBitmap is unavailable in this browser worker");
  }

  const response = await fetch(sourceUri);
  if (!response.ok) {
    throw new Error(
      `Failed to load image for face detection: ${response.status}`,
    );
  }

  return createImageBitmap(await response.blob());
}

async function imageBitmapToImageData(bitmap: ImageBitmap): Promise<ImageData> {
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("OffscreenCanvas is unavailable in this browser worker");
  }

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not prepare image for face detection");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

async function runDetectorPasses(
  image: Tensor3DLike,
  faceapi: FaceApiRuntime["faceapi"],
  TinyFaceDetectorOptions: FaceApiRuntime["TinyFaceDetectorOptions"],
): Promise<FaceBox[]> {
  const passes = [
    { inputSize: 320, scoreThreshold: 0.5 },
    { inputSize: 416, scoreThreshold: 0.45 },
    { inputSize: 512, scoreThreshold: 0.5 },
    { inputSize: 608, scoreThreshold: 0.45 },
    { inputSize: 736, scoreThreshold: 0.4 },
    { inputSize: 864, scoreThreshold: 0.35 },
  ];

  const allDets = await Promise.all(
    passes.map(({ inputSize, scoreThreshold }) =>
      faceapi
        .detectAllFaces(
          image,
          new TinyFaceDetectorOptions({ inputSize, scoreThreshold }),
        )
        .withFaceLandmarks(true)
        .withAgeAndGender(),
    ),
  );

  const flat = allDets.flat();
  if (flat.length === 0) return [];

  function iou(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ) {
    const ix = Math.max(a.x, b.x);
    const iy = Math.max(a.y, b.y);
    const ix2 = Math.min(a.x + a.width, b.x + b.width);
    const iy2 = Math.min(a.y + a.height, b.y + b.height);
    const inter = Math.max(0, ix2 - ix) * Math.max(0, iy2 - iy);
    const union = a.width * a.height + b.width * b.height - inter;
    return union > 0 ? inter / union : 0;
  }

  function avgGender(dets: FaceApiDet[]): {
    gender: "male" | "female" | undefined;
    score: number;
  } {
    let maleScore = 0;
    let femaleScore = 0;
    let count = 0;
    for (const det of dets) {
      if (det.gender === "male") maleScore += det.genderProbability;
      else if (det.gender === "female") femaleScore += det.genderProbability;
      count++;
    }
    if (count === 0) return { gender: undefined, score: 0 };
    const avgMale = maleScore / count;
    const avgFemale = femaleScore / count;
    if (avgMale > avgFemale) return { gender: "male", score: avgMale };
    if (avgFemale > avgMale) return { gender: "female", score: avgFemale };
    return { gender: undefined, score: 0 };
  }

  const clusters: FaceApiDet[][] = [];
  for (const det of flat) {
    const b = det.detection?.box;
    if (!b) continue;
    let matched = false;
    for (const cluster of clusters) {
      if (cluster.some((c) => iou(c.detection.box, b) > 0.4)) {
        cluster.push(det);
        matched = true;
        break;
      }
    }
    if (!matched) clusters.push([det]);
  }

  return clusters.map((group) => {
    const largest = [...group].sort(
      (a, b) =>
        (b.detection?.box?.width ?? 0) * (b.detection?.box?.height ?? 0) -
        (a.detection?.box?.width ?? 0) * (a.detection?.box?.height ?? 0),
    )[0];
    const box = largest.detection.box;
    const { gender, score: genderScore } = avgGender(group);

    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      gender,
      genderScore,
    };
  });
}
