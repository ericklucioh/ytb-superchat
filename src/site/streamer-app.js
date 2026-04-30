import { buildOverlayPayload, compareMessageEvent, comparePriorityEvent, compareSuperchatEvent } from "./streamer-events.js";
import { cleanText } from "./streamer-text.js";
import { createCurrencyRateService } from "./streamer-rates.js";
import { createStreamerStore } from "./streamer-store.js";
import { createStreamerView } from "./streamer-view.js";
import { createChatBridge } from "./chat-bridge.js";
import { createLogger } from "./logger.js";
import { loadMockDeck, getMockRoomId } from "./streamer-mock.js";

const ENV = window.__YTB_ENV__ || {};
const STORAGE_KEY = ENV.overlayStorageKey || "overlay_state";
const ROOM_KEY = ENV.overlayRoomKey || "overlay_room_id";
const OVERLAY_SESSION_KEY = "overlay_api_session_id";
const DEFAULT_OVERLAY_API_BASE_URL = ENV.overlayApiBaseUrl || "http://localhost:8080";
const MAX_LIVE_MESSAGES = typeof ENV.overlayMaxLiveMessages === "number" ? ENV.overlayMaxLiveMessages : 500;
const API_TOKEN = cleanText(ENV.apiToken || window.__YTB_API_TOKEN__ || "");
const portalLogger = createLogger("portal", ENV.debugLogging);

function isFalsyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["0", "false", "no", "off"].includes(normalized);
}

function boot() {
  const elements = {
    sessionInput: document.getElementById("session-input"),
    generateOverlayButton: document.getElementById("generate-overlay-button"),
    connectButton: document.getElementById("connect-button"),
    summaryButton: document.getElementById("summary-button"),
    keepAwakeButton: document.getElementById("keep-awake-button"),
    keepAwakeStatus: document.getElementById("keep-awake-status"),
    connectionStatus: document.getElementById("connection-status"),
    mockBadge: document.getElementById("mock-badge"),
    summaryPopup: document.getElementById("summary-popup"),
    summaryCopyOverlayButton: document.getElementById("summary-copy-overlay"),
    summaryClearHistoryButton: document.getElementById("summary-clear-history"),
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

  if (!elements.sessionInput || !elements.generateOverlayButton || !elements.connectButton || !elements.filterGroup) {
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
  const initialOverlaySession = cleanText(localStorage.getItem(OVERLAY_SESSION_KEY) || "");

  const store = createStreamerStore({
    storageKey: STORAGE_KEY,
    roomKey: ROOM_KEY,
    maxLiveMessages: MAX_LIVE_MESSAGES,
    initialRoomId: initialRoom
  });
  const view = createStreamerView(elements);
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;

  let renderQueued = false;
  let lastRenderedFilter = "";
  let lastRenderKey = "";
  let summaryOpen = false;
  let detailId = "";
  let overlaySessionId = initialOverlaySession;
  const currencyService = createCurrencyRateService({ scheduleRender });
  const chatBridge = mockMode ? createMockBridge() : createChatBridge({
    session: initialRoom,
    onMessage: handleIncomingPayload,
    onReady: () => setStatus("online"),
    onSession: handleBridgeSession,
    logger: portalLogger.child("bridge")
  });

  portalLogger.debug("boot", {
    initialRoom,
    mockMode,
    overlayApiBaseUrl: resolveOverlayApiBaseUrl()
  });

  if (mockMode) {
    document.body.dataset.mockMode = "true";
  }

  if (elements.mockBadge) {
    const explicitMockBadge = params.has("mock") && !isFalsyFlag(params.get("mock"));
    elements.mockBadge.hidden = !mockMode || !explicitMockBadge;
  }

  elements.sessionInput.value = initializeOverlaySessionId();
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
        connect(storedChromeRoom);
        return;
      }
      setStatus("aguardando");
    });
  } else {
    setStatus("aguardando");
  }

  elements.connectButton.addEventListener("click", () => {
    const generatedBridgeSession = buildSessionId();
    connect(generatedBridgeSession);
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

  if (elements.keepAwakeButton && elements.keepAwakeStatus) {
    elements.keepAwakeButton.addEventListener("click", () => {
      void activateKeepAwake();
    });

    void refreshKeepAwakeStatus();
  }

  if (elements.generateOverlayButton) {
    elements.generateOverlayButton.addEventListener("click", () => {
      const generatedOverlaySession = buildSessionId();
      setOverlaySessionId(generatedOverlaySession);
      elements.sessionInput.value = generatedOverlaySession;
      void copyTextToClipboard(generatedOverlaySession);
      setStatus("api id gerado");
    });
  }

  if (elements.summaryClearHistoryButton) {
    elements.summaryClearHistoryButton.addEventListener("click", () => {
      void clearCurrentHistory();
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
      if (summaryOpen && isCopyShortcut(event)) {
        const target = event.target;
        const isInsideSummary = elements.summaryPopup && target instanceof Node && elements.summaryPopup.contains(target);
        if (isInsideSummary) {
          event.preventDefault();
          void copyOverlayLink();
          return;
        }
      }
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
  initializeOverlaySessionId();

  function connect(roomId) {
    const nextRoom = cleanText(roomId);
    if (!nextRoom) {
      setStatus("digite session id");
      return;
    }

    const previousRoom = store.state.roomId;

    portalLogger.debug("connect", {
      roomId: nextRoom
    });

    store.connectRoom(nextRoom);
    localStorage.setItem(ROOM_KEY, nextRoom);
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
      localStorage.setItem(OVERLAY_SESSION_KEY, normalized);
    } catch {
      //
    }

    return overlaySessionId;
  }

  async function copyTextToClipboard(text) {
    try {
      await navigator.clipboard?.writeText?.(text);
    } catch {
      fallbackCopyText(text);
    }
  }

  function handleBridgeSession(nextSession) {
    if (mockMode) {
      return;
    }

    const session = cleanText(nextSession);
    if (!session || session === store.state.roomId) {
      return;
    }

    portalLogger.debug("bridge-session", {
      from: store.state.roomId,
      to: session
    });

    store.connectRoom(session);
    localStorage.setItem(ROOM_KEY, session);
    persistSharedRoom(session);
    view.syncFilterButtons(store.state.filter);
    setStatus("sync");
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

    portalLogger.debug("incoming-payload", summarizePayload(normalized));

    if (store.insertEvent(normalized)) {
      scheduleRender();
    }
  }

  function toggleOverlaySelection(id) {
    const event = store.findEventById(id);
    const overlaySession = getOverlaySessionId();
    if (!event || !overlaySession) {
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
      sendOverlayOnce(overlaySession, overlayPayload);
    }

    openDetail(id);
    scheduleRender();
  }

  function sendOverlayOnce(sessionId, overlayPayload) {
    sendOverlayPacket(sessionId, {
      msg: true,
      id: `overlay-${overlayPayload.eventType || "message"}-${Date.now()}`,
      contents: overlayPayload
    });
  }

  function sendOverlayPacket(sessionId, packet) {
    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      return;
    }

    portalLogger.debug("send-overlay", {
      roomId: sessionId,
      endpoint: `${baseUrl.replace(/\/$/, "")}/api/event`,
      msg: packet?.msg,
      clear: packet?.contents === false,
      id: packet?.id || ""
    });

    fetch(`${baseUrl.replace(/\/$/, "")}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { "X-YTB-Token": API_TOKEN } : {})
      },
      body: JSON.stringify({
        session: sessionId,
        ...packet
      })
    }).catch((error) => {
      portalLogger.warn("Failed to send overlay packet", error);
    });
  }

  function resolveOverlayApiBaseUrl() {
    const stored = cleanText(localStorage.getItem("overlay_backend_base_url") || "");
    if (stored) {
      return normalizeApiBaseUrl(stored);
    }

    const runtimeEnv = window.__YTB_ENV__ || {};
    const runtimeApiBase = cleanText(
      runtimeEnv.publicBackendUrl
      || runtimeEnv.overlayApiBaseUrl
      || window.__PUBLIC_BACKEND_URL__
      || window.__OVERLAY_API_BASE_URL__
      || ""
    );
    if (runtimeApiBase) {
      return normalizeApiBaseUrl(runtimeApiBase);
    }

    return normalizeApiBaseUrl(DEFAULT_OVERLAY_API_BASE_URL);
  }

  async function copyOverlayLink() {
    const overlaySession = getOverlaySessionId();
    if (!overlaySession) {
      setStatus("gere overlay id");
      return;
    }

    const overlayUrl = buildOverlayUrl(overlaySession);

    try {
      await navigator.clipboard.writeText(overlayUrl);
      flashSummaryCopyButton("Copiado");
    } catch (error) {
      portalLogger.warn("Failed to copy overlay link", error);
      fallbackCopyText(overlayUrl);
      flashSummaryCopyButton("Copiado");
    }
  }

  async function activateKeepAwake() {
    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      updateKeepAwakeStatus("Não foi possível ativar o keep-awake.", false);
      return;
    }

    setKeepAwakeButtonBusy(true);
    updateKeepAwakeStatus("Ativando keep-awake...", false);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/keep-awake/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(API_TOKEN ? { "X-YTB-Token": API_TOKEN } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`keep-awake start failed with status ${response.status}`);
      }

      const payload = await response.json();
      updateKeepAwakeStatusFromPayload(payload);
    } catch (error) {
      portalLogger.warn("Failed to activate keep-awake", error);
      updateKeepAwakeStatus("Não foi possível ativar o keep-awake.", false);
    } finally {
      setKeepAwakeButtonBusy(false);
    }
  }

  async function refreshKeepAwakeStatus() {
    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      updateKeepAwakeStatus("Keep-awake indisponível.", false);
      return;
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/keep-awake/status`, {
        headers: {
          ...(API_TOKEN ? { "X-YTB-Token": API_TOKEN } : {})
        }
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      updateKeepAwakeStatusFromPayload(payload);
    } catch (error) {
      portalLogger.warn("Failed to refresh keep-awake status", error);
    }
  }

  function updateKeepAwakeStatusFromPayload(payload) {
    if (!elements.keepAwakeStatus) {
      return;
    }

    const active = Boolean(payload && payload.active);
    const until = payload && payload.until ? new Date(payload.until) : null;
    if (active && until instanceof Date && !Number.isNaN(until.getTime())) {
      updateKeepAwakeStatus(`Servidor será mantido acordado por 12 horas. Até ${formatFriendlyDateTime(until)}.`, true);
      return;
    }

    updateKeepAwakeStatus("Keep-awake inativo.", false);
  }

  function updateKeepAwakeStatus(message, isActive) {
    if (!elements.keepAwakeStatus) {
      return;
    }

    elements.keepAwakeStatus.textContent = message;
    elements.keepAwakeStatus.dataset.state = isActive ? "active" : "idle";
  }

  function setKeepAwakeButtonBusy(isBusy) {
    if (!elements.keepAwakeButton) {
      return;
    }

    elements.keepAwakeButton.disabled = isBusy;
    elements.keepAwakeButton.textContent = isBusy
      ? "Ativando keep-awake..."
      : "Manter servidor acordado durante a live";
  }

  function buildOverlayUrl(sessionId) {
    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      return "";
    }

    const tokenQuery = API_TOKEN ? `&token=${encodeURIComponent(API_TOKEN)}` : "";
    return `${baseUrl.replace(/\/$/, "")}/overlay?session=${encodeURIComponent(sessionId)}${tokenQuery}`;
  }

  function isCopyShortcut(event) {
    return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "c";
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

  function formatFriendlyDateTime(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(date);
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

    window.setTimeout(flush, document.visibilityState === "hidden" ? 0 : 16);
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
    const newestLiveId = chatEvents[0]?.id || "";
    const oldestLiveId = chatEvents[chatEvents.length - 1]?.id || "";
    const nextRenderKey = [
      state.roomId,
      state.filter,
      state.overlayId || "",
      detailId || "",
      counts.totalEvents,
      counts.twitchSubs,
      counts.youtubeMembers,
      counts.totalCombined,
      counts.superchats,
      priorityEvents.length,
      superchatEvents.length,
      chatEvents.length,
      newestLiveId,
      oldestLiveId,
      superchatTotals.totalBrl.toFixed(2)
    ].join("|");

    if (nextRenderKey === lastRenderKey) {
      return;
    }
    lastRenderKey = nextRenderKey;

    portalLogger.debug("render", {
      roomId: state.roomId,
      filter: state.filter,
      totalEvents: counts.totalEvents,
      priorityEvents: priorityEvents.length,
      superchatEvents: superchatEvents.length,
      chatEvents: chatEvents.length
    });

    if (superchatEvents.length) {
      currencyService.warmCurrencyRates(superchatEvents);
    }

    if (detailId && !focusedEvent) {
      detailId = "";
      view.setDetailOpen(false);
    }

    if (lastRenderedFilter !== state.filter) {
      lastRenderedFilter = state.filter;
      view.syncFilterButtons(state.filter);
    }
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
        sendOverlayClear(getOverlaySessionId());
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

  async function clearCurrentHistory() {
    const overlaySession = getOverlaySessionId();
    const hasEvents = store.state.events.length > 0 || store.liveEvents.length > 0;
    const hasOverlay = Boolean(store.state.overlayId);

    if (!hasEvents && !hasOverlay) {
      setStatus("histórico vazio");
      return;
    }

    const confirmed = window.confirm("Limpar o histórico do painel? A conexão atual será mantida.");
    if (!confirmed) {
      return;
    }

    if (hasOverlay && overlaySession) {
      sendOverlayClear(overlaySession);
    }

    store.clearHistory();
    detailId = "";
    view.setDetailOpen(false);
    scheduleRender();
    setStatus("histórico limpo");
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
      setStatus("mock");

      portalLogger.debug("mock-seed", {
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
      portalLogger.warn("Failed to load mock deck", error);
      setStatus("mock indisponível");
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
