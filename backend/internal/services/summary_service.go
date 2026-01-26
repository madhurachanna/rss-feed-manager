package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"rss-feed-manager/backend/internal/models"
)

type SummaryService struct {
	apiKey          string
	model           string
	client          *http.Client
	timeout         time.Duration
	temperature     float64
	maxOutputTokens int
	mu              sync.Mutex
	cache           map[int64]summaryCacheEntry
}

const (
	defaultSummaryTimeout     = 20 * time.Second
	defaultSummaryTemperature = 0.2
	defaultSummaryMaxTokens   = 320
	defaultSummaryCacheTTL    = 30 * time.Minute
)

type summaryCacheEntry struct {
	points    []string
	expiresAt time.Time
}

func NewSummaryService() *SummaryService {
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-3-flash-preview"
	}
	timeout := readDurationEnv("GEMINI_TIMEOUT", defaultSummaryTimeout)
	temperature := readFloatEnv("GEMINI_TEMPERATURE", defaultSummaryTemperature)
	maxOutputTokens := readIntEnv("GEMINI_MAX_OUTPUT_TOKENS", defaultSummaryMaxTokens)
	return &SummaryService{
		apiKey:          os.Getenv("GEMINI_API_KEY"),
		model:           model,
		client:          &http.Client{Timeout: timeout},
		timeout:         timeout,
		temperature:     temperature,
		maxOutputTokens: maxOutputTokens,
		cache:           make(map[int64]summaryCacheEntry),
	}
}

func (s *SummaryService) Summarize(ctx context.Context, item models.Item) (models.SummaryResult, error) {
	if s.apiKey == "" {
		return models.SummaryResult{}, errors.New("GEMINI_API_KEY is empty")
	}
	if item.ID > 0 {
		if cached, ok := s.getCache(item.ID); ok {
			return models.SummaryResult{Points: cached}, nil
		}
	}
	content := buildSummaryContent(item)
	if content == "" {
		return models.SummaryResult{}, errors.New("no article content available")
	}
	title := strings.TrimSpace(item.Title)
	source := ""
	if item.Source != nil {
		source = strings.TrimSpace(item.Source.Title)
	}
	prompt := fmt.Sprintf(`You are a newsroom editor. Summarize the article into 3-5 key points.
Return ONLY a JSON array of strings. Do not wrap in an object.
Each point should be a complete sentence and avoid author bios, ads, navigation, or unrelated info.
Title: %s
Source: %s
Content: %s`, title, source, content)

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
		return models.SummaryResult{}, err
	}

	geminiCtx, cancel := context.WithTimeout(context.Background(), s.timeout)
	defer cancel()
	modelCandidates := resolveGeminiModels(s.model)
	var lastErr error
	for _, model := range modelCandidates {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, s.apiKey)
		req, err := http.NewRequestWithContext(geminiCtx, http.MethodPost, url, bytes.NewReader(reqBytes))
		if err != nil {
			return models.SummaryResult{}, err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := s.client.Do(req)
		if err != nil {
			return models.SummaryResult{}, err
		}
		respBytes, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		respText := strings.TrimSpace(string(respBytes))
		if resp.StatusCode >= 400 {
			lastErr = geminiStatusError{status: resp.StatusCode, body: respText}
			if isGeminiModelNotFound(lastErr) {
				continue
			}
			return models.SummaryResult{}, lastErr
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
			return models.SummaryResult{}, err
		}
		if len(res.Candidates) == 0 || len(res.Candidates[0].Content.Parts) == 0 {
			return models.SummaryResult{}, errors.New("empty gemini response")
		}
		points := parseSummaryPoints(res.Candidates[0].Content.Parts[0].Text)
		if len(points) == 0 {
			return models.SummaryResult{}, errors.New("gemini response did not include summary points")
		}
		if item.ID > 0 {
			s.setCache(item.ID, points)
		}
		return models.SummaryResult{Points: points}, nil
	}
	if lastErr != nil {
		return models.SummaryResult{}, lastErr
	}
	return models.SummaryResult{}, errors.New("gemini request failed")
}

func (s *SummaryService) getCache(itemID int64) ([]string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.cache[itemID]
	if !ok || time.Now().After(entry.expiresAt) {
		if ok {
			delete(s.cache, itemID)
		}
		return nil, false
	}
	return append([]string(nil), entry.points...), true
}

func (s *SummaryService) setCache(itemID int64, points []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache[itemID] = summaryCacheEntry{
		points:    append([]string(nil), points...),
		expiresAt: time.Now().Add(defaultSummaryCacheTTL),
	}
}

func buildSummaryContent(item models.Item) string {
	parts := []string{}
	if item.SummaryText != "" {
		parts = append(parts, item.SummaryText)
	}
	if item.ContentHTML != "" {
		parts = append(parts, stripHTML(item.ContentHTML))
	}
	text := normalizeWhitespace(strings.Join(parts, "\n\n"))
	if len(text) > 8000 {
		text = text[:8000] + "..."
	}
	return text
}

func normalizeWhitespace(text string) string {
	fields := strings.Fields(text)
	return strings.TrimSpace(strings.Join(fields, " "))
}

func parseSummaryPoints(text string) []string {
	text = strings.TrimSpace(text)
	var points []string
	if err := json.Unmarshal([]byte(text), &points); err == nil {
		return cleanPoints(points)
	}
	var payload struct {
		Points    []string `json:"points"`
		KeyPoints []string `json:"key_points"`
	}
	if err := json.Unmarshal([]byte(text), &payload); err == nil {
		if len(payload.Points) > 0 {
			return cleanPoints(payload.Points)
		}
		if len(payload.KeyPoints) > 0 {
			return cleanPoints(payload.KeyPoints)
		}
	}
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		upper := strings.ToUpper(line)
		if upper == "KEY POINTS" || upper == "KEY POINTS:" {
			continue
		}
		line = strings.TrimLeft(line, "-•*0123456789. ")
		line = strings.TrimSpace(line)
		if line != "" {
			points = append(points, line)
		}
	}
	return cleanPoints(points)
}

func cleanPoints(points []string) []string {
	seen := make(map[string]bool)
	var out []string
	for _, point := range points {
		point = strings.TrimSpace(point)
		if point == "" {
			continue
		}
		if len(point) > 240 {
			point = point[:240] + "..."
		}
		key := strings.ToLower(point)
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, point)
		if len(out) >= 5 {
			break
		}
	}
	return out
}
