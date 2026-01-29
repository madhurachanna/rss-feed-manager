import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshAll, refreshFeed, refreshFolder } from "../api";
import { useLog } from "./useLog";
import { extractErrorMessage } from "../services/LogService";

type RefreshOptions = {
    getFolderName: (id: number) => string;
    getFeedTitle: (id: number) => string;
};

export function useRefresh({ getFolderName, getFeedTitle }: RefreshOptions) {
    const queryClient = useQueryClient();
    const { success, info, error: logError } = useLog();

    const all = useMutation({
        mutationFn: refreshAll,
        onMutate: () => {
            info("refresh", "Refreshing all feeds", "This may take a moment...");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
            success("refresh", "All feeds refreshed", "Your feeds are now up to date");
        },
        onError: (err) => {
            logError("refresh", "Failed to refresh feeds", extractErrorMessage(err));
        },
    });

    const folder = useMutation({
        mutationFn: (id: number) => refreshFolder(id),
        onMutate: (id) => {
            const folderName = getFolderName(id);
            info("refresh", `Refreshing ${folderName}`, "Fetching new items...");
            return { folderName };
        },
        onSuccess: (_data, _id, context) => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            success("refresh", `${context?.folderName} refreshed`, "New items have been fetched");
        },
        onError: (err, _id, context) => {
            logError("refresh", `Failed to refresh ${context?.folderName}`, extractErrorMessage(err));
        },
    });

    const feed = useMutation({
        mutationFn: (id: number) => refreshFeed(id),
        onMutate: (id) => ({ feedTitle: getFeedTitle(id) }),
        onSuccess: (_data, _id, context) => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            success("refresh", "Feed refreshed", `${context?.feedTitle} is now up to date`);
        },
        onError: (err, _id, context) => {
            logError("refresh", `Failed to refresh feed`, `${context?.feedTitle}: ${extractErrorMessage(err)}`);
        },
    });

    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            all.mutate();
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return {
        all,
        folder,
        feed,
    };
}
