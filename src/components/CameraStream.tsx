import React, { useEffect, useRef, useState } from "react";
import DetectionWorker from "../workers/detection.worker.ts";

type Prediction = {
  bbox: [number, number, number, number];
  class: string;
  score: number;
};

interface CameraStreamProps {
  addLog: (message: string) => void;
}

const CameraStream: React.FC<CameraStreamProps> = ({ addLog }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const lastInferenceTimeRef = useRef<number>(0);

  useEffect(() => {
    const worker = new DetectionWorker();
    workerRef.current = worker;
    worker.postMessage({ type: "init" });

    worker.onmessage = (event: MessageEvent) => {
      const { type, predictions, message } = event.data;

      if (type === "ready") {
        console.log("[Worker] 모델 로드 완료");
        setReady(true);
      }

      if (type === "prediction" && predictions) {
        const filtered = predictions.filter((p: Prediction) => p.score > 0.4);
        drawPredictions(filtered);
      }

      if (type === "error") {
        console.error("[Worker Error]:", message);
      }
    };

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("카메라 접근 실패:", err);
      }
    };

    startCamera();
  }, []);

  useEffect(() => {
    const predictLoop = () => {
      if (
        !ready ||
        !videoRef.current ||
        !hiddenCanvasRef.current ||
        !workerRef.current
      ) {
        requestAnimationFrame(predictLoop);
        return;
      }

      const now = Date.now();
      const last = lastInferenceTimeRef.current;

      if (now - last > 300) {
        lastInferenceTimeRef.current = now;

        const video = videoRef.current;
        const canvas = hiddenCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        workerRef.current.postMessage({
          type: "predict",
          imageData,
          inputWidth: canvas.width,
          inputHeight: canvas.height,
        });
      }

      requestAnimationFrame(predictLoop);
    };

    requestAnimationFrame(predictLoop);
  }, [ready]);

  const drawPredictions = (predictions: Prediction[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    const scaleX = displayWidth / videoWidth;
    const scaleY = displayHeight / videoHeight;

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.lineWidth = 2;
    ctx.font = "16px sans-serif";

    predictions.forEach((pred) => {
      const [x, y, boxWidth, boxHeight] = pred.bbox;
      ctx.strokeStyle = "lime";
      ctx.fillStyle = "lime";
      ctx.strokeRect(
        x * scaleX,
        y * scaleY,
        boxWidth * scaleX,
        boxHeight * scaleY
      );
      ctx.fillText(
        `${pred.class} (${(pred.score * 100).toFixed(1)}%)`,
        x * scaleX,
        y * scaleY - 5
      );
      addLog(
        `Detected ${pred.class} with score ${(pred.score * 100).toFixed(
          1
        )}% at [${Math.round(x)}, ${Math.round(y)}, ${Math.round(
          boxWidth
        )}, ${Math.round(boxHeight)}]`
      );
    });
  };

  return (
    <div style={{ position: "relative", width: "66.666vw", height: "100vh" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
      <canvas ref={hiddenCanvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default CameraStream;
