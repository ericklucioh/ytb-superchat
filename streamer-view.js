import { labelForFilter, platformIconMarkup, formatAmount, formatMonths, formatStatus, formatType, formatTime } from "./streamer-utils.js";

export function createStreamerView(elements) {
  function syncFilterButtons(filter) {
    elements.filterGroup.querySelectorAll("[data-filter]").forEach((button) => {
      const active = button.getAttribute("data-filter") === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function setStatus(message) {
    elements.connectionStatus.textContent = message;
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
    focusedEvent
  }) {
    if (elements.eventTotal) {
      elements.eventTotal.textContent = `${counts.totalEvents} eventos salvos`;
    }

    if (elements.currentFilter) {
      elements.currentFilter.textContent = labelForFilter(counts.currentFilter);
    }

    if (elements.countTwitchSubs) {
      elements.countTwitchSubs.textContent = String(counts.twitchSubs);
    }
    if (elements.countYoutubeMembers) {
      elements.countYoutubeMembers.textContent = String(counts.youtubeMembers);
    }
    if (elements.countTotalCombined) {
      elements.countTotalCombined.textContent = String(counts.totalCombined);
    }
    if (elements.countSuperchats) {
      elements.countSuperchats.textContent = String(counts.superchats);
    }

    if (elements.priorityCount) {
      elements.priorityCount.textContent = String(priorityEvents.length);
    }
    if (elements.superchatCount) {
      elements.superchatCount.textContent = String(superchatEvents.length);
    }
    if (elements.chatCount) {
      elements.chatCount.textContent = String(chatEvents.length);
    }

    renderPriorityStrip(elements.priorityList, priorityEvents, "Nenhum sub ou membro para esta visão.", state);
    renderList(elements.superchatList, superchatEvents, "Nenhum superchat para esta visão.", state);
    renderLiveList(elements.chatList, chatEvents, "Nenhuma mensagem de chat ao vivo.", state);
    renderDetail(focusedEvent);
  }

  function renderPriorityStrip(container, events, emptyText, state) {
    container.innerHTML = "";

    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const event of events) {
      fragment.appendChild(renderPriorityCard(event, state));
    }

    container.appendChild(fragment);
  }

  function renderList(container, events, emptyText, state) {
    container.innerHTML = "";

    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const event of events) {
      fragment.appendChild(renderEventCard(event, state));
    }

    container.appendChild(fragment);
  }

  function renderLiveList(container, events, emptyText, state) {
    container.innerHTML = "";

    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const event of events) {
      fragment.appendChild(renderLiveEventCard(event, state));
    }

    container.appendChild(fragment);
  }

  function renderPriorityCard(event, state) {
    const template = elements.priorityTemplate.content.cloneNode(true);
    const card = template.querySelector(".priority-card");
    const platformBadge = template.querySelector(".platform-badge");
    const user = template.querySelector(".event-user");
    const months = template.querySelector(".priority-months");

    card.dataset.id = event.id;
    card.classList.toggle("is-selected", event.id === state.overlayId);
    card.classList.toggle("is-gifted", Number.isFinite(event.giftCount) && event.giftCount > 0);

    platformBadge.innerHTML = platformIconMarkup(event.platform);
    user.textContent = `@${event.user}`;
    months.textContent = formatMonths(event.months ?? event.tier);

    return template;
  }

  function renderEventCard(event, state) {
    const template = elements.eventTemplate.content.cloneNode(true);
    const card = template.querySelector(".event-card");
    const eventHead = template.querySelector(".event-head");
    const eventBody = template.querySelector(".event-body");
    const eventMain = template.querySelector(".event-main");
    const eventMetaRow = template.querySelector(".event-meta-row");
    const platformBadge = template.querySelector(".platform-badge");
    const user = template.querySelector(".event-user");
    const time = template.querySelector(".event-time");
    const message = template.querySelector(".event-message");
    const meta = template.querySelector(".event-meta");
    const actions = template.querySelector(".event-actions");
    const readButton = template.querySelector('button[data-action="read"]');
    const hiddenButton = template.querySelector('button[data-action="hidden"]');

    card.dataset.id = event.id;
    card.classList.toggle("is-read", event.status === "read");
    card.classList.toggle("is-hidden", event.status === "hidden");
    card.classList.toggle("is-superchat", event.type === "superchat");
    card.classList.toggle("is-priority", event.type === "sub" || event.type === "member");
    card.classList.toggle("is-selected", event.id === state.overlayId);
    card.classList.toggle("has-actions", event.type !== "message");

    platformBadge.innerHTML = platformIconMarkup(event.platform);
    user.textContent = `@${event.user}`;
    message.textContent = event.message || "";

    if (event.type === "superchat" && Number.isFinite(event.amount)) {
      meta.textContent = `R$ ${formatAmount(event.amount)}`;
    } else if ((event.type === "sub" || event.type === "member") && Number.isFinite(event.tier)) {
      meta.textContent = `Tier ${formatAmount(event.tier)}`;
    } else {
      meta.remove();
    }

    if (event.type === "message") {
      eventMetaRow.remove();
      actions.remove();
    } else {
      readButton.classList.toggle("is-active", event.status === "read");
      hiddenButton.classList.toggle("is-active", event.status === "hidden");

      if (event.type === "superchat" && eventBody && eventMetaRow && eventMain && user && time) {
        time.textContent = formatTime(event.timestamp);
        if (time.textContent) {
          eventMetaRow.insertBefore(user, time);
        } else {
          eventMetaRow.appendChild(user);
        }
        eventHead.classList.add("event-head--superchat");
      } else {
        eventMetaRow.remove();
      }
    }

    return template;
  }

  function renderLiveEventCard(event, state) {
    const template = elements.eventTemplate.content.cloneNode(true);
    const card = template.querySelector(".event-card");
    const eventHead = template.querySelector(".event-head");
    const eventBody = template.querySelector(".event-body");
    const eventMain = template.querySelector(".event-main");
    const eventMetaRow = template.querySelector(".event-meta-row");
    const platformBadge = template.querySelector(".platform-badge");
    const user = template.querySelector(".event-user");
    const time = template.querySelector(".event-time");
    const message = template.querySelector(".event-message");
    const meta = template.querySelector(".event-meta");

    card.dataset.id = event.id;
    card.classList.add("is-live-message");
    card.classList.toggle("is-superchat", event.type === "superchat");
    card.classList.toggle("is-priority", event.type === "sub" || event.type === "member");
    card.classList.toggle("is-selected", event.id === state.overlayId);

    const storedEvent = state.events.find((item) => item.id === event.id);
    const status = storedEvent?.status || event.status || "active";
    card.classList.toggle("is-read", status === "read");
    card.classList.toggle("is-hidden", status === "hidden");

    platformBadge.innerHTML = platformIconMarkup(event.platform);
    user.textContent = `@${event.user}`;
    message.textContent = event.message || "";

    if (event.type === "superchat" && Number.isFinite(event.amount)) {
      meta.textContent = `R$ ${formatAmount(event.amount)}`;
    } else if ((event.type === "sub" || event.type === "member") && Number.isFinite(event.tier)) {
      meta.textContent = `Tier ${formatAmount(event.tier)}`;
    } else {
      meta.remove();
    }

    if (event.type === "superchat" && eventBody && eventMetaRow && eventMain && user && time) {
      time.textContent = formatTime(event.timestamp);
      if (time.textContent) {
        eventMetaRow.insertBefore(user, time);
      } else {
        eventMetaRow.appendChild(user);
      }
      eventHead.classList.add("event-head--superchat");
    } else {
      eventMetaRow.remove();
    }

    return template;
  }

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
    if (kind) {
      kind.textContent = formatType(event.type);
    }
    if (platform) {
      platform.innerHTML = platformIconMarkup(event.platform);
    }
    if (user) {
      user.textContent = `@${event.user}`;
    }
    if (statusNode) {
      statusNode.textContent = formatStatus(status);
    }
    if (extra) {
      if (event.type === "superchat" && Number.isFinite(event.amount)) {
        elements.detailPopup.dataset.kind = "superchat";
        const parts = [`R$ ${formatAmount(event.amount)}`];
        const arrival = formatTime(event.timestamp);
        if (arrival) {
          parts.push(arrival);
        }
        extra.textContent = parts.join(" • ");
      } else if ((event.type === "sub" || event.type === "member") && Number.isFinite(event.months ?? event.tier)) {
        elements.detailPopup.dataset.kind = event.type;
        extra.textContent = `${formatMonths(event.months ?? event.tier)}`;
      } else {
        delete elements.detailPopup.dataset.kind;
        extra.textContent = "Mensagem ao vivo";
      }
    }
    if (message) {
      message.textContent = event.message || "Sem mensagem";
    }
    if (readButton) {
      readButton.classList.toggle("is-active", status === "read");
    }
    if (hiddenButton) {
      hiddenButton.classList.toggle("is-active", status === "hidden");
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
