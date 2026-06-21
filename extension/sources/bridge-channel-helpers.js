(function (global) {
  if (global.OverlayBridgeChannelHelpers) {
    return;
  }

  const MAX_PENDING_PACKETS = 250;
  const PENDING_STORAGE_PREFIX = "chatbridge:pending:";

  function cleanSession(value) {
    return String(value || "").replace(/\s+/g, "").trim();
  }

  function buildPortName(role, session) {
    return `chat-bridge:${role}:${cleanSession(session) || "pending"}`;
  }

  function createPendingQueue({ role, chromeStorageLocal, getCurrentSession, emitDiagnostic }) {
    let pendingPackets = [];
    let pendingIndex = new Map();
    let pendingHydrated = false;
    let pendingHydrating = null;
    let persistTimer = null;

    function pendingStorageKey(nextSession = getCurrentSession()) {
      return `${PENDING_STORAGE_PREFIX}${role}:${cleanSession(nextSession) || "pending"}`;
    }

    function packetKey(packet) {
      const payload = packet?.payload || {};
      const id = payload.id != null ? String(payload.id) : "";
      if (id) {
        return id;
      }

      return [
        packet?.session || "",
        packet?.type || "",
        payload.type || "",
        payload.platform || "",
        payload.chatname || payload.user || "",
        payload.chatmessage || payload.message || "",
        payload.timestamp || ""
      ].join("|");
    }

    function normalizePendingPackets(items) {
      if (!Array.isArray(items)) {
        return [];
      }

      return items
        .filter((packet) => packet && typeof packet === "object" && packet.type === "publish")
        .slice(-MAX_PENDING_PACKETS);
    }

    function clearPersistTimer() {
      if (!persistTimer) {
        return;
      }

      clearTimeout(persistTimer);
      persistTimer = null;
    }

    function queuePersistPending() {
      if (role !== "source" || persistTimer) {
        return;
      }

      persistTimer = setTimeout(() => {
        persistTimer = null;
        void persistPending().catch(() => {});
      }, 0);
    }

    async function persistPending() {
      const session = getCurrentSession();
      if (role !== "source" || !chromeStorageLocal || !session) {
        return;
      }

      const key = pendingStorageKey(session);
      const snapshot = pendingPackets.slice(-MAX_PENDING_PACKETS);
      try {
        if (!snapshot.length) {
          await chromeStorageLocal.remove(key);
          return;
        }

        await chromeStorageLocal.set({ [key]: snapshot });
      } catch {
        //
      }
    }

    async function hydratePendingPackets() {
      if (role !== "source" || pendingHydrated) {
        return pendingHydrating || Promise.resolve(pendingPackets);
      }

      if (pendingHydrating) {
        return pendingHydrating;
      }

      pendingHydrating = (async () => {
        const session = getCurrentSession();
        try {
          if (chromeStorageLocal && session) {
            const key = pendingStorageKey(session);
            const result = await chromeStorageLocal.get(key);
            const loadedPackets = normalizePendingPackets(result?.[key]);
            if (session === getCurrentSession() && loadedPackets.length) {
              for (const packet of loadedPackets) {
                const keyValue = packetKey(packet);
                if (keyValue && pendingIndex.has(keyValue)) {
                  continue;
                }

                pendingPackets.push(packet);
                if (keyValue) {
                  pendingIndex.set(keyValue, packet);
                }
              }
            }
          }
        } catch {
          //
        }

        pendingHydrated = true;
        pendingHydrating = null;
        emitDiagnostic?.("hydrated", { pendingCount: pendingPackets.length });
        return pendingPackets;
      })();

      return pendingHydrating;
    }

    function dropPendingByKey(key) {
      if (!key || !pendingIndex.has(key)) {
        return false;
      }

      pendingIndex.delete(key);
      pendingPackets = pendingPackets.filter((packet) => packetKey(packet) !== key);
      queuePersistPending();
      return true;
    }

    function registerPendingPacket(packet) {
      if (role !== "source" || !packet || typeof packet !== "object") {
        return packet;
      }

      const key = packetKey(packet);
      if (key && pendingIndex.has(key)) {
        return pendingIndex.get(key);
      }

      pendingPackets.push(packet);
      if (key) {
        pendingIndex.set(key, packet);
      }

      if (pendingPackets.length > MAX_PENDING_PACKETS) {
        const trimmed = pendingPackets.splice(0, pendingPackets.length - MAX_PENDING_PACKETS);
        for (const item of trimmed) {
          const itemKey = packetKey(item);
          if (itemKey) {
            pendingIndex.delete(itemKey);
          }
        }
      }

      queuePersistPending();
      return packet;
    }

    function flushPending(sendRawPacket, onSendFailure) {
      if (typeof sendRawPacket !== "function" || !pendingPackets.length) {
        return;
      }

      const queue = pendingPackets.slice();
      for (let index = 0; index < queue.length; index += 1) {
        if (!sendRawPacket(queue[index])) {
          if (typeof onSendFailure === "function") {
            onSendFailure();
          }
          break;
        }
      }
    }

    function resetPendingState() {
      pendingPackets = [];
      pendingIndex.clear();
      pendingHydrated = false;
      pendingHydrating = null;
      clearPersistTimer();
    }

    return {
      clearPersistTimer,
      dropPendingByKey,
      flushPending,
      getPendingSize() {
        return pendingPackets.length;
      },
      hydratePendingPackets,
      isHydrated() {
        return pendingHydrated;
      },
      registerPendingPacket,
      resetPendingState
    };
  }

  global.OverlayBridgeChannelHelpers = {
    buildPortName,
    cleanSession,
    createPendingQueue
  };
})(window);
