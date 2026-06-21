import { cleanText } from "./streamer-text.js";

export function createPortalOverlayApi({
  logger,
  elements,
  defaultOverlayApiBaseUrl,
  localStorageRef = window.localStorage,
  runtimeEnv = window.__YTB_ENV__ || {},
  windowRef = window,
  fetchImpl = window.fetch.bind(window)
}) {
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

    logger.debug("send-overlay", {
      roomId: sessionId,
      endpoint: `${baseUrl.replace(/\/$/, "")}/api/event`,
      msg: packet?.msg,
      clear: packet?.contents === false,
      id: packet?.id || ""
    });

    fetchImpl(`${baseUrl.replace(/\/$/, "")}/api/event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: sessionId,
        ...packet
      })
    }).catch((error) => {
      logger.warn("Failed to send overlay packet", error);
    });
  }

  function sendOverlayClear(sessionId) {
    sendOverlayPacket(sessionId, {
      msg: true,
      contents: false
    });
  }

  function resolveOverlayApiBaseUrl() {
    const stored = cleanText(localStorageRef.getItem("overlay_backend_base_url") || "");
    if (stored) {
      return normalizeApiBaseUrl(stored);
    }

    const runtimeApiBase = cleanText(
      runtimeEnv.publicBackendUrl
      || runtimeEnv.overlayApiBaseUrl
      || windowRef.__PUBLIC_BACKEND_URL__
      || windowRef.__OVERLAY_API_BASE_URL__
      || ""
    );
    if (runtimeApiBase) {
      return normalizeApiBaseUrl(runtimeApiBase);
    }

    return normalizeApiBaseUrl(defaultOverlayApiBaseUrl);
  }

  async function activateKeepAwake() {
    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      updateKeepAwakeStatus("Nao foi possivel ativar o keep-awake.", false);
      return;
    }

    setKeepAwakeButtonBusy(true);
    updateKeepAwakeStatus("Ativando...", false);

    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/keep-awake/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`keep-awake start failed with status ${response.status}`);
      }

      const payload = await response.json();
      updateKeepAwakeStatusFromPayload(payload);
    } catch (error) {
      logger.warn("Failed to activate keep-awake", error);
      updateKeepAwakeStatus("Nao foi possivel ativar o keep-awake.", false);
    } finally {
      setKeepAwakeButtonBusy(false);
    }
  }

  async function refreshKeepAwakeStatus() {
    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      updateKeepAwakeStatus("Keep-awake indisponivel.", false);
      return;
    }

    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/keep-awake/status`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      updateKeepAwakeStatusFromPayload(payload);
    } catch (error) {
      logger.warn("Failed to refresh keep-awake status", error);
    }
  }

  function updateKeepAwakeStatusFromPayload(payload) {
    if (!elements.keepAwakeStatus) {
      return;
    }

    const active = Boolean(payload && payload.active);
    const until = payload && payload.until ? new Date(payload.until) : null;
    if (active && until instanceof Date && !Number.isNaN(until.getTime())) {
      updateKeepAwakeStatus(`Ativo · ate ${formatFriendlyDateTime(until)}`, true);
      return;
    }

    updateKeepAwakeStatus("Inativo", false);
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
      ? "Ativando..."
      : "Ativar por 12h";
  }

  function buildOverlayUrl(sessionId) {
    const baseUrl = resolveOverlayApiBaseUrl();
    if (!baseUrl) {
      return "";
    }

    return `${baseUrl.replace(/\/$/, "")}/overlay?session=${encodeURIComponent(sessionId)}`;
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
      return `${windowRef.location.protocol}${raw}`;
    }

    const protocol = windowRef.location.protocol === "http:" ? "http://" : "https://";
    return `${protocol}${raw}`;
  }

  function formatFriendlyDateTime(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(date);
  }

  return {
    activateKeepAwake,
    buildOverlayUrl,
    refreshKeepAwakeStatus,
    resolveOverlayApiBaseUrl,
    sendOverlayClear,
    sendOverlayOnce,
    sendOverlayPacket
  };
}
