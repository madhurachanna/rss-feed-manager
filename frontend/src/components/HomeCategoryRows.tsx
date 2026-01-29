import type { Item } from "../api/types";
import clsx from "clsx";
import { useState, useMemo } from "react";
import { decodeHtmlEntities, timeAgo } from "../utils/format";
import { getCover } from "../utils/itemMedia";
import type { HomeRow } from "../utils/categories";

type Props = {
  rows: HomeRow[];
  loading?: boolean;
  onSelect: (item: Item) => void;
  onToggleBookmark: (item: Item) => void;
};

// Check if item has a usable cover image
function hasImage(item: Item): boolean {
  return getCover(item) !== null;
}

// Image component with error handling
function FeedImage({ src, className, onError }: { src: string; className?: string; onError: () => void }) {
  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      onError={onError}
      onLoad={(e) => {
        const img = e.currentTarget;
        if (img.naturalWidth < 50 || img.naturalHeight < 50) {
          onError();
        }
      }}
    />
  );
}

// Large Hero Card
function HeroCardLarge({ item, onSelect, onToggleBookmark }: { item: Item; onSelect: () => void; onToggleBookmark: () => void }) {
  const [imgError, setImgError] = useState(false);
  const cover = getCover(item);

  if (!cover || imgError) return null;

  return (
    <article
      className="group card relative cursor-pointer overflow-hidden"
      onClick={onSelect}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        <FeedImage
          src={cover}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="mb-2 inline-flex items-center rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-semibold text-white">
            Featured
          </div>
          <h2 className="font-heading text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">
            {decodeHtmlEntities(item.title)}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-200">
            <span className="font-medium text-white">{decodeHtmlEntities(item.source?.title)}</span>
            <span>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </div>
        </div>
      </div>
      <button
        className={clsx(
          "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-opacity",
          item.state.isBookmarked
            ? "bg-yellow-200 text-yellow-800 opacity-100 dark:bg-yellow-700 dark:text-yellow-50"
            : "bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-300"
        )}
        onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
      >
        {item.state.isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
      </button>
    </article>
  );
}

// Medium Hero Card (for grid)
function HeroCardMedium({ item, onSelect, onToggleBookmark }: { item: Item; onSelect: () => void; onToggleBookmark: () => void }) {
  const [imgError, setImgError] = useState(false);
  const cover = getCover(item);

  if (!cover || imgError) return null;

  return (
    <article
      className="group card relative cursor-pointer overflow-hidden"
      onClick={onSelect}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        <FeedImage
          src={cover}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white sm:text-base">
            {decodeHtmlEntities(item.title)}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-200">
            <span>{decodeHtmlEntities(item.source?.title)}</span>
            <span>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </div>
        </div>
      </div>
      <button
        className={clsx(
          "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-opacity",
          item.state.isBookmarked
            ? "bg-yellow-200 text-yellow-800 opacity-100 dark:bg-yellow-700 dark:text-yellow-50"
            : "bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-300"
        )}
        onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
      >
        {item.state.isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
      </button>
    </article>
  );
}

// Horizontal scrolling card for category rows
function RowCard({ item, onSelect, onToggleBookmark }: { item: Item; onSelect: () => void; onToggleBookmark: () => void }) {
  const [imgError, setImgError] = useState(false);
  const cover = getCover(item);

  if (!cover || imgError) return null;

  return (
    <article
      className="group card relative w-[280px] flex-none cursor-pointer snap-start overflow-hidden sm:w-72"
      onClick={onSelect}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        <FeedImage
          src={cover}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
        <button
          className={clsx(
            "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-opacity",
            item.state.isBookmarked
              ? "bg-yellow-200 text-yellow-800 opacity-100 dark:bg-yellow-700 dark:text-yellow-50"
              : "bg-white/90 text-gray-600 opacity-0 group-hover:opacity-100 dark:bg-gray-800/90 dark:text-gray-300"
          )}
          onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
        >
          {item.state.isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
        </button>
      </div>
      <div className="p-3">
        <p className="text-xs font-medium text-[var(--accent)]">
          {decodeHtmlEntities(item.source?.title)}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-[var(--accent)]">
          {decodeHtmlEntities(item.title)}
        </h3>
        <p className="text-muted mt-1 text-xs">{timeAgo(item.publishedAt)}</p>
      </div>
    </article>
  );
}

// Headline row for text-only items
function HeadlineRow({ item, onSelect, onToggleBookmark }: { item: Item; onSelect: () => void; onToggleBookmark: () => void }) {
  return (
    <article
      className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
      onClick={onSelect}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800">
        {(item.source?.title || "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-1 flex-col min-w-0">
        <h4 className="line-clamp-1 text-sm font-medium group-hover:text-[var(--accent)]">
          {decodeHtmlEntities(item.title)}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {decodeHtmlEntities(item.source?.title)} · {timeAgo(item.publishedAt)}
        </p>
      </div>
      <button
        className={clsx(
          "shrink-0 p-1 rounded-full transition-opacity",
          item.state.isBookmarked
            ? "text-yellow-500"
            : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-500"
        )}
        onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
      >
        {item.state.isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
      </button>
    </article>
  );
}

// Shimmer loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={clsx("card skeleton", i === 1 && "sm:col-span-2 lg:col-span-2")}>
            <div className="aspect-[16/9]" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="skeleton h-5 w-32 rounded" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card w-72 flex-none">
              <div className="aspect-[16/9] skeleton" />
              <div className="p-3 space-y-2">
                <div className="skeleton h-3 w-1/3 rounded" />
                <div className="skeleton h-4 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomeCategoryRows({ rows, loading, onSelect, onToggleBookmark }: Props) {
  // Separate items into those with images and those without
  const { withImages, withoutImages, heroItems, categoryRows } = useMemo(() => {
    const allItems = rows.flatMap((r) => r.items);
    const withImages = allItems.filter(hasImage);
    const withoutImages = allItems.filter((item) => !hasImage(item));

    // Dynamic hero count: more feeds = more hero cards (min 3, max 7)
    const uniqueSources = new Set(withImages.map((i) => i.source?.title)).size;
    const heroCount = Math.min(7, Math.max(3, Math.floor(uniqueSources * 0.5) + 2));

    const heroItems = withImages.slice(0, heroCount);

    // Track used IDs
    const usedIds = new Set(heroItems.map((i) => i.id));

    // Category rows: only items with images, excluding hero items
    const categoryRows = rows
      .filter((r) => r.key !== "latest")
      .map((row) => ({
        ...row,
        items: row.items.filter((item) => hasImage(item) && !usedIds.has(item.id)),
      }))
      .filter((row) => row.items.length > 0);

    return { withImages, withoutImages, heroItems, categoryRows };
  }, [rows]);

  if (rows.length === 0 && loading) {
    return <LoadingSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <div className="card rounded-xl border border-dashed p-12 text-center text-gray-500">
        No items yet. Add some feeds or wait for updates.
      </div>
    );
  }

  const hasVisualContent = heroItems.length > 0 || categoryRows.some((r) => r.items.length > 0);

  return (
    <div className="space-y-8">
      {/* Hero Section - Dynamic grid based on item count */}
      {heroItems.length > 0 && (
        <section>
          <h2 className="section-title mb-4">Top Stories</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {heroItems.map((item, idx) => (
              <div
                key={item.id}
                className={clsx(
                  // First item spans 2 columns on larger screens
                  idx === 0 && heroItems.length > 2 && "sm:col-span-2 lg:col-span-2"
                )}
              >
                {idx === 0 && heroItems.length > 2 ? (
                  <HeroCardLarge
                    item={item}
                    onSelect={() => onSelect(item)}
                    onToggleBookmark={() => onToggleBookmark(item)}
                  />
                ) : (
                  <HeroCardMedium
                    item={item}
                    onSelect={() => onSelect(item)}
                    onToggleBookmark={() => onToggleBookmark(item)}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category Rows - Consistent width with hero section */}
      {categoryRows.map((row) => (
        <section key={row.key}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">{row.label}</h2>
          </div>

          <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
            {row.items.slice(0, 12).map((item) => (
              <RowCard
                key={item.id}
                item={item}
                onSelect={() => onSelect(item)}
                onToggleBookmark={() => onToggleBookmark(item)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* More Headlines - Text-only items */}
      {withoutImages.length > 0 && (
        <section>
          <h2 className="section-title mb-3">More Headlines</h2>
          <div className="card divide-y divide-gray-100 dark:divide-gray-800">
            {withoutImages.slice(0, 20).map((item) => (
              <HeadlineRow
                key={item.id}
                item={item}
                onSelect={() => onSelect(item)}
                onToggleBookmark={() => onToggleBookmark(item)}
              />
            ))}
          </div>
          {withoutImages.length > 20 && (
            <p className="text-muted mt-2 text-center text-xs">
              +{withoutImages.length - 20} more headlines
            </p>
          )}
        </section>
      )}

      {/* If no visual content but we have headlines */}
      {!hasVisualContent && withoutImages.length === 0 && (
        <div className="card rounded-xl border border-dashed p-12 text-center text-gray-500">
          No items yet. Add some feeds or wait for updates.
        </div>
      )}
    </div>
  );
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
