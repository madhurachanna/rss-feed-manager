import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  type LogEntry,
  type LogLevel,
  type LogCategory,
  type LogFilter,
  createLogEntry,
  loadLogs,
  saveLogs,
  clearStoredLogs,
  filterLogs,
  extractErrorMessage,
} from "../services/LogService";

// Re-export types for convenience
export type { LogEntry, LogLevel, LogCategory, LogFilter };

const MAX_LOGS = 50;

type LogContextState = {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  filter: LogFilter;
  hasUnread: boolean;
  // Core logging methods
  log: (level: LogLevel, category: LogCategory, title: string, details?: string) => void;
  // Convenience methods
  success: (category: LogCategory, title: string, details?: string) => void;
  info: (category: LogCategory, title: string, details?: string) => void;
  warn: (category: LogCategory, title: string, details?: string) => void;
  error: (category: LogCategory, title: string, details?: string) => void;
  // Legacy method for backward compatibility
  addLog: (level: "info" | "warn" | "error", message: string) => void;
  // Log management
  clearLogs: () => void;
  setFilter: (filter: LogFilter) => void;
  markRead: () => void;
};

const LogContext = createContext<LogContextState | null>(null);

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>(() => loadLogs());
  const [filter, setFilter] = useState<LogFilter>({});
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(() => {
    const stored = localStorage.getItem("logs_last_read");
    return stored ? parseInt(stored, 10) : Date.now();
  });

  // Persist logs when they change
  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  // Core log function
  const log = useCallback(
    (level: LogLevel, category: LogCategory, title: string, details?: string) => {
      const entry = createLogEntry(level, category, title, details);
      setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
    },
    []
  );

  // Convenience methods
  const success = useCallback(
    (category: LogCategory, title: string, details?: string) => {
      log("success", category, title, details);
    },
    [log]
  );

  const info = useCallback(
    (category: LogCategory, title: string, details?: string) => {
      log("info", category, title, details);
    },
    [log]
  );

  const warn = useCallback(
    (category: LogCategory, title: string, details?: string) => {
      log("warn", category, title, details);
    },
    [log]
  );

  const error = useCallback(
    (category: LogCategory, title: string, details?: string) => {
      log("error", category, title, details);
    },
    [log]
  );

  // Legacy addLog for backward compatibility
  const addLog = useCallback(
    (level: "info" | "warn" | "error", message: string) => {
      // Map to new system with "system" category
      log(level, "system", message);
    },
    [log]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    clearStoredLogs();
  }, []);

  const markRead = useCallback(() => {
    const now = Date.now();
    setLastReadTimestamp(now);
    localStorage.setItem("logs_last_read", String(now));
  }, []);

  // Filter logs based on current filter
  const filteredLogs = useMemo(() => {
    return filterLogs(logs, filter);
  }, [logs, filter]);

  // Check for unread logs
  const hasUnread = useMemo(() => {
    return logs.some((log) => log.timestampMs > lastReadTimestamp);
  }, [logs, lastReadTimestamp]);

  const value = useMemo(
    () => ({
      logs,
      filteredLogs,
      filter,
      hasUnread,
      log,
      success,
      info,
      warn,
      error,
      addLog,
      clearLogs,
      setFilter,
      markRead,
    }),
    [logs, filteredLogs, filter, hasUnread, log, success, info, warn, error, addLog, clearLogs, markRead]
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useLog() {
  const ctx = useContext(LogContext);
  if (!ctx) {
    throw new Error("useLog must be used within LogProvider");
  }
  return ctx;
}

// Helper hook for logging errors from API calls
export function useLogError() {
  const { error } = useLog();
  return useCallback(
    (category: LogCategory, title: string, err: unknown) => {
      const message = extractErrorMessage(err);
      error(category, title, message);
    },
    [error]
  );
}
