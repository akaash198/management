import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "font-medium text-[13px] leading-none",
    "rounded-lg border border-transparent",
    "transition-all duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-45",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Filled — primary action */
        default: [
          "bg-primary text-primary-foreground border-primary",
          "hover:brightness-110 active:brightness-95",
          "shadow-sm shadow-primary/20",
        ].join(" "),

        /* Outlined — secondary action */
        outline: [
          "bg-background text-foreground border-border",
          "hover:bg-muted hover:border-border-strong active:bg-muted/80",
        ].join(" "),

        /* Ghost — tertiary / toolbar */
        ghost: [
          "text-muted-foreground border-transparent",
          "hover:bg-muted hover:text-foreground active:bg-muted/80",
        ].join(" "),

        /* Destructive */
        destructive: [
          "bg-destructive text-destructive-foreground border-destructive",
          "hover:brightness-110 active:brightness-90",
          "shadow-sm shadow-destructive/20",
        ].join(" "),

        /* Destructive ghost */
        "destructive-ghost": [
          "text-destructive border-transparent",
          "hover:bg-destructive/8 hover:text-destructive active:bg-destructive/12",
        ].join(" "),

        /* Secondary filled */
        secondary: [
          "bg-secondary text-secondary-foreground border-secondary",
          "hover:bg-secondary/80 active:bg-secondary/70",
        ].join(" "),

        /* Link */
        link: "text-primary underline-offset-4 hover:underline border-transparent p-0 h-auto",
      },
      size: {
        xs:   "h-6  px-2    text-[11px] rounded-md gap-1",
        sm:   "h-7  px-2.5  text-[12px] rounded-md",
        default: "h-8 px-3.5",
        md:   "h-9  px-4",
        lg:   "h-10 px-5    text-[14px]",
        xl:   "h-11 px-6    text-[14px]",
        icon: "h-8  w-8     p-0",
        "icon-sm": "h-7 w-7 p-0 rounded-md",
        "icon-xs": "h-6 w-6 p-0 rounded-md text-[11px]",
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
