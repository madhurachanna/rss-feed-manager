import { forwardRef, type TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          "w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "dark:text-gray-100 dark:placeholder-gray-500",
          "resize-none",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
            : "border-[var(--surface-border)]",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
