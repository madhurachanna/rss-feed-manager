import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ACCENTS, AccentKey, THEME_PRESETS, ThemePreset, useTheme } from "../hooks/useTheme";
import { BaseModal } from "./BaseModal";
import { fetchSettings, updateSettings } from "../api";
import { useLog } from "../hooks/useLog";
import { extractErrorMessage } from "../services/LogService";
import { Button, Select, Radio, FormGroup } from "../components/ui";

type Props = {
  open: boolean;
  onClose: () => void;
};

type SortPref = "popular_latest" | "latest" | "oldest";
type StartPage = "today" | "first" | "all";

const RETENTION_OPTIONS = [
  { value: 1, label: "1 day (testing)" },
  { value: 2, label: "2 days (testing)" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

const FONT_OPTIONS = [
  { label: "Inter", value: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" },
  { label: "System", value: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" },
  { label: "Roboto", value: "Roboto, \"Helvetica Neue\", Arial, sans-serif" },
  { label: "Poppins", value: "Poppins, \"Helvetica Neue\", Arial, sans-serif" },
  { label: "Merriweather", value: "Merriweather, Georgia, serif" },
  { label: "Georgia", value: "Georgia, serif" },
];

export function SettingsModal({ open, onClose }: Props) {
  const { theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize, accent, setAccent } = useTheme();
  const { success, error: logError } = useLog();
  const [section, setSection] = useState<"general" | "appearance" | "reading" | "storage">("general");
  const [startPage, setStartPage] = useState<StartPage>("today");
  const [sortPref, setSortPref] = useState<SortPref>("popular_latest");
  const [hideRead, setHideRead] = useState(false);
  
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    enabled: open,
  });
  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      success("settings", "Settings saved", `Article retention set to ${data.retentionDays} days`);
    },
    onError: (err) => {
      logError("settings", "Failed to save settings", extractErrorMessage(err));
    },
  });

  useEffect(() => {
    const storedStart = (localStorage.getItem("pref:startPage") as StartPage) || "today";
    const storedSort = (localStorage.getItem("pref:sort") as SortPref) || "popular_latest";
    const storedHideRead = localStorage.getItem("pref:hideRead") === "true";
    setStartPage(storedStart);
    setSortPref(storedSort);
    setHideRead(storedHideRead);
  }, []);

  const saveStart = (val: StartPage) => {
    setStartPage(val);
    localStorage.setItem("pref:startPage", val);
  };
  const notify = () => window.dispatchEvent(new Event("prefs-changed"));

  const saveSort = (val: SortPref) => {
    setSortPref(val);
    localStorage.setItem("pref:sort", val);
    notify();
  };
  const saveHideRead = (val: boolean) => {
    setHideRead(val);
    localStorage.setItem("pref:hideRead", String(val));
    notify();
  };

  const handleThemeSelect = (preset: ThemePreset) => {
    setTheme(preset.key);
    if (preset.accent) {
      setAccent(preset.accent);
    }
  };

  const panelToneClass = theme === "aurora" ? "sm:bg-emerald-50/80" : "sm:bg-gray-50";
  const selectedFont = FONT_OPTIONS.some((opt) => opt.value === fontFamily) ? fontFamily : FONT_OPTIONS[0].value;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      containerClassName="settings-modal h-full sm:!h-[80vh] sm:!max-h-[80vh]"
    >
      <div className="settings-layout flex h-full w-full flex-col overflow-hidden sm:flex-row">
        <aside
          className={`settings-sidebar w-full shrink-0 border-b border-gray-200 bg-[var(--surface)] p-4 text-sm dark:border-gray-800 sm:h-full sm:w-52 sm:border-b-0 sm:border-r sm:p-5 sm:dark:bg-gray-950/50 ${panelToneClass}`}
        >
          <h3 className="page-subtitle mb-3">Preferences</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:block sm:pb-0">
            {[
              { key: "general", label: "General" },
              { key: "appearance", label: "Appearance" },
              { key: "reading", label: "Reading" },
              { key: "storage", label: "Storage" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key as typeof section)}
                className={`mb-0 w-full whitespace-nowrap rounded-lg px-3 py-2 text-left sm:mb-1 ${
                  section === item.key ? "bg-gray-200 font-semibold dark:bg-gray-800" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="settings-content flex-1 overflow-y-auto p-5 text-sm sm:p-7">
          {section === "general" && (
            <div className="settings-section space-y-6">
              <FormGroup label="Start Page">
                <div className="space-y-2">
                  {[
                    { key: "today", label: "Today" },
                    { key: "first", label: "First Folder" },
                    { key: "all", label: "All" },
                  ].map((opt) => (
                    <Radio
                      key={opt.key}
                      name="start"
                      label={opt.label}
                      checked={startPage === opt.key}
                      onChange={() => saveStart(opt.key as StartPage)}
                    />
                  ))}
                </div>
              </FormGroup>
            </div>
          )}

          {section === "appearance" && (
            <div className="settings-section space-y-6">
              <div>
                <p className="page-subtitle">Theme</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {THEME_PRESETS.map((preset) => {
                    const selected = theme === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleThemeSelect(preset)}
                        className={`rounded-xl border p-2 text-left transition ${
                          selected
                            ? "border-gray-900 ring-2 ring-gray-900/10 dark:border-gray-100 dark:ring-gray-100/20"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
                        }`}
                        aria-pressed={selected}
                      >
                        <div
                          className="relative h-16 w-full overflow-hidden rounded-lg"
                          style={{
                            background: `linear-gradient(135deg, ${preset.preview.from}, ${preset.preview.to})`,
                          }}
                        >
                          <div
                            className="absolute left-2 top-2 h-6 w-10 rounded-md"
                            style={{ backgroundColor: preset.preview.surface, opacity: 0.85 }}
                          />
                          <div className="absolute right-2 bottom-2 h-3 w-3 rounded-full" style={{ backgroundColor: preset.preview.accent }} />
                          {selected && <div className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-white/90 shadow" />}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{preset.label}</span>
                          {selected && <span className="text-[10px] font-semibold text-accent">Active</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <FormGroup label="Font">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    value={selectedFont}
                    onChange={(e) => setFontFamily(e.target.value)}
                  >
                    {FONT_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <div className="flex items-center gap-3">
                    <input type="range" min={12} max={20} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1" />
                    <span className="text-xs text-gray-500">{fontSize}px</span>
                  </div>
                </div>
              </FormGroup>
              <FormGroup label="Accent Color">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
                    const label = key.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
                    return (
                      <Button
                        key={key}
                        variant={accent === key ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => setAccent(key)}
                        className={accent === key ? "border-[var(--accent)] font-semibold" : ""}
                      >
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: ACCENTS[key].primary }}
                          aria-hidden="true"
                        />
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </FormGroup>
            </div>
          )}

          {section === "reading" && (
            <div className="settings-section space-y-6">
              <FormGroup label="Default Sort">
                <div className="space-y-2">
                  {[
                    { key: "popular_latest", label: "Most popular + latest" },
                    { key: "latest", label: "Latest" },
                    { key: "oldest", label: "Oldest" },
                  ].map((opt) => (
                    <Radio
                      key={opt.key}
                      name="sort"
                      label={opt.label}
                      checked={sortPref === opt.key}
                      onChange={() => saveSort(opt.key as SortPref)}
                    />
                  ))}
                </div>
              </FormGroup>
              <FormGroup label="Hide Read Articles">
                <div className="flex gap-4">
                  <Radio name="hideRead" label="Hide" checked={hideRead} onChange={() => saveHideRead(true)} />
                  <Radio name="hideRead" label="Show" checked={!hideRead} onChange={() => saveHideRead(false)} />
                </div>
              </FormGroup>
            </div>
          )}

          {section === "storage" && (
            <div className="settings-section space-y-6">
              <FormGroup 
                label="Article Retention"
                hint="Articles older than this will be automatically deleted during refresh. Bookmarked articles are never deleted."
              >
                <div className="mt-2 space-y-2">
                  {RETENTION_OPTIONS.map((opt) => (
                    <Radio
                      key={opt.value}
                      name="retention"
                      label={opt.label}
                      checked={settingsQuery.data?.retentionDays === opt.value}
                      onChange={() => settingsMutation.mutate({ retentionDays: opt.value })}
                      disabled={settingsMutation.isPending}
                      className={opt.value <= 2 ? "[&>label]:text-amber-600 dark:[&>label]:text-amber-400" : ""}
                    />
                  ))}
                </div>
                {settingsMutation.isPending && (
                  <p className="mt-2 text-xs text-gray-500">Saving...</p>
                )}
                {settingsMutation.isError && (
                  <p className="mt-2 text-xs text-red-600">Failed to save setting</p>
                )}
              </FormGroup>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
