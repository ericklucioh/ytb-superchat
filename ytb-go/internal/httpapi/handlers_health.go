package httpapi

import "net/http"

type HealthResponse struct {
	OK      bool   `json:"ok"`
	Service string `json:"service"`
	Version string `json:"version"`
}

func HealthHandler(policy securityPolicy, w http.ResponseWriter, r *http.Request) {
	policy.writeJSON(w, r, http.StatusOK, HealthResponse{
		OK:      true,
		Service: "ytb-go",
		Version: "1.0.0",
	})
}
