import type { Item } from "../api/types";
import clsx from "clsx";
import { decodeHtmlEntities, timeAgo } from "../utils/format";
import { getCover, stripHtml } from "../utils/itemMedia";

type Row = {
  key: string;
  label: string;
  items: Item[];
};

type Props = {
  rows: Row[];
  loading?: boolean;
  onSelect: (item: Item) => void;
  onToggleBookmark: (item: Item) => void;
};

export function HomeCategoryRows({ rows, loading, onSelect, onToggleBookmark }: Props) {
  if (rows.length === 0) {
    if (loading) {
      return (
        <div className="space-y-8" aria-hidden="true">
          {["Latest updates", "Technology", "Business"].map((label, idx) => (
            <section key={`skeleton-row-${label}-${idx}`} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="skeleton h-5 w-40 rounded-md" />
                <div className="skeleton h-3 w-16 rounded-md" />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 pr-1">
                {Array.from({ length: 4 }).map((_, cardIdx) => (
                  <div key={`skeleton-card-${idx}-${cardIdx}`} className="card relative flex w-64 flex-shrink-0 flex-col overflow-hidden">
                    <div className="aspect-[16/9] w-full skeleton" />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="skeleton h-4 w-5/6 rounded-md" />
                      <div className="mt-2 skeleton h-3 w-1/2 rounded-md" />
                      <div className="mt-3 space-y-2">
                        <div className="skeleton h-3 w-full rounded-md" />
                        <div className="skeleton h-3 w-5/6 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white/60 p-6 text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        No items yet. Add a feed or refresh.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {rows.map((row) => (
        <section key={row.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">{row.label}</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{row.items.length} items</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 pr-1">
            {row.items.map((item) => {
              const cover = getCover(item);
              return (
                <article
                  key={item.id}
                  className="card group relative flex w-64 flex-shrink-0 cursor-pointer flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-md"
                  onClick={() => onSelect(item)}
                >
                  {cover ? (
                    <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] w-full bg-gray-100 dark:bg-gray-800" />
                  )}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-sm font-semibold leading-snug hover:underline">
                    {decodeHtmlEntities(item.title) || "(untitled)"}
                  </h3>
                  <p className="text-muted mt-1 text-xs">
                    {decodeHtmlEntities(item.source?.title) || "Unknown"} · {timeAgo(item.publishedAt)}
                  </p>
                  <p className="text-body mt-2 line-clamp-3 text-xs">{stripHtml(item.summaryText || item.contentHtml || "")}</p>
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
              );
            })}
          </div>
        </section>
      ))}
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
