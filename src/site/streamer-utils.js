export const VALID_FILTERS = new Set(["active", "read", "hidden", "all"]);
export const VALID_STATUSES = new Set(["active", "read", "hidden"]);
export const VALID_PLATFORMS = new Set(["twitch", "youtube"]);
export const VALID_TYPES = new Set(["message", "sub", "member", "superchat"]);

export function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function stringOrEmpty(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

export function stripHtml(value) {
  const text = String(value || "");
  if (!text.includes("<")) {
    return decodeHtmlEntities(text);
  }
  const div = document.createElement("div");
  div.innerHTML = text;
  return decodeHtmlEntities(extractReadableText(div));
}

export function decodeHtmlEntities(value) {
  const text = String(value || "");
  if (!text) {
    return "";
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

export function extractReadableText(node) {
  if (!node) {
    return "";
  }

  const parts = [];

  const walk = (current) => {
    if (!current) {
      return;
    }

    if (current.nodeType === Node.TEXT_NODE) {
      const text = current.nodeValue || "";
      if (text) {
        parts.push(text);
      }
      return;
    }

    if (current.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const tag = current.tagName ? current.tagName.toUpperCase() : "";
    if (tag === "BR") {
      parts.push(" ");
      return;
    }

    if (tag === "IMG") {
      const alt = current.getAttribute("alt") || current.getAttribute("aria-label") || current.getAttribute("title") || "";
      if (alt) {
        parts.push(alt);
      }
      return;
    }

    for (const child of current.childNodes || []) {
      walk(child);
    }
  };

  walk(node);
  return cleanText(parts.join(""));
}

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

export function inferPlatform(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("youtube")) {
    return "youtube";
  }
  if (normalized.includes("twitch")) {
    return "twitch";
  }
  return null;
}

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

export function parseAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value == null) {
    return null;
  }

  const text = String(value).replace(/\s+/g, " ").trim();
  const match = text.match(/-?\d[\d.,]*/);
  if (!match) {
    return null;
  }

  const numeric = parseFloat(match[0].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

export function extractGiftCount(source, membershipMarkup, message) {
  const candidates = [
    source?.giftCount,
    source?.gifts,
    source?.giftsGiven,
    source?.gifted,
    source?.giftedCount,
    source?.subsGiven,
    source?.subsGifted,
    source?.memberships,
    source?.membershipsGiven,
    source?.memberGifts
  ];

  for (const candidate of candidates) {
    const value = toNumber(candidate);
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

  if (!/(gift|gifted|gifts|memberships?|subs? given|present|presentes)/i.test(haystack)) {
    return null;
  }

  const match = haystack.match(/(\d{1,4})/);
  return match ? Number(match[1]) : 1;
}

export function platformIconMarkup(platform) {
  const src = platform === "twitch" ? "/twitch.png" : "/youtube.png";
  const label = platform === "twitch" ? "Twitch" : "YouTube";
  return `<img src="${src}" alt="${label}" title="${label}">`;
}

export function formatAmount(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2
  }).format(value);
}

export function formatBrlAmount(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
  }).format(value);
}

export function extractCurrencyLabel(source, donationText) {
  const candidates = [
    source?.currencyCode,
    source?.currency,
    source?.currencySymbol
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const text = stripHtml(candidate).trim().toUpperCase();
    if (text) {
      return resolveCurrencyCode(text);
    }
  }

  const rawText = stripHtml(String(donationText || source?.hasDonation || source?.amount || "")).trim();
  if (!rawText) {
    return "";
  }

  const upper = rawText.toUpperCase();
  if (upper.includes("R$")) {
    return "BRL";
  }
  if (upper.includes("US$") || upper.includes("USD")) {
    return "USD";
  }
  if (upper.includes("CA$") || upper.includes("C$") || upper.includes("CAD")) {
    return "CAD";
  }
  if (upper.includes("AU$") || upper.includes("A$") || upper.includes("AUD")) {
    return "AUD";
  }
  if (upper.includes("MX$") || upper.includes("MXN")) {
    return "MXN";
  }
  if (upper.includes("€") || upper.includes("EUR")) {
    return "EUR";
  }
  if (upper.includes("£") || upper.includes("GBP")) {
    return "GBP";
  }
  if (upper.includes("¥") || upper.includes("JPY")) {
    return "JPY";
  }
  if (upper.includes("₩") || upper.includes("KRW")) {
    return "KRW";
  }

  const codeMatch = upper.match(/\b[A-Z]{3}\b/);
  if (!codeMatch) {
    return "";
  }

  return resolveCurrencyCode(codeMatch[0]);
}

export function normalizeCurrencyCode(value) {
  const code = String(value || "").trim().toUpperCase();
  const aliases = {
    "$": "USD",
    "R$": "BRL",
    "US$": "USD",
    "C$": "CAD",
    "CA$": "CAD",
    "A$": "AUD",
    "AU$": "AUD",
    "MX$": "MXN",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "₩": "KRW"
  };

  return aliases[code] || code;
}

export function isValidCurrencyCode(value) {
  const code = normalizeCurrencyCode(value);
  if (!/^[A-Z]{3}$/.test(code)) {
    return false;
  }

  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    try {
      return Intl.supportedValuesOf("currency").includes(code);
    } catch {
      // Fall through to a minimal safety check below.
    }
  }

  return code !== "DIV";
}

export function resolveCurrencyCode(value) {
  const code = normalizeCurrencyCode(value);
  return isValidCurrencyCode(code) ? code : "";
}

export function formatCurrencyAmount(value, currency, brlRate = null, options = {}) {
  const code = resolveCurrencyCode(currency || "BRL") || "BRL";
  const amount = formatAmount(value);
  const native = `${code} ${amount}`;
  const pendingText = typeof options.pendingText === "string" ? options.pendingText : "";

  if (code === "BRL") {
    return native;
  }

  if (!Number.isFinite(brlRate)) {
    if (pendingText) {
      return `${native} · ${pendingText}`;
    }
    return native;
  }

  return `${native} · ${formatBrlAmount(value * brlRate)}`;
}

export function formatMonths(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return "1 mês";
  }

  return number === 1 ? "1 mês" : `${formatAmount(number)} meses`;
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
    case "hidden":
      return "Oculto";
    default:
      return "Ativo";
  }
}

export function labelForFilter(filter) {
  switch (filter) {
    case "read":
      return "Lidos";
    case "hidden":
      return "Ocultos";
    case "all":
      return "Tudo";
    default:
      return "Ativos";
  }
}

export function inferEventType(source, platform, hasDonation, hasMembership) {
  const explicit = String(source.eventType || source.kind || source.messageType || "").toLowerCase();
  if (VALID_TYPES.has(explicit)) {
    return explicit;
  }

  if (hasDonation !== "" && hasDonation != null) {
    return "superchat";
  }

  if (platform === "youtube" && hasMembership !== "") {
    return "member";
  }

  if (platform === "twitch" && hasMembership !== "") {
    return "sub";
  }

  return "message";
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

export function buildOverlayPayload(event, options = {}) {
  const currencyRate = Number(options.currencyRate);
  const chatmessage = event.message || "";
  const payload = {
    chatname: event.user,
    chatbadges: event.chatbadges || "",
    backgroundColor: event.backgroundColor || "",
    textColor: event.textColor || "",
    chatmessage,
    chatimg: event.chatimg || (event.platform === "twitch" ? "extension/twitch.png" : "extension/youtube.png"),
    hasDonation: event.hasDonation || "",
    hasMembership: event.hasMembership || "",
    type: event.platform,
    platform: event.platform,
    eventType: event.type,
    currency: event.currency || "",
    timestamp: Date.now()
  };

  if (event.type === "superchat" && Number.isFinite(event.amount)) {
    payload.hasDonation = `<div class="donation">${formatCurrencyAmount(event.amount, event.currency, currencyRate)}</div>`;
    if (!payload.chatmessage) {
      payload.chatmessage = `Superchat de ${formatCurrencyAmount(event.amount, event.currency, currencyRate)}`;
    }
  }

  if ((event.type === "sub" || event.type === "member") && Number.isFinite(event.tier)) {
    payload.hasMembership = '<div class="donation membership">' + (event.type === "sub" ? "NEW SUB!" : "NEW MEMBER!") + "</div>";
    if (!payload.chatmessage) {
      payload.chatmessage = event.type === "sub" ? "Novo sub!" : "Novo membro!";
    }
  } else if (event.type === "sub" || event.type === "member") {
    payload.hasMembership = '<div class="donation membership">' + (event.type === "sub" ? "NEW SUB!" : "NEW MEMBER!") + "</div>";
    if (!payload.chatmessage) {
      payload.chatmessage = event.type === "sub" ? "Novo sub!" : "Novo membro!";
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

    if (!VALID_STATUSES.has(event.status)) {
      return null;
    }

    if (event.type === "superchat" && !Number.isFinite(event.amount)) {
      return null;
    }

    return {
      id: event.id.trim(),
      platform: event.platform,
      type: event.type,
      user: event.user.trim(),
      timestamp: Math.floor(event.timestamp),
      status: event.status,
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
      ...(Number.isFinite(event.giftCount) ? { giftCount: event.giftCount } : {})
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
    const currency = extractCurrencyLabel(source, donationMarkup || hasDonation);
    const giftCount = extractGiftCount(source, membershipMarkup, message);
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

    if ((type === "sub" || type === "member") && Number.isFinite(tier)) {
      event.tier = tier;
      event.months = tier;
    }

    if (Number.isFinite(giftCount) && giftCount > 0) {
      event.giftCount = giftCount;
    }

    return validateEvent(event);
  }

  function normalizeStoredEvent(rawEvent) {
    const currency = extractCurrencyLabel(rawEvent, rawEvent?.hasDonation);
    const event = validateEvent({
      id: rawEvent?.id,
      platform: rawEvent?.platform,
      type: rawEvent?.type,
      user: rawEvent?.user,
      timestamp: toNumber(rawEvent?.timestamp),
      status: VALID_STATUSES.has(rawEvent?.status) ? rawEvent.status : "active",
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

