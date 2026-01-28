/**
 * Application constants for the RSS Feed Manager frontend.
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE || "";

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  THEME: "reader:theme",
  FONT_FAMILY: "reader:font",
  FONT_SIZE: "reader:fontSize",
  ACCENT: "reader:accent",
  START_PAGE: "pref:startPage",
  SORT_PREF: "pref:sort",
  HIDE_READ: "pref:hideRead",
  FEEDTREE_COLLAPSED: "pref:feedtree:collapsed",
  FEEDTREE_FEEDS_COLLAPSED: "pref:feedtree:feedsCollapsed",
} as const;

// Default Values
export const DEFAULTS = {
  THEME: "light" as const,
  ACCENT: "indigo" as const,
  FONT_SIZE: 16,
  FONT_FAMILY: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  ITEMS_PER_PAGE: 20,
  START_PAGE: "today" as const,
  SORT_PREF: "popular_latest" as const,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// UI Constants
export const UI = {
  SIDEBAR_WIDTH: 256, // pixels
  SIDEBAR_MIN_WIDTH: 200,
  SIDEBAR_MAX_WIDTH: 400,
  MODAL_ANIMATION_DURATION: 200, // ms
  TOAST_DURATION: 5000, // ms
  DEBOUNCE_DELAY: 300, // ms
} as const;

// Date/Time Formats
export const DATE_FORMATS = {
  RELATIVE_THRESHOLD_HOURS: 24,
  DISPLAY_DATE: "MMM d, yyyy",
  DISPLAY_TIME: "h:mm a",
  DISPLAY_DATETIME: "MMM d, yyyy h:mm a",
} as const;

// Feed Categories (for Discover page)
export const FEED_CATEGORIES = [
  "Technology",
  "Programming",
  "Science",
  "World News",
  "Business",
  "Entertainment",
  "Sports",
  "Lifestyle",
  "Gaming",
  "Design",
] as const;

// Theme Presets (labels only, full config in useTheme.tsx)
export const THEME_OPTIONS = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "aurora", label: "Aurora" },
  { key: "sunset", label: "Sunset" },
  { key: "midnight", label: "Midnight" },
  { key: "everforest-dark", label: "Everforest Dark" },
  { key: "everforest-light", label: "Everforest Light" },
] as const;

// Accent Color Options (labels only, full config in useTheme.tsx)
export const ACCENT_OPTIONS = [
  { key: "indigo", label: "Indigo" },
  { key: "teal", label: "Teal" },
  { key: "rose", label: "Rose" },
  { key: "amber", label: "Amber" },
  { key: "violet", label: "Violet" },
  { key: "emerald", label: "Emerald" },
  { key: "everforest", label: "Everforest" },
  { key: "everforest-light", label: "Everforest Light" },
] as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Unable to connect. Please check your internet connection.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  GENERIC: "Something went wrong. Please try again.",
  FEED_FETCH_FAILED: "Failed to fetch feed. The URL may be invalid or unreachable.",
  READER_VIEW_FAILED: "Failed to load reader view. Showing original content instead.",
} as const;
