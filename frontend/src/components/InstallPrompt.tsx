import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "pwa:installPromptDismissed";

const isIos = () => /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  const standaloneMatch = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const iosStandalone = "standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true;
  return standaloneMatch || iosStandalone;
};

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"android" | "ios" | null>(null);

  const dismissed = useMemo(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "1";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (dismissed || isStandalone()) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setMode("android");
      setVisible(true);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    if (isIos()) {
      setMode("ios");
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [dismissed]);

  if (!visible || !mode) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setPromptEvent(null);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, "1");
    }
    setVisible(false);
    setPromptEvent(null);
  };

  return (
    <div className="install-prompt fixed inset-x-4 bottom-4 z-40 md:inset-x-auto md:right-4 md:bottom-4 md:max-w-sm">
      <div className="install-prompt-card card shadow-lg">
        <div className="flex items-start gap-3 p-4">
          <img src="/pwa-192.png" alt="" className="h-10 w-10 rounded-xl" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Install RSS Feed Manager</p>
            {mode === "android" ? (
              <p className="text-xs text-gray-500">Add this app to your home screen for faster access.</p>
            ) : (
              <p className="text-xs text-gray-500">Tap Share and choose “Add to Home Screen”.</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
          <button className="btn-ghost" onClick={dismiss}>
            Not now
          </button>
          <button
            className={clsx("btn-primary", mode === "ios" && "opacity-60")}
            onClick={mode === "android" ? install : dismiss}
          >
            {mode === "android" ? "Add to home" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
