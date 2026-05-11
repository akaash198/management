import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full",
    "px-2 py-0.5",
    "text-[11px] font-semibold leading-none tracking-[-0.01em]",
    "border transition-colors duration-150",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Filled primary — emerald */
        default: "border-transparent bg-primary/10 text-primary",

        /* Neutral */
        secondary: "border-transparent bg-muted text-muted-foreground",

        /* Danger */
        destructive: "border-transparent bg-destructive/10 text-destructive",

        /* Success / emerald */
        success: "border-transparent bg-[hsl(158_64%_38%/0.10)] text-[hsl(158_58%_28%)]",

        /* Warning */
        warning: "border-transparent bg-[hsl(38_92%_50%/0.12)] text-[hsl(34_80%_34%)]",

        /* Info */
        info: "border-transparent bg-[hsl(210_92%_50%/0.10)] text-[hsl(210_80%_36%)]",

        /* Outlined */
        outline: "border-border bg-transparent text-foreground",

        /* Outlined primary */
        "outline-primary": "border-primary/25 bg-primary/5 text-primary",

        /* Subtle slate */
        slate: "border-border bg-muted/70 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
