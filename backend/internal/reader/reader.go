package reader

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode"

	readability "github.com/go-shiori/go-readability"

	"rss-feed-manager/backend/internal/models"
)

const (
	// MinContentLength is the minimum content length to consider extraction successful
	MinContentLength = 200
	// ExcerptMaxLength is the maximum length of the excerpt
	ExcerptMaxLength = 200
)

type Client struct {
	httpClient *http.Client
	ua         string
}

func NewClient(userAgent string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 20 * time.Second},
		ua:         userAgent,
	}
}

func (c *Client) Extract(ctx context.Context, targetURL string) (models.ReaderResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return models.ReaderResult{Fallback: true, Error: "failed to create request"}, err
	}
	req.Header.Set("User-Agent", c.ua)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return models.ReaderResult{Fallback: true, Error: "failed to fetch article"}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return models.ReaderResult{Fallback: true, Error: fmt.Sprintf("server returned %d", resp.StatusCode)}, fmt.Errorf("http status %d", resp.StatusCode)
	}

	baseURL, err := url.Parse(targetURL)
	if err != nil {
		return models.ReaderResult{Fallback: true, Error: "invalid URL"}, fmt.Errorf("parse url: %w", err)
	}

	article, err := readability.FromReader(resp.Body, baseURL)
	if err != nil {
		return models.ReaderResult{Fallback: true, Error: "failed to extract article content"}, fmt.Errorf("extract: %w", err)
	}

	// Calculate word count from text content
	wordCount := countWords(article.TextContent)

	// Generate excerpt from text content
	excerpt := generateExcerpt(article.Excerpt, article.TextContent)

	// Check content quality
	contentLen := len(strings.TrimSpace(article.TextContent))
	isFallback := contentLen < MinContentLength

	var errorMsg string
	if isFallback {
		errorMsg = "extracted content is too short"
	}

	// Format published time as ISO string if available
	publishedTime := ""
	if article.PublishedTime != nil && !article.PublishedTime.IsZero() {
		publishedTime = article.PublishedTime.Format(time.RFC3339)
	}

	return models.ReaderResult{
		Title:         article.Title,
		Content:       article.Content,
		Byline:        article.Byline,
		SiteName:      article.SiteName,
		SourceURL:     targetURL,
		Excerpt:       excerpt,
		PublishedTime: publishedTime,
		Image:         article.Image,
		WordCount:     wordCount,
		Fallback:      isFallback,
		Error:         errorMsg,
	}, nil
}

// countWords counts the number of words in the text
func countWords(text string) int {
	if text == "" {
		return 0
	}
	words := strings.FieldsFunc(text, func(r rune) bool {
		return unicode.IsSpace(r) || unicode.IsPunct(r)
	})
	count := 0
	for _, w := range words {
		if len(w) > 0 {
			count++
		}
	}
	return count
}

// generateExcerpt creates a short excerpt from the article
func generateExcerpt(articleExcerpt, textContent string) string {
	// Prefer the article's own excerpt if available
	source := strings.TrimSpace(articleExcerpt)
	if source == "" {
		source = strings.TrimSpace(textContent)
	}
	if source == "" {
		return ""
	}

	// Clean up whitespace
	source = strings.Join(strings.Fields(source), " ")

	if len(source) <= ExcerptMaxLength {
		return source
	}

	// Find a good break point (end of sentence or word)
	excerpt := source[:ExcerptMaxLength]
	lastSpace := strings.LastIndex(excerpt, " ")
	if lastSpace > ExcerptMaxLength/2 {
		excerpt = excerpt[:lastSpace]
	}

	return excerpt + "..."
}
