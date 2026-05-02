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

function createSandbox() {
  return {
    console,
    Date,
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
          innerHTML: "",
          value: "",
          childNodes: [],
          appendChild() {},
          set innerText(value) {
            this._innerText = value;
          },
          get innerText() {
            return this._innerText || "";
          }
        };
      }
    },
    fetch() {
      throw new Error("fetch should not be called for BITS");
    }
  };
}

test("bits are converted to BRL with the fixed rate and sorted by BRL equivalent", () => {
  const sandbox = createSandbox();
  loadModule(path.join(__dirname, "..", "site", "streamer-currency.js"), sandbox);
  loadModule(path.join(__dirname, "..", "site", "streamer-rates.js"), sandbox);
  loadModule(path.join(__dirname, "..", "site", "streamer-events.js"), sandbox);

  const createCurrencyRateService = sandbox.createCurrencyRateService;
  const compareSuperchatEvent = sandbox.compareSuperchatEvent;

  assert.equal(typeof createCurrencyRateService, "function");
  assert.equal(typeof compareSuperchatEvent, "function");

  const service = createCurrencyRateService({ scheduleRender() {} });
  const bitsEvent = service.decorateSuperchatEvent({
    id: "bits",
    type: "superchat",
    amount: 100,
    currency: "BITS"
  });
  const brlEvent = service.decorateSuperchatEvent({
    id: "brl",
    type: "superchat",
    amount: 9,
    currency: "BRL"
  });

  assert.equal(bitsEvent.currencyRate, 0.08);
  assert.equal(bitsEvent.brlAmount, 8);
  assert.equal(bitsEvent.sortBrlAmount, 8);
  assert.equal(bitsEvent.currencyRateLoaded, true);

  const ordered = [bitsEvent, brlEvent].sort(compareSuperchatEvent);
  assert.equal(ordered[0].id, "brl");
  assert.equal(ordered[1].id, "bits");
});

test("bits do not trigger remote rate loading", () => {
  let fetchCalls = 0;
  const sandbox = createSandbox();
  sandbox.fetch = () => {
    fetchCalls += 1;
    return Promise.resolve({ ok: false, json: async () => ({}) });
  };

  loadModule(path.join(__dirname, "..", "site", "streamer-currency.js"), sandbox);
  loadModule(path.join(__dirname, "..", "site", "streamer-rates.js"), sandbox);

  const service = sandbox.createCurrencyRateService({ scheduleRender() {} });
  service.warmCurrencyRates([
    {
      type: "superchat",
      amount: 100,
      currency: "BITS"
    }
  ]);

  assert.equal(fetchCalls, 0);
});
