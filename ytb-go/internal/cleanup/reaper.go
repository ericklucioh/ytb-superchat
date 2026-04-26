package cleanup

import (
	"log"
	"time"

	"ytb-go/internal/session"
)

const (
	DefaultInterval = 5 * time.Minute
	DefaultMaxAge   = 24 * time.Hour
)

func StartCleaner(sm *session.Manager, interval, maxAge time.Duration) {
	if sm == nil || interval <= 0 || maxAge <= 0 {
		return
	}

	log.Printf("[go:cleanup] session reaper started interval=%s maxAge=%s", interval, maxAge)
	runReap := func() {
		removed := sm.RemoveInactive(maxAge)
		if removed > 0 {
			log.Printf("[go:cleanup] session reaper removed=%d", removed)
		}
	}

	runReap()

	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
		for range ticker.C {
			runReap()
		}
	}()
}
