"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AIButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean;
  label?: string;
};

export function AIButton({ loading, label, children, className, disabled, ...props }: AIButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      className={cn("gap-1.5", className)}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {children ?? label ?? "AI"}
    </Button>
  );
}
