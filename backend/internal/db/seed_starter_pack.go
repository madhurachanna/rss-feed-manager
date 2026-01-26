package db

import (
	"context"
	"database/sql"
	"fmt"
)

type starterFeed struct {
	Title   string
	URL     string
	SiteURL string
}

type starterCategory struct {
	Name  string
	Feeds []starterFeed
}

var starterPack = []starterCategory{
	{
		Name: "Technology",
		Feeds: []starterFeed{
			{Title: "The Verge", URL: "https://www.theverge.com/rss/index.xml", SiteURL: "https://www.theverge.com"},
			{Title: "Ars Technica", URL: "http://feeds.arstechnica.com/arstechnica/index", SiteURL: "https://arstechnica.com"},
			{Title: "Wired", URL: "https://www.wired.com/feed/rss", SiteURL: "https://www.wired.com"},
			{Title: "TechCrunch", URL: "https://techcrunch.com/feed/", SiteURL: "https://techcrunch.com"},
			{Title: "The Next Web", URL: "https://thenextweb.com/feed/", SiteURL: "https://thenextweb.com"},
			{Title: "Engadget", URL: "https://www.engadget.com/rss.xml", SiteURL: "https://www.engadget.com"},
			{Title: "MIT Technology Review", URL: "https://www.technologyreview.com/feed/", SiteURL: "https://www.technologyreview.com"},
			{Title: "IEEE Spectrum", URL: "https://spectrum.ieee.org/rss/fulltext", SiteURL: "https://spectrum.ieee.org"},
			{Title: "Hacker News", URL: "https://hnrss.org/frontpage", SiteURL: "https://news.ycombinator.com"},
			{Title: "Android Police", URL: "https://www.androidpolice.com/feed/", SiteURL: "https://www.androidpolice.com"},
		},
	},
	{
		Name: "Business",
		Feeds: []starterFeed{
			{Title: "Reuters Business", URL: "https://feeds.reuters.com/reuters/businessNews", SiteURL: "https://www.reuters.com"},
			{Title: "CNBC Business", URL: "https://www.cnbc.com/id/10001147/device/rss/rss.html", SiteURL: "https://www.cnbc.com/business/"},
			{Title: "Financial Times", URL: "https://www.ft.com/?format=rss", SiteURL: "https://www.ft.com"},
			{Title: "WSJ Business", URL: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml", SiteURL: "https://www.wsj.com"},
			{Title: "MarketWatch Top Stories", URL: "https://feeds.marketwatch.com/marketwatch/topstories/", SiteURL: "https://www.marketwatch.com"},
			{Title: "Yahoo Finance", URL: "https://finance.yahoo.com/rss/", SiteURL: "https://finance.yahoo.com"},
			{Title: "Investopedia", URL: "https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_articles", SiteURL: "https://www.investopedia.com"},
			{Title: "Harvard Business Review", URL: "https://hbr.org/feed", SiteURL: "https://hbr.org"},
			{Title: "The Economist - Finance", URL: "https://www.economist.com/finance-and-economics/rss.xml", SiteURL: "https://www.economist.com"},
			{Title: "Business Insider", URL: "https://www.businessinsider.com/rss", SiteURL: "https://www.businessinsider.com"},
		},
	},
	{
		Name: "Science",
		Feeds: []starterFeed{
			{Title: "NASA Breaking News", URL: "https://www.nasa.gov/rss/dyn/breaking_news.rss", SiteURL: "https://www.nasa.gov"},
			{Title: "ScienceDaily", URL: "https://www.sciencedaily.com/rss/all.xml", SiteURL: "https://www.sciencedaily.com"},
			{Title: "Nature", URL: "https://www.nature.com/subjects/science/rss", SiteURL: "https://www.nature.com"},
			{Title: "Scientific American", URL: "https://www.scientificamerican.com/feed/rss/", SiteURL: "https://www.scientificamerican.com"},
			{Title: "New Scientist", URL: "https://www.newscientist.com/feed/home/", SiteURL: "https://www.newscientist.com"},
			{Title: "Phys.org", URL: "https://phys.org/rss-feed/", SiteURL: "https://phys.org"},
			{Title: "LiveScience", URL: "https://www.livescience.com/feeds/all", SiteURL: "https://www.livescience.com"},
			{Title: "Space.com", URL: "https://www.space.com/feeds/all", SiteURL: "https://www.space.com"},
			{Title: "Science Magazine", URL: "https://www.science.org/rss/news_current.xml", SiteURL: "https://www.science.org"},
			{Title: "PLOS ONE", URL: "https://journals.plos.org/plosone/feed/atom", SiteURL: "https://journals.plos.org/plosone/"},
		},
	},
	{
		Name: "World News",
		Feeds: []starterFeed{
			{Title: "BBC World", URL: "http://feeds.bbci.co.uk/news/world/rss.xml", SiteURL: "https://www.bbc.com"},
			{Title: "Reuters World", URL: "https://feeds.reuters.com/Reuters/worldNews", SiteURL: "https://www.reuters.com"},
			{Title: "The Guardian World", URL: "https://www.theguardian.com/world/rss", SiteURL: "https://www.theguardian.com/world"},
			{Title: "NYTimes World", URL: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", SiteURL: "https://www.nytimes.com"},
			{Title: "Al Jazeera", URL: "https://www.aljazeera.com/xml/rss/all.xml", SiteURL: "https://www.aljazeera.com"},
			{Title: "NPR World", URL: "https://feeds.npr.org/1004/rss.xml", SiteURL: "https://www.npr.org/sections/world/"},
			{Title: "CBC World", URL: "https://www.cbc.ca/cmlink/rss-world", SiteURL: "https://www.cbc.ca/news/world"},
			{Title: "DW World", URL: "https://rss.dw.com/rdf/rss-en-world", SiteURL: "https://www.dw.com/en/top-stories/world/s-1429"},
			{Title: "UN News", URL: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", SiteURL: "https://news.un.org"},
			{Title: "AP Top News", URL: "https://apnews.com/hub/ap-top-news?output=RSS", SiteURL: "https://apnews.com"},
		},
	},
	{
		Name: "Sports",
		Feeds: []starterFeed{
			{Title: "ESPN Top Headlines", URL: "https://www.espn.com/espn/rss/news", SiteURL: "https://www.espn.com"},
			{Title: "BBC Sport", URL: "http://feeds.bbci.co.uk/sport/rss.xml?edition=uk", SiteURL: "https://www.bbc.com/sport"},
			{Title: "Sky Sports", URL: "https://www.skysports.com/rss/12040", SiteURL: "https://www.skysports.com"},
			{Title: "NFL", URL: "https://www.nfl.com/rss/rsslanding?searchString=home", SiteURL: "https://www.nfl.com"},
			{Title: "NBA", URL: "https://www.nba.com/news/rss.xml", SiteURL: "https://www.nba.com"},
			{Title: "MLB", URL: "http://mlb.mlb.com/partnerxml/gen/news/rss/mlb.xml", SiteURL: "https://www.mlb.com"},
			{Title: "NHL", URL: "https://www.nhl.com/rss/news", SiteURL: "https://www.nhl.com"},
			{Title: "Formula 1", URL: "https://www.formula1.com/en/latest/all.xml", SiteURL: "https://www.formula1.com"},
			{Title: "Yahoo Sports", URL: "https://sports.yahoo.com/rss/", SiteURL: "https://sports.yahoo.com"},
			{Title: "CBS Sports", URL: "https://www.cbssports.com/rss/headlines/", SiteURL: "https://www.cbssports.com"},
		},
	},
	{
		Name: "Entertainment",
		Feeds: []starterFeed{
			{Title: "Variety", URL: "https://variety.com/feed/", SiteURL: "https://variety.com"},
			{Title: "Hollywood Reporter", URL: "https://www.hollywoodreporter.com/feed/", SiteURL: "https://www.hollywoodreporter.com"},
			{Title: "Rolling Stone", URL: "https://www.rollingstone.com/music/music-news/feed/", SiteURL: "https://www.rollingstone.com"},
			{Title: "Billboard", URL: "https://www.billboard.com/feed/", SiteURL: "https://www.billboard.com"},
			{Title: "Pitchfork", URL: "https://pitchfork.com/feed/feed-news/rss/", SiteURL: "https://pitchfork.com"},
			{Title: "IGN", URL: "https://feeds.ign.com/ign/all", SiteURL: "https://www.ign.com"},
			{Title: "Polygon", URL: "https://www.polygon.com/rss/index.xml", SiteURL: "https://www.polygon.com"},
			{Title: "Kotaku", URL: "https://kotaku.com/rss", SiteURL: "https://kotaku.com"},
			{Title: "AV Club", URL: "https://www.avclub.com/rss", SiteURL: "https://www.avclub.com"},
			{Title: "The Ringer", URL: "https://www.theringer.com/rss/index.xml", SiteURL: "https://www.theringer.com"},
		},
	},
}

// newUserStarterPack is a smaller set of feeds for new users (3 folders, 2 feeds each)
var newUserStarterPack = []starterCategory{
	{
		Name: "Technology",
		Feeds: []starterFeed{
			{Title: "The Verge", URL: "https://www.theverge.com/rss/index.xml", SiteURL: "https://www.theverge.com"},
			{Title: "Hacker News", URL: "https://hnrss.org/frontpage", SiteURL: "https://news.ycombinator.com"},
		},
	},
	{
		Name: "World News",
		Feeds: []starterFeed{
			{Title: "BBC World", URL: "http://feeds.bbci.co.uk/news/world/rss.xml", SiteURL: "https://www.bbc.com"},
			{Title: "Reuters World", URL: "https://feeds.reuters.com/Reuters/worldNews", SiteURL: "https://www.reuters.com"},
		},
	},
	{
		Name: "Science",
		Feeds: []starterFeed{
			{Title: "NASA Breaking News", URL: "https://www.nasa.gov/rss/dyn/breaking_news.rss", SiteURL: "https://www.nasa.gov"},
			{Title: "ScienceDaily", URL: "https://www.sciencedaily.com/rss/all.xml", SiteURL: "https://www.sciencedaily.com"},
		},
	},
}

// SeedNewUser seeds a new user with a small starter pack of 3 folders with 2 feeds each.
// This is called when a user first creates their account.
func SeedNewUser(db *sql.DB, userID int64) error {
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback()

	for _, category := range newUserStarterPack {
		res, err := tx.Exec(`INSERT INTO folders(user_id, name) VALUES(?, ?)`, userID, category.Name)
		if err != nil {
			return fmt.Errorf("insert folder %q: %w", category.Name, err)
		}
		folderID, err := res.LastInsertId()
		if err != nil {
			return fmt.Errorf("folder id %q: %w", category.Name, err)
		}
		for _, feed := range category.Feeds {
			if _, err := tx.Exec(
				`INSERT INTO feeds(user_id, folder_id, url, title, site_url) VALUES(?, ?, ?, ?, ?)`,
				userID,
				folderID,
				feed.URL,
				feed.Title,
				feed.SiteURL,
			); err != nil {
				return fmt.Errorf("insert feed %q: %w", feed.Title, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func SeedStarterPack(db *sql.DB, userID int64) error {
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM item_state WHERE user_id=?`, userID); err != nil {
		return fmt.Errorf("clear item_state: %w", err)
	}
	if _, err := tx.Exec(`DELETE FROM items WHERE user_id=?`, userID); err != nil {
		return fmt.Errorf("clear items: %w", err)
	}
	if _, err := tx.Exec(`DELETE FROM feeds WHERE user_id=?`, userID); err != nil {
		return fmt.Errorf("clear feeds: %w", err)
	}
	if _, err := tx.Exec(`DELETE FROM folders WHERE user_id=?`, userID); err != nil {
		return fmt.Errorf("clear folders: %w", err)
	}

	for _, category := range starterPack {
		res, err := tx.Exec(`INSERT INTO folders(user_id, name) VALUES(?, ?)`, userID, category.Name)
		if err != nil {
			return fmt.Errorf("insert folder %q: %w", category.Name, err)
		}
		folderID, err := res.LastInsertId()
		if err != nil {
			return fmt.Errorf("folder id %q: %w", category.Name, err)
		}
		for _, feed := range category.Feeds {
			if _, err := tx.Exec(
				`INSERT INTO feeds(user_id, folder_id, url, title, site_url) VALUES(?, ?, ?, ?, ?)`,
				userID,
				folderID,
				feed.URL,
				feed.Title,
				feed.SiteURL,
			); err != nil {
				return fmt.Errorf("insert feed %q: %w", feed.Title, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
