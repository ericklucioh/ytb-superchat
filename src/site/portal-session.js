import { cleanText } from "./streamer-text.js";

const SESSION_ALPHABET = "ABCEFGHJKLMNPQRSTUVWXYZabcefghijkmnpqrstuvwxyz23456789";

export function createPortalSessionController({
  store,
  view,
  chatBridge,
  logger,
  roomKey,
  overlaySessionKey,
  initialOverlaySession = "",
  hasChromeStorage = false,
  mockMode = false,
  localStorageRef = window.localStorage,
  chromeStorageSync = typeof chrome !== "undefined" ? chrome.storage?.sync : null,
  scheduleRender,
  setStatus
}) {
  let overlaySessionId = cleanText(initialOverlaySession);

  function connect(roomId) {
    const nextRoom = cleanText(roomId);
    if (!nextRoom) {
      setStatus("digite session id");
      return;
    }

    const previousRoom = store.state.roomId;
    logger.debug("connect", { roomId: nextRoom });

    store.connectRoom(nextRoom);
    localStorageRef.setItem(roomKey, nextRoom);
    persistSharedRoom(nextRoom);
    ensureOverlaySessionIsSeparate(nextRoom);
    view.syncFilterButtons(store.state.filter);
    setStatus("sync");

    if (!mockMode) {
      const sameRoom = nextRoom === previousRoom;
      if (sameRoom && chatBridge.ready && typeof chatBridge.refreshSession === "function") {
        chatBridge.refreshSession(nextRoom);
      } else {
        chatBridge.setSession(nextRoom);
      }
    }

    scheduleRender();
  }

  function buildSessionId(length = 11) {
    const bytes = new Uint8Array(length);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }

    let result = "";
    for (let index = 0; index < bytes.length; index += 1) {
      result += SESSION_ALPHABET.charAt(bytes[index] % SESSION_ALPHABET.length);
    }
    return result;
  }

  function initializeOverlaySessionId() {
    if (overlaySessionId) {
      return overlaySessionId;
    }

    return setOverlaySessionId(buildSessionId());
  }

  function ensureOverlaySessionIsSeparate(roomId) {
    if (!overlaySessionId || overlaySessionId !== roomId) {
      return;
    }

    setOverlaySessionId(buildSessionId());
  }

  function getOverlaySessionId() {
    return cleanText(overlaySessionId || "");
  }

  function setOverlaySessionId(nextSession) {
    const normalized = cleanText(nextSession);
    if (!normalized) {
      return "";
    }

    overlaySessionId = normalized;
    try {
      localStorageRef.setItem(overlaySessionKey, normalized);
    } catch {
      //
    }

    return overlaySessionId;
  }

  function handleBridgeSession(nextSession) {
    if (mockMode) {
      return;
    }

    const session = cleanText(nextSession);
    if (!session || session === store.state.roomId) {
      return;
    }

    logger.debug("bridge-session", {
      from: store.state.roomId,
      to: session
    });

    store.connectRoom(session);
    localStorageRef.setItem(roomKey, session);
    persistSharedRoom(session);
    view.syncFilterButtons(store.state.filter);
    setStatus("sync");
    scheduleRender();
  }

  function persistSharedRoom(roomId) {
    if (mockMode || !hasChromeStorage || !chromeStorageSync) {
      return;
    }

    chromeStorageSync.set({ streamID: roomId });
  }

  return {
    buildSessionId,
    connect,
    ensureOverlaySessionIsSeparate,
    getOverlaySessionId,
    handleBridgeSession,
    initializeOverlaySessionId,
    setOverlaySessionId
  };
}
