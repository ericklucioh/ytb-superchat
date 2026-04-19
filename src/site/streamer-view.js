import { formatAmount, formatBrlAmount, formatCurrencyAmount } from "./streamer-currency.js";
import { formatMonths, formatStatus, formatType, formatTime, labelForFilter, platformIconMarkup } from "./streamer-events.js";

function setTextContent(node, value) {
  if (node) {
    node.textContent = value;
  }
}

const collectionState = new WeakMap();

function getCollectionState(container) {
  let state = collectionState.get(container);
  if (!state) {
    state = {
      items: new Map(),
      emptyNode: null
    };
    collectionState.set(container, state);
  }
  return state;
}

function getRenderedRoot(rendered) {
  if (!rendered) {
    return null;
  }

  if (rendered.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return rendered.firstElementChild || rendered.firstChild || null;
  }

  return rendered.nodeType ? rendered : null;
}

function renderEmptyState(container, emptyText) {
  const state = getCollectionState(container);
  if (state.emptyNode && state.emptyNode.parentNode === container) {
    state.emptyNode.remove();
  }

  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = emptyText;
  state.emptyNode = empty;
  container.appendChild(empty);
}

function renderCollection(container, events, emptyText, renderItem, updateItem) {
  if (!container) {
    return;
  }

  const state = getCollectionState(container);

  if (!events.length) {
    state.items.clear();
    container.innerHTML = "";
    renderEmptyState(container, emptyText);
    return;
  }

  if (state.emptyNode && state.emptyNode.parentNode === container) {
    state.emptyNode.remove();
    state.emptyNode = null;
  }

  const nextIds = new Set();
  let cursor = container.firstChild;

  for (const event of events) {
    let record = state.items.get(event.id);
    let node = record?.node;

    if (!node || !node.isConnected) {
      const rendered = renderItem(event);
      node = getRenderedRoot(rendered);
      if (!node) {
        continue;
      }
      record = {
        node
      };
      state.items.set(event.id, record);
    }

    if (typeof updateItem === "function") {
      updateItem(node, event);
    }

    if (node.dataset) {
      node.dataset.id = event.id;
    }

    nextIds.add(event.id);

    if (node !== cursor) {
      container.insertBefore(node, cursor || null);
    } else {
      cursor = cursor.nextSibling;
    }
  }

  for (const [id, record] of state.items) {
    if (!nextIds.has(id)) {
      if (record?.node && record.node.parentNode) {
        record.node.remove();
      }
      state.items.delete(id);
    }
  }
}

function resolveStatus(event, state, live) {
  if (!live) {
    return event.status || "active";
  }

  const storedEvent = state.events.find((item) => item.id === event.id);
  return storedEvent?.status || event.status || "active";
}

function renderAmountMeta(meta, event) {
  if (event.type === "superchat" && Number.isFinite(event.amount)) {
    if (meta) {
      meta.textContent = formatCurrencyAmount(
        event.amount,
        event.currency,
        event.currencyRate
      );
    }
    return true;
  }

  if ((event.type === "sub" || event.type === "member") && Number.isFinite(event.tier)) {
    if (meta) {
      meta.textContent = `Tier ${formatAmount(event.tier)}`;
    }
    return true;
  }

  if (meta && meta.parentNode) {
    meta.remove();
  }
  return false;
}

function renderTimestampRow(eventHead, eventMetaRow, user, time, event) {
  time.textContent = formatTime(event.timestamp);
  if (time.textContent) {
    eventMetaRow.insertBefore(user, time);
  } else {
    eventMetaRow.appendChild(user);
  }
  eventHead.classList.add("event-head--superchat");
}

function syncMessageCard(card, event, state, { live = false } = {}) {
  const eventHead = card.querySelector(".event-head");
  const eventMetaRow = card.querySelector(".event-meta-row");
  const platformBadge = card.querySelector(".platform-badge");
  const user = card.querySelector(".event-user");
  const time = card.querySelector(".event-time");
  const message = card.querySelector(".event-message");
  const meta = card.querySelector(".event-meta");
  const actions = card.querySelector(".event-actions");
  const readButton = card.querySelector('button[data-action="read"]');
  const favoriteButton = card.querySelector('button[data-action="favorite"]');
  const status = resolveStatus(event, state, live);

  card.dataset.id = event.id;
  card.dataset.viewType = "message";
  card.classList.toggle("is-live-message", live);
  card.classList.toggle("is-read", status === "read");
  card.classList.toggle("is-favorite", status === "favorite");
  card.classList.toggle("is-superchat", event.type === "superchat");
  card.classList.toggle("is-priority", event.type === "sub" || event.type === "member");
  card.classList.toggle("is-selected", event.id === state.overlayId);
  card.classList.toggle("has-actions", event.type !== "message");

  platformBadge.innerHTML = platformIconMarkup(event.platform);
  setTextContent(user, `${event.user}`);
  setTextContent(message, event.message || "");

  renderAmountMeta(meta, event);

  if (event.type === "message") {
    if (eventMetaRow) {
      eventMetaRow.remove();
    }
    if (actions) {
      actions.remove();
    }
    return card;
  }

  if (readButton) {
    readButton.classList.toggle("is-active", status === "read");
  }
  if (favoriteButton) {
    favoriteButton.classList.toggle("is-active", status === "favorite");
  }

  if (event.type === "superchat" && eventMetaRow && user && time) {
    renderTimestampRow(eventHead, eventMetaRow, user, time, event);
  } else {
    if (eventMetaRow) {
      eventMetaRow.remove();
    }
  }

  return card;
}

function createMessageCard(event, state, elements, { live = false } = {}) {
  const template = elements.eventTemplate.content.cloneNode(true);
  const card = template.querySelector(".event-card");
  syncMessageCard(card, event, state, { live });
  return template;
}

function syncPriorityCard(card, event, state) {
  const platformBadge = card.querySelector(".platform-badge");
  const user = card.querySelector(".event-user");
  const months = card.querySelector(".priority-months");

  card.dataset.id = event.id;
  card.dataset.viewType = "priority";
  card.classList.toggle("is-selected", event.id === state.overlayId);
  card.classList.toggle("is-gifted", Number.isFinite(event.giftCount) && event.giftCount > 0);

  platformBadge.innerHTML = platformIconMarkup(event.platform);
  setTextContent(user, `${event.user}`);
  setTextContent(months, formatMonths(event.months ?? event.tier));

  return card;
}

function renderPriorityCard(event, state, elements) {
  const template = elements.priorityTemplate.content.cloneNode(true);
  const card = template.querySelector(".priority-card");
  syncPriorityCard(card, event, state);
  return template;
}

export function createStreamerView(elements) {
  let renderToken = 0;

  function syncFilterButtons(filter) {
    elements.filterGroup.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.getAttribute("data-filter") === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setStatus(message) {
    setTextContent(elements.connectionStatus, message);
  }

  function setSummaryOpen(open) {
    if (elements.summaryPopup) {
      elements.summaryPopup.hidden = !open;
    }

    if (elements.summaryButton) {
      elements.summaryButton.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  function setDetailOpen(open) {
    if (elements.detailPopup) {
      elements.detailPopup.hidden = !open;
    }
  }

  function render({
    state,
    priorityEvents,
    superchatEvents,
    chatEvents,
    counts,
    superchatTotals,
    focusedEvent
  }) {
    renderToken += 1;
    const token = renderToken;

    setTextContent(elements.eventTotal, `${counts.totalEvents} eventos salvos`);
    setTextContent(elements.currentFilter, labelForFilter(counts.currentFilter));
    setTextContent(elements.countTwitchSubs, String(counts.twitchSubs));
    setTextContent(elements.countYoutubeMembers, String(counts.youtubeMembers));
    setTextContent(elements.countTotalCombined, String(counts.totalCombined));
    setTextContent(elements.countSuperchats, String(counts.superchats));
    if (elements.countSuperchatsBrlTotal) {
      const totalLabel = formatBrlAmount(superchatTotals?.totalBrl || 0);
      setTextContent(elements.countSuperchatsBrlTotal, totalLabel);
    }
    setTextContent(elements.priorityCount, String(priorityEvents.length));
    setTextContent(elements.superchatCount, String(superchatEvents.length));
    setTextContent(elements.chatCount, String(chatEvents.length));

    window.setTimeout(() => {
      if (token !== renderToken) {
        return;
      }

      renderCollection(
        elements.priorityList,
        priorityEvents,
        "Nenhum sub ou membro para esta visão.",
        (event) => renderPriorityCard(event, state, elements),
        (node, event) => syncPriorityCard(node, event, state)
      );
      renderCollection(
        elements.superchatList,
        superchatEvents,
        "Nenhum superchat para esta visão.",
        (event) => createMessageCard(event, state, elements),
        (node, event) => syncMessageCard(node, event, state)
      );
    }, 0);

    window.setTimeout(() => {
      if (token !== renderToken) {
        return;
      }

      renderCollection(
        elements.chatList,
        chatEvents,
        "Nenhuma mensagem de chat ao vivo.",
        (event) => createMessageCard(event, state, elements, { live: true }),
        (node, event) => syncMessageCard(node, event, state, { live: true })
      );

      renderDetail(focusedEvent);
    }, 0);

    function renderDetail(event) {
      if (!elements.detailPopup) {
        return;
      }

      if (!event) {
        elements.detailPopup.hidden = true;
        return;
      }

      const status = event.status || "active";
      const kind = elements.detailPopup.querySelector("[data-detail-kind]");
      const avatar = elements.detailPopup.querySelector("[data-detail-avatar]");
      const platform = elements.detailPopup.querySelector("[data-detail-platform]");
      const user = elements.detailPopup.querySelector("[data-detail-user]");
      const statusNode = elements.detailPopup.querySelector("[data-detail-status]");
      const extra = elements.detailPopup.querySelector("[data-detail-extra]");
      const message = elements.detailPopup.querySelector("[data-detail-message]");
      const readButton = elements.detailPopup.querySelector('button[data-detail-action="read"]');
      const favoriteButton = elements.detailPopup.querySelector('button[data-detail-action="favorite"]');

      elements.detailPopup.hidden = false;
      setTextContent(kind, formatType(event.type));
      if (avatar) {
        const fallback = event.platform === "twitch" ? "twitch.png" : "youtube.png";
        const src = event.chatimg || fallback;
        avatar.hidden = false;
        avatar.src = src;
        avatar.alt = `${event.user} avatar`;
        avatar.onerror = () => {
          avatar.onerror = null;
          avatar.src = fallback;
        };
      }
      if (platform) {
        platform.innerHTML = platformIconMarkup(event.platform);
      }
      setTextContent(user, `${event.user}`);
      setTextContent(statusNode, formatStatus(status));

      if (extra) {
        if (event.type === "superchat" && Number.isFinite(event.amount)) {
          elements.detailPopup.dataset.kind = "superchat";
          const parts = [formatCurrencyAmount(
            event.amount,
            event.currency,
            event.currencyRate
          )];
          const arrival = formatTime(event.timestamp);
          if (arrival) {
            parts.push(arrival);
          }
          extra.textContent = parts.join(" • ");
        } else if ((event.type === "sub" || event.type === "member") && Number.isFinite(event.months ?? event.tier)) {
          elements.detailPopup.dataset.kind = event.type;
          extra.textContent = formatMonths(event.months ?? event.tier);
        } else {
          delete elements.detailPopup.dataset.kind;
          extra.textContent = "Mensagem ao vivo";
        }
      }

      setTextContent(message, event.message || "Sem mensagem");
      if (readButton) {
        readButton.classList.toggle("is-active", status === "read");
      }
      if (favoriteButton) {
        favoriteButton.classList.toggle("is-active", status === "favorite");
      }
    }
  }

  return {
    syncFilterButtons,
    setStatus,
    setSummaryOpen,
    setDetailOpen,
    render
  };
}
