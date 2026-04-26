package session

import (
	"testing"
	"time"

	"ytb-go/internal/model"
)

func TestSessionBoundedHistoryKeepsNewestEvents(t *testing.T) {
	sm := NewManager()
	s := sm.GetOrCreate("room-1")

	base := time.UnixMilli(1_700_000_000_000)
	for i := 0; i < maxSessionEvents+10; i++ {
		s.AddEvent(model.Event{
			Session:   "room-1",
			Type:      "message",
			User:      "user",
			Message:   "msg",
			Timestamp: base.Add(time.Duration(i) * time.Millisecond).UnixMilli(),
		})
	}

	events := s.GetEvents()
	if len(events) != maxSessionEvents {
		t.Fatalf("expected %d events, got %d", maxSessionEvents, len(events))
	}

	if events[0].Timestamp != base.Add(10*time.Millisecond).UnixMilli() {
		t.Fatalf("expected oldest retained event to be the newest boundary, got %d", events[0].Timestamp)
	}
	if events[len(events)-1].Timestamp != base.Add(time.Duration(maxSessionEvents+9)*time.Millisecond).UnixMilli() {
		t.Fatalf("expected newest event to be kept, got %d", events[len(events)-1].Timestamp)
	}
}
