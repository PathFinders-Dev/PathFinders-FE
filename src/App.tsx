import React, { useState } from "react";
import CameraStream from "./components/CameraStream";
import StatusPanel from "./components/StatusPanel";

function App() {
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
