const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadScript(filePath, sandbox) {
  const source = `${fs.readFileSync(filePath, 'utf8').replace(/^export\s+/gm, '')}\nwindow.__loadedCreateChatBridge = typeof createChatBridge === 'function' ? createChatBridge : null;`;
  vm.runInNewContext(source, sandbox, { filename: filePath });
  return sandbox;
}

function createWindowStub() {
  const listeners = new Map();
  const messages = [];

  return {
    location: { origin: 'http://localhost' },
    sessionStorage: {
      setItem() {},
      getItem() {
        return '';
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
    postMessage(message) {
      messages.push(message);
    },
    __listeners: listeners,
    __messages: messages
  };
}

test('chat bridge emits a dedicated refresh signal for same-session reconnects', () => {
  const window = createWindowStub();
  const sandbox = {
    window,
    console,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise,
    String,
    Object,
    Array,
    Map,
    Set,
    WeakSet,
    JSON,
    Number,
    Boolean,
    Error,
    TypeError,
    RegExp,
    Math
  };

  loadScript(path.join(__dirname, '..', 'site', 'chat-bridge.js'), sandbox);
  const createChatBridge = sandbox.window.__loadedCreateChatBridge;
  assert.ok(createChatBridge, 'chat bridge factory should be loaded');

  const bridge = createChatBridge({ session: 'room-1' });
  try {
    const before = window.__messages.length;
    bridge.refreshSession('room-1');

    const emitted = window.__messages.slice(before);
    assert.ok(emitted.some((message) => message.type === 'overlay-local-chat:refresh-session' && message.session === 'room-1'));
  } finally {
    bridge.close();
  }
});
