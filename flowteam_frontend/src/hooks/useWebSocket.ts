"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { clearTokens } from "@/lib/auth";
// Import the shared refresh lock so WS auth failures and HTTP 401s
// don't race each other and double-consume a rotating refresh token.
import { refreshAccessToken } from "@/lib/auth";

type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

interface WebSocketOptions {
  onMessage?: (data: any) => void;
  shouldReconnect?: boolean;
}

async function tryRefreshToken(): Promise<boolean> {
  const newToken = await refreshAccessToken();
  if (newToken) return true;
  clearTokens();
  return false;
}

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
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Already connected.
      return;
    }
    try {
      socketRef.current?.close();
    } catch {
      // ignore
    }

    if (!url) {
      setConnectionState("disconnected");
      return;
    }

    setConnectionState("connecting");

    let wsUrl: URL;
    try {
      wsUrl = new URL(url);
    } catch (e) {
      setConnectionState("error");
      return;
    }
    
    console.log(`[WS] Connecting to: ${wsUrl.origin}${wsUrl.pathname}`);

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
      } catch (e) {
        console.error("WS Message Parse Error:", e);
      }
    };

    socket.onclose = (event) => {
      if (event.code === 4001) {
        // Auth failure — try refreshing the JWT once, then reconnect.
        // If refresh fails the user will be redirected to login by the API interceptor.
        setConnectionState("connecting");
        tryRefreshToken().then((refreshed) => {
          if (refreshed) {
            reconnectCountRef.current = 0;
            connectRef.current?.();
          } else {
            setConnectionState("error");
          }
        });
        return;
      }

      setConnectionState("disconnected");
      if (shouldReconnectRef.current !== false) {
        const backoff = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 8000);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectCountRef.current += 1;
          connectRef.current?.();
        }, backoff);
      }
    };

    socket.onerror = () => {
      setConnectionState("error");
    };
  }, [url]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
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
