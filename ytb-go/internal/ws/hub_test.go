package ws

import (
	"strings"
	"testing"

	"ytb-go/internal/session"
)

func TestHubRehydratesOverlayOnJoin(t *testing.T) {
	sm := session.NewManager()
	hub := NewHub(sm)
	client := newClient(hub, nil, nil, nil)
	client.send = make(chan []byte, 1)

	hub.Publish("room-1", []byte(`{"session":"room-1","chatname":"Ada","chatmessage":"Hello"}`), false)
	hub.join(client, "room-1")

	select {
	case payload := <-client.send:
		if !strings.Contains(string(payload), `"chatname":"Ada"`) || !strings.Contains(string(payload), `"chatmessage":"Hello"`) {
			t.Fatalf("expected rehydrated overlay payload, got: %s", string(payload))
		}
	default:
		t.Fatal("expected overlay payload to be rehydrated on join")
	}
}
