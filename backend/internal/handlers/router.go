package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"

	"rss-feed-manager/backend/internal/reader"
	"rss-feed-manager/backend/internal/services"
)

type Config struct {
	UserID              int64 // Deprecated: use auth middleware instead
	FeedService         *services.FeedService
	DigestService       *services.DigestService
	TopNewsService      *services.TopNewsService
	SummaryService      *services.SummaryService
	AuthService         *services.AuthService
	OPMLService         *services.OPMLService
	Reader              *reader.Client
	FrontendOrigin      string
	ReaderRatePerMinute int
}

type Handler struct {
	cfg Config
}

const defaultLimit = 20
const defaultFrontendOrigin = "http://localhost:5173"

func NewRouter(cfg Config) http.Handler {
	h := &Handler{cfg: cfg}
	authHandler := NewAuthHandler(cfg.AuthService)
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	allowedOrigins := parseAllowedOrigins(cfg.FrontendOrigin)
	r.Use(corsMiddleware(cfg, allowedOrigins))

	// Public routes (no auth required)
	r.Get("/api/health", h.health)

	// Auth routes (public)
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/magic-link", authHandler.SendMagicLink) // Sends OTP now
		r.Post("/verify-otp", authHandler.VerifyOTP)     // New OTP verification
		r.Get("/verify", authHandler.VerifyMagicLink)    // Legacy magic link (kept for compatibility)
		r.Post("/logout", authHandler.Logout)
	})

	r.Group(func(r chi.Router) {
		r.Use(authHandler.AuthMiddleware)
		r.Route("/api/opml", func(r chi.Router) {
			r.Post("/import", h.importOPML)
			r.Get("/export", h.exportOPML)
		})
	})

	// Discover is public
	r.Route("/api/discover", func(r chi.Router) {
		r.Get("/", h.discover)
		r.Post("/resolve", h.discoverResolve)
	})

	// Static files (Frontend)
	// We serve everything from "./dist".
	// If a file exists, serve it. If not, and it's not /api, serve index.html (SPA Fallback).
	workDir, _ := os.Getwd()
	filesDir := http.Dir(fmt.Sprintf("%s/dist", workDir))
	FileServer(r, "/", filesDir)

	// Protected routes (auth required)
	r.Group(func(r chi.Router) {
		r.Use(authHandler.AuthMiddleware)

		r.Get("/api/auth/me", authHandler.Me)

		r.Route("/api/folders", func(r chi.Router) {
			r.Get("/", h.listFolders)
			r.Post("/", h.createFolder)
			r.Patch("/{id}", h.renameFolder)
			r.Delete("/{id}", h.deleteFolder)
		})

		r.Route("/api/feeds", func(r chi.Router) {
			r.Post("/", h.addFeed)
			r.Delete("/{id}", h.deleteFeed)
			r.Post("/{id}/refresh", h.refreshFeed)
		})

		r.Route("/api/items", func(r chi.Router) {
			r.Get("/", h.listItems)
			r.Get("/{id}", h.getItem)
			r.Get("/{id}/summary", h.itemSummary)
			r.Post("/{id}/read", h.markRead(true))
			r.Post("/{id}/unread", h.markRead(false))
			r.Post("/{id}/bookmark", h.bookmark(true))
			r.Post("/{id}/unbookmark", h.bookmark(false))
		})

		r.Get("/api/bookmarks", h.listBookmarks)
		r.Get("/api/top-news", h.topNews)

		r.Get("/api/settings", h.getSettings)
		r.Put("/api/settings", h.updateSettings)

		r.Post("/api/refresh/all", h.refreshAll)
		r.Post("/api/refresh/folder/{id}", h.refreshFolder)

		r.Group(func(r chi.Router) {
			r.Use(httprate.LimitByIP(cfg.ReaderRatePerMinute, time.Minute))
			r.Get("/api/reader", h.readerView)
		})
	})

	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// getUserID returns the authenticated user's ID from context, or falls back to cfg.UserID for backwards compatibility
func (h *Handler) getUserID(r *http.Request) int64 {
	user := UserFromContext(r.Context())
	if user != nil {
		return user.ID
	}
	return h.cfg.UserID
}

func (h *Handler) discover(w http.ResponseWriter, _ *http.Request) {
	feeds := defaultDiscoverFeeds()
	if source := os.Getenv("DISCOVER_SOURCE_URL"); source != "" {
		if remote, err := fetchDiscoverSource(source); err == nil && len(remote) > 0 {
			feeds = remote
		}
	}
	// Simple daily rotation (deterministic)
	dayIndex := time.Now().YearDay() % len(feeds)
	daily := []map[string]string{
		feeds[dayIndex],
		feeds[(dayIndex+1)%len(feeds)],
		feeds[(dayIndex+2)%len(feeds)],
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"feeds":   feeds,
		"popular": feeds,
		"daily":   daily,
	})
}

func defaultDiscoverFeeds() []map[string]string {
	return []map[string]string{
		{"title": "Hacker News", "url": "https://hnrss.org/frontpage"},
		{"title": "The Verge", "url": "https://www.theverge.com/rss/index.xml"},
		{"title": "Wired", "url": "https://www.wired.com/feed/rss"},
		{"title": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/index"},
		{"title": "MIT Technology Review", "url": "https://www.technologyreview.com/feed/"},
		{"title": "The Guardian Tech", "url": "https://www.theguardian.com/uk/technology/rss"},
		{"title": "Engadget", "url": "https://www.engadget.com/rss.xml"},
		{"title": "The Atlantic", "url": "https://www.theatlantic.com/feed/all/"},
		{"title": "The Economist", "url": "https://www.economist.com/rss/briefings_rss.xml"},
		{"title": "NYTimes World", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"},
		{"title": "BBC World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"},
		{"title": "Reuters World", "url": "http://feeds.reuters.com/Reuters/worldNews"},
		{"title": "NPR News", "url": "https://feeds.npr.org/1001/rss.xml"},
		{"title": "Smashing Magazine", "url": "https://www.smashingmagazine.com/feed/"},
		{"title": "A List Apart", "url": "https://alistapart.com/main/feed/"},
		{"title": "Golang Blog", "url": "https://go.dev/blog/feed.atom"},
		{"title": "Kubernetes Blog", "url": "https://kubernetes.io/feed.xml"},
		{"title": "Lobsters", "url": "https://lobste.rs/rss"},
		{"title": "HackerNoon", "url": "https://hackernoon.com/feed"},
		{"title": "Stratechery", "url": "https://stratechery.com/feed/"},
		{"title": "Reddit Programming", "url": "https://www.reddit.com/r/programming/.rss"},
		{"title": "Reddit Technology", "url": "https://www.reddit.com/r/technology/.rss"},
		{"title": "Product Hunt", "url": "https://www.producthunt.com/feed"},
		{"title": "Indie Hackers", "url": "https://www.indiehackers.com/feed.xml"},
		{"title": "HN Best", "url": "https://hnrss.org/best"},
		{"title": "HN Show", "url": "https://hnrss.org/show"},
		{"title": "HN Ask", "url": "https://hnrss.org/ask"},
		{"title": "Polygon", "url": "https://www.polygon.com/rss/index.xml"},
		{"title": "The Verge Reviews", "url": "https://www.theverge.com/rss/reviews/index.xml"},
		{"title": "Android Central", "url": "https://www.androidcentral.com/feed"},
		{"title": "How-To Geek", "url": "https://www.howtogeek.com/feed/"},
		{"title": "Lifehacker", "url": "https://lifehacker.com/rss"},
		{"title": "Popular Science", "url": "https://www.popsci.com/feed/"},
		{"title": "Washington Post", "url": "http://feeds.washingtonpost.com/rss/world"},
		{"title": "The Atlantic Technology", "url": "https://www.theatlantic.com/feed/channel/technology/"},
		{"title": "The Verge Science", "url": "https://www.theverge.com/rss/science/index.xml"},
		{"title": "NYTimes Technology", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"},
		{"title": "BBC Technology", "url": "http://feeds.bbci.co.uk/news/technology/rss.xml"},
	}
}

func parseAllowedOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		origins = append(origins, trimmed)
	}
	return origins
}

func isAllowedOrigin(origin string, allowed []string) bool {
	for _, allowedOrigin := range allowed {
		if origin == allowedOrigin {
			return true
		}
	}
	return false
}

func isViteDevOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Hostname() == "" {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}
	return parsed.Port() == "5173"
}

func corsMiddleware(cfg Config, allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowed := false
			if origin != "" {
				if isAllowedOrigin(origin, allowedOrigins) {
					allowed = true
				} else if cfg.FrontendOrigin == defaultFrontendOrigin && isViteDevOrigin(origin) {
					allowed = true
				}
			}
			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Vary", "Origin")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func fetchDiscoverSource(sourceURL string) ([]map[string]string, error) {
	client := &http.Client{Timeout: 6 * time.Second}
	resp, err := client.Get(sourceURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}
	var payload struct {
		Feeds []map[string]string `json:"feeds"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload.Feeds, nil
}

func (h *Handler) discoverResolve(w http.ResponseWriter, r *http.Request) {
	var body struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"feeds": []map[string]string{
			{"title": "Detected Feed", "url": body.URL},
		},
	})
}

func (h *Handler) listFolders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	folders, err := h.cfg.FeedService.ListFolders(ctx, h.getUserID(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"folders": folders})
}

func (h *Handler) createFolder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	folder, err := h.cfg.FeedService.CreateFolder(r.Context(), h.getUserID(r), body.Name)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, folder)
}

func (h *Handler) renameFolder(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if err := h.cfg.FeedService.RenameFolder(r.Context(), h.getUserID(r), id, body.Name); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deleteFolder(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.cfg.FeedService.DeleteFolder(r.Context(), h.getUserID(r), id); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) addFeed(w http.ResponseWriter, r *http.Request) {
	var body struct {
		FolderID int64  `json:"folderId"`
		URL      string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	feed, err := h.cfg.FeedService.AddFeed(r.Context(), h.getUserID(r), body.FolderID, body.URL)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusCreated, feed)
}

func (h *Handler) deleteFeed(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.cfg.FeedService.DeleteFeed(r.Context(), h.getUserID(r), id); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) refreshFeed(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	count, err := h.cfg.FeedService.RefreshFeed(r.Context(), h.getUserID(r), id)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"itemsFetched": count})
}

func (h *Handler) listItems(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var folderID, feedID *int64
	if v := q.Get("folderId"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			folderID = &parsed
		}
	}
	if v := q.Get("feedId"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			feedID = &parsed
		}
	}
	unread := q.Get("unread") == "true"
	limit := parseIntDefault(q.Get("limit"), defaultLimit)
	sort := parseSortPref(q.Get("sort"))
	cursor := parseItemCursor(q.Get("cursor"))
	items, nextCursor, err := h.cfg.FeedService.ListItems(r.Context(), h.getUserID(r), folderID, feedID, unread, limit, cursor, sort)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	resp := map[string]interface{}{"items": items}
	if nextCursor != nil {
		resp["nextCursor"] = nextCursor.Encode()
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) getItem(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	item, err := h.cfg.FeedService.GetItem(r.Context(), h.getUserID(r), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) itemSummary(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	item, err := h.cfg.FeedService.GetItem(r.Context(), h.getUserID(r), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}
	contentLen := len(strings.TrimSpace(item.SummaryText)) + len(strings.TrimSpace(item.ContentHTML))
	if contentLen < 160 && strings.TrimSpace(item.Link) != "" {
		if readerResult, readerErr := h.cfg.Reader.Extract(r.Context(), item.Link); readerErr == nil && readerResult.Content != "" {
			item.ContentHTML = readerResult.Content
		}
	}
	result, err := h.cfg.SummaryService.Summarize(r.Context(), item)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) markRead(read bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
		if err := h.cfg.FeedService.MarkRead(r.Context(), h.getUserID(r), id, read); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func (h *Handler) bookmark(set bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
		if err := h.cfg.FeedService.Bookmark(r.Context(), h.getUserID(r), id, set); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func (h *Handler) listBookmarks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit := parseIntDefault(q.Get("limit"), defaultLimit)
	sort := parseSortPref(q.Get("sort"))
	cursor := parseItemCursor(q.Get("cursor"))
	items, next, err := h.cfg.FeedService.ListBookmarks(r.Context(), h.getUserID(r), limit, cursor, sort)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	resp := map[string]interface{}{"items": items}
	if next != nil {
		resp["nextCursor"] = next.Encode()
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) refreshAll(w http.ResponseWriter, r *http.Request) {
	if err := h.cfg.FeedService.RefreshAll(r.Context(), h.getUserID(r)); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) refreshFolder(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err := h.cfg.FeedService.RefreshFolder(r.Context(), h.getUserID(r), id); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

func (h *Handler) readerView(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		writeError(w, http.StatusBadRequest, errors.New("url required"))
		return
	}
	result, err := h.cfg.Reader.Extract(r.Context(), url)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) getSettings(w http.ResponseWriter, r *http.Request) {
	retentionDays := h.cfg.FeedService.GetRetentionDays(r.Context(), h.getUserID(r))
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"retentionDays": retentionDays,
	})
}

func (h *Handler) updateSettings(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RetentionDays int `json:"retentionDays"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	// Validate retention days (allowed values: 1, 2, 30, 60, 90)
	validDays := map[int]bool{1: true, 2: true, 30: true, 60: true, 90: true}
	if !validDays[req.RetentionDays] {
		writeError(w, http.StatusBadRequest, fmt.Errorf("invalid retention days: must be 1, 2, 30, 60, or 90"))
		return
	}

	if err := h.cfg.FeedService.SetRetentionDays(r.Context(), h.getUserID(r), req.RetentionDays); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"retentionDays": req.RetentionDays,
	})
}

func (h *Handler) topNews(w http.ResponseWriter, r *http.Request) {
	limit := parseIntDefault(r.URL.Query().Get("limit"), 18)
	items, source, reason, detail, err := h.cfg.TopNewsService.GetTopNews(r.Context(), h.getUserID(r), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"items":  items,
		"source": source,
		"reason": reason,
		"detail": detail,
	})
}

func parseIntDefault(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	val, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return val
}

func parseSortPref(raw string) string {
	switch raw {
	case "latest", "oldest", "popular_latest":
		return raw
	default:
		return "popular_latest"
	}
}

func parseItemCursor(raw string) *services.ItemCursor {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ":")
	if len(parts) != 2 {
		return nil
	}
	ts, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return nil
	}
	id, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return nil
	}
	if ts <= 0 || id <= 0 {
		return nil
	}
	return &services.ItemCursor{Timestamp: ts, ID: id}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

// FileServer conveniently sets up a http.FileServer handler to serve
// static files from a http.FileSystem.
func FileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit any URL parameters.")
	}

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		rctx := chi.RouteContext(r.Context())
		pathPrefix := strings.TrimSuffix(rctx.RoutePattern(), "/*")
		fs := http.StripPrefix(pathPrefix, http.FileServer(root))

		// Wrapper to handle SPA fallback (index.html)
		// We inspect the requested file; if it doesn't exist, serving index.html
		requestPath := chi.URLParam(r, "*")
		f, err := root.Open(requestPath)
		if err != nil && os.IsNotExist(err) {
			// File not found, serve index.html
			index, err := root.Open("index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
			defer index.Close()
			http.ServeContent(w, r, "index.html", time.Now(), index)
			return
		}
		if err == nil {
			defer f.Close()
		}

		// Otherwise serve normally
		fs.ServeHTTP(w, r)
	})
}
