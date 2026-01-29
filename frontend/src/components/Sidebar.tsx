import { FeedTree } from "./FeedTree";
import type { Folder } from "../api/types";
import { clsx } from "clsx";

const logoUrl = "/pwa-192.png";

type NavKey = "discover" | "bookmarks" | "home" | "topnews";

type Props = {
  view: NavKey;
  onChangeView: (view: NavKey) => void;
  folders: Folder[];
  activeFolderId?: number;
  activeFeedId?: number;
  onSelectFolder: (id?: number) => void;
  onSelectFeed: (folderId: number, feedId: number) => void;
  folderActions: {
    create: (name: string) => Promise<void>;
    rename: (id: number, name: string) => Promise<void>;
    remove: (id: number) => Promise<void>;
    addFeed: (folderId: number, url: string) => Promise<void>;
    removeFeed: (id: number) => Promise<void>;
    refreshFolder: (id: number) => Promise<void>;
  };
  onOpenSettings: () => void;
  onRefreshAll: () => void;
  refreshAllLoading?: boolean;
  loadingFolders?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
  userEmail?: string;
};

export function Sidebar({
  view,
  onChangeView,
  folders,
  activeFolderId,
  activeFeedId,
  onSelectFolder,
  onSelectFeed,
  folderActions,
  onOpenSettings,
  onRefreshAll,
  refreshAllLoading = false,
  loadingFolders = false,
  onClose,
  onLogout,
  userEmail,
}: Props) {
  const navItems: { key: NavKey; label: string; icon: React.ReactNode }[] = [
    { key: "discover", label: "Discover", icon: <CompassIcon /> },
    { key: "topnews", label: "Top News", icon: <SparkIcon /> },
    { key: "bookmarks", label: "Bookmarks", icon: <BookmarkIcon /> },
    { key: "home", label: "Home", icon: <HomeIcon /> },
  ];

  return (
    <aside className="app-sidebar sidebar-panel glass flex h-full w-full flex-col border-l-0 border-t-0 border-b-0 border-r border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/60">
      <div className="sidebar-header mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="RSS Feed Manager logo"
            className="h-11 w-11 rounded-2xl bg-white/80 p-1 shadow-sm"
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Library</p>
            <h1 className="text-lg font-semibold">My Feeds</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-primary rounded-full px-3 py-1 text-xs"
            onClick={onRefreshAll}
            disabled={refreshAllLoading}
            aria-busy={refreshAllLoading}
          >
            <span className={clsx("inline-block", refreshAllLoading && "animate-spin")}>↻</span>
          </button>
          {onClose && (
            <button className="btn-ghost lg:hidden" onClick={onClose} aria-label="Close sidebar">
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
      <nav className="sidebar-nav mb-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onChangeView(item.key)}
            className={clsx(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800",
              view === item.key &&
              (item.key !== "home" || (!activeFolderId && !activeFeedId)) &&
              "bg-gray-100 font-semibold text-accent dark:bg-gray-800",
            )}
          >
            <span className="text-gray-500">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-tree flex-1 overflow-y-auto pr-1">
        {loadingFolders && folders.length === 0 ? (
          <div className="space-y-4" aria-hidden="true">
            <div className="flex items-center justify-between px-2">
              <div className="skeleton h-3 w-16 rounded-md" />
              <div className="skeleton h-6 w-6 rounded-md" />
            </div>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={`folder-skeleton-${idx}`} className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg px-2 py-2">
                  <div className="skeleton h-3 w-3 rounded-md" />
                  <div className="skeleton h-3 w-32 rounded-md" />
                </div>
                <div className="ml-6 space-y-2">
                  <div className="skeleton h-3 w-28 rounded-md" />
                  <div className="skeleton h-3 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <FeedTree
            folders={folders}
            highlightActive={view === "home"}
            activeFolderId={activeFolderId}
            activeFeedId={activeFeedId}
            onSelectFolder={onSelectFolder}
            onSelectFeed={onSelectFeed}
            onCreateFolder={folderActions.create}
            onRenameFolder={folderActions.rename}
            onDeleteFolder={folderActions.remove}
            onAddFeed={folderActions.addFeed}
            onDeleteFeed={folderActions.removeFeed}
            onRefreshFolder={folderActions.refreshFolder}
          />
        )}
      </div>
      <div className="sidebar-footer mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
        {userEmail && (
          <div className="px-3 py-1">
            <p className="truncate text-xs text-gray-500 dark:text-gray-400" title={userEmail}>
              {userEmail}
            </p>
          </div>
        )}
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <span className="text-gray-500">
            <GearIcon />
          </span>
          Settings
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <span className="text-gray-500">
              <LogoutIcon />
            </span>
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 15l2-5 5-2-2 5-5 2Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l1.6 4.2 4.4 1.3-4.4 1.3L12 14l-1.6-4.2-4.4-1.3 4.4-1.3L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18 14l.9 2.2 2.1.7-2.1.7L18 20l-.9-2.4-2.1-.7 2.1-.7L18 14Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8.2-3.2a6.9 6.9 0 0 0-.1-1l2-1.5-2-3.4-2.3.9a7 7 0 0 0-1.7-1l-.3-2.5H9.2l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a6.9 6.9 0 0 0 0 2L2.9 14l2 3.4 2.3-.9a7 7 0 0 0 1.7 1l.3 2.5h4.6l.3-2.5a7 7 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
