import type { Item } from "../api/types";
import type { Folder } from "../api/types";

export type CategoryDefinition = {
    key: string;
    label: string;
    keywords: string[];
};

export const HOME_CATEGORY_DEFS: CategoryDefinition[] = [
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

export const HOME_CATEGORY_KEYS = HOME_CATEGORY_DEFS.filter((def) => def.key !== "all");
export const HOME_ROW_LIMIT = 20;

export type FeedMeta = {
    folderName?: string;
    feedTitle?: string;
    feedUrl?: string;
    siteUrl?: string;
};

export function buildFeedMetaMap(folders: Folder[]): Map<number, FeedMeta> {
    const map = new Map<number, FeedMeta>();
    folders.forEach((folder) => {
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
}

export function buildCategoryText(item: Item, meta?: FeedMeta): string {
    const parts = [
        meta?.folderName,
        meta?.feedTitle,
        meta?.feedUrl,
        meta?.siteUrl,
        item.source?.title,
        item.source?.siteUrl,
    ];
    return parts.filter(Boolean).join(" ").toLowerCase();
}

export function resolveCategoryKey(text: string): string {
    for (const category of HOME_CATEGORY_KEYS) {
        if (category.keywords.some((keyword) => text.includes(keyword))) {
            return category.key;
        }
    }
    return "all";
}

export function getItemCategory(item: Item, meta?: FeedMeta): string {
    return resolveCategoryKey(buildCategoryText(item, meta));
}

export type HomeRow = {
    key: string;
    label: string;
    items: Item[];
};

export function buildHomeRows(items: Item[], feedMetaById: Map<number, FeedMeta>): HomeRow[] {
    const categorizedItems = items.map((item) => ({
        item,
        category: getItemCategory(item, feedMetaById.get(item.feedId)),
    }));

    const byCategory = new Map<string, Item[]>();
    categorizedItems.forEach(({ item, category }) => {
        if (!byCategory.has(category)) {
            byCategory.set(category, []);
        }
        byCategory.get(category)?.push(item);
    });

    const rows: HomeRow[] = [];
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
}
