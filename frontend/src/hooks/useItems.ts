import { useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookmark, fetchBookmarks, fetchItems, fetchTopNews, markRead } from "../api";
import type { Item } from "../api/types";
import { useLog } from "./useLog";
import { extractErrorMessage } from "../services/LogService";

type SortPref = "popular_latest" | "latest" | "oldest";

type UseItemsOptions = {
    folderId?: number;
    feedId?: number;
    view: string;
    sortPref: SortPref;
};

export function useItems({ folderId, feedId, view, sortPref }: UseItemsOptions) {
    const queryClient = useQueryClient();
    const { success, info, error: logError } = useLog();

    const itemsQuery = useInfiniteQuery({
        queryKey: ["items", { folderId, feedId, sort: sortPref }],
        queryFn: ({ pageParam }) =>
            fetchItems({ folderId, feedId, cursor: pageParam as string | undefined, limit: 100, sort: sortPref }),
        getNextPageParam: (last: { nextCursor?: string }) => last.nextCursor ?? undefined,
        initialPageParam: undefined,
        enabled: view === "home",
    });

    const bookmarksQuery = useInfiniteQuery({
        queryKey: ["bookmarks", { sort: sortPref }],
        queryFn: ({ pageParam }) =>
            fetchBookmarks({ cursor: pageParam as string | undefined, limit: 20, sort: sortPref }),
        getNextPageParam: (last: { nextCursor?: string }) => last.nextCursor ?? undefined,
        initialPageParam: undefined,
        enabled: view === "bookmarks",
    });

    const topNewsQuery = useQuery({
        queryKey: ["topnews"],
        queryFn: () => fetchTopNews(18),
        enabled: view === "topnews",
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

    const hasMore = view === "home" ? Boolean(itemsQuery.hasNextPage) : Boolean(bookmarksQuery.hasNextPage);

    const loadMore = () => {
        if (view === "home") itemsQuery.fetchNextPage();
        else if (view === "bookmarks") bookmarksQuery.fetchNextPage();
    };

    return {
        itemsQuery,
        bookmarksQuery,
        topNewsQuery,
        items,
        markReadMut,
        bookmarkMut,
        hasMore,
        loadMore,
    };
}
