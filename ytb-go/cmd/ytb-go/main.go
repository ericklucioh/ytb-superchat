package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"ytb-go/internal/httpapi"
	"ytb-go/internal/session"
	"ytb-go/internal/ws"
)

func main() {
	port := flag.Int("port", 8080, "Port to listen on")
	overlayDirFlag := flag.String("overlay-dir", "", "Directory with overlay assets")
	flag.Parse()

	sm := session.NewManager()
	hub := ws.NewHub(sm)
	overlayDir := resolveOverlayDir(*overlayDirFlag)
	router := httpapi.NewRouter(sm, hub, overlayDir)

	addr := fmt.Sprintf(":%d", *port)
	fmt.Printf("ytb-go server starting on http://localhost%s...\n", addr)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func resolveOverlayDir(flagValue string) string {
	if flagValue != "" {
		return flagValue
	}

	if envValue := os.Getenv("OVERLAY_DIR"); envValue != "" {
		return envValue
	}

	candidates := []string{
		"../extension",
		"extension",
		filepath.Join("..", "..", "extension"),
	}

	for _, candidate := range candidates {
		if fileExists(filepath.Join(candidate, "index.html")) {
			return candidate
		}
	}

	return "../extension"
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
