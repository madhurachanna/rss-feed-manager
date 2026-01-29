import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addFeed,
    createFolder,
    deleteFeed,
    deleteFolder,
    fetchFolders,
    renameFolder,
} from "../api";
import type { Folder } from "../api/types";
import { useLog } from "./useLog";
import { extractErrorMessage } from "../services/LogService";

export function useFolders() {
    const queryClient = useQueryClient();
    const { success, error: logError } = useLog();

    const foldersQuery = useQuery({
        queryKey: ["folders"],
        queryFn: fetchFolders,
    });

    const getFolderName = (id: number) => {
        const folder = foldersQuery.data?.find((f) => f.id === id);
        return folder?.name || `Folder #${id}`;
    };

    const getFeedTitle = (id: number) => {
        for (const folder of foldersQuery.data || []) {
            const feed = folder.feeds?.find((f) => f.id === id);
            if (feed) return feed.title || feed.url || `Feed #${id}`;
        }
        return `Feed #${id}`;
    };

    const create = useMutation({
        mutationFn: (name: string) => createFolder(name),
        onSuccess: (_data, name) => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
            success("folder", "Folder created", `Created folder "${name}"`);
        },
        onError: (err) => {
            logError("folder", "Failed to create folder", extractErrorMessage(err));
        },
    });

    const rename = useMutation({
        mutationFn: ({ id, name }: { id: number; name: string }) => renameFolder(id, name),
        onSuccess: (_data, { name }) => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
            success("folder", "Folder renamed", `Renamed to "${name}"`);
        },
        onError: (err) => {
            logError("folder", "Failed to rename folder", extractErrorMessage(err));
        },
    });

    const remove = useMutation({
        mutationFn: (id: number) => deleteFolder(id),
        onMutate: (id) => ({ folderName: getFolderName(id) }),
        onSuccess: (_data, _id, context) => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
            success("folder", "Folder deleted", `Deleted "${context?.folderName}"`);
        },
        onError: (err) => {
            logError("folder", "Failed to delete folder", extractErrorMessage(err));
        },
    });

    const addFeedMutation = useMutation({
        mutationFn: ({ folderId, url }: { folderId: number; url: string }) => addFeed(folderId, url),
        onSuccess: (feed, { folderId }) => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            const folderName = getFolderName(folderId);
            success("feed", "Feed added", `Added "${feed.title || feed.url}" to ${folderName}`);
        },
        onError: (err, { url }) => {
            logError("feed", "Failed to add feed", `${url}: ${extractErrorMessage(err)}`);
        },
    });

    const removeFeed = useMutation({
        mutationFn: (id: number) => deleteFeed(id),
        onMutate: (id) => ({ feedTitle: getFeedTitle(id) }),
        onSuccess: (_data, _id, context) => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            success("feed", "Feed removed", `Removed "${context?.feedTitle}"`);
        },
        onError: (err) => {
            logError("feed", "Failed to remove feed", extractErrorMessage(err));
        },
    });

    const folderActions = {
        create,
        rename,
        remove,
        addFeed: addFeedMutation,
        removeFeed,
    };

    return {
        foldersQuery,
        folderActions,
        getFolderName,
        getFeedTitle,
    };
}
