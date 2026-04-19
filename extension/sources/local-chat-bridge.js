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
    let currentSession = cleanSession(session);
    let port = null;
    let closed = false;
    let suspended = false;

    function attachPort(nextPort) {
      if (!nextPort) {
        return;
      }

      nextPort.onMessage.addListener((message) => {
        if (closed) {
          return;
        }
        if (typeof onMessage === "function") {
          onMessage(message);
        }
      });
    }

    function disconnectPort() {
      if (!port) {
        return;
      }

      try {
        port.disconnect();
      } catch {
        //
      }
      port = null;
    }

    function connect() {
      if (closed || typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.connect) {
        return null;
      }

      if (port && (port.disconnected || port.error)) {
        disconnectPort();
      }

      if (port) {
        disconnectPort();
      }

      try {
        port = chrome.runtime.connect({ name: buildPortName(role, currentSession) });
      } catch {
        port = null;
        return null;
      }
      suspended = false;
      attachPort(port);
      return port;
    }

    function publish(payload) {
      if (closed) {
        return false;
      }

      if (!port) {
        connect();
      }

      if (!port) {
        return false;
      }

      try {
        port.postMessage({
          type: "publish",
          session: currentSession,
          payload
        });
        return true;
      } catch {
        return false;
      }
    }

    function send(payload) {
      return publish(payload);
    }

    function subscribe(handler) {
      onMessage = handler;
      return channel;
    }

    function setSession(nextSession) {
      const normalized = cleanSession(nextSession);
      if (normalized === currentSession) {
        return currentSession;
      }

      currentSession = normalized;
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
