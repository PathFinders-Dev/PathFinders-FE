import React, { useEffect, useState } from "react";
import CameraStream from "./components/CameraStream";
import StatusPanel from "./components/StatusPanel";
import useWebHooks from "./hooks/useWebSocket";

function App() {
  useWebHooks({
    url: "wss://api.wildfire.moveto.kr/ws",
    onOpen: () => {
      console.log("소켓 연결 성공");
    },
    onMessage: (event) => {
      console.log("메시지 수신:", event.data);
      addLog(
        new Date()
          .toISOString()
          .split(".")[0]
          .replace("-", "")
          .replace("-", "")
          .replace("T", " ") +
          " 서버 통신 위험도 " +
          JSON.parse(event.data).dangerLevel,
      );
    },
    onError: (error) => {
      console.error("소켓 오류:", error);
    },
    onClose: () => {
      console.log("소켓 연결 종료");
    },
  });
  const [location, setLocation] = useState("측정 중...");
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const addLog = (message: string) => {
    setLogMessages((prev) => [message, ...prev.slice(0, 49)]);
  };
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (err) => {
          setLocation("위치 접근 불가");
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 },
      );
    } else {
      setLocation("Geolocation 지원 안됨");
    }

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 2, backgroundColor: "#000" }}>
        <CameraStream addLog={addLog} location={location} />
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: "#fff",
          borderLeft: "2px solid #eee",
        }}
      >
        <StatusPanel logMessages={logMessages} location={location} />
      </div>
    </div>
  );
}

export default App;
