const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadScript(filePath, sandbox) {
  const source = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(source, sandbox, { filename: filePath });
  return sandbox;
}

function createQueryResult(entry = {}) {
  return {
    length: entry.length ?? 1,
    first() {
      return this;
    },
    text() {
      return String(entry.text || "");
    },
    html() {
      return String(entry.html || entry.text || "");
    },
    attr(name) {
      return entry.attrs ? String(entry.attrs[name] || "") : "";
    },
    parent() {
      return createQueryResult({ html: entry.parentHtml || "" });
    }
  };
}

function createJQueryStub(selectorValueMap) {
  return function jqueryStub(target) {
    const api = {
      0: target,
      length: 1,
      on() {
        return api;
      },
      addClass() {
        return api;
      },
      removeClass() {
        return api;
      },
      append() {
        return api;
      },
      delay() {
        return api;
      },
      queue(callback) {
        if (typeof callback === "function") {
          callback({
            dequeue() {}
          });
        }
        return api;
      },
      find(selector) {
        return createQueryResult(selectorValueMap.get(String(selector || "")) || { length: 0 });
      },
      attr(name) {
        return target && typeof target.getAttribute === "function" ? String(target.getAttribute(name) || "") : "";
      }
    };

    return api;
  };
}

function createYoutubeNode() {
  return {
    tagName: "YT-LIVE-CHAT-MEMBERSHIP-ITEM-RENDERER",
    dataset: {},
    innerText: "ericklucioh Member for 4 months Alou calvo, 4 meses salvezada",
    classList: {
      add() {},
      remove() {}
    },
    style: {
      getPropertyValue() {
        return "";
      }
    },
    hasAttribute(name) {
      return name === "is-deleted" ? false : false;
    }
  };
}

function createSandbox(selectorValueMap) {
  const messages = [];
  const observers = [];
  const windowStub = {
    location: { origin: "https://example.test" },
    OverlayAvatarHelpers: {
      extractAvatarSrcFromDom() {
        return "";
      }
    },
    OverlayLocalChatBridge: {
      createChannel() {
        return {
          connect() {},
          setSession() {},
          send(payload) {
            messages.push(payload);
            return true;
          }
        };
      }
    },
    queueMicrotask,
    addEventListener() {},
    removeEventListener() {},
    postMessage() {},
    MutationObserver: class MutationObserverStub {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }

      observe(target, config) {
        this.target = target;
        this.config = config;
      }
    }
  };

  const documentStub = {
    body: {},
    documentElement: {
      style: {
        setProperty() {}
      }
    },
    querySelector(selector) {
      if (String(selector || "") === "yt-live-chat-ticker-renderer") {
        return null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (String(selector || "") === "yt-live-chat-app") {
        return [{ nodeType: 1 }];
      }
      return [];
    },
    addEventListener() {},
    removeEventListener() {}
  };

  const runtimeStub = {
    DEFAULT_SEND_PROPERTIES: [],
    applyOverlaySettings() {},
    createLogger() {
      return {
        debug() {},
        info() {},
        warn() {},
        error() {},
        child() {
          return this;
        }
      };
    },
    generateStreamID() {
      return "room-1";
    },
    ignoreRuntimeError() {},
    loadSettings(properties, callback) {
      callback({
        streamID: "room-1",
        showOnlyFirstName: false,
        highlightWords: []
      });
    },
    normalizeHighlightWords(value) {
      return Array.isArray(value) ? value : [];
    },
    persistStreamId() {},
    sendBridgeMessage(bridge, data, options = {}) {
      const payload = {
        [options.envelopeKey || "msg"]: true,
        contents: data,
        id: options.id
      };
      return bridge.send(payload);
    },
    watchStreamId() {
      return null;
    }
  };

  return {
    console,
    window: windowStub,
    document: documentStub,
    $: createJQueryStub(selectorValueMap),
    queueMicrotask,
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    Map,
    Set,
    WeakSet,
    Promise,
    JSON,
    String,
    Number,
    Boolean,
    Object,
    Array,
    RegExp,
    Math,
    Error,
    TypeError,
    Date,
    DOMException,
    __messages: messages,
    __observers: observers,
    runtimeStub
  };
}

test("youtube membership items expose months and message correctly", () => {
  const selectorValueMap = new Map([
    ["#author-name", { text: "@ericklucioh" }],
    ["#message", { text: "Alou calvo, 4 meses salvezada", html: "Alou calvo, 4 meses salvezada" }],
    ["#header-primary-text", { text: "Member for 4 months" }],
    [".yt-live-chat-author-badge-renderer[aria-label]", { attrs: { "aria-label": "Member (2 months)", "shared-tooltip-text": "Member (2 months)" }, text: "Member (2 months)" }]
  ]);

  const sandbox = createSandbox(selectorValueMap);
  sandbox.window.OverlayRuntime = sandbox.runtimeStub;

  loadScript(path.join(__dirname, "..", "sources", "youtube.js"), sandbox);

  assert.equal(sandbox.__observers.length > 0, true);

  const node = createYoutubeNode();
  sandbox.__observers[0].callback([
    {
      addedNodes: [node]
    }
  ]);

  assert.equal(sandbox.__messages.length, 1);
  const payload = sandbox.__messages[0];
  assert.equal(payload.contents.platform, "youtube");
  assert.equal(payload.contents.eventType, "member");
  assert.equal(payload.contents.chatmessage, "Alou calvo, 4 meses salvezada");
  assert.equal(payload.contents.months, 4);
  assert.equal(payload.contents.hasMembership.includes("MEMBER CHAT"), true);
});
