package ws

import "testing"

func TestClientEnqueueTracksDroppedPackets(t *testing.T) {
	hub := NewHub(nil)
	client := newClient(hub, nil, nil, nil)
	client.send = make(chan []byte, 1)

	client.enqueue([]byte(`{"id":"1"}`))
	client.enqueue([]byte(`{"id":"2"}`))

	if got := client.droppedPackets(); got != 1 {
		t.Fatalf("expected one dropped packet, got %d", got)
	}
}

func TestHubSnapshotIncludesDroppedPackets(t *testing.T) {
	hub := NewHub(nil)
	client := newClient(hub, nil, nil, nil)
	client.send = make(chan []byte, 1)

	hub.join(client, "room-1")
	client.enqueue([]byte(`{"id":"1"}`))
	client.enqueue([]byte(`{"id":"2"}`))

	snapshot := hub.Snapshot("room-1")
	if snapshot.DroppedPackets != 1 {
		t.Fatalf("expected snapshot to include dropped packets, got %d", snapshot.DroppedPackets)
	}
}
