package services

import (
	"errors"
	"fmt"
	"strings"
)

type geminiStatusError struct {
	status int
	body   string
}

func (e geminiStatusError) Error() string {
	return fmt.Sprintf("gemini status %d: %s", e.status, truncateLog(e.body, 600))
}

func isGeminiModelNotFound(err error) bool {
	var statusErr geminiStatusError
	if errors.As(err, &statusErr) && statusErr.status == 404 {
		return true
	}
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "not_found") || strings.Contains(message, "not found for api version")
}

func resolveGeminiModels(primary string) []string {
	candidates := []string{}
	if strings.TrimSpace(primary) != "" {
		candidates = append(candidates, strings.TrimSpace(primary))
	}
	candidates = append(candidates, "gemini-2.5-flash-latest", "gemini-2.5-flash")
	seen := make(map[string]bool)
	out := make([]string, 0, len(candidates))
	for _, model := range candidates {
		if model == "" || seen[model] {
			continue
		}
		seen[model] = true
		out = append(out, model)
	}
	return out
}
