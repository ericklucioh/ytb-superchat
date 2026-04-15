package main

import (
	"log"
	"net/http"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{}
var wsClients = make(map[*websocket.Conn]bool)

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	wsClients[conn] = true
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			delete(wsClients, conn)
			conn.Close()
			break
		}
		// Broadcast to all clients
		for c := range wsClients {
			c.WriteMessage(websocket.TextMessage, msg)
		}
	}
}
