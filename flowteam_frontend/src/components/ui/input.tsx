import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full px-3 py-2",
          "text-[13px] font-normal text-foreground tracking-[-0.01em]",
          "placeholder:text-muted-foreground/45",
          "rounded-lg border border-input bg-card",
          "shadow-2xs",
          "transition-all duration-150",
          "focus-visible:outline-none",
          "focus-visible:border-primary/60",
          "focus-visible:ring-3 focus-visible:ring-primary/12 focus-visible:ring-offset-0",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-muted/40",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
