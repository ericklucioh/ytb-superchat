import { formatAmount, formatBrlAmount, formatCurrencyAmount } from "./streamer-currency.js";
import { formatMonths, formatStatus, formatType, formatTime, labelForFilter, platformIconMarkup } from "./streamer-events.js";

function setTextContent(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function clearNode(node) {
  if (node) {
    node.innerHTML = "";
  }
}

function renderEmptyState(container, emptyText) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = emptyText;
  container.appendChild(empty);
}

function renderCollection(container, events, emptyText, renderItem) {
  clearNode(container);

  if (!events.length) {
    renderEmptyState(container, emptyText);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const event of events) {
    fragment.appendChild(renderItem(event));
  }

  container.appendChild(fragment);
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
    meta.textContent = formatCurrencyAmount(
      event.amount,
      event.currency,
      event.currencyRate
    );
    return true;
  }

  if ((event.type === "sub" || event.type === "member") && Number.isFinite(event.tier)) {
    meta.textContent = `Tier ${formatAmount(event.tier)}`;
    return true;
  }

  meta.remove();
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

function createMessageCard(event, state, elements, { live = false } = {}) {
  const template = elements.eventTemplate.content.cloneNode(true);
  const card = template.querySelector(".event-card");
  const eventHead = template.querySelector(".event-head");
  const eventMetaRow = template.querySelector(".event-meta-row");
  const platformBadge = template.querySelector(".platform-badge");
  const user = template.querySelector(".event-user");
  const time = template.querySelector(".event-time");
  const message = template.querySelector(".event-message");
  const meta = template.querySelector(".event-meta");
  const actions = template.querySelector(".event-actions");
  const readButton = template.querySelector('button[data-action="read"]');
  const hiddenButton = template.querySelector('button[data-action="hidden"]');
  const status = resolveStatus(event, state, live);

  card.dataset.id = event.id;
  card.classList.toggle("is-live-message", live);
  card.classList.toggle("is-read", status === "read");
  card.classList.toggle("is-hidden", status === "hidden");
  card.classList.toggle("is-superchat", event.type === "superchat");
  card.classList.toggle("is-priority", event.type === "sub" || event.type === "member");
  card.classList.toggle("is-selected", event.id === state.overlayId);
  card.classList.toggle("has-actions", event.type !== "message");

  platformBadge.innerHTML = platformIconMarkup(event.platform);
  setTextContent(user, `${event.user}`);
  setTextContent(message, event.message || "");

  renderAmountMeta(meta, event);

  if (event.type === "message") {
    eventMetaRow.remove();
    actions.remove();
    return template;
  }

  readButton.classList.toggle("is-active", status === "read");
  hiddenButton.classList.toggle("is-active", status === "hidden");

  if (event.type === "superchat" && eventMetaRow && user && time) {
    renderTimestampRow(eventHead, eventMetaRow, user, time, event);
  } else {
    eventMetaRow.remove();
  }

  return template;
}

function renderPriorityCard(event, state, elements) {
  const template = elements.priorityTemplate.content.cloneNode(true);
  const card = template.querySelector(".priority-card");
  const platformBadge = template.querySelector(".platform-badge");
  const user = template.querySelector(".event-user");
  const months = template.querySelector(".priority-months");

  card.dataset.id = event.id;
  card.classList.toggle("is-selected", event.id === state.overlayId);
  card.classList.toggle("is-gifted", Number.isFinite(event.giftCount) && event.giftCount > 0);

  platformBadge.innerHTML = platformIconMarkup(event.platform);
  setTextContent(user, `${event.user}`);
  setTextContent(months, formatMonths(event.months ?? event.tier));

  return template;
}

export function createStreamerView(elements) {
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

    renderCollection(
      elements.priorityList,
      priorityEvents,
      "Nenhum sub ou membro para esta visão.",
      (event) => renderPriorityCard(event, state, elements)
    );
    renderCollection(
      elements.superchatList,
      superchatEvents,
      "Nenhum superchat para esta visão.",
      (event) => createMessageCard(event, state, elements)
    );
    renderCollection(
      elements.chatList,
      chatEvents,
      "Nenhuma mensagem de chat ao vivo.",
      (event) => createMessageCard(event, state, elements, { live: true })
    );

    renderDetail(focusedEvent);

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
      const platform = elements.detailPopup.querySelector("[data-detail-platform]");
      const user = elements.detailPopup.querySelector("[data-detail-user]");
      const statusNode = elements.detailPopup.querySelector("[data-detail-status]");
      const extra = elements.detailPopup.querySelector("[data-detail-extra]");
      const message = elements.detailPopup.querySelector("[data-detail-message]");
      const readButton = elements.detailPopup.querySelector('button[data-detail-action="read"]');
      const hiddenButton = elements.detailPopup.querySelector('button[data-detail-action="hidden"]');

      elements.detailPopup.hidden = false;
      setTextContent(kind, formatType(event.type));
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
      if (hiddenButton) {
        hiddenButton.classList.toggle("is-active", status === "hidden");
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
