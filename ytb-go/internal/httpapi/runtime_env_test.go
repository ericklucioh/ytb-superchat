package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRuntimeEnvIncludesPublicUrls(t *testing.T) {
	t.Setenv("YTB_OVERLAY_API_BASE_URL", "http://localhost:8080")
	t.Setenv("PUBLIC_BACKEND_URL", "https://backend.example.com")
	t.Setenv("YTB_OVERLAY_WS_URL", "ws://localhost:8080/ws")

	req := httptest.NewRequest(http.MethodGet, "http://localhost/overlay/runtime-env.js", nil)
	req.Host = "localhost:8080"

	env := runtimeEnvFromRequest(req)
	script := renderRuntimeEnvScript(env)
	if !strings.Contains(script, `"publicBackendUrl":"https://backend.example.com"`) {
		t.Fatalf("expected public backend url in payload, got: %s", script)
	}
	if !strings.Contains(script, `window.__PUBLIC_BACKEND_URL__ = "https://backend.example.com";`) {
		t.Fatalf("expected public backend window value, got: %s", script)
	}
}
