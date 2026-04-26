package ws

import (
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"ytb-go/internal/session"
)

type RoomSnapshot struct {
	Session        string    `json:"session"`
	Clients        int       `json:"clients"`
	HasLastOverlay bool      `json:"has_last_overlay"`
	LastOverlayAt  time.Time `json:"last_overlay_at,omitempty"`
	DroppedPackets int64     `json:"dropped_packets,omitempty"`
}

type roomState struct {
	mu      sync.Mutex
	clients map[*Client]struct{}
}

type Hub struct {
	sessions *session.Manager
	mu       sync.RWMutex
	rooms    map[string]*roomState
}

func NewHub(sm *session.Manager) *Hub {
	if sm == nil {
		sm = session.NewManager()
	}

	return &Hub{
		sessions: sm,
		rooms:    make(map[string]*roomState),
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	log.Printf("[go:ws] upgrade remote=%s session=%q", r.RemoteAddr, cleanSession(r.URL.Query().Get("session")))
	conn, reader, writer, hijacked, err := upgradeWebSocket(w, r)
	if err != nil {
		if !hijacked {
			log.Printf("[go:ws] upgrade failed remote=%s err=%v", r.RemoteAddr, err)
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	client := newClient(h, conn, reader, writer)
	if initial := cleanSession(r.URL.Query().Get("session")); initial != "" {
		h.join(client, initial)
	}
	client.serve()
}

func (h *Hub) Publish(room string, packet []byte, clear bool) {
	room = cleanSession(room)
	if room == "" {
		return
	}

	log.Printf("[go:ws] publish room=%q clear=%t bytes=%d", room, clear, len(packet))
	if clear {
		h.sessions.GetOrCreate(room).SetOverlay(nil)
	} else {
		h.sessions.GetOrCreate(room).SetOverlay(packet)
	}

	h.mu.RLock()
	state := h.rooms[room]
	h.mu.RUnlock()
	if state == nil {
		return
	}

	state.mu.Lock()
	defer state.mu.Unlock()

	for client := range state.clients {
		client.enqueue(packet)
	}
}

func (h *Hub) Snapshot(room string) RoomSnapshot {
	room = cleanSession(room)
	snapshot := RoomSnapshot{Session: room}

	h.mu.RLock()
	state := h.rooms[room]
	h.mu.RUnlock()
	if state != nil {
		state.mu.Lock()
		snapshot.Clients = len(state.clients)
		for client := range state.clients {
			snapshot.DroppedPackets += client.droppedPackets()
		}
		state.mu.Unlock()
	}

	if sessionState, ok := h.sessions.Get(room); ok {
		snapshot.HasLastOverlay, snapshot.LastOverlayAt = sessionState.OverlayInfo()
	}

	return snapshot
}

func (h *Hub) join(client *Client, room string) {
	room = cleanSession(room)
	if room == "" || client == nil {
		return
	}

	h.leave(client)

	state := h.ensureRoom(room)
	state.mu.Lock()
	state.clients[client] = struct{}{}
	clients := len(state.clients)
	state.mu.Unlock()

	client.setRoom(room)
	log.Printf("[go:ws] join room=%q clients=%d", room, clients)

	if overlay := h.sessions.GetOrCreate(room).GetOverlay(); len(overlay) > 0 {
		log.Printf("[go:ws] rehydrate room=%q bytes=%d", room, len(overlay))
		client.enqueue(overlay)
	}
}

func (h *Hub) leave(client *Client) {
	if client == nil {
		return
	}

	room := client.currentRoom()
	if room == "" {
		return
	}

	h.mu.RLock()
	state := h.rooms[room]
	h.mu.RUnlock()
	if state == nil {
		client.setRoom("")
		return
	}

	state.mu.Lock()
	delete(state.clients, client)
	empty := len(state.clients) == 0
	remaining := len(state.clients)
	state.mu.Unlock()

	client.setRoom("")

	if empty {
		h.mu.Lock()
		delete(h.rooms, room)
		h.mu.Unlock()
		log.Printf("[go:ws] leave room=%q emptied", room)
		return
	}

	log.Printf("[go:ws] leave room=%q remaining=%d", room, remaining)
}

func (h *Hub) ensureRoom(room string) *roomState {
	room = cleanSession(room)
	if room == "" {
		return nil
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	state, ok := h.rooms[room]
	if !ok {
		state = &roomState{clients: make(map[*Client]struct{})}
		h.rooms[room] = state
	}

	return state
}

func cleanSession(value string) string {
	return strings.Join(strings.Fields(value), "")
}
