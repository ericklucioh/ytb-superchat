const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadLogger(filePath, sandbox) {
  const source = `${fs.readFileSync(filePath, "utf8").replace(/^export\s+/gm, "")}\nwindow.__loadedCreateLogger = typeof createLogger === "function" ? createLogger : null;`;
  vm.runInNewContext(source, sandbox, { filename: filePath });
  return sandbox.window.__loadedCreateLogger;
}

function createConsoleStub() {
  const calls = [];
  const consoleStub = {};
  for (const method of ["debug", "info", "log", "warn", "error"]) {
    consoleStub[method] = (...args) => {
      calls.push({ method, args });
    };
  }
  consoleStub.__calls = calls;
  return consoleStub;
}

test("portal logger stays silent until enabled and preserves child namespace", () => {
  const consoleStub = createConsoleStub();
  const sandbox = {
    console: consoleStub,
    window: {},
    String,
    Boolean,
    Array,
    Object,
    Number,
    RegExp
  };

  const createLogger = loadLogger(path.join(__dirname, "..", "site", "logger.js"), sandbox);
  assert.ok(createLogger, "logger factory should load");

  const logger = createLogger("portal", false);
  logger.debug("boot");
  logger.warn("warn");

  const child = logger.child("bridge");
  child.error("boom");

  assert.equal(consoleStub.__calls.length, 2);
  assert.equal(consoleStub.__calls[0].method, "warn");
  assert.equal(consoleStub.__calls[0].args[0], "[portal]");
  assert.equal(consoleStub.__calls[1].method, "error");
  assert.equal(consoleStub.__calls[1].args[0], "[portal:bridge]");
});

test("portal logger emits debug when enabled", () => {
  const consoleStub = createConsoleStub();
  const sandbox = {
    console: consoleStub,
    window: {},
    String,
    Boolean,
    Array,
    Object,
    Number,
    RegExp
  };

  const createLogger = loadLogger(path.join(__dirname, "..", "site", "logger.js"), sandbox);
  const logger = createLogger("portal", true);
  logger.debug("boot", { roomId: "abc" });

  assert.equal(consoleStub.__calls.length, 1);
  assert.equal(consoleStub.__calls[0].method, "debug");
  assert.equal(consoleStub.__calls[0].args[0], "[portal]");
});
