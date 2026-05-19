"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { clearTokens, refreshAccessToken, getAccessToken } from "@/lib/auth";

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
  const sendQueueRef = useRef<string[]>([]);

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
      const token = getAccessToken();
      if (token) {
        wsUrl.searchParams.set("token", token);
      }
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
      // Flush any messages queued while the socket was connecting
      const queued = sendQueueRef.current.splice(0);
      for (const msg of queued) {
        socket.send(msg);
      }
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
      sendQueueRef.current = [];
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
    const msg = JSON.stringify({ type, data });
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(msg);
      return true;
    }
    // Queue the message to be sent once the socket opens
    if (socketRef.current?.readyState === WebSocket.CONNECTING) {
      sendQueueRef.current.push(msg);
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
