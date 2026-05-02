"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setTokens } from "@/lib/auth";
import { useAuthStore } from "@/store/auth";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const fetchMe = useAuthStore((state) => state.fetchMe);

  useEffect(() => {
    const access = params.get("access");
    const refresh = params.get("refresh");
    const error = params.get("error");

    if (error || !access || !refresh) {
      router.replace(`/login?error=${error || "unknown"}`);
      return;
    }

    setTokens(access, refresh);
    fetchMe().then(() => router.replace("/dashboard"));
  }, [fetchMe, params, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}
