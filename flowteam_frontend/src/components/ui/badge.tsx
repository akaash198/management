import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full",
    "px-2 py-0.5",
    "text-[11px] font-semibold leading-none",
    "border transition-colors duration-150",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Filled primary */
        default: "border-transparent bg-primary/10 text-primary",

        /* Neutral */
        secondary: "border-transparent bg-secondary text-secondary-foreground",

        /* Danger */
        destructive: "border-transparent bg-destructive/10 text-destructive",

        /* Success */
        success: "border-transparent bg-[hsl(142_72%_36%/0.10)] text-[hsl(142_72%_30%)]",

        /* Warning */
        warning: "border-transparent bg-[hsl(36_96%_48%/0.12)] text-[hsl(36_80%_36%)]",

        /* Info */
        info: "border-transparent bg-[hsl(210_92%_50%/0.10)] text-[hsl(210_92%_38%)]",

        /* Outlined */
        outline: "border-border bg-transparent text-foreground",

        /* Outlined primary */
        "outline-primary": "border-primary/30 bg-primary/5 text-primary",
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
