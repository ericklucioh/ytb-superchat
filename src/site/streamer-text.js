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

export function inferEventType(source, platform, hasDonation, hasMembership) {
  const explicitType = String(source?.eventType || source?.type || "").toLowerCase();

  if (explicitType === "message" || explicitType === "sub" || explicitType === "member" || explicitType === "superchat") {
    return explicitType;
  }

  if (explicitType.includes("superchat") || explicitType.includes("donation") || explicitType.includes("paid")) {
    return "superchat";
  }

  if (explicitType.includes("member") || explicitType.includes("membership") || explicitType.includes("sponsor")) {
    return platform === "twitch" ? "sub" : "member";
  }

  if (explicitType.includes("sub")) {
    return "sub";
  }

  if (Number.isFinite(parseAmount(hasDonation))) {
    return "superchat";
  }

  if (hasDonation && String(hasDonation).trim()) {
    return "superchat";
  }

  if (hasMembership && String(hasMembership).trim()) {
    return platform === "twitch" ? "sub" : "member";
  }

  return "message";
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
