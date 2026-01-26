package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"time"

	"github.com/joho/godotenv"

	"rss-feed-manager/backend/internal/db"
	"rss-feed-manager/backend/internal/feeds"
	"rss-feed-manager/backend/internal/handlers"
	"rss-feed-manager/backend/internal/mailer"
	"rss-feed-manager/backend/internal/reader"
	"rss-feed-manager/backend/internal/scheduler"
	"rss-feed-manager/backend/internal/services"
)

const demoUserID int64 = 1

func main() {
	_ = godotenv.Load()

	port := getEnv("PORT", "8080")
	dbPath := getEnv("DB_PATH", "./data/rss.db")
	pollInterval := parseDuration(getEnv("POLL_INTERVAL", "1h"), time.Hour)
	digestInterval := parseDuration(getEnv("DIGEST_INTERVAL", "6h"), 6*time.Hour)
	digestEnabled := os.Getenv("DIGEST_ENABLED") == "true"

	sqlDB, err := db.Connect(dbPath)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer sqlDB.Close()

	if err := db.Migrate(sqlDB); err != nil {
		log.Fatalf("db migrate: %v", err)
	}
	if err := db.SeedDemoUser(sqlDB, demoUserID, "demo@example.com"); err != nil {
		log.Fatalf("seed user: %v", err)
	}
	if err := db.SeedStarterPack(sqlDB, demoUserID); err != nil {
		log.Fatalf("seed starter pack: %v", err)
	}

	feedFetcher := feeds.NewFetcher(getEnv("READER_USER_AGENT", "RSSFeedManager/0.1"))
	appMailer := mailer.FromEnv()
	readerClient := reader.NewClient(getEnv("READER_USER_AGENT", "RSSFeedManager/0.1"))

	feedService := services.NewFeedService(sqlDB, feedFetcher)
	digestService := services.NewDigestService(sqlDB, appMailer)
	topNewsService := services.NewTopNewsService(sqlDB)
	summaryService := services.NewSummaryService()
	authService := services.NewAuthService(sqlDB, appMailer)

	sched := scheduler.NewScheduler(feedService, digestService, scheduler.Config{
		UserID:         demoUserID,
		PollInterval:   pollInterval,
		DigestEnabled:  digestEnabled,
		DigestInterval: digestInterval,
	})
	sched.Start()
	defer sched.Stop()

	router := handlers.NewRouter(handlers.Config{
		UserID:              demoUserID,
		FeedService:         feedService,
		DigestService:       digestService,
		TopNewsService:      topNewsService,
		SummaryService:      summaryService,
		AuthService:         authService,
		Reader:              readerClient,
		FrontendOrigin:      getEnv("FRONTEND_ORIGIN", "http://localhost:5173"),
		ReaderRatePerMinute: parseInt(getEnv("READER_RATE_PER_MINUTE", "20"), 20),
	})

	server := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	go func() {
		log.Printf("backend listening on http://localhost:%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop
	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func parseDuration(raw string, fallback time.Duration) time.Duration {
	d, err := time.ParseDuration(raw)
	if err != nil {
		return fallback
	}
	return d
}

func parseInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return v
}
