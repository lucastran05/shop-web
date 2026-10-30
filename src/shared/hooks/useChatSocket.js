import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiBaseURL } from "../api";

export function useChatSocket({ userId, enabled = true, onMessage, onReady }) {
  const callbacks = useRef({ onMessage, onReady });
  useEffect(() => {
    callbacks.current = { onMessage, onReady };
  }, [onMessage, onReady]);
  const current = useRef(null);
  const requests = useRef(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!enabled || !userId) return;
    let disposed = false,
      retry,
      socket,
      failures = 0;
    const rejectPending = () => {
      for (const pending of requests.current.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Mất kết nối chat. Vui lòng thử lại."));
      }
      requests.current.clear();
    };
    const connect = () => {
      if (disposed || !api.http.hasSession()) return;
      const token = api.http.getAccessToken();
      const url = new URL(`${apiBaseURL}/api/v1/chat/socket`);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(url);
      current.current = { socket, ready: false };
      socket.onopen = () => {
        if (!disposed) socket.send(JSON.stringify({ type: "auth", token }));
      };
      socket.onmessage = (event) => {
        if (disposed) return;
        let frame;
        try {
          frame = JSON.parse(event.data);
        } catch {
          return;
        }
        if (frame.type === "ready") {
          current.current.ready = true;
          failures = 0;
          setConnected(true);
          setError(null);
          Promise.resolve(callbacks.current.onReady?.()).catch(() => {
            if (!disposed)
              setError("Không thể tải lịch sử tin nhắn. Vui lòng mở lại chat.");
          });
        } else if (frame.type === "message" || frame.type === "removed")
          callbacks.current.onMessage?.(frame);
        else if (frame.type === "ack" || frame.type === "error") {
          const pending = requests.current.get(frame.requestId);
          if (!pending) return;
          clearTimeout(pending.timer);
          requests.current.delete(frame.requestId);
          if (frame.type === "ack") pending.resolve(frame.data);
          else
            pending.reject(
              Object.assign(new Error(frame.message), { status: frame.status }),
            );
        }
      };
      socket.onclose = async (event) => {
        if (disposed) return;
        current.current = null;
        setConnected(false);
        rejectPending();
        if (event.code === 4403) {
          setError("Bạn không có quyền sử dụng chat. Vui lòng đăng nhập lại.");
          return;
        }
        setError("Mất kết nối chat. Đang kết nối lại…");
        if (event.code === 4401 && token === api.http.getAccessToken()) {
          try {
            await api.http.refreshTokens();
          } catch {
            if (!api.http.hasSession()) {
              if (!disposed)
                setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
              return;
            }
          }
        }
        if (!disposed)
          retry = setTimeout(connect, Math.min(1000 * 2 ** failures++, 30000));
      };
    };
    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      current.current = null;
      socket?.close();
      rejectPending();
    };
  }, [enabled, userId]);
  const request = useCallback((type, payload = {}) => {
    const connection = current.current;
    if (!connection?.ready || connection.socket.readyState !== WebSocket.OPEN)
      return Promise.reject(new Error("Chat chưa kết nối. Vui lòng thử lại."));
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        requests.current.delete(requestId);
        reject(
          new Error(
            "Chưa nhận được xác nhận tin nhắn. Vui lòng kiểm tra hội thoại.",
          ),
        );
      }, 10000);
      requests.current.set(requestId, { resolve, reject, timer });
      try {
        connection.socket.send(JSON.stringify({ type, requestId, ...payload }));
      } catch (error) {
        clearTimeout(timer);
        requests.current.delete(requestId);
        reject(error);
      }
    });
  }, []);
  return { request, connected: enabled && !!userId && connected, error };
}
