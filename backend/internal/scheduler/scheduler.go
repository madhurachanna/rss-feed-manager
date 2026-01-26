package scheduler

import (
	"context"
	"log"
	"time"

	"rss-feed-manager/backend/internal/services"
)

type Config struct {
	UserID         int64
	PollInterval   time.Duration
	DigestEnabled  bool
	DigestInterval time.Duration
}

type Scheduler struct {
	feedService   *services.FeedService
	digestService *services.DigestService
	cfg           Config
	stopCh        chan struct{}
}

func NewScheduler(feedService *services.FeedService, digestService *services.DigestService, cfg Config) *Scheduler {
	return &Scheduler{
		feedService:   feedService,
		digestService: digestService,
		cfg:           cfg,
		stopCh:        make(chan struct{}),
	}
}

func (s *Scheduler) Start() {
	go s.pollFeeds()
	if s.cfg.DigestEnabled {
		go s.sendDigests()
	}
}

func (s *Scheduler) Stop() {
	close(s.stopCh)
}

func (s *Scheduler) pollFeeds() {
	ticker := time.NewTicker(s.cfg.PollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			if err := s.feedService.RefreshAll(ctx, s.cfg.UserID); err != nil {
				log.Printf("background refresh error: %v", err)
			}
			cancel()
		}
	}
}

func (s *Scheduler) sendDigests() {
	ticker := time.NewTicker(s.cfg.DigestInterval)
	defer ticker.Stop()
	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			if err := s.digestService.SendDigest(ctx, s.cfg.UserID, s.cfg.DigestInterval); err != nil {
				log.Printf("digest error: %v", err)
			}
			cancel()
		}
	}
}
