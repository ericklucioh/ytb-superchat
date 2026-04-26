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

function createTimerQueue() {
  const timers = [];

  function setTimeoutStub(callback, delay = 0) {
    const timer = { callback, delay, cleared: false };
    timers.push(timer);
    return timer;
  }

  function clearTimeoutStub(timer) {
    if (timer) {
      timer.cleared = true;
    }
  }

  function runDelay(delay) {
    const next = timers.filter((timer) => !timer.cleared && timer.delay === delay);
    for (const timer of next) {
      timer.cleared = true;
      timer.callback();
    }
  }

  return {
    clearTimeoutStub,
    runDelay,
    setTimeoutStub,
    timers
  };
}

function createLoggerStub() {
  return {
    debug() {},
    info() {},
    log() {},
    warn() {},
    error() {},
    child() {
      return this;
    }
  };
}

function createJQueryStub() {
  return function jqueryStub(target) {
    const api = {
      addClass(className) {
        if (target && typeof target === "object") {
          target.__classes = target.__classes || [];
          target.__classes.push(className);
        }
        return api;
      },
      append() {
        return api;
      },
      delay() {
        return api;
      },
      find() {
        return {
          text() {
            return target && typeof target === "object" ? String(target.textContent || target.innerText || "") : "";
          }
        };
      },
      on() {
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
      removeClass(className) {
        if (target && typeof target === "object" && Array.isArray(target.__classes)) {
          target.__classes = target.__classes.filter((entry) => entry !== className);
        }
        return api;
      },
      text() {
        return target && typeof target === "object" ? String(target.textContent || target.innerText || "") : "";
      }
    };

    return api;
  };
}

function createTextNode(text) {
  return {
    innerHTML: text,
    textContent: text
  };
}

function createTwitchMessageNode() {
  const username = createTextNode("Streamer");
  const message = createTextNode("hello from twitch");

  return {
    __classes: [],
    className: "chat-line__message",
    dataset: {},
    innerText: "Streamer hello from twitch",
    nodeType: 1,
    style: {
      getPropertyValue() {
        return "";
      },
      setProperty() {}
    },
    tagName: "DIV",
    textContent: "Streamer hello from twitch",
    matches(selector) {
      return String(selector || "").includes("chat-line__message") || String(selector || "").includes("chat-line-message");
    },
    closest(selector) {
      return this.matches(selector) ? this : null;
    },
    getAttribute(name) {
      if (name === "aria-label") {
        return "Streamer subscribed for 3 months";
      }
      if (name === "data-a-user") {
        return "Streamer";
      }
      return "";
    },
    querySelector(selector) {
      if (String(selector || "").includes("chat-message-username") || String(selector || "").includes("message-username")) {
        return username;
      }
      if (String(selector || "").includes("chat-message-text") || String(selector || "").includes("chat-line-message-body")) {
        return message;
      }
      if (String(selector || "").includes("chat-badge")) {
        return null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (String(selector || "").includes("chat-badge")) {
        return [];
      }
      return [];
    }
  };
}

function createTwitchSandbox({ hasContainerInitially = false, hasMutationObserverInitially = true } = {}) {
  const timers = createTimerQueue();
  const messages = [];
  const observers = [];
  const MutationObserverClass = class MutationObserverStub {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }

    observe(target, config) {
      this.target = target;
      this.config = config;
    }
  };
  let containerNode = hasContainerInitially
    ? {
        nodeType: 1
      }
    : null;
  let mutationObserverEnabled = hasMutationObserverInitially;

  const windowStub = {
    addEventListener() {},
    innerHeight: 720,
    innerWidth: 1280,
    location: {
      origin: "https://example.test"
    },
    OverlayAvatarHelpers: {
      extractAvatarSrcFromDom() {
        return "";
      }
    },
    OverlayLocalChatBridge: {
      createChannel() {
        return {
          connect() {},
          setSession() {}
        };
      }
    },
    postMessage() {},
    queueMicrotask,
    removeEventListener() {},
    get MutationObserver() {
      return mutationObserverEnabled ? MutationObserverClass : undefined;
    },
    WebKitMutationObserver: undefined
  };

  const documentStub = {
    addEventListener() {},
    body: {},
    documentElement: {
      style: {
        setProperty() {}
      }
    },
    getElementById() {
      return null;
    },
    hidden: false,
    querySelector(selector) {
      const matches = this.querySelectorAll(selector);
      return matches.length ? matches[0] : null;
    },
    querySelectorAll(selector) {
      const value = String(selector || "");
      if (value.includes("chat-scrollable-area") || value.includes("chat-scroller") || value.includes("chat-list")) {
        return containerNode ? [containerNode] : [];
      }
      return [];
    },
    removeEventListener() {}
  };

  const sandbox = {
    $: createJQueryStub(),
    Array,
    Boolean,
    Date,
    DOMException,
    Error,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Set,
    String,
    Symbol,
    TypeError,
    WeakSet,
    chrome: {},
    clearInterval() {},
    clearTimeout: timers.clearTimeoutStub,
    console,
    document: documentStub,
    queueMicrotask,
    setInterval() {
      return 0;
    },
    setTimeout: timers.setTimeoutStub,
    window: windowStub
  };
  sandbox.window.document = documentStub;
  sandbox.window.$ = sandbox.$;
  sandbox.window.console = console;
  sandbox.window.setTimeout = timers.setTimeoutStub;
  sandbox.window.clearTimeout = timers.clearTimeoutStub;
  sandbox.window.setInterval = sandbox.setInterval;
  sandbox.window.clearInterval = sandbox.clearInterval;
  sandbox.window.Date = Date;
  sandbox.window.JSON = JSON;
  sandbox.window.Math = Math;
  sandbox.window.Object = Object;
  sandbox.window.String = String;
  sandbox.window.Number = Number;
  sandbox.window.Boolean = Boolean;
  sandbox.window.Array = Array;
  sandbox.window.RegExp = RegExp;
  sandbox.window.Promise = Promise;
  sandbox.window.Error = Error;
  sandbox.window.TypeError = TypeError;
  sandbox.window.Map = Map;
  sandbox.window.Set = Set;
  sandbox.window.WeakSet = WeakSet;
  sandbox.window.DOMException = DOMException;

  const runtime = {
    DEFAULT_SEND_PROPERTIES: [],
    applyOverlaySettings() {},
    createLogger() {
      return createLoggerStub();
    },
    generateStreamID() {
      return "room-1";
    },
    ignoreRuntimeError() {},
    loadSettings(properties, callback) {
      callback({});
    },
    normalizeHighlightWords() {
      return [];
    },
    persistStreamId() {},
    sendBridgeMessage(bridge, data, options) {
      messages.push({ bridge, data, options });
      return true;
    },
    watchStreamId() {
      return null;
    }
  };

  sandbox.window.OverlayRuntime = runtime;

  return {
    documentStub,
    messages,
    observers,
    runDelay(delay) {
      timers.runDelay(delay);
    },
    setContainerNode(node) {
      containerNode = node;
    },
    setMutationObserverEnabled(value) {
      mutationObserverEnabled = value;
    },
    sandbox,
    timers
  };
}

test("twitch observer retries until a late container appears", () => {
  const env = createTwitchSandbox({
    hasContainerInitially: false,
    hasMutationObserverInitially: true
  });

  loadScript(path.join(__dirname, "..", "sources", "twitch.js"), env.sandbox);

  assert.equal(env.observers.length, 0);

  env.setContainerNode({
    nodeType: 1
  });
  env.runDelay(500);

  assert.equal(env.observers.length, 1);
  assert.equal(env.observers[0].target, env.sandbox.document.querySelector(".chat-scrollable-area"));

  const messageNode = createTwitchMessageNode();
  env.observers[0].callback([
    {
      addedNodes: [messageNode]
    }
  ]);

  assert.equal(env.messages.length, 1);
  assert.equal(env.messages[0].data.platform, "twitch");
  assert.equal(env.messages[0].data.chatname, "Streamer");
  assert.equal(messageNode.style.backgroundColor, "#666");
  assert.ok(messageNode.dataset.feedSignature);
});

test("twitch observer retries when MutationObserver is temporarily unavailable", () => {
  const env = createTwitchSandbox({
    hasContainerInitially: true,
    hasMutationObserverInitially: false
  });

  loadScript(path.join(__dirname, "..", "sources", "twitch.js"), env.sandbox);

  assert.equal(env.observers.length, 0);

  env.setMutationObserverEnabled(true);
  env.runDelay(500);

  assert.equal(env.observers.length, 1);
  assert.equal(env.observers[0].config.subtree, true);
});
