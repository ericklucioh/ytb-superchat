package ws

import (
	"bufio"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
)

const (
	opcodeContinuation = 0x0
	opcodeText         = 0x1
	opcodeClose        = 0x8
	opcodePing         = 0x9
	opcodePong         = 0xA
	wsMagicGUID        = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
)

func upgradeWebSocket(w http.ResponseWriter, r *http.Request) (net.Conn, *bufio.Reader, *bufio.Writer, bool, error) {
	if r.Method != http.MethodGet {
		return nil, nil, nil, false, errors.New("websocket requires GET")
	}

	if !headerHasToken(r.Header, "Connection", "upgrade") || !headerHasToken(r.Header, "Upgrade", "websocket") {
		return nil, nil, nil, false, errors.New("invalid websocket upgrade request")
	}

	key := strings.TrimSpace(r.Header.Get("Sec-WebSocket-Key"))
	if key == "" {
		return nil, nil, nil, false, errors.New("missing sec-websocket-key")
	}

	hijacker, ok := w.(http.Hijacker)
	if !ok {
		return nil, nil, nil, false, errors.New("response writer does not support hijacking")
	}

	conn, rw, err := hijacker.Hijack()
	if err != nil {
		return nil, nil, nil, false, err
	}

	accept := computeAcceptKey(key)
	response := "HTTP/1.1 101 Switching Protocols\r\n" +
		"Upgrade: websocket\r\n" +
		"Connection: Upgrade\r\n" +
		"Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
	if _, err := rw.WriteString(response); err != nil {
		_ = conn.Close()
		return nil, nil, nil, true, err
	}
	if err := rw.Flush(); err != nil {
		_ = conn.Close()
		return nil, nil, nil, true, err
	}

	return conn, bufio.NewReader(conn), bufio.NewWriter(conn), true, nil
}

func headerHasToken(header http.Header, key, token string) bool {
	for _, value := range header.Values(key) {
		for _, part := range strings.Split(value, ",") {
			if strings.EqualFold(strings.TrimSpace(part), token) {
				return true
			}
		}
	}
	return false
}

func computeAcceptKey(key string) string {
	sum := sha1.Sum([]byte(key + wsMagicGUID))
	return base64.StdEncoding.EncodeToString(sum[:])
}

func readFrame(r *bufio.Reader) (byte, []byte, error) {
	header := make([]byte, 2)
	if _, err := io.ReadFull(r, header); err != nil {
		return 0, nil, err
	}

	fin := header[0]&0x80 != 0
	opcode := header[0] & 0x0f
	masked := header[1]&0x80 != 0
	length := int64(header[1] & 0x7f)

	if !fin {
		return 0, nil, errors.New("fragmented websocket frames are not supported")
	}

	switch length {
	case 126:
		ext := make([]byte, 2)
		if _, err := io.ReadFull(r, ext); err != nil {
			return 0, nil, err
		}
		length = int64(binary.BigEndian.Uint16(ext))
	case 127:
		ext := make([]byte, 8)
		if _, err := io.ReadFull(r, ext); err != nil {
			return 0, nil, err
		}
		length = int64(binary.BigEndian.Uint64(ext))
	}

	if length < 0 {
		return 0, nil, fmt.Errorf("invalid websocket payload length: %d", length)
	}

	var maskKey [4]byte
	if masked {
		if _, err := io.ReadFull(r, maskKey[:]); err != nil {
			return 0, nil, err
		}
	}

	payload := make([]byte, length)
	if _, err := io.ReadFull(r, payload); err != nil {
		return 0, nil, err
	}

	if masked {
		for i := range payload {
			payload[i] ^= maskKey[i%4]
		}
	}

	switch opcode {
	case opcodeText, opcodeClose, opcodePing, opcodePong:
		return opcode, payload, nil
	default:
		return opcode, payload, nil
	}
}

func writeFrame(w *bufio.Writer, opcode byte, payload []byte) error {
	header := []byte{0x80 | (opcode & 0x0f)}
	length := len(payload)

	switch {
	case length < 126:
		header = append(header, byte(length))
	case length <= 0xffff:
		header = append(header, 126, 0, 0)
		binary.BigEndian.PutUint16(header[len(header)-2:], uint16(length))
	default:
		header = append(header, 127, 0, 0, 0, 0, 0, 0, 0, 0)
		binary.BigEndian.PutUint64(header[len(header)-8:], uint64(length))
	}

	if _, err := w.Write(header); err != nil {
		return err
	}
	if _, err := w.Write(payload); err != nil {
		return err
	}
	return nil
}
