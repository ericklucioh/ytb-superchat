const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadLogger(filePath, sandbox) {
  const source = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(source, sandbox, { filename: filePath });
  return sandbox.OverlayLogger;
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

test("extension logger follows the debug toggle", () => {
  const consoleStub = createConsoleStub();
  const sandbox = {
    console: consoleStub,
    chrome: {},
    globalThis: null
  };
  sandbox.globalThis = sandbox;

  const loggerApi = loadLogger(path.join(__dirname, "..", "sources", "logger.js"), sandbox);
  assert.ok(loggerApi, "logger API should load");

  const logger = loggerApi.createLogger("twitch");
  logger.debug("boot");
  assert.equal(consoleStub.__calls.length, 0);

  loggerApi.setDebugEnabled(true);
  logger.debug("boot", { roomId: "abc" });
  const child = logger.child("bridge");
  child.info("ready");

  assert.equal(consoleStub.__calls.length, 2);
  assert.equal(consoleStub.__calls[0].method, "debug");
  assert.equal(consoleStub.__calls[0].args[0], "[twitch]");
  assert.equal(consoleStub.__calls[1].method, "info");
  assert.equal(consoleStub.__calls[1].args[0], "[twitch:bridge]");
});
