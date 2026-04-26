package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSensitiveRequestsRequireConfiguredToken(t *testing.T) {
	t.Setenv("YTB_API_TOKEN", "secret-token")
	t.Setenv("YTB_ALLOWED_ORIGINS", "http://localhost:3000")

	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/api/event", strings.NewReader(`{"session":"room-1","msg":true,"contents":{"chatname":"Ada","chatmessage":"Hello"}}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "http://localhost:3000")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized without token, got %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/event", strings.NewReader(`{"session":"room-1","msg":true,"contents":{"chatname":"Ada","chatmessage":"Hello"}}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set(apiTokenHeader, "secret-token")
	rec = httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected accepted with token, got %d", rec.Code)
	}

	summaryReq := httptest.NewRequest(http.MethodGet, "/api/session?session=room-1", nil)
	summaryReq.Header.Set("Origin", "http://localhost:3000")
	summaryReq.Header.Set(apiTokenHeader, "secret-token")
	summaryRec := httptest.NewRecorder()

	router.ServeHTTP(summaryRec, summaryReq)

	if summaryRec.Code != http.StatusOK {
		t.Fatalf("expected session get to succeed with token, got %d", summaryRec.Code)
	}
	if got := summaryRec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("expected CORS allow origin, got %q", got)
	}
}

func TestCORSRejectsDisallowedOrigins(t *testing.T) {
	t.Setenv("YTB_API_TOKEN", "secret-token")
	t.Setenv("YTB_ALLOWED_ORIGINS", "http://localhost:3000")

	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodOptions, "/api/event", nil)
	req.Header.Set("Origin", "http://evil.example")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected forbidden preflight, got %d", rec.Code)
	}
}

func TestWebSocketRequiresTokenWhenConfigured(t *testing.T) {
	t.Setenv("YTB_API_TOKEN", "secret-token")

	router, _ := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/ws?session=room-1", nil)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized websocket request, got %d", rec.Code)
	}
}
