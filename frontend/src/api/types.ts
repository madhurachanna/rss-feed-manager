export type Folder = {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  feeds: Feed[];
};

export type Feed = {
  id: number;
  userId: number;
  folderId: number;
  url: string;
  title: string;
  siteUrl: string;
  lastCheckedAt?: string;
};

export type ItemState = {
  itemId: number;
  userId: number;
  isRead: boolean;
  isBookmarked: boolean;
  bookmarkedAt?: string;
};

export type Item = {
  id: number;
  feedId: number;
  userId: number;
  guid: string;
  link?: string;
  title: string;
  author?: string;
  publishedAt?: string;
  summaryText?: string;
  contentHtml?: string;
  mediaJson?: string;
  createdAt: string;
  state: ItemState;
  source?: Feed;
};

export type ReaderResult = {
  title: string;
  contentHtml: string;
  byline?: string;
  siteName?: string;
  sourceUrl?: string;
  excerpt?: string;
  publishedTime?: string;
  wordCount: number;
  fallback?: boolean;
  error?: string;
};

export type User = {
  id: number;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type AiSummaryResult = {
  points: string[];
  source?: "ai" | "fallback";
  reason?: string;
};
