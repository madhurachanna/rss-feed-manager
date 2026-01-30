package reader

import (
	"testing"
)

func TestCountWords(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected int
	}{
		{"empty string", "", 0},
		{"single word", "Hello", 1},
		{"multiple words", "Hello World Test", 3},
		{"with punctuation", "Hello, World! How are you?", 5},
		{"with extra spaces", "  Hello   World  ", 2},
		{"with newlines", "Hello\nWorld\nTest", 3},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := countWords(tc.input)
			if result != tc.expected {
				t.Errorf("countWords(%q) = %d, expected %d", tc.input, result, tc.expected)
			}
		})
	}
}

func TestGenerateExcerpt_ShortText(t *testing.T) {
	text := "This is a short excerpt."
	result := generateExcerpt("", text)
	if result != text {
		t.Errorf("Expected '%s', got '%s'", text, result)
	}
}

func TestGenerateExcerpt_UsesArticleExcerpt(t *testing.T) {
	articleExcerpt := "This is the article excerpt."
	textContent := "This is the full text content that is much longer."
	result := generateExcerpt(articleExcerpt, textContent)
	if result != articleExcerpt {
		t.Errorf("Expected article excerpt, got '%s'", result)
	}
}

func TestGenerateExcerpt_TruncatesLongText(t *testing.T) {
	longText := "This is a very long text that exceeds the maximum excerpt length. " +
		"It should be truncated at a word boundary with an ellipsis. " +
		"This text continues for a while to make sure it exceeds 200 characters, " +
		"which is the excerpt maximum length defined in the reader package."

	result := generateExcerpt("", longText)

	// Should be truncated
	if len(result) > ExcerptMaxLength+10 { // +10 for ellipsis and some slack
		t.Errorf("Excerpt too long: %d characters", len(result))
	}

	// Should end with ellipsis
	if result[len(result)-3:] != "..." {
		t.Errorf("Expected ellipsis at end, got '%s'", result[len(result)-10:])
	}
}

func TestGenerateExcerpt_EmptyInput(t *testing.T) {
	result := generateExcerpt("", "")
	if result != "" {
		t.Errorf("Expected empty string, got '%s'", result)
	}
}
