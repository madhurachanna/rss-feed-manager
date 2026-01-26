package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"rss-feed-manager/backend/internal/mailer"
)

type DigestService struct {
	db     *sql.DB
	mailer mailer.Mailer
}

func NewDigestService(db *sql.DB, mailer mailer.Mailer) *DigestService {
	return &DigestService{db: db, mailer: mailer}
}

func (d *DigestService) SendDigest(ctx context.Context, userID int64, interval time.Duration) error {
	var email string
	var lastSent sql.NullTime
	if err := d.db.QueryRowContext(ctx, `SELECT email, digest_last_sent_at FROM users WHERE id=?`, userID).Scan(&email, &lastSent); err != nil {
		return err
	}
	since := time.Now().Add(-interval)
	if lastSent.Valid {
		since = lastSent.Time
	}

	rows, err := d.db.QueryContext(ctx, `
		SELECT title, link, published_at FROM items
		WHERE user_id=? AND created_at>?
		ORDER BY created_at DESC
		LIMIT 50`, userID, since)
	if err != nil {
		return err
	}
	defer rows.Close()

	var lines []string
	for rows.Next() {
		var title, link string
		var published sql.NullTime
		if err := rows.Scan(&title, &link, &published); err != nil {
			return err
		}
		dateStr := ""
		if published.Valid {
			dateStr = published.Time.Format(time.RFC822)
		}
		lines = append(lines, fmt.Sprintf("- %s (%s) %s", title, dateStr, link))
	}
	if len(lines) == 0 {
		return nil
	}

	body := "Your RSS digest:\n\n" + strings.Join(lines, "\n")
	if err := d.mailer.Send(email, "RSS Digest", body); err != nil {
		return err
	}
	_, err = d.db.ExecContext(ctx, `UPDATE users SET digest_last_sent_at=? WHERE id=?`, time.Now(), userID)
	return err
}
