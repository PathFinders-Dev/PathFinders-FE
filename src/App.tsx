import React, { useState } from "react";
import CameraStream from "./components/CameraStream";
import StatusPanel from "./components/StatusPanel";
import useWebHooks from "./hooks/useWebSocket";

function App() {
  useWebHooks({
    url: "https://api.wildfire.moveto.kr/ws",
    onOpen: () => {
      console.log("소켓 연결 성공");
    },
    onMessage: (event) => {
      console.log("메시지 수신:", event.data);
    },
    onError: (error) => {
      console.error("소켓 오류:", error);
    },
    onClose: () => {
      console.log("소켓 연결 종료");
    },
  });
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const addLog = (message: string) => {
    setLogMessages((prev) => [message, ...prev.slice(0, 49)]);
  };
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: 2, backgroundColor: "#000" }}>
        <CameraStream addLog={addLog} />
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: "#fff",
          borderLeft: "2px solid #eee",
        }}
      >
        <StatusPanel logMessages={logMessages} />
      </div>
    </div>
  );
}

export default App;
