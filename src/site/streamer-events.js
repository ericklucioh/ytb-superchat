import { cleanText, decodeHtmlEntities, extractGiftCount, hashString, inferEventType, inferPlatform, parseAmount, stringOrEmpty, stripHtml, toNumber } from "./streamer-text.js";
import { extractCurrencyLabel, formatAmount, formatCurrencyAmount } from "./streamer-currency.js";

export const VALID_FILTERS = new Set(["active", "read", "favorite", "all"]);
export const VALID_STATUSES = new Set(["active", "read", "favorite"]);
export const VALID_PLATFORMS = new Set(["twitch", "youtube"]);
export const VALID_TYPES = new Set(["message", "sub", "member", "superchat"]);

function normalizeStatusValue(status) {
  if (status === "hidden") {
    return "favorite";
  }

  return status;
}

export function platformIconMarkup(platform) {
  const src = platform === "twitch" ? "twitch.png" : "youtube.png";
  const label = platform === "twitch" ? "Twitch" : "YouTube";
  return `<img src="${src}" alt="${label}" title="${label}">`;
}

export function formatMonths(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return "1 mês";
  }

  return number === 1 ? "1 mês" : `${formatAmount(number)} meses`;
}

  function extractSubscriptionMonths(source, membershipMarkup, message) {
    const candidates = [
      source?.months,
      source?.subscriptionMonths,
      source?.subMonths,
    source?.monthCount
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  const haystack = [
    membershipMarkup,
    message,
    source?.chatmessage,
    source?.message,
    source?.text
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack) {
    return null;
  }

    const patterns = [
      /\bsubscribed\s+for\s+(\d{1,4})\s+months?\b/i,
      /\b(\d{1,4})\s+months?\b/i,
      /\b(\d{1,4})\s+m[êe]s(?:es)?\b/i,
      /\bmonth(?:s)?\s*:\s*(\d{1,4})\b/i
    ];

  for (const pattern of patterns) {
    const match = haystack.match(pattern);
    if (match && match[1]) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
  }

  return null;
}

export function formatType(type) {
  switch (type) {
    case "sub":
      return "Sub";
    case "member":
      return "Membro";
    case "superchat":
      return "Superchat";
    default:
      return "Chat";
  }
}

export function formatStatus(status) {
  switch (status) {
    case "read":
      return "Lido";
    case "favorite":
    case "hidden":
      return "Favorito";
    default:
      return "Ativo";
  }
}

export function labelForFilter(filter) {
  switch (filter) {
    case "read":
      return "Lidos";
    case "favorite":
    case "hidden":
      return "Favoritos";
    case "all":
      return "Tudo";
    default:
      return "Ativos";
  }
}

export function comparePriorityEvent(a, b) {
  const aGift = Number.isFinite(a.giftCount) && a.giftCount > 0;
  const bGift = Number.isFinite(b.giftCount) && b.giftCount > 0;

  if (aGift !== bGift) {
    return bGift ? 1 : -1;
  }

  if (bGift && aGift && b.giftCount !== a.giftCount) {
    return b.giftCount - a.giftCount;
  }

  return b.timestamp - a.timestamp;
}

export function compareSuperchatEvent(a, b) {
  const aAmount = Number.isFinite(a.sortBrlAmount) ? a.sortBrlAmount : -Infinity;
  const bAmount = Number.isFinite(b.sortBrlAmount) ? b.sortBrlAmount : -Infinity;

  if (aAmount !== bAmount) {
    return bAmount - aAmount;
  }

  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  }

  return String(a.id || "").localeCompare(String(b.id || ""));
}

export function compareMessageEvent(a, b) {
  return b.timestamp - a.timestamp;
}

export function formatTime(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

export function buildOverlayPayload(event) {
  const chatmessage = event.message || "";
  const payload = {
    chatname: event.user,
    chatbadges: event.chatbadges || "",
    backgroundColor: event.backgroundColor || "",
    textColor: event.textColor || "",
    chatmessage,
    chatimg: event.chatimg || (event.platform === "twitch" ? "twitch.png" : "youtube.png"),
    hasDonation: event.hasDonation || "",
    hasMembership: event.hasMembership || "",
    type: event.platform,
    platform: event.platform,
    eventType: event.type,
    currency: event.currency || "",
    timestamp: Date.now()
  };

  if (event.type === "superchat" && Number.isFinite(event.amount)) {
    payload.hasDonation = `<div class="donation">${formatCurrencyAmount(event.amount, event.currency)}</div>`;
    if (!payload.chatmessage) {
      payload.chatmessage = `Superchat de ${formatCurrencyAmount(event.amount, event.currency)}`;
    }
  }

  if (event.type === "sub" || event.type === "member") {
    const membershipLabel = event.type === "sub" ? "Sub" : "Membro";
    const monthsValue = Number.isFinite(event.months) ? event.months : (Number.isFinite(event.tier) ? event.tier : null);
    const monthsText = Number.isFinite(monthsValue) ? formatMonths(monthsValue) : "";

    payload.hasMembership = `<div class="membership-chip">${monthsText || membershipLabel}</div>`;
    if (!payload.chatmessage) {
      payload.chatmessage = `Novo ${event.type === "sub" ? "sub" : "membro"}`;
    }
  }

  if (!payload.chatmessage) {
    payload.chatmessage = event.type === "message" ? "Mensagem ao vivo." : "";
  }

  return payload.chatmessage ? payload : null;
}

export function feedRoomFor(roomId) {
  return `${roomId}:feed`;
}

export function createEventNormalizer() {
  function normalizeDedupeText(value) {
    return cleanText(stripHtml(String(value || ""))).toLowerCase();
  }

  function normalizeDedupeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : "";
  }

  function normalizeDedupeCurrency(value) {
    return String(value || "").trim().toUpperCase();
  }

  function getNormalizedEventAmount(event) {
    return Number.isFinite(event?.amount) ? event.amount : null;
  }

  function getNormalizedMembershipValue(event) {
    if (Number.isFinite(event?.months)) {
      return event.months;
    }
    if (Number.isFinite(event?.tier)) {
      return event.tier;
    }
    return null;
  }

  function buildDedupeKey(event) {
    if (!event || typeof event !== "object") {
      return "";
    }

    if (event.type === "message") {
      return `message|${cleanText(event.id || "")}`;
    }

    const platform = String(event.platform || "").trim().toLowerCase();
    const type = String(event.type || "").trim().toLowerCase();
    const user = normalizeDedupeText(event.user);
    const message = normalizeDedupeText(event.message || "");

    if (event.type === "superchat") {
      return [
        "superchat",
        platform,
        type,
        user,
        normalizeDedupeNumber(getNormalizedEventAmount(event)),
        normalizeDedupeCurrency(event.currency),
        message,
        normalizeDedupeText(event.hasDonation)
      ].join("|");
    }

    return [
      type,
      platform,
      user,
      normalizeDedupeNumber(getNormalizedMembershipValue(event)),
      message,
      normalizeDedupeText(event.hasMembership)
    ].join("|");
  }

  function validateEvent(event) {
    if (!event || typeof event !== "object") {
      return null;
    }

    if (typeof event.id !== "string" || !event.id.trim()) {
      return null;
    }

    if (!VALID_PLATFORMS.has(event.platform)) {
      return null;
    }

    if (!VALID_TYPES.has(event.type)) {
      return null;
    }

    if (typeof event.user !== "string" || !event.user.trim()) {
      return null;
    }

    if (!Number.isFinite(event.timestamp)) {
      return null;
    }

    const normalizedStatus = normalizeStatusValue(event.status);
    if (!VALID_STATUSES.has(normalizedStatus)) {
      return null;
    }

    if (event.type === "superchat" && !Number.isFinite(event.amount)) {
      return null;
    }

    const dedupeKey = buildDedupeKey(event);
    return {
      id: event.id.trim(),
      platform: event.platform,
      type: event.type,
      user: event.user.trim(),
      timestamp: Math.floor(event.timestamp),
      status: normalizedStatus,
      ...(event.message ? { message: event.message } : {}),
      ...(event.chatimg ? { chatimg: event.chatimg } : {}),
      ...(event.chatbadges ? { chatbadges: event.chatbadges } : {}),
      ...(event.backgroundColor ? { backgroundColor: event.backgroundColor } : {}),
      ...(event.textColor ? { textColor: event.textColor } : {}),
      ...(event.hasDonation ? { hasDonation: event.hasDonation } : {}),
      ...(event.hasMembership ? { hasMembership: event.hasMembership } : {}),
      ...(event.currency ? { currency: event.currency } : {}),
      ...(Number.isFinite(event.amount) ? { amount: event.amount } : {}),
      ...(Number.isFinite(event.tier) ? { tier: event.tier } : {}),
      ...(Number.isFinite(event.months) ? { months: event.months } : {}),
      ...(Number.isFinite(event.giftCount) ? { giftCount: event.giftCount } : {}),
      dedupeKey
    };
  }

  function normalizeIncoming(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    if (!payload.feed) {
      return null;
    }

    if (payload.contents === false || payload.contents == null) {
      return null;
    }

    const source = payload.contents && typeof payload.contents === "object" ? payload.contents : payload;
    const platform = inferPlatform(source.platform || source.type);
    if (!platform) {
      return null;
    }

    const user = cleanText(source.chatname || source.user || source.author || source.name || "");
    if (!user) {
      return null;
    }

    const hasDonation = source.hasDonation ?? source.amount ?? "";
    const hasMembership = source.hasMembership ?? source.tier ?? "";
    const message = cleanText(stripHtml(source.chatmessage ?? source.message ?? source.text ?? ""));
    const chatimg = stringOrEmpty(source.chatimg || source.avatar || source.image || "");
    const chatbadges = stringOrEmpty(source.chatbadges || source.badges || "");
    const backgroundColor = stringOrEmpty(source.backgroundColor || "");
    const textColor = stringOrEmpty(source.textColor || "");
    const donationMarkup = stringOrEmpty(source.hasDonation || "");
    const membershipMarkup = stringOrEmpty(source.hasMembership || "");
    const explicitCurrency = stringOrEmpty(source.currency || "");
    const currency = explicitCurrency || extractCurrencyLabel(source, donationMarkup || hasDonation);
    const giftCount = extractGiftCount(source, membershipMarkup, message);
    const subscriptionMonths = extractSubscriptionMonths(source, membershipMarkup, message);
    const timestamp = toNumber(source.timestamp ?? payload.timestamp ?? Date.now());
    if (!Number.isFinite(timestamp)) {
      return null;
    }

    const type = inferEventType(source, platform, hasDonation, hasMembership);
    let amount = null;
    let tier = null;

    if (type === "superchat") {
      amount = parseAmount(hasDonation);
      if (!Number.isFinite(amount)) {
        return null;
      }
    } else if (type === "member" || type === "sub") {
      tier = parseAmount(hasMembership);
    }

    if (!VALID_TYPES.has(type)) {
      return null;
    }

    const rawId = source.id ?? payload.id;
    const id = rawId != null && rawId !== ""
      ? `${platform}:${String(rawId)}`
      : `evt_${hashString([platform, type, user, message, amount ?? "", tier ?? "", timestamp].join("|"))}`;

    const event = {
      id,
      platform,
      type,
      user,
      timestamp,
      status: "active"
    };

    if (message) {
      event.message = message;
    }

    if (chatimg) {
      event.chatimg = chatimg;
    }

    if (chatbadges) {
      event.chatbadges = chatbadges;
    }

    if (backgroundColor) {
      event.backgroundColor = backgroundColor;
    }

    if (textColor) {
      event.textColor = textColor;
    }

    if (donationMarkup) {
      event.hasDonation = donationMarkup;
    }

    if (membershipMarkup) {
      event.hasMembership = membershipMarkup;
    }

    if (currency) {
      event.currency = currency;
    }

    if (type === "superchat") {
      event.amount = amount;
    }

    if ((type === "sub" || type === "member")) {
      if (Number.isFinite(subscriptionMonths)) {
        event.months = subscriptionMonths;
      } else if (Number.isFinite(tier)) {
        event.tier = tier;
        event.months = tier;
      } else if (Number.isFinite(source?.months)) {
        event.months = Number(source.months);
      }
    }

    if (Number.isFinite(giftCount) && giftCount > 0) {
      event.giftCount = giftCount;
    }

    return validateEvent(event);
  }

  function normalizeStoredEvent(rawEvent) {
    const explicitCurrency = stringOrEmpty(rawEvent?.currency || "");
    const currency = explicitCurrency || extractCurrencyLabel(rawEvent, rawEvent?.hasDonation);
    const normalizedStatus = normalizeStatusValue(rawEvent?.status);
    const event = validateEvent({
      id: rawEvent?.id,
      platform: rawEvent?.platform,
      type: rawEvent?.type,
      user: rawEvent?.user,
      timestamp: toNumber(rawEvent?.timestamp),
      status: VALID_STATUSES.has(normalizedStatus) ? normalizedStatus : "active",
      message: typeof rawEvent?.message === "string" ? rawEvent.message : "",
      chatimg: typeof rawEvent?.chatimg === "string" ? rawEvent.chatimg : "",
      chatbadges: typeof rawEvent?.chatbadges === "string" ? rawEvent.chatbadges : "",
      backgroundColor: typeof rawEvent?.backgroundColor === "string" ? rawEvent.backgroundColor : "",
      textColor: typeof rawEvent?.textColor === "string" ? rawEvent.textColor : "",
      hasDonation: typeof rawEvent?.hasDonation === "string" ? rawEvent.hasDonation : "",
      hasMembership: typeof rawEvent?.hasMembership === "string" ? rawEvent.hasMembership : "",
      currency,
      amount: toNumber(rawEvent?.amount),
      tier: toNumber(rawEvent?.tier),
      months: toNumber(rawEvent?.months),
      subscriptionMonths: toNumber(rawEvent?.subscriptionMonths),
      giftCount: toNumber(rawEvent?.giftCount)
    });

    if (!event) {
      return null;
    }

    if (rawEvent?.message) {
      event.message = cleanText(decodeHtmlEntities(String(rawEvent.message)));
    }

    return event;
  }

  return {
    normalizeIncoming,
    normalizeStoredEvent,
    validateEvent
  };
}
