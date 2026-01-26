import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline";
  active?: boolean;
}

const iconButtonSizes: Record<"sm" | "md" | "lg", string> = {
  sm: "p-1 rounded",
  md: "p-1.5 rounded-md",
  lg: "p-2 rounded-lg",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = "md", variant = "ghost", active, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variant === "ghost" && [
            "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
            "dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
            active && "bg-[var(--accent-soft)] text-[var(--accent)]",
          ],
          variant === "outline" && [
            "border border-[var(--surface-border)] text-gray-600 hover:bg-[var(--surface-muted)]",
            "dark:text-gray-300",
            active && "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]",
          ],
          iconButtonSizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
