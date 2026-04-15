package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"ytb-go/internal/httpapi"
	"ytb-go/internal/session"
)

func main() {
	port := flag.Int("port", 8080, "Port to listen on")
	flag.Parse()

	sm := session.NewManager()
	router := httpapi.NewRouter(sm)

	addr := fmt.Sprintf(":%d", *port)
	fmt.Printf("ytb-go server starting on http://localhost%s...\n", addr)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
