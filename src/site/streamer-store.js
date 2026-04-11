import { VALID_FILTERS, VALID_STATUSES, createEventNormalizer, cleanText } from "./streamer-utils.js";

export function createStreamerStore({
  storageKey,
  roomKey,
  maxEvents,
  maxLiveMessages
}) {
  const normalizer = createEventNormalizer();
  let state = loadState();
  let liveEvents = [];

  function loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return sanitizeState({ version: 1, filter: "active", overlayId: "", events: [] });
      }

      return sanitizeState(JSON.parse(raw));
    } catch {
      const reset = sanitizeState({ version: 1, filter: "active", overlayId: "", events: [] });
      localStorage.setItem(storageKey, JSON.stringify(reset));
      return reset;
    }
  }

  function sanitizeState(input) {
    const sanitized = {
      version: 1,
      filter: VALID_FILTERS.has(input?.filter) ? input.filter : "active",
      roomId: typeof input?.roomId === "string" ? input.roomId : "",
      overlayId: typeof input?.overlayId === "string" ? input.overlayId : "",
      events: []
    };

    if (!Array.isArray(input?.events)) {
      return sanitized;
    }

    const byId = new Map();
    for (const rawEvent of input.events) {
      const event = normalizer.normalizeStoredEvent(rawEvent);
      if (!event) {
        continue;
      }
      byId.set(event.id, event);
    }

    sanitized.events = Array.from(byId.values());
    enforceLimit(sanitized.events);
    sanitized.events.sort((a, b) => b.timestamp - a.timestamp);

    if (sanitized.overlayId && !sanitized.events.some((event) => event.id === sanitized.overlayId) && !liveEvents.some((event) => event.id === sanitized.overlayId)) {
      sanitized.overlayId = "";
    }

    return sanitized;
  }

  function persistState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function persistRoom(roomId) {
    localStorage.setItem(roomKey, roomId);
  }

  function connectRoom(roomId) {
    if (state.roomId && state.roomId !== roomId) {
      liveEvents = [];
      state = {
        version: 1,
        filter: "active",
        roomId,
        overlayId: "",
        events: []
      };
      persistState();
    } else if (!state.roomId) {
      state.roomId = roomId;
      state.overlayId = state.overlayId || "";
      persistState();
    }

    state.roomId = roomId;
    persistRoom(roomId);
    return state;
  }

  function insertEvent(event) {
    if (event.type === "message") {
      if (liveEvents.some((existing) => existing.id === event.id) || state.events.some((existing) => existing.id === event.id)) {
        return false;
      }

      liveEvents.unshift(event);
      enforceLiveLimit();
      return true;
    }

    if (state.events.some((existing) => existing.id === event.id) || liveEvents.some((existing) => existing.id === event.id)) {
      return false;
    }

    state.events.push(event);
    enforceLimit(state.events);
    state.events.sort((a, b) => b.timestamp - a.timestamp);
    persistState();
    return true;
  }

  function updateStatus(id, nextStatus) {
    const event = state.events.find((item) => item.id === id);
    if (event) {
      if (event.status === nextStatus) {
        return false;
      }

      event.status = nextStatus;
      persistState();
      return true;
    }

    const liveEvent = liveEvents.find((item) => item.id === id);
    if (!liveEvent) {
      return false;
    }

    const promoted = normalizer.normalizeStoredEvent({
      ...liveEvent,
      status: nextStatus
    });
    if (!promoted) {
      return false;
    }

    const existing = state.events.findIndex((item) => item.id === promoted.id);
    if (existing >= 0) {
      state.events[existing] = promoted;
    } else {
      state.events.push(promoted);
    }

    liveEvent.status = nextStatus;
    state.events.sort((a, b) => b.timestamp - a.timestamp);
    persistState();
    return true;
  }

  function setFilter(nextFilter) {
    if (!VALID_FILTERS.has(nextFilter) || nextFilter === state.filter) {
      return false;
    }

    state.filter = nextFilter;
    persistState();
    return true;
  }

  function setOverlayId(id) {
    if (state.overlayId === id) {
      return false;
    }

    state.overlayId = id;
    persistState();
    return true;
  }

  function clearOverlayId() {
    if (!state.overlayId) {
      return false;
    }

    state.overlayId = "";
    persistState();
    return true;
  }

  function syncFromExternalState(rawValue) {
    try {
      state = sanitizeState(JSON.parse(rawValue));
      return true;
    } catch {
      return false;
    }
  }

  function findEventById(id) {
    return state.events.find((item) => item.id === id) || liveEvents.find((item) => item.id === id) || null;
  }

  function getVisibleEvents() {
    if (state.filter === "all") {
      return state.events.slice();
    }

    return state.events.filter((event) => event.status === state.filter);
  }

  function getCounts() {
    const visible = state.events.filter((event) => event.status !== "hidden");
    const twitchSubs = visible.filter((event) => event.platform === "twitch" && event.type === "sub").length;
    const youtubeMembers = visible.filter((event) => event.platform === "youtube" && event.type === "member").length;
    const totalCombined = twitchSubs + youtubeMembers;
    const superchats = visible.filter((event) => event.type === "superchat").length;

    return {
      twitchSubs,
      youtubeMembers,
      totalCombined,
      superchats,
      totalEvents: state.events.length,
      currentFilter: state.filter
    };
  }

  function enforceLimit(events) {
    if (events.length <= maxEvents) {
      return;
    }

    events.sort((a, b) => a.timestamp - b.timestamp);
    while (events.length > maxEvents) {
      events.shift();
    }
  }

  function enforceLiveLimit() {
    if (liveEvents.length <= maxLiveMessages) {
      return;
    }

    liveEvents.length = maxLiveMessages;
  }

  return {
    get state() {
      return state;
    },
    get liveEvents() {
      return liveEvents;
    },
    normalizer,
    connectRoom,
    insertEvent,
    updateStatus,
    setFilter,
    setOverlayId,
    clearOverlayId,
    syncFromExternalState,
    findEventById,
    getVisibleEvents,
    getCounts
  };
}
