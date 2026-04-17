package httpapi

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

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
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	postResp := doJSONRequest(t, server.URL+"/api/session", http.MethodPost, `{"session":"room-1"}`)
	defer postResp.Body.Close()
	if postResp.StatusCode != http.StatusCreated {
		t.Fatalf("unexpected post status: %d", postResp.StatusCode)
	}

	getResp := doJSONRequest(t, server.URL+"/api/session?session=room-1", http.MethodGet, "")
	defer getResp.Body.Close()
	if getResp.StatusCode != http.StatusOK {
		t.Fatalf("unexpected get status: %d", getResp.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(getResp.Body).Decode(&payload); err != nil {
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
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	doJSONRequest(t, server.URL+"/api/session", http.MethodPost, `{"session":"room-rooms"}`).Body.Close()
	doJSONRequest(t, server.URL+"/api/event", http.MethodPost, `{"session":"room-rooms","msg":true,"contents":{"chatname":"Ada","chatmessage":"Hello"}}`).Body.Close()

	resp := doJSONRequest(t, server.URL+"/api/rooms", http.MethodGet, "")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("unexpected rooms status: %d", resp.StatusCode)
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
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
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

func TestWebSocketRehydratesStoredOverlayOnJoin(t *testing.T) {
	router, _ := newTestRouter(t)
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	doJSONRequest(t, server.URL+"/api/event", http.MethodPost, `{"session":"room-ws","msg":true,"contents":{"chatname":"Ada","chatmessage":"Hello"}}`).Body.Close()

	conn, reader, _ := dialWebSocket(t, server.URL, "/ws?session=room-ws")
	defer conn.Close()

	payload := readWebSocketTextFrame(t, reader)
	if !strings.Contains(string(payload), `"chatname":"Ada"`) {
		t.Fatalf("expected stored overlay payload, got: %s", string(payload))
	}
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

func doJSONRequest(t *testing.T, rawURL, method, body string) *http.Response {
	t.Helper()

	req, err := http.NewRequest(method, rawURL, strings.NewReader(body))
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("perform request: %v", err)
	}
	return resp
}

func dialWebSocket(t *testing.T, serverURL, path string) (net.Conn, *bufio.Reader, *bufio.Writer) {
	t.Helper()

	parsed, err := url.Parse(serverURL)
	if err != nil {
		t.Fatalf("parse server url: %v", err)
	}

	conn, err := net.Dial("tcp", parsed.Host)
	if err != nil {
		t.Fatalf("dial websocket endpoint: %v", err)
	}

	key := "dGhlIHNhbXBsZSBub25jZQ=="
	req := fmt.Sprintf("GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n", path, parsed.Host, key)
	if _, err := conn.Write([]byte(req)); err != nil {
		t.Fatalf("write websocket handshake: %v", err)
	}

	reader := bufio.NewReader(conn)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			t.Fatalf("read websocket handshake: %v", err)
		}
		if line == "\r\n" {
			break
		}
	}

	return conn, reader, bufio.NewWriter(conn)
}

func readWebSocketTextFrame(t *testing.T, reader *bufio.Reader) []byte {
	t.Helper()

	header := make([]byte, 2)
	if _, err := reader.Read(header); err != nil {
		t.Fatalf("read websocket header: %v", err)
	}

	length := int(header[1] & 0x7f)
	switch length {
	case 126:
		extended := make([]byte, 2)
		if _, err := reader.Read(extended); err != nil {
			t.Fatalf("read extended length: %v", err)
		}
		length = int(extended[0])<<8 | int(extended[1])
	case 127:
		t.Fatalf("unexpected long websocket frame")
	}

	payload := make([]byte, length)
	if _, err := reader.Read(payload); err != nil {
		t.Fatalf("read websocket payload: %v", err)
	}
	return payload
}
