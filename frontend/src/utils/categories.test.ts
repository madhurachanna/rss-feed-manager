import { describe, test, expect } from "vitest";
import {
    resolveCategoryKey,
    buildCategoryText,
    getItemCategory,
    buildFeedMetaMap,
    buildHomeRows,
    HOME_CATEGORY_DEFS,
    type FeedMeta,
} from "./categories";
import type { Item, Folder, Feed } from "../api/types";

describe("resolveCategoryKey", () => {
    test("returns technology for tech keywords", () => {
        expect(resolveCategoryKey("this is about tech news")).toBe("technology");
        expect(resolveCategoryKey("apple releases new iphone")).toBe("technology");
        expect(resolveCategoryKey("google ai announcement")).toBe("technology");
    });

    test("returns business for business keywords", () => {
        expect(resolveCategoryKey("wall street market update")).toBe("business");
        expect(resolveCategoryKey("startup funding announced")).toBe("business");
    });

    test("returns sports for sports keywords", () => {
        expect(resolveCategoryKey("nba finals highlights")).toBe("sports");
        expect(resolveCategoryKey("soccer world cup news")).toBe("sports");
    });

    test("returns all for unmatched content", () => {
        expect(resolveCategoryKey("random unrelated content")).toBe("all");
        expect(resolveCategoryKey("")).toBe("all");
    });
});

describe("buildCategoryText", () => {
    test("combines all available text sources", () => {
        const item = {
            id: 1,
            feedId: 1,
            source: { title: "Source Title", siteUrl: "https://example.com" },
        } as unknown as Item;

        const meta: FeedMeta = {
            folderName: "Tech Folder",
            feedTitle: "Tech Feed",
            feedUrl: "https://feed.example.com",
            siteUrl: "https://site.example.com",
        };

        const result = buildCategoryText(item, meta);
        expect(result).toContain("tech folder");
        expect(result).toContain("tech feed");
        expect(result).toContain("source title");
    });

    test("handles missing metadata", () => {
        const item = { id: 1, feedId: 1 } as Item;
        const result = buildCategoryText(item);
        expect(result).toBe("");
    });
});

describe("getItemCategory", () => {
    test("correctly categorizes items", () => {
        const techItem = {
            id: 1,
            feedId: 1,
        } as Item;
        const techMeta: FeedMeta = { folderName: "Technology" };

        expect(getItemCategory(techItem, techMeta)).toBe("technology");
    });
});

describe("buildFeedMetaMap", () => {
    test("builds map from folders", () => {
        const folders: Folder[] = [
            {
                id: 1,
                userId: 1,
                name: "News",
                createdAt: "2024-01-01T00:00:00Z",
                feeds: [
                    { id: 10, title: "Feed A", url: "https://a.com/feed", siteUrl: "https://a.com" } as Feed,
                    { id: 20, title: "Feed B", url: "https://b.com/feed", siteUrl: "https://b.com" } as Feed,
                ],
            },
        ];

        const map = buildFeedMetaMap(folders);
        expect(map.size).toBe(2);
        expect(map.get(10)?.feedTitle).toBe("Feed A");
        expect(map.get(20)?.folderName).toBe("News");
    });

    test("handles empty folders", () => {
        const map = buildFeedMetaMap([]);
        expect(map.size).toBe(0);
    });
});

describe("buildHomeRows", () => {
    test("creates Latest row for non-empty items", () => {
        const items: Item[] = [
            { id: 1, feedId: 1 } as Item,
            { id: 2, feedId: 1 } as Item,
        ];

        const rows = buildHomeRows(items, new Map());
        expect(rows[0].key).toBe("latest");
        expect(rows[0].label).toBe("Latest updates");
    });

    test("returns empty for no items", () => {
        const rows = buildHomeRows([], new Map());
        expect(rows.length).toBe(0);
    });
});

describe("HOME_CATEGORY_DEFS", () => {
    test("has expected categories", () => {
        const keys = HOME_CATEGORY_DEFS.map((d) => d.key);
        expect(keys).toContain("technology");
        expect(keys).toContain("business");
        expect(keys).toContain("sports");
        expect(keys).toContain("all");
    });

    test("all category has no keywords", () => {
        const allDef = HOME_CATEGORY_DEFS.find((d) => d.key === "all");
        expect(allDef?.keywords).toEqual([]);
    });
});
