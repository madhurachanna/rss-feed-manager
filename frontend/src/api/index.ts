import api from "./client";
import type { Folder, Feed, Item, ReaderResult, AiSummaryResult, User, AuthResponse } from "./types";

// Auth functions
export async function sendOTP(email: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>("/api/auth/magic-link", { email });
  return res.data;
}

export async function verifyOTP(email: string, code: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/api/auth/verify-otp", { email, code });
  return res.data;
}

// Legacy - kept for backward compatibility
export async function sendMagicLink(email: string): Promise<{ message: string }> {
  return sendOTP(email);
}

export async function verifyMagicLink(token: string): Promise<AuthResponse> {
  const res = await api.get<AuthResponse>("/api/auth/verify", { params: { token } });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
}

export async function fetchMe(): Promise<User> {
  const res = await api.get<User>("/api/auth/me");
  return res.data;
}

export async function fetchFolders(): Promise<Folder[]> {
  const res = await api.get<{ folders: Folder[] }>("/api/folders");
  return res.data.folders;
}

export async function createFolder(name: string): Promise<Folder> {
  const res = await api.post<Folder>("/api/folders", { name });
  return res.data;
}

export async function renameFolder(id: number, name: string): Promise<void> {
  await api.patch(`/api/folders/${id}`, { name });
}

export async function deleteFolder(id: number): Promise<void> {
  await api.delete(`/api/folders/${id}`);
}

export async function addFeed(folderId: number, url: string): Promise<Feed> {
  const res = await api.post<Feed>("/api/feeds", { folderId, url });
  return res.data;
}

export async function deleteFeed(id: number): Promise<void> {
  await api.delete(`/api/feeds/${id}`);
}

export type ItemListParams = {
  folderId?: number;
  feedId?: number;
  unread?: boolean;
  limit?: number;
  cursor?: string;
  sort?: "popular_latest" | "latest" | "oldest";
};

export async function fetchItems(params: ItemListParams): Promise<{ items: Item[]; nextCursor?: string }> {
  const res = await api.get("/api/items", { params });
  return res.data;
}

export async function fetchBookmarks(params: { limit?: number; cursor?: string; sort?: "popular_latest" | "latest" | "oldest" }) {
  const res = await api.get("/api/bookmarks", { params });
  return res.data as { items: Item[]; nextCursor?: string };
}

export async function fetchTopNews(limit = 18) {
  const res = await api.get("/api/top-news", { params: { limit } });
  return res.data as { items: Item[]; source?: "ai" | "fallback"; reason?: string; detail?: string };
}

export async function markRead(id: number, read: boolean) {
  await api.post(`/api/items/${id}/${read ? "read" : "unread"}`);
}

export async function bookmark(id: number, set: boolean) {
  await api.post(`/api/items/${id}/${set ? "bookmark" : "unbookmark"}`);
}

export async function readerView(url: string): Promise<ReaderResult> {
  const res = await api.get<ReaderResult>("/api/reader", { params: { url } });
  return res.data;
}

export async function fetchAiSummary(itemId: number): Promise<AiSummaryResult> {
  const res = await api.get<AiSummaryResult>(`/api/items/${itemId}/summary`);
  return res.data;
}


export async function refreshFeed(id: number) {
  await api.post(`/api/feeds/${id}/refresh`);
}

export async function refreshAll() {
  await api.post("/api/refresh/all");
}

export async function refreshFolder(id: number) {
  await api.post(`/api/refresh/folder/${id}`);
}

// Settings
export type UserSettings = {
  retentionDays: number;
};

export async function fetchSettings(): Promise<UserSettings> {
  const res = await api.get<UserSettings>("/api/settings");
  return res.data;
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const res = await api.put<UserSettings>("/api/settings", settings);
  return res.data;
}

export async function fetchDiscover() {
  const res = await api.get("/api/discover");
  return res.data as {
    feeds: { title: string; url: string }[];
    popular?: { title: string; url: string }[];
    daily?: { title: string; url: string }[];
  };
}

export async function resolveDiscover(url: string) {
  const res = await api.post("/api/discover/resolve", { url });
  return res.data as { feeds: { title: string; url: string }[] };
}
export const importOPML = async (file: File): Promise<{ message: string; importedCount: number }> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/opml/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const downloadOPML = async (): Promise<Blob> => {
  const res = await api.get<Blob>("/api/opml/export", { responseType: "blob" });
  return res.data;
};
