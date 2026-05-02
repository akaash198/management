"use client";

import { useCallback, useEffect, useRef } from "react";
import api from "@/lib/api";
import type { ApiResponse } from "@/types";

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function getRegistration() {
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
}

export async function enablePushNotifications(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return false;
  }

  const keyRes = await api.get<ApiResponse<{ public_key: string }>>("/auth/push/vapid-key/");
  const publicKey = keyRes.data.data?.public_key;
  if (!publicKey) return false;

  const registration = await getRegistration();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(publicKey).buffer as ArrayBuffer,
    }));

  const json = subscription.toJSON();
  await api.post("/auth/push/subscribe/", {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  });

  return true;
}

export async function disablePushNotifications(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return true;

  const endpoint = subscription.endpoint;
  await api.delete("/auth/push/subscribe/", { data: { endpoint } });
  await subscription.unsubscribe();
  return true;
}

export function usePushNotifications(enabled: boolean) {
  const registered = useRef(false);

  const register = useCallback(async () => {
    if (registered.current) return;
    try {
      const ok = await enablePushNotifications();
      registered.current = ok;
    } catch (err) {
      console.warn("Push registration failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void register();
  }, [enabled, register]);
}
