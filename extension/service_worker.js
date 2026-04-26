if (typeof importScripts === "function") {
  importScripts("sources/logger.js");
}

const BACKLOG_KEY_PREFIX = "chatbridge:backlog:";
const MAX_BACKLOG = 300;

const sessions = new Map();
const workerLogger = globalThis.OverlayLogger && globalThis.OverlayLogger.createLogger
  ? globalThis.OverlayLogger.createLogger("service-worker")
  : null;

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
      replayedDashboards: new WeakSet(),
      stats: {
        published: 0,
        duplicates: 0,
        ignored: 0,
        heartbeats: 0,
        replays: 0,
        hydratedCount: 0,
        lastPacketAt: 0,
        lastAckAt: 0,
        lastReplayAt: 0
      }
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

function sendPortMessage(port, message) {
  if (!port || !message) {
    return false;
  }

  try {
    port.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

function sendAck(port, packet, status) {
  const payload = packet?.payload || {};
  return sendPortMessage(port, {
    type: "ack",
    session: packet?.session || "",
    key: packetKey(packet),
    id: payload.id != null ? payload.id : null,
    packetType: packet?.type || "",
    status: status || "ok"
  });
}

function snapshotState(state) {
  if (!state) {
    return null;
  }

  return {
    session: state.session,
    hydrated: !!state.hydrated,
    backlogSize: state.backlog.length,
    sourceCount: state.sources.size,
    dashboardCount: state.dashboards.size,
    stats: {
      published: state.stats.published,
      duplicates: state.stats.duplicates,
      ignored: state.stats.ignored,
      heartbeats: state.stats.heartbeats,
      replays: state.stats.replays,
      hydratedCount: state.stats.hydratedCount,
      lastPacketAt: state.stats.lastPacketAt,
      lastAckAt: state.stats.lastAckAt,
      lastReplayAt: state.stats.lastReplayAt
    }
  };
}

function sendDiagnostic(port, state, reason, extra = {}) {
  return sendPortMessage(port, {
    type: "diagnostic",
    session: state?.session || "",
    reason: reason || "info",
    snapshot: snapshotState(state),
    extra
  });
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
  state.stats.replays += 1;
  state.stats.lastReplayAt = Date.now();
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
  for (const entry of pending) {
    processSourcePacket(state, entry.port, entry.message);
  }
}

function handlePacket(state, packet) {
  const normalized = normalizePacket(packet, state?.session);
  if (!state || !normalized || normalized.type !== "publish") {
    if (state) {
      state.stats.ignored += 1;
    }
    return { status: "ignored" };
  }

  const key = packetKey(normalized);
  if (key && state.seen.has(key)) {
    state.stats.duplicates += 1;
    return { status: "duplicate", key };
  }

  if (key) {
    state.seen.add(key);
  }

  state.stats.published += 1;
  state.stats.lastPacketAt = Date.now();
  workerLogger?.debug("publish", {
    session: state.session,
    key,
    backlogSize: state.backlog.length + 1
  });
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

  return { status: "stored", key };
}

function processSourcePacket(state, port, message) {
  if (!state || !message || typeof message !== "object") {
    return;
  }

  if (message.type === "heartbeat") {
    state.lastHeartbeatAt = Date.now();
    state.stats.heartbeats += 1;
    workerLogger?.debug("heartbeat", {
      session: state.session,
      sourceCount: state.sources.size
    });
    sendAck(port, {
      type: "heartbeat",
      session: state.session,
      payload: {
        timestamp: message.timestamp || Date.now()
      }
    }, "heartbeat");
    state.stats.lastAckAt = Date.now();
    return;
  }

  const result = handlePacket(state, message);
  if (result.status === "ignored") {
    workerLogger?.debug("ignored", {
      session: state.session,
      packetType: String(message.type || "")
    });
    sendDiagnostic(port, state, "ignored", {
      packetType: String(message.type || "")
    });
    return;
  }

  if (result.status === "duplicate") {
    workerLogger?.debug("duplicate", {
      session: state.session,
      key: result.key || ""
    });
    sendDiagnostic(port, state, "duplicate", {
      key: result.key || ""
    });
  }

  const normalized = normalizePacket(message, state.session);
  if (normalized) {
    sendAck(port, normalized, result.status);
    state.stats.lastAckAt = Date.now();
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
    state.stats.hydratedCount += 1;
    state.hydrating = null;
    workerLogger?.debug("hydrated", {
      session: state.session,
      backlogSize: state.backlog.length,
      sourceCount: state.sources.size,
      dashboardCount: state.dashboards.size
    });

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
      sendDiagnostic(port, state, "hydrated", {
        backlogSize: state.backlog.length
      });
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

  workerLogger?.debug("port-connect", {
    role: info.role,
    session: state.session,
    sources: state.sources.size,
    dashboards: state.dashboards.size
  });

  port.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") {
      return;
    }

    if (info.role === "source") {
      if (message.type === "heartbeat") {
        processSourcePacket(state, port, message);
        return;
      }

      if (!state.hydrated) {
        state.pending.push({ port, message });
        void hydrateSession(state);
        return;
      }

      processSourcePacket(state, port, message);
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
    workerLogger?.debug("port-disconnect", {
      role: info.role,
      session: state.session,
      sources: state.sources.size,
      dashboards: state.dashboards.size
    });
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
    sendDiagnostic(port, state, "dashboard-ready");
    return;
  }

  void hydrateSession(state);
}

chrome.runtime.onConnect.addListener(registerPort);
