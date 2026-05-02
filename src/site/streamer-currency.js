import { stripHtml } from "./streamer-text.js";

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

export function formatCurrencyAmount(value, currency, brlRate = null, options = {}) {
  const normalized = normalizeCurrencyCode(currency || "BRL") || "BRL";
  if (normalized === "BITS") {
    if (Number.isFinite(brlRate)) {
      return `${formatAmount(value)} bits · ${formatBrlAmount(value * brlRate)}`;
    }
    return `${formatAmount(value)} bits`;
  }

  const code = resolveCurrencyCode(normalized) || "BRL";
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
