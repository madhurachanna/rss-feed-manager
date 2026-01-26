import { forwardRef, type LabelHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required, className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={clsx(
          "block text-sm font-medium text-gray-700 dark:text-gray-300",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
    );
  }
);
Label.displayName = "Label";
