/**
 * Shared TypeScript types for the RSS Feed Manager frontend.
 * Re-exports types from api/types.ts and adds additional shared types.
 */

// Re-export API types
export type {
  User,
  Folder,
  Feed,
  Item,
  ItemState,
  Source,
  ReaderResult,
  SummaryResult,
  TopNewsResult,
  TopNewsItem,
  Settings,
} from "../api/types";

// Theme types
export type Theme = "light" | "dark" | "aurora" | "sunset" | "midnight" | "everforest-dark" | "everforest-light";
export type AccentKey = "indigo" | "teal" | "rose" | "amber" | "violet" | "emerald" | "everforest" | "everforest-light";
export type ThemeMode = "light" | "dark";

// Preference types
export type SortPref = "popular_latest" | "latest" | "oldest";
export type StartPage = "today" | "first" | "all";

// Log types
export type LogCategory = "feed" | "api" | "auth" | "settings" | "ai";
export type LogLevel = "info" | "success" | "warning" | "error";

export interface LogEntry {
  id: string;
  timestamp: Date;
  category: LogCategory;
  level: LogLevel;
  title: string;
  details?: string;
}

// Navigation types
export type ViewType = "all" | "today" | "folder" | "feed" | "bookmarks" | "discover";

export interface NavigationState {
  view: ViewType;
  folderId?: number;
  feedId?: number;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}
