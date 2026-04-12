import { isValidCurrencyCode, normalizeCurrencyCode } from "./streamer-currency.js";

export function createCurrencyRateService({ scheduleRender } = {}) {
  const currencyRates = new Map();
  const pendingCurrencyRates = new Map();

  function getCurrencyRate(currency) {
    const code = normalizeCurrencyCode(currency || "BRL") || "BRL";
    if (!isValidCurrencyCode(code)) {
      return null;
    }
    if (code === "BRL") {
      return 1;
    }

    return currencyRates.get(code) ?? null;
  }

  function hasCurrencyRate(currency) {
    const code = normalizeCurrencyCode(currency || "BRL") || "BRL";
    if (!isValidCurrencyCode(code)) {
      return false;
    }
    if (code === "BRL") {
      return true;
    }

    return currencyRates.has(code);
  }

  function decorateSuperchatEvent(event) {
    if (!event || event.type !== "superchat" || !Number.isFinite(event.amount)) {
      return event;
    }

    const currency = normalizeCurrencyCode(event.currency || "BRL") || "BRL";
    if (currency === "BITS") {
      return {
        ...event,
        currency,
        currencyRate: null,
        currencyRateLoaded: false,
        brlAmount: 0,
        sortBrlAmount: event.amount
      };
    }

    const currencyRate = getCurrencyRate(currency);
    const brlAmount = Number.isFinite(currencyRate) ? event.amount * currencyRate : event.amount;
    const sortBrlAmount = brlAmount;

    return {
      ...event,
      currency,
      currencyRate,
      currencyRateLoaded: hasCurrencyRate(currency),
      brlAmount,
      sortBrlAmount
    };
  }

  function summarizeSuperchatEvents(events) {
    let totalBrl = 0;

    for (const event of events) {
      if (Number.isFinite(event?.brlAmount)) {
        totalBrl += event.brlAmount;
      }
    }

    return { totalBrl };
  }

  function warmCurrencyRates(events) {
    const currencies = new Set();

    for (const event of events) {
      if (!event || event.type !== "superchat" || !Number.isFinite(event.amount)) {
        continue;
      }

      const code = normalizeCurrencyCode(event.currency || "BRL") || "BRL";
      if (code === "BITS") {
        continue;
      }
      if (!isValidCurrencyCode(code)) {
        continue;
      }
      if (code !== "BRL" && !currencyRates.has(code) && !pendingCurrencyRates.has(code)) {
        currencies.add(code);
      }
    }

    for (const code of currencies) {
      loadCurrencyRate(code);
    }
  }

  function loadCurrencyRate(code) {
    if (pendingCurrencyRates.has(code)) {
      return pendingCurrencyRates.get(code);
    }

    const promise = fetchCurrencyRate(code)
      .then((rate) => {
        currencyRates.set(code, Number.isFinite(rate) && rate > 0 ? rate : null);
        return rate;
      })
      .finally(() => {
        pendingCurrencyRates.delete(code);
        if (typeof scheduleRender === "function") {
          scheduleRender();
        }
      });

    pendingCurrencyRates.set(code, promise);
    return promise;
  }

  async function fetchCurrencyRate(code) {
    try {
      const rate = await fetchFrankfurterRate(code);
      if (Number.isFinite(rate) && rate > 0) {
        return rate;
      }
      return await fetchFrankfurterLegacyRate(code);
    } catch {
      return null;
    }
  }

  async function fetchFrankfurterRate(code) {
    const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(code)}&quotes=BRL`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rate = Array.isArray(data) ? data[0]?.rate : null;
    return Number.isFinite(rate) ? rate : null;
  }

  async function fetchFrankfurterLegacyRate(code) {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(code)}&to=BRL`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rate = Number(data?.rates?.BRL);
    return Number.isFinite(rate) ? rate : null;
  }

  return {
    decorateSuperchatEvent,
    summarizeSuperchatEvents,
    warmCurrencyRates,
    getCurrencyRate,
    hasCurrencyRate
  };
}
