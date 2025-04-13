export type WorkerInputMessage =
  | { type: "init" }
  | { type: "predict"; imageData: ImageData };

export type Prediction = {
  classId: number;
  score: number;
  bbox: [number, number, number, number];
};

export type WorkerOutputMessage =
  | { type: "ready" }
  | { type: "prediction"; predictions: Prediction[] }
  | { type: "error"; error: string };
