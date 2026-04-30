package keepawake

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestManagerStartsRenewsAndExpires(t *testing.T) {
	var pingCount int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			t.Fatalf("unexpected ping path: %s", r.URL.Path)
		}
		atomic.AddInt32(&pingCount, 1)
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	manager := NewManager(Config{
		Client:       server.Client(),
		PingInterval: 20 * time.Millisecond,
		ActiveWindow: 80 * time.Millisecond,
	})

	firstStatus := manager.Start(server.URL)
	if !firstStatus.Active {
		t.Fatalf("expected keep-awake to start active")
	}

	firstTicker := manager.keepAwakeTicker
	if firstTicker == nil {
		t.Fatalf("expected ticker to be created")
	}

	secondStatus := manager.Start(server.URL)
	if !secondStatus.Active {
		t.Fatalf("expected keep-awake to stay active on renewal")
	}
	if manager.keepAwakeTicker != firstTicker {
		t.Fatalf("expected renewal to reuse the existing ticker")
	}

	waitForStatus(t, manager, func(status Status) bool {
		return !status.Active
	}, 500*time.Millisecond)
	waitForTickerClear(t, manager, 500*time.Millisecond)

	if got := atomic.LoadInt32(&pingCount); got == 0 {
		t.Fatalf("expected at least one internal ping")
	}
}

func TestManagerUsesConfiguredBaseURL(t *testing.T) {
	var observedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		observedPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)

	manager := NewManager(Config{
		Client:       server.Client(),
		PingInterval: 15 * time.Millisecond,
		ActiveWindow: 40 * time.Millisecond,
	})

	manager.Start(server.URL + "/")
	waitForPing(t, func() bool {
		return observedPath == "/health"
	}, 250*time.Millisecond)
}

func waitForStatus(t *testing.T, manager *Manager, predicate func(Status) bool, timeout time.Duration) {
	t.Helper()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if predicate(manager.Status()) {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}

	t.Fatalf("condition was not satisfied within %s", timeout)
}

func waitForPing(t *testing.T, predicate func() bool, timeout time.Duration) {
	t.Helper()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if predicate() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}

	t.Fatalf("condition was not satisfied within %s", timeout)
}

func waitForTickerClear(t *testing.T, manager *Manager, timeout time.Duration) {
	t.Helper()

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		manager.mu.Lock()
		tickerCleared := manager.keepAwakeTicker == nil
		manager.mu.Unlock()
		if tickerCleared {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}

	t.Fatalf("ticker was not cleared within %s", timeout)
}
