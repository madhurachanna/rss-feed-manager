import { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const inputSizes: Record<"sm" | "md" | "lg", string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = "md", error, leftIcon, rightIcon, className, ...props }, ref) => {
    const baseClasses = clsx(
      "w-full rounded-lg border bg-[var(--surface)] text-gray-900 placeholder-gray-400 transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "dark:text-gray-100 dark:placeholder-gray-500",
      error
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
        : "border-[var(--surface-border)]",
      inputSizes[size],
      leftIcon && "pl-9",
      rightIcon && "pr-9",
      className
    );

    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}
          <input ref={ref} className={baseClasses} {...props} />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>
      );
    }

    return <input ref={ref} className={baseClasses} {...props} />;
  }
);
Input.displayName = "Input";
