import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "./tokenStorage";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

type WebSocketOptions = {
  onMessage?: (data: any) => void;
  shouldReconnect?: boolean;
};

export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);

  const onMessageRef = useRef<WebSocketOptions["onMessage"]>(options.onMessage);
  const shouldReconnectRef = useRef<WebSocketOptions["shouldReconnect"]>(options.shouldReconnect);
  const connectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onMessageRef.current = options.onMessage;
    shouldReconnectRef.current = options.shouldReconnect;
  }, [options.onMessage, options.shouldReconnect]);

  const connect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (!url) {
      setConnectionState("disconnected");
      return;
    }

    // Close any existing socket.
    try {
      socketRef.current?.close();
    } catch {
      // ignore
    }

    setConnectionState("connecting");

    (async () => {
      const token = await getAccessToken();
      if (!token) {
        setConnectionState("error");
        return;
      }

      let wsUrl: URL;
      try {
        wsUrl = new URL(url);
      } catch {
        setConnectionState("error");
        return;
      }
      wsUrl.searchParams.set("token", token);

      const socket = new WebSocket(wsUrl.toString());
      socketRef.current = socket;

      socket.onopen = () => {
        setConnectionState("connected");
        reconnectCountRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {
          // ignore parse errors
        }
      };

      socket.onclose = (event) => {
        // 4001 is used server-side for auth failures.
        if (event.code === 4001) {
          setConnectionState("error");
          return;
        }
        setConnectionState("disconnected");
        if (shouldReconnectRef.current !== false) {
          const backoff = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current += 1;
            connectRef.current?.();
          }, backoff);
        }
      };

      socket.onerror = () => {
        setConnectionState("error");
      };
    })().catch(() => {
      setConnectionState("error");
    });
  }, [url]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      try {
        socketRef.current?.close();
      } catch {
        // ignore
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  const send = useCallback((type: string, data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  }, []);

  const reconnectNow = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectCountRef.current = 0;
    try {
      socketRef.current?.close();
    } catch {
      // ignore
    }
    connectRef.current?.();
  }, []);

  return { connectionState, send, reconnectNow };
}

