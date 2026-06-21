(function (global) {
  if (global.OverlayLocalChatBridge) {
    return;
  }

  const runtimeHelpers = global.OverlayBridgeChannelHelpers || {};
  const cleanSession = runtimeHelpers.cleanSession || ((value) => String(value || "").replace(/\s+/g, "").trim());
  const buildPortName = runtimeHelpers.buildPortName || ((role, session) => `chat-bridge:${role}:${cleanSession(session) || "pending"}`);
  const createPendingQueue = runtimeHelpers.createPendingQueue;
  const NativeWebSocket = global.WebSocket;
  const bridgeLogger = global.OverlayLogger && global.OverlayLogger.createLogger
    ? global.OverlayLogger.createLogger("local-bridge")
    : null;

  function createChannel({ role, session, onMessage } = {}) {
    const HEARTBEAT_INTERVAL_MS = 15000;
    const ACK_TIMEOUT_MS = 45000;

    let currentSession = cleanSession(session);
    let port = null;
    let portToken = 0;
    let closed = false;
    let suspended = false;
    let reconnectTimer = null;
    let heartbeatTimer = null;
    let reconnectDelay = 150;
    let portListeners = null;
    let lastAckAt = Date.now();
    const diagnostics = {
      role,
      session: currentSession,
      sent: 0,
      acks: 0,
      heartbeatAcks: 0,
      reconnects: 0,
      reconnectFailures: 0,
      sendFailures: 0,
      hydrationCount: 0,
      pendingSize: 0,
      lastAckAt,
      lastReconnectAt: 0,
      lastError: ""
    };

    const pendingQueue = createPendingQueue({
      role,
      chromeStorageLocal: chrome?.storage?.local,
      getCurrentSession: () => currentSession,
      emitDiagnostic
    });

    function clearReconnectTimer() {
      if (!reconnectTimer) {
        return;
      }

      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    function clearHeartbeatTimer() {
      if (!heartbeatTimer) {
        return;
      }

      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    function resetReconnectDelay() {
      reconnectDelay = 150;
    }

    function snapshotDiagnostics(reason = "") {
      diagnostics.role = role;
      diagnostics.session = currentSession;
      diagnostics.pendingSize = pendingQueue.getPendingSize();
      diagnostics.lastAckAt = lastAckAt;
      return {
        ...diagnostics,
        reason
      };
    }

    function emitDiagnostic(reason, extra = {}) {
      bridgeLogger?.debug(reason, {
        role,
        session: currentSession,
        pendingSize: pendingQueue.getPendingSize(),
        extra
      });

      if (reason === "hydrated") {
        diagnostics.hydrationCount += 1;
      }

      if (typeof onMessage !== "function") {
        return;
      }

      try {
        onMessage({
          type: "diagnostic",
          session: currentSession,
          reason,
          snapshot: snapshotDiagnostics(reason),
          extra
        });
      } catch {
        //
      }
    }

    function detachPortListeners(nextPort, listeners) {
      if (!nextPort || !listeners) {
        return;
      }

      try {
        nextPort.onMessage.removeListener(listeners.onMessage);
      } catch {
        //
      }

      try {
        nextPort.onDisconnect.removeListener(listeners.onDisconnect);
      } catch {
        //
      }
    }

    function scheduleReconnect() {
      if (closed || suspended || reconnectTimer || port) {
        return;
      }

      diagnostics.reconnects += 1;
      diagnostics.lastReconnectAt = Date.now();
      bridgeLogger?.debug("schedule-reconnect", {
        role,
        session: currentSession,
        delay: reconnectDelay
      });

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (closed || suspended || port) {
          return;
        }
        connect();
      }, reconnectDelay);

      reconnectDelay = Math.min(reconnectDelay * 2, 2000);
    }

    function sendRawPacket(packet) {
      if (!port) {
        diagnostics.sendFailures += 1;
        diagnostics.lastError = "no_port";
        return false;
      }

      try {
        port.postMessage(packet);
        diagnostics.sent += 1;
        bridgeLogger?.debug("send", {
          role,
          session: currentSession,
          type: packet?.type || "",
          pendingSize: pendingQueue.getPendingSize()
        });
        return true;
      } catch {
        diagnostics.sendFailures += 1;
        diagnostics.lastError = "postMessage_failed";
        return false;
      }
    }

    function flushPending() {
      if (!port) {
        return;
      }

      pendingQueue.flushPending(sendRawPacket, () => {
        disconnectPort();
        scheduleReconnect();
      });
    }

    function disconnectPort() {
      if (!port) {
        clearReconnectTimer();
        return;
      }

      const nextPort = port;
      const listeners = portListeners;
      port = null;
      portToken = 0;
      portListeners = null;
      clearReconnectTimer();
      detachPortListeners(nextPort, listeners);
      bridgeLogger?.debug("disconnect", {
        role,
        session: currentSession,
        pendingSize: pendingQueue.getPendingSize()
      });

      try {
        nextPort.disconnect();
      } catch {
        //
      }
    }

    function handleAck(message) {
      if (!message || typeof message !== "object") {
        return false;
      }

      const messageSession = cleanSession(message.session || "");
      if (messageSession && messageSession !== currentSession) {
        return false;
      }

      lastAckAt = Date.now();
      diagnostics.lastAckAt = lastAckAt;
      bridgeLogger?.debug("ack", {
        role,
        session: currentSession,
        packetType: message.packetType || "",
        key: String(message.key || message.id || "")
      });

      if (message.packetType === "heartbeat") {
        diagnostics.heartbeatAcks += 1;
        return true;
      }

      const key = String(message.key || message.id || "");
      if (!key) {
        return true;
      }

      const removed = pendingQueue.dropPendingByKey(key);
      if (removed) {
        diagnostics.acks += 1;
      }
      return removed;
    }

    function sendHeartbeat() {
      if (closed || suspended || role !== "source" || !port) {
        return false;
      }

      bridgeLogger?.debug("heartbeat", {
        role,
        session: currentSession,
        pendingSize: pendingQueue.getPendingSize()
      });

      return sendRawPacket({
        type: "heartbeat",
        session: currentSession,
        timestamp: Date.now()
      });
    }

    function startHeartbeatTimer() {
      if (role !== "source" || heartbeatTimer || closed) {
        return;
      }

      heartbeatTimer = setInterval(() => {
        if (closed || suspended) {
          return;
        }

        if (!port) {
          if (pendingQueue.getPendingSize()) {
            scheduleReconnect();
          }
          return;
        }

        if (Date.now() - lastAckAt > ACK_TIMEOUT_MS) {
          disconnectPort();
          scheduleReconnect();
          return;
        }

        if (!sendHeartbeat()) {
          disconnectPort();
          scheduleReconnect();
        }
      }, HEARTBEAT_INTERVAL_MS);
    }

    function connect() {
      if (closed || typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.connect) {
        return null;
      }

      if (port) {
        if (role !== "source" || pendingQueue.isHydrated()) {
          flushPending();
        }
        return port;
      }

      if (!currentSession) {
        return null;
      }

      try {
        const nextPort = chrome.runtime.connect({ name: buildPortName(role, currentSession) });
        port = nextPort;
        portToken += 1;
        suspended = false;
        bridgeLogger?.debug("connect", {
          role,
          session: currentSession,
          pendingSize: pendingQueue.getPendingSize()
        });

        const token = portToken;
        const listeners = {
          onMessage(message) {
            if (closed || token !== portToken || port !== nextPort) {
              return;
            }

            if (message && typeof message === "object" && message.type === "ack") {
              handleAck(message);
              return;
            }

            if (message && typeof message === "object" && message.type === "diagnostic") {
              diagnostics.lastError = String(message.reason || diagnostics.lastError || "");
              if (typeof onMessage === "function") {
                onMessage(message);
              }
              return;
            }

            if (typeof onMessage === "function") {
              onMessage(message);
            }
          },
          onDisconnect() {
            if (closed || token !== portToken || port !== nextPort) {
              return;
            }

            detachPortListeners(nextPort, listeners);
            port = null;
            portListeners = null;
            diagnostics.reconnectFailures += 1;
            bridgeLogger?.debug("port-disconnect", {
              role,
              session: currentSession,
              pendingSize: pendingQueue.getPendingSize()
            });

            if (!suspended) {
              scheduleReconnect();
            }
          }
        };

        portListeners = listeners;
        nextPort.onMessage.addListener(listeners.onMessage);
        nextPort.onDisconnect.addListener(listeners.onDisconnect);
        resetReconnectDelay();
        clearReconnectTimer();
        lastAckAt = Date.now();
        void pendingQueue.hydratePendingPackets().then(() => {
          if (!closed && port === nextPort) {
            flushPending();
          }
        });
        if (role !== "source" || pendingQueue.isHydrated()) {
          flushPending();
        }
        startHeartbeatTimer();
        return nextPort;
      } catch {
        port = null;
        portListeners = null;
        scheduleReconnect();
        return null;
      }
    }

    function publish(payload) {
      if (closed) {
        return false;
      }

      const packet = {
        type: "publish",
        session: currentSession,
        payload
      };

      pendingQueue.registerPendingPacket(packet);
      bridgeLogger?.debug("publish", {
        role,
        session: currentSession,
        packetId: packet?.payload?.id || "",
        pendingSize: pendingQueue.getPendingSize()
      });

      const hadPort = !!port;
      const shouldSendImmediately = role !== "source" || pendingQueue.isHydrated();
      if (!hadPort && !connect()) {
        return false;
      }

      if (shouldSendImmediately && hadPort && !sendRawPacket(packet)) {
        disconnectPort();
        scheduleReconnect();
        return false;
      }

      return true;
    }

    function subscribe(handler) {
      onMessage = handler;
      return channel;
    }

    function setSession(nextSession) {
      const normalized = cleanSession(nextSession);
      if (!normalized) {
        return currentSession;
      }

      const changed = normalized !== currentSession;
      currentSession = normalized;

      if (!changed) {
        if (!port) {
          connect();
        }
        return currentSession;
      }

      pendingQueue.resetPendingState();
      if (port) {
        disconnectPort();
      }
      connect();
      return currentSession;
    }

    function suspend() {
      if (closed) {
        return;
      }

      suspended = true;
      disconnectPort();
    }

    function resume() {
      if (closed) {
        return;
      }

      suspended = false;
      connect();
    }

    function close() {
      closed = true;
      clearHeartbeatTimer();
      pendingQueue.clearPersistTimer();
      clearReconnectTimer();
      disconnectPort();
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    }

    function handlePageHide() {
      suspend();
    }

    function handlePageShow() {
      if (!suspended) {
        return;
      }

      resume();
    }

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    const channel = {
      connect,
      close,
      publish,
      send(payload) {
        return publish(payload);
      },
      subscribe,
      setSession,
      getDiagnostics() {
        return snapshotDiagnostics("snapshot");
      },
      get session() {
        return currentSession;
      }
    };

    void pendingQueue.hydratePendingPackets();
    return channel;
  }

  global.OverlayLocalChatBridge = {
    createChannel
  };

  global.OverlayBridgeLegacySocketShim?.installLegacyOverlaySocketShim({
    NativeWebSocket,
    cleanSession,
    createChannel
  });
})(window);
