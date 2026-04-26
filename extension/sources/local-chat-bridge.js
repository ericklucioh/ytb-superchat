(function (global) {
  if (global.OverlayLocalChatBridge) {
    return;
  }

  const NativeWebSocket = global.WebSocket;

  function cleanSession(value) {
    return String(value || "").replace(/\s+/g, "").trim();
  }

  function buildPortName(role, session) {
    return `chat-bridge:${role}:${cleanSession(session) || "pending"}`;
  }

  function createChannel({ role, session, onMessage } = {}) {
    const MAX_PENDING_PACKETS = 250;
    const HEARTBEAT_INTERVAL_MS = 15000;
    const ACK_TIMEOUT_MS = 45000;
    const PENDING_STORAGE_PREFIX = "chatbridge:pending:";

    let currentSession = cleanSession(session);
    let port = null;
    let portToken = 0;
    let closed = false;
    let suspended = false;
    let reconnectTimer = null;
    let heartbeatTimer = null;
    let persistTimer = null;
    let reconnectDelay = 150;
    let pendingPackets = [];
    let pendingIndex = new Map();
    let portListeners = null;
    let pendingHydrated = false;
    let pendingHydrating = null;
    let lastAckAt = Date.now();

    function pendingStorageKey(nextSession = currentSession) {
      return `${PENDING_STORAGE_PREFIX}${role}:${cleanSession(nextSession) || "pending"}`;
    }

    function packetKey(packet) {
      const payload = packet?.payload || {};
      const id = payload.id != null ? String(payload.id) : "";
      if (id) {
        return id;
      }

      return [
        packet?.session || "",
        packet?.type || "",
        payload.type || "",
        payload.platform || "",
        payload.chatname || payload.user || "",
        payload.chatmessage || payload.message || "",
        payload.timestamp || ""
      ].join("|");
    }

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

    function clearPersistTimer() {
      if (!persistTimer) {
        return;
      }

      clearTimeout(persistTimer);
      persistTimer = null;
    }

    function resetReconnectDelay() {
      reconnectDelay = 150;
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
        return false;
      }

      try {
        port.postMessage(packet);
        return true;
      } catch {
        return false;
      }
    }

    function normalizePendingPackets(items) {
      if (!Array.isArray(items)) {
        return [];
      }

      return items
        .filter((packet) => packet && typeof packet === "object" && packet.type === "publish")
        .slice(-MAX_PENDING_PACKETS);
    }

    function queuePersistPending() {
      if (role !== "source") {
        return;
      }

      if (persistTimer) {
        return;
      }

      persistTimer = setTimeout(() => {
        persistTimer = null;
        void persistPending().catch(() => {});
      }, 0);
    }

    async function persistPending() {
      if (role !== "source" || !chrome?.storage?.local || !currentSession) {
        return;
      }

      const key = pendingStorageKey();
      const snapshot = pendingPackets.slice(-MAX_PENDING_PACKETS);
      try {
        if (!snapshot.length) {
          await chrome.storage.local.remove(key);
          return;
        }

        await chrome.storage.local.set({ [key]: snapshot });
      } catch {
        //
      }
    }

    async function hydratePendingPackets() {
      if (role !== "source" || pendingHydrated) {
        return pendingHydrating || Promise.resolve(pendingPackets);
      }

      if (pendingHydrating) {
        return pendingHydrating;
      }

      pendingHydrating = (async () => {
        const sessionKey = currentSession;
        try {
          if (chrome?.storage?.local && sessionKey) {
            const result = await chrome.storage.local.get(pendingStorageKey(sessionKey));
            const loadedPackets = normalizePendingPackets(result?.[pendingStorageKey(sessionKey)]);
            if (sessionKey === currentSession && loadedPackets.length) {
              for (const packet of loadedPackets) {
                const key = packetKey(packet);
                if (key && pendingIndex.has(key)) {
                  continue;
                }

                pendingPackets.push(packet);
                if (key) {
                  pendingIndex.set(key, packet);
                }
              }
            }
          }
        } catch {
          //
        }

        pendingHydrated = true;
        pendingHydrating = null;
        return pendingPackets;
      })();

      return pendingHydrating;
    }

    function dropPendingByKey(key) {
      if (!key || !pendingIndex.has(key)) {
        return false;
      }

      pendingIndex.delete(key);
      pendingPackets = pendingPackets.filter((packet) => packetKey(packet) !== key);
      queuePersistPending();
      return true;
    }

    function registerPendingPacket(packet) {
      if (role !== "source" || !packet || typeof packet !== "object") {
        return packet;
      }

      const key = packetKey(packet);
      if (key && pendingIndex.has(key)) {
        return pendingIndex.get(key);
      }

      pendingPackets.push(packet);
      if (key) {
        pendingIndex.set(key, packet);
      }

      if (pendingPackets.length > MAX_PENDING_PACKETS) {
        const trimmed = pendingPackets.splice(0, pendingPackets.length - MAX_PENDING_PACKETS);
        for (const item of trimmed) {
          const itemKey = packetKey(item);
          if (itemKey) {
            pendingIndex.delete(itemKey);
          }
        }
      }

      queuePersistPending();
      return packet;
    }

    function flushPending() {
      if (!port || !pendingPackets.length) {
        return;
      }

      const queue = pendingPackets.slice();
      for (let index = 0; index < queue.length; index += 1) {
        if (!sendRawPacket(queue[index])) {
          disconnectPort();
          scheduleReconnect();
          break;
        }
      }
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

      if (cleanSession(message.session || "") && cleanSession(message.session || "") !== currentSession) {
        return false;
      }

      lastAckAt = Date.now();

      if (message.packetType === "heartbeat") {
        return true;
      }

      const key = String(message.key || message.id || "");
      if (!key) {
        return true;
      }

      return dropPendingByKey(key);
    }

    function sendHeartbeat() {
      if (closed || suspended || role !== "source" || !port) {
        return false;
      }

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
          if (pendingPackets.length) {
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
        if (role !== "source" || pendingHydrated) {
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
        void hydratePendingPackets().then(() => {
          if (!closed && port === nextPort) {
            flushPending();
          }
        });
        if (role !== "source" || pendingHydrated) {
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

      registerPendingPacket(packet);

      const hadPort = !!port;
      const shouldSendImmediately = role !== "source" || pendingHydrated;
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

    function send(payload) {
      return publish(payload);
    }

    function subscribe(handler) {
      onMessage = handler;
      return channel;
    }

    function resetPendingState() {
      pendingPackets = [];
      pendingIndex.clear();
      pendingHydrated = false;
      pendingHydrating = null;
      clearPersistTimer();
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

      resetPendingState();
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
      clearPersistTimer();
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
      send,
      subscribe,
      setSession,
      get session() {
        return currentSession;
      }
    };

    void hydratePendingPackets();
    return channel;
  }

  function installLegacyOverlaySocketShim() {
    if (global.__OverlayLegacySocketShimInstalled || typeof NativeWebSocket !== "function") {
      return;
    }

    global.__OverlayLegacySocketShimInstalled = true;

    function isLegacyOverlayUrl(url) {
      const value = String(url || "");
      return value.includes("ytb.ericklucioh.com");
    }

    function createSocketEvent(type, socket, detail) {
      return {
        type,
        target: socket,
        currentTarget: socket,
        detail
      };
    }

    function createShimSocket(url) {
      let currentSession = "";
      let bridge = null;
      let closed = false;
      let opened = false;
      const listeners = {
        open: new Set(),
        message: new Set(),
        close: new Set(),
        error: new Set()
      };
      const pendingPackets = [];

      function emit(type, detail) {
        const event = createSocketEvent(type, socket, detail);
        const handler = socket[`on${type}`];
        if (typeof handler === "function") {
          try {
            handler.call(socket, event);
          } catch {
            //
          }
        }

        for (const listener of listeners[type] || []) {
          try {
            listener.call(socket, event);
          } catch {
            //
          }
        }
      }

      function ensureBridge() {
        const session = cleanSession(currentSession);
        if (!session || !global.OverlayLocalChatBridge || !global.OverlayLocalChatBridge.createChannel) {
          return null;
        }

        if (!bridge) {
          bridge = global.OverlayLocalChatBridge.createChannel({
            role: "source",
            session
          });
          bridge.connect();
        } else if (bridge.session !== session) {
          bridge.setSession(session);
        }

        return bridge;
      }

      function flushPending() {
        if (!bridge || !pendingPackets.length) {
          return;
        }

        const queue = pendingPackets.splice(0);
        for (const packet of queue) {
          bridge.publish(packet);
        }
      }

      const socket = {
        binaryType: "blob",
        bufferedAmount: 0,
        extensions: "",
        protocol: "",
        url,
        get readyState() {
          if (closed) {
            return 3;
          }
          return opened ? 1 : 0;
        },
        send(data) {
          if (closed) {
            throw new DOMException("WebSocket is closed.", "InvalidStateError");
          }

          let packet = null;
          if (typeof data === "string") {
            try {
              packet = JSON.parse(data);
            } catch {
              packet = null;
            }
          } else if (data && typeof data === "object") {
            packet = data;
          }

          if (!packet || typeof packet !== "object") {
            return;
          }

          if (packet.join) {
            currentSession = cleanSession(packet.join);
            ensureBridge();
            flushPending();
            return;
          }

          if (packet.session && !currentSession) {
            currentSession = cleanSession(packet.session);
          }

          if (packet.msg && !packet.feed) {
            packet = {
              ...packet,
              feed: true
            };
          }

          const activeBridge = ensureBridge();
          if (!activeBridge) {
            pendingPackets.push(packet);
            return;
          }

          activeBridge.publish(packet);
        },
        close() {
          if (closed) {
            return;
          }

          closed = true;
          if (bridge) {
            bridge.close();
            bridge = null;
          }
          emit("close");
        },
        addEventListener(type, listener) {
          if (listeners[type]) {
            listeners[type].add(listener);
          }
        },
        removeEventListener(type, listener) {
          if (listeners[type]) {
            listeners[type].delete(listener);
          }
        },
        dispatchEvent(event) {
          if (!event || !event.type || !listeners[event.type]) {
            return true;
          }

          for (const listener of listeners[event.type]) {
            try {
              listener.call(socket, event);
            } catch {
              //
            }
          }
          return true;
        },
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null
      };

      queueMicrotask(() => {
        if (closed) {
          return;
        }
        opened = true;
        emit("open");
      });

      return socket;
    }

    function LegacyOverlayWebSocket(url, protocols) {
      if (!(this instanceof LegacyOverlayWebSocket)) {
        return new NativeWebSocket(url, protocols);
      }

      if (!isLegacyOverlayUrl(url)) {
        return new NativeWebSocket(url, protocols);
      }

      return createShimSocket(url);
    }

    LegacyOverlayWebSocket.prototype = NativeWebSocket.prototype;
    Object.setPrototypeOf(LegacyOverlayWebSocket, NativeWebSocket);
    global.WebSocket = LegacyOverlayWebSocket;
  }

  global.OverlayLocalChatBridge = {
    createChannel
  };

  installLegacyOverlaySocketShim();
})(window);
