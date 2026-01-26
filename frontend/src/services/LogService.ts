/**
 * Centralized Logging Service
 *
 * Provides structured logging throughout the application with:
 * - Log levels: success, info, warn, error
 * - Categorization for filtering
 * - Title + details structure for better UX
 * - Persistence options
 */

export type LogLevel = "success" | "info" | "warn" | "error";

export type LogCategory =
  | "feed"
  | "folder"
  | "bookmark"
  | "refresh"
  | "auth"
  | "settings"
  | "ai"
  | "api"
  | "system";

export type LogEntry = {
  id: string;
  level: LogLevel;
  category: LogCategory;
  title: string;
  details?: string;
  timestamp: string;
  timestampMs: number;
};

export type LogFilter = {
  levels?: LogLevel[];
  categories?: LogCategory[];
};

const MAX_LOGS = 50;
const STORAGE_KEY = "app_logs";

// Generate unique ID
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Format timestamp for display
const formatTimestamp = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

// Load logs from storage
export const loadLogs = (): LogEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_LOGS);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return [];
};

// Save logs to storage
export const saveLogs = (logs: LogEntry[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
};

// Clear logs from storage
export const clearStoredLogs = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
};

// Create a new log entry
export const createLogEntry = (
  level: LogLevel,
  category: LogCategory,
  title: string,
  details?: string
): LogEntry => {
  const now = new Date();
  return {
    id: generateId(),
    level,
    category,
    title,
    details,
    timestamp: formatTimestamp(now),
    timestampMs: now.getTime(),
  };
};

// Filter logs
export const filterLogs = (logs: LogEntry[], filter: LogFilter): LogEntry[] => {
  return logs.filter((log) => {
    if (filter.levels && filter.levels.length > 0) {
      if (!filter.levels.includes(log.level)) return false;
    }
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.includes(log.category)) return false;
    }
    return true;
  });
};

// Get level display properties
export const getLevelConfig = (level: LogLevel) => {
  switch (level) {
    case "success":
      return {
        label: "SUCCESS",
        bgClass: "bg-emerald-100 dark:bg-emerald-900/40",
        textClass: "text-emerald-700 dark:text-emerald-400",
        borderClass: "border-emerald-200 dark:border-emerald-800",
        dotClass: "bg-emerald-500",
      };
    case "info":
      return {
        label: "INFO",
        bgClass: "bg-blue-100 dark:bg-blue-900/40",
        textClass: "text-blue-700 dark:text-blue-400",
        borderClass: "border-blue-200 dark:border-blue-800",
        dotClass: "bg-blue-500",
      };
    case "warn":
      return {
        label: "WARN",
        bgClass: "bg-amber-100 dark:bg-amber-900/40",
        textClass: "text-amber-700 dark:text-amber-400",
        borderClass: "border-amber-200 dark:border-amber-800",
        dotClass: "bg-amber-500",
      };
    case "error":
      return {
        label: "ERROR",
        bgClass: "bg-red-100 dark:bg-red-900/40",
        textClass: "text-red-700 dark:text-red-400",
        borderClass: "border-red-200 dark:border-red-800",
        dotClass: "bg-red-500",
      };
  }
};

// Get category display properties
export const getCategoryConfig = (category: LogCategory) => {
  const configs: Record<LogCategory, { label: string; icon: string }> = {
    feed: { label: "Feed", icon: "📰" },
    folder: { label: "Folder", icon: "📁" },
    bookmark: { label: "Bookmark", icon: "🔖" },
    refresh: { label: "Refresh", icon: "🔄" },
    auth: { label: "Auth", icon: "🔐" },
    settings: { label: "Settings", icon: "⚙️" },
    ai: { label: "AI", icon: "✨" },
    api: { label: "API", icon: "🌐" },
    system: { label: "System", icon: "💻" },
  };
  return configs[category] || { label: category, icon: "📋" };
};

// Helper to extract error message from various error types
export const extractErrorMessage = (error: unknown): string => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    // Axios error format
    const axiosError = error as {
      response?: { data?: { error?: string; message?: string } };
      message?: string;
    };
    if (axiosError.response?.data?.error) return axiosError.response.data.error;
    if (axiosError.response?.data?.message)
      return axiosError.response.data.message;
    if (axiosError.message) return axiosError.message;
  }
  return "An error occurred";
};
