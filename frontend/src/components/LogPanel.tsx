import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { useLog, type LogLevel, type LogEntry } from "../hooks/useLog";
import { getLevelConfig, getCategoryConfig } from "../services/LogService";

type LogFilter = "all" | LogLevel;

export function LogPanel() {
  const { logs, clearLogs, hasUnread, markRead } = useLog();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mark as read when panel opens
  useEffect(() => {
    if (open) {
      markRead();
    }
  }, [open, markRead]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Delay to prevent immediate close on toggle click
    const timeout = setTimeout(() => {
      document.addEventListener("click", handleClick);
    }, 10);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("click", handleClick);
    };
  }, [open]);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.level === filter);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  return (
    <div ref={panelRef} className="log-panel fixed bottom-4 right-4 z-50 select-text">
      {/* Toggle Button */}
      <button
        className={clsx(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all",
          "bg-gray-900 text-white hover:bg-gray-800",
          "dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200",
          hasUnread && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900"
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? "Close logs" : "Open logs"}
      >
        <LogIcon />
        <span>Logs</span>
        {logs.length > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs dark:bg-gray-800/40">
            {errorCount > 0 && (
              <span className="flex items-center gap-0.5 text-red-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                {errorCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-0.5 text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {warnCount}
              </span>
            )}
            {errorCount === 0 && warnCount === 0 && logs.length}
          </span>
        )}
      </button>

      {/* Log Panel */}
      {open && (
        <div className="log-panel-body absolute bottom-full right-0 mb-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Activity Logs
              </h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {logs.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {logs.length > 0 && (
                <button
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  onClick={clearLogs}
                  aria-label="Clear all logs"
                  title="Clear logs"
                >
                  <TrashIcon />
                </button>
              )}
              <button
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                onClick={() => setOpen(false)}
                aria-label="Close logs panel"
                title="Close (Esc)"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-1 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            {(["all", "success", "info", "warn", "error"] as const).map((f) => {
              const count =
                f === "all" ? logs.length : logs.filter((l) => l.level === f).length;
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  {count > 0 && (
                    <span className={clsx("ml-1", isActive ? "opacity-70" : "opacity-50")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Log List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                  <LogIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No logs yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  Activity logs will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {filteredLogs.map((log) => (
                  <LogEntryRow
                    key={log.id}
                    log={log}
                    isExpanded={expandedId === log.id}
                    onToggle={() => toggleExpand(log.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LogEntryRow({
  log,
  isExpanded,
  onToggle,
}: {
  log: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const levelConfig = getLevelConfig(log.level);
  const categoryConfig = getCategoryConfig(log.category);
  const hasDetails = Boolean(log.details);

  return (
    <div
      className={clsx(
        "group px-4 py-3 transition-colors",
        hasDetails && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
      )}
      onClick={hasDetails ? onToggle : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Level Indicator */}
        <div
          className={clsx("mt-1.5 h-2 w-2 flex-shrink-0 rounded-full", levelConfig.dotClass)}
          title={levelConfig.label}
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Top row: Category + Timestamp */}
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                  levelConfig.bgClass,
                  levelConfig.textClass
                )}
              >
                {levelConfig.label}
              </span>
              <span className="text-xs text-gray-400">{categoryConfig.label}</span>
            </div>
            <span className="flex-shrink-0 text-xs text-gray-400 tabular-nums">
              {log.timestamp}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {log.title}
          </p>

          {/* Details (expandable) */}
          {hasDetails && (
            <div
              className={clsx(
                "overflow-hidden transition-all",
                isExpanded ? "mt-2 max-h-40" : "max-h-0"
              )}
            >
              <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {log.details}
              </p>
            </div>
          )}

          {/* Expand indicator */}
          {hasDetails && !isExpanded && (
            <button className="mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              Show details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LogIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
