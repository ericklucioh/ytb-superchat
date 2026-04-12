(function () {
  const runtime = window.OverlayRuntime;
  const bridgeFactory = window.OverlayLocalChatBridge;

  if (!runtime || !bridgeFactory) {
    return;
  }

  const SESSION_KEY = "overlay_room_id";
  const READY_KEY = "overlay_local_chat_ready";
  const PAGE_EVENT = "overlay-local-chat:event";
  const PAGE_SESSION_EVENT = "overlay-local-chat:set-session";
  const PAGE_READY_EVENT = "overlay-local-chat:page-ready";
  const RELAY_READY_EVENT = "overlay-local-chat:relay-ready";
  const SYNC_SESSION_KEY = "streamID";

  function cleanSession(value) {
    return String(value || "").replace(/\s+/g, "").trim();
  }

  function readInitialSession() {
    try {
      const params = new URLSearchParams(window.location.search);
      return cleanSession(params.get("session") || localStorage.getItem(SESSION_KEY) || "");
    } catch {
      return "";
    }
  }

  function readSyncedSession() {
    if (!chrome?.storage?.sync?.get) {
      return Promise.resolve("");
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get(["streamID"], (result) => {
        resolve(cleanSession(result?.streamID || ""));
      });
    });
  }

  function persistSyncedSession(session) {
    const normalized = cleanSession(session);
    if (!normalized || !chrome?.storage?.sync?.set) {
      return;
    }

    chrome.storage.sync.set({
      streamID: normalized
    });
  }

  function readReadyMarker() {
    try {
      return Boolean(sessionStorage.getItem(READY_KEY));
    } catch {
      return false;
    }
  }

  function createRelay() {
    let currentSession = "";
    let channel = null;
    let disposed = false;
    let pageReady = readReadyMarker();
    const pendingMessages = [];

    function injectPageShim() {
      if (document.getElementById("overlay-dashboard-page-shim")) {
        return;
      }

      const script = document.createElement("script");
      script.id = "overlay-dashboard-page-shim";
      script.src = chrome.runtime.getURL("sources/dashboard-page-shim.js");
      script.async = false;
      script.onload = () => {
        try {
          script.remove();
        } catch {
          //
        }
      };
      (document.head || document.documentElement).appendChild(script);
    }

    function postToPage(message) {
      if (disposed || !message) {
        return;
      }

      if (!pageReady) {
        pendingMessages.push(message);
        return;
      }

      window.postMessage(message, window.location.origin);
    }

    function flushPending() {
      if (!pageReady || !pendingMessages.length) {
        return;
      }

      const queue = pendingMessages.splice(0);
      for (const message of queue) {
        window.postMessage(message, window.location.origin);
      }
    }

    function ensureChannel(nextSession) {
      const session = cleanSession(nextSession);
      if (!session) {
        return;
      }

      if (channel) {
        channel.close();
        channel = null;
      }

      currentSession = session;
      channel = bridgeFactory.createChannel({
        role: "dashboard",
        session: currentSession,
        onMessage: handleBridgeMessage
      });
      channel.connect();
    }

    function handleBridgeMessage(message) {
      if (disposed || !message || message.session !== currentSession) {
        return;
      }

      if (message.type === "publish" && message.payload) {
        postToPage({
          type: PAGE_EVENT,
          session: currentSession,
          payload: message.payload
        });
        return;
      }

      if (message.type === "ready") {
        postToPage({
          type: RELAY_READY_EVENT,
          session: currentSession
        });
      }
    }

    function handleWindowMessage(event) {
      if (disposed || event.source !== window || !event.data) {
        return;
      }

      if (event.data.type !== PAGE_SESSION_EVENT) {
        if (event.data.type === PAGE_READY_EVENT) {
          pageReady = true;
          flushPending();
        }
        return;
      }

      const nextSession = cleanSession(event.data.session || "");
      if (!nextSession || nextSession === currentSession) {
        return;
      }

      ensureChannel(nextSession);
      persistSyncedSession(currentSession);
      try {
        localStorage.setItem(SESSION_KEY, currentSession);
      } catch {
        //
      }
      postToPage({
        type: PAGE_SESSION_EVENT,
        session: currentSession
      });
      postToPage({
        type: RELAY_READY_EVENT,
        session: currentSession
      });
    }

    function handleStorageEvent(event) {
      if (disposed || event.key !== READY_KEY || !event.newValue) {
        return;
      }

      pageReady = true;
      flushPending();
    }

    function handleChromeStorageChange(changes, areaName) {
      if (disposed || areaName !== "sync" || !changes || !changes[SYNC_SESSION_KEY]) {
        return;
      }

      const nextSession = cleanSession(changes[SYNC_SESSION_KEY].newValue || "");
      if (!nextSession || nextSession === currentSession) {
        return;
      }

      ensureChannel(nextSession);
      try {
        localStorage.setItem(SESSION_KEY, currentSession);
      } catch {
        //
      }

      postToPage({
        type: PAGE_SESSION_EVENT,
        session: currentSession
      });
      postToPage({
        type: RELAY_READY_EVENT,
        session: currentSession
      });
    }

    window.addEventListener("message", handleWindowMessage);
    window.addEventListener("storage", handleStorageEvent);
    if (chrome?.storage?.onChanged?.addListener) {
      chrome.storage.onChanged.addListener(handleChromeStorageChange);
    }

    injectPageShim();

    const initialSession = readInitialSession();
    if (initialSession) {
      ensureChannel(initialSession);
      persistSyncedSession(currentSession);
      postToPage({
        type: PAGE_SESSION_EVENT,
        session: currentSession
      });
      postToPage({
        type: RELAY_READY_EVENT,
        session: currentSession
      });
    }

    void readSyncedSession().then((syncedSession) => {
      if (disposed || !syncedSession || syncedSession === currentSession) {
        return;
      }

      ensureChannel(syncedSession);
      persistSyncedSession(currentSession);
      postToPage({
        type: PAGE_SESSION_EVENT,
        session: currentSession
      });
      postToPage({
        type: RELAY_READY_EVENT,
        session: currentSession
      });

      try {
        localStorage.setItem(SESSION_KEY, currentSession);
      } catch {
        //
      }
    });

    return {
      setSession(session) {
        ensureChannel(session);
        persistSyncedSession(currentSession);
        try {
          localStorage.setItem(SESSION_KEY, currentSession);
        } catch {
          //
        }
        postToPage({
          type: PAGE_SESSION_EVENT,
          session: currentSession
        });
        postToPage({
          type: RELAY_READY_EVENT,
          session: currentSession
        });
      },
      close() {
        disposed = true;
        window.removeEventListener("message", handleWindowMessage);
        window.removeEventListener("storage", handleStorageEvent);
        if (chrome?.storage?.onChanged?.removeListener) {
          chrome.storage.onChanged.removeListener(handleChromeStorageChange);
        }
        if (channel) {
          channel.close();
          channel = null;
        }
      }
    };
  }

  window.OverlayDashboardRelay = createRelay();
})();
