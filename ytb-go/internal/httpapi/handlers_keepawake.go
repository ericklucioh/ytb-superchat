package httpapi

import (
	"log"
	"net/http"
	"time"

	"ytb-go/internal/keepawake"
)

type keepAwakeResponse struct {
	OK      bool       `json:"ok"`
	Message string     `json:"message"`
	Until   *time.Time `json:"until,omitempty"`
	Active  bool       `json:"active"`
}

type keepAwakeStatusResponse struct {
	Active bool       `json:"active"`
	Until  *time.Time `json:"until,omitempty"`
}

func handleKeepAwakeStart(policy securityPolicy, manager *keepawake.Manager, w http.ResponseWriter, r *http.Request) {
	baseURL := resolvePublicBackendBaseURL(r, "")
	if baseURL == "" {
		policy.writeJSON(w, r, http.StatusBadRequest, map[string]any{
			"error": "invalid PUBLIC_BACKEND_URL value for keep-awake start: expected an absolute http(s) URL or a request-derived origin",
		})
		return
	}

	status := manager.Start(baseURL)
	response := keepAwakeResponse{
		OK:      true,
		Message: "Backend será mantido acordado durante a live",
		Active:  status.Active,
	}
	if !status.Until.IsZero() {
		until := status.Until.UTC()
		response.Until = &until
	}

	log.Printf("[go:http] POST /keep-awake/start active=%t until=%s", response.Active, formatKeepAwakeUntil(response.Until))
	policy.writeJSON(w, r, http.StatusOK, response)
}

func handleKeepAwakeStatus(policy securityPolicy, manager *keepawake.Manager, w http.ResponseWriter, r *http.Request) {
	status := manager.Status()
	response := keepAwakeStatusResponse{Active: status.Active}

	if !status.Until.IsZero() {
		until := status.Until.UTC()
		response.Until = &until
	}

	policy.writeJSON(w, r, http.StatusOK, response)
}

func formatKeepAwakeUntil(until *time.Time) string {
	if until == nil {
		return ""
	}

	return until.Format(time.RFC3339)
}
