package httpapi

import (
	"encoding/json"
	"net/http"
)

type HealthResponse struct {
	OK      bool   `json:"ok"`
	Service string `json:"service"`
	Version string `json:"version"`
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(HealthResponse{
		OK:      true,
		Service: "ytb-go",
		Version: "1.0.0",
	})
}
