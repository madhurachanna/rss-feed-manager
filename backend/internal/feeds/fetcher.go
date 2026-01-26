package feeds

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/mmcdole/gofeed"
)

type FetchResult struct {
	Title        string
	SiteURL      string
	Items        []*gofeed.Item
	Etag         string
	LastModified string
}

type Fetcher struct {
	client *http.Client
	parser *gofeed.Parser
	ua     string
}

func NewFetcher(userAgent string) *Fetcher {
	client := &http.Client{Timeout: 20 * time.Second}
	parser := gofeed.NewParser()
	parser.Client = client
	return &Fetcher{
		client: client,
		parser: parser,
		ua:     userAgent,
	}
}

func (f *Fetcher) Fetch(ctx context.Context, feedURL string, etag string, lastModified string) (*FetchResult, bool, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, feedURL, nil)
	if err != nil {
		return nil, false, fmt.Errorf("request: %w", err)
	}
	req.Header.Set("User-Agent", f.ua)
	if etag != "" {
		req.Header.Set("If-None-Match", etag)
	}
	if lastModified != "" {
		req.Header.Set("If-Modified-Since", lastModified)
	}

	resp, err := f.client.Do(req)
	if err != nil {
		return nil, false, fmt.Errorf("fetch: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		return nil, true, nil
	}
	if resp.StatusCode >= 400 {
		return nil, false, fmt.Errorf("status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, false, fmt.Errorf("read: %w", err)
	}
	feed, err := f.parser.Parse(bytes.NewReader(body))
	if err != nil {
		contentType := resp.Header.Get("Content-Type")
		baseURL := feedURL
		if resp.Request != nil && resp.Request.URL != nil {
			baseURL = resp.Request.URL.String()
		}
		if strings.Contains(contentType, "text/html") || strings.Contains(contentType, "application/xhtml+xml") || len(body) > 0 {
			if discovered := discoverFeedURL(body, baseURL); discovered != "" && discovered != feedURL {
				return f.Fetch(ctx, discovered, "", "")
			}
		}
		return nil, false, fmt.Errorf("parse: %w", err)
	}

	result := &FetchResult{
		Title:        feed.Title,
		SiteURL:      feed.Link,
		Items:        feed.Items,
		Etag:         resp.Header.Get("ETag"),
		LastModified: resp.Header.Get("Last-Modified"),
	}
	return result, false, nil
}

func discoverFeedURL(body []byte, baseURL string) string {
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err != nil {
		return ""
	}
	var candidate string
	doc.Find("link").EachWithBreak(func(_ int, s *goquery.Selection) bool {
		rel := strings.ToLower(strings.TrimSpace(s.AttrOr("rel", "")))
		typ := strings.ToLower(strings.TrimSpace(s.AttrOr("type", "")))
		href := strings.TrimSpace(s.AttrOr("href", ""))
		if href == "" {
			return true
		}
		if strings.Contains(rel, "alternate") || strings.Contains(rel, "feed") {
			if strings.Contains(typ, "rss") || strings.Contains(typ, "atom") || strings.Contains(typ, "xml") || typ == "" {
				candidate = ResolveRelative(baseURL, href)
				return false
			}
		}
		return true
	})
	if candidate != "" {
		return candidate
	}
	doc.Find("a").EachWithBreak(func(_ int, s *goquery.Selection) bool {
		href := strings.TrimSpace(s.AttrOr("href", ""))
		if href == "" {
			return true
		}
		lower := strings.ToLower(href)
		if strings.Contains(lower, "rss") || strings.Contains(lower, "atom") || strings.Contains(lower, "feed") {
			candidate = ResolveRelative(baseURL, href)
			return false
		}
		return true
	})
	return candidate
}

func NormalizeGUID(item *gofeed.Item) string {
	if item.GUID != "" {
		return item.GUID
	}
	link := strings.TrimSpace(item.Link)
	if link == "" {
		link = strings.TrimSpace(item.Title)
	}
	hash := sha256.Sum256([]byte(link))
	return hex.EncodeToString(hash[:])
}

func ResolveRelative(baseURL, raw string) string {
	if raw == "" {
		return raw
	}
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	if u.IsAbs() {
		return raw
	}
	base, err := url.Parse(baseURL)
	if err != nil {
		return raw
	}
	return base.ResolveReference(u).String()
}
