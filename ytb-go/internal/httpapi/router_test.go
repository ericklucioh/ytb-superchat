package httpapi

import (
	"net/http"
	"net/http/httptest"
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
