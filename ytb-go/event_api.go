package main

import (
	"encoding/json"
	"net/http"
)

type Event struct {
	Platform string `json:"platform"`
	Message  string `json:"message"`
}

func eventHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var e Event
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	// Aqui: encaminhar evento para todos os clientes WebSocket
	w.WriteHeader(http.StatusAccepted)
}
