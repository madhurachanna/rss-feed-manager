package db

import (
	"database/sql"
	"fmt"
)

func Migrate(db *sql.DB) error {
	stmts := []string{
		`PRAGMA foreign_keys = ON;`,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			digest_last_sent_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token TEXT UNIQUE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);`,
		`CREATE TABLE IF NOT EXISTS magic_links (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			token TEXT UNIQUE NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL,
			used INTEGER DEFAULT 0
		);`,
		`CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);`,
		// OTP codes table for passwordless auth
		`CREATE TABLE IF NOT EXISTS otp_codes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			code TEXT NOT NULL,
			attempts INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL,
			used INTEGER DEFAULT 0
		);`,
		`CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);`,
		`CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);`,
		// Rate limiting table
		`CREATE TABLE IF NOT EXISTS auth_rate_limits (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			action TEXT NOT NULL,
			attempts INTEGER DEFAULT 1,
			first_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			locked_until DATETIME
		);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_email_action ON auth_rate_limits(email, action);`,
		`CREATE TABLE IF NOT EXISTS folders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS feeds (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			folder_id INTEGER NOT NULL,
			url TEXT NOT NULL,
			title TEXT,
			site_url TEXT,
			etag TEXT,
			last_modified TEXT,
			last_checked_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, url),
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			feed_id INTEGER NOT NULL,
			guid TEXT NOT NULL,
			link TEXT,
			title TEXT,
			author TEXT,
			published_at DATETIME,
			summary_text TEXT,
			content_html TEXT,
			media_json TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, feed_id, guid),
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY(feed_id) REFERENCES feeds(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS item_state (
			item_id INTEGER PRIMARY KEY,
			user_id INTEGER NOT NULL,
			is_read INTEGER DEFAULT 0,
			is_bookmarked INTEGER DEFAULT 0,
			bookmarked_at DATETIME,
			FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_items_feed_published ON items(feed_id, published_at DESC);`,
		`CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at DESC);`,
		`CREATE TABLE IF NOT EXISTS user_settings (
			user_id INTEGER PRIMARY KEY,
			retention_days INTEGER DEFAULT 30,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);`,
	}

	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("migrate step: %w", err)
		}
	}
	return nil
}

func SeedDemoUser(db *sql.DB, id int64, email string) error {
	_, err := db.Exec(`INSERT INTO users(id, email) VALUES(?, ?) ON CONFLICT(id) DO NOTHING`, id, email)
	return err
}
