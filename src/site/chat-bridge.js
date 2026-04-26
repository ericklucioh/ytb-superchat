const PAGE_EVENT = "overlay-local-chat:event";
const PAGE_SESSION_EVENT = "overlay-local-chat:set-session";
const PAGE_READY_EVENT = "overlay-local-chat:page-ready";
const PAGE_REFRESH_SESSION_EVENT = "overlay-local-chat:refresh-session";
const RELAY_READY_EVENT = "overlay-local-chat:relay-ready";
const READY_KEY = "overlay_local_chat_ready";

function cleanSession(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

export function createChatBridge({ session = "", onMessage, onReady, onSession, logger = null } = {}) {
  let currentSession = cleanSession(session);
  let closed = false;
  let readyNotified = false;
  const listeners = new Set();

  function emit(payload) {
    if (typeof onMessage === "function") {
      onMessage(payload);
    }

    for (const handler of listeners) {
      try {
        handler(payload);
      } catch {
        //
      }
    }
  }

  function handleWindowMessage(event) {
    if (closed || event.source !== window || !event.data || typeof event.data !== "object") {
      return;
    }

      if (event.data.type === PAGE_SESSION_EVENT) {
        currentSession = cleanSession(event.data.session || "");
        logger?.debug("session", { session: currentSession });
        if (currentSession && typeof onSession === "function") {
          onSession(currentSession);
        }
        return;
      }

      if (event.data.type === PAGE_EVENT) {
        const eventSession = cleanSession(event.data.session || "");
        if (!currentSession || !eventSession || eventSession === currentSession) {
          logger?.debug("event", {
            session: eventSession || currentSession,
            type: event.data.payload?.type || "",
            platform: event.data.payload?.platform || "",
            id: event.data.payload?.id || ""
          });
          emit(event.data.payload);
        }
        return;
      }

      if (event.data.type === RELAY_READY_EVENT) {
        const eventSession = cleanSession(event.data.session || "");
        if (!currentSession || !eventSession || eventSession === currentSession) {
          readyNotified = true;
          logger?.debug("ready", { session: eventSession || currentSession });
          if (typeof onReady === "function") {
            onReady(event.data);
          }
        }
      }
  }

  window.addEventListener("message", handleWindowMessage);

  function handlePageShow() {
    if (closed || !currentSession) {
      return;
    }

    logger?.debug("pageshow", { session: currentSession });
    announcePresence(currentSession);
  }

  function announcePresence(nextSession = currentSession) {
    const normalized = cleanSession(nextSession);
    if (normalized) {
      try {
        sessionStorage.setItem(READY_KEY, normalized);
      } catch {
        //
      }

      window.postMessage(
        {
          type: PAGE_SESSION_EVENT,
          session: normalized
        },
        window.location.origin
      );
    }

    logger?.debug("announce", { session: normalized });
    window.postMessage(
      {
        type: PAGE_READY_EVENT,
        session: normalized
      },
      window.location.origin
    );
  }

  announcePresence(currentSession);
  window.addEventListener("pageshow", handlePageShow);

  function setSession(nextSession) {
    const normalized = cleanSession(nextSession);
    currentSession = normalized;
    logger?.debug("set-session", { session: currentSession });
    announcePresence(currentSession);
    return currentSession;
  }

  function refreshSession(nextSession = currentSession) {
    const normalized = cleanSession(nextSession);
    if (!normalized) {
      return currentSession;
    }

    currentSession = normalized;
    logger?.debug("refresh-session", { session: currentSession });
    window.postMessage(
      {
        type: PAGE_REFRESH_SESSION_EVENT,
        session: normalized
      },
      window.location.origin
    );
    return currentSession;
  }

  function publish() {
    return false;
  }

  function subscribe(handler) {
    if (typeof handler === "function") {
      listeners.add(handler);
    }

    return () => {
      listeners.delete(handler);
    };
  }

  function close() {
    closed = true;
    logger?.debug("close", { session: currentSession });
    window.removeEventListener("message", handleWindowMessage);
    window.removeEventListener("pageshow", handlePageShow);
    listeners.clear();
  }

  return {
    close,
    publish,
    subscribe,
    setSession,
    refreshSession,
    get ready() {
      return readyNotified;
    },
    get session() {
      return currentSession;
    }
  };
}
