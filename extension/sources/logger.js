(function (global) {
  if (global.OverlayLogger) {
    return;
  }

  const state = {
    debugEnabled: false,
    initialized: false
  };

  function cleanNamespace(namespace) {
    return String(namespace || "runtime").trim().replace(/\s+/g, "-");
  }

  function emit(method, prefix, args, enabled, force = false) {
    const consoleMethod = typeof console !== "undefined" && console[method] ? console[method] : null;
    if (!consoleMethod || (!force && !enabled)) {
      return;
    }

    consoleMethod.call(console, prefix, ...args);
  }

  function createLogger(namespace, enabled) {
    const scope = cleanNamespace(namespace);
    const hasExplicitEnabled = typeof enabled === "boolean";
    const prefix = `[${scope}]`;

    function isEnabled() {
      return hasExplicitEnabled ? enabled : state.debugEnabled;
    }

    return {
      debug(...args) {
        emit("debug", prefix, args, isEnabled());
      },
      info(...args) {
        emit("info", prefix, args, isEnabled());
      },
      log(...args) {
        emit("log", prefix, args, isEnabled());
      },
      warn(...args) {
        emit("warn", prefix, args, true);
      },
      error(...args) {
        emit("error", prefix, args, true);
      },
      child(childNamespace) {
        return createLogger(`${scope}:${cleanNamespace(childNamespace)}`, hasExplicitEnabled ? enabled : undefined);
      }
    };
  }

  function setDebugEnabled(nextEnabled) {
    state.debugEnabled = Boolean(nextEnabled);
    return state.debugEnabled;
  }

  function isDebugEnabled() {
    return state.debugEnabled;
  }

  function initChromeStorage() {
    if (state.initialized) {
      return;
    }
    state.initialized = true;

    try {
      if (global.chrome?.storage?.sync?.get) {
        global.chrome.storage.sync.get(["debugLogging"], (result) => {
          setDebugEnabled(result && result.debugLogging);
        });
      }
    } catch {
      //
    }

    try {
      if (global.chrome?.storage?.onChanged?.addListener) {
        global.chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName !== "sync" || !changes || !changes.debugLogging) {
            return;
          }
          setDebugEnabled(changes.debugLogging.newValue);
        });
      }
    } catch {
      //
    }
  }

  initChromeStorage();

  global.OverlayLogger = {
    createLogger,
    setDebugEnabled,
    isDebugEnabled,
    initChromeStorage
  };
})(globalThis);
