package httpapi

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ytb-go/internal/model"
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
		handleEventPost(sm, hub, w, r)
	})
	mux.HandleFunc("OPTIONS /api/event", func(w http.ResponseWriter, r *http.Request) {
		writeCORSOptions(w)
	})
	mux.HandleFunc("GET /ws", hub.HandleWebSocket)
	mux.HandleFunc("GET /overlay", func(w http.ResponseWriter, r *http.Request) {
		serveOverlayIndex(overlayDir, w, r)
	})
	mux.HandleFunc("GET /overlay/runtime-env.js", func(w http.ResponseWriter, r *http.Request) {
		serveOverlayRuntimeEnv(w, r)
	})
	mux.Handle("/overlay/", overlayHandler(overlayDir))

	return mux
}

func handleSessionGet(sm *session.Manager, w http.ResponseWriter, r *http.Request) {
	sessionID := cleanSession(r.URL.Query().Get("session"))
	log.Printf("[go:http] GET /api/session session=%q", sessionID)
	if sessionID == "" {
		log.Printf("[go:http] GET /api/session -> rooms=%d", len(sm.List()))
		writeJSON(w, http.StatusOK, map[string]any{
			"rooms": len(sm.List()),
		})
		return
	}

	s, ok := sm.Get(sessionID)
	if !ok {
		log.Printf("[go:http] GET /api/session session=%q -> not found", sessionID)
		writeJSON(w, http.StatusNotFound, map[string]any{
			"error": "session not found",
		})
		return
	}

	hasOverlay, updatedAt := s.OverlayInfo()
	log.Printf("[go:http] GET /api/session session=%q events=%d overlay=%t", s.ID, len(s.GetEvents()), hasOverlay)
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
	log.Printf("[go:http] POST /api/session session=%q", sessionID)
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "missing session",
		})
		return
	}

	s := sm.GetOrCreate(sessionID)
	hasOverlay, updatedAt := s.OverlayInfo()
	log.Printf("[go:http] POST /api/session session=%q overlay=%t", s.ID, hasOverlay)
	writeJSON(w, http.StatusCreated, map[string]any{
		"session":       s.ID,
		"hasOverlay":    hasOverlay,
		"lastOverlayAt": updatedAt,
	})
}

func handleRoomsGet(sm *session.Manager, hub *ws.Hub, w http.ResponseWriter, r *http.Request) {
	sessions := sm.List()
	log.Printf("[go:http] GET /api/rooms rooms=%d", len(sessions))
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

func handleEventPost(sm *session.Manager, hub *ws.Hub, w http.ResponseWriter, r *http.Request) {
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
	log.Printf("[go:http] POST /api/event session=%q bodyBytes=%d", sessionID, len(body))
	if sessionID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "missing session",
		})
		return
	}

	if event := buildSessionEvent(sessionID, req); event != nil {
		log.Printf("[go:http] POST /api/event session=%q event type=%q platform=%q user=%q message=%q", sessionID, event.Type, event.Platform, event.User, truncate(event.Message, 80))
		sm.GetOrCreate(sessionID).AddEvent(*event)
	}

	hub.Publish(sessionID, body, isClearContents(req.Contents))
	log.Printf("[go:http] POST /api/event session=%q published clear=%t", sessionID, isClearContents(req.Contents))
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

	log.Printf("[go:http] GET /overlay serve index from %s", overlayDir)
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

func buildSessionEvent(sessionID string, req eventRequest) *model.Event {
	if isClearContents(req.Contents) {
		return nil
	}

	var contents map[string]any
	if len(req.Contents) > 0 {
		_ = json.Unmarshal(req.Contents, &contents)
	}

	eventType := stringOrDefault(valueString(contents, "eventType"), "overlay")
	if req.Msg {
		eventType = stringOrDefault(valueString(contents, "type"), eventType)
	}

	return &model.Event{
		Session:         sessionID,
		Type:            eventType,
		User:            stringOrDefault(valueString(contents, "chatname"), valueString(contents, "user")),
		Message:         stringOrDefault(valueString(contents, "chatmessage"), valueString(contents, "message")),
		Timestamp:       jsonNumberToInt64(valueAny(contents, "timestamp"), time.Now().UTC().UnixMilli()),
		Currency:        stringOrDefault(valueString(contents, "currency"), ""),
		ChatImg:         stringOrDefault(valueString(contents, "chatimg"), ""),
		ChatBadges:      stringOrDefault(valueString(contents, "chatbadges"), ""),
		BackgroundColor: stringOrDefault(valueString(contents, "backgroundColor"), ""),
		TextColor:       stringOrDefault(valueString(contents, "textColor"), ""),
	}
}

func truncate(value string, limit int) string {
	if limit <= 0 || len(value) <= limit {
		return value
	}

	return value[:limit] + "..."
}

func valueAny(values map[string]any, key string) any {
	if values == nil {
		return nil
	}

	return values[key]
}

func valueString(values map[string]any, key string) string {
	if values == nil {
		return ""
	}

	if raw, ok := values[key]; ok {
		if str, ok := raw.(string); ok {
			return strings.TrimSpace(str)
		}
	}

	return ""
}

func jsonNumberToInt64(value any, fallback int64) int64 {
	switch v := value.(type) {
	case float64:
		return int64(v)
	case json.Number:
		if parsed, err := v.Int64(); err == nil {
			return parsed
		}
	case int64:
		return v
	case int:
		return int64(v)
	}

	return fallback
}

func stringOrDefault(value, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}
