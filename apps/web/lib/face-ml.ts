export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  gender?: "male" | "female";
  genderScore?: number;
  score?: number;
};

export type FaceDetectionResult = {
  faces: FaceBox[];
  naturalWidth: number;
  naturalHeight: number;
};

type FaceDetectionWorkerRequest = {
  id: number;
  sourceUri: string;
};

type FaceDetectionWorkerResponse = {
  id: number;
  result?: FaceDetectionResult;
  error?: string;
};

let faceDetectionWorker: Worker | null = null;
let faceDetectionWorkerDisabled = false;
let workerRequestId = 0;
const workerRequests = new Map<
  number,
  {
    resolve: (result: FaceDetectionResult) => void;
    reject: (error: Error) => void;
  }
>();

export async function detectFaceBoxes(
  sourceUri: string,
): Promise<FaceDetectionResult> {
  if (typeof Worker === "undefined" || faceDetectionWorkerDisabled) {
    throw new Error("Face detection worker is unavailable");
  }

  try {
    return await detectFaceBoxesInWorker(sourceUri);
  } catch (err) {
    faceDetectionWorkerDisabled = true;
    faceDetectionWorker?.terminate();
    faceDetectionWorker = null;
    console.warn("[face-detection] worker failed:", err);
    throw err;
  }
}

function detectFaceBoxesInWorker(
  sourceUri: string,
): Promise<FaceDetectionResult> {
  const worker = getFaceDetectionWorker();
  const id = ++workerRequestId;

  return new Promise<FaceDetectionResult>((resolve, reject) => {
    workerRequests.set(id, { resolve, reject });
    worker.postMessage({ id, sourceUri } satisfies FaceDetectionWorkerRequest);
  });
}

function getFaceDetectionWorker(): Worker {
  if (faceDetectionWorker) return faceDetectionWorker;

  faceDetectionWorker = new Worker(
    new URL("./face-detection-worker.ts", import.meta.url),
    { type: "module" },
  );
  faceDetectionWorker.onmessage = (
    event: MessageEvent<FaceDetectionWorkerResponse>,
  ) => {
    const request = workerRequests.get(event.data.id);
    if (!request) return;
    workerRequests.delete(event.data.id);
    if (event.data.error) {
      faceDetectionWorkerDisabled = true;
      faceDetectionWorker?.terminate();
      faceDetectionWorker = null;
      request.reject(new Error(event.data.error));
      return;
    }

    if (!event.data.result) {
      request.reject(new Error("Face detection worker returned no result"));
      return;
    }

    request.resolve(event.data.result);
  };
  faceDetectionWorker.onerror = (event) => {
    const error = new Error(event.message || "Face detection worker failed");
    faceDetectionWorkerDisabled = true;
    workerRequests.forEach((request) => request.reject(error));
    workerRequests.clear();
    faceDetectionWorker?.terminate();
    faceDetectionWorker = null;
  };

  return faceDetectionWorker;
}
