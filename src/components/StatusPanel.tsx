import React, { useEffect, useState } from "react";

interface StatusPanelProps {
  location: string;
  logMessages: string[];
  risk: string;
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  location,
  logMessages,
  risk,
}) => {
  const [networkStatus, setNetworkStatus] = useState<string>(
    navigator.onLine ? "Online" : "Offline"
  );

  useEffect(() => {
    const updateNetwork = () => {
      setNetworkStatus(navigator.onLine ? "Online" : "Offline");
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
        <strong>📍 Location:</strong> {location}
      </p>
      <p>
        <strong>🌐 Network Status:</strong> {networkStatus}
      </p>
      <p
        style={{
          backgroundColor:
            risk === "critical"
              ? "#6F42C1"
              : risk === "high"
                ? "#DC3545"
                : risk === "medium"
                  ? "#FD7E14"
                  : "#28A745",
        }}
      >
        <strong>🚨 Alert Status:</strong> {risk}
      </p>
      <div style={{ marginTop: "1rem" }}>
        <h3>📡 Live Logs</h3>
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
