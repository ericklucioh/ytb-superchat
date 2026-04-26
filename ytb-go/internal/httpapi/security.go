package httpapi

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

const (
	apiTokenHeader = "X-YTB-Token"
)

type securityPolicy struct {
	apiToken       string
	allowedOrigins map[string]struct{}
}

func newSecurityPolicy() securityPolicy {
	policy := securityPolicy{
		apiToken:       firstEnv("YTB_API_TOKEN", "YTB_SHARED_SECRET"),
		allowedOrigins: make(map[string]struct{}),
	}

	for _, origin := range parseOrigins(firstEnv("YTB_ALLOWED_ORIGINS")) {
		policy.allowedOrigins[origin] = struct{}{}
	}

	if len(policy.allowedOrigins) == 0 {
		for _, origin := range defaultAllowedOrigins() {
			policy.allowedOrigins[origin] = struct{}{}
		}
	}

	return policy
}

func (p securityPolicy) authorizeSensitiveRequest(w http.ResponseWriter, r *http.Request) bool {
	if !p.originAllowed(r) {
		http.Error(w, "origin not allowed", http.StatusForbidden)
		return false
	}

	if !p.tokenAllowed(r) {
		http.Error(w, "missing or invalid token", http.StatusUnauthorized)
		return false
	}

	return true
}

func (p securityPolicy) authorizePreflight(w http.ResponseWriter, r *http.Request) bool {
	if !p.originAllowed(r) {
		http.Error(w, "origin not allowed", http.StatusForbidden)
		return false
	}

	p.addCORSHeaders(w, r)
	w.WriteHeader(http.StatusNoContent)
	return true
}

func (p securityPolicy) addCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" || !p.originAllowedOrigin(origin, r) {
		return
	}

	w.Header().Set("Vary", "Origin")
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-YTB-Token")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
}

func (p securityPolicy) writeJSON(w http.ResponseWriter, r *http.Request, status int, payload any) {
	p.addCORSHeaders(w, r)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func (p securityPolicy) originAllowed(r *http.Request) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return true
	}

	return p.originAllowedOrigin(origin, r)
}

func (p securityPolicy) originAllowedOrigin(origin string, r *http.Request) bool {
	if origin == "" {
		return true
	}

	if origin == requestOrigin(r) {
		return true
	}

	_, ok := p.allowedOrigins[origin]
	return ok
}

func (p securityPolicy) tokenAllowed(r *http.Request) bool {
	if p.apiToken == "" {
		return true
	}

	return subtle.ConstantTimeCompare([]byte(requestToken(r)), []byte(p.apiToken)) == 1
}

func requestOrigin(r *http.Request) string {
	scheme := requestScheme(r)
	host := requestHost(r)
	if scheme == "" || host == "" {
		return ""
	}

	return scheme + "://" + host
}

func requestToken(r *http.Request) string {
	if token := strings.TrimSpace(r.Header.Get(apiTokenHeader)); token != "" {
		return token
	}

	if token := strings.TrimSpace(r.Header.Get("Authorization")); token != "" {
		if strings.HasPrefix(strings.ToLower(token), "bearer ") {
			return strings.TrimSpace(token[7:])
		}
	}

	return strings.TrimSpace(r.URL.Query().Get("token"))
}

func defaultAllowedOrigins() []string {
	portalPort := 8000
	if value := firstEnv("YTB_PORTAL_PORT", "PORTAL_PORT"); value != "" {
		portalPort = parsePort(value, portalPort)
	}

	origins := []string{
		"http://localhost:" + strconv.Itoa(portalPort),
		"http://127.0.0.1:" + strconv.Itoa(portalPort),
		"http://[::1]:" + strconv.Itoa(portalPort),
	}

	return origins
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			result = append(result, origin)
		}
	}

	return result
}
