import { useEffect, useState } from "react";

/**
 * WebSocket을 사용하기 위한 커스텀 훅
 * @param url - WebSocket 서버 주소
 * @param onOpen - 소켓 연결 성공 시 호출되는 콜백 함수
 * @param onMessage - 메시지 수신 시 호출되는 콜백 함수
 * @param onError - 소켓 오류 발생 시 호출되는 콜백 함수
 * @param onClose - 소켓 연결 종료 시 호출되는 콜백 함수
 */
export default function useWebHooks({
  url,
  onOpen,
  onMessage,
  onError,
  onClose,
}: {
  url: string;
  onOpen: () => void;
  onMessage: (event: MessageEvent) => void;
  onError: (error: Event) => void;
  onClose: () => void;
}) {
  const [socket, setSocket] = useState<WebSocket>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = onOpen;

    ws.onmessage = onMessage;

    ws.onerror = onError;

    ws.onclose = onClose;

    setSocket(ws);

    // 컴포넌트 언마운트 시 소켓 닫기
    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = (message: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  };

  return { sendMessage };
}
