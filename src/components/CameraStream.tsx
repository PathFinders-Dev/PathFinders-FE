import React, { useEffect, useRef, useState } from "react";
import YoloWorker from "../workers/yolo.worker.ts";
import { Prediction } from "../types/workerTypes";
import axios from "axios";

type PredictionData = {
  name: string;
  probability: number;
  screenWidth: number;
  screenHeight: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  time: string;
  latitude: number;
  longitude: number;
};

interface CameraStreamProps {
  location: string;
  addLog: (message: string) => void;
}

const CameraStream: React.FC<CameraStreamProps> = ({ location, addLog }) => {
  const classes: string[] = ["Fire", "Smoke"];
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"camera" | "example">("camera");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);

  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const worker = new YoloWorker();
    workerRef.current = worker;
    worker.postMessage({ type: "init" });

    worker.onmessage = (event: MessageEvent) => {
      const { type, predictions, message } = event.data;

      if (type === "ready") setReady(true);
      if (type === "prediction") drawPredictions(predictions, location);
      if (type === "error") console.error("[Worker:yolo Error]", message);
    };

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (mode === "camera") {
      startCamera();
    } else if (mode === "example") {
      startExample();
    }
  }, [ready, mode]);

  const postPrediction = async (data: PredictionData[]) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/object-detections`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Prediction data sent successfully:", response.data);
    } catch (error) {}
  };
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        requestAnimationFrame(predictLoop);
      };
      videoRef.current.play();
    }
  };

  const startExample = async () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      videoRef.current.srcObject = null;
      videoRef.current.src = "/test-fire01.mp4";
      videoRef.current.loop = true;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        requestAnimationFrame(predictLoop);
      };
    }
  };

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

  const drawPredictions = (predictions: Prediction[], location: string) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let renderWidth = 0;
    let renderHeight = 0;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasAspect > videoAspect) {
      renderHeight = canvasHeight;
      renderWidth = videoAspect * renderHeight;
      offsetX = (canvasWidth - renderWidth) / 2;
      offsetY = 0;
    } else {
      renderWidth = canvasWidth;
      renderHeight = renderWidth / videoAspect;
      offsetX = 0;
      offsetY = (canvasHeight - renderHeight) / 2;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.font = "16px sans-serif";
    ctx.strokeStyle = "lime";
    ctx.fillStyle = "lime";

    predictions.forEach((pred) => {
      const [x, y, boxWidth, boxHeight] = pred.bbox;

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

      const predictionData: PredictionData[] = [
        {
          name: classes[pred.classId],
          probability: pred.score * 100,
          screenWidth: canvasWidth,
          screenHeight: canvasHeight,
          x1: Math.round(drawX),
          y1: Math.round(drawY),
          x2: Math.round(drawX + drawWidth),
          y2: Math.round(drawY + drawHeight),
          time: new Date().toISOString(),
          latitude: parseFloat(locationRef.current.split(",")[0]),
          longitude: parseFloat(locationRef.current.split(",")[1].trim()),
        },
      ];
      postPrediction(predictionData);

      // addLog(
      //   `Detected ${classes[pred.classId]} with ${(pred.score * 100).toFixed(
      //     1
      //   )}% at [${Math.round(drawX)}, ${Math.round(drawY)}, ${Math.round(
      //     drawWidth
      //   )}, ${Math.round(drawHeight)}]`
      // );
      addLog(
        `Detected ${classes[pred.classId]} with ${(pred.score * 100).toFixed(
          1
        )}% at ${videoRef.current?.currentTime.toFixed(2)} seconds`
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
          objectFit: "contain",
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

      <button
        onClick={() =>
          setMode((prev) => (prev === "camera" ? "example" : "camera"))
        }
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          zIndex: 10,
          padding: "10px 20px",
          fontSize: "16px",
        }}
      >
        {mode === "camera" ? "예시 영상으로 전환" : "카메라로 전환"}
      </button>
    </div>
  );
};

export default CameraStream;
