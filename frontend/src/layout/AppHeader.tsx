import { clsx } from "clsx";
import type { Presentation } from "./types";

type Props = {
  title: string;
  subtitle?: string;
  showPresentationToggle: boolean;
  presentation: Presentation;
  onChangePresentation: (value: Presentation) => void;
  refreshAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  onOpenSidebar?: () => void;
};

type PresentationOption = {
  key: Presentation;
  label: string;
  icon: React.ReactNode;
};

const presentationOptions: PresentationOption[] = [
  { key: "compact", label: "Magazine", icon: <MagazineIcon /> },
  { key: "title", label: "Title-only", icon: <TitleIcon /> },
  { key: "cards", label: "Cards", icon: <CardsIcon /> },
];

export function AppHeader({
  title,
  subtitle = "RSS Feed Manager",
  showPresentationToggle,
  presentation,
  onChangePresentation,
  refreshAction,
  onOpenSidebar,
}: Props) {
  return (
    <header
      className="app-header sticky top-0 z-20 -mx-4 mb-6 border-b border-gray-200/60 px-4 pb-4 pt-4 backdrop-blur sm:-mx-6 sm:mb-8 sm:px-6 sm:pt-6 dark:border-gray-800/60"
      style={{ backgroundColor: "var(--page-bg-start)" }}
    >
      <div className="app-header-inner flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="app-header-title flex items-start gap-3">
          {onOpenSidebar && (
            <button type="button" className="app-header-menu btn-ghost mt-1 lg:hidden" onClick={onOpenSidebar} aria-label="Open sidebar">
              <MenuIcon />
            </button>
          )}
          <div>
            <p className="page-subtitle">{subtitle}</p>
            <h1 className="page-title">{title}</h1>
          </div>
        </div>
        <div className="app-header-actions flex flex-wrap items-center gap-2 lg:justify-end">
          {showPresentationToggle && <PresentationToggle value={presentation} onChange={onChangePresentation} />}
          <div className="app-header-search hidden rounded-full bg-white/80 px-3 py-2 text-sm text-gray-500 shadow-sm backdrop-blur dark:bg-gray-800/80 md:flex">
            ⌕ <span className="ml-2">Search (coming soon)</span>
          </div>
          {refreshAction && (
            <button
              onClick={refreshAction.onClick}
              className="btn-primary rounded-full"
              disabled={refreshAction.loading}
              aria-busy={refreshAction.loading}
            >
              {refreshAction.loading ? "Refreshing..." : refreshAction.label}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

type PresentationToggleProps = {
  value: Presentation;
  onChange: (value: Presentation) => void;
};

function PresentationToggle({ value, onChange }: PresentationToggleProps) {
  return (
    <div className="presentation-toggle flex items-center gap-1 rounded-full bg-white/80 p-1 text-gray-600 shadow-sm backdrop-blur dark:bg-gray-800/80 dark:text-gray-200">
      {presentationOptions.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={clsx(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition",
            value === opt.key ? "bg-accent-soft font-semibold text-accent" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
          )}
          aria-label={opt.label}
          title={opt.label}
        >
          {opt.icon}
          <span className="sr-only">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MagazineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M5 6h14M5 12h14M5 18h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TitleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M5 7h14M5 12h10M5 17h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CardsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="6" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="13" y="6" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="5" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="13" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
