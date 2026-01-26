import { useEffect, useState } from "react";
import type { Folder, Feed } from "../api/types";
import { clsx } from "clsx";
import { BaseModal } from "../modals/BaseModal";
import { createPortal } from "react-dom";
import { Button, Input, FormGroup } from "./ui";

type Props = {
  folders: Folder[];
  activeFolderId?: number;
  activeFeedId?: number;
  highlightActive?: boolean;
  onSelectFolder: (id?: number) => void;
  onSelectFeed: (folderId: number, feedId: number) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onRenameFolder: (id: number, name: string) => Promise<void>;
  onDeleteFolder: (id: number) => Promise<void>;
  onAddFeed: (folderId: number, url: string) => Promise<void>;
  onDeleteFeed: (id: number) => Promise<void>;
  onRefreshFolder: (id: number) => Promise<void>;
};

const collapsedStorageKey = "pref:feedtree:collapsed";
const feedsCollapsedStorageKey = "pref:feedtree:feedsCollapsed";

const readCollapsedState = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(collapsedStorageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const next: Record<number, boolean> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const id = Number(key);
      if (!Number.isFinite(id)) return;
      if (typeof value === "boolean") next[id] = value;
    });
    return next;
  } catch {
    return {};
  }
};

const readFeedsCollapsed = () => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(feedsCollapsedStorageKey) === "true";
  } catch {
    return false;
  }
};

export function FeedTree({
  folders,
  activeFeedId,
  activeFolderId,
  highlightActive = true,
  onSelectFolder,
  onSelectFeed,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onAddFeed,
  onDeleteFeed,
  onRefreshFolder,
}: Props) {
  const [newFolder, setNewFolder] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [addingFeedFor, setAddingFeedFor] = useState<number | null>(null);
  const [feedUrl, setFeedUrl] = useState("");
  const [menuFolderId, setMenuFolderId] = useState<number | null>(null);
  const [menuFeedId, setMenuFeedId] = useState<number | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [createFolderError, setCreateFolderError] = useState("");
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>(() => readCollapsedState());
  const [feedsCollapsed, setFeedsCollapsed] = useState(() => readFeedsCollapsed());

  useEffect(() => {
    const close = () => {
      setMenuFolderId(null);
      setMenuFeedId(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(collapsedStorageKey, JSON.stringify(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(feedsCollapsedStorageKey, String(feedsCollapsed));
    } catch {
      /* ignore */
    }
  }, [feedsCollapsed]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolder.trim()) return;
    setCreatingFolder(true);
    setCreateFolderError("");
    try {
      await onCreateFolder(newFolder.trim());
      setNewFolder("");
      setCreateFolderOpen(false);
    } catch (err) {
      let message = "Failed to create folder. Check your connection and try again.";
      if (err && typeof err === "object" && "response" in err) {
        const data = (err as { response?: { data?: { error?: string } } }).response?.data;
        if (data?.error) {
          message = data.error;
        }
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setCreateFolderError(message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRename = async (folder: Folder) => {
    if (!renameValue.trim()) return;
    await onRenameFolder(folder.id, renameValue.trim());
    setRenamingId(null);
    setRenameValue("");
  };

  const handleAddFeed = async (folderId: number) => {
    if (!feedUrl.trim()) return;
    try {
      await onAddFeed(folderId, feedUrl.trim());
      setFeedUrl("");
      setAddingFeedFor(null);
    } catch (err) {
      alert("Failed to add feed. Please check the URL and try again.");
    }
  };

  return (
    <div className="feed-tree space-y-4">
      <div className="feed-tree-header group relative flex items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
        <button
          className="flex items-center gap-2"
          onClick={() => setFeedsCollapsed((prev) => !prev)}
        >
          <span className="text-gray-400">{feedsCollapsed ? "▸" : "▾"}</span>
          Feeds
        </button>
        <div className="feed-tree-actions flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <button
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              setMenuFolderId(-1);
            }}
          >
            ⋯
          </button>
          {menuFolderId === -1 && (
            <div
              className="absolute right-2 top-full z-10 mt-2 w-40 rounded-lg border border-gray-200 bg-white p-1 text-xs shadow-lg dark:border-gray-800 dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  setCreateFolderOpen(true);
                  setMenuFolderId(null);
                }}
              >
                Add folder
              </button>
            </div>
          )}
        </div>
      </div>

      {createFolderOpen && createPortal(
        <BaseModal
          open={true}
          onClose={() => {
            setCreateFolderOpen(false);
            setNewFolder("");
            setCreateFolderError("");
          }}
          title="New folder"
          maxWidthClass="max-w-md"
          containerClassName="p-0"
        >
          <form onSubmit={handleCreateFolder} className="space-y-4 p-5">
            <FormGroup label="Folder name" error={createFolderError}>
              <Input
                placeholder="Example: Tech"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                autoFocus
                error={!!createFolderError}
              />
            </FormGroup>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreateFolderOpen(false);
                  setNewFolder("");
                  setCreateFolderError("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creatingFolder} disabled={!newFolder.trim()}>
                Create
              </Button>
            </div>
          </form>
        </BaseModal>,
        document.body,
      )}

      {!feedsCollapsed && (
        <div className="feed-tree-list space-y-2">
          {(folders || []).filter(Boolean).map((folder) => (
            <div key={folder.id} className="feed-tree-folder space-y-1">
              <div className="group flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <div className="flex items-center gap-2">
                  <button
                    className="text-gray-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsed((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }));
                    }}
                  >
                    {collapsed[folder.id] ? "▸" : "▾"}
                  </button>
                  <span className="text-gray-400">
                    <FolderIcon />
                  </span>
                  <button
                    className={clsx(
                    "text-left font-semibold hover:text-accent",
                    highlightActive && activeFolderId === folder.id && "text-accent",
                    )}
                    onClick={() => onSelectFolder(folder.id)}
                  >
                    {folder.name}
                  </button>
                </div>
                <div className="relative flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingFeedFor(folder.id);
                      setMenuFolderId(null);
                    }}
                    title="Add feed"
                  >
                    +
                  </button>
                  <button
                    className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFolderId(folder.id);
                      setMenuFeedId(null);
                    }}
                  >
                    ⋯
                  </button>
                  {menuFolderId === folder.id && (
                    <div
                      className="absolute right-0 top-full z-10 mt-2 w-44 rounded-lg border border-gray-200 bg-white p-1 text-xs shadow-lg dark:border-gray-800 dark:bg-gray-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => {
                          setRenamingId(folder.id);
                          setRenameValue(folder.name);
                          setMenuFolderId(null);
                        }}
                      >
                        Rename folder
                      </button>
                      <button
                        className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => {
                          onRefreshFolder(folder.id);
                          setMenuFolderId(null);
                        }}
                      >
                        Refresh
                      </button>
                      <button
                        className="w-full rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => {
                          onDeleteFolder(folder.id);
                          setMenuFolderId(null);
                        }}
                      >
                        Delete folder
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {renamingId === folder.id && (
                <div className="feed-tree-rename ml-6 flex gap-2">
                  <Input
                    size="sm"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                  />
                  <Button size="sm" onClick={() => handleRename(folder)}>
                    Save
                  </Button>
                </div>
              )}

              {addingFeedFor === folder.id && (
                <div className="feed-tree-add ml-6 flex gap-2">
                  <Input
                    size="sm"
                    placeholder="https://feed.url"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                  />
                  <Button size="sm" onClick={() => handleAddFeed(folder.id)}>
                    Add
                  </Button>
                </div>
              )}

              {!collapsed[folder.id] && (
                <div className="feed-tree-feeds ml-6 space-y-1">
                  {(folder.feeds || []).map((feed) => (
                    <FeedRow
                      key={feed.id}
                      feed={feed}
                      active={highlightActive && feed.id === activeFeedId}
                      menuOpen={menuFeedId === feed.id}
                      onSelect={() => onSelectFeed(folder.id, feed.id)}
                      onToggleMenu={(open) => {
                        setMenuFeedId(open ? feed.id : null);
                        setMenuFolderId(null);
                      }}
                      onDelete={() => {
                        onDeleteFeed(feed.id);
                        setMenuFeedId(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedRow({
  feed,
  active,
  menuOpen,
  onSelect,
  onToggleMenu,
  onDelete,
}: {
  feed: Feed;
  active?: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onToggleMenu: (open: boolean) => void;
  onDelete: () => void;
}) {
  const icon = feedIcon(feed.title || feed.url);
  const favicon = getFaviconUrl(feed);
  return (
    <div
      className={clsx(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800",
        active && "bg-accent-soft font-semibold text-accent dark:bg-gray-800",
      )}
    >
      <button className="flex items-center gap-2 text-left" onClick={onSelect}>
        {favicon ? (
          <img src={favicon} alt="" className="h-4 w-4 rounded" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span className={clsx("flex h-4 w-4 items-center justify-center rounded text-[9px] font-semibold text-white", icon.bg)}>
            {icon.letter}
          </span>
        )}
        {feed.title || feed.url}
      </button>
      <div className="relative">
        <button
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu(!menuOpen);
          }}
        >
          ⋯
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 z-10 mt-2 w-32 rounded-lg border border-gray-200 bg-white p-1 text-xs shadow-lg dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full rounded-md px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={onDelete}
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function feedIcon(label: string) {
  const colors = ["bg-indigo-500", "bg-blue-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-purple-500"];
  const letter = (label || "F").trim().charAt(0).toUpperCase();
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash + label.charCodeAt(i) * (i + 1)) % colors.length;
  }
  return { letter, bg: colors[hash] || "bg-gray-400" };
}

function getFaviconUrl(feed: Feed) {
  const raw = feed.siteUrl || feed.url;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  } catch {
    return null;
  }
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

