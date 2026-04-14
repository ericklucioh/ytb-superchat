(function (global) {
  if (global.OverlayRuntime) {
    return;
  }

  const DEFAULT_SEND_PROPERTIES = [
    "color",
    "scale",
    "sizeOffset",
    "commentBottom",
    "commentHeight",
    "authorBackgroundColor",
    "authorAvatarBorderColor",
    "authorColor",
    "commentBackgroundColor",
    "commentColor",
    "fontFamily",
    "showOnlyFirstName",
    "highlightWords"
  ];

  const DEFAULT_SETTINGS_PROPERTIES = [
    "color",
    "scale",
    "streamID",
    "sizeOffset",
    "commentBottom",
    "commentHeight",
    "authorBackgroundColor",
    "authorAvatarBorderColor",
    "authorColor",
    "commentBackgroundColor",
    "commentColor",
    "fontFamily",
    "showOnlyFirstName",
    "highlightWords"
  ];

  const settingsCache = new Map();
  const streamIdListeners = new Set();

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync" && changes) {
        settingsCache.clear();
        if (changes.streamID) {
          const nextStreamId = typeof changes.streamID.newValue === "string" ? changes.streamID.newValue.trim() : "";
          for (const listener of streamIdListeners) {
            try {
              listener(nextStreamId);
            } catch {
              //
            }
          }
        }
      }
    });
  }

  function settingsSignature(properties) {
    if (!Array.isArray(properties) || !properties.length) {
      return DEFAULT_SETTINGS_PROPERTIES.join("|");
    }

    return properties.slice().sort().join("|");
  }

  function generateStreamID(length = 11) {
    let text = "";
    const possible = "ABCEFGHJKLMNPQRSTUVWXYZabcefghijkmnpqrstuvwxyz23456789";
    for (let i = 0; i < length; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  function normalizeHighlightWords(words) {
    if (typeof words === "string") {
      words = words.split(",");
    }

    if (!Array.isArray(words)) {
      return [];
    }

    return words
      .map((word) => (typeof word === "string" ? word.toLowerCase().replace(/[^a-z0-9]/gi, "").trim() : ""))
      .filter(Boolean);
  }

  function loadSettings(properties, callback) {
    const keys = Array.isArray(properties) && properties.length ? properties : DEFAULT_SETTINGS_PROPERTIES;
    const signature = settingsSignature(keys);

    try {
      chrome.storage.sync.get(keys, (result) => {
        const settings = result || {};
        settingsCache.set(signature, settings);
        callback(settings);
      });
    } catch {
      const settings = {};
      settingsCache.set(signature, settings);
      callback(settings);
    }
  }

  function getCachedSettings(properties) {
    const signature = settingsSignature(properties);
    return settingsCache.get(signature) || null;
  }

  function persistStreamId(streamID) {
    try {
      chrome.storage.sync.set({ streamID });
    } catch {
      //
    }
  }

  function getRuntimeUrl(path) {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
      }
    } catch {
      //
    }

    return path;
  }

  function ignoreRuntimeError() {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        return chrome.runtime.lastError;
      }
    } catch {
      //
    }

    return undefined;
  }

  function applyOverlaySettings(item, root = document.documentElement, defaults = {}) {
    if (!item || !root) {
      return;
    }

    const keyerColor = item.color || defaults.color;
    if (keyerColor) {
      root.style.setProperty("--keyer-bg-color", keyerColor);
    }
    if (item.authorBackgroundColor) {
      root.style.setProperty("--author-bg-color", item.authorBackgroundColor);
      root.style.setProperty("--author-avatar-border-color", item.authorBackgroundColor);
    }
    if (item.authorAvatarBorderColor) {
      root.style.setProperty("--author-avatar-border-color", item.authorAvatarBorderColor);
    }
    if (item.commentBackgroundColor) {
      root.style.setProperty("--comment-bg-color", item.commentBackgroundColor);
    }
    if (item.authorColor) {
      root.style.setProperty("--author-color", item.authorColor);
    }
    if (item.commentColor) {
      root.style.setProperty("--comment-color", item.commentColor);
    }
    if (item.fontFamily) {
      root.style.setProperty("--font-family", item.fontFamily);
    }
    if (item.scale) {
      root.style.setProperty("--comment-scale", item.scale);
    }
    if (item.commentBottom) {
      root.style.setProperty("--comment-area-bottom", item.commentBottom);
    }
    if (item.commentHeight) {
      root.style.setProperty("--comment-area-height", item.commentHeight);
    }
    if (item.sizeOffset) {
      root.style.setProperty("--comment-area-size-offset", item.sizeOffset);
    }
  }

  function createSocketBridge({
    getRoomId,
    url = "wss://api.overlay.ninja",
    reconnectDelay = 2000,
    onOpen,
    onMessage,
    onClose,
    onError
  }) {
    let socket = null;
    let reconnectTimer = null;
    let disposed = false;

    function connect() {
      if (disposed) {
        return null;
      }

      if (socket && (socket.readyState === 0 || socket.readyState === 1)) {
        return socket;
      }

      const roomId = typeof getRoomId === "function" ? getRoomId() : "";
      if (!roomId) {
        return null;
      }

      clearTimeout(reconnectTimer);
      reconnectTimer = null;

      socket = new WebSocket(url);
      const currentSocket = socket;
      currentSocket.addEventListener("open", () => {
        if (disposed || currentSocket.readyState !== 1 || socket !== currentSocket) {
          return;
        }
        currentSocket.send(JSON.stringify({ join: roomId }));
        if (onOpen) {
          onOpen(currentSocket, roomId);
        }
      });
      currentSocket.addEventListener("message", (event) => {
        if (disposed || !onMessage || socket !== currentSocket) {
          return;
        }
        onMessage(event, currentSocket, roomId);
      });
      currentSocket.addEventListener("close", () => {
        if (socket === currentSocket) {
          socket = null;
        }
        if (onClose) {
          onClose(currentSocket, roomId);
        }
        if (!disposed) {
          reconnectTimer = setTimeout(connect, reconnectDelay);
        }
      });
      currentSocket.addEventListener("error", () => {
        if (onError) {
          onError(currentSocket, roomId);
        }
        try {
          currentSocket.close();
        } catch {
          //
        }
      });

      return currentSocket;
    }

    function send(packet) {
      if (!socket || socket.readyState !== 1) {
        return false;
      }

      socket.send(JSON.stringify(packet));
      return true;
    }

    function close() {
      disposed = true;
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      if (socket) {
        try {
          socket.close();
        } catch {
          //
        }
        socket = null;
      }
    }

    return {
      connect,
      close,
      send,
      get socket() {
        return socket;
      }
    };
  }

  function sendBridgeMessage(bridge, data, options = {}) {
    const envelopeKey = options.envelopeKey || "msg";
    const contentsKey = options.contentsKey || "contents";
    const storageKeys = options.storageKeys || DEFAULT_SEND_PROPERTIES;
    const payload = {
      [envelopeKey]: true,
      [contentsKey]: data
    };

    if (options.id != null) {
      payload.id = options.id;
    }

    if (options.settings) {
      payload.settings = options.settings;
    }

    if (options.includeSettings === false) {
      bridge.send(payload);
      return;
    }

    const cachedSettings = getCachedSettings(storageKeys);
    if (cachedSettings) {
      payload.settings = cachedSettings;
      bridge.send(payload);
      return;
    }

    loadSettings(storageKeys, (settings) => {
      if (settings) {
        payload.settings = settings;
      }
      bridge.send(payload);
    });
  }

  function watchStreamId(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    streamIdListeners.add(callback);
    return () => {
      streamIdListeners.delete(callback);
    };
  }

  global.OverlayRuntime = {
    DEFAULT_SEND_PROPERTIES,
    DEFAULT_SETTINGS_PROPERTIES,
    generateStreamID,
    normalizeHighlightWords,
    loadSettings,
    getCachedSettings,
    persistStreamId,
    getRuntimeUrl,
    ignoreRuntimeError,
    applyOverlaySettings,
    createSocketBridge,
    sendBridgeMessage,
    watchStreamId
  };
})(window);
