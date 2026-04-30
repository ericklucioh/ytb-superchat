package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func serveOverlayRuntimeEnv(w http.ResponseWriter, r *http.Request) {
	env := runtimeEnvFromRequest(r)
	script := renderRuntimeEnvScript(env)

	w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(script))
}

type runtimeEnv struct {
	GoPort              int
	PortalPort          int
	SessionID           string
	PortalMockMode      bool
	ApiToken            string
	OverlayApiBaseURL   string
	PublicBackendURL    string
	OverlayWebSocketURL string
}

func runtimeEnvFromRequest(r *http.Request) runtimeEnv {
	portalPort := 8000
	goPort := 8080

	if value := firstEnv("YTB_PORTAL_PORT", "PORTAL_PORT"); value != "" {
		portalPort = parsePort(value, portalPort)
	}
	if value := firstEnv("YTB_GO_PORT", "GO_PORT"); value != "" {
		goPort = parsePort(value, goPort)
	}

	sessionID := firstEnv("YTB_SESSION_ID", "SESSION")
	portalMockMode := readBool("YTB_PORTAL_MOCK", "PORTAL_MOCK")
	apiToken := firstEnv("YTB_API_TOKEN", "YTB_SHARED_SECRET")
	overlayApiBaseURL := firstEnv("YTB_OVERLAY_API_BASE_URL", "PUBLIC_BACKEND_URL", "YTB_PUBLIC_BACKEND_URL")
	if overlayApiBaseURL == "" {
		scheme := requestScheme(r)
		host := requestHost(r)
		if host != "" {
			overlayApiBaseURL = fmt.Sprintf("%s://%s", scheme, host)
		} else {
			overlayApiBaseURL = fmt.Sprintf("%s://localhost:%d", scheme, goPort)
		}
	}

	publicBackendURL := resolvePublicBackendBaseURL(r, overlayApiBaseURL)
	overlayWebSocketURL := firstEnv("YTB_OVERLAY_WS_URL")
	if overlayWebSocketURL == "" {
		overlayWebSocketURL = deriveWebSocketURL(overlayApiBaseURL)
	}

	return runtimeEnv{
		GoPort:              goPort,
		PortalPort:          portalPort,
		SessionID:           sessionID,
		PortalMockMode:      portalMockMode,
		ApiToken:            apiToken,
		OverlayApiBaseURL:   overlayApiBaseURL,
		PublicBackendURL:    publicBackendURL,
		OverlayWebSocketURL: overlayWebSocketURL,
	}
}

func requestScheme(r *http.Request) string {
	for _, header := range []string{"X-Forwarded-Proto", "X-Forwarded-Protocol"} {
		if value := strings.TrimSpace(r.Header.Get(header)); value != "" {
			if strings.EqualFold(value, "https") {
				return "https"
			}
			if strings.EqualFold(value, "http") {
				return "http"
			}
		}
	}

	if r.TLS != nil {
		return "https"
	}

	return "http"
}

func requestHost(r *http.Request) string {
	for _, header := range []string{"X-Forwarded-Host", "X-Original-Host"} {
		if value := strings.TrimSpace(r.Header.Get(header)); value != "" {
			return strings.Split(value, ",")[0]
		}
	}

	return strings.TrimSpace(r.Host)
}

func renderRuntimeEnvScript(env runtimeEnv) string {
	type payload struct {
		GoPort              int    `json:"goPort"`
		PortalPort          int    `json:"portalPort"`
		SessionID           string `json:"sessionId"`
		PortalMockMode      bool   `json:"portalMockMode"`
		ApiToken            string `json:"apiToken"`
		OverlayApiBaseURL   string `json:"overlayApiBaseUrl"`
		PublicBackendURL    string `json:"publicBackendUrl"`
		OverlayWebSocketURL string `json:"overlayWsUrl"`
	}

	body, _ := json.Marshal(payload{
		GoPort:              env.GoPort,
		PortalPort:          env.PortalPort,
		SessionID:           env.SessionID,
		PortalMockMode:      env.PortalMockMode,
		ApiToken:            env.ApiToken,
		OverlayApiBaseURL:   env.OverlayApiBaseURL,
		PublicBackendURL:    env.PublicBackendURL,
		OverlayWebSocketURL: env.OverlayWebSocketURL,
	})

	return "window.__YTB_ENV__ = " + string(body) + ";\n" +
		"window.__YTB_API_TOKEN__ = " + jsString(env.ApiToken) + ";\n" +
		"window.__OVERLAY_API_BASE_URL__ = " + jsString(env.OverlayApiBaseURL) + ";\n" +
		"window.__PUBLIC_BACKEND_URL__ = " + jsString(env.PublicBackendURL) + ";\n" +
		"window.__OVERLAY_WS_URL__ = " + jsString(env.OverlayWebSocketURL) + ";\n"
}

func resolvePublicBackendBaseURL(r *http.Request, overlayFallback string) string {
	explicit := firstEnv("PUBLIC_BACKEND_URL", "YTB_PUBLIC_BACKEND_URL")
	if explicit != "" {
		return normalizeBackendBaseURL(explicit, requestScheme(r))
	}

	if overlayFallback != "" {
		return normalizeBackendBaseURL(overlayFallback, requestScheme(r))
	}

	scheme := requestScheme(r)
	host := requestHost(r)
	if host != "" {
		return scheme + "://" + host
	}

	return ""
}

func normalizeBackendBaseURL(value, defaultScheme string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	trimmed = strings.TrimRight(trimmed, "/")
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}

	if strings.HasPrefix(trimmed, "//") {
		if defaultScheme == "" {
			defaultScheme = "https:"
		}
		if strings.HasSuffix(defaultScheme, ":") {
			return defaultScheme + trimmed
		}
		return defaultScheme + "://" + strings.TrimPrefix(trimmed, "//")
	}

	if defaultScheme == "http" || defaultScheme == "https" {
		return defaultScheme + "://" + trimmed
	}

	return "https://" + trimmed
}

func deriveWebSocketURL(apiBase string) string {
	apiBase = strings.TrimSpace(apiBase)
	if apiBase == "" {
		return "ws://localhost:8080/ws"
	}

	if strings.HasPrefix(apiBase, "https://") {
		return "wss://" + strings.TrimPrefix(apiBase, "https://") + "/ws"
	}

	if strings.HasPrefix(apiBase, "http://") {
		return "ws://" + strings.TrimPrefix(apiBase, "http://") + "/ws"
	}

	return "ws://localhost:8080/ws"
}

func parsePort(value string, fallback int) int {
	var port int
	if _, err := fmt.Sscanf(strings.TrimSpace(value), "%d", &port); err == nil && port > 0 {
		return port
	}
	return fallback
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}

	return ""
}

func readBool(keys ...string) bool {
	for _, key := range keys {
		value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
		switch value {
		case "1", "true", "yes", "on":
			return true
		case "0", "false", "no", "off":
			return false
		}
	}

	return false
}

func jsString(value string) string {
	body, _ := json.Marshal(value)
	return string(body)
}
