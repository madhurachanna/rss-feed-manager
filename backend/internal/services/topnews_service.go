package services

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"rss-feed-manager/backend/internal/models"
)

type TopNewsService struct {
	db              *sql.DB
	apiKey          string
	model           string
	client          *http.Client
	timeout         time.Duration
	temperature     float64
	maxOutputTokens int

	mu    sync.Mutex
	cache struct {
		items     []models.Item
		expiresAt time.Time
		source    string
		reason    string
		detail    string
	}
}

const (
	defaultGeminiTimeout     = 20 * time.Second
	defaultGeminiTemperature = 0.2
	defaultGeminiMaxTokens   = 512
)

func NewTopNewsService(db *sql.DB) *TopNewsService {
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-3-flash-preview"
	}
	timeout := readDurationEnv("GEMINI_TIMEOUT", defaultGeminiTimeout)
	temperature := readFloatEnv("GEMINI_TEMPERATURE", defaultGeminiTemperature)
	maxOutputTokens := readIntEnv("GEMINI_MAX_OUTPUT_TOKENS", defaultGeminiMaxTokens)
	return &TopNewsService{
		db:              db,
		apiKey:          os.Getenv("GEMINI_API_KEY"),
		model:           model,
		client:          &http.Client{Timeout: timeout},
		timeout:         timeout,
		temperature:     temperature,
		maxOutputTokens: maxOutputTokens,
	}
}

func (s *TopNewsService) GetTopNews(ctx context.Context, userID int64, limit int) ([]models.Item, string, string, string, error) {
	if limit <= 0 {
		limit = 18
	}
	log.Printf("top news request: user=%d limit=%d", userID, limit)
	if cached, source, reason, detail := s.getCache(limit); cached != nil {
		if reason == "" {
			reason = "cached"
		}
		log.Printf("top news cache hit: user=%d source=%s reason=%s limit=%d", userID, source, reason, limit)
		return cached, source, reason, detail, nil
	}

	items, err := s.fetchRecentItems(ctx, userID, 200)
	if err != nil {
		log.Printf("top news fetch items error: user=%d err=%v", userID, err)
		return nil, "", "", "", err
	}
	if len(items) == 0 {
		log.Printf("top news no items: user=%d", userID)
		return items, "fallback", "no_items", "", nil
	}

	if s.apiKey == "" {
		log.Printf("top news missing GEMINI_API_KEY: user=%d", userID)
		return s.setCache(items, limit, "fallback", "missing_api_key", "GEMINI_API_KEY is empty"), "fallback", "missing_api_key", "GEMINI_API_KEY is empty", nil
	}

	ids, err := s.rankWithGemini(ctx, items, limit)
	if err != nil || len(ids) == 0 {
		detail := ""
		if err != nil {
			detail = err.Error()
			log.Printf("top news gemini rank error: user=%d err=%v", userID, err)
		} else {
			log.Printf("top news gemini returned no ids: user=%d", userID)
		}
		return s.setCache(items, limit, "fallback", "gemini_error", detail), "fallback", "gemini_error", detail, nil
	}

	byID := map[int64]models.Item{}
	for _, it := range items {
		byID[it.ID] = it
	}
	used := map[int64]bool{}
	var ranked []models.Item
	for _, id := range ids {
		if it, ok := byID[id]; ok && !used[id] {
			ranked = append(ranked, it)
			used[id] = true
		}
		if len(ranked) >= limit {
			break
		}
	}
	for _, it := range items {
		if len(ranked) >= limit {
			break
		}
		if !used[it.ID] {
			ranked = append(ranked, it)
			used[it.ID] = true
		}
	}

	log.Printf("top news gemini rank success: user=%d items=%d ranked=%d", userID, len(items), len(ranked))
	return s.setCache(ranked, limit, "ai", "", ""), "ai", "", "", nil
}

func (s *TopNewsService) getCache(limit int) ([]models.Item, string, string, string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if time.Now().Before(s.cache.expiresAt) && len(s.cache.items) > 0 {
		if s.cache.reason == "gemini_error" && s.cache.detail == "" {
			return nil, "", "", ""
		}
		if len(s.cache.items) <= limit {
			return append([]models.Item(nil), s.cache.items...), s.cache.source, s.cache.reason, s.cache.detail
		}
		return append([]models.Item(nil), s.cache.items[:limit]...), s.cache.source, s.cache.reason, s.cache.detail
	}
	return nil, "", "", ""
}

func (s *TopNewsService) setCache(items []models.Item, limit int, source, reason, detail string) []models.Item {
	s.mu.Lock()
	defer s.mu.Unlock()
	max := len(items)
	if limit > 0 && limit < max {
		max = limit
	}
	s.cache.items = append([]models.Item(nil), items[:max]...)
	s.cache.expiresAt = time.Now().Add(10 * time.Minute)
	s.cache.source = source
	s.cache.reason = reason
	s.cache.detail = detail
	return append([]models.Item(nil), items[:max]...)
}

func (s *TopNewsService) fetchRecentItems(ctx context.Context, userID int64, limit int) ([]models.Item, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT items.id, items.feed_id, items.guid, items.link, items.title, items.author, items.published_at, items.summary_text,
			   items.content_html, items.media_json, items.created_at,
			   IFNULL(item_state.is_read,0), IFNULL(item_state.is_bookmarked,0), item_state.bookmarked_at,
			   feeds.title, feeds.site_url
		FROM items
		LEFT JOIN item_state ON item_state.item_id = items.id
		JOIN feeds ON feeds.id = items.feed_id
		WHERE items.user_id=?
		ORDER BY items.created_at DESC
		LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.Item
	for rows.Next() {
		var it models.Item
		var published sql.NullTime
		var bookmarkedAt sql.NullTime
		var stateRead, stateBm bool
		var sourceTitle sql.NullString
		var sourceSite sql.NullString
		if err := rows.Scan(&it.ID, &it.FeedID, &it.GUID, &it.Link, &it.Title, &it.Author, &published,
			&it.SummaryText, &it.ContentHTML, &it.MediaJSON, &it.CreatedAt,
			&stateRead, &stateBm, &bookmarkedAt,
			&sourceTitle, &sourceSite); err != nil {
			return nil, err
		}
		it.UserID = userID
		if published.Valid {
			it.PublishedAt = &published.Time
		}
		it.State = models.ItemState{ItemID: it.ID, UserID: userID, IsRead: stateRead, IsBookmarked: stateBm}
		if bookmarkedAt.Valid {
			it.State.BookmarkedAt = &bookmarkedAt.Time
		}
		if sourceTitle.Valid || sourceSite.Valid {
			it.Source = &models.Feed{ID: it.FeedID, Title: sourceTitle.String, SiteURL: sourceSite.String}
		}
		items = append(items, it)
	}
	return items, nil
}

func (s *TopNewsService) rankWithGemini(ctx context.Context, items []models.Item, limit int) ([]int64, error) {
	type promptItem struct {
		ID        int64  `json:"id"`
		Title     string `json:"title"`
		Source    string `json:"source"`
		Published string `json:"published"`
		Summary   string `json:"summary"`
	}
	var payload []promptItem
	allowedIDs := make(map[int64]bool, len(items))
	orderedIDs := make([]int64, 0, len(items))
	for _, it := range items {
		allowedIDs[it.ID] = true
		orderedIDs = append(orderedIDs, it.ID)
		source := ""
		if it.Source != nil {
			source = it.Source.Title
		}
		summary := trimSummary(it.SummaryText, 220)
		if summary == "" {
			summary = trimSummary(stripHTML(it.ContentHTML), 220)
		}
		published := ""
		if it.PublishedAt != nil {
			published = it.PublishedAt.Format(time.RFC3339)
		}
		payload = append(payload, promptItem{
			ID:        it.ID,
			Title:     it.Title,
			Source:    source,
			Published: published,
			Summary:   summary,
		})
	}

	if err := ctx.Err(); err != nil {
		log.Printf("top news gemini skipped: request context error: %v", err)
		return nil, err
	}
	geminiCtx, cancel := context.WithTimeout(context.Background(), s.timeout)
	defer cancel()

	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("top news gemini marshal payload error: %v", err)
		return nil, err
	}
	prompt := fmt.Sprintf(`You are a news editor. Pick the top %d most important and diverse items.
Return ONLY a JSON array of item ids (numbers). Do not wrap in an object.
Example: [1,2,3]
Items: %s`, limit, string(body))

	reqBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{"parts": []map[string]string{{"text": prompt}}},
		},
		"generationConfig": map[string]interface{}{
			"temperature":      s.temperature,
			"maxOutputTokens":  s.maxOutputTokens,
			"responseMimeType": "application/json",
		},
	}
	reqBytes, err := json.Marshal(reqBody)
	if err != nil {
		log.Printf("top news gemini marshal request error: %v", err)
		return nil, err
	}

	models := resolveGeminiModels(s.model)
	var lastErr error
	for _, model := range models {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, s.apiKey)
		log.Printf("top news gemini request: model=%s items=%d bytes=%d", model, len(payload), len(reqBytes))
		req, err := http.NewRequestWithContext(geminiCtx, http.MethodPost, url, bytes.NewReader(reqBytes))
		if err != nil {
			log.Printf("top news gemini build request error: %v", err)
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := s.client.Do(req)
		if err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				log.Printf("top news gemini timeout: timeout=%s err=%v", s.timeout, err)
			} else if errors.Is(err, context.Canceled) {
				log.Printf("top news gemini canceled: err=%v", err)
			}
			log.Printf("top news gemini request error: %v", err)
			return nil, err
		}
		respBytes, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		respText := strings.TrimSpace(string(respBytes))
		if resp.StatusCode >= 400 {
			lastErr = geminiStatusError{status: resp.StatusCode, body: respText}
			log.Printf("top news gemini status error: status=%d body=%s", resp.StatusCode, truncateLog(respText, 1800))
			if isGeminiModelNotFound(lastErr) {
				continue
			}
			return nil, lastErr
		}

		var res struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}
		if err := json.Unmarshal(respBytes, &res); err != nil {
			log.Printf("top news gemini decode error: %v body=%s", err, truncateLog(respText, 1800))
			return nil, err
		}
		if len(res.Candidates) == 0 || len(res.Candidates[0].Content.Parts) == 0 {
			log.Printf("top news gemini empty candidates: body=%s", truncateLog(respText, 1800))
			return nil, errors.New("empty gemini response")
		}
		text := res.Candidates[0].Content.Parts[0].Text
		ids := parseIDList(text, allowedIDs, orderedIDs)
		if len(ids) == 0 {
			log.Printf("top news gemini parse ids empty: response=%s", truncateLog(text, 800))
			return nil, errors.New("gemini response did not include any ids")
		}
		return ids, nil
	}
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.New("gemini request failed")
}

func parseIDList(text string, allowed map[int64]bool, orderedIDs []int64) []int64 {
	start := strings.Index(text, "[")
	end := strings.LastIndex(text, "]")
	if start == -1 || end == -1 || end <= start {
		raw := extractNumbers(text, nil)
		return resolveIDs(raw, allowed, orderedIDs)
	}
	segment := text[start : end+1]
	var raw []int64
	if err := json.Unmarshal([]byte(segment), &raw); err == nil {
		return resolveIDs(raw, allowed, orderedIDs)
	}
	var generic []interface{}
	if err := json.Unmarshal([]byte(segment), &generic); err == nil {
		raw = appendIDsFromSlice(raw, generic)
		return resolveIDs(raw, allowed, orderedIDs)
	}
	raw = extractNumbers(text, nil)
	return resolveIDs(raw, allowed, orderedIDs)
}

func uniqueIDs(ids []int64) []int64 {
	seen := map[int64]bool{}
	var out []int64
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

func appendIDsFromSlice(ids []int64, generic []interface{}) []int64 {
	for _, v := range generic {
		switch t := v.(type) {
		case float64:
			ids = append(ids, int64(t))
		case string:
			if parsed, err := strconv.ParseInt(t, 10, 64); err == nil {
				ids = append(ids, parsed)
			}
		case map[string]interface{}:
			ids = appendIDsFromObject(ids, t)
		}
	}
	return ids
}

func appendIDsFromObject(ids []int64, obj map[string]interface{}) []int64 {
	for key, value := range obj {
		switch strings.ToLower(key) {
		case "id":
			switch t := value.(type) {
			case float64:
				ids = append(ids, int64(t))
			case string:
				if parsed, err := strconv.ParseInt(t, 10, 64); err == nil {
					ids = append(ids, parsed)
				}
			}
		case "ids", "ranked_ids", "top_ids", "indexes", "indices", "index", "positions":
			if arr, ok := value.([]interface{}); ok {
				ids = appendIDsFromSlice(ids, arr)
			}
		case "items", "ranked_items", "top_items":
			if arr, ok := value.([]interface{}); ok {
				ids = appendIDsFromSlice(ids, arr)
			}
		}
	}
	return ids
}

func resolveIDs(raw []int64, allowed map[int64]bool, orderedIDs []int64) []int64 {
	if len(raw) == 0 {
		return nil
	}
	filtered := filterAllowed(raw, allowed)
	if len(filtered) > 0 {
		return uniqueIDs(filtered)
	}
	mapped := mapIndexes(raw, orderedIDs)
	if len(mapped) > 0 {
		log.Printf("top news gemini ids not in allowed set; mapped indexes to ids (count=%d)", len(mapped))
		return uniqueIDs(mapped)
	}
	log.Printf("top news gemini ids not in allowed set and index mapping failed")
	return nil
}

func filterAllowed(ids []int64, allowed map[int64]bool) []int64 {
	if len(allowed) == 0 {
		return ids
	}
	filtered := ids[:0]
	for _, id := range ids {
		if allowed[id] {
			filtered = append(filtered, id)
		}
	}
	return filtered
}

func extractNumbers(text string, allowed map[int64]bool) []int64 {
	re := regexp.MustCompile(`\d+`)
	matches := re.FindAllString(text, -1)
	if len(matches) == 0 {
		return nil
	}
	ids := make([]int64, 0, len(matches))
	for _, match := range matches {
		if parsed, err := strconv.ParseInt(match, 10, 64); err == nil {
			if len(allowed) == 0 || allowed[parsed] {
				ids = append(ids, parsed)
			}
		}
	}
	return ids
}

func mapIndexes(indexes []int64, orderedIDs []int64) []int64 {
	if len(indexes) == 0 || len(orderedIDs) == 0 {
		return nil
	}
	usesZeroBased := false
	for _, idx := range indexes {
		if idx == 0 {
			usesZeroBased = true
			break
		}
	}
	var mapped []int64
	for _, idx := range indexes {
		var pos int64
		if usesZeroBased {
			pos = idx
		} else {
			pos = idx - 1
		}
		if pos < 0 || pos >= int64(len(orderedIDs)) {
			continue
		}
		mapped = append(mapped, orderedIDs[pos])
	}
	return mapped
}

func trimSummary(text string, max int) string {
	text = strings.TrimSpace(text)
	if len(text) <= max {
		return text
	}
	return text[:max] + "..."
}

func stripHTML(html string) string {
	if html == "" {
		return ""
	}
	var out strings.Builder
	inTag := false
	for _, r := range html {
		switch r {
		case '<':
			inTag = true
		case '>':
			inTag = false
		default:
			if !inTag {
				out.WriteRune(r)
			}
		}
	}
	return strings.TrimSpace(out.String())
}

func truncateLog(text string, max int) string {
	text = strings.TrimSpace(text)
	if max <= 0 || len(text) <= max {
		return text
	}
	return text[:max] + "..."
}

func readDurationEnv(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	val, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	if val <= 0 {
		return fallback
	}
	return val
}

func readIntEnv(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	val, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	if val <= 0 {
		return fallback
	}
	return val
}

func readFloatEnv(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	val, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return fallback
	}
	if val < 0 {
		return fallback
	}
	return val
}
