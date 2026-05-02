const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadModule(filePath, sandbox) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import .*$/gm, "")
    .replace(/^export\s+/gm, "");

  vm.runInNewContext(source, sandbox, { filename: filePath });
  return sandbox;
}

function createLocalStorageStub() {
  const storage = new Map();

  return {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    }
  };
}

function createSandbox(now = 0) {
  const clock = {
    now
  };

  return {
    console,
    Date: {
      now() {
        return clock.now;
      }
    },
    Intl,
    Map,
    Math,
    Number,
    Object,
    Promise,
    RegExp,
    Set,
    String,
    Boolean,
    Array,
    Error,
    TypeError,
    JSON,
    document: {
      createElement() {
        return {
          _innerHTML: "",
          childNodes: [],
          appendChild() {},
          setAttribute() {},
          set innerHTML(value) {
            this._innerHTML = String(value);
          },
          get innerHTML() {
            return this._innerHTML;
          },
          set value(value) {
            this._value = String(value);
          },
          get value() {
            return this._value || this._innerHTML || "";
          }
        };
      }
    },
    localStorage: createLocalStorageStub(),
    fetch() {
      throw new Error("fetch should not be called in idempotency tests");
    },
    __clock: clock
  };
}

function loadNormalizerAndStore(sandbox) {
  loadModule(path.join(__dirname, "..", "site", "streamer-text.js"), sandbox);
  loadModule(path.join(__dirname, "..", "site", "streamer-currency.js"), sandbox);
  loadModule(path.join(__dirname, "..", "site", "streamer-events.js"), sandbox);
  loadModule(path.join(__dirname, "..", "site", "streamer-store.js"), sandbox);
}

function createSuperchatPayload(id, timestamp, amount = 100) {
  return {
    feed: true,
    contents: {
      id,
      platform: "twitch",
      chatname: "Streamer One",
      chatmessage: "support message",
      hasDonation: `${amount} bits`,
      timestamp
    }
  };
}

function createMemberPayload(id, timestamp, months = 3) {
  return {
    feed: true,
    contents: {
      id,
      platform: "twitch",
      chatname: "Member One",
      chatmessage: "renewed membership",
      hasMembership: `${months} months`,
      timestamp
    }
  };
}

function createMessagePayload(id, timestamp, chatmessage = "hello") {
  return {
    feed: true,
    contents: {
      id,
      platform: "twitch",
      chatname: "Chatter One",
      chatmessage,
      timestamp
    }
  };
}

test("normalizeIncoming builds stable dedupe keys per event type", () => {
  const sandbox = createSandbox();
  loadNormalizerAndStore(sandbox);

  const normalizer = sandbox.createEventNormalizer();
  const firstSuperchat = normalizer.normalizeIncoming(createSuperchatPayload("sc-a", 1, 100));
  const secondSuperchat = normalizer.normalizeIncoming(createSuperchatPayload("sc-b", 999, 100));
  const firstMember = normalizer.normalizeIncoming(createMemberPayload("mb-a", 1, 3));
  const secondMember = normalizer.normalizeIncoming(createMemberPayload("mb-b", 999, 3));
  const firstMessage = normalizer.normalizeIncoming(createMessagePayload("msg-a", 1));
  const secondMessage = normalizer.normalizeIncoming(createMessagePayload("msg-b", 999));

  assert.ok(firstSuperchat);
  assert.ok(secondSuperchat);
  assert.ok(firstMember);
  assert.ok(secondMember);
  assert.ok(firstMessage);
  assert.ok(secondMessage);

  assert.equal(firstSuperchat.dedupeKey, secondSuperchat.dedupeKey);
  assert.equal(firstMember.dedupeKey, secondMember.dedupeKey);
  assert.notEqual(firstMessage.dedupeKey, secondMessage.dedupeKey);
  assert.equal(firstMessage.dedupeKey, "message|twitch:msg-a");
});

test("store rejects duplicate cheers and allows replay after TTL expiry", () => {
  const sandbox = createSandbox(0);
  loadNormalizerAndStore(sandbox);

  const store = sandbox.createStreamerStore({
    storageKey: "overlay_state",
    roomKey: "overlay_room_id",
    maxLiveMessages: 50,
    initialRoomId: "room-1"
  });

  const first = store.normalizer.normalizeIncoming(createSuperchatPayload("sc-1", 1000, 100));
  const duplicate = store.normalizer.normalizeIncoming(createSuperchatPayload("sc-2", 2000, 100));
  const afterTtl = store.normalizer.normalizeIncoming(createSuperchatPayload("sc-3", 3000, 100));

  assert.ok(first);
  assert.ok(duplicate);
  assert.ok(afterTtl);

  assert.equal(store.insertEvent(first), true);
  assert.equal(store.insertEvent(duplicate), false);

  sandbox.__clock.now = 10 * 60 * 1000 + 1;
  assert.equal(store.insertEvent(afterTtl), true);
});

test("store clears idempotency cache on clearHistory and room change", () => {
  const sandbox = createSandbox(0);
  loadNormalizerAndStore(sandbox);

  const store = sandbox.createStreamerStore({
    storageKey: "overlay_state",
    roomKey: "overlay_room_id",
    maxLiveMessages: 50,
    initialRoomId: "room-1"
  });

  const firstMember = store.normalizer.normalizeIncoming(createMemberPayload("mb-1", 1000, 6));
  const replayMember = store.normalizer.normalizeIncoming(createMemberPayload("mb-2", 2000, 6));
  const roomChangeMember = store.normalizer.normalizeIncoming(createMemberPayload("mb-3", 3000, 6));

  assert.ok(firstMember);
  assert.ok(replayMember);
  assert.ok(roomChangeMember);

  assert.equal(store.insertEvent(firstMember), true);
  assert.equal(store.insertEvent(replayMember), false);

  store.clearHistory();
  assert.equal(store.insertEvent(replayMember), true);

  store.connectRoom("room-2");
  assert.equal(store.insertEvent(roomChangeMember), true);
});

test("store keeps message dedupe limited to id", () => {
  const sandbox = createSandbox(0);
  loadNormalizerAndStore(sandbox);

  const store = sandbox.createStreamerStore({
    storageKey: "overlay_state",
    roomKey: "overlay_room_id",
    maxLiveMessages: 50,
    initialRoomId: "room-1"
  });

  const firstMessage = store.normalizer.normalizeIncoming(createMessagePayload("msg-1", 1000, "same text"));
  const secondMessage = store.normalizer.normalizeIncoming(createMessagePayload("msg-2", 2000, "same text"));

  assert.ok(firstMessage);
  assert.ok(secondMessage);

  assert.equal(store.insertEvent(firstMessage), true);
  assert.equal(store.insertEvent(secondMessage), true);
  assert.equal(store.liveEvents.length, 2);
});
