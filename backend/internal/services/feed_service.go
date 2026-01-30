package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/mmcdole/gofeed"
	ext "github.com/mmcdole/gofeed/extensions"

	"rss-feed-manager/backend/internal/feeds"
	"rss-feed-manager/backend/internal/models"
)

const defaultPageSize = 20
const defaultRetentionDays = 30 // Default item retention period in days

type ItemSort string

const (
	SortPopularLatest ItemSort = "popular_latest"
	SortLatest        ItemSort = "latest"
	SortOldest        ItemSort = "oldest"
)

type ItemCursor struct {
	Timestamp int64
	ID        int64
}

func (c ItemCursor) Encode() string {
	return fmt.Sprintf("%d:%d", c.Timestamp, c.ID)
}

func normalizeItemSort(raw string) ItemSort {
	switch raw {
	case string(SortLatest):
		return SortLatest
	case string(SortOldest):
		return SortOldest
	case string(SortPopularLatest):
		return SortPopularLatest
	default:
		return SortPopularLatest
	}
}

func itemSortTimestamp(item models.Item) int64 {
	if item.PublishedAt != nil {
		return item.PublishedAt.Unix()
	}
	return item.CreatedAt.Unix()
}

type FeedService struct {
	db      *sql.DB
	fetcher *feeds.Fetcher
}

func NewFeedService(db *sql.DB, fetcher *feeds.Fetcher) *FeedService {
	return &FeedService{db: db, fetcher: fetcher}
}

// GetRetentionDays returns the user's item retention setting in days.
func (s *FeedService) GetRetentionDays(ctx context.Context, userID int64) int {
	var days int
	err := s.db.QueryRowContext(ctx, `SELECT retention_days FROM user_settings WHERE user_id = ?`, userID).Scan(&days)
	if err != nil || days <= 0 {
		return defaultRetentionDays
	}
	return days
}

// SetRetentionDays updates the user's item retention setting.
func (s *FeedService) SetRetentionDays(ctx context.Context, userID int64, days int) error {
	if days <= 0 {
		days = defaultRetentionDays
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO user_settings (user_id, retention_days, updated_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(user_id) DO UPDATE SET retention_days = ?, updated_at = CURRENT_TIMESTAMP
	`, userID, days, days)
	return err
}

func (s *FeedService) ListFolders(ctx context.Context, userID int64) ([]models.Folder, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, created_at FROM folders WHERE user_id = ? ORDER BY created_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var f models.Folder
		if err := rows.Scan(&f.ID, &f.Name, &f.CreatedAt); err != nil {
			return nil, err
		}
		f.UserID = userID
		folders = append(folders, f)
	}

	for i := range folders {
		feeds, err := s.listFeedsForFolder(ctx, userID, folders[i].ID)
		if err != nil {
			return nil, err
		}
		folders[i].Feeds = feeds
	}
	return folders, nil
}

func (s *FeedService) listFeedsForFolder(ctx context.Context, userID, folderID int64) ([]models.Feed, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id, url, title, site_url, COALESCE(etag, ''), COALESCE(last_modified, ''), last_checked_at, created_at
		 FROM feeds
		 WHERE user_id=? AND folder_id=?
		 ORDER BY created_at`,
		userID,
		folderID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var feedsList []models.Feed
	for rows.Next() {
		var f models.Feed
		var lastChecked sql.NullTime
		if err := rows.Scan(&f.ID, &f.URL, &f.Title, &f.SiteURL, &f.Etag, &f.LastModified, &lastChecked, &f.CreatedAt); err != nil {
			return nil, err
		}
		f.UserID = userID
		f.FolderID = folderID
		if lastChecked.Valid {
			f.LastCheckedAt = &lastChecked.Time
		}
		feedsList = append(feedsList, f)
	}
	return feedsList, nil
}

func (s *FeedService) CreateFolder(ctx context.Context, userID int64, name string) (models.Folder, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return models.Folder{}, errors.New("name required")
	}
	res, err := s.db.ExecContext(ctx, `INSERT INTO folders(user_id, name) VALUES(?, ?)`, userID, name)
	if err != nil {
		return models.Folder{}, err
	}
	id, _ := res.LastInsertId()
	return models.Folder{ID: id, UserID: userID, Name: name, CreatedAt: time.Now()}, nil
}

func (s *FeedService) RenameFolder(ctx context.Context, userID, folderID int64, name string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE folders SET name=? WHERE id=? AND user_id=?`, strings.TrimSpace(name), folderID, userID)
	return err
}

func (s *FeedService) DeleteFolder(ctx context.Context, userID, folderID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM folders WHERE id=? AND user_id=?`, folderID, userID)
	return err
}

func (s *FeedService) AddFeed(ctx context.Context, userID, folderID int64, feedURL string) (models.Feed, error) {
	feedURL = strings.TrimSpace(feedURL)
	if feedURL == "" {
		return models.Feed{}, errors.New("url required")
	}

	var exists int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM folders WHERE id=? AND user_id=?`, folderID, userID).Scan(&exists); err != nil {
		return models.Feed{}, err
	}
	if exists == 0 {
		return models.Feed{}, errors.New("folder not found")
	}

	result, _, err := s.fetcher.Fetch(ctx, feedURL, "", "")
	if err != nil {
		return models.Feed{}, fmt.Errorf("fetch feed: %w", err)
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Feed{}, err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `INSERT INTO feeds(user_id, folder_id, url, title, site_url, etag, last_modified, last_checked_at) 
		VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, folderID, feedURL, result.Title, result.SiteURL, result.Etag, result.LastModified, time.Now())
	if err != nil {
		return models.Feed{}, err
	}
	feedID, _ := res.LastInsertId()
	feed := models.Feed{
		ID:            feedID,
		UserID:        userID,
		FolderID:      folderID,
		URL:           feedURL,
		Title:         result.Title,
		SiteURL:       result.SiteURL,
		Etag:          result.Etag,
		LastModified:  result.LastModified,
		LastCheckedAt: ptrTime(time.Now()),
		CreatedAt:     time.Now(),
	}

	if err := s.saveItems(ctx, tx, userID, feedID, feedURL, result.Items); err != nil {
		return models.Feed{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.Feed{}, err
	}
	return feed, nil
}

func (s *FeedService) DeleteFeed(ctx context.Context, userID, feedID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM feeds WHERE id=? AND user_id=?`, feedID, userID)
	return err
}

func (s *FeedService) RefreshFeed(ctx context.Context, userID, feedID int64) (int, error) {
	var feed models.Feed
	err := s.db.QueryRowContext(ctx, `SELECT url, COALESCE(etag, ''), COALESCE(last_modified, '') FROM feeds WHERE id=? AND user_id=?`, feedID, userID).
		Scan(&feed.URL, &feed.Etag, &feed.LastModified)
	if err != nil {
		return 0, err
	}
	result, notModified, err := s.fetcher.Fetch(ctx, feed.URL, feed.Etag, feed.LastModified)
	if err != nil {
		return 0, err
	}
	if notModified {
		_, _ = s.db.ExecContext(ctx, `UPDATE feeds SET last_checked_at=? WHERE id=?`, time.Now(), feedID)
		return 0, nil
	}

	// Get user's retention setting
	retentionDays := s.GetRetentionDays(ctx, userID)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `UPDATE feeds SET title=?, site_url=?, etag=?, last_modified=?, last_checked_at=? WHERE id=?`,
		result.Title, result.SiteURL, result.Etag, result.LastModified, time.Now(), feedID); err != nil {
		return 0, err
	}

	if err := s.saveItems(ctx, tx, userID, feedID, feed.URL, result.Items); err != nil {
		return 0, err
	}

	// Cleanup old items based on retention setting (excluding bookmarked)
	if err := s.pruneOldItems(ctx, tx, userID, feedID, retentionDays); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return len(result.Items), nil
}

func (s *FeedService) RefreshFolder(ctx context.Context, userID, folderID int64) error {
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM feeds WHERE user_id=? AND folder_id=?`, userID, folderID)
	if err != nil {
		return err
	}
	var feedIDs []int64
	for rows.Next() {
		var feedID int64
		if err := rows.Scan(&feedID); err != nil {
			rows.Close()
			return err
		}
		feedIDs = append(feedIDs, feedID)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	if err := rows.Close(); err != nil {
		return err
	}
	// Refresh all feeds in folder, continuing even if some fail
	for _, feedID := range feedIDs {
		_, _ = s.RefreshFeed(ctx, userID, feedID)
	}
	return nil
}

func (s *FeedService) RefreshAll(ctx context.Context, userID int64) error {
	rows, err := s.db.QueryContext(ctx, `SELECT id FROM feeds WHERE user_id=?`, userID)
	if err != nil {
		return err
	}
	var feedIDs []int64
	for rows.Next() {
		var feedID int64
		if err := rows.Scan(&feedID); err != nil {
			rows.Close()
			return err
		}
		feedIDs = append(feedIDs, feedID)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	if err := rows.Close(); err != nil {
		return err
	}

	// Refresh all feeds, continuing even if some fail
	for _, feedID := range feedIDs {
		// Continue even if individual feeds fail - don't let one bad feed block others
		_, _ = s.RefreshFeed(ctx, userID, feedID)
	}
	return nil
}

func (s *FeedService) ListItems(ctx context.Context, userID int64, folderID, feedID *int64, unreadOnly bool, limit int, cursor *ItemCursor, sort string) ([]models.Item, *ItemCursor, error) {
	if limit <= 0 {
		limit = defaultPageSize
	}
	args := []interface{}{userID}
	clauses := []string{"items.user_id=?"}
	if folderID != nil {
		clauses = append(clauses, "feeds.folder_id=?")
		args = append(args, *folderID)
	}
	if feedID != nil {
		clauses = append(clauses, "items.feed_id=?")
		args = append(args, *feedID)
	}
	if unreadOnly {
		clauses = append(clauses, "IFNULL(item_state.is_read,0)=0")
	}
	sortPref := normalizeItemSort(sort)
	orderExpr := "CAST(COALESCE(strftime('%s', items.published_at), strftime('%s', items.created_at)) AS INTEGER)"
	orderDir := "DESC"
	cursorOp := "<"
	if sortPref == SortOldest {
		orderDir = "ASC"
		cursorOp = ">"
	}
	if cursor != nil {
		clauses = append(clauses, fmt.Sprintf("(%s %s ? OR (%s = ? AND items.id %s ?))", orderExpr, cursorOp, orderExpr, cursorOp))
		args = append(args, cursor.Timestamp, cursor.Timestamp, cursor.ID)
	}

	query := fmt.Sprintf(`
		SELECT items.id, items.feed_id, items.guid, items.link, items.title, items.author, items.published_at, items.summary_text,
			   items.content_html, items.media_json, items.created_at,
			   IFNULL(item_state.is_read,0), IFNULL(item_state.is_bookmarked,0), item_state.bookmarked_at,
			   feeds.title, feeds.site_url
		FROM items
		LEFT JOIN item_state ON item_state.item_id = items.id
		JOIN feeds ON feeds.id = items.feed_id
		WHERE %s
		ORDER BY %s %s, items.id %s
		LIMIT ?`, strings.Join(clauses, " AND "), orderExpr, orderDir, orderDir)
	args = append(args, limit+1)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var items []models.Item
	for rows.Next() {
		var (
			it                 models.Item
			published          sql.NullTime
			bookmarkedAt       sql.NullTime
			stateRead, stateBm bool
			sourceTitle        sql.NullString
			sourceSite         sql.NullString
		)
		if err := rows.Scan(&it.ID, &it.FeedID, &it.GUID, &it.Link, &it.Title, &it.Author, &published,
			&it.SummaryText, &it.ContentHTML, &it.MediaJSON, &it.CreatedAt,
			&stateRead, &stateBm, &bookmarkedAt,
			&sourceTitle, &sourceSite); err != nil {
			return nil, nil, err
		}
		it.UserID = userID
		if published.Valid {
			it.PublishedAt = &published.Time
		}
		it.State = models.ItemState{
			ItemID:       it.ID,
			UserID:       userID,
			IsRead:       stateRead,
			IsBookmarked: stateBm,
		}
		if bookmarkedAt.Valid {
			it.State.BookmarkedAt = &bookmarkedAt.Time
		}
		if sourceTitle.Valid || sourceSite.Valid {
			it.Source = &models.Feed{ID: it.FeedID, Title: sourceTitle.String, SiteURL: sourceSite.String}
		}
		items = append(items, it)
	}

	var nextCursor *ItemCursor
	if len(items) > limit {
		items = items[:limit]
		last := items[len(items)-1]
		nextCursor = &ItemCursor{Timestamp: itemSortTimestamp(last), ID: last.ID}
	}
	return items, nextCursor, nil
}

func (s *FeedService) GetItem(ctx context.Context, userID, itemID int64) (models.Item, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT items.id, items.feed_id, items.guid, items.link, items.title, items.author, items.published_at, items.summary_text,
			   items.content_html, items.media_json, items.created_at,
			   IFNULL(item_state.is_read,0), IFNULL(item_state.is_bookmarked,0), item_state.bookmarked_at,
			   feeds.title, feeds.site_url
		FROM items
		LEFT JOIN item_state ON item_state.item_id = items.id
		JOIN feeds ON feeds.id = items.feed_id
		WHERE items.user_id=? AND items.id=?`, userID, itemID)
	var it models.Item
	var published sql.NullTime
	var bookmarkedAt sql.NullTime
	var stateRead, stateBm bool
	var sourceTitle sql.NullString
	var sourceSite sql.NullString
	if err := row.Scan(&it.ID, &it.FeedID, &it.GUID, &it.Link, &it.Title, &it.Author, &published,
		&it.SummaryText, &it.ContentHTML, &it.MediaJSON, &it.CreatedAt,
		&stateRead, &stateBm, &bookmarkedAt, &sourceTitle, &sourceSite); err != nil {
		return models.Item{}, err
	}
	it.UserID = userID
	if published.Valid {
		it.PublishedAt = &published.Time
	}
	it.State = models.ItemState{ItemID: it.ID, UserID: userID, IsRead: stateRead, IsBookmarked: stateBm}
	if bookmarkedAt.Valid {
		it.State.BookmarkedAt = &bookmarkedAt.Time
	}
	if sourceTitle.Valid || sourceSite.Valid {
		it.Source = &models.Feed{ID: it.FeedID, Title: sourceTitle.String, SiteURL: sourceSite.String}
	}
	return it, nil
}

func (s *FeedService) MarkRead(ctx context.Context, userID, itemID int64, read bool) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO item_state(item_id, user_id, is_read) VALUES(?, ?, ?)
		ON CONFLICT(item_id) DO UPDATE SET is_read=excluded.is_read`, itemID, userID, boolToInt(read))
	return err
}

func (s *FeedService) Bookmark(ctx context.Context, userID, itemID int64, bookmarked bool) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO item_state(item_id, user_id, is_bookmarked, bookmarked_at) VALUES(?, ?, ?, CASE WHEN ?=1 THEN CURRENT_TIMESTAMP ELSE NULL END)
		ON CONFLICT(item_id) DO UPDATE SET is_bookmarked=excluded.is_bookmarked,
		bookmarked_at=CASE WHEN excluded.is_bookmarked=1 THEN CURRENT_TIMESTAMP ELSE NULL END`,
		itemID, userID, boolToInt(bookmarked), boolToInt(bookmarked))
	return err
}

func (s *FeedService) ListBookmarks(ctx context.Context, userID int64, limit int, cursor *ItemCursor, sort string) ([]models.Item, *ItemCursor, error) {
	if limit <= 0 {
		limit = defaultPageSize
	}
	clauses := []string{"items.user_id=?", "IFNULL(item_state.is_bookmarked,0)=1"}
	args := []interface{}{userID}
	sortPref := normalizeItemSort(sort)
	orderExpr := "CAST(COALESCE(strftime('%s', items.published_at), strftime('%s', items.created_at)) AS INTEGER)"
	orderDir := "DESC"
	cursorOp := "<"
	if sortPref == SortOldest {
		orderDir = "ASC"
		cursorOp = ">"
	}
	if cursor != nil {
		clauses = append(clauses, fmt.Sprintf("(%s %s ? OR (%s = ? AND items.id %s ?))", orderExpr, cursorOp, orderExpr, cursorOp))
		args = append(args, cursor.Timestamp, cursor.Timestamp, cursor.ID)
	}
	query := fmt.Sprintf(`
		SELECT items.id, items.feed_id, items.guid, items.link, items.title, items.author, items.published_at, items.summary_text,
			   items.content_html, items.media_json, items.created_at,
			   IFNULL(item_state.is_read,0), IFNULL(item_state.is_bookmarked,0), item_state.bookmarked_at,
			   feeds.title, feeds.site_url
		FROM items
		LEFT JOIN item_state ON item_state.item_id = items.id
		JOIN feeds ON feeds.id = items.feed_id
		WHERE %s
		ORDER BY %s %s, items.id %s
		LIMIT ?`, strings.Join(clauses, " AND "), orderExpr, orderDir, orderDir)
	args = append(args, limit+1)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var items []models.Item
	for rows.Next() {
		var it models.Item
		var published sql.NullTime
		var bookmarkedAt sql.NullTime
		var stateRead, stateBm bool
		var sourceTitle sql.NullString
		var sourceSite sql.NullString
		if err := rows.Scan(&it.ID, &it.FeedID, &it.GUID, &it.Link, &it.Title, &it.Author, &published,
			&it.SummaryText, &it.ContentHTML, &it.MediaJSON, &it.CreatedAt,
			&stateRead, &stateBm, &bookmarkedAt,
			&sourceTitle, &sourceSite); err != nil {
			return nil, nil, err
		}
		it.UserID = userID
		if published.Valid {
			it.PublishedAt = &published.Time
		}
		it.State = models.ItemState{ItemID: it.ID, UserID: userID, IsRead: stateRead, IsBookmarked: stateBm}
		if bookmarkedAt.Valid {
			it.State.BookmarkedAt = &bookmarkedAt.Time
		}
		if sourceTitle.Valid || sourceSite.Valid {
			it.Source = &models.Feed{ID: it.FeedID, Title: sourceTitle.String, SiteURL: sourceSite.String}
		}
		items = append(items, it)
	}
	var nextCursor *ItemCursor
	if len(items) > limit {
		items = items[:limit]
		last := items[len(items)-1]
		nextCursor = &ItemCursor{Timestamp: itemSortTimestamp(last), ID: last.ID}
	}
	return items, nextCursor, nil
}

func (s *FeedService) saveItems(ctx context.Context, tx *sql.Tx, userID, feedID int64, baseURL string, entries []*gofeed.Item) error {
	for _, entry := range entries {
		guid := feeds.NormalizeGUID(entry)
		var published sql.NullTime
		if entry.PublishedParsed != nil {
			published = sql.NullTime{Time: *entry.PublishedParsed, Valid: true}
		}
		author := ""
		if entry.Author != nil {
			author = entry.Author.Name
		}
		content := entry.Content
		if content == "" {
			content = readExtensionText(entry.Extensions, "content", "encoded")
		}
		if content == "" {
			content = entry.Description
		}
		content = normalizeContent(content, entry.Link)
		summaryText := entry.Description
		if summaryText == "" && entry.ITunesExt != nil {
			summaryText = entry.ITunesExt.Summary
		}
		if summaryText == "" && entry.ITunesExt != nil {
			summaryText = entry.ITunesExt.Subtitle
		}

		mediaBaseURL := entry.Link
		if mediaBaseURL == "" {
			mediaBaseURL = baseURL
		}
		media := collectMedia(entry, mediaBaseURL)
		mediaJSON, _ := json.Marshal(media)

		_, err := tx.ExecContext(ctx, `
			INSERT INTO items(user_id, feed_id, guid, link, title, author, published_at, summary_text, content_html, media_json)
			VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(user_id, feed_id, guid) DO UPDATE SET
				media_json = CASE
					WHEN excluded.media_json IS NOT NULL
						AND excluded.media_json != ''
						AND excluded.media_json != '[]'
						THEN excluded.media_json
					ELSE media_json
				END,
				content_html = CASE
					WHEN content_html IS NULL OR content_html = '' THEN excluded.content_html
					ELSE content_html
				END,
				summary_text = CASE
					WHEN summary_text IS NULL OR summary_text = '' THEN excluded.summary_text
					ELSE summary_text
				END`,
			userID, feedID, guid, entry.Link, entry.Title, author, published, summaryText, content, string(mediaJSON))
		if err != nil {
			return err
		}
		_, _ = tx.ExecContext(ctx, `
			INSERT OR IGNORE INTO item_state(item_id, user_id, is_read, is_bookmarked) 
			SELECT id, ?, 0, 0 FROM items WHERE guid=? AND feed_id=?`, userID, guid, feedID)
	}
	return nil
}

// pruneOldItems removes items older than the specified retention period.
// Bookmarked items are never deleted regardless of age.
func (s *FeedService) pruneOldItems(ctx context.Context, tx *sql.Tx, userID, feedID int64, retentionDays int) error {
	if retentionDays <= 0 {
		retentionDays = defaultRetentionDays
	}
	// Calculate cutoff date
	cutoffDate := time.Now().AddDate(0, 0, -retentionDays)

	// Delete items that are:
	// 1. Older than cutoff date (based on published_at or created_at)
	// 2. NOT bookmarked
	_, err := tx.ExecContext(ctx, `
		DELETE FROM items 
		WHERE id IN (
			SELECT items.id FROM items
			LEFT JOIN item_state ON item_state.item_id = items.id
			WHERE items.feed_id = ? AND items.user_id = ?
			  AND IFNULL(item_state.is_bookmarked, 0) = 0
			  AND COALESCE(items.published_at, items.created_at) < ?
		)`, feedID, userID, cutoffDate)
	return err
}

func collectMedia(entry *gofeed.Item, baseURL string) []models.Media {
	var media []models.Media
	appendMedia := func(url, length, mediaType string) {
		url = strings.TrimSpace(url)
		if url == "" {
			return
		}
		if baseURL != "" {
			url = feeds.ResolveRelative(baseURL, url)
		}
		media = append(media, models.Media{
			URL:    url,
			Length: length,
			Type:   mediaType,
		})
	}

	for _, enc := range entry.Enclosures {
		if enc == nil {
			continue
		}
		appendMedia(enc.URL, enc.Length, enc.Type)
	}

	if entry.Image != nil && entry.Image.URL != "" {
		appendMedia(entry.Image.URL, "", "image/*")
	}
	if entry.ITunesExt != nil && entry.ITunesExt.Image != "" {
		appendMedia(entry.ITunesExt.Image, "", "image/*")
	}

	appendMediaFromExtensions(&media, entry.Extensions, baseURL)

	// If no media found yet, try to extract images from HTML content
	if len(media) == 0 {
		htmlContent := entry.Content
		if htmlContent == "" {
			htmlContent = entry.Description
		}
		if imgURL := extractFirstImage(htmlContent, baseURL); imgURL != "" {
			appendMedia(imgURL, "", "image/*")
		}
	}

	return dedupeMedia(media)
}

func appendMediaFromExtensions(media *[]models.Media, extensions ext.Extensions, baseURL string) {
	mediaExt, ok := extensions["media"]
	if !ok {
		return
	}
	for name, list := range mediaExt {
		for _, extension := range list {
			hint := extension.Name
			if hint == "" {
				hint = name
			}
			appendMediaFromExtension(media, extension, baseURL, hint)
		}
	}
}

func appendMediaFromExtension(media *[]models.Media, extension ext.Extension, baseURL, hint string) {
	hint = strings.ToLower(strings.TrimSpace(hint))
	url := firstAttr(extension.Attrs, "url", "href", "src")
	if url == "" {
		value := strings.TrimSpace(extension.Value)
		if strings.HasPrefix(strings.ToLower(value), "http") {
			url = value
		}
	}
	if url != "" {
		mediaType := strings.TrimSpace(extension.Attrs["type"])
		if mediaType == "" {
			medium := strings.ToLower(strings.TrimSpace(extension.Attrs["medium"]))
			if medium == "image" || strings.Contains(hint, "thumbnail") || strings.Contains(hint, "image") || looksLikeImageURL(url) {
				mediaType = "image/*"
			}
		}
		if baseURL != "" {
			url = feeds.ResolveRelative(baseURL, url)
		}
		*media = append(*media, models.Media{
			URL:    url,
			Length: extension.Attrs["length"],
			Type:   mediaType,
		})
	}
	for name, children := range extension.Children {
		for _, child := range children {
			childHint := child.Name
			if childHint == "" {
				childHint = name
			}
			appendMediaFromExtension(media, child, baseURL, childHint)
		}
	}
}

func firstAttr(attrs map[string]string, keys ...string) string {
	for _, key := range keys {
		if val, ok := attrs[key]; ok && strings.TrimSpace(val) != "" {
			return val
		}
	}
	return ""
}

func looksLikeImageURL(raw string) bool {
	lower := strings.ToLower(raw)
	return strings.HasSuffix(lower, ".jpg") ||
		strings.HasSuffix(lower, ".jpeg") ||
		strings.HasSuffix(lower, ".png") ||
		strings.HasSuffix(lower, ".gif") ||
		strings.HasSuffix(lower, ".webp")
}

// extractFirstImage extracts the first valid image URL from HTML content
func extractFirstImage(html, baseURL string) string {
	if html == "" {
		return ""
	}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	var result string
	doc.Find("img[src]").EachWithBreak(func(_ int, s *goquery.Selection) bool {
		src := strings.TrimSpace(s.AttrOr("src", ""))
		if src == "" {
			return true
		}
		// Skip likely avatars, tracking pixels, icons
		lower := strings.ToLower(src)
		if strings.Contains(lower, "avatar") ||
			strings.Contains(lower, "author") ||
			strings.Contains(lower, "profile") ||
			strings.Contains(lower, "logo") ||
			strings.Contains(lower, "icon") ||
			strings.Contains(lower, "1x1") ||
			strings.Contains(lower, "pixel") ||
			strings.Contains(lower, "spacer") ||
			strings.Contains(lower, "tracking") ||
			strings.Contains(lower, "feedburner") {
			return true
		}
		if baseURL != "" {
			src = feeds.ResolveRelative(baseURL, src)
		}
		result = src
		return false // found, stop
	})
	return result
}

func dedupeMedia(media []models.Media) []models.Media {
	seen := make(map[string]bool, len(media))
	var out []models.Media
	for _, item := range media {
		key := strings.TrimSpace(item.URL)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, item)
	}
	return out
}

func readExtensionText(extensions ext.Extensions, namespace, name string) string {
	ns, ok := extensions[namespace]
	if !ok {
		return ""
	}
	list, ok := ns[name]
	if !ok {
		return ""
	}
	for _, extension := range list {
		if value := extensionValue(extension); value != "" {
			return value
		}
	}
	return ""
}

func extensionValue(extension ext.Extension) string {
	value := strings.TrimSpace(extension.Value)
	if value != "" {
		return value
	}
	for _, children := range extension.Children {
		for _, child := range children {
			if childValue := extensionValue(child); childValue != "" {
				return childValue
			}
		}
	}
	return ""
}

func normalizeContent(html, baseURL string) string {
	if html == "" || baseURL == "" {
		return html
	}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return html
	}
	doc.Find("a[href]").Each(func(_ int, sel *goquery.Selection) {
		href, _ := sel.Attr("href")
		sel.SetAttr("href", feeds.ResolveRelative(baseURL, href))
	})
	doc.Find("img[src]").Each(func(_ int, sel *goquery.Selection) {
		src, _ := sel.Attr("src")
		sel.SetAttr("src", feeds.ResolveRelative(baseURL, src))
	})
	out, err := doc.Html()
	if err != nil {
		return html
	}
	return out
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func ptrTime(t time.Time) *time.Time { return &t }
