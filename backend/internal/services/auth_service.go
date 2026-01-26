package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"rss-feed-manager/backend/internal/db"
	"rss-feed-manager/backend/internal/mailer"
	"rss-feed-manager/backend/internal/models"
)

var (
	ErrInvalidToken   = errors.New("invalid or expired token")
	ErrInvalidOTP     = errors.New("invalid or expired code")
	ErrTooManyAttempts = errors.New("too many attempts, please try again later")
	ErrUserNotFound   = errors.New("user not found")
	ErrSessionExpired = errors.New("session expired")
)

// Security constants
const (
	OTPLength          = 6
	OTPExpiry          = 10 * time.Minute
	MaxOTPAttempts     = 5                  // Max wrong OTP attempts before lockout
	MaxSendAttempts    = 5                  // Max OTP send requests per window
	RateLimitWindow    = 15 * time.Minute   // Rate limit window
	LockoutDuration    = 30 * time.Minute   // Lockout duration after too many attempts
)

type AuthService struct {
	db                *sql.DB
	mailer            mailer.Mailer
	magicLinkExpiry   time.Duration
	sessionExpiry     time.Duration
	frontendURL       string
}

func NewAuthService(db *sql.DB, m mailer.Mailer) *AuthService {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	return &AuthService{
		db:              db,
		mailer:          m,
		magicLinkExpiry: 15 * time.Minute,
		sessionExpiry:   30 * 24 * time.Hour, // 30 days
		frontendURL:     frontendURL,
	}
}

// generateOTP creates a cryptographically secure 6-digit OTP
func generateOTP() (string, error) {
	// Generate a random number between 0 and 999999
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	// Format with leading zeros to ensure 6 digits
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// checkRateLimit checks if the email is rate limited for the given action
func (s *AuthService) checkRateLimit(ctx context.Context, email, action string) error {
	var attempts int
	var firstAttemptAt time.Time
	var lockedUntil sql.NullTime

	err := s.db.QueryRowContext(ctx, `
		SELECT attempts, first_attempt_at, locked_until 
		FROM auth_rate_limits 
		WHERE email = ? AND action = ?
	`, email, action).Scan(&attempts, &firstAttemptAt, &lockedUntil)

	if err == sql.ErrNoRows {
		// No record, not rate limited
		return nil
	}
	if err != nil {
		return err
	}

	// Check if currently locked out
	if lockedUntil.Valid && time.Now().Before(lockedUntil.Time) {
		return ErrTooManyAttempts
	}

	// Check if we're within the rate limit window
	windowEnd := firstAttemptAt.Add(RateLimitWindow)
	if time.Now().Before(windowEnd) {
		maxAttempts := MaxSendAttempts
		if action == "verify" {
			maxAttempts = MaxOTPAttempts
		}
		if attempts >= maxAttempts {
			// Lock out the user
			lockUntil := time.Now().Add(LockoutDuration)
			_, _ = s.db.ExecContext(ctx, `
				UPDATE auth_rate_limits SET locked_until = ? WHERE email = ? AND action = ?
			`, lockUntil, email, action)
			return ErrTooManyAttempts
		}
	}

	return nil
}

// incrementRateLimit increments the attempt counter
func (s *AuthService) incrementRateLimit(ctx context.Context, email, action string) {
	now := time.Now()
	
	// Try to update existing record
	result, err := s.db.ExecContext(ctx, `
		UPDATE auth_rate_limits 
		SET attempts = CASE 
			WHEN first_attempt_at < ? THEN 1 
			ELSE attempts + 1 
		END,
		first_attempt_at = CASE 
			WHEN first_attempt_at < ? THEN ? 
			ELSE first_attempt_at 
		END,
		last_attempt_at = ?
		WHERE email = ? AND action = ?
	`, now.Add(-RateLimitWindow), now.Add(-RateLimitWindow), now, now, email, action)
	
	if err != nil {
		log.Printf("Error updating rate limit: %v", err)
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		// Insert new record
		_, err = s.db.ExecContext(ctx, `
			INSERT INTO auth_rate_limits (email, action, attempts, first_attempt_at, last_attempt_at)
			VALUES (?, ?, 1, ?, ?)
		`, email, action, now, now)
		if err != nil {
			log.Printf("Error inserting rate limit: %v", err)
		}
	}
}

// resetRateLimit resets the rate limit counter (on successful verification)
func (s *AuthService) resetRateLimit(ctx context.Context, email, action string) {
	_, _ = s.db.ExecContext(ctx, `
		DELETE FROM auth_rate_limits WHERE email = ? AND action = ?
	`, email, action)
}

// SendOTP generates and sends a 6-digit OTP to the user's email
func (s *AuthService) SendOTP(ctx context.Context, email string) error {
	// Check rate limit for sending OTPs
	if err := s.checkRateLimit(ctx, email, "send"); err != nil {
		return err
	}

	// Generate secure 6-digit OTP
	otp, err := generateOTP()
	if err != nil {
		return err
	}

	expiresAt := time.Now().Add(OTPExpiry)

	// Invalidate any existing OTPs for this email
	_, err = s.db.ExecContext(ctx, `
		UPDATE otp_codes SET used = 1 WHERE email = ? AND used = 0
	`, email)
	if err != nil {
		return err
	}

	// Store the new OTP
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO otp_codes (email, code, expires_at)
		VALUES (?, ?, ?)
	`, email, otp, expiresAt)
	if err != nil {
		return err
	}

	// Increment rate limit counter
	s.incrementRateLimit(ctx, email, "send")

	// Send email with OTP
	subject := "Your RSS Feed Manager sign-in code"
	body := fmt.Sprintf(`Hello!

Your sign-in code for RSS Feed Manager is:

    %s

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.
`, otp)

	return s.mailer.Send(email, subject, body)
}

// VerifyOTP verifies the OTP and creates a session
func (s *AuthService) VerifyOTP(ctx context.Context, email, code string) (*models.User, string, error) {
	// Check rate limit for verification attempts
	if err := s.checkRateLimit(ctx, email, "verify"); err != nil {
		return nil, "", err
	}

	var otpID int64
	var storedCode string
	var expiresAt time.Time
	var used bool
	var attempts int

	err := s.db.QueryRowContext(ctx, `
		SELECT id, code, expires_at, used, attempts 
		FROM otp_codes 
		WHERE email = ? AND used = 0
		ORDER BY created_at DESC 
		LIMIT 1
	`, email).Scan(&otpID, &storedCode, &expiresAt, &used, &attempts)
	
	if err == sql.ErrNoRows {
		s.incrementRateLimit(ctx, email, "verify")
		return nil, "", ErrInvalidOTP
	}
	if err != nil {
		return nil, "", err
	}

	// Check if OTP is expired
	if time.Now().After(expiresAt) {
		s.incrementRateLimit(ctx, email, "verify")
		return nil, "", ErrInvalidOTP
	}

	// Check if too many attempts on this specific OTP
	if attempts >= MaxOTPAttempts {
		// Mark OTP as used (expired due to attempts)
		_, _ = s.db.ExecContext(ctx, `UPDATE otp_codes SET used = 1 WHERE id = ?`, otpID)
		return nil, "", ErrTooManyAttempts
	}

	// Verify the code (constant-time comparison to prevent timing attacks)
	if !secureCompare(code, storedCode) {
		// Increment attempts on this OTP
		_, _ = s.db.ExecContext(ctx, `
			UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?
		`, otpID)
		s.incrementRateLimit(ctx, email, "verify")
		return nil, "", ErrInvalidOTP
	}

	// OTP is valid - mark as used
	_, err = s.db.ExecContext(ctx, `UPDATE otp_codes SET used = 1 WHERE id = ?`, otpID)
	if err != nil {
		return nil, "", err
	}

	// Reset rate limits on successful verification
	s.resetRateLimit(ctx, email, "send")
	s.resetRateLimit(ctx, email, "verify")

	// Find or create user
	var userID int64
	isNewUser := false
	err = s.db.QueryRowContext(ctx, `SELECT id FROM users WHERE email = ?`, email).Scan(&userID)
	if err == sql.ErrNoRows {
		// Create new user
		result, err := s.db.ExecContext(ctx, `INSERT INTO users (email) VALUES (?)`, email)
		if err != nil {
			return nil, "", err
		}
		userID, err = result.LastInsertId()
		if err != nil {
			return nil, "", err
		}
		isNewUser = true
	} else if err != nil {
		return nil, "", err
	}

	// Seed new users with starter folders and feeds
	if isNewUser {
		if err := db.SeedNewUser(s.db, userID); err != nil {
			log.Printf("Warning: failed to seed new user %d: %v", userID, err)
		}
	}

	// Create session
	sessionToken, err := generateToken(32)
	if err != nil {
		return nil, "", err
	}
	sessionExpires := time.Now().Add(s.sessionExpiry)

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO sessions (user_id, token, expires_at)
		VALUES (?, ?, ?)
	`, userID, sessionToken, sessionExpires)
	if err != nil {
		return nil, "", err
	}

	user := &models.User{
		ID:        userID,
		Email:     email,
		CreatedAt: time.Now(),
	}

	return user, sessionToken, nil
}

// secureCompare performs a constant-time string comparison
func secureCompare(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	var result byte
	for i := 0; i < len(a); i++ {
		result |= a[i] ^ b[i]
	}
	return result == 0
}

// Legacy magic link methods (kept for backward compatibility during transition)

func (s *AuthService) SendMagicLink(ctx context.Context, email string) error {
	// Redirect to OTP method
	return s.SendOTP(ctx, email)
}

func (s *AuthService) VerifyMagicLink(ctx context.Context, token string) (*models.User, string, error) {
	var email string
	var expiresAt time.Time
	var used bool

	err := s.db.QueryRowContext(ctx, `
		SELECT email, expires_at, used FROM magic_links WHERE token = ?
	`, token).Scan(&email, &expiresAt, &used)
	if err == sql.ErrNoRows {
		return nil, "", ErrInvalidToken
	}
	if err != nil {
		return nil, "", err
	}

	if used {
		return nil, "", ErrInvalidToken
	}
	if time.Now().After(expiresAt) {
		return nil, "", ErrInvalidToken
	}

	// Mark token as used
	_, err = s.db.ExecContext(ctx, `UPDATE magic_links SET used = 1 WHERE token = ?`, token)
	if err != nil {
		return nil, "", err
	}

	// Find or create user
	var userID int64
	isNewUser := false
	err = s.db.QueryRowContext(ctx, `SELECT id FROM users WHERE email = ?`, email).Scan(&userID)
	if err == sql.ErrNoRows {
		result, err := s.db.ExecContext(ctx, `INSERT INTO users (email) VALUES (?)`, email)
		if err != nil {
			return nil, "", err
		}
		userID, err = result.LastInsertId()
		if err != nil {
			return nil, "", err
		}
		isNewUser = true
	} else if err != nil {
		return nil, "", err
	}

	if isNewUser {
		if err := db.SeedNewUser(s.db, userID); err != nil {
			log.Printf("Warning: failed to seed new user %d: %v", userID, err)
		}
	}

	sessionToken, err := generateToken(32)
	if err != nil {
		return nil, "", err
	}
	sessionExpires := time.Now().Add(s.sessionExpiry)

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO sessions (user_id, token, expires_at)
		VALUES (?, ?, ?)
	`, userID, sessionToken, sessionExpires)
	if err != nil {
		return nil, "", err
	}

	user := &models.User{
		ID:        userID,
		Email:     email,
		CreatedAt: time.Now(),
	}

	return user, sessionToken, nil
}

func (s *AuthService) ValidateSession(ctx context.Context, token string) (*models.User, error) {
	var userID int64
	var expiresAt time.Time

	err := s.db.QueryRowContext(ctx, `
		SELECT user_id, expires_at FROM sessions WHERE token = ?
	`, token).Scan(&userID, &expiresAt)
	if err == sql.ErrNoRows {
		return nil, ErrInvalidToken
	}
	if err != nil {
		return nil, err
	}

	if time.Now().After(expiresAt) {
		_, _ = s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token = ?`, token)
		return nil, ErrSessionExpired
	}

	var user models.User
	err = s.db.QueryRowContext(ctx, `
		SELECT id, email, created_at FROM users WHERE id = ?
	`, userID).Scan(&user.ID, &user.Email, &user.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE token = ?`, token)
	return err
}

func (s *AuthService) CleanupExpired(ctx context.Context) error {
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions WHERE expires_at < ?`, now)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `DELETE FROM magic_links WHERE expires_at < ?`, now)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `DELETE FROM otp_codes WHERE expires_at < ?`, now)
	if err != nil {
		return err
	}
	// Clean up old rate limit records (older than 1 hour)
	_, err = s.db.ExecContext(ctx, `DELETE FROM auth_rate_limits WHERE last_attempt_at < ?`, now.Add(-time.Hour))
	return err
}

func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
