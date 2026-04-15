package session

import (
	"sync"
	"time"
	"ytb-go/internal/model"
)

type Session struct {
	ID           string           `json:"id"`
	Events       []model.Event    `json:"events"`
	LastActivity time.Time        `json:"last_activity"`
	mu           sync.RWMutex
}

func NewSession(id string) *Session {
	return &Session{
		ID:           id,
		Events:       make([]model.Event, 0),
		LastActivity: time.Now(),
	}
}

func (s *Session) AddEvent(event model.Event) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.Events = append(s.Events, event)
	if len(s.Events) > 50 {
		s.Events = s.Events[1:]
	}
	s.LastActivity = time.Now()
}

func (s *Session) GetEvents() []model.Event {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.Events
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
