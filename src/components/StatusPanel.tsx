import React, { useEffect, useState } from "react";

interface StatusPanelProps {
  logMessages: string[];
}

const StatusPanel: React.FC<StatusPanelProps> = ({ logMessages }) => {
  const [location, setLocation] = useState<string>("측정 중...");
  const [networkStatus, setNetworkStatus] = useState<string>(
    navigator.onLine ? "온라인" : "오프라인"
  );
  // const [logMessages, setLogMessages] = useState<string[]>([]);
  const [alertStatus, setAlertStatus] = useState<string>("없음");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        },
        (err) => {
          setLocation("위치 접근 불가");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocation("Geolocation 지원 안됨");
    }
  }, []);

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

  // 추후 socket 연결 시 사용할 dummy 로그 시뮬레이션 (테스트용)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setLogMessages((prev) => [
  //       `백엔드로부터 응답 수신 [${new Date().toLocaleTimeString()}]`,
  //       ...prev.slice(0, 19),
  //     ]);
  //   }, 5000);
  //   return () => clearInterval(interval);
  // }, []);

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
