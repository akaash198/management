import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          /* layout */
          "flex h-9 w-full px-3 py-2",
          /* typography */
          "text-[13px] font-normal text-foreground",
          "placeholder:text-muted-foreground/50",
          /* surface */
          "rounded-lg border border-input bg-background",
          /* shadow */
          "shadow-xs",
          /* transitions */
          "transition-colors duration-150",
          /* focus */
          "focus-visible:outline-none",
          "focus-visible:border-primary/70",
          "focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-0",
          /* file input */
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          /* disabled */
          "disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-muted/40",
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
