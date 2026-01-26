import { useEffect } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
  containerClassName?: string;
  title?: string;
  showClose?: boolean;
  loading?: boolean;
  loadingText?: string;
};

export function BaseModal({
  open,
  onClose,
  children,
  maxWidthClass = "max-w-4xl",
  containerClassName = "",
  title,
  showClose = true,
  loading = false,
  loadingText = "Loading...",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-0 backdrop-blur-lg sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "modal-container modal-surface modal-sheet relative h-[100dvh] w-full overflow-hidden rounded-none shadow-2xl sm:h-auto sm:w-[88vw] sm:max-h-[90vh] sm:overflow-y-auto sm:rounded-2xl",
          maxWidthClass || "max-w-[960px]",
          containerClassName,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
            <h2 className="section-title">{title}</h2>
            {showClose && (
              <button className="modal-close btn-ghost" onClick={onClose} aria-label="Close">
                <CloseIcon />
              </button>
            )}
          </div>
        )}
        {!title && showClose && (
          <button className="modal-close btn-ghost absolute right-3 top-3 z-10" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        )}
        {children}
        {loading && (
          <div className="modal-loading absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
            <div className="modal-loading-card flex items-center gap-3 rounded-lg bg-white px-4 py-2 text-sm text-gray-700 shadow dark:bg-gray-800 dark:text-gray-200">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-200" />
              {loadingText}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
