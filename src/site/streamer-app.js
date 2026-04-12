import { buildOverlayPayload, cleanText, compareMessageEvent, comparePriorityEvent, compareSuperchatEvent, feedRoomFor, isValidCurrencyCode, normalizeCurrencyCode } from "./streamer-utils.js";
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
    countSuperchatsBrlTotal: document.getElementById("count-superchats-brl-total"),
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
  const currencyRates = new Map();
  const pendingCurrencyRates = new Map();

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

    const overlayPayload = buildOverlayPayload(event, {
      currencyRate: getCurrencyRate(event.currency)
    });
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
      .map(decorateEventForView)
      .sort(compareSuperchatEvent);
    const chatEvents = store.liveEvents.slice().sort(compareMessageEvent);
    const counts = store.getCounts();
    const focusedEvent = detailId ? store.findEventById(detailId) : null;
    const priorityViewEvents = priorityEvents.map(decorateEventForView);
    const chatViewEvents = chatEvents.map(decorateEventForView);
    const focusedViewEvent = focusedEvent ? decorateEventForView(focusedEvent) : null;
    const superchatTotals = summarizeSuperchatEvents(superchatEvents);

    warmCurrencyRates(superchatEvents);

    if (detailId && !focusedEvent) {
      detailId = "";
      view.setDetailOpen(false);
    }

    view.syncFilterButtons(state.filter);
    view.render({
      state,
      priorityEvents: priorityViewEvents,
      superchatEvents,
      chatEvents: chatViewEvents,
      counts,
      superchatTotals,
      focusedEvent: focusedViewEvent
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

  function decorateEventForView(event) {
    if (!event || event.type !== "superchat" || !Number.isFinite(event.amount)) {
      return event;
    }

    const currency = normalizeCurrencyCode(event.currency || "BRL") || "BRL";
    const currencyRate = getCurrencyRate(currency);
    const brlAmount = Number.isFinite(currencyRate) ? event.amount * currencyRate : event.amount;
    const sortBrlAmount = brlAmount;

    return {
      ...event,
      currency,
      currencyRate,
      currencyRateLoaded: hasCurrencyRate(currency),
      brlAmount,
      sortBrlAmount
    };
  }

  function summarizeSuperchatEvents(events) {
    let totalBrl = 0;

    for (const event of events) {
      if (Number.isFinite(event?.brlAmount)) {
        totalBrl += event.brlAmount;
        continue;
      }
    }

    return { totalBrl };
  }

  function getCurrencyRate(currency) {
    const code = normalizeCurrencyCode(currency || "BRL") || "BRL";
    if (!isValidCurrencyCode(code)) {
      return null;
    }
    if (code === "BRL") {
      return 1;
    }

    return currencyRates.get(code) ?? null;
  }

  function hasCurrencyRate(currency) {
    const code = normalizeCurrencyCode(currency || "BRL") || "BRL";
    if (!isValidCurrencyCode(code)) {
      return false;
    }
    if (code === "BRL") {
      return true;
    }

    return currencyRates.has(code);
  }

  function warmCurrencyRates(events) {
    const currencies = new Set();

    for (const event of events) {
      if (!event || event.type !== "superchat" || !Number.isFinite(event.amount)) {
        continue;
      }

      const code = normalizeCurrencyCode(event.currency || "BRL") || "BRL";
      if (!isValidCurrencyCode(code)) {
        continue;
      }
      if (code !== "BRL" && !currencyRates.has(code) && !pendingCurrencyRates.has(code)) {
        currencies.add(code);
      }
    }

    for (const code of currencies) {
      loadCurrencyRate(code);
    }
  }

  function loadCurrencyRate(code) {
    if (pendingCurrencyRates.has(code)) {
      return pendingCurrencyRates.get(code);
    }

    const promise = fetchCurrencyRate(code)
      .then((rate) => {
        currencyRates.set(code, Number.isFinite(rate) && rate > 0 ? rate : null);
        return rate;
      })
      .finally(() => {
        pendingCurrencyRates.delete(code);
        scheduleRender();
      });

    pendingCurrencyRates.set(code, promise);
    return promise;
  }

  async function fetchCurrencyRate(code) {
    try {
      const rate = await fetchFrankfurterRate(code);
      if (Number.isFinite(rate) && rate > 0) {
        return rate;
      }
      return await fetchFrankfurterLegacyRate(code);
    } catch {
      return null;
    }
  }

  async function fetchFrankfurterRate(code) {
    const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(code)}&quotes=BRL`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rate = Array.isArray(data) ? data[0]?.rate : null;
    return Number.isFinite(rate) ? rate : null;
  }

  async function fetchFrankfurterLegacyRate(code) {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(code)}&to=BRL`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rate = Number(data?.rates?.BRL);
    return Number.isFinite(rate) ? rate : null;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
