/* eslint-disable no-restricted-globals */
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

// 모델은 전역에서 하나만 로딩
let model: cocoSsd.ObjectDetection | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, imageData } = event.data;

  if (type === "init") {
    if (!model) {
      model = await cocoSsd.load();
      self.postMessage({ type: "ready" });
    }
    return;
  }

  if (type === "predict" && model && imageData) {
    try {
      const tensor = tf.browser.fromPixels(imageData);
      const predictions = await model.detect(tensor);
      self.postMessage({ type: "prediction", predictions });
    } catch (error) {
      self.postMessage({ type: "error", message: (error as Error).message });
    }
  }
};
