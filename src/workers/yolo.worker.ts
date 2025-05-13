/* eslint-disable no-restricted-globals */
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

const classNames = ["fire", "smoke"];
const scoreThreshold = 0.7;

let model: tf.GraphModel | null = null;

function iou(boxA: number[], boxB: number[]): number {
  const [xA, yA, wA, hA] = boxA;
  const [xB, yB, wB, hB] = boxB;

  const x1 = Math.max(xA, xB);
  const y1 = Math.max(yA, yB);
  const x2 = Math.min(xA + wA, xB + wB);
  const y2 = Math.min(yA + hA, yB + hB);

  const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const boxAArea = wA * hA;
  const boxBArea = wB * hB;

  const unionArea = boxAArea + boxBArea - interArea;

  return interArea / (unionArea + 1e-6);
}

function nms(detections: any[], iouThreshold = 0.5, maxDetections = 20) {
  let sorted = detections.sort((a, b) => b.score - a.score);
  const keep: any[] = [];

  while (sorted.length > 0 && keep.length < maxDetections) {
    const best = sorted.shift()!;
    keep.push(best);

    sorted = sorted.filter((det) => {
      const iouVal = iou(best.bbox, det.bbox);
      return iouVal < iouThreshold;
    });
  }

  return keep;
}

self.onmessage = async (event: MessageEvent) => {
  const { type, imageData, inputWidth, inputHeight } = event.data;

  if (type === "init") {
    try {
      await tf.setBackend("webgl");
      tf.env().set("WEBGL_PACK", false);
      tf.env().set("WEBGL_DELETE_TEXTURE_THRESHOLD", 0);
      await tf.ready();
      model = await tf.loadGraphModel("/models/yolov8n_tfjs/model.json");
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", message: "YOLO 모델 로딩 실패" });
    }
    return;
  }

  if (type === "predict" && model && imageData) {
    try {
      const inputTensor = tf.tidy(() =>
        tf.browser
          .fromPixels(imageData)
          .resizeBilinear([640, 640])
          .div(255.0)
          .expandDims(0)
      );

      const outputTensor = model.execute(inputTensor) as tf.Tensor; // (1,6,8400)
      const transposed = outputTensor.transpose([0, 2, 1]); // (1,8400,6)

      const outputData = await transposed.array(); // outputData: number[][][]

      const rawPredictions: any[] = [];

      for (let i = 0; i < outputData[0].length; i++) {
        const row = outputData[0][i];
        const [x, y, w, h, conf0, conf1] = row;
        const classScores = [conf0, conf1];
        const bestClassIndex = conf0 > conf1 ? 0 : 1;
        const bestScore = Math.max(conf0, conf1);

        if (bestScore > scoreThreshold) {
          rawPredictions.push({
            classId: bestClassIndex,
            class: classNames[bestClassIndex],
            score: bestScore,
            bbox: [
              (x - w / 2) * (inputWidth / 640),
              (y - h / 2) * (inputHeight / 640),
              w * (inputWidth / 640),
              h * (inputHeight / 640),
            ],
          });
        }
      }

      const finalDetections = nms(rawPredictions, 0.5, 20);

      self.postMessage({ type: "prediction", predictions: finalDetections });

      inputTensor.dispose();
      outputTensor.dispose();
      transposed.dispose();
    } catch (err) {
      self.postMessage({ type: "error", message: (err as Error).message });
    }
  }
};
