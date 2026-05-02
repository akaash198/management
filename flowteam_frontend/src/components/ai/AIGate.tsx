"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAIStore } from "@/store/ai";

export function AIGate({
  children,
  featureName = "This AI feature",
}: {
  children: React.ReactNode;
  featureName?: string;
}) {
  const aiEnabled = useAIStore((state) => state.aiEnabled);

  if (!aiEnabled) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles size={18} className="text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">AI Plan Required</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          {featureName} requires the AI plan. Upgrade to unlock task generation, sprint planning, smart briefings, and
          more.
        </p>
        <Link href="/settings?tab=ai" className="text-xs font-medium text-primary hover:underline">
          Upgrade to AI plan →
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
