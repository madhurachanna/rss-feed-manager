import DOMPurify from "dompurify";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Item, ReaderResult } from "../api/types";
import { decodeHtmlEntities, formatDate } from "../utils/format";
import { useQuery } from "@tanstack/react-query";
import { fetchAiSummary, readerView } from "../api";
import { BaseModal } from "./BaseModal";
import { useLog } from "../hooks/useLog";
import { extractErrorMessage } from "../services/LogService";

// Constants for image filtering
const MIN_IMAGE_AREA = 10000; // 100x100 px minimum
const MIN_IMAGE_WIDTH = 80;
const MIN_IMAGE_HEIGHT = 50;
const TRACKING_PIXEL_THRESHOLD = 5; // 5x5 or smaller = tracking pixel

type Props = {
  item: Item;
  onClose: () => void;
  onToggleBookmark?: (item: Item) => void;
};

export function ArticleModal({ item, onClose, onToggleBookmark }: Props) {
  const { success, warn, error: logError } = useLog();
  const [tab, setTab] = useState<"default" | "reader" | "ai">("default");
  const readerQuery = useQuery({
    queryKey: ["reader", item.link],
    queryFn: () => readerView(item.link || ""),
    enabled: tab === "reader" && Boolean(item.link),
  });
  const summaryQuery = useQuery({
    queryKey: ["summary", item.id],
    queryFn: () => fetchAiSummary(item.id),
    enabled: tab === "ai",
  });
  const summaryError = useMemo(() => getErrorMessage(summaryQuery.error), [summaryQuery.error]);

  // Log AI summary results
  useEffect(() => {
    if (summaryQuery.isSuccess && summaryQuery.data) {
      if (summaryQuery.data.points.length > 0) {
        success("ai", "AI summary generated", `${summaryQuery.data.points.length} key points extracted`);
      } else {
        warn("ai", "AI summary empty", "No key points could be extracted from this article");
      }
    }
  }, [summaryQuery.isSuccess, summaryQuery.data, success, warn]);

  useEffect(() => {
    if (summaryQuery.isError) {
      logError("ai", "AI summary failed", extractErrorMessage(summaryQuery.error));
    }
  }, [summaryQuery.isError, summaryQuery.error, logError]);

  // Log reader view errors
  useEffect(() => {
    if (readerQuery.isError) {
      warn("api", "Reader view failed", "Showing feed content instead");
    }
  }, [readerQuery.isError, warn]);

  const baseUrl = item.link || item.source?.siteUrl;

  const media = useMemo(() => {
    if (!item.mediaJson) return [];
    try {
      const parsed = JSON.parse(item.mediaJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [item.mediaJson]);

  const sanitizedFeed = useMemo(() => DOMPurify.sanitize(item.contentHtml || item.summaryText || ""), [item.contentHtml, item.summaryText]);
  const readerData = readerQuery.data as ReaderResult | undefined;
  const readerContent = useMemo(() => {
    if (!readerData) return "";
    return DOMPurify.sanitize(readerData.contentHtml || "");
  }, [readerData]);
  
  // Calculate reading time (average 200 words per minute)
  const readingTime = useMemo(() => {
    if (!readerData?.wordCount) return null;
    const minutes = Math.ceil(readerData.wordCount / 200);
    return minutes;
  }, [readerData?.wordCount]);
  
  // Get specific error message for reader mode
  const readerErrorMessage = useMemo(() => {
    if (readerQuery.isError) {
      const err = readerQuery.error as { response?: { data?: { error?: string } }; message?: string };
      return err?.response?.data?.error || err?.message || "Failed to load reader view";
    }
    if (readerData?.fallback && readerData?.error) {
      return readerData.error;
    }
    return null;
  }, [readerQuery.isError, readerQuery.error, readerData]);
  const mediaUrlsInFeed = useMemo(() => collectMediaUrls(sanitizedFeed, baseUrl), [sanitizedFeed, baseUrl]);
  const visibleMedia = useMemo(
    () =>
      media.filter((entry) => {
        if (!entry.url) return false;
        const resolved = resolveUrl(baseUrl, entry.url);
        if (!resolved) return true;
        const key = canonicalizeMediaUrl(resolved);
        return !mediaUrlsInFeed.has(key);
      }),
    [media, mediaUrlsInFeed, baseUrl],
  );

  return (
    <BaseModal
      open={true}
      onClose={onClose}
      maxWidthClass="max-w-[960px]"
      containerClassName="article-modal p-0"
    >
      <div className="article-modal-body flex h-[100dvh] w-full flex-col overflow-hidden sm:h-[85vh]">
        <div className="article-modal-header flex-shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-6 sm:py-4">
          <div>
            <p className="text-muted">{decodeHtmlEntities(item.source?.title)}</p>
            <h2 className="section-title">{decodeHtmlEntities(item.title)}</h2>
            <p className="text-muted">
              {decodeHtmlEntities(item.author)} · {formatDate(item.publishedAt)}
            </p>
          </div>
        </div>
        <div className="article-modal-tabs flex flex-shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-800 sm:px-6">
          {onToggleBookmark && (
            <button
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={() => onToggleBookmark(item)}
              aria-label={item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}
              title={item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              {item.state.isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
              <span className="sr-only">{item.state.isBookmarked ? "Remove bookmark" : "Bookmark"}</span>
            </button>
          )}
          <span className="h-4 w-px bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
          <button
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
              tab === "default"
                ? "bg-accent-soft font-semibold text-accent"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
            onClick={() => setTab("default")}
            aria-label="Default view"
            title="Default view"
          >
            <DefaultIcon />
            <span className="sr-only">Default</span>
          </button>
          <button
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
              tab === "reader"
                ? "bg-accent-soft font-semibold text-accent"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
            onClick={() => setTab("reader")}
            aria-label="Reader view"
            title="Reader view"
          >
            <ReaderIcon />
            <span className="sr-only">Reader View</span>
          </button>
          <button
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
              tab === "ai"
                ? "bg-accent-soft font-semibold text-accent"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
            onClick={() => setTab("ai")}
            aria-label="AI summary"
            title="AI summary"
          >
            <AiIcon />
            <span className="sr-only">AI Summary</span>
          </button>
          {item.link && (
            <a
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-accent transition hover:bg-accent-soft/70"
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open original"
              title="Open original"
            >
              <ExternalLinkIcon />
              <span className="sr-only">Open original</span>
            </a>
          )}
        </div>
        <div className="article-modal-content flex-1 overflow-y-auto px-4 py-5 text-sm leading-relaxed sm:px-7 sm:py-6">
          {/* Default tab content */}
          <div className={tab === "default" ? "" : "hidden"}>
            <SafeHtml html={sanitizedFeed} baseUrl={baseUrl} />
            {visibleMedia.length > 0 && (
              <div className="article-modal-media mt-4 space-y-2">
                {visibleMedia.map((m) => (
                  <MediaBlock key={m.url} url={m.url} type={m.type} />
                ))}
              </div>
            )}
          </div>
          
          {/* Reader tab content */}
          <div className={tab === "reader" ? "" : "hidden"}>
            {/* Loading state - shimmer skeleton */}
            {readerQuery.isLoading && <ArticleShimmer />}
            
            {/* Loaded content */}
            {!readerQuery.isLoading && (
              <>
                {/* Reading time and metadata */}
                {readerData && !readerData.fallback && (readingTime || readerData.wordCount) && (
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {readingTime && (
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon />
                        {readingTime} min read
                      </span>
                    )}
                    {readerData.wordCount > 0 && (
                      <span>{readerData.wordCount.toLocaleString()} words</span>
                    )}
                  </div>
                )}
                
                {/* Error/warning messages */}
                {readerErrorMessage && (
                  <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    {readerErrorMessage}. Showing feed content instead.
                  </div>
                )}
                
                {/* Reader content or fallback */}
                {readerData && !readerData.fallback && (
                  <SafeHtml
                    html={readerContent}
                    baseUrl={readerData.sourceUrl || baseUrl}
                    filterImages={false}
                    filterSvgs={true}
                  />
                )}
                
                {/* Show feed content as fallback when reader extraction failed or is low quality */}
                {(readerQuery.isError || readerData?.fallback) && (
                  <SafeHtml html={sanitizedFeed} baseUrl={baseUrl} />
                )}
              </>
            )}
          </div>
          
          {/* AI tab content */}
          <div className={tab === "ai" ? "" : "hidden"}>
            {/* Loading state - shimmer skeleton */}
            {summaryQuery.isLoading && <SummaryShimmer />}
            
            {/* Loaded content */}
            {!summaryQuery.isLoading && (
              <div className="space-y-3">
                {summaryQuery.isError && <p className="text-red-600">{summaryError}</p>}
                {summaryQuery.data && summaryQuery.data.points.length > 0 && (
                  <div className="p-4 text-sm">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">KEY POINTS</p>
                    <ul className="list-disc space-y-2 pl-5 text-gray-800 dark:text-gray-100">
                      {summaryQuery.data.points.map((point, idx) => (
                        <li key={`${idx}-${point.slice(0, 12)}`}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {summaryQuery.data && summaryQuery.data.points.length === 0 && (
                  <p className="text-muted">No summary points available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}

function MediaBlock({ url, type }: { url: string; type: string }) {
  if (type.startsWith("image/")) {
    return <img src={url} alt="" className="max-h-96 w-full rounded-md object-contain" />;
  }
  if (type.startsWith("audio/")) {
    return <audio controls className="w-full" src={url} />;
  }
  if (type.startsWith("video/")) {
    return <video controls className="w-full" src={url} />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
      Media: {url}
    </a>
  );
}

function SafeHtml({
  html,
  baseUrl,
  filterImages = true,
  filterSvgs = false,
}: {
  html: string;
  baseUrl?: string;
  filterImages?: boolean;
  filterSvgs?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const anchors = ref.current.querySelectorAll("a");
    anchors.forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      const href = a.getAttribute("href");
      const resolved = resolveUrl(baseUrl, href);
      if (resolved && resolved !== href) {
        a.setAttribute("href", resolved);
      }
    });
    if (filterSvgs) {
      const svgs = Array.from(ref.current.querySelectorAll("svg"));
      svgs.forEach((svg) => svg.remove());
      const svgSources = Array.from(ref.current.querySelectorAll("source[type='image/svg+xml']"));
      svgSources.forEach((source) => source.remove());
    }
    const images = Array.from(ref.current.querySelectorAll("img"));
    const seenImages = new Set<string>();
    images.forEach((img) => {
      const src = normalizeImageSource(img);
      const resolved = resolveUrl(baseUrl, src);
      if (filterSvgs && (isSvgSource(resolved || src) || srcsetContainsSvg(img.getAttribute("srcset")))) {
        img.remove();
        return;
      }
      if (resolved && resolved !== src) {
        img.setAttribute("src", resolved);
      }
      if (resolved) {
        const key = canonicalizeMediaUrl(resolved);
        if (seenImages.has(key)) {
          img.remove();
          return;
        }
        seenImages.add(key);
      }
      if (filterImages && shouldRemoveImage(img)) {
        img.remove();
      }
    });
  }, [html, baseUrl, filterImages, filterSvgs]);
  return <div ref={ref} className="article-modal-html reader-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

function normalizeImageSource(img: HTMLImageElement) {
  // First, try to get src from srcset (highest resolution)
  const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset");
  if (srcset) {
    const bestSrc = getBestSrcFromSrcset(srcset);
    if (bestSrc) {
      img.setAttribute("src", bestSrc);
      return bestSrc;
    }
  }
  
  // Check if image is inside a <picture> element and get best source
  const picture = img.closest("picture");
  if (picture) {
    const bestPictureSrc = getBestSourceFromPicture(picture);
    if (bestPictureSrc) {
      img.setAttribute("src", bestPictureSrc);
      return bestPictureSrc;
    }
  }
  
  const rawSrc = img.getAttribute("src");
  if (rawSrc && rawSrc.trim() !== "") {
    return rawSrc;
  }
  
  // Check data attributes for lazy-loaded images
  const dataSrc =
    img.getAttribute("data-src") ||
    img.getAttribute("data-original") ||
    img.getAttribute("data-lazy-src") ||
    img.getAttribute("data-url") ||
    img.getAttribute("data-hi-res-src");
  if (dataSrc) {
    img.setAttribute("src", dataSrc);
    return dataSrc;
  }
  return rawSrc || "";
}

function getBestSrcFromSrcset(srcset: string): string | null {
  if (!srcset) return null;
  
  try {
    // Parse srcset entries: "url1 100w, url2 200w" or "url1 1x, url2 2x"
    const entries = srcset.split(",").map(entry => {
      const parts = entry.trim().split(/\s+/);
      const url = parts[0];
      const descriptor = parts[1] || "1x";
      
      // Parse width descriptor (e.g., "800w") or pixel density (e.g., "2x")
      let value = 1;
      if (descriptor.endsWith("w")) {
        value = parseInt(descriptor, 10) || 0;
      } else if (descriptor.endsWith("x")) {
        value = parseFloat(descriptor) * 1000 || 1000; // Convert to comparable scale
      }
      
      return { url, value };
    });
    
    // Sort by value descending and return highest resolution
    entries.sort((a, b) => b.value - a.value);
    return entries[0]?.url || null;
  } catch {
    return null;
  }
}

function getBestSourceFromPicture(picture: HTMLPictureElement): string | null {
  const sources = picture.querySelectorAll("source");
  let bestSrc: string | null = null;
  let bestValue = 0;
  
  for (const source of sources) {
    // Skip SVG sources
    const type = source.getAttribute("type") || "";
    if (type.includes("svg")) continue;
    
    const srcset = source.getAttribute("srcset");
    if (srcset) {
      const src = getBestSrcFromSrcset(srcset);
      if (src) {
        // Simple heuristic: prefer later sources (usually higher res)
        bestSrc = src;
      }
    }
  }
  
  return bestSrc;
}

function isSvgSource(raw: string) {
  const value = raw.trim().toLowerCase();
  if (!value) return false;
  if (value.startsWith("data:image/svg")) return true;
  const withoutQuery = value.split("#")[0].split("?")[0];
  return withoutQuery.endsWith(".svg");
}

function srcsetContainsSvg(srcset: string | null) {
  if (!srcset) return false;
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .some((entry) => isSvgSource(entry));
}

function getErrorMessage(error: unknown) {
  if (!error) return "AI summary unavailable.";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) return response.data.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return "AI summary unavailable.";
}

function collectMediaUrls(html: string, baseUrl?: string) {
  const urls = new Set<string>();
  if (!html) return urls;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("img").forEach((img) => {
    const src = normalizeImageSource(img);
    const resolved = resolveUrl(baseUrl, src);
    if (resolved) urls.add(canonicalizeMediaUrl(resolved));
  });
  doc.querySelectorAll("video, audio").forEach((media) => {
    const src = media.getAttribute("src");
    const resolved = resolveUrl(baseUrl, src);
    if (resolved) urls.add(canonicalizeMediaUrl(resolved));
    media.querySelectorAll("source").forEach((source) => {
      const sourceSrc = source.getAttribute("src");
      const sourceResolved = resolveUrl(baseUrl, sourceSrc);
      if (sourceResolved) urls.add(canonicalizeMediaUrl(sourceResolved));
    });
  });
  return urls;
}

function canonicalizeMediaUrl(raw: string) {
  try {
    const url = new URL(raw);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");
    return url.toString();
  } catch {
    return raw;
  }
}

function resolveUrl(baseUrl: string | undefined, raw: string | null) {
  if (!baseUrl || !raw) return raw || "";
  const value = raw.trim();
  if (!value) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    return value;
  }
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function shouldRemoveImage(img: HTMLImageElement) {
  const src = (img.getAttribute("src") || "").toLowerCase();
  const alt = (img.getAttribute("alt") || "").toLowerCase();
  const cls = (img.getAttribute("class") || "").toLowerCase();
  const id = (img.getAttribute("id") || "").toLowerCase();
  const hint = `${src} ${alt} ${cls} ${id}`;
  
  // Check for avatar/icon patterns
  if (isLikelyAvatar(hint)) return true;
  
  // Check for tracking pixels and tiny images
  if (isTrackingPixel(img)) return true;
  
  // Get dimensions from multiple sources
  const widthAttr = Number(img.getAttribute("width")) || 0;
  const heightAttr = Number(img.getAttribute("height")) || 0;
  const naturalWidth = img.naturalWidth || 0;
  const naturalHeight = img.naturalHeight || 0;
  
  const width = widthAttr || naturalWidth;
  const height = heightAttr || naturalHeight;
  
  // If we have dimensions, use area-based filtering
  if (width > 0 && height > 0) {
    const area = width * height;
    // Filter out small images based on area
    if (area < MIN_IMAGE_AREA) return true;
    // Also check minimum dimensions
    if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) return true;
  } else {
    // Fallback to attribute-only check for images without natural dimensions yet
    if (widthAttr > 0 && widthAttr < MIN_IMAGE_WIDTH) return true;
    if (heightAttr > 0 && heightAttr < MIN_IMAGE_HEIGHT) return true;
  }
  
  return false;
}

function isTrackingPixel(img: HTMLImageElement) {
  const width = img.width || img.naturalWidth || Number(img.getAttribute("width")) || 0;
  const height = img.height || img.naturalHeight || Number(img.getAttribute("height")) || 0;
  
  // Check for 1x1 or very small tracking pixels
  if (width > 0 && width <= TRACKING_PIXEL_THRESHOLD && height > 0 && height <= TRACKING_PIXEL_THRESHOLD) {
    return true;
  }
  
  // Check for common tracking pixel patterns in src
  const src = (img.getAttribute("src") || "").toLowerCase();
  const trackingPatterns = [
    "pixel", "beacon", "track", "analytics", "stat", 
    "count", "impression", "spacer", "blank.gif", "clear.gif",
    "1x1", "1px"
  ];
  return trackingPatterns.some(pattern => src.includes(pattern));
}

function isLikelyAvatar(text: string) {
  return (
    text.includes("avatar") ||
    text.includes("author") ||
    text.includes("profile") ||
    text.includes("headshot") ||
    text.includes("logo") ||
    text.includes("icon") ||
    text.includes("badge")
  );
}

function DefaultIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M7 4h7l4 4v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 4v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ReaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 6.5C7.5 5 10 5 12 6.2c2-1.2 4.5-1.2 7 0V18c-2.5-1.2-5-1.2-7 0-2-1.2-4.5-1.2-7 0V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AiIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 7.5l9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.5 7.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M14 5h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14L19 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
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

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShimmerLine({ width = "100%" }: { width?: string }) {
  return (
    <div 
      className="skeleton h-4 rounded" 
      style={{ width }}
    />
  );
}

function ArticleShimmer() {
  return (
    <div className="space-y-4">
      {/* Reading time shimmer */}
      <div className="flex items-center gap-3">
        <ShimmerLine width="80px" />
        <ShimmerLine width="60px" />
      </div>
      
      {/* Paragraph shimmers */}
      <div className="space-y-2">
        <ShimmerLine width="100%" />
        <ShimmerLine width="95%" />
        <ShimmerLine width="88%" />
        <ShimmerLine width="92%" />
      </div>
      
      <div className="space-y-2">
        <ShimmerLine width="100%" />
        <ShimmerLine width="90%" />
        <ShimmerLine width="96%" />
        <ShimmerLine width="70%" />
      </div>
      
      {/* Image placeholder shimmer */}
      <div className="skeleton h-48 w-full rounded-xl" />
      
      <div className="space-y-2">
        <ShimmerLine width="100%" />
        <ShimmerLine width="94%" />
        <ShimmerLine width="88%" />
        <ShimmerLine width="82%" />
      </div>
      
      <div className="space-y-2">
        <ShimmerLine width="100%" />
        <ShimmerLine width="91%" />
        <ShimmerLine width="60%" />
      </div>
    </div>
  );
}

function SummaryShimmer() {
  return (
    <div className="p-4">
      {/* Header shimmer */}
      <div className="mb-4">
        <ShimmerLine width="100px" />
      </div>
      
      {/* Bullet point shimmers */}
      <div className="space-y-4 pl-5">
        <div className="flex items-start gap-2">
          <div className="skeleton mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <ShimmerLine width="100%" />
            <ShimmerLine width="85%" />
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="skeleton mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <ShimmerLine width="95%" />
            <ShimmerLine width="70%" />
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="skeleton mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <ShimmerLine width="100%" />
            <ShimmerLine width="90%" />
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="skeleton mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <ShimmerLine width="88%" />
            <ShimmerLine width="65%" />
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="skeleton mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <ShimmerLine width="92%" />
            <ShimmerLine width="78%" />
          </div>
        </div>
      </div>
    </div>
  );
}
