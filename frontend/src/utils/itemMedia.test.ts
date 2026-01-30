import { describe, test, expect, beforeEach } from "vitest";
import { stripHtml, getCover } from "./itemMedia";
import type { Item } from "../api/types";

describe("stripHtml", () => {
    test("removes HTML tags", () => {
        expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
    });

    test("handles empty string", () => {
        expect(stripHtml("")).toBe("");
    });

    test("handles plain text", () => {
        expect(stripHtml("No HTML here")).toBe("No HTML here");
    });

    test("handles nested tags", () => {
        expect(stripHtml("<div><span><a href='#'>Link</a></span></div>")).toBe("Link");
    });

    test("handles entities", () => {
        expect(stripHtml("&amp; &lt; &gt;")).toBe("& < >");
    });
});

describe("getCover", () => {
    beforeEach(() => {
        // Mock DOMParser is available in jsdom
    });

    test("returns null for empty item", () => {
        const item = { id: 1, feedId: 1 } as Item;
        expect(getCover(item)).toBeNull();
    });

    test("extracts image from mediaJson", () => {
        const item = {
            id: 1,
            feedId: 1,
            mediaJson: JSON.stringify([
                { type: "image/jpeg", url: "https://example.com/photo.jpg", length: 50000 },
            ]),
        } as Item;
        expect(getCover(item)).toBe("https://example.com/photo.jpg");
    });

    test("skips avatar images in mediaJson", () => {
        const item = {
            id: 1,
            feedId: 1,
            mediaJson: JSON.stringify([
                { type: "image/png", url: "https://example.com/avatar.png" },
                { type: "image/jpeg", url: "https://example.com/cover.jpg" },
            ]),
        } as Item;
        expect(getCover(item)).toBe("https://example.com/cover.jpg");
    });

    test("prioritizes larger images in mediaJson", () => {
        const item = {
            id: 1,
            feedId: 1,
            mediaJson: JSON.stringify([
                { type: "image/jpeg", url: "https://example.com/small.jpg", length: 1000 },
                { type: "image/jpeg", url: "https://example.com/large.jpg", length: 500000 },
            ]),
        } as Item;
        expect(getCover(item)).toBe("https://example.com/large.jpg");
    });

    test("falls back to content HTML images", () => {
        const item = {
            id: 1,
            feedId: 1,
            contentHtml: '<p>Article text</p><img src="https://example.com/article.jpg" width="600" height="400">',
        } as Item;
        expect(getCover(item)).toBe("https://example.com/article.jpg");
    });

    test("skips tracking pixels", () => {
        const item = {
            id: 1,
            feedId: 1,
            contentHtml: '<img src="https://tracker.com/1x1.gif"><img src="https://example.com/real.jpg" width="400">',
        } as Item;
        expect(getCover(item)).toBe("https://example.com/real.jpg");
    });

    test("handles invalid mediaJson gracefully", () => {
        const item = {
            id: 1,
            feedId: 1,
            mediaJson: "not valid json",
        } as Item;
        expect(getCover(item)).toBeNull();
    });
});
