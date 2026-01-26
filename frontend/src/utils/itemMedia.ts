import type { Item } from "../api/types";

export function stripHtml(value: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = value;
  return tmp.textContent || tmp.innerText || "";
}

export function getCover(item: Item): string | null {
  // 1) Try mediaJson image
  if (item.mediaJson) {
    try {
      const parsed = JSON.parse(item.mediaJson);
      const media = Array.isArray(parsed) ? parsed : [];
      const img = media.find((m) => m?.type?.startsWith("image/") && m.url && !isLikelyAvatar(m.url));
      if (img?.url) return img.url;
    } catch {
      /* ignore */
    }
  }
  // 2) Try first <img> in content/summary
  const html = item.contentHtml || item.summaryText || "";
  if (html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const imgs = Array.from(doc.querySelectorAll("img[src]"));
    let best: { src: string; score: number } | null = null;
    for (const img of imgs) {
      const src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";
      const cls = img.getAttribute("class") || "";
      const id = img.getAttribute("id") || "";
      if (!src || isLikelyAvatar(src) || isLikelyAvatar(`${alt} ${cls} ${id}`)) continue;
      const sizeScore = estimateSizeScore(img);
      if (!best || sizeScore > best.score) {
        best = { src, score: sizeScore };
      }
      if (sizeScore >= 3) break;
    }
    if (best?.src) return best.src;
  }
  return null;
}

function isLikelyAvatar(text: string) {
  const needle = text.toLowerCase();
  return (
    needle.includes("avatar") ||
    needle.includes("author") ||
    needle.includes("profile") ||
    needle.includes("headshot") ||
    needle.includes("logo") ||
    needle.includes("icon") ||
    needle.includes("badge")
  );
}

function estimateSizeScore(img: HTMLImageElement) {
  const widthAttr = Number(img.getAttribute("width")) || 0;
  const heightAttr = Number(img.getAttribute("height")) || 0;
  const style = img.getAttribute("style") || "";
  const styleMatch = style.match(/width:\s*(\d+)px.*height:\s*(\d+)px/);
  const styleWidth = styleMatch ? Number(styleMatch[1]) : 0;
  const styleHeight = styleMatch ? Number(styleMatch[2]) : 0;
  const width = Math.max(widthAttr, styleWidth);
  const height = Math.max(heightAttr, styleHeight);
  if (width >= 400 || height >= 300) return 4;
  if (width >= 240 || height >= 180) return 3;
  if (width >= 160 || height >= 120) return 2;
  if (width >= 90 || height >= 90) return 1;
  return 0;
}
