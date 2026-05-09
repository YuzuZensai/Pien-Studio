export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  gender?: "male" | "female";
  genderScore?: number;
  score?: number;
};

export async function detectFaceBoxes(image: HTMLImageElement): Promise<FaceBox[]> {
  const tf = await import("@tensorflow/tfjs");
  await tf.ready();

  const faceapi = await import("@vladmandic/face-api");
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights"),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri("https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights"),
    faceapi.nets.ageGenderNet.loadFromUri("https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights"),
  ]);

  const TinyFaceDetectorOptions = (faceapi as unknown as { TinyFaceDetectorOptions: new (o: object) => object }).TinyFaceDetectorOptions;

  const passes = [
    { inputSize: 320, scoreThreshold: 0.5 },
    { inputSize: 416, scoreThreshold: 0.45 },
    { inputSize: 512, scoreThreshold: 0.5 },
    { inputSize: 608, scoreThreshold: 0.45 },
    { inputSize: 736, scoreThreshold: 0.4 },
    { inputSize: 864, scoreThreshold: 0.35 },
  ];

  type FaceApiDet = {
    gender: string;
    genderProbability: number;
    detection: { box: { x: number; y: number; width: number; height: number } };
  };

  const allDets = await Promise.all(
    passes.map(({ inputSize, scoreThreshold }) =>
      (faceapi as unknown as {
        detectAllFaces: (
          img: HTMLImageElement,
          options: { inputSize: number; scoreThreshold: number }
        ) => Promise<FaceApiDet[]>
      }).detectAllFaces(image, new TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
        .withFaceLandmarks(true)
        .withAgeAndGender()
    )
  );

  const flat = allDets.flat();
  if (flat.length === 0) return [];

  function iou(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
    const ix = Math.max(a.x, b.x);
    const iy = Math.max(a.y, b.y);
    const ix2 = Math.min(a.x + a.width, b.x + b.width);
    const iy2 = Math.min(a.y + b.height, b.y + b.height);
    const inter = Math.max(0, ix2 - ix) * Math.max(0, iy2 - iy);
    const union = a.width * a.height + b.width * b.height - inter;
    return union > 0 ? inter / union : 0;
  }

  function avgGender(dets: FaceApiDet[]): { gender: "male" | "female" | undefined; score: number } {
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
        (a.detection?.box?.width ?? 0) * (a.detection?.box?.height ?? 0)
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