import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 touch-manipulation [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-fg shadow-sm hover:bg-primary-hover active:bg-primary-hover",
        secondary:
          "bg-bg-elevated text-fg border border-border shadow-sm hover:bg-bg-subtle active:bg-bg-subtle",
        ghost: "text-fg-muted hover:bg-bg-subtle hover:text-fg active:bg-bg-subtle",
        outline:
          "border border-border bg-transparent text-fg hover:bg-bg-subtle active:bg-bg-subtle",
        danger: "bg-danger text-primary-fg hover:bg-primary-hover active:bg-primary-hover",
        soft: "bg-primary-soft text-primary hover:bg-primary/15 active:bg-primary/20",
      },
      size: {
        default: "min-h-11 h-11 px-4 py-2",
        sm: "min-h-10 h-10 rounded-md px-3 text-xs",
        lg: "min-h-12 h-12 rounded-xl px-5 text-base w-full sm:w-auto",
        icon: "h-11 w-11 min-h-11 min-w-11",
        "icon-sm": "h-10 w-10 min-h-10 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
