import { forwardRef, type SelectHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  size?: "sm" | "md" | "lg";
  error?: boolean;
}

const selectSizes: Record<"sm" | "md" | "lg", string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = "md", error, className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={clsx(
          "w-full appearance-none rounded-lg border bg-[var(--surface)] text-gray-900 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "dark:text-gray-100",
          "bg-[length:16px_16px] bg-[right_0.75rem_center] bg-no-repeat pr-10",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19%209-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
            : "border-[var(--surface-border)]",
          selectSizes[size],
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
