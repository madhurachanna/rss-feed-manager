import { clsx } from "clsx";
import { Label } from "./Label";

export interface FormGroupProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ label, required, error, hint, children, className }: FormGroupProps) {
  return (
    <div className={clsx("space-y-1.5", className)}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
