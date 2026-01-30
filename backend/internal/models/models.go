package models

import "time"

type User struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

type Folder struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"userId"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	Feeds     []Feed    `json:"feeds,omitempty"`
}

type Feed struct {
	ID            int64      `json:"id"`
	UserID        int64      `json:"userId"`
	FolderID      int64      `json:"folderId"`
	URL           string     `json:"url"`
	Title         string     `json:"title"`
	SiteURL       string     `json:"siteUrl"`
	Etag          string     `json:"etag"`
	LastModified  string     `json:"lastModified"`
	LastCheckedAt *time.Time `json:"lastCheckedAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}

type Media struct {
	URL    string `json:"url"`
	Length string `json:"length"`
	Type   string `json:"type"`
}

type Item struct {
	ID          int64      `json:"id"`
	UserID      int64      `json:"userId"`
	FeedID      int64      `json:"feedId"`
	GUID        string     `json:"guid"`
	Link        string     `json:"link"`
	Title       string     `json:"title"`
	Author      string     `json:"author"`
	PublishedAt *time.Time `json:"publishedAt,omitempty"`
	SummaryText string     `json:"summaryText"`
	ContentHTML string     `json:"contentHtml"`
	MediaJSON   string     `json:"mediaJson"`
	CreatedAt   time.Time  `json:"createdAt"`
	State       ItemState  `json:"state"`
	Source      *Feed      `json:"source,omitempty"`
}

type ItemState struct {
	ItemID       int64      `json:"itemId"`
	UserID       int64      `json:"userId"`
	IsRead       bool       `json:"isRead"`
	IsBookmarked bool       `json:"isBookmarked"`
	BookmarkedAt *time.Time `json:"bookmarkedAt,omitempty"`
}

type ReaderResult struct {
	Title         string `json:"title"`
	Content       string `json:"contentHtml"`
	Byline        string `json:"byline,omitempty"`
	SiteName      string `json:"siteName,omitempty"`
	SourceURL     string `json:"sourceUrl,omitempty"`
	Excerpt       string `json:"excerpt,omitempty"`
	PublishedTime string `json:"publishedTime,omitempty"`
	WordCount     int    `json:"wordCount"`
	Fallback      bool   `json:"fallback"`
	Error         string `json:"error,omitempty"`
}

type SummaryResult struct {
	Points []string `json:"points"`
	Source string   `json:"source,omitempty"`
	Reason string   `json:"reason,omitempty"`
}
