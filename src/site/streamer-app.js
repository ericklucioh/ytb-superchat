import { buildOverlayPayload } from "./streamer-events.js";
import { cleanText } from "./streamer-text.js";
import { createCurrencyRateService } from "./streamer-rates.js";
import { createStreamerStore } from "./streamer-store.js";
import { createStreamerView } from "./streamer-view.js";
import { createChatBridge } from "./chat-bridge.js";
import { createLogger } from "./logger.js";
import { loadMockDeck, getMockRoomId } from "./streamer-mock.js";
import { createPortalClipboard } from "./portal-clipboard.js";
import { createPortalOverlayApi } from "./portal-overlay-api.js";
import { createPortalRenderLoop } from "./portal-render-loop.js";
import { createPortalSessionController } from "./portal-session.js";

const ENV = window.__YTB_ENV__ || {};
const STORAGE_KEY = ENV.overlayStorageKey || "overlay_state";
const ROOM_KEY = ENV.overlayRoomKey || "overlay_room_id";
const OVERLAY_SESSION_KEY = "overlay_api_session_id";
const DEFAULT_OVERLAY_API_BASE_URL = ENV.overlayApiBaseUrl || "http://localhost:8080";
const MAX_LIVE_MESSAGES = typeof ENV.overlayMaxLiveMessages === "number" ? ENV.overlayMaxLiveMessages : 500;
const portalLogger = createLogger("portal", ENV.debugLogging);

function isFalsyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["0", "false", "no", "off"].includes(normalized);
}

function boot() {
  const elements = collectElements();
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
  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync;

  const store = createStreamerStore({
    storageKey: STORAGE_KEY,
    roomKey: ROOM_KEY,
    maxLiveMessages: MAX_LIVE_MESSAGES,
    initialRoomId: initialRoom
  });
  const view = createStreamerView(elements);

  let summaryOpen = false;
  let detailId = "";
  let renderLoop = null;
  let sessionController = null;

  const currencyService = createCurrencyRateService({
    scheduleRender: () => renderLoop?.scheduleRender()
  });

  const chatBridge = mockMode ? createMockBridge() : createChatBridge({
    session: initialRoom,
    onMessage: handleIncomingPayload,
    onReady: () => setStatus("online"),
    onSession: (nextSession) => sessionController?.handleBridgeSession(nextSession),
    logger: portalLogger.child("bridge")
  });

  const clipboard = createPortalClipboard({
    logger: portalLogger,
    button: elements.summaryCopyOverlayButton
  });

  const overlayApi = createPortalOverlayApi({
    logger: portalLogger,
    elements,
    defaultOverlayApiBaseUrl: DEFAULT_OVERLAY_API_BASE_URL
  });

  renderLoop = createPortalRenderLoop({
    store,
    view,
    currencyService,
    logger: portalLogger,
    getDetailId: () => detailId,
    resetMissingDetail: () => {
      detailId = "";
      view.setDetailOpen(false);
    }
  });

  sessionController = createPortalSessionController({
    store,
    view,
    chatBridge,
    logger: portalLogger,
    roomKey: ROOM_KEY,
    overlaySessionKey: OVERLAY_SESSION_KEY,
    initialOverlaySession,
    hasChromeStorage,
    mockMode,
    scheduleRender: renderLoop.scheduleRender,
    setStatus
  });

  portalLogger.debug("boot", {
    initialRoom,
    mockMode,
    overlayApiBaseUrl: overlayApi.resolveOverlayApiBaseUrl()
  });

  initializeViewState();
  attachEventListeners();
  startInitialFlow();

  function collectElements() {
    return {
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
  }

  function initializeViewState() {
    if (mockMode) {
      document.body.dataset.mockMode = "true";
    }

    if (elements.mockBadge) {
      const explicitMockBadge = params.has("mock") && !isFalsyFlag(params.get("mock"));
      elements.mockBadge.hidden = !mockMode || !explicitMockBadge;
    }

    elements.sessionInput.value = sessionController.initializeOverlaySessionId();
    view.syncFilterButtons(store.state.filter);
    view.setSummaryOpen(summaryOpen);
    view.setDetailOpen(false);
  }

  function attachEventListeners() {
    elements.connectButton.addEventListener("click", () => {
      sessionController.connect(sessionController.buildSessionId());
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
        void overlayApi.activateKeepAwake();
      });

      void overlayApi.refreshKeepAwakeStatus();
    }

    elements.generateOverlayButton.addEventListener("click", () => {
      const generatedOverlaySession = sessionController.buildSessionId();
      sessionController.setOverlaySessionId(generatedOverlaySession);
      elements.sessionInput.value = generatedOverlaySession;
      void clipboard.copyText(generatedOverlaySession);
      setStatus("api id gerado");
    });

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
        renderLoop.scheduleRender();
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
            renderLoop.scheduleRender();
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
        renderLoop.scheduleRender();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        renderLoop.renderNow();
      }
    });

    window.addEventListener("beforeunload", cleanup);
  }

  function startInitialFlow() {
    renderLoop.scheduleRender();

    if (mockMode) {
      void seedMockDeck();
      return;
    }

    if (initialRoom) {
      sessionController.connect(initialRoom);
      return;
    }

    if (hasChromeStorage) {
      chrome.storage.sync.get(["streamID"], (result) => {
        const storedChromeRoom = cleanText(result?.streamID || "");
        if (storedChromeRoom) {
          sessionController.connect(storedChromeRoom);
          return;
        }
        setStatus("aguardando");
      });
      return;
    }

    setStatus("aguardando");
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
      renderLoop.scheduleRender();
    }
  }

  function toggleOverlaySelection(id) {
    const event = store.findEventById(id);
    const overlaySession = sessionController.getOverlaySessionId();
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
      overlayApi.sendOverlayOnce(overlaySession, overlayPayload);
    }

    openDetail(id);
    renderLoop.scheduleRender();
  }

  async function copyOverlayLink() {
    const overlaySession = sessionController.getOverlaySessionId();
    if (!overlaySession) {
      setStatus("gere overlay id");
      return;
    }

    const overlayUrl = overlayApi.buildOverlayUrl(overlaySession);
    await clipboard.copyTextWithButtonFeedback(overlayUrl);
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
      renderLoop.scheduleRender();
    }
  }

  function openDetail(id) {
    detailId = id;
    view.setDetailOpen(true);
  }

  function closeDetail(options = {}) {
    const { status = "read", clearOverlay = true } = options;

    if (detailId && status) {
      store.updateStatus(detailId, status);
    }

    if (detailId && clearOverlay && store.state.overlayId === detailId && store.clearOverlayId()) {
      overlayApi.sendOverlayClear(sessionController.getOverlaySessionId());
    }

    detailId = "";
    view.setDetailOpen(false);
    renderLoop.scheduleRender();
  }

  async function clearCurrentHistory() {
    const overlaySession = sessionController.getOverlaySessionId();
    const hasEvents = store.state.events.length > 0 || store.liveEvents.length > 0;
    const hasOverlay = Boolean(store.state.overlayId);

    if (!hasEvents && !hasOverlay) {
      setStatus("historico vazio");
      return;
    }

    const confirmed = window.confirm("Limpar o historico do painel? A conexao atual sera mantida.");
    if (!confirmed) {
      return;
    }

    if (hasOverlay && overlaySession) {
      overlayApi.sendOverlayClear(overlaySession);
    }

    store.clearHistory();
    detailId = "";
    view.setDetailOpen(false);
    renderLoop.scheduleRender();
    setStatus("historico limpo");
  }

  function cleanup() {
    chatBridge.close();
  }

  async function seedMockDeck() {
    try {
      const mockPackets = await loadMockDeck();
      localStorage.removeItem(store.getStorageKey(mockRoomId));
      sessionController.connect(mockRoomId);
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
        overlayApi.sendOverlayPacket(mockRoomId, {
          msg: true,
          id: packet.id,
          contents: packet.contents
        });
      }

      renderLoop.scheduleRender();
    } catch (error) {
      portalLogger.warn("Failed to load mock deck", error);
      setStatus("mock indisponivel");
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

function isCopyShortcut(event) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "c";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
