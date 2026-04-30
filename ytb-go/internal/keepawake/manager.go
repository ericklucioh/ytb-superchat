package keepawake

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	DefaultPingInterval   = 7 * time.Minute
	DefaultActiveWindow   = 12 * time.Hour
	defaultRequestTimeout = 10 * time.Second
)

type Config struct {
	Client       *http.Client
	PingInterval time.Duration
	ActiveWindow time.Duration
}

type Status struct {
	Active bool
	Until  time.Time
}

type Manager struct {
	mu sync.Mutex

	keepAwakeUntil  time.Time
	keepAwakeTicker *time.Ticker
	keepAwakeTimer  *time.Timer
	keepAwakeStopCh chan struct{}
	publicBaseURL   string

	client       *http.Client
	pingInterval time.Duration
	activeWindow time.Duration
}

func NewManager(config Config) *Manager {
	client := config.Client
	if client == nil {
		client = &http.Client{Timeout: defaultRequestTimeout}
	}

	pingInterval := config.PingInterval
	if pingInterval <= 0 {
		pingInterval = DefaultPingInterval
	}

	activeWindow := config.ActiveWindow
	if activeWindow <= 0 {
		activeWindow = DefaultActiveWindow
	}

	return &Manager{
		client:       client,
		pingInterval: pingInterval,
		activeWindow: activeWindow,
	}
}

func (m *Manager) Start(baseURL string) Status {
	now := time.Now()
	until := now.Add(m.activeWindow)

	m.mu.Lock()
	wasActive := m.isRunningLocked(now)
	if normalized := normalizeBaseURL(baseURL); normalized != "" {
		m.publicBaseURL = normalized
	}
	m.keepAwakeUntil = until
	m.resetExpiryTimerLocked()
	if m.keepAwakeTicker == nil {
		m.startLoopLocked()
	}
	status := m.statusLocked(now)
	m.mu.Unlock()

	if wasActive {
		log.Printf("[go:keep-awake] renewed until=%s", until.Format(time.RFC3339))
	} else {
		log.Printf("[go:keep-awake] started until=%s", until.Format(time.RFC3339))
	}

	return status
}

func (m *Manager) Status() Status {
	now := time.Now()

	m.mu.Lock()
	status := m.statusLocked(now)
	m.mu.Unlock()

	return status
}

func (m *Manager) startLoopLocked() {
	m.keepAwakeStopCh = make(chan struct{})
	m.keepAwakeTicker = time.NewTicker(m.pingInterval)
	go m.runLoop(m.keepAwakeTicker, m.keepAwakeTimer, m.keepAwakeStopCh)
}

func (m *Manager) resetExpiryTimerLocked() {
	if m.keepAwakeTimer == nil {
		m.keepAwakeTimer = time.NewTimer(time.Until(m.keepAwakeUntil))
		return
	}

	if !m.keepAwakeTimer.Stop() {
		select {
		case <-m.keepAwakeTimer.C:
		default:
		}
	}

	m.keepAwakeTimer.Reset(time.Until(m.keepAwakeUntil))
}

func (m *Manager) runLoop(ticker *time.Ticker, timer *time.Timer, stopCh <-chan struct{}) {
	for {
		select {
		case <-ticker.C:
			if m.shouldStopNow() {
				m.expireIfDue()
				return
			}

			m.pingHealth()
		case <-timer.C:
			m.expireIfDue()
			return
		case <-stopCh:
			return
		}
	}
}

func (m *Manager) shouldStopNow() bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	return !m.isRunningLocked(time.Now())
}

func (m *Manager) pingHealth() {
	baseURL, ok := m.baseURL()
	if !ok {
		log.Printf("[go:keep-awake] ping failed: missing public backend url")
		return
	}

	endpoint := strings.TrimRight(baseURL, "/") + "/health"
	log.Printf("[go:keep-awake] pinging %s", endpoint)

	resp, err := m.client.Get(endpoint)
	if err != nil {
		log.Printf("[go:keep-awake] ping failed: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		log.Printf("[go:keep-awake] ping failed status=%d endpoint=%s", resp.StatusCode, endpoint)
		return
	}

	log.Printf("[go:keep-awake] ping ok status=%d endpoint=%s", resp.StatusCode, endpoint)
}

func (m *Manager) expireIfDue() {
	now := time.Now()

	m.mu.Lock()
	if m.keepAwakeUntil.IsZero() || now.Before(m.keepAwakeUntil) {
		m.mu.Unlock()
		return
	}

	ticker := m.keepAwakeTicker
	timer := m.keepAwakeTimer
	stopCh := m.keepAwakeStopCh
	m.keepAwakeUntil = time.Time{}
	m.keepAwakeTicker = nil
	m.keepAwakeTimer = nil
	m.keepAwakeStopCh = nil
	m.mu.Unlock()

	if timer != nil {
		timer.Stop()
	}
	if ticker != nil {
		ticker.Stop()
	}
	if stopCh != nil {
		close(stopCh)
	}

	log.Printf("[go:keep-awake] ended")
}

func (m *Manager) statusLocked(now time.Time) Status {
	status := Status{}
	if !m.isRunningLocked(now) {
		return status
	}

	status.Active = true
	status.Until = m.keepAwakeUntil
	return status
}

func (m *Manager) isRunningLocked(now time.Time) bool {
	return !m.keepAwakeUntil.IsZero() && now.Before(m.keepAwakeUntil)
}

func (m *Manager) baseURL() (string, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.publicBaseURL == "" {
		return "", false
	}

	return m.publicBaseURL, true
}

func normalizeBaseURL(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	trimmed = strings.TrimRight(trimmed, "/")
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}

	if strings.HasPrefix(trimmed, "//") {
		return "https:" + trimmed
	}

	return "https://" + trimmed
}

func (m *Manager) String() string {
	status := m.Status()
	if !status.Active {
		return "keep-awake inactive"
	}

	return fmt.Sprintf("keep-awake active until %s", status.Until.Format(time.RFC3339))
}
