(function () {
  if (window.__OverlayDashboardPageShimInstalled) {
    return;
  }

  const NativeWebSocket = window.WebSocket;
  const PAGE_EVENT = "overlay-local-chat:event";
  const PAGE_READY_EVENT = "overlay-local-chat:page-ready";

  const feedSockets = new Map();
  const pendingPackets = new Map();

  function cleanSession(value) {
    return String(value || "").replace(/\s+/g, "").trim();
  }

  function parsePacket(data) {
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }

    if (data && typeof data === "object") {
      return data;
    }

    return null;
  }

  function toMessageEvent(socket, data) {
    return {
      type: "message",
      data,
      target: socket,
      currentTarget: socket
    };
  }

  function emit(socket, type, detail) {
    const handler = socket[`on${type}`];
    if (typeof handler === "function") {
      try {
        handler.call(socket, detail);
      } catch {
        //
      }
    }

    const listeners = socket.__listeners?.[type];
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener.call(socket, detail);
        } catch {
          //
        }
      }
    }
  }

  function registerFeedSocket(socket, session) {
    const normalized = cleanSession(session);
    if (!normalized) {
      return;
    }

    let entry = feedSockets.get(normalized);
    if (!entry) {
      entry = new Set();
      feedSockets.set(normalized, entry);
    }

    entry.add(socket);
    socket.__overlaySession = normalized;

    const queued = pendingPackets.get(normalized);
    if (queued && queued.length) {
      pendingPackets.delete(normalized);
      for (const payload of queued) {
        const raw = JSON.stringify(payload);
        const event = toMessageEvent(socket, raw);
        emit(socket, "message", event);
      }
    }
  }

  function unregisterFeedSocket(socket) {
    const session = socket.__overlaySession;
    if (!session) {
      return;
    }

    const entry = feedSockets.get(session);
    if (!entry) {
      return;
    }

    entry.delete(socket);
    if (!entry.size) {
      feedSockets.delete(session);
    }
  }

  function dispatchFeedPacket(session, payload) {
    const normalized = cleanSession(session);
    if (!normalized) {
      return;
    }

    const sockets = feedSockets.get(normalized);
    if (!sockets || !sockets.size) {
      const queued = pendingPackets.get(normalized) || [];
      queued.push(payload);
      pendingPackets.set(normalized, queued);
      return;
    }

    const raw = JSON.stringify(payload);
    for (const socket of sockets) {
      if (socket.readyState !== 1) {
        continue;
      }

      const event = toMessageEvent(socket, raw);
      emit(socket, "message", event);
    }
  }

  window.__OverlayDashboardPageShimInstalled = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || typeof event.data !== "object") {
      return;
    }

    if (event.data.type === PAGE_EVENT) {
      return;
    }

    if (event.data.type === PAGE_READY_EVENT) {
      // No-op: the content script uses this as an availability signal.
    }
  });

  window.postMessage(
    {
      type: PAGE_READY_EVENT,
      session: cleanSession(localStorage.getItem("overlay_room_id") || "")
    },
    window.location.origin
  );
})();
