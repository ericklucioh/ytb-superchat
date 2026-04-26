const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadScript(filePath, sandbox) {
  const source = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(source, sandbox, { filename: filePath });
}

function createNoopChain() {
  const chain = {
    on() {
      return chain;
    },
    append() {
      return chain;
    },
    find() {
      return chain;
    },
    text() {
      return "";
    },
    html() {
      return "";
    },
    attr() {
      return "";
    },
    addClass() {
      return chain;
    },
    removeClass() {
      return chain;
    },
    delay() {
      return chain;
    },
    queue(callback) {
      if (typeof callback === "function") {
        callback.call({ dequeue() {} });
      }
      return chain;
    },
    remove() {
      return chain;
    },
    parent() {
      return chain;
    }
  };

  return chain;
}

function createChromeStub() {
  const writes = [];
  const syncListeners = [];

  return {
    runtime: {
      lastError: null
    },
    storage: {
      sync: {
        get(keys, callback) {
          if (typeof callback === "function") {
            callback({});
          }
          return {};
        },
        set(values, callback) {
          writes.push({ ...values });
          if (typeof callback === "function") {
            callback();
          }
        }
      },
      onChanged: {
        addListener(listener) {
          syncListeners.push(listener);
        },
        removeListener(listener) {
          const index = syncListeners.indexOf(listener);
          if (index >= 0) {
            syncListeners.splice(index, 1);
          }
        }
      }
    },
    __writes: writes,
    __listeners: syncListeners
  };
}

function createWindowStub() {
  const listeners = new Map();
  const noopChain = createNoopChain();

  return {
    location: {
      origin: "http://localhost:8080",
      search: ""
    },
    innerWidth: 1280,
    innerHeight: 720,
    document: {
      body: {
        dataset: {}
      },
      head: {
        appendChild() {}
      },
      documentElement: {
        style: {
          setProperty() {}
        }
      },
      readyState: "complete",
      getElementById() {
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      createElement(tagName) {
        return {
          tagName,
          remove() {},
          setAttribute() {},
          style: {}
        };
      },
      addEventListener() {},
      removeEventListener() {}
    },
    MutationObserver: function MutationObserver() {
      return {
        observe() {},
        disconnect() {}
      };
    },
    WebKitMutationObserver: function WebKitMutationObserver() {
      return {
        observe() {},
        disconnect() {}
      };
    },
    OverlayRuntime: {
      DEFAULT_SEND_PROPERTIES: [],
      generateStreamID() {
        return "generated-session";
      },
      persistStreamId() {
        throw new Error("persistStreamId should not be called");
      },
      ignoreRuntimeError() {},
      loadSettings(properties, callback) {
        callback({});
      },
      watchStreamId() {
        return () => {};
      },
      applyOverlaySettings() {},
      normalizeHighlightWords() {
        return [];
      },
      getRuntimeUrl(filePath) {
        return filePath;
      },
      sendBridgeMessage() {
        return false;
      }
    },
    OverlayLocalChatBridge: {
      createChannel() {
        return {
          connect() {},
          setSession() {},
          close() {}
        };
      }
    },
    addEventListener(type, listener) {
      const list = listeners.get(type) || [];
      list.push(listener);
      listeners.set(type, list);
    },
    removeEventListener(type, listener) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((entry) => entry !== listener));
    },
    postMessage() {},
    dispatchEvent(type, event) {
      const list = listeners.get(type) || [];
      for (const listener of list) {
        listener(event);
      }
    },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    navigator: {
      clipboard: {
        writeText() {
          return Promise.resolve();
        }
      }
    },
    console,
    $() {
      return noopChain;
    },
    queueMicrotask,
    Date,
    Math,
    JSON,
    String,
    Number,
    Boolean,
    Object,
    Array,
    RegExp,
    Promise,
    Error,
    TypeError,
    parseInt,
    parseFloat,
    isNaN
  };
}

test("youtube bootstrap does not write streamID when portal session is absent", () => {
  const chrome = createChromeStub();
  const window = createWindowStub();
  const sandbox = {
    ...window,
    chrome,
    window,
    document: window.document,
    WebSocket: function WebSocket() {},
    $: window.$
  };

  loadScript(path.join(__dirname, "..", "sources", "youtube.js"), sandbox);
  assert.equal(chrome.__writes.length, 0);
});

test("twitch bootstrap does not write streamID when portal session is absent", () => {
  const chrome = createChromeStub();
  const window = createWindowStub();
  const sandbox = {
    ...window,
    chrome,
    window,
    document: window.document,
    WebSocket: function WebSocket() {},
    $: window.$
  };

  loadScript(path.join(__dirname, "..", "sources", "twitch.js"), sandbox);
  assert.equal(chrome.__writes.length, 0);
});

test("dashboard relay does not mirror session back into chrome storage", () => {
  const chrome = createChromeStub();
  const listeners = new Map();
  const window = createWindowStub();

  const sandbox = {
    ...window,
    chrome,
    window,
    localStorage: {
      getItem() {
        return "";
      },
      setItem() {},
      removeItem() {}
    },
    sessionStorage: {
      getItem() {
        return "";
      },
      setItem() {}
    },
    document: window.document,
    bridgeFactory: null,
    OverlayRuntime: window.OverlayRuntime,
    OverlayLocalChatBridge: {
      createChannel() {
        return {
          connect() {},
          close() {}
        };
      }
    },
    addEventListener(type, listener) {
      const list = listeners.get(type) || [];
      list.push(listener);
      listeners.set(type, list);
    },
    removeEventListener(type, listener) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((entry) => entry !== listener));
    },
    postMessage() {},
    console,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    String,
    Number,
    Boolean,
    Object,
    Array,
    RegExp,
    Error,
    TypeError
  };

  loadScript(path.join(__dirname, "..", "sources", "dashboard-relay.js"), sandbox);
  const relay = sandbox.window.OverlayDashboardRelay;
  assert.ok(relay, "relay should be installed");

  sandbox.window.dispatchEvent = function dispatchEvent(type, event) {
    const list = listeners.get(type) || [];
    for (const listener of list) {
      listener(event);
    }
  };

  sandbox.window.dispatchEvent("message", {
    source: sandbox.window,
    data: {
      type: "overlay-local-chat:set-session",
      session: "room-123"
    }
  });

  assert.equal(chrome.__writes.length, 0);

  relay.close();
});

test("legacy connectors no longer own streamID writes", () => {
  const legacyFiles = [
    "withyt.js",
    "instagram.js",
    "twitter.js",
    "crowdcast.js",
    "polleverywhere.js",
    "zoom.js",
    "restream.js",
    "kick.js",
    "mobcrush.js",
    "instalive.js",
    "facebook.js",
    "trovo.js",
    "slido.js",
    "glimesh.js"
  ];

  for (const fileName of legacyFiles) {
    const source = fs.readFileSync(path.join(__dirname, "..", "sources", fileName), "utf8");
    assert.ok(!source.includes("persistStreamId("), `${fileName} must not persist streamID`);
    assert.ok(!/streamID:\s*channel/.test(source), `${fileName} must not write streamID`);
    assert.ok(!source.includes("var channel = generateStreamID();"), `${fileName} must not self-generate streamID`);
  }
});
