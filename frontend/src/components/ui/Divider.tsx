import { clsx } from "clsx";

export interface DividerProps {
  className?: string;
  label?: string;
}

export function Divider({ className, label }: DividerProps) {
  if (label) {
    return (
      <div className={clsx("flex items-center gap-3", className)}>
        <div className="h-px flex-1 bg-[var(--surface-border)]" />
        <span className="text-xs text-gray-500">{label}</span>
        <div className="h-px flex-1 bg-[var(--surface-border)]" />
      </div>
    );
  }
  return <div className={clsx("h-px bg-[var(--surface-border)]", className)} />;
}
