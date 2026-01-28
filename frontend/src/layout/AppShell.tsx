import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { clsx } from "clsx";
import {
  addFeed,
  bookmark,
  createFolder,
  deleteFeed,
  deleteFolder,
  fetchBookmarks,
  fetchFolders,
  fetchItems,
  fetchTopNews,
  markRead,
  refreshAll,
  refreshFeed,
  refreshFolder,
  renameFolder,
} from "../api";
import type { Item, Folder } from "../api/types";
import { Sidebar } from "../components/Sidebar";
import { ItemList } from "../components/ItemList";
import { ArticleModal } from "../modals/ArticleModal";
import { SettingsModal } from "../modals/SettingsModal";
import { InstallPrompt } from "../components/InstallPrompt";
import { useLog } from "../hooks/useLog";
import { extractErrorMessage } from "../services/LogService";
import { useAuth } from "../context/AuthContext";
import { Discover } from "../components/Discover";
import { LogPanel } from "../components/LogPanel";
import { HomeCategoryRows } from "../components/HomeCategoryRows";
import { AppHeader } from "./AppHeader";
import type { NavKey, Presentation } from "./types";

type SortPref = "popular_latest" | "latest" | "oldest";

const presentationViews: NavKey[] = ["home", "bookmarks", "topnews"];

const presentationStorageKey = (view: NavKey) => `pref:presentation:${view}`;

const isPresentation = (value: string | null): value is Presentation => value === "title" || value === "compact" || value === "cards";

const formatTopNewsFallbackReason = (reason?: string) => {
  if (!reason) return "Fallback in use";
  switch (reason) {
    case "gemini_error":
      return "AI service unavailable";
    case "missing_api_key":
      return "AI key not configured";
    case "no_items":
      return "No recent items";
    case "cached":
      return "Cached results";
    default: {
      const normalized = reason.replace(/_/g, " ");
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
  }
};

const readPresentation = (view: NavKey): Presentation => {
  const stored = localStorage.getItem(presentationStorageKey(view));
  if (isPresentation(stored)) return stored;
  const legacy = localStorage.getItem("pref:presentation");
  if (isPresentation(legacy)) return legacy;
  return "cards";
};

const readSortPref = (): SortPref => {
  const stored = localStorage.getItem("pref:sort") as SortPref | null;
  if (stored === "popular_latest" || stored === "latest" || stored === "oldest") {
    return stored;
  }
  return "popular_latest";
};

type CategoryDefinition = {
  key: string;
  label: string;
  keywords: string[];
};

const HOME_CATEGORY_DEFS: CategoryDefinition[] = [
  { key: "all", label: "All", keywords: [] },
  {
    key: "technology",
    label: "Technology",
    keywords: ["tech", "technology", "software", "developer", "programming", "ai", "apple", "google", "android", "web", "cloud", "gadget"],
  },
  {
    key: "business",
    label: "Business",
    keywords: ["business", "finance", "market", "economy", "startup", "invest", "wall street", "earnings", "venture"],
  },
  {
    key: "science",
    label: "Science",
    keywords: ["science", "space", "nasa", "research", "biology", "physics", "chemistry", "astronomy"],
  },
  {
    key: "sports",
    label: "Sports",
    keywords: ["sport", "nba", "nfl", "soccer", "football", "mlb", "nhl", "tennis", "golf", "cricket", "f1"],
  },
  {
    key: "entertainment",
    label: "Entertainment",
    keywords: ["entertainment", "movie", "film", "tv", "music", "celebrity", "culture"],
  },
  {
    key: "puzzles",
    label: "Puzzles",
    keywords: ["puzzle", "crossword", "sudoku", "wordle", "quiz"],
  },
  {
    key: "world",
    label: "World",
    keywords: ["world", "global", "international", "politics", "election", "government", "policy"],
  },
];

const HOME_CATEGORY_KEYS = HOME_CATEGORY_DEFS.filter((def) => def.key !== "all");
const HOME_ROW_LIMIT = 12;

type FeedMeta = {
  folderName?: string;
  feedTitle?: string;
  feedUrl?: string;
  siteUrl?: string;
};

const buildCategoryText = (item: Item, meta?: FeedMeta) => {
  const parts = [
    meta?.folderName,
    meta?.feedTitle,
    meta?.feedUrl,
    meta?.siteUrl,
    item.source?.title,
    item.source?.siteUrl,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
};

const resolveCategoryKey = (text: string) => {
  for (const category of HOME_CATEGORY_KEYS) {
    if (category.keywords.some((keyword) => text.includes(keyword))) {
      return category.key;
    }
  }
  return "all";
};

const getItemCategory = (item: Item, meta?: FeedMeta) => resolveCategoryKey(buildCategoryText(item, meta));

export function AppShell() {
  const queryClient = useQueryClient();
  const { success, info, warn, error: logError } = useLog();
  const { user, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as NavKey) || "home";
  const folderId = params.get("folderId") ? Number(params.get("folderId")) : undefined;
  const feedId = params.get("feedId") ? Number(params.get("feedId")) : undefined;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches,
  );
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches,
  );
  const resizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(280);
  const handleWidth = 6;
  const swipeActive = useRef(false);
  const swipeStart = useRef({ x: 0, y: 0 });
  const [presentationByView, setPresentationByView] = useState<Record<NavKey, Presentation>>(() => ({
    home: readPresentation("home"),
    bookmarks: readPresentation("bookmarks"),
    topnews: readPresentation("topnews"),
    discover: readPresentation("discover"),
  }));
  const [sortPref, setSortPref] = useState<SortPref>(() => readSortPref());
  const mainRef = useRef<HTMLElement>(null);
  const homeLoadMoreRef = useRef<HTMLDivElement>(null);

  const currentPresentation = presentationByView[view] || "compact";
  const showPresentationToggle = presentationViews.includes(view) && !(view === "home" && !feedId);

  const foldersQuery = useQuery({
    queryKey: ["folders"],
    queryFn: fetchFolders,
  });

  const itemsQuery = useInfiniteQuery({
    queryKey: ["items", { folderId, feedId, sort: sortPref }],
    queryFn: ({ pageParam }) => fetchItems({ folderId, feedId, cursor: pageParam as string | undefined, limit: 20, sort: sortPref }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: view === "home",
  });

  const bookmarksQuery = useInfiniteQuery({
    queryKey: ["bookmarks", { sort: sortPref }],
    queryFn: ({ pageParam }) => fetchBookmarks({ cursor: pageParam as string | undefined, limit: 20, sort: sortPref }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: view === "bookmarks",
  });

  const topNewsQuery = useQuery({
    queryKey: ["topnews"],
    queryFn: () => fetchTopNews(18),
    enabled: view === "topnews",
  });

  const lastTopNewsRef = useRef<string>("");

  useEffect(() => {
    if (view !== "topnews") return;
    if (!topNewsQuery.data?.source) return;
    const key = `${topNewsQuery.data.source}:${topNewsQuery.data.reason || ""}`;
    if (lastTopNewsRef.current === key) return;
    lastTopNewsRef.current = key;
    if (topNewsQuery.data.source === "ai") {
      success("ai", "Top News generated", "AI-powered ranking applied to your articles");
    } else {
      const reason = formatTopNewsFallbackReason(topNewsQuery.data.reason);
      warn("ai", "Top News fallback used", reason);
    }
  }, [view, topNewsQuery.data, success, warn]);

  useEffect(() => {
    if (view === "topnews" && topNewsQuery.isError) {
      logError("ai", "Top News failed", "Unable to fetch top news rankings");
    }
  }, [view, topNewsQuery.isError, logError]);

  useEffect(() => {
    const onPrefs = () => setSortPref(readSortPref());
    window.addEventListener("prefs-changed", onPrefs);
    return () => window.removeEventListener("prefs-changed", onPrefs);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      const nextIsDesktop = media.matches;
      setIsDesktop(nextIsDesktop);
      setSidebarOpen(nextIsDesktop);
    };
    onChange();
    if (media.addEventListener) {
      media.addEventListener("change", onChange);
    } else {
      media.addListener(onChange);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", onChange);
      } else {
        media.removeListener(onChange);
      }
    };
  }, []);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (isDesktop || sidebarOpen) return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      swipeActive.current = touch.clientX <= 24;
      swipeStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!swipeActive.current || isDesktop || sidebarOpen) return;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - swipeStart.current.x;
      const dy = touch.clientY - swipeStart.current.y;
      if (dx > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        swipeActive.current = false;
        setSidebarOpen(true);
      }
    };

    const onTouchEnd = () => {
      swipeActive.current = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isDesktop, sidebarOpen]);

  // Helper to get folder name by id
  const getFolderName = (id: number) => {
    const folder = foldersQuery.data?.find((f) => f.id === id);
    return folder?.name || `Folder #${id}`;
  };

  // Helper to get feed title by id
  const getFeedTitle = (id: number) => {
    for (const folder of foldersQuery.data || []) {
      const feed = folder.feeds?.find((f) => f.id === id);
      if (feed) return feed.title || feed.url || `Feed #${id}`;
    }
    return `Feed #${id}`;
  };

  const folderActions = {
    create: useMutation({
      mutationFn: (name: string) => createFolder(name),
      onSuccess: (_data, name) => {
        queryClient.invalidateQueries({ queryKey: ["folders"] });
        success("folder", "Folder created", `Created folder "${name}"`);
      },
      onError: (err, name) => {
        logError("folder", "Failed to create folder", extractErrorMessage(err));
      },
    }),
    rename: useMutation({
      mutationFn: ({ id, name }: { id: number; name: string }) => renameFolder(id, name),
      onSuccess: (_data, { name }) => {
        queryClient.invalidateQueries({ queryKey: ["folders"] });
        success("folder", "Folder renamed", `Renamed to "${name}"`);
      },
      onError: (err) => {
        logError("folder", "Failed to rename folder", extractErrorMessage(err));
      },
    }),
    remove: useMutation({
      mutationFn: (id: number) => deleteFolder(id),
      onMutate: (id) => {
        // Capture folder name before deletion
        return { folderName: getFolderName(id) };
      },
      onSuccess: (_data, _id, context) => {
        queryClient.invalidateQueries({ queryKey: ["folders"] });
        success("folder", "Folder deleted", `Deleted "${context?.folderName}"`);
      },
      onError: (err) => {
        logError("folder", "Failed to delete folder", extractErrorMessage(err));
      },
    }),
    addFeed: useMutation({
      mutationFn: ({ folderId, url }: { folderId: number; url: string }) => addFeed(folderId, url),
      onSuccess: (feed, { folderId }) => {
        queryClient.invalidateQueries({ queryKey: ["folders"] });
        queryClient.invalidateQueries({ queryKey: ["items"] });
        const folderName = getFolderName(folderId);
        success("feed", "Feed added", `Added "${feed.title || feed.url}" to ${folderName}`);
      },
      onError: (err, { url }) => {
        logError("feed", "Failed to add feed", `${url}: ${extractErrorMessage(err)}`);
      },
    }),
    removeFeed: useMutation({
      mutationFn: (id: number) => deleteFeed(id),
      onMutate: (id) => {
        // Capture feed title before deletion
        return { feedTitle: getFeedTitle(id) };
      },
      onSuccess: (_data, _id, context) => {
        queryClient.invalidateQueries({ queryKey: ["folders"] });
        queryClient.invalidateQueries({ queryKey: ["items"] });
        success("feed", "Feed removed", `Removed "${context?.feedTitle}"`);
      },
      onError: (err) => {
        logError("feed", "Failed to remove feed", extractErrorMessage(err));
      },
    }),
  };

  const refreshMutations = {
    all: useMutation({
      mutationFn: refreshAll,
      onMutate: () => {
        info("refresh", "Refreshing all feeds", "This may take a moment...");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["items"] });
        queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
        success("refresh", "All feeds refreshed", "Your feeds are now up to date");
      },
      onError: (err) => {
        logError("refresh", "Failed to refresh feeds", extractErrorMessage(err));
      },
    }),
    folder: useMutation({
      mutationFn: (id: number) => refreshFolder(id),
      onMutate: (id) => {
        const folderName = getFolderName(id);
        info("refresh", `Refreshing ${folderName}`, "Fetching new items...");
        return { folderName };
      },
      onSuccess: (_data, _id, context) => {
        queryClient.invalidateQueries({ queryKey: ["items"] });
        success("refresh", `${context?.folderName} refreshed`, "New items have been fetched");
      },
      onError: (err, id, context) => {
        logError("refresh", `Failed to refresh ${context?.folderName}`, extractErrorMessage(err));
      },
    }),
    feed: useMutation({
      mutationFn: (id: number) => refreshFeed(id),
      onMutate: (id) => {
        const feedTitle = getFeedTitle(id);
        return { feedTitle };
      },
      onSuccess: (_data, _id, context) => {
        queryClient.invalidateQueries({ queryKey: ["items"] });
        success("refresh", "Feed refreshed", `${context?.feedTitle} is now up to date`);
      },
      onError: (err, _id, context) => {
        logError("refresh", `Failed to refresh feed`, `${context?.feedTitle}: ${extractErrorMessage(err)}`);
      },
    }),
  };

  const markReadMut = useMutation({
    mutationFn: ({ id, read }: { id: number; read: boolean }) => markRead(id, read),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const bookmarkMut = useMutation({
    mutationFn: ({ id, set }: { id: number; set: boolean }) => bookmark(id, set),
    onSuccess: (_data, { set }) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      if (set) {
        success("bookmark", "Article bookmarked", "Added to your bookmarks");
      } else {
        info("bookmark", "Bookmark removed", "Removed from your bookmarks");
      }
    },
    onError: (err) => {
      logError("bookmark", "Bookmark failed", extractErrorMessage(err));
    },
  });

  const items = useMemo(() => {
    const raw =
      view === "home"
        ? itemsQuery.data?.pages.flatMap((p) => p.items) ?? []
        : view === "bookmarks"
          ? bookmarksQuery.data?.pages.flatMap((p) => p.items) ?? []
          : [];
    return raw.filter((i): i is Item => Boolean(i));
  }, [itemsQuery.data, bookmarksQuery.data, view]);

  const feedMetaById = useMemo(() => {
    const map = new Map<number, FeedMeta>();
    (foldersQuery.data || []).forEach((folder) => {
      (folder.feeds || []).forEach((feed) => {
        map.set(feed.id, {
          folderName: folder.name,
          feedTitle: feed.title,
          feedUrl: feed.url,
          siteUrl: feed.siteUrl,
        });
      });
    });
    return map;
  }, [foldersQuery.data]);

  const categorizedItems = useMemo(
    () =>
      items.map((item) => ({
        item,
        category: getItemCategory(item, feedMetaById.get(item.feedId)),
      })),
    [items, feedMetaById],
  );

  const homeRows = useMemo(() => {
    if (view !== "home" || feedId) return [];
    const byCategory = new Map<string, Item[]>();
    categorizedItems.forEach(({ item, category }) => {
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)?.push(item);
    });
    const rows: { key: string; label: string; items: Item[] }[] = [];
    if (items.length > 0) {
      rows.push({ key: "latest", label: "Latest updates", items: items.slice(0, HOME_ROW_LIMIT) });
    }
    HOME_CATEGORY_KEYS.forEach((def) => {
      const categoryItems = (byCategory.get(def.key) || []).slice(0, HOME_ROW_LIMIT);
      if (categoryItems.length > 0) {
        rows.push({ key: def.key, label: def.label, items: categoryItems });
      }
    });
    return rows;
  }, [categorizedItems, items, view, feedId]);

  const activeFeedLabel = useMemo(() => {
    if (!feedId || !foldersQuery.data) return null;
    const folderMatch = folderId ? foldersQuery.data.find((f) => f.id === folderId) : undefined;
    const feedFromFolder = folderMatch?.feeds?.find((f) => f.id === feedId);
    const feedFallback = foldersQuery.data.flatMap((f) => f.feeds || []).find((f) => f.id === feedId);
    const feed = feedFromFolder ?? feedFallback;
    if (!feed) return null;
    return feed.title || feed.url || null;
  }, [feedId, folderId, foldersQuery.data]);

  const headerTitle =
    view === "home" && activeFeedLabel
      ? activeFeedLabel
      : view === "home"
        ? "Latest updates"
        : view === "bookmarks"
          ? "Bookmarks"
          : view === "topnews"
            ? "Top News"
            : "Discover";

  const showHomeRows = view === "home" && !feedId;
  const refreshingFeedId = typeof refreshMutations.feed.variables === "number" ? refreshMutations.feed.variables : undefined;
  const isRefreshingFeed = refreshMutations.feed.isPending && refreshingFeedId === feedId;
  const refreshAction =
    view === "home" && feedId
      ? {
        label: "Refresh feed",
        onClick: () => refreshMutations.feed.mutate(feedId),
        loading: isRefreshingFeed,
      }
      : view === "topnews"
        ? {
          label: "Refresh top news",
          onClick: () => topNewsQuery.refetch(),
          loading: topNewsQuery.isFetching,
        }
        : undefined;

  const hasMore = view === "home" ? Boolean(itemsQuery.hasNextPage) : Boolean(bookmarksQuery.hasNextPage);

  const loadMore = () => {
    if (view === "home") itemsQuery.fetchNextPage();
    else if (view === "bookmarks") bookmarksQuery.fetchNextPage();
  };

  useEffect(() => {
    if (!showHomeRows || !hasMore) return;
    const root = mainRef.current;
    const target = homeLoadMoreRef.current;
    if (!root || !target) return;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (itemsQuery.isFetchingNextPage || itemsQuery.isFetching) return;
        loadMore();
      },
      { root, rootMargin: "320px 0px 320px 0px", threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [showHomeRows, hasMore, itemsQuery.isFetchingNextPage, itemsQuery.isFetching, loadMore]);

  const onSelectFolder = (id?: number) => {
    const next = new URLSearchParams(params);
    if (id) next.set("folderId", String(id));
    else next.delete("folderId");
    next.delete("feedId");
    next.set("view", "home");
    setParams(next);
    if (!isDesktop) setSidebarOpen(false);
  };

  const onSelectFeed = (folderId: number, id: number) => {
    const next = new URLSearchParams(params);
    next.set("folderId", String(folderId));
    next.set("feedId", String(id));
    next.set("view", "home");
    setParams(next);
    const folderMatch = (foldersQuery.data || []).find((f) => f.id === folderId);
    const feedFromFolder = folderMatch?.feeds?.find((f) => f.id === id);
    const feedFallback = (foldersQuery.data || []).flatMap((f) => f.feeds || []).find((f) => f.id === id);
    const selectedFeed = feedFromFolder ?? feedFallback;
    if (selectedFeed && !selectedFeed.lastCheckedAt) {
      refreshMutations.feed.mutate(id);
    }
    if (!isDesktop) setSidebarOpen(false);
  };

  const onChangeView = (nextView: NavKey) => {
    const next = new URLSearchParams(params);
    next.set("view", nextView);
    next.delete("folderId");
    next.delete("feedId");
    setParams(next);
    if (!isDesktop) setSidebarOpen(false);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const delta = e.clientX - resizeStartX.current;
      const next = Math.min(380, Math.max(220, resizeStartWidth.current + delta));
      setSidebarWidth(next);
    };
    const onUp = () => {
      resizing.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const updatePresentation = (next: Presentation) => {
    if (!presentationViews.includes(view)) return;
    setPresentationByView((prev) => ({ ...prev, [view]: next }));
    localStorage.setItem(presentationStorageKey(view), next);
  };

  return (
    <div className="app-shell flex h-screen overflow-hidden text-gray-900 dark:text-gray-100">
      <div className="app-layout relative flex h-full w-full">
        <div
          className={clsx(
            "app-sidebar-wrap flex h-full",
            isDesktop ? "relative" : "relative overflow-hidden transition-[width] duration-200 ease-out",
          )}
          style={
            isDesktop
              ? { width: sidebarWidth + handleWidth }
              : {
                width: sidebarOpen ? "85vw" : "0px",
                maxWidth: "320px",
              }
          }
        >
          <Sidebar
            view={view}
            onChangeView={onChangeView}
            folders={(foldersQuery.data || []).filter(Boolean).map((f) => ({ ...f, feeds: f.feeds || [] }))}
            activeFolderId={folderId}
            activeFeedId={feedId}
            loadingFolders={foldersQuery.isFetching}
            onSelectFolder={onSelectFolder}
            onSelectFeed={onSelectFeed}
            folderActions={{
              create: async (name) => folderActions.create.mutateAsync(name),
              rename: async (id, name) => folderActions.rename.mutateAsync({ id, name }),
              remove: async (id) => folderActions.remove.mutateAsync(id),
              addFeed: async (folderId, url) => folderActions.addFeed.mutateAsync({ folderId, url }),
              removeFeed: async (id) => folderActions.removeFeed.mutateAsync(id),
              refreshFolder: async (id) => refreshMutations.folder.mutateAsync(id),
            }}
            onOpenSettings={() => {
              setSettingsOpen(true);
              if (!isDesktop) setSidebarOpen(false);
            }}
            onRefreshAll={() => refreshMutations.all.mutateAsync()}
            refreshAllLoading={refreshMutations.all.isPending}
            onClose={!isDesktop ? () => setSidebarOpen(false) : undefined}
            onLogout={logout}
            userEmail={user?.email}
          />
          <div
            className={clsx("resize-handle", isDesktop ? "block" : "hidden")}
            onMouseDown={
              isDesktop
                ? (e) => {
                  e.preventDefault();
                  resizing.current = true;
                  resizeStartX.current = e.clientX;
                  resizeStartWidth.current = sidebarWidth;
                  document.body.style.cursor = "col-resize";
                }
                : undefined
            }
          />
        </div>
        <main ref={mainRef} className="app-main flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
          <AppHeader
            title={headerTitle}
            showPresentationToggle={showPresentationToggle}
            presentation={currentPresentation}
            onChangePresentation={updatePresentation}
            refreshAction={refreshAction}
            onOpenSidebar={!isDesktop ? () => setSidebarOpen(true) : undefined}
          />

          <div className="app-content mx-auto w-full max-w-5xl space-y-6 pb-6">
            {view === "discover" && (
              <Discover
                folders={(foldersQuery.data || []).filter(Boolean)}
                onAddFeed={(folderId, url) => folderActions.addFeed.mutateAsync({ folderId, url })}
                onCreateFolder={(name) => folderActions.create.mutateAsync(name)}
              />
            )}
            {view === "topnews" && (
              <div className="topnews-panel space-y-2">
                {topNewsQuery.data && !topNewsQuery.isFetching && (
                  <p className="text-muted">
                    {topNewsQuery.data.source === "ai"
                      ? "Generated using AI"
                      : `Fallback: ${formatTopNewsFallbackReason(topNewsQuery.data.reason)}`}
                  </p>
                )}
                <ItemList
                  items={topNewsQuery.data?.items || []}
                  presentation={currentPresentation}
                  onSelect={(item) => setSelectedItem(item)}
                  onToggleBookmark={(item) => bookmarkMut.mutate({ id: item.id, set: !item.state.isBookmarked })}
                  loading={topNewsQuery.isFetching}
                />
              </div>
            )}
            {view === "home" && (
              <div className="home-panel">
                {showHomeRows ? (
                  <>
                    <HomeCategoryRows
                      rows={homeRows}
                      loading={itemsQuery.isFetching || isRefreshingFeed}
                      onSelect={(item) => setSelectedItem(item)}
                      onToggleBookmark={(item) => bookmarkMut.mutate({ id: item.id, set: !item.state.isBookmarked })}
                    />
                    <div ref={homeLoadMoreRef} className="h-px w-full" aria-hidden="true" />
                    {hasMore && (
                      <div className="mt-2 flex items-center justify-center pt-6">
                        <button
                          disabled={itemsQuery.isFetchingNextPage || itemsQuery.isFetching}
                          onClick={loadMore}
                          className="btn-primary disabled:opacity-50"
                        >
                          {itemsQuery.isFetchingNextPage || itemsQuery.isFetching ? "Loading..." : "Load more"}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <ItemList
                    items={items}
                    presentation={currentPresentation}
                    onSelect={(item) => setSelectedItem(item)}
                    onToggleBookmark={(item) => bookmarkMut.mutate({ id: item.id, set: !item.state.isBookmarked })}
                    hasMore={hasMore}
                    onLoadMore={loadMore}
                    loading={itemsQuery.isFetchingNextPage || itemsQuery.isFetching || isRefreshingFeed}
                    autoLoad
                  />
                )}
              </div>
            )}
            {view === "bookmarks" && (
              <ItemList
                items={items}
                presentation={currentPresentation}
                onSelect={(item) => setSelectedItem(item)}
                onToggleBookmark={(item) => bookmarkMut.mutate({ id: item.id, set: !item.state.isBookmarked })}
                hasMore={hasMore}
                onLoadMore={loadMore}
                loading={bookmarksQuery.isFetchingNextPage || bookmarksQuery.isFetching}
                autoLoad
              />
            )}
          </div>
        </main>
      </div>

      {selectedItem && (
        <ArticleModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onToggleBookmark={(item) => {
            bookmarkMut.mutate({ id: item.id, set: !item.state.isBookmarked });
            setSelectedItem((prev) => (prev ? { ...prev, state: { ...prev.state, isBookmarked: !prev.state.isBookmarked } } : prev));
          }}
        />
      )}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <InstallPrompt />
      <LogPanel />
    </div>
  );
}
