import { VALID_FILTERS, createEventNormalizer } from "./streamer-events.js";
import { cleanText } from "./streamer-text.js";

export function createStreamerStore({
  storageKey,
  roomKey,
  maxLiveMessages,
  initialRoomId = ""
}) {
  const normalizer = createEventNormalizer();
  const currentStorageKey = storageKey;
  let state = loadState(currentStorageKey, initialRoomId);
  let liveEvents = [];

  function legacyStorageKeyFor(roomId) {
    const normalizedRoomId = cleanText(roomId || "");
    return normalizedRoomId ? `${storageKey}:${normalizedRoomId}` : `${storageKey}:default`;
  }

  function loadState(key, roomId = "") {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        const legacyKeys = [legacyStorageKeyFor(roomId), legacyStorageKeyFor("default")];
        for (const legacyKey of legacyKeys) {
          const legacyRaw = localStorage.getItem(legacyKey);
          if (legacyRaw) {
            const migrated = sanitizeState(JSON.parse(legacyRaw));
            persistStateValue(key, migrated);
            return migrated;
          }
        }

        const reset = sanitizeState({ version: 1, filter: "active", overlayId: "", events: [], roomId });
        persistStateValue(key, reset);
        return reset;
      }

      const sanitized = sanitizeState(JSON.parse(raw));
      persistStateValue(key, sanitized);
      return sanitized;
    } catch {
      const reset = sanitizeState({ version: 1, filter: "active", overlayId: "", events: [], roomId });
      persistStateValue(key, reset);
      return reset;
    }
  }

  function persistStateValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeFilter(filter) {
    if (filter === "hidden") {
      return "favorite";
    }

    return filter;
  }

  function sanitizeState(input) {
    const sanitized = {
      version: 1,
      filter: VALID_FILTERS.has(normalizeFilter(input?.filter)) ? normalizeFilter(input?.filter) : "active",
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
    persistStateValue(currentStorageKey, state);
  }

  function persistRoom(roomId) {
    localStorage.setItem(roomKey, roomId);
  }

  function connectRoom(roomId) {
    const nextRoom = cleanText(roomId || "");
    if (!nextRoom) {
      return state;
    }

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

  function clearHistory() {
    const nextState = sanitizeState({
      version: 1,
      filter: state.filter,
      roomId: state.roomId,
      overlayId: "",
      events: []
    });

    state = nextState;
    liveEvents = [];
    persistState();
    return true;
  }

  function syncFromExternalState(rawValue) {
    try {
      state = sanitizeState(JSON.parse(rawValue));
      persistState();
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
    const visible = state.events.filter((event) => event.status !== "favorite");
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
      return currentStorageKey;
    },
    connectRoom,
    insertEvent,
    updateStatus,
    setFilter,
    setOverlayId,
    clearOverlayId,
    clearHistory,
    syncFromExternalState,
    findEventById,
    getVisibleEvents,
    getCounts
  };
}
