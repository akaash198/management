import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "font-medium text-[13px] leading-none tracking-[-0.01em]",
    "rounded-lg border border-transparent",
    "transition-all duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-40",
    "select-none cursor-pointer",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Filled — primary action */
        default: [
          "bg-primary text-primary-foreground border-primary",
          "hover:bg-primary-mid active:brightness-95",
          "shadow-xs shadow-primary/25",
        ].join(" "),

        /* Outlined — secondary action */
        outline: [
          "bg-card text-foreground border-border",
          "hover:bg-muted hover:border-border-strong active:bg-muted/70",
          "shadow-2xs",
        ].join(" "),

        /* Ghost — tertiary / toolbar */
        ghost: [
          "text-muted-foreground border-transparent bg-transparent",
          "hover:bg-muted/80 hover:text-foreground active:bg-muted",
        ].join(" "),

        /* Destructive */
        destructive: [
          "bg-destructive text-destructive-foreground border-destructive",
          "hover:brightness-110 active:brightness-90",
          "shadow-xs shadow-destructive/20",
        ].join(" "),

        /* Destructive ghost */
        "destructive-ghost": [
          "text-destructive border-transparent bg-transparent",
          "hover:bg-destructive/8 hover:text-destructive active:bg-destructive/12",
        ].join(" "),

        /* Secondary filled */
        secondary: [
          "bg-secondary text-secondary-foreground border-secondary",
          "hover:bg-secondary/80 active:bg-secondary/70",
        ].join(" "),

        /* Link */
        link: "text-primary underline-offset-4 hover:underline border-transparent p-0 h-auto shadow-none",
      },
      size: {
        "2xs": "h-5  px-1.5  text-[10px] rounded-md gap-0.5",
        xs:    "h-6  px-2    text-[11px] rounded-md gap-1",
        sm:    "h-7  px-2.5  text-[12px] rounded-md",
        default: "h-8 px-3.5",
        md:    "h-9  px-4",
        lg:    "h-10 px-5    text-[14px]",
        xl:    "h-11 px-6    text-[15px]",
        icon:  "h-8  w-8     p-0",
        "icon-sm": "h-7 w-7 p-0 rounded-md",
        "icon-xs": "h-6 w-6 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
