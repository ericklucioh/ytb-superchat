package httpapi

import (
	"net/http"
	"ytb-go/internal/session"
)

func NewRouter(sm *session.Manager) *http.ServeMux {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", HealthHandler)

	// API Session (placeholder for now)
	mux.HandleFunc("POST /api/session", func(w http.ResponseWriter, r *http.Request) {
		// TODO: registrar sessão
		w.WriteHeader(http.StatusCreated)
	})

	// API Event (Wave 2)
	// mux.HandleFunc("POST /api/event", ...)

	return mux
}
