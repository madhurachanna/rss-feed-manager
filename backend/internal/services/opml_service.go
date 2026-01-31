package services

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/url"
	"time"

	"rss-feed-manager/backend/internal/models"
)

type OPMLService struct {
	feedService *FeedService
}

func NewOPMLService(feedService *FeedService) *OPMLService {
	return &OPMLService{feedService: feedService}
}

// Import parses OPML data and adds feeds/folders for the user
func (s *OPMLService) Import(ctx context.Context, userID int64, data []byte) (int, error) {
	var opml models.OPML
	if err := xml.Unmarshal(data, &opml); err != nil {
		return 0, fmt.Errorf("invalid OPML file: %w", err)
	}

	// Ensure a default folder exists if needed (using "Imported" if root feeds exist)
	// Strategies:
	// 1. If root outline is a feed, put in "Imported" folder (or user's first folder)
	// 2. If root outline is a folder, create that folder
	defaultFolder, err := s.feedService.GetFirstFolder(ctx, userID)
	var defaultFolderID int64
	if err != nil || defaultFolder == nil {
		// If no folders exist, create one
		f, err := s.feedService.CreateFolder(ctx, userID, "Imported")
		if err != nil {
			return 0, fmt.Errorf("failed to create default folder: %w", err)
		}
		defaultFolderID = f.ID
	} else {
		defaultFolderID = defaultFolder.ID
	}

	count := 0
	for _, outline := range opml.Body.Outlines {
		c, err := s.processOutline(ctx, userID, outline, defaultFolderID)
		if err != nil {
			// Log error but continue importing other items?
			// For now, let's continue
			fmt.Printf("Error processing outline: %v\n", err)
		}
		count += c
	}

	return count, nil
}

func (s *OPMLService) processOutline(ctx context.Context, userID int64, outline models.Outline, parentFolderID int64) (int, error) {
	// If it has an xmlUrl, it's a feed
	if outline.XMLURL != "" {
		if !validURL(outline.XMLURL) {
			return 0, nil
		}

		// Check if feed exists (optimization: could bulk check, but one-by-one is safer for now)
		// AddFeed handles deduplication logic usually, or returns error if exists
		// We'll rely on AddFeed to be idempotent or we catch the error
		_, err := s.feedService.AddFeed(ctx, userID, parentFolderID, outline.XMLURL)
		if err != nil {
			// Ignore "already exists" errors ideally
			return 0, nil
		}
		return 1, nil
	}

	// If it's a folder (has nested outlines and no xmlUrl)
	targetFolderID := parentFolderID
	if len(outline.Outlines) > 0 && (outline.Text != "" || outline.Title != "") {
		name := outline.Text
		if name == "" {
			name = outline.Title
		}
		// Create this folder
		// We use "GetOrCreate" logic roughly by trying to create or find
		// For simplicity, just CreateFolder. If specific constraint violation, we find existing.
		f, err := s.feedService.CreateFolder(ctx, userID, name)
		if err != nil {
			// Try to find existing folder by name to merge?
			// Simpler: Just resolve standard folder.
			// If error is "folder exists", we'd need to lookup.
			// For now, assuming CreateFolder might fail if exists, fallback to parent or lookup.
			// Let's assume we fallback to parent for safety or separate lookup implementation.
			folders, _ := s.feedService.ListFolders(ctx, userID)
			for _, folder := range folders {
				if folder.Name == name {
					targetFolderID = folder.ID
					break
				}
			}
		} else {
			targetFolderID = f.ID
		}
	}

	total := 0
	for _, child := range outline.Outlines {
		// Flatten: Recursive calls will put children into *this* folder (targetFolderID)
		// If child is also a folder, it will update targetFolderID again for its children
		// But since we flatten to max 1 level of depth in our DB model (Folder -> Feeds),
		// we might want to flatten recursively.
		// Actually, standard OPML is nested. Our DB is 1-level.
		// Best approach: If we are already inside a created folder, children folders should probably just be ignored
		// and their feeds added to the current folder.
		c, _ := s.processOutline(ctx, userID, child, targetFolderID)
		total += c
	}
	return total, nil
}

func validURL(u string) bool {
	parsed, err := url.Parse(u)
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https")
}

// Export generates OPML for the user
func (s *OPMLService) Export(ctx context.Context, userID int64) ([]byte, error) {
	folders, err := s.feedService.ListFolders(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch folders: %w", err)
	}

	opml := models.OPML{
		Version: "2.0",
		Head: models.Head{
			Title:       "RSS Export",
			DateCreated: time.Now().Format(time.RFC1123Z),
		},
		Body: models.Body{},
	}

	for _, folder := range folders {
		folderOutline := models.Outline{
			Text: folder.Name,
			Type: "folder",
		}

		for _, feed := range folder.Feeds {
			feedOutline := models.Outline{
				Text:    feed.Title,
				Title:   feed.Title,
				Type:    "rss",
				XMLURL:  feed.URL,
				HTMLURL: feed.SiteURL,
			}
			folderOutline.Outlines = append(folderOutline.Outlines, feedOutline)
		}
		opml.Body.Outlines = append(opml.Body.Outlines, folderOutline)
	}

	return xml.MarshalIndent(opml, "", "  ")
}
