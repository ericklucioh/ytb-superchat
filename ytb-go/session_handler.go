package main

import (
	"encoding/json"
	"net/http"
)

func sessionHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		json.NewEncoder(w).Encode(sessions)
	case http.MethodPost:
		var s Session
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		sessions[s.ID] = s
		w.WriteHeader(http.StatusCreated)
	case http.MethodDelete:
		id := r.URL.Query().Get("id")
		delete(sessions, id)
		w.WriteHeader(http.StatusNoContent)
	}
}
