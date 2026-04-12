const BACKLOG_KEY_PREFIX = "chatbridge:backlog:";
const MAX_BACKLOG = 300;

const sessions = new Map();

function cleanSession(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function backlogKey(session) {
  return `${BACKLOG_KEY_PREFIX}${cleanSession(session)}`;
}

function ensureSessionState(session) {
  const normalized = cleanSession(session);
  if (!normalized) {
    return null;
  }

  let state = sessions.get(normalized);
  if (!state) {
    state = {
      session: normalized,
      sources: new Set(),
      dashboards: new Set(),
      backlog: [],
      seen: new Set(),
      hydrated: false,
      hydrating: null,
      pending: [],
      replayedDashboards: new WeakSet()
    };
    sessions.set(normalized, state);
  }

  return state;
}

function getPortRole(name) {
  const parts = String(name || "").split(":");
  if (parts.length < 3 || parts[0] !== "chat-bridge") {
    return null;
  }

  return {
    role: parts[1] || "",
    session: cleanSession(parts.slice(2).join(":"))
  };
}

function cloneBacklogItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(-MAX_BACKLOG);
}

function normalizePacket(packet, session) {
  if (!packet || typeof packet !== "object") {
    return null;
  }

  const payload = packet.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const packetSession = cleanSession(packet.session || session);
  if (!packetSession) {
    return null;
  }

  return {
    type: String(packet.type || ""),
    session: packetSession,
    payload
  };
}

function packetKey(packet) {
  const payload = packet?.payload || {};
  const id = payload.id != null ? String(payload.id) : "";
  if (id) {
    return id;
  }

  return [
    packet?.session || "",
    payload.type || "",
    payload.platform || "",
    payload.chatname || payload.user || "",
    payload.chatmessage || payload.message || "",
    payload.timestamp || ""
  ].join("|");
}

async function readBacklog(session) {
  const key = backlogKey(session);
  if (!chrome?.storage?.session) {
    return [];
  }

  const result = await chrome.storage.session.get(key);
  return cloneBacklogItems(result?.[key]);
}

async function writeBacklog(session, backlog) {
  const key = backlogKey(session);
  if (!chrome?.storage?.session) {
    return;
  }

  const value = Array.isArray(backlog) ? backlog.slice(-MAX_BACKLOG) : [];
  await chrome.storage.session.set({ [key]: value });
}

function replayBacklogToPort(state, port) {
  if (!state || !port || state.replayedDashboards.has(port)) {
    return;
  }

  state.replayedDashboards.add(port);
  for (const packet of state.backlog) {
    try {
      port.postMessage({
        type: "publish",
        session: state.session,
        payload: packet.payload
      });
    } catch {
      //
    }
  }
}

function flushPending(state) {
  if (!state || !state.pending.length) {
    return;
  }

  const pending = state.pending.splice(0);
  for (const packet of pending) {
    handlePacket(state, packet);
  }
}

function handlePacket(state, packet) {
  const normalized = normalizePacket(packet, state?.session);
  if (!state || !normalized || normalized.type !== "publish") {
    return;
  }

  const key = packetKey(normalized);
  if (key && state.seen.has(key)) {
    return;
  }

  if (key) {
    state.seen.add(key);
  }

  state.backlog.push(normalized);
  if (state.backlog.length > MAX_BACKLOG) {
    state.backlog.splice(0, state.backlog.length - MAX_BACKLOG);
  }

  void writeBacklog(state.session, state.backlog).catch(() => {});

  for (const port of state.dashboards) {
    try {
      port.postMessage({
        type: "publish",
        session: state.session,
        payload: normalized.payload
      });
    } catch {
      //
    }
  }
}

async function hydrateSession(state) {
  if (!state) {
    return null;
  }

  if (state.hydrated) {
    return state;
  }

  if (state.hydrating) {
    return state.hydrating;
  }

  state.hydrating = (async () => {
    try {
      const backlog = await readBacklog(state.session);
      state.backlog = backlog;
      state.seen.clear();
      for (const packet of backlog) {
        const key = packetKey(packet);
        if (key) {
          state.seen.add(key);
        }
      }
    } catch {
      state.backlog = [];
      state.seen.clear();
    }

    state.hydrated = true;
    state.hydrating = null;

    for (const port of state.dashboards) {
      replayBacklogToPort(state, port);
      try {
        port.postMessage({
          type: "ready",
          session: state.session
        });
      } catch {
        //
      }
    }

    flushPending(state);
    return state;
  })();

  return state.hydrating;
}

function registerPort(port) {
  const info = getPortRole(port.name);
  if (!info || !info.role || !info.session) {
    try {
      port.disconnect();
    } catch {
      //
    }
    return;
  }

  const state = ensureSessionState(info.session);
  if (!state) {
    try {
      port.disconnect();
    } catch {
      //
    }
    return;
  }

  if (info.role === "source") {
    state.sources.add(port);
  } else if (info.role === "dashboard") {
    state.dashboards.add(port);
  } else {
    try {
      port.disconnect();
    } catch {
      //
    }
    return;
  }

  port.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") {
      return;
    }

    if (info.role === "source") {
      if (!state.hydrated) {
        state.pending.push(message);
        void hydrateSession(state);
        return;
      }

      handlePacket(state, message);
      return;
    }

    if (message.type === "set-session") {
      const nextSession = cleanSession(message.session || "");
      if (nextSession && nextSession !== state.session) {
        state.dashboards.delete(port);
        const nextState = ensureSessionState(nextSession);
        if (nextState) {
          nextState.dashboards.add(port);
          void hydrateSession(nextState);
        }
      }
    }
  });

  port.onDisconnect.addListener(() => {
    if (info.role === "source") {
      state.sources.delete(port);
    } else if (info.role === "dashboard") {
      state.dashboards.delete(port);
    }
  });

  if (info.role === "dashboard" && state.hydrated) {
    replayBacklogToPort(state, port);
    try {
      port.postMessage({
        type: "ready",
        session: state.session
      });
    } catch {
      //
    }
    return;
  }

  void hydrateSession(state);
}

chrome.runtime.onConnect.addListener(registerPort);
