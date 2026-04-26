function cleanNamespace(namespace) {
  return String(namespace || "app").trim().replace(/\s+/g, "-");
}

function normalizeEnabled(enabled) {
  return Boolean(enabled);
}

export function createLogger(namespace, enabled = false) {
  const scope = cleanNamespace(namespace);
  const prefix = `[${scope}]`;
  const isEnabled = normalizeEnabled(enabled);

  function emit(method, args, force = false) {
    const consoleMethod = typeof console !== "undefined" && console[method] ? console[method] : null;
    if (!consoleMethod) {
      return;
    }

    if (!force && !isEnabled) {
      return;
    }

    consoleMethod.call(console, prefix, ...args);
  }

  return {
    debug(...args) {
      emit("debug", args);
    },
    info(...args) {
      emit("info", args);
    },
    log(...args) {
      emit("log", args);
    },
    warn(...args) {
      emit("warn", args, true);
    },
    error(...args) {
      emit("error", args, true);
    },
    child(childNamespace) {
      return createLogger(`${scope}:${cleanNamespace(childNamespace)}`, isEnabled);
    }
  };
}
