import React, { useEffect, useState } from "react";
import CameraStream from "./components/CameraStream";
import StatusPanel from "./components/StatusPanel";
import useWebHooks from "./hooks/useWebSocket";

function App() {
  useWebHooks({
    url: "wss://api.wildfire.moveto.kr/ws",
    onOpen: () => {
      console.log("Connected to WebSocket");
    },
    onMessage: (event) => {
      const raw = event.data.split("overall_risk")[1];
      const onlyLetters = raw
        .replace(/[^a-zA-Z]/g, "")
        .replaceAll("n", "")
        .trim();
      console.log(
        onlyLetters,
        ["low", "medium", "high", "critical"].includes(onlyLetters)
      );
      setRisk(
        ["low", "medium", "high", "critical"].includes(onlyLetters)
          ? onlyLetters
          : "low"
      );

      addLog(
        new Date()
          .toISOString()
          .replace(/[-]/g, "")
          .split(".")[0]
          .replace("T", " ") +
          " Risk Level By Server: " +
          (["low", "medium", "high", "critical"].includes(onlyLetters)
            ? onlyLetters
            : "low")
      );
    },

    onError: (error) => {
      console.error("Socket Error:", error);
    },
    onClose: () => {
      console.log("Connection Ended");
    },
  });
  const [location, setLocation] = useState("Checking...");
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [risk, setRisk] = useState("low");
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
          setLocation("Cannot get location");
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
      );
    } else {
      setLocation("Geolocation not supported");
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
        <StatusPanel
          logMessages={logMessages}
          location={location}
          risk={risk}
        />
      </div>
    </div>
  );
}

export default App;
