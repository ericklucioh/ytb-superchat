APP_NAME := ytb-go
MAIN_PKG := ./cmd/ytb-go
BIN_DIR := bin
BIN := $(BIN_DIR)/$(APP_NAME)
PORT ?= 8080
GOCACHE ?= /tmp/gocache
GOMODCACHE ?= /tmp/gomodcache

.PHONY: all build run test fmt clean

all: build

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

build: $(BIN_DIR)
	GOCACHE=$(GOCACHE) GOMODCACHE=$(GOMODCACHE) go build -o $(BIN) $(MAIN_PKG)

run:
	GOCACHE=$(GOCACHE) GOMODCACHE=$(GOMODCACHE) go run $(MAIN_PKG) -port $(PORT)

test:
	GOCACHE=$(GOCACHE) GOMODCACHE=$(GOMODCACHE) go test ./...

fmt:
	go fmt ./...

clean:
	rm -rf $(BIN_DIR)
