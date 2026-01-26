package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"rss-feed-manager/backend/internal/models"
	"rss-feed-manager/backend/internal/services"
)

type contextKey string

const userContextKey contextKey = "user"

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// SendMagicLink handles POST /api/auth/magic-link (now sends OTP)
func (h *AuthHandler) SendMagicLink(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	email := strings.TrimSpace(strings.ToLower(body.Email))
	if email == "" || !strings.Contains(email, "@") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "valid email required"})
		return
	}

	if err := h.authService.SendOTP(r.Context(), email); err != nil {
		if err == services.ErrTooManyAttempts {
			writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "too many attempts, please try again later"})
			return
		}
		// Don't reveal if email exists or not for other errors
		writeJSON(w, http.StatusOK, map[string]string{"message": "if that email is valid, you'll receive a sign-in code"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "check your email for your sign-in code"})
}

// VerifyOTP handles POST /api/auth/verify-otp
func (h *AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	email := strings.TrimSpace(strings.ToLower(body.Email))
	code := strings.TrimSpace(body.Code)

	if email == "" || code == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email and code required"})
		return
	}

	// Validate code format (6 digits)
	if len(code) != 6 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "code must be 6 digits"})
		return
	}
	for _, c := range code {
		if c < '0' || c > '9' {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "code must be 6 digits"})
			return
		}
	}

	user, sessionToken, err := h.authService.VerifyOTP(r.Context(), email, code)
	if err != nil {
		if err == services.ErrTooManyAttempts {
			writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "too many attempts, please try again later"})
			return
		}
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or expired code"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":  user,
		"token": sessionToken,
	})
}

// VerifyMagicLink handles GET /api/auth/verify
func (h *AuthHandler) VerifyMagicLink(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "token required"})
		return
	}

	user, sessionToken, err := h.authService.VerifyMagicLink(r.Context(), token)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or expired link"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":  user,
		"token": sessionToken,
	})
}

// Logout handles POST /api/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	token := extractToken(r)
	if token == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	_ = h.authService.Logout(r.Context(), token)
	w.WriteHeader(http.StatusNoContent)
}

// Me handles GET /api/auth/me
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user := UserFromContext(r.Context())
	if user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// AuthMiddleware validates session and adds user to context
func (h *AuthHandler) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "authentication required"})
			return
		}

		user, err := h.authService.ValidateSession(r.Context(), token)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid or expired session"})
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuthMiddleware adds user to context if valid token, but doesn't require it
func (h *AuthHandler) OptionalAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token != "" {
			user, err := h.authService.ValidateSession(r.Context(), token)
			if err == nil && user != nil {
				ctx := context.WithValue(r.Context(), userContextKey, user)
				r = r.WithContext(ctx)
			}
		}
		next.ServeHTTP(w, r)
	})
}

// UserFromContext extracts user from context
func UserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(userContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}

// extractToken gets the bearer token from Authorization header or cookie
func extractToken(r *http.Request) string {
	// Try Authorization header first
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	// Try cookie
	cookie, err := r.Cookie("session_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}

	return ""
}
