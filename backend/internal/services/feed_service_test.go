package services

import (
	"testing"

	"rss-feed-manager/backend/internal/models"
)

func TestNormalizeItemSort(t *testing.T) {
	tests := []struct {
		input    string
		expected ItemSort
	}{
		{"latest", SortLatest},
		{"oldest", SortOldest},
		{"popular_latest", SortPopularLatest},
		{"", SortPopularLatest},        // default
		{"invalid", SortPopularLatest}, // default for unknown
		{"LATEST", SortPopularLatest},  // case sensitive, unknown
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			result := normalizeItemSort(tc.input)
			if result != tc.expected {
				t.Errorf("normalizeItemSort(%q) = %q, expected %q", tc.input, result, tc.expected)
			}
		})
	}
}

func TestLooksLikeImageURL(t *testing.T) {
	tests := []struct {
		url      string
		expected bool
	}{
		{"https://example.com/image.jpg", true},
		{"https://example.com/image.jpeg", true},
		{"https://example.com/image.png", true},
		{"https://example.com/image.gif", true},
		{"https://example.com/image.webp", true},
		{"https://example.com/image.JPG", true}, // case insensitive
		{"https://example.com/image.JPEG", true},
		{"https://example.com/video.mp4", false},
		{"https://example.com/page.html", false},
		{"https://example.com/doc.pdf", false},
		{"", false},
	}

	for _, tc := range tests {
		t.Run(tc.url, func(t *testing.T) {
			result := looksLikeImageURL(tc.url)
			if result != tc.expected {
				t.Errorf("looksLikeImageURL(%q) = %v, expected %v", tc.url, result, tc.expected)
			}
		})
	}
}

func TestDedupeMedia(t *testing.T) {
	t.Run("removes duplicates", func(t *testing.T) {
		input := []models.Media{
			{URL: "https://example.com/a.jpg", Type: "image/jpeg"},
			{URL: "https://example.com/b.jpg", Type: "image/jpeg"},
			{URL: "https://example.com/a.jpg", Type: "image/jpeg"}, // duplicate
		}
		result := dedupeMedia(input)
		if len(result) != 2 {
			t.Errorf("Expected 2 items, got %d", len(result))
		}
	})

	t.Run("handles empty input", func(t *testing.T) {
		result := dedupeMedia(nil)
		if result != nil {
			t.Errorf("Expected nil, got %v", result)
		}
	})

	t.Run("skips empty URLs", func(t *testing.T) {
		input := []models.Media{
			{URL: "", Type: "image/jpeg"},
			{URL: "   ", Type: "image/jpeg"},
			{URL: "https://example.com/a.jpg", Type: "image/jpeg"},
		}
		result := dedupeMedia(input)
		if len(result) != 1 {
			t.Errorf("Expected 1 item, got %d", len(result))
		}
	})
}

func TestBoolToInt(t *testing.T) {
	if boolToInt(true) != 1 {
		t.Error("boolToInt(true) should be 1")
	}
	if boolToInt(false) != 0 {
		t.Error("boolToInt(false) should be 0")
	}
}

func TestFirstAttr(t *testing.T) {
	attrs := map[string]string{
		"url":   "",
		"src":   "  ",
		"href":  "https://example.com",
		"title": "Example",
	}

	t.Run("finds first non-empty attr", func(t *testing.T) {
		result := firstAttr(attrs, "url", "src", "href")
		if result != "https://example.com" {
			t.Errorf("Expected 'https://example.com', got '%s'", result)
		}
	})

	t.Run("returns empty when nothing found", func(t *testing.T) {
		result := firstAttr(attrs, "missing", "also_missing")
		if result != "" {
			t.Errorf("Expected empty string, got '%s'", result)
		}
	})

	t.Run("handles empty attrs", func(t *testing.T) {
		result := firstAttr(nil, "url")
		if result != "" {
			t.Errorf("Expected empty string, got '%s'", result)
		}
	})
}
