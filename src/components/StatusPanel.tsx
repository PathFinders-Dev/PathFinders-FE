import React, { useEffect, useState } from "react";

interface StatusPanelProps {
  location: string;
  logMessages: string[];
}

const StatusPanel: React.FC<StatusPanelProps> = ({ location, logMessages }) => {
  const [networkStatus, setNetworkStatus] = useState<string>(
    navigator.onLine ? "온라인" : "오프라인"
  );
  const [alertStatus, setAlertStatus] = useState<string>("없음");

  useEffect(() => {
    const updateNetwork = () => {
      setNetworkStatus(navigator.onLine ? "온라인" : "오프라인");
    };
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "#1a1a1a",
        color: "#eee",
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <h2>Status Panel</h2>
      <p>
        <strong>📍 위치:</strong> {location}
      </p>
      <p>
        <strong>🌐 네트워크 상태:</strong> {networkStatus}
      </p>
      <p>
        <strong>🚨 Alert 상태:</strong> {alertStatus}
      </p>
      <div style={{ marginTop: "1rem" }}>
        <h3>📡 실시간 로그</h3>
        <div
          style={{
            maxHeight: "60vh",
            overflowY: "auto",
            backgroundColor: "#222",
            padding: "0.5rem",
            borderRadius: "4px",
          }}
        >
          {logMessages.map((msg, idx) => (
            <p key={idx} style={{ margin: 0, fontSize: "0.9rem" }}>
              • {msg}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;
