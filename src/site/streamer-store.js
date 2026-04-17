import { VALID_FILTERS, VALID_STATUSES, createEventNormalizer } from "./streamer-events.js";
import { cleanText } from "./streamer-text.js";

export function createStreamerStore({
  storageKey,
  roomKey,
  maxLiveMessages,
  initialRoomId = ""
}) {
  const normalizer = createEventNormalizer();
  let currentStorageKey = storageKeyFor(initialRoomId);
  let state = loadState(currentStorageKey, initialRoomId);
  let liveEvents = [];

  function storageKeyFor(roomId) {
    const normalizedRoomId = cleanText(roomId || "");
    return normalizedRoomId ? `${storageKey}:${normalizedRoomId}` : `${storageKey}:default`;
  }

  function loadState(key, roomId = "") {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return sanitizeState({ version: 1, filter: "active", overlayId: "", events: [], roomId });
      }

      return sanitizeState(JSON.parse(raw));
    } catch {
      const reset = sanitizeState({ version: 1, filter: "active", overlayId: "", events: [], roomId });
      localStorage.setItem(key, JSON.stringify(reset));
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
    sanitized.events.sort((a, b) => b.timestamp - a.timestamp);

    if (sanitized.overlayId && !sanitized.events.some((event) => event.id === sanitized.overlayId) && !liveEvents.some((event) => event.id === sanitized.overlayId)) {
      sanitized.overlayId = "";
    }

    return sanitized;
  }

  function persistState() {
    localStorage.setItem(currentStorageKey, JSON.stringify(state));
  }

  function persistRoom(roomId) {
    localStorage.setItem(roomKey, roomId);
  }

  function connectRoom(roomId) {
    const nextRoom = cleanText(roomId || "");
    if (!nextRoom) {
      return state;
    }

    const nextStorageKey = storageKeyFor(nextRoom);

    if (state.roomId && state.roomId !== nextRoom) {
      persistState();
      liveEvents = [];
    }

    currentStorageKey = nextStorageKey;
    state = loadState(currentStorageKey, nextRoom);
    state.roomId = nextRoom;
    persistState();
    persistRoom(nextRoom);
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
      liveMessages: liveEvents.length,
      twitchSubs,
      youtubeMembers,
      totalCombined,
      superchats,
      totalEvents: state.events.length,
      currentFilter: state.filter
    };
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
    getStorageKey(roomId = state.roomId) {
      return storageKeyFor(roomId);
    },
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
