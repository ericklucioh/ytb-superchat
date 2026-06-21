(function (global) {
  if (global.OverlayBridgeLegacySocketShim) {
    return;
  }

  function installLegacyOverlaySocketShim({ NativeWebSocket, cleanSession, createChannel }) {
    if (global.__OverlayLegacySocketShimInstalled || typeof NativeWebSocket !== "function") {
      return;
    }

    global.__OverlayLegacySocketShimInstalled = true;

    function isLegacyOverlayUrl(url) {
      try {
        const parsed = new URL(
          String(url || ""),
          global.location && global.location.href ? global.location.href : "http://localhost"
        );
        return parsed.pathname === "/ws";
      } catch {
        return false;
      }
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
        if (!session || typeof createChannel !== "function") {
          return null;
        }

        if (!bridge) {
          bridge = createChannel({
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

  global.OverlayBridgeLegacySocketShim = {
    installLegacyOverlaySocketShim
  };
})(window);
