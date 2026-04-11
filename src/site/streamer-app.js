import { buildOverlayPayload, cleanText, compareMessageEvent, comparePriorityEvent, compareSuperchatEvent, feedRoomFor } from "./streamer-utils.js";
import { createStreamerStore } from "./streamer-store.js";
import { createStreamerView } from "./streamer-view.js";

const STORAGE_KEY = "overlay_state";
const ROOM_KEY = "overlay_room_id";
const MAX_EVENTS = 500;
const MAX_LIVE_MESSAGES = 500;

function boot() {
  const elements = {
    sessionInput: document.getElementById("session-input"),
    connectButton: document.getElementById("connect-button"),
    summaryButton: document.getElementById("summary-button"),
    connectionStatus: document.getElementById("connection-status"),
    summaryPopup: document.getElementById("summary-popup"),
    detailPopup: document.getElementById("detail-popup"),
    filterGroup: document.getElementById("filter-group"),
    currentFilter: document.getElementById("current-filter"),
    eventTotal: document.getElementById("event-total"),
    countTwitchSubs: document.getElementById("count-twitch-subs"),
    countYoutubeMembers: document.getElementById("count-youtube-members"),
    countTotalCombined: document.getElementById("count-total-combined"),
    countSuperchats: document.getElementById("count-superchats"),
    priorityCount: document.getElementById("priority-count"),
    superchatCount: document.getElementById("superchat-count"),
    chatCount: document.getElementById("chat-count"),
    priorityList: document.getElementById("priority-list"),
    superchatList: document.getElementById("superchat-list"),
    chatList: document.getElementById("chat-list"),
    priorityTemplate: document.getElementById("priority-template"),
    eventTemplate: document.getElementById("event-template")
  };

  if (!elements.sessionInput || !elements.connectButton || !elements.filterGroup) {
    return;
  }

  const store = createStreamerStore({
    storageKey: STORAGE_KEY,
    roomKey: ROOM_KEY,
    maxEvents: MAX_EVENTS,
    maxLiveMessages: MAX_LIVE_MESSAGES
  });
  const view = createStreamerView(elements);
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;

  const params = new URLSearchParams(window.location.search);
  const urlRoom = cleanText(params.get("session") || params.get("s") || "");
  const storedRoom = cleanText(localStorage.getItem(ROOM_KEY) || "");
  const initialRoom = urlRoom || storedRoom || store.state.roomId || "";

  let feedSocket = null;
  let connectionToken = 0;
  let renderQueued = false;
  let heartbeatTimer = null;
  let summaryOpen = false;
  let detailId = "";

  elements.sessionInput.value = initialRoom;
  view.syncFilterButtons(store.state.filter);
  view.setSummaryOpen(summaryOpen);
  view.setDetailOpen(false);

  if (initialRoom) {
    connect(initialRoom);
  } else if (hasChromeStorage) {
    chrome.storage.sync.get(["streamID"], (result) => {
      const storedChromeRoom = cleanText(result?.streamID || "");
      if (storedChromeRoom) {
        elements.sessionInput.value = storedChromeRoom;
        connect(storedChromeRoom);
        return;
      }
      setStatus("Aguardando session ID");
    });
  } else {
    setStatus("Aguardando session ID");
  }

  elements.connectButton.addEventListener("click", () => {
    connect(elements.sessionInput.value.trim());
  });

  elements.sessionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      connect(elements.sessionInput.value.trim());
    }
  });

  if (elements.summaryButton && elements.summaryPopup) {
    elements.summaryButton.addEventListener("click", () => {
      setSummaryOpen(!summaryOpen);
    });

    elements.summaryPopup.addEventListener("click", (event) => {
      if (event.target.closest("[data-summary-close]")) {
        setSummaryOpen(false);
      }
    });
  }

  if (elements.detailPopup) {
    elements.detailPopup.addEventListener("click", (event) => {
      if (event.target.closest("[data-detail-close]")) {
        closeDetail();
        return;
      }

      const actionButton = event.target.closest("button[data-detail-action]");
      if (!actionButton || !detailId) {
        return;
      }

      const nextStatus = actionButton.getAttribute("data-detail-action");
      if (!nextStatus) {
        return;
      }

      closeDetail({ status: nextStatus });
    });
  }

  elements.filterGroup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) {
      return;
    }

    const nextFilter = button.getAttribute("data-filter");
    if (store.setFilter(nextFilter)) {
      view.syncFilterButtons(store.state.filter);
      scheduleRender();
    }
  });

  [elements.priorityList, elements.superchatList, elements.chatList].forEach((list) => {
    list.addEventListener("click", (event) => {
      const actionButton = event.target.closest("button[data-action]");
      const card = event.target.closest("[data-id]");
      if (!card) {
        return;
      }

      const id = card.getAttribute("data-id");

      if (actionButton) {
        const nextStatus = actionButton.getAttribute("data-action");
        if (store.updateStatus(id, nextStatus)) {
          scheduleRender();
        }
        return;
      }

      toggleOverlaySelection(id);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (detailId) {
      closeDetail();
      return;
    }

    if (summaryOpen) {
      setSummaryOpen(false);
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }

    if (store.syncFromExternalState(event.newValue)) {
      view.syncFilterButtons(store.state.filter);
      if (detailId && !store.findEventById(detailId)) {
        detailId = "";
        view.setDetailOpen(false);
      }
      scheduleRender();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      renderQueued = false;
      render();
    }
  });

  window.addEventListener("beforeunload", cleanup);

  startHeartbeat();
  scheduleRender();

  function connect(roomId) {
    const nextRoom = cleanText(roomId);
    if (!nextRoom) {
      setStatus("Digite um session ID para conectar");
      return;
    }

    connectionToken += 1;
    const token = connectionToken;
    const joinedRoom = feedRoomFor(nextRoom);

    store.connectRoom(nextRoom);
    localStorage.setItem(ROOM_KEY, nextRoom);
    persistSharedRoom(nextRoom);
    elements.sessionInput.value = nextRoom;
    view.syncFilterButtons(store.state.filter);
    setStatus("🟡");

    if (feedSocket) {
      try {
        feedSocket.close();
      } catch {
        // ignore close errors
      }
      feedSocket = null;
    }

    const socket = new WebSocket("wss://api.overlay.ninja");
    feedSocket = socket;

    socket.addEventListener("open", () => {
      if (token !== connectionToken || feedSocket !== socket) {
        return;
      }
      setStatus("🟢");
      socket.send(JSON.stringify({ join: joinedRoom }));
      scheduleRender();
    });

    socket.addEventListener("message", (event) => {
      if (token !== connectionToken || feedSocket !== socket) {
        return;
      }

      const payload = parsePayload(event.data);
      if (!payload) {
        return;
      }

      const normalized = store.normalizer.normalizeIncoming(payload);
      if (!normalized) {
        return;
      }

      if (store.insertEvent(normalized)) {
        scheduleRender();
      }
    });

    socket.addEventListener("close", () => {
      if (token !== connectionToken || feedSocket !== socket) {
        return;
      }

      setStatus("🟡");
      window.setTimeout(() => {
        if (token === connectionToken && feedSocket === socket) {
          connect(nextRoom);
        }
      }, 1800);
    });

    socket.addEventListener("error", () => {
      if (token === connectionToken && feedSocket === socket) {
        setStatus("Falha na conexão. Tentando novamente.");
      }
    });
  }

  function toggleOverlaySelection(id) {
    const event = store.findEventById(id);
    const roomId = store.state.roomId;
    if (!event || !roomId) {
      return;
    }

    if (detailId === id) {
      closeDetail();
      return;
    }

    const overlayPayload = buildOverlayPayload(event);
    if (!overlayPayload) {
      return;
    }

    if (store.setOverlayId(id)) {
      sendOverlayOnce(roomId, overlayPayload);
    }

    openDetail(id);
    scheduleRender();
  }

  function sendOverlayOnce(roomId, overlayPayload) {
    sendOverlayPacket(roomId, {
      msg: true,
      id: `overlay-${overlayPayload.eventType || "message"}-${Date.now()}`,
      contents: overlayPayload
    });
  }

  function sendOverlayPacket(roomId, packet) {
    const socket = new WebSocket("wss://api.overlay.ninja");
    let sent = false;

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ join: roomId }));
      window.setTimeout(() => {
        if (sent) {
          return;
        }
        sent = true;
        socket.send(JSON.stringify(packet));
        window.setTimeout(() => {
          try {
            socket.close();
          } catch {
            // ignore close errors
          }
        }, 200);
      }, 60);
    });

    socket.addEventListener("error", () => {
      try {
        socket.close();
      } catch {
        // ignore close errors
      }
    });
  }

  function scheduleRender() {
    if (renderQueued) {
      return;
    }

    renderQueued = true;
    const flush = () => {
      renderQueued = false;
      render();
    };

    if (document.visibilityState === "hidden") {
      window.setTimeout(flush, 0);
      return;
    }

    window.requestAnimationFrame(flush);
  }

  function render() {
    const state = store.state;
    const visibleEvents = store.getVisibleEvents();
    const priorityEvents = visibleEvents
      .filter((event) => event.type === "sub" || event.type === "member")
      .sort(comparePriorityEvent);
    const superchatEvents = visibleEvents
      .filter((event) => event.type === "superchat")
      .sort(compareSuperchatEvent);
    const chatEvents = store.liveEvents.slice().sort(compareMessageEvent);
    const counts = store.getCounts();
    const focusedEvent = detailId ? store.findEventById(detailId) : null;

    if (detailId && !focusedEvent) {
      detailId = "";
      view.setDetailOpen(false);
    }

    view.syncFilterButtons(state.filter);
    view.render({
      state,
      priorityEvents,
      superchatEvents,
      chatEvents,
      counts,
      focusedEvent
    });
  }

  function setStatus(message) {
    view.setStatus(message);
  }

  function setSummaryOpen(nextOpen) {
    summaryOpen = Boolean(nextOpen);
    view.setSummaryOpen(summaryOpen);
    if (summaryOpen) {
      scheduleRender();
    }
  }

  function openDetail(id) {
    detailId = id;
    view.setDetailOpen(true);
  }

  function closeDetail(options = {}) {
    const { status = "read", clearOverlay = true } = options;

    if (detailId) {
      if (status && store.updateStatus(detailId, status)) {
        // status already persisted
      }

      if (clearOverlay && store.state.overlayId === detailId && store.clearOverlayId()) {
        sendOverlayClear(store.state.roomId);
      }
    }

    detailId = "";
    view.setDetailOpen(false);
    scheduleRender();
  }

  function sendOverlayClear(roomId) {
    sendOverlayPacket(roomId, {
      msg: true,
      contents: false
    });
  }

  function persistSharedRoom(roomId) {
    if (!hasChromeStorage) {
      return;
    }

    chrome.storage.sync.set({
      streamID: roomId
    });
  }

  function startHeartbeat() {
    if (heartbeatTimer) {
      return;
    }

    heartbeatTimer = window.setInterval(() => {
      renderQueued = false;
      render();
    }, 2000);
  }

  function cleanup() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (feedSocket) {
      try {
        feedSocket.close();
      } catch {
        // ignore close errors
      }
      feedSocket = null;
    }
  }

  function parsePayload(raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      return null;
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
