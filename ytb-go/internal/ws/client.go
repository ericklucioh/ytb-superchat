package ws

import (
	"bufio"
	"bytes"
	"encoding/json"
	"net"
	"sync"
)

type wsPacket struct {
	Join     string          `json:"join,omitempty"`
	Session  string          `json:"session,omitempty"`
	Msg      bool            `json:"msg,omitempty"`
	Contents json.RawMessage `json:"contents,omitempty"`
}

type Client struct {
	hub    *Hub
	conn   net.Conn
	reader *bufio.Reader
	writer *bufio.Writer

	send chan []byte
	done chan struct{}

	mu   sync.RWMutex
	room string
	once sync.Once
}

func newClient(hub *Hub, conn net.Conn, reader *bufio.Reader, writer *bufio.Writer) *Client {
	return &Client{
		hub:    hub,
		conn:   conn,
		reader: reader,
		writer: writer,
		send:   make(chan []byte, 16),
		done:   make(chan struct{}),
	}
}

func (c *Client) serve() {
	go c.writeLoop()
	c.readLoop()
	c.close()
}

func (c *Client) readLoop() {
	for {
		opcode, payload, err := readFrame(c.reader)
		if err != nil {
			return
		}

		switch opcode {
		case opcodeText:
			c.handlePacket(payload)
		case opcodeClose:
			return
		case opcodePing:
			continue
		default:
			continue
		}
	}
}

func (c *Client) writeLoop() {
	defer c.close()

	for {
		select {
		case <-c.done:
			return
		case payload := <-c.send:
			if payload == nil {
				continue
			}
			if err := writeFrame(c.writer, opcodeText, payload); err != nil {
				return
			}
			if err := c.writer.Flush(); err != nil {
				return
			}
		}
	}
}

func (c *Client) handlePacket(payload []byte) {
	var packet wsPacket
	if err := json.Unmarshal(payload, &packet); err != nil {
		return
	}

	if room := cleanSession(packet.Join); room != "" {
		c.hub.join(c, room)
		return
	}

	room := cleanSession(packet.Session)
	if room == "" {
		room = c.currentRoom()
	}
	if room == "" {
		return
	}

	c.hub.Publish(room, payload, isClearContents(packet.Contents))
}

func (c *Client) enqueue(payload []byte) {
	if len(payload) == 0 {
		return
	}

	select {
	case <-c.done:
		return
	default:
	}

	copyPayload := append([]byte(nil), payload...)
	select {
	case c.send <- copyPayload:
	default:
	}
}

func (c *Client) close() {
	c.once.Do(func() {
		close(c.done)
		c.hub.leave(c)
		if c.conn != nil {
			_ = c.conn.Close()
		}
	})
}

func (c *Client) setRoom(room string) {
	c.mu.Lock()
	c.room = room
	c.mu.Unlock()
}

func (c *Client) currentRoom() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.room
}

func isClearContents(contents json.RawMessage) bool {
	trimmed := bytes.TrimSpace(contents)
	return len(trimmed) == 0 || bytes.Equal(trimmed, []byte("false")) || bytes.Equal(trimmed, []byte("null"))
}
