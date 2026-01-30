package feeds

import (
	"testing"

	"github.com/mmcdole/gofeed"
)

func TestNormalizeGUID_WithGUID(t *testing.T) {
	item := &gofeed.Item{GUID: "test-guid-123"}
	result := NormalizeGUID(item)
	if result != "test-guid-123" {
		t.Errorf("Expected 'test-guid-123', got '%s'", result)
	}
}

func TestNormalizeGUID_FallbackToLink(t *testing.T) {
	item := &gofeed.Item{GUID: "", Link: "https://example.com/article"}
	result := NormalizeGUID(item)
	if result == "" {
		t.Error("Expected non-empty hash, got empty string")
	}
	// Should be a hex-encoded SHA256 hash (64 characters)
	if len(result) != 64 {
		t.Errorf("Expected 64 character hash, got %d characters", len(result))
	}
}

func TestNormalizeGUID_FallbackToTitle(t *testing.T) {
	item := &gofeed.Item{GUID: "", Link: "", Title: "Test Article Title"}
	result := NormalizeGUID(item)
	if result == "" {
		t.Error("Expected non-empty hash, got empty string")
	}
	if len(result) != 64 {
		t.Errorf("Expected 64 character hash, got %d characters", len(result))
	}
}

func TestResolveRelative_AbsoluteURL(t *testing.T) {
	base := "https://example.com/feed"
	raw := "https://cdn.example.com/image.jpg"
	result := ResolveRelative(base, raw)
	if result != raw {
		t.Errorf("Expected '%s', got '%s'", raw, result)
	}
}

func TestResolveRelative_RelativeURL(t *testing.T) {
	base := "https://example.com/feed/"
	raw := "/images/photo.jpg"
	result := ResolveRelative(base, raw)
	expected := "https://example.com/images/photo.jpg"
	if result != expected {
		t.Errorf("Expected '%s', got '%s'", expected, result)
	}
}

func TestResolveRelative_EmptyRaw(t *testing.T) {
	base := "https://example.com"
	raw := ""
	result := ResolveRelative(base, raw)
	if result != "" {
		t.Errorf("Expected empty string, got '%s'", result)
	}
}
