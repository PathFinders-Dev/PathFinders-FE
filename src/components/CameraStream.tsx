import React, { useEffect, useRef, useState } from "react";
import YoloWorker from "../workers/yolo.worker.ts";
import { Prediction } from "../types/workerTypes";

interface CameraStreamProps {
  addLog: (message: string) => void;
}

const CameraStream: React.FC<CameraStreamProps> = ({ addLog }) => {
  const classes: string[] = ["Fire", "Smoke"];
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);

  useEffect(() => {
    const worker = new YoloWorker();
    workerRef.current = worker;
    worker.postMessage({ type: "init" });

    worker.onmessage = (event: MessageEvent) => {
      const { type, predictions, message } = event.data;

      if (type === "ready") setReady(true);
      if (type === "prediction") drawPredictions(predictions);
      if (type === "error") console.error("[Worker:yolo Error]", message);
    };

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          requestAnimationFrame(predictLoop);
        };
      }
    };
    startCamera();
  }, [ready]);

  const predictLoop = () => {
    if (
      !ready ||
      !videoRef.current ||
      !workerRef.current ||
      !hiddenCanvasRef.current
    ) {
      requestAnimationFrame(predictLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      requestAnimationFrame(predictLoop);
      return;
    }

    const now = Date.now();
    if (now - lastInferenceTimeRef.current < 300) {
      requestAnimationFrame(predictLoop);
      return;
    }
    lastInferenceTimeRef.current = now;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    workerRef.current.postMessage({
      type: "predict",
      imageData,
      inputWidth: canvas.width,
      inputHeight: canvas.height,
    });

    requestAnimationFrame(predictLoop);
  };

  // const drawPredictions = (predictions: Prediction[]) => {
  //   const canvas = canvasRef.current;
  //   const video = videoRef.current;
  //   if (!canvas || !video) return;

  //   const ctx = canvas.getContext("2d", { willReadFrequently: true });
  //   if (!ctx) return;

  //   const inputWidth = video.videoWidth;
  //   const inputHeight = video.videoHeight;
  //   const displayWidth = canvas.offsetWidth;
  //   const displayHeight = canvas.offsetHeight;
  //   const scaleX = displayWidth / inputWidth;
  //   const scaleY = displayHeight / inputHeight;

  //   canvas.width = inputWidth;
  //   canvas.height = inputHeight;

  //   ctx.clearRect(0, 0, canvas.width, canvas.height);
  //   ctx.lineWidth = 2;
  //   ctx.font = "16px sans-serif";
  //   ctx.strokeStyle = "lime";
  //   ctx.fillStyle = "lime";

  //   predictions.forEach((pred) => {
  //     const [x, y, boxWidth, boxHeight] = pred.bbox;
  //     ctx.strokeRect(x, y, boxWidth, boxHeight);
  //     ctx.fillText(
  //       `${classes[pred.classId]} (${(pred.score * 100).toFixed(1)}%)`,
  //       x,
  //       y - 5
  //     );
  //     addLog(
  //       `Detected ${classes[pred.classId]} with ${(pred.score * 100).toFixed(
  //         1
  //       )}% at [${Math.round(x)}, ${Math.round(y)}, ${Math.round(
  //         boxWidth
  //       )}, ${Math.round(boxHeight)}]`
  //     );
  //   });
  // };

  const drawPredictions = (predictions: Prediction[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // 비율 계산
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let renderWidth = 0;
    let renderHeight = 0;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasAspect > videoAspect) {
      // 캔버스가 더 넓음 → 세로를 꽉 채우고 가로에 여백 생김
      renderHeight = canvasHeight;
      renderWidth = videoAspect * renderHeight;
      offsetX = (canvasWidth - renderWidth) / 2;
      offsetY = 0;
    } else {
      // 캔버스가 더 높음 → 가로를 꽉 채우고 세로에 여백 생김
      renderWidth = canvasWidth;
      renderHeight = renderWidth / videoAspect;
      offsetX = 0;
      offsetY = (canvasHeight - renderHeight) / 2;
    }

    // canvas 크기 재설정 (주의: 이건 픽셀 크기 기준)
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.font = "16px sans-serif";
    ctx.strokeStyle = "lime";
    ctx.fillStyle = "lime";

    predictions.forEach((pred) => {
      const [x, y, boxWidth, boxHeight] = pred.bbox;

      // bbox를 화면에 맞게 변환
      const scaleX = renderWidth / videoWidth;
      const scaleY = renderHeight / videoHeight;

      const drawX = offsetX + x * scaleX;
      const drawY = offsetY + y * scaleY;
      const drawWidth = boxWidth * scaleX;
      const drawHeight = boxHeight * scaleY;

      ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
      ctx.fillText(
        `${classes[pred.classId]} (${(pred.score * 100).toFixed(1)}%)`,
        drawX,
        drawY - 5
      );

      addLog(
        `Detected ${classes[pred.classId]} with ${(pred.score * 100).toFixed(
          1
        )}% at [${Math.round(drawX)}, ${Math.round(drawY)}, ${Math.round(
          drawWidth
        )}, ${Math.round(drawHeight)}]`
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
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain", // ✅ 깨짐 방지
        }}
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
