"use client";

import { useEffect } from "react";
import { ensureAccessTokenCookie } from "@/lib/auth";

export function AuthCookieSync() {
  useEffect(() => {
    ensureAccessTokenCookie();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "accessToken") ensureAccessTokenCookie();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}

