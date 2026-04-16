package session

import (
	"encoding/json"
	"sync"
	"time"
	"ytb-go/internal/model"
)

type Session struct {
	ID            string          `json:"id"`
	Events        []model.Event   `json:"events,omitempty"`
	LastOverlay   json.RawMessage `json:"overlay,omitempty"`
	LastOverlayAt time.Time       `json:"last_overlay_at,omitempty"`
	LastActivity  time.Time       `json:"last_activity"`
	mu            sync.RWMutex
}

func NewSession(id string) *Session {
	return &Session{
		ID:           id,
		Events:       make([]model.Event, 0),
		LastActivity: time.Now().UTC(),
	}
}

func (s *Session) AddEvent(event model.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.Events = append(s.Events, event)
	if len(s.Events) > 50 {
		s.Events = s.Events[1:]
	}
	s.touchLocked()
}

func (s *Session) GetEvents() []model.Event {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events := make([]model.Event, len(s.Events))
	copy(events, s.Events)
	return events
}

func (s *Session) SetOverlay(packet []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(packet) == 0 {
		s.LastOverlay = nil
		s.LastOverlayAt = time.Time{}
		s.touchLocked()
		return
	}

	s.LastOverlay = append(json.RawMessage(nil), packet...)
	s.LastOverlayAt = time.Now().UTC()
	s.touchLocked()
}

func (s *Session) GetOverlay() []byte {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if len(s.LastOverlay) == 0 {
		return nil
	}

	return append([]byte(nil), s.LastOverlay...)
}

func (s *Session) OverlayInfo() (hasOverlay bool, updatedAt time.Time) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return len(s.LastOverlay) > 0, s.LastOverlayAt
}

func (s *Session) touchLocked() {
	s.LastActivity = time.Now().UTC()
}

type Manager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
	}
}

func (m *Manager) GetOrCreate(id string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()

	if s, ok := m.sessions[id]; ok {
		return s
	}

	s := NewSession(id)
	m.sessions[id] = s
	return s
}

func (m *Manager) Get(id string) (*Session, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	s, ok := m.sessions[id]
	return s, ok
}

func (m *Manager) List() []*Session {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*Session, 0, len(m.sessions))
	for _, s := range m.sessions {
		result = append(result, s)
	}
	return result
}
