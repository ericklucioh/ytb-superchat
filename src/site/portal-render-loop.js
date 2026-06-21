import { compareMessageEvent, comparePriorityEvent, compareSuperchatEvent } from "./streamer-events.js";

export function createPortalRenderLoop({
  store,
  view,
  currencyService,
  logger,
  getDetailId,
  resetMissingDetail,
  windowRef = window,
  documentRef = document
}) {
  let renderQueued = false;
  let lastRenderedFilter = "";
  let lastRenderKey = "";

  function scheduleRender() {
    if (renderQueued) {
      return;
    }

    renderQueued = true;
    const flush = () => {
      renderQueued = false;
      render();
    };

    windowRef.setTimeout(flush, documentRef.visibilityState === "hidden" ? 0 : 16);
  }

  function renderNow() {
    renderQueued = false;
    render();
  }

  function render() {
    const state = store.state;
    const detailId = getDetailId();
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

    logger.debug("render", {
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
      resetMissingDetail();
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

  return {
    renderNow,
    scheduleRender
  };
}
