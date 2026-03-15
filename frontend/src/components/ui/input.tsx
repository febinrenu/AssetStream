import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl text-sm transition-all duration-200",
          "border border-[var(--border)] bg-[var(--surface-muted)]",
          "px-3.5 py-2 text-[var(--text-primary)]",
          "placeholder:text-[var(--text-faint)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] focus-visible:bg-[var(--surface)] focus-visible:border-[var(--accent)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-[var(--text-faint)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
