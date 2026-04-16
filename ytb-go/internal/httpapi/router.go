package httpapi

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"ytb-go/internal/session"
	"ytb-go/internal/ws"
)

type sessionRequest struct {
	Session string `json:"session"`
	ID      string `json:"id"`
}

type eventRequest struct {
	Session  string          `json:"session"`
	Join     string          `json:"join"`
	Msg      bool            `json:"msg"`
	Contents json.RawMessage `json:"contents"`
}

func NewRouter(sm *session.Manager, hub *ws.Hub, overlayDir string) *http.ServeMux {
	mux := http.NewServeMux()

	if sm == nil {
		sm = session.NewManager()
	}
	if hub == nil {
		hub = ws.NewHub(sm)
	}

	mux.HandleFunc("GET /health", HealthHandler)
	mux.HandleFunc("GET /api/session", func(w http.ResponseWriter, r *http.Request) {
		handleSessionGet(sm, w, r)
	})
	mux.HandleFunc("POST /api/session", func(w http.ResponseWriter, r *http.Request) {
		handleSessionPost(sm, w, r)
	})
	mux.HandleFunc("OPTIONS /api/session", func(w http.ResponseWriter, r *http.Request) {
		writeCORSOptions(w)
	})
	mux.HandleFunc("GET /api/rooms", func(w http.ResponseWriter, r *http.Request) {
		handleRoomsGet(sm, hub, w, r)
	})
	mux.HandleFunc("OPTIONS /api/rooms", func(w http.ResponseWriter, r *http.Request) {
		writeCORSOptions(w)
	})
	mux.HandleFunc("POST /api/event", func(w http.ResponseWriter, r *http.Request) {
		handleEventPost(hub, w, r)
	})
	mux.HandleFunc("OPTIONS /api/event", func(w http.ResponseWriter, r *http.Request) {
		writeCORSOptions(w)
	})
	mux.HandleFunc("GET /ws", hub.HandleWebSocket)
	mux.HandleFunc("GET /overlay", func(w http.ResponseWriter, r *http.Request) {
		serveOverlayIndex(overlayDir, w, r)
	})
	mux.Handle("/overlay/", overlayHandler(overlayDir))

	return mux
}

func handleSessionGet(sm *session.Manager, w http.ResponseWriter, r *http.Request) {
	sessionID := cleanSession(r.URL.Query().Get("session"))
	if sessionID == "" {
		writeJSON(w, http.StatusOK, map[string]any{
			"rooms": len(sm.List()),
		})
		return
	}

	s, ok := sm.Get(sessionID)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]any{
			"error": "session not found",
		})
		return
	}

	hasOverlay, updatedAt := s.OverlayInfo()
	writeJSON(w, http.StatusOK, map[string]any{
		"session":       s.ID,
		"events":        s.GetEvents(),
		"hasOverlay":    hasOverlay,
		"lastOverlayAt": updatedAt,
		"lastActivity":  s.LastActivity,
	})
}

func handleSessionPost(sm *session.Manager, w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var req sessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && err != io.EOF {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid json",
		})
		return
	}

	sessionID := cleanSession(req.Session)
	if sessionID == "" {
		sessionID = cleanSession(req.ID)
	}
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "missing session",
		})
		return
	}

	s := sm.GetOrCreate(sessionID)
	hasOverlay, updatedAt := s.OverlayInfo()
	writeJSON(w, http.StatusCreated, map[string]any{
		"session":       s.ID,
		"hasOverlay":    hasOverlay,
		"lastOverlayAt": updatedAt,
	})
}

func handleRoomsGet(sm *session.Manager, hub *ws.Hub, w http.ResponseWriter, r *http.Request) {
	sessions := sm.List()
	payload := make([]map[string]any, 0, len(sessions))
	for _, s := range sessions {
		hasOverlay, updatedAt := s.OverlayInfo()
		payload = append(payload, map[string]any{
			"session":       s.ID,
			"events":        len(s.GetEvents()),
			"hasOverlay":    hasOverlay,
			"lastOverlayAt": updatedAt,
			"lastActivity":  s.LastActivity,
			"snapshot":      hub.Snapshot(s.ID),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"rooms": payload,
	})
}

func handleEventPost(hub *ws.Hub, w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "unable to read request body",
		})
		return
	}

	var req eventRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid json",
		})
		return
	}

	sessionID := cleanSession(req.Session)
	if sessionID == "" {
		sessionID = cleanSession(req.Join)
	}
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "missing session",
		})
		return
	}

	hub.Publish(sessionID, body, isClearContents(req.Contents))
	writeJSON(w, http.StatusAccepted, map[string]any{
		"session":  sessionID,
		"accepted": true,
	})
}

func serveOverlayIndex(overlayDir string, w http.ResponseWriter, r *http.Request) {
	if overlayDir == "" {
		http.NotFound(w, r)
		return
	}

	indexPath := filepath.Join(overlayDir, "index.html")
	if _, err := os.Stat(indexPath); err != nil {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	http.ServeFile(w, r, indexPath)
}

func overlayHandler(overlayDir string) http.Handler {
	if overlayDir == "" {
		return http.NotFoundHandler()
	}

	fileServer := http.StripPrefix("/overlay/", http.FileServer(http.Dir(overlayDir)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/overlay/" {
			serveOverlayIndex(overlayDir, w, r)
			return
		}
		fileServer.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	addCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func addCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
}

func writeCORSOptions(w http.ResponseWriter) {
	addCORSHeaders(w)
	w.WriteHeader(http.StatusNoContent)
}

func cleanSession(value string) string {
	return strings.Join(strings.Fields(value), "")
}

func isClearContents(contents json.RawMessage) bool {
	trimmed := strings.TrimSpace(string(contents))
	return trimmed == "" || trimmed == "false" || trimmed == "null"
}
