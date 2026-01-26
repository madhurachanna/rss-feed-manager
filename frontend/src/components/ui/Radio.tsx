import { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  size?: "sm" | "md";
}

const radioSizes: Record<"sm" | "md", string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, size = "md", className, id, ...props }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).slice(2, 9)}`;
    
    return (
      <div className={clsx("flex items-center gap-2", className)}>
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className={clsx(
            "border-[var(--surface-border)] bg-[var(--surface)] text-[var(--accent)]",
            "focus:ring-2 focus:ring-[var(--accent)]/40 focus:ring-offset-0",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "cursor-pointer",
            radioSizes[size]
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={radioId}
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
Radio.displayName = "Radio";
