package services

import (
	"testing"
)

func TestExtractFallbackPoints(t *testing.T) {
	tests := []struct {
		name     string
		content  string
		minCount int
		maxCount int
	}{
		{
			name:     "single sentence",
			content:  "This is a test sentence.",
			minCount: 1,
			maxCount: 1,
		},
		{
			name:     "multiple sentences",
			content:  "First sentence here. Second sentence follows. Third sentence ends.",
			minCount: 2,
			maxCount: 3,
		},
		{
			name:     "empty content",
			content:  "",
			minCount: 0,
			maxCount: 0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Test using splitSentences since extractFallbackPoints requires models.Item
			sentences := splitSentences(tc.content)
			if len(sentences) < tc.minCount || len(sentences) > tc.maxCount {
				t.Errorf("splitSentences(%q) returned %d sentences, expected between %d and %d",
					tc.content, len(sentences), tc.minCount, tc.maxCount)
			}
		})
	}
}

func TestSplitSentences(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected int
	}{
		{"empty", "", 0},
		{"single sentence", "Hello world.", 1},
		{"two sentences", "Hello. World.", 2},
		{"with question", "What is this? It is a test.", 2},
		{"with exclamation", "Wow! That is great.", 2},
		{"no punctuation", "Hello world", 1},
		{"with abbreviations", "Dr. Smith went home. He was tired.", 3},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := splitSentences(tc.input)
			if len(result) != tc.expected {
				t.Errorf("splitSentences(%q) = %v (len %d), expected len %d",
					tc.input, result, len(result), tc.expected)
			}
		})
	}
}

func TestParseSummaryPoints(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected int // number of points
	}{
		{
			name:     "valid json array",
			input:    `["Point 1", "Point 2"]`,
			expected: 2,
		},
		{
			name:     "double encoded json",
			input:    `"[\"Point 1\", \"Point 2\"]"`,
			expected: 2,
		},
		{
			name:     "json object with points",
			input:    `{"points": ["Point 1", "Point 2", "Point 3"]}`,
			expected: 3,
		},
		{
			name:     "markdown code block",
			input:    "```json\n[\"Point 1\"]\n```",
			expected: 1,
		},
		{
			name:     "plain text bullets",
			input:    "- Point 1\n- Point 2",
			expected: 2,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := parseSummaryPoints(tc.input)
			if len(result) != tc.expected {
				t.Errorf("parseSummaryPoints(%q) returned %d points, expected %d",
					tc.input, len(result), tc.expected)
			}
		})
	}
}
