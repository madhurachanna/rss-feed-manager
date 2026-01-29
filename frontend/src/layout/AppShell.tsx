import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { clsx } from "clsx";

import { Sidebar } from "../components/Sidebar";
import { ItemList } from "../components/ItemList";
import { ArticleModal } from "../modals/ArticleModal";
import { SettingsModal } from "../modals/SettingsModal";
import { InstallPrompt } from "../components/InstallPrompt";
import { useAuth } from "../context/AuthContext";
import { Discover } from "../components/Discover";
import { LogPanel } from "../components/LogPanel";
import { HomeCategoryRows } from "../components/HomeCategoryRows";
import { AppHeader } from "./AppHeader";
import type { NavKey, Presentation } from "./types";
import type { Item } from "../api/types";

import { useFolders } from "../hooks/useFolders";
import { useItems } from "../hooks/useItems";
import { useRefresh } from "../hooks/useRefresh";
import { useLog } from "../hooks/useLog";
import { buildFeedMetaMap, buildHomeRows } from "../utils/categories";

type SortPref = "popular_latest" | "latest" | "oldest";

const presentationViews: NavKey[] = ["home", "bookmarks", "topnews"];

const presentationStorageKey = (view: NavKey) => `pref:presentation:${view}`;

const isPresentation = (value: string | null): value is Presentation =>
  value === "title" || value === "compact" || value === "cards";

const formatTopNewsFallbackReason = (reason?: string) => {
  if (!reason) return "Fallback in use";
  switch (reason) {
    case "gemini_error": return "AI service unavailable";
    case "missing_api_key": return "AI key not configured";
    case "no_items": return "No recent items";
    case "cached": return "Cached results";
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

export function AppShell() {
  const { user, logout } = useAuth();
  const { success, warn, error: logError } = useLog();
  const [params, setParams] = useSearchParams();

  const view = (params.get("view") as NavKey) || "home";
  const folderId = params.get("folderId") ? Number(params.get("folderId")) : undefined;
  const feedId = params.get("feedId") ? Number(params.get("feedId")) : undefined;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches
  );
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches
  );
  const [sortPref, setSortPref] = useState<SortPref>(() => readSortPref());
  const [presentationByView, setPresentationByView] = useState<Record<NavKey, Presentation>>(() => ({
    home: readPresentation("home"),
    bookmarks: readPresentation("bookmarks"),
    topnews: readPresentation("topnews"),
    discover: readPresentation("discover"),
  }));

  const resizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(280);
  const handleWidth = 6;
  const swipeActive = useRef(false);
  const swipeStart = useRef({ x: 0, y: 0 });
  const mainRef = useRef<HTMLElement>(null);
  const lastTopNewsRef = useRef<string>("");

  // Use extracted hooks
  const { foldersQuery, folderActions, getFolderName, getFeedTitle } = useFolders();
  const { itemsQuery, bookmarksQuery, topNewsQuery, items, bookmarkMut, hasMore, loadMore } = useItems({
    folderId,
    feedId,
    view,
    sortPref,
  });
  const refreshMutations = useRefresh({ getFolderName, getFeedTitle });

  const currentPresentation = presentationByView[view] || "compact";
  const showPresentationToggle = presentationViews.includes(view) && !(view === "home" && !feedId);

  // Build home rows from items
  const feedMetaById = useMemo(() => buildFeedMetaMap(foldersQuery.data || []), [foldersQuery.data]);
  const homeRows = useMemo(() => {
    if (view !== "home" || feedId) return [];
    return buildHomeRows(items, feedMetaById);
  }, [items, feedMetaById, view, feedId]);

  // Top news logging
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

  // Preferences listener
  useEffect(() => {
    const onPrefs = () => setSortPref(readSortPref());
    window.addEventListener("prefs-changed", onPrefs);
    return () => window.removeEventListener("prefs-changed", onPrefs);
  }, []);

  // Desktop/mobile detection
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      const nextIsDesktop = media.matches;
      setIsDesktop(nextIsDesktop);
      setSidebarOpen(nextIsDesktop);
    };
    onChange();
    media.addEventListener?.("change", onChange) || media.addListener?.(onChange);
    return () => {
      media.removeEventListener?.("change", onChange) || media.removeListener?.(onChange);
    };
  }, []);

  // Swipe to open sidebar
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

  // Resize sidebar
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

  // Navigation handlers
  const onSelectFolder = (id?: number) => {
    const next = new URLSearchParams(params);
    if (id) next.set("folderId", String(id));
    else next.delete("folderId");
    next.delete("feedId");
    next.set("view", "home");
    setParams(next);
    if (!isDesktop) setSidebarOpen(false);
  };

  const onSelectFeed = (fId: number, id: number) => {
    const next = new URLSearchParams(params);
    next.set("folderId", String(fId));
    next.set("feedId", String(id));
    next.set("view", "home");
    setParams(next);

    const folderMatch = (foldersQuery.data || []).find((f) => f.id === fId);
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

  const updatePresentation = (next: Presentation) => {
    if (!presentationViews.includes(view)) return;
    setPresentationByView((prev) => ({ ...prev, [view]: next }));
    localStorage.setItem(presentationStorageKey(view), next);
  };

  // Derived values
  const activeFeedLabel = useMemo(() => {
    if (!feedId || !foldersQuery.data) return null;
    const folderMatch = folderId ? foldersQuery.data.find((f) => f.id === folderId) : undefined;
    const feedFromFolder = folderMatch?.feeds?.find((f) => f.id === feedId);
    const feedFallback = foldersQuery.data.flatMap((f) => f.feeds || []).find((f) => f.id === feedId);
    const feed = feedFromFolder ?? feedFallback;
    return feed ? feed.title || feed.url || null : null;
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

  return (
    <div className="app-shell flex h-screen overflow-hidden text-gray-900 dark:text-gray-100">
      <div className="app-layout relative flex h-full w-full">
        <div
          className={clsx(
            "app-sidebar-wrap flex h-full",
            isDesktop ? "relative" : "relative overflow-hidden transition-[width] duration-200 ease-out"
          )}
          style={
            isDesktop
              ? { width: sidebarWidth + handleWidth }
              : { width: sidebarOpen ? "85vw" : "0px", maxWidth: "320px" }
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
              create: async (name) => { await folderActions.create.mutateAsync(name); },
              rename: async (id, name) => { await folderActions.rename.mutateAsync({ id, name }); },
              remove: async (id) => { await folderActions.remove.mutateAsync(id); },
              addFeed: async (fId, url) => { await folderActions.addFeed.mutateAsync({ folderId: fId, url }); },
              removeFeed: async (id) => { await folderActions.removeFeed.mutateAsync(id); },
              refreshFolder: async (id) => { await refreshMutations.folder.mutateAsync(id); },
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

          <div className="app-content mx-auto w-full max-w-3xl space-y-6 pb-6">
            {view === "discover" && (
              <Discover
                folders={(foldersQuery.data || []).filter(Boolean)}
                onAddFeed={(fId, url) => folderActions.addFeed.mutateAsync({ folderId: fId, url }).then(() => { })}
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
                  <HomeCategoryRows
                    rows={homeRows}
                    loading={itemsQuery.isFetching || isRefreshingFeed}
                    onSelect={(item) => setSelectedItem(item)}
                    onToggleBookmark={(item) => bookmarkMut.mutate({ id: item.id, set: !item.state.isBookmarked })}
                  />
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
            setSelectedItem((prev) =>
              prev ? { ...prev, state: { ...prev.state, isBookmarked: !prev.state.isBookmarked } } : prev
            );
          }}
        />
      )}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <InstallPrompt />
      <LogPanel />
    </div>
  );
}
