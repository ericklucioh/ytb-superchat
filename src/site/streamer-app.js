import { buildOverlayPayload, compareMessageEvent, comparePriorityEvent, compareSuperchatEvent } from "./streamer-events.js";
import { cleanText } from "./streamer-text.js";
import { createCurrencyRateService } from "./streamer-rates.js";
import { createStreamerStore } from "./streamer-store.js";
import { createStreamerView } from "./streamer-view.js";
import { createChatBridge } from "./chat-bridge.js";
import { loadMockDeck, getMockRoomId } from "./streamer-mock.js";

const ENV = window.__YTB_ENV__ || {};
const STORAGE_KEY = ENV.overlayStorageKey || "overlay_state";
const ROOM_KEY = ENV.overlayRoomKey || "overlay_room_id";
const DEFAULT_OVERLAY_API_BASE_URL = ENV.overlayApiBaseUrl || "http://localhost:8080";
const MAX_LIVE_MESSAGES = typeof ENV.overlayMaxLiveMessages === "number" ? ENV.overlayMaxLiveMessages : 500;
const PORTAL_LOG_PREFIX = ENV.portalLogPrefix || "[portal]";

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function isFalsyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["0", "false", "no", "off"].includes(normalized);
}

function boot() {
  const elements = {
    sessionInput: document.getElementById("session-input"),
    generateButton: document.getElementById("generate-button"),
    connectButton: document.getElementById("connect-button"),
    summaryButton: document.getElementById("summary-button"),
    connectionStatus: document.getElementById("connection-status"),
    mockBadge: document.getElementById("mock-badge"),
    summaryPopup: document.getElementById("summary-popup"),
    summaryCopyOverlayButton: document.getElementById("summary-copy-overlay"),
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

  if (!elements.sessionInput || !elements.generateButton || !elements.connectButton || !elements.filterGroup) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const runtimeEnv = window.__YTB_ENV__ || {};
  const mockLayoutEnabled = runtimeEnv.portalMockMode === true;
  const mockMode = mockLayoutEnabled && (params.has("mock")
    ? !isFalsyFlag(params.get("mock"))
    : true);
  const mockRoomId = getMockRoomId();
  const urlRoom = cleanText(params.get("session") || params.get("s") || "");
  const envRoom = cleanText(runtimeEnv.sessionId || "");
  const storedRoom = cleanText(localStorage.getItem(ROOM_KEY) || "");
  const initialRoom = mockMode ? mockRoomId : (urlRoom || envRoom || storedRoom || "");

  const store = createStreamerStore({
    storageKey: STORAGE_KEY,
    roomKey: ROOM_KEY,
    maxLiveMessages: MAX_LIVE_MESSAGES,
    initialRoomId: initialRoom
  });
  const view = createStreamerView(elements);
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;

  let renderQueued = false;
  let summaryOpen = false;
  let detailId = "";
  const currencyService = createCurrencyRateService({ scheduleRender });
  const chatBridge = mockMode ? createMockBridge() : createChatBridge({
    session: initialRoom,
    onMessage: handleIncomingPayload,
    onReady: () => setStatus("🟢"),
    onSession: handleBridgeSession
  });

  console.log(PORTAL_LOG_PREFIX, "boot", {
    initialRoom,
    mockMode,
    overlayApiBaseUrl: resolveOverlayApiBaseUrl()
  });

  if (mockMode) {
    document.body.dataset.mockMode = "true";
  }

  if (elements.mockBadge) {
    elements.mockBadge.hidden = !mockMode;
  }

  elements.sessionInput.value = initialRoom;
  view.syncFilterButtons(store.state.filter);
  view.setSummaryOpen(summaryOpen);
  view.setDetailOpen(false);

  if (mockMode) {
    void seedMockDeck();
  } else if (initialRoom) {
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

  elements.generateButton.addEventListener("click", () => {
    const generatedSession = buildSessionId();
    elements.sessionInput.value = generatedSession;
    connect(generatedSession);
    try {
      navigator.clipboard?.writeText?.(generatedSession);
    } catch {
      //
    }
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

  if (elements.summaryCopyOverlayButton) {
    elements.summaryCopyOverlayButton.addEventListener("click", () => {
      void copyOverlayLink();
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
    if (event.key !== store.getStorageKey() || !event.newValue) {
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

  scheduleRender();

  function connect(roomId) {
    const nextRoom = cleanText(roomId);
    if (!nextRoom) {
      setStatus("Digite um session ID para conectar");
      return;
    }

    console.log(PORTAL_LOG_PREFIX, "connect", {
      roomId: nextRoom
    });

    store.connectRoom(nextRoom);
    localStorage.setItem(ROOM_KEY, nextRoom);
    persistSharedRoom(nextRoom);
    elements.sessionInput.value = nextRoom;
    view.syncFilterButtons(store.state.filter);
    setStatus("🟡");
    if (!mockMode) {
      chatBridge.setSession(nextRoom);
    }
    scheduleRender();
  }

  function buildSessionId(length = 11) {
    const alphabet = "ABCEFGHJKLMNPQRSTUVWXYZabcefghijkmnpqrstuvwxyz23456789";
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
      result += alphabet.charAt(bytes[index] % alphabet.length);
    }
    return result;
  }

  function handleBridgeSession(nextSession) {
    if (mockMode) {
      return;
    }

    const session = cleanText(nextSession);
    if (!session || session === store.state.roomId) {
      return;
    }

    console.log(PORTAL_LOG_PREFIX, "bridge-session", {
      from: store.state.roomId,
      to: session
    });

    store.connectRoom(session);
    localStorage.setItem(ROOM_KEY, session);
    persistSharedRoom(session);
    elements.sessionInput.value = session;
    view.syncFilterButtons(store.state.filter);
    setStatus("🟡");
    scheduleRender();
  }

  function handleIncomingPayload(payload) {
    if (!payload) {
      return;
    }

    const normalized = store.normalizer.normalizeIncoming(payload);
    if (!normalized) {
      return;
    }

    console.log(PORTAL_LOG_PREFIX, "incoming-payload", summarizePayload(normalized));

    if (store.insertEvent(normalized)) {
      scheduleRender();
    }
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
    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      return;
    }

    console.log(PORTAL_LOG_PREFIX, "send-overlay", {
      roomId,
      endpoint: `${baseUrl.replace(/\/$/, "")}/api/event`,
      msg: packet?.msg,
      clear: packet?.contents === false,
      id: packet?.id || ""
    });

    fetch(`${baseUrl.replace(/\/$/, "")}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: roomId,
        ...packet
      })
    }).catch((error) => {
      console.warn("Failed to send overlay packet", error);
    });
  }

  function resolveOverlayApiBaseUrl() {
    const stored = cleanText(localStorage.getItem("overlay_backend_base_url") || "");
    if (stored) {
      return normalizeApiBaseUrl(stored);
    }

    const runtimeEnv = window.__YTB_ENV__ || {};
    const runtimeApiBase = cleanText(runtimeEnv.overlayApiBaseUrl || window.__OVERLAY_API_BASE_URL__ || "");
    if (runtimeApiBase) {
      return normalizeApiBaseUrl(runtimeApiBase);
    }

    return normalizeApiBaseUrl(DEFAULT_OVERLAY_API_BASE_URL);
  }

  async function copyOverlayLink() {
    const roomId = cleanText(elements.sessionInput.value || store.state.roomId || localStorage.getItem(ROOM_KEY) || "");
    if (!roomId) {
      setStatus("Digite um session ID para copiar o overlay");
      return;
    }

    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      setStatus("Base da API não configurada");
      return;
    }

    const overlayUrl = `${baseUrl.replace(/\/$/, "")}/overlay?session=${encodeURIComponent(roomId)}`;

    try {
      await navigator.clipboard.writeText(overlayUrl);
      flashSummaryCopyButton("Copiado");
    } catch (error) {
      console.warn("Failed to copy overlay link", error);
      fallbackCopyText(overlayUrl);
      flashSummaryCopyButton("Copiado");
    }
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch {
      //
    }
    textarea.remove();
  }

  function flashSummaryCopyButton(label) {
    if (!elements.summaryCopyOverlayButton) {
      return;
    }

    const originalLabel = elements.summaryCopyOverlayButton.textContent || "Copiar overlay";
    elements.summaryCopyOverlayButton.textContent = label;
    window.setTimeout(() => {
      if (elements.summaryCopyOverlayButton) {
        elements.summaryCopyOverlayButton.textContent = originalLabel;
      }
    }, 1400);
  }

  function normalizeApiBaseUrl(value) {
    const raw = cleanText(value || "").replace(/\/+$/, "");
    if (!raw) {
      return "";
    }

    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
      return raw;
    }

    if (raw.startsWith("//")) {
      return `${window.location.protocol}${raw}`;
    }

    const protocol = window.location.protocol === "http:" ? "http://" : "https://";
    return `${protocol}${raw}`;
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
      .map((event) => currencyService.decorateSuperchatEvent(event))
      .sort(compareSuperchatEvent);
    const chatEvents = store.liveEvents.slice().sort(compareMessageEvent);
    const counts = store.getCounts();
    const focusedEvent = detailId ? store.findEventById(detailId) : null;
    const superchatTotals = currencyService.summarizeSuperchatEvents(superchatEvents);

    currencyService.warmCurrencyRates(superchatEvents);

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
      superchatTotals,
      focusedEvent
    });
  }

  function summarizePayload(payload) {
    return {
      id: payload?.id || "",
      type: payload?.type || "",
      platform: payload?.platform || "",
      eventType: payload?.eventType || "",
      session: payload?.session || "",
      message: typeof payload?.chatmessage === "string" ? payload.chatmessage.slice(0, 80) : ""
    };
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
    if (mockMode) {
      return;
    }

    if (!hasChromeStorage) {
      return;
    }

    chrome.storage.sync.set({
      streamID: roomId
    });
  }

  function cleanup() {
    chatBridge.close();
  }

  async function seedMockDeck() {
    try {
      const mockPackets = await loadMockDeck();
      localStorage.removeItem(store.getStorageKey(mockRoomId));
      store.connectRoom(mockRoomId);
      elements.sessionInput.value = mockRoomId;
      view.syncFilterButtons(store.state.filter);
      setStatus("🧪 Mock");

      console.log(PORTAL_LOG_PREFIX, "mock-seed", {
        roomId: mockRoomId,
        packets: mockPackets.length
      });

      for (const packet of mockPackets) {
        if (!packet || packet.feed !== true || !packet.contents) {
          continue;
        }

        handleIncomingPayload(packet);
        sendOverlayPacket(mockRoomId, {
          msg: true,
          id: packet.id,
          contents: packet.contents
        });
      }

      scheduleRender();
    } catch (error) {
      console.warn("Failed to load mock deck", error);
      setStatus("Mock indisponível");
    }
  }

  function createMockBridge() {
    return {
      close() {},
      setSession() {},
      publish() {
        return false;
      }
    };
  }

}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
