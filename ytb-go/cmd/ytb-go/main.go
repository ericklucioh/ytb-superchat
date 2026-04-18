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
	port := flag.Int("port", resolveDefaultGoPort(), "Port to listen on")
	overlayDirFlag := flag.String("overlay-dir", "", "Directory with overlay assets")
	flag.Parse()

	sm := session.NewManager()
	hub := ws.NewHub(sm)
	overlayDir := resolveOverlayDir(*overlayDirFlag)
	log.Printf("[go:main] overlayDir=%q", overlayDir)
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

	if envValue := firstEnv("YTB_OVERLAY_DIR", "OVERLAY_DIR"); envValue != "" {
		return envValue
	}

	candidates := []string{
		"../src/overlay",
		"src/overlay",
		"../out/portal/overlay",
		"out/portal/overlay",
	}

	for _, candidate := range candidates {
		if fileExists(filepath.Join(candidate, "index.html")) {
			return candidate
		}
	}

	return "../src/overlay"
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func resolveDefaultGoPort() int {
	for _, key := range []string{"YTB_GO_PORT", "GO_PORT"} {
		if value := os.Getenv(key); value != "" {
			var port int
			if _, err := fmt.Sscanf(value, "%d", &port); err == nil && port > 0 {
				return port
			}
		}
	}

	return 8080
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if value := os.Getenv(key); value != "" {
			return value
		}
	}

	return ""
}
