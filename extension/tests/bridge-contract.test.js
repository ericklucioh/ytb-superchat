const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadScript(filePath, sandbox) {
  const source = fs.readFileSync(filePath, 'utf8');
  vm.runInNewContext(source, sandbox, { filename: filePath });
  return sandbox;
}

function createChromeStub() {
  const localStore = new Map();
  const sessionStore = new Map();
  const connectHandlers = [];

  const chrome = {
    runtime: {
      connect: (options = {}) => {
        const port = createPortStub(options.name || '');
        connectHandlers.push(port);
        return port;
      },
      onConnect: {
        addListener(listener) {
          this._listener = listener;
        }
      },
      lastError: null
    },
    storage: {
      local: {
        async get(key) {
          if (typeof key === 'string') {
            return { [key]: localStore.get(key) };
          }
          const result = {};
          for (const entry of Object.entries(key || {})) {
            result[entry[0]] = localStore.get(entry[0]);
          }
          return result;
        },
        async set(values) {
          for (const [key, value] of Object.entries(values || {})) {
            localStore.set(key, value);
          }
        },
        async remove(key) {
          localStore.delete(key);
        }
      },
      session: {
        async get(key) {
          if (typeof key === 'string') {
            return { [key]: sessionStore.get(key) };
          }
          const result = {};
          for (const entry of Object.entries(key || {})) {
            result[entry[0]] = sessionStore.get(entry[0]);
          }
          return result;
        },
        async set(values) {
          for (const [key, value] of Object.entries(values || {})) {
            sessionStore.set(key, value);
          }
        },
        async remove(key) {
          sessionStore.delete(key);
        }
      }
    }
  };

  function createPortStub(name) {
    const state = {
      name,
      messages: [],
      disconnected: false,
      onMessageListeners: [],
      onDisconnectListeners: []
    };

    return {
      name,
      postMessage(message) {
        state.messages.push(message);
      },
      disconnect() {
        state.disconnected = true;
        for (const listener of state.onDisconnectListeners.slice()) {
          listener();
        }
      },
      onMessage: {
        addListener(listener) {
          state.onMessageListeners.push(listener);
        },
        removeListener(listener) {
          state.onMessageListeners = state.onMessageListeners.filter((entry) => entry !== listener);
        }
      },
      onDisconnect: {
        addListener(listener) {
          state.onDisconnectListeners.push(listener);
        },
        removeListener(listener) {
          state.onDisconnectListeners = state.onDisconnectListeners.filter((entry) => entry !== listener);
        }
      },
      __state: state,
      __emit(message) {
        for (const listener of state.onMessageListeners.slice()) {
          listener(message);
        }
      }
    };
  }

  chrome.__connectHandlers = connectHandlers;
  chrome.__localStore = localStore;
  chrome.__sessionStore = sessionStore;
  chrome.__createPortStub = createPortStub;
  return chrome;
}

function createWindowStub() {
  const listeners = new Map();
  return {
    WebSocket: function NativeWebSocket() {},
    queueMicrotask,
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
    document: {
      addEventListener() {},
      removeEventListener() {}
    },
    __listeners: listeners
  };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

test('local-chat bridge dedupes pending packets and applies acks', async () => {
  const chrome = createChromeStub();
  const window = createWindowStub();
  const sandbox = {
    console,
    chrome,
    window,
    WebSocket: window.WebSocket,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    DOMException,
    Date,
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
    parseInt,
    parseFloat,
    isNaN
  };

  loadScript(path.join(__dirname, '..', 'sources', 'local-chat-bridge.js'), sandbox);
  const bridgeFactory = sandbox.window.OverlayLocalChatBridge;
  assert.ok(bridgeFactory, 'bridge factory should be installed');

  const channel = bridgeFactory.createChannel({ role: 'source', session: 'room-1' });
  assert.ok(channel, 'channel should be created');

  try {
    channel.publish({
      id: 'evt-1',
      platform: 'youtube',
      type: 'message',
      chatname: 'User',
      chatmessage: 'hello',
      timestamp: 1
    });
    channel.publish({
      id: 'evt-1',
      platform: 'youtube',
      type: 'message',
      chatname: 'User',
      chatmessage: 'hello',
      timestamp: 1
    });

    await flush();

    const sentPort = chrome.__connectHandlers.at(-1);
    assert.ok(sentPort, 'expected a connected port');
    assert.equal(sentPort.__state.messages.filter((msg) => msg.type === 'publish').length, 1, 'duplicate publish must stay deduped while pending');

    const beforeAck = channel.getDiagnostics();
    assert.equal(beforeAck.pendingSize, 1, 'one pending packet should remain before ack');

    sentPort.__emit({ type: 'ack', session: 'room-1', key: 'evt-1', id: 'evt-1', packetType: 'publish', status: 'stored' });
    await flush();

    const afterAck = channel.getDiagnostics();
    assert.equal(afterAck.pendingSize, 0, 'ack should clear the pending packet');
    assert.ok(afterAck.acks >= 1, 'ack counter should increment');
  } finally {
    channel.close();
  }
});

test('service worker replays backlog in order and keeps duplicate stats visible', async () => {
  const chrome = createChromeStub();
  const runtimeListeners = [];
  const sandbox = {
    console,
    chrome: {
      ...chrome,
      runtime: {
        connect: () => {
          throw new Error('service worker should not connect outbound');
        },
        onConnect: {
          addListener(listener) {
            runtimeListeners.push(listener);
          }
        },
        lastError: null
      }
    },
    setTimeout,
    clearTimeout,
    Date,
    Map,
    Set,
    WeakSet,
    JSON,
    String,
    Number,
    Boolean,
    Object,
    Array,
    RegExp,
    Math,
    Error,
    Promise,
    Buffer
  };

  loadScript(path.join(__dirname, '..', 'service_worker.js'), sandbox);
  assert.ok(runtimeListeners.length >= 1, 'service worker should register a connect listener');

  const sourcePort = createWorkerPort('chat-bridge:source:room-1');
  sandbox.registerPort(sourcePort);

  sourcePort.emit({
    type: 'publish',
    session: 'room-1',
    payload: {
      id: 'evt-1',
      type: 'message',
      platform: 'youtube',
      chatname: 'User 1',
      chatmessage: 'hello',
      timestamp: 1
    }
  });
  sourcePort.emit({
    type: 'publish',
    session: 'room-1',
    payload: {
      id: 'evt-1',
      type: 'message',
      platform: 'youtube',
      chatname: 'User 1',
      chatmessage: 'hello',
      timestamp: 1
    }
  });
  sourcePort.emit({ type: 'heartbeat', session: 'room-1', timestamp: 123 });

  await flush();

  const state = sandbox.ensureSessionState('room-1');
  assert.ok(state, 'expected session state');
  assert.equal(state.backlog.length, 1, 'duplicate publish should not grow backlog');
  assert.equal(state.stats.published, 1, 'published counter should reflect one unique packet');
  assert.equal(state.stats.duplicates, 1, 'duplicate counter should increment');
  assert.ok(state.stats.heartbeats >= 1, 'heartbeat counter should increment');

  const dashboardPort = createWorkerPort('chat-bridge:dashboard:room-1');
  sandbox.registerPort(dashboardPort);
  await flush();

  const publishMessages = dashboardPort.messages.filter((message) => message.type === 'publish');
  assert.equal(publishMessages.length, 1, 'dashboard should receive exactly one replayed publish');
  assert.equal(publishMessages[0].payload.id, 'evt-1');
  assert.ok(dashboardPort.messages.some((message) => message.type === 'ready'), 'dashboard should receive ready after hydration');

  const nextDashboardPort = createWorkerPort('chat-bridge:dashboard:room-1');
  sandbox.registerPort(nextDashboardPort);
  await flush();

  const replayedIds = nextDashboardPort.messages.filter((message) => message.type === 'publish').map((message) => message.payload.id);
  assert.deepEqual(replayedIds, ['evt-1'], 'replayed backlog should preserve order');
});

function createWorkerPort(name) {
  const state = {
    name,
    messages: [],
    onMessageListeners: [],
    onDisconnectListeners: [],
    disconnected: false
  };

  return {
    name,
    messages: state.messages,
    postMessage(message) {
      state.messages.push(message);
    },
    disconnect() {
      state.disconnected = true;
      for (const listener of state.onDisconnectListeners.slice()) {
        listener();
      }
    },
    onMessage: {
      addListener(listener) {
        state.onMessageListeners.push(listener);
      },
      removeListener(listener) {
        state.onMessageListeners = state.onMessageListeners.filter((entry) => entry !== listener);
      }
    },
    onDisconnect: {
      addListener(listener) {
        state.onDisconnectListeners.push(listener);
      },
      removeListener(listener) {
        state.onDisconnectListeners = state.onDisconnectListeners.filter((entry) => entry !== listener);
      }
    },
    emit(message) {
      for (const listener of state.onMessageListeners.slice()) {
        listener(message);
      }
    },
    __state: state
  };
}
