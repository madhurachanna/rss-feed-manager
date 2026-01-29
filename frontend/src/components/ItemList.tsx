import { useEffect, useRef, useState } from "react";
import type { Item } from "../api/types";
import { decodeHtmlEntities, timeAgo } from "../utils/format";
import { getCover, stripHtml } from "../utils/itemMedia";
import { clsx } from "clsx";

type Props = {
  items: Item[];
  onSelect: (item: Item) => void;
  onToggleBookmark: (item: Item) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  title?: string;
  presentation?: "title" | "compact" | "cards";
  autoLoad?: boolean;
};

export function ItemList({
  items,
  onSelect,
  onToggleBookmark,
  onLoadMore,
  hasMore,
  loading,
  title,
  presentation = "compact",
  autoLoad = true,
}: Props) {
  const safeItems = Array.isArray(items) ? items.filter((item): item is Item => Boolean(item)) : [];
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  const loadingRef = useRef(Boolean(loading));
  const [manualVisible, setManualVisible] = useState(false);
  const [observerSupported, setObserverSupported] = useState(true);

  useEffect(() => {
    loadingRef.current = Boolean(loading);
  }, [loading]);

  const resolveScrollRoot = () => findScrollParent(listRef.current);

  const getScrollMetrics = (root: HTMLElement | null) => {
    if (root) {
      return { scrollTop: root.scrollTop, clientHeight: root.clientHeight, scrollHeight: root.scrollHeight };
    }
    const doc = document.documentElement;
    return { scrollTop: doc.scrollTop, clientHeight: doc.clientHeight, scrollHeight: doc.scrollHeight };
  };

  const updateScrollState = (root?: HTMLElement | null) => {
    const metrics = getScrollMetrics(root ?? resolveScrollRoot());
    const canScroll = metrics.scrollHeight - metrics.clientHeight > 8;
    if (metrics.scrollTop > 0) hasScrolledRef.current = true;
    const nearBottom = metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight < 240;
    setManualVisible(Boolean(hasMore && (nearBottom || !canScroll)));
  };

  useEffect(() => {
    const root = resolveScrollRoot();
    updateScrollState(root);
  }, [safeItems.length, presentation, hasMore, loading]);

  useEffect(() => {
    const root = resolveScrollRoot();
    const target = sentinelRef.current;
    if (!autoLoad) {
      setObserverSupported(false);
      return;
    }
    if (!root || !target || !onLoadMore || !hasMore) return;
    if (!("IntersectionObserver" in window)) {
      setObserverSupported(false);
      return;
    }
    setObserverSupported(true);
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        const metrics = getScrollMetrics(root);
        const canScroll = metrics.scrollHeight - metrics.clientHeight > 8;
        if (canScroll && !hasScrolledRef.current) return;
        if (loadingRef.current) return;
        loadingRef.current = true;
        onLoadMore();
      },
      { root, rootMargin: "200px 0px 200px 0px", threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [autoLoad, onLoadMore, hasMore, presentation, safeItems.length]);

  useEffect(() => {
    const root = resolveScrollRoot();
    const scrollTarget: HTMLElement | Window = root ?? window;
    const handler = () => updateScrollState(root);
    scrollTarget.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => scrollTarget.removeEventListener("scroll", handler);
  }, [hasMore, presentation, safeItems.length]);

  const showManual = Boolean(onLoadMore && hasMore && (!autoLoad || manualVisible || !observerSupported));
  const showSkeleton = Boolean(loading && safeItems.length === 0);

  const skeletonCount = presentation === "cards" ? 6 : presentation === "title" ? 8 : 5;

  return (
    <div className="item-list flex h-full flex-col">
      {title && <h2 className="section-title mb-4">{title}</h2>}
      <div
        ref={listRef}
        className={clsx("item-list-body flex-1 pr-1", presentation === "cards" ? "space-y-0" : "space-y-4")}
      >
        {showSkeleton && (
          <>
            {presentation === "cards" && (
              <div className="item-list-grid grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
                {Array.from({ length: skeletonCount }).map((_, idx) => (
                  <div key={`skeleton-card-${idx}`} className="card relative flex h-full flex-col overflow-hidden">
                    <div className="aspect-[16/9] w-full skeleton" />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="skeleton h-4 w-5/6 rounded-md" />
                      <div className="mt-3 skeleton h-3 w-1/2 rounded-md" />
                      <div className="mt-4 space-y-2">
                        <div className="skeleton h-3 w-full rounded-md" />
                        <div className="skeleton h-3 w-5/6 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {presentation === "compact" && (
              <div className="item-list-compact space-y-4" aria-hidden="true">
                {Array.from({ length: skeletonCount }).map((_, idx) => (
                  <div key={`skeleton-row-${idx}`} className="card relative rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="skeleton h-4 w-4/5 rounded-md" />
                        <div className="skeleton h-3 w-1/3 rounded-md" />
                        <div className="skeleton h-3 w-full rounded-md" />
                        <div className="skeleton h-3 w-5/6 rounded-md" />
                      </div>
                      <div className="hidden h-20 w-28 flex-shrink-0 sm:block">
                        <div className="h-full w-full rounded-xl skeleton" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {presentation === "title" && (
              <div className="item-list-title space-y-2" aria-hidden="true">
                {Array.from({ length: skeletonCount }).map((_, idx) => (
                  <div
                    key={`skeleton-title-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-800"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="skeleton h-3 w-64 rounded-md" />
                      <div className="skeleton h-2 w-40 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!showSkeleton && safeItems.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-6 text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
            No items yet. Add a feed or refresh.
          </div>
        )}

        {!showSkeleton && presentation === "cards" && (
          <div className="item-list-grid grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {safeItems.map((item) => (
              <article
                key={item.id}
                className="item-card group card relative flex h-full cursor-pointer flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-md"
                onClick={() => onSelect(item)}
              >
                {getCover(item) && (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={getCover(item) as string} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-base font-semibold leading-tight hover:underline line-clamp-2">
                    {decodeHtmlEntities(item.title) || "(untitled)"}
                  </h3>
                  <p className="text-muted mt-2">
                    {decodeHtmlEntities(item.source?.title) || "Unknown"} · {timeAgo(item.publishedAt)}
                  </p>
                  <p className="text-body mt-3 line-clamp-3">{stripHtml(item.summaryText || item.contentHtml || "")}</p>
                </div>
                <button
                  className={clsx(
                    "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-opacity",
                    item.state.isBookmarked
                      ? "bg-yellow-200 text-yellow-800 opacity-100 dark:bg-yellow-700 dark:text-yellow-50"
                      : "bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-300",
                  )}
                  onClick={(e) => { e.stopPropagation(); onToggleBookmark(item); }}
                  aria-label={item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}
                  title={item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}
                >
                  {item.state.isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
                </button>
              </article>
            ))}
          </div>
        )}

        {!showSkeleton && presentation === "compact" && (
          <div className="item-list-compact space-y-4">
            {safeItems.map((item) => {
              const cover = getCover(item);
              return (
                <article
                  key={item.id}
                  className="item-row group card card-hover relative cursor-pointer rounded-2xl p-5 ring-1 ring-transparent hover:ring-gray-100 dark:hover:ring-gray-800"
                  onClick={() => onSelect(item)}
                >
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold leading-tight hover:underline line-clamp-2">
                        {decodeHtmlEntities(item.title) || "(untitled)"}
                      </h3>
                      <p className="text-muted mt-1">
                        {decodeHtmlEntities(item.source?.title) || "Unknown"} · {timeAgo(item.publishedAt)}
                      </p>
                      <p className="text-body mt-3 line-clamp-3">{stripHtml(item.summaryText || item.contentHtml || "")}</p>
                    </div>
                    {cover && (
                      <div className="hidden h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:block">
                        <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    )}
                  </div>
                  <button
                    className={clsx(
                      "absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-opacity",
                      item.state.isBookmarked
                        ? "bg-yellow-200 text-yellow-800 opacity-100 dark:bg-yellow-700 dark:text-yellow-50"
                        : "bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-300",
                    )}
                    onClick={(e) => { e.stopPropagation(); onToggleBookmark(item); }}
                    aria-label={item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}
                    title={item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}
                  >
                    {item.state.isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {!showSkeleton && presentation === "title" && (
          <div className="item-list-title space-y-2">
            {safeItems.map((item) => (
              <article
                key={item.id}
                className="item-title-row group flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-2 py-2 text-sm hover:bg-white dark:border-gray-800 dark:hover:bg-gray-900"
                onClick={() => onSelect(item)}
              >
                <div className="flex flex-col">
                  <div className="text-left font-semibold hover:underline line-clamp-2">{decodeHtmlEntities(item.title) || "(untitled)"}</div>
                  <p className="text-xs text-gray-500">
                    {decodeHtmlEntities(item.source?.title) || "Unknown"} · {timeAgo(item.publishedAt)}
                  </p>
                </div>
                <button
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-opacity",
                    item.state.isBookmarked
                      ? "bg-yellow-200 text-yellow-800 opacity-100 dark:bg-yellow-700 dark:text-yellow-50"
                      : "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
                  )}
                  onClick={(e) => { e.stopPropagation(); onToggleBookmark(item); }}
                  aria-label={item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}
                  title={item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}
                >
                  {item.state.isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
                </button>
              </article>
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
        {showManual && (
          <div className="mt-2 flex items-center justify-center pt-8">
            <button disabled={loading} onClick={onLoadMore} className="btn-primary disabled:opacity-50">
              {loading ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function findScrollParent(node: HTMLElement | null) {
  let current = node?.parentElement || null;
  while (current) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return current;
    current = current.parentElement;
  }
  return null;
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function BookmarkFilledIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" fill="currentColor" />
    </svg>
  );
}
