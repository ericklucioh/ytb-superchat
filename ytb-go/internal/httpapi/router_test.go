package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ytb-go/internal/keepawake"
	"ytb-go/internal/session"
	"ytb-go/internal/ws"
)

func TestOverlayRouteServesIndex(t *testing.T) {
	overlayDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(overlayDir, "index.html"), []byte("<html><body>overlay</body></html>"), 0o644); err != nil {
		t.Fatalf("write index: %v", err)
	}

	sm := session.NewManager()
	router := NewRouter(sm, ws.NewHub(sm), overlayDir)

	req := httptest.NewRequest(http.MethodGet, "/overlay?session=test", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "overlay") {
		t.Fatalf("expected overlay html, got: %s", rec.Body.String())
	}
}

func TestHealthRouteUsesCorsPolicy(t *testing.T) {
	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("Origin", "http://localhost:8000")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d", rec.Code)
	}

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:8000" {
		t.Fatalf("unexpected CORS origin: %q", got)
	}

	var payload map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode health response: %v", err)
	}

	if payload["ok"] != true {
		t.Fatalf("unexpected health payload: %#v", payload)
	}
}

func TestKeepAwakeRoutesStartAndReportStatus(t *testing.T) {
	sm := session.NewManager()
	hub := ws.NewHub(sm)
	healthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			t.Fatalf("unexpected ping path: %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(healthServer.Close)
	t.Setenv("PUBLIC_BACKEND_URL", healthServer.URL)

	manager := keepawake.NewManager(keepawake.Config{
		PingInterval: 20 * time.Millisecond,
		ActiveWindow: 80 * time.Millisecond,
	})
	router := newRouterWithKeepAwake(sm, hub, t.TempDir(), manager)

	startReq := httptest.NewRequest(http.MethodPost, "/keep-awake/start", nil)
	startRec := httptest.NewRecorder()
	router.ServeHTTP(startRec, startReq)
	if startRec.Code != http.StatusOK {
		t.Fatalf("unexpected start status: %d", startRec.Code)
	}

	var startPayload map[string]any
	if err := json.NewDecoder(startRec.Body).Decode(&startPayload); err != nil {
		t.Fatalf("decode start response: %v", err)
	}
	if startPayload["ok"] != true {
		t.Fatalf("expected ok=true, got %#v", startPayload)
	}
	if startPayload["active"] != true {
		t.Fatalf("expected active=true, got %#v", startPayload)
	}

	statusReq := httptest.NewRequest(http.MethodGet, "/keep-awake/status", nil)
	statusRec := httptest.NewRecorder()
	router.ServeHTTP(statusRec, statusReq)
	if statusRec.Code != http.StatusOK {
		t.Fatalf("unexpected status code: %d", statusRec.Code)
	}

	var statusPayload map[string]any
	if err := json.NewDecoder(statusRec.Body).Decode(&statusPayload); err != nil {
		t.Fatalf("decode status response: %v", err)
	}
	if statusPayload["active"] != true {
		t.Fatalf("expected active=true, got %#v", statusPayload)
	}
}

func TestEventRouteStoresOverlay(t *testing.T) {
	sm := session.NewManager()
	hub := ws.NewHub(sm)
	router := NewRouter(sm, hub, "")

	req := httptest.NewRequest(http.MethodPost, "/api/event", strings.NewReader(`{"session":"room-1","msg":true,"contents":{"chatname":"Ada","chatmessage":"Hello"}}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("unexpected status: %d", rec.Code)
	}

	s, ok := sm.Get("room-1")
	if !ok {
		t.Fatalf("expected session to be created")
	}

	if overlay, _ := s.OverlayInfo(); !overlay {
		t.Fatalf("expected overlay packet to be stored")
	}

	clearReq := httptest.NewRequest(http.MethodPost, "/api/event", strings.NewReader(`{"session":"room-1","contents":false}`))
	clearReq.Header.Set("Content-Type", "application/json")
	clearRec := httptest.NewRecorder()

	router.ServeHTTP(clearRec, clearReq)

	if clearRec.Code != http.StatusAccepted {
		t.Fatalf("unexpected clear status: %d", clearRec.Code)
	}

	if overlay, _ := s.OverlayInfo(); overlay {
		t.Fatalf("expected overlay packet to be cleared")
	}
}

func TestSessionRouteCreatesAndReturnsSessionState(t *testing.T) {
	router, _ := newTestRouter(t)

	postReq := httptest.NewRequest(http.MethodPost, "/api/session", strings.NewReader(`{"session":"room-1"}`))
	postReq.Header.Set("Content-Type", "application/json")
	postRec := httptest.NewRecorder()
	router.ServeHTTP(postRec, postReq)
	if postRec.Code != http.StatusCreated {
		t.Fatalf("unexpected post status: %d", postRec.Code)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/session?session=room-1", nil)
	getRec := httptest.NewRecorder()
	router.ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("unexpected get status: %d", getRec.Code)
	}

	var payload map[string]any
	if err := json.NewDecoder(getRec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode session response: %v", err)
	}

	if payload["session"] != "room-1" {
		t.Fatalf("unexpected session id: %#v", payload["session"])
	}
	if hasOverlay, ok := payload["hasOverlay"].(bool); !ok || hasOverlay {
		t.Fatalf("expected empty overlay state, got: %#v", payload["hasOverlay"])
	}
}

func TestRoomsRouteReportsSnapshotState(t *testing.T) {
	router, sm := newTestRouter(t)

	sessionReq := httptest.NewRequest(http.MethodPost, "/api/session", strings.NewReader(`{"session":"room-rooms"}`))
	sessionReq.Header.Set("Content-Type", "application/json")
	sessionRec := httptest.NewRecorder()
	router.ServeHTTP(sessionRec, sessionReq)

	eventReq := httptest.NewRequest(http.MethodPost, "/api/event", strings.NewReader(`{"session":"room-rooms","msg":true,"contents":{"chatname":"Ada","chatmessage":"Hello"}}`))
	eventReq.Header.Set("Content-Type", "application/json")
	eventRec := httptest.NewRecorder()
	router.ServeHTTP(eventRec, eventReq)

	respReq := httptest.NewRequest(http.MethodGet, "/api/rooms", nil)
	respRec := httptest.NewRecorder()
	router.ServeHTTP(respRec, respReq)
	if respRec.Code != http.StatusOK {
		t.Fatalf("unexpected rooms status: %d", respRec.Code)
	}

	var payload struct {
		Rooms []struct {
			Session      string `json:"session"`
			Events       int    `json:"events"`
			HasOverlay   bool   `json:"hasOverlay"`
			Snapshot     any    `json:"snapshot"`
			LastActivity string `json:"last_activity"`
		} `json:"rooms"`
	}
	if err := json.NewDecoder(respRec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode rooms response: %v", err)
	}
	if len(payload.Rooms) != 1 {
		t.Fatalf("expected one room, got %d", len(payload.Rooms))
	}
	if payload.Rooms[0].Session != "room-rooms" {
		t.Fatalf("unexpected room id: %s", payload.Rooms[0].Session)
	}
	if payload.Rooms[0].Events != 1 {
		t.Fatalf("expected one event, got %d", payload.Rooms[0].Events)
	}
	if !payload.Rooms[0].HasOverlay {
		t.Fatalf("expected room to have last overlay")
	}
	if _, ok := sm.Get("room-rooms"); !ok {
		t.Fatalf("expected session to exist")
	}
}

func TestSessionIsolationBetweenRooms(t *testing.T) {
	router, _ := newTestRouter(t)

	eventA := httptest.NewRequest(http.MethodPost, "/api/event", strings.NewReader(`{"session":"room-a","msg":true,"contents":{"chatname":"Ada A","chatmessage":"Hello A"}}`))
	eventA.Header.Set("Content-Type", "application/json")
	eventB := httptest.NewRequest(http.MethodPost, "/api/event", strings.NewReader(`{"session":"room-b","msg":true,"contents":{"chatname":"Ada B","chatmessage":"Hello B"}}`))
	eventB.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(httptest.NewRecorder(), eventA)
	router.ServeHTTP(httptest.NewRecorder(), eventB)

	checkSession := func(sessionID, expectedName, expectedMessage string) {
		req := httptest.NewRequest(http.MethodGet, "/api/session?session="+sessionID, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("unexpected session status for %s: %d", sessionID, rec.Code)
		}

		var payload map[string]any
		if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
			t.Fatalf("decode session response for %s: %v", sessionID, err)
		}

		if payload["session"] != sessionID {
			t.Fatalf("unexpected session id for %s: %#v", sessionID, payload["session"])
		}

		events, ok := payload["events"].([]any)
		if !ok || len(events) != 1 {
			t.Fatalf("expected one event for %s, got %#v", sessionID, payload["events"])
		}

		event, ok := events[0].(map[string]any)
		if !ok {
			t.Fatalf("unexpected event shape for %s: %#v", sessionID, events[0])
		}

		if event["user"] != expectedName {
			t.Fatalf("unexpected user for %s: %#v", sessionID, event["user"])
		}
		if event["message"] != expectedMessage {
			t.Fatalf("unexpected message for %s: %#v", sessionID, event["message"])
		}
	}

	checkSession("room-a", "Ada A", "Hello A")
	checkSession("room-b", "Ada B", "Hello B")
}

func newTestRouter(t *testing.T) (*http.ServeMux, *session.Manager) {
	t.Helper()

	overlayDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(overlayDir, "index.html"), []byte("<html><body>overlay</body></html>"), 0o644); err != nil {
		t.Fatalf("write index: %v", err)
	}

	sm := session.NewManager()
	return NewRouter(sm, ws.NewHub(sm), overlayDir), sm
}
