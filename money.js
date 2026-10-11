(function (root) {
  "use strict";

  var MAX_MONEY = 1000000000;
  var LANGS = ["en", "ru", "fr", "ar"];
  var CURRENCIES = ["USD", "EUR", "GBP", "RUB", "CAD", "AUD", "CHF", "AED"];
  var SYMBOLS = { USD: "$", EUR: "€", GBP: "£", RUB: "₽", CAD: "C$", AUD: "A$", CHF: "CHF", AED: "AED" };
  var LOCALES = { en: "en-US", ru: "ru-RU", fr: "fr-FR", ar: "ar-EG-u-nu-latn" };
  var PERIODS = ["week", "month", "year"];

  function digitsToLatin(value) {
    return String(value)
      .replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
      .replace(/[۰-۹]/g, function (d) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); })
      .replace(/\u066B/g, ".")
      .replace(/\u066C/g, ",")
      .replace(/[٪%]/g, "");
  }

  function normalizeNumberString(raw, lang) {
    var s = digitsToLatin(raw).trim().replace(/C\$|A\$|CHF|AED/gi, "").replace(/[$€£₽\s\u00a0\u202f]/g, "");
    if (s === "") return "";
    s = s.replace(/−/g, "-");
    if (s.indexOf("-") !== -1) return s;
    var commas = (s.match(/,/g) || []).length;
    var dots = (s.match(/\./g) || []).length;
    if (lang === "en") {
      if (commas && dots) {
        if (s.lastIndexOf(".") > s.lastIndexOf(",")) s = s.replace(/,/g, "");
        else s = s.replace(/\./g, "").replace(",", ".");
      } else if (commas) {
        if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
        else if (commas === 1) s = s.replace(",", ".");
        else return null;
      }
    } else if (commas && dots) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (commas === 1) s = s.replace(",", ".");
    else if (commas > 1) return null;
    else if (dots > 1) {
      if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
      else return null;
    }
    if (/^\d+\.$/.test(s)) s = s.slice(0, -1);
    return s;
  }

  function parseField(raw, options) {
    var opts = options || {};
    var max = typeof opts.max === "number" ? opts.max : MAX_MONEY;
    var tooBig = opts.tooBig || "large";
    var lang = opts.lang || "en";
    if (raw == null || String(raw).trim() === "") return { ok: true, empty: true, value: 0 };
    var normalized = normalizeNumberString(raw, lang);
    if (normalized == null || normalized === "") return { ok: false, error: "invalid" };
    if (normalized.indexOf("-") !== -1) return { ok: false, error: "negative" };
    if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false, error: "invalid" };
    var value = Number(normalized);
    if (!Number.isFinite(value)) return { ok: false, error: "invalid" };
    if (value < 0) return { ok: false, error: "negative" };
    if (value > max) return { ok: false, error: tooBig };
    return { ok: true, empty: false, value: value };
  }

  function compute(input) {
    var taxPct = input.taxPct;
    if (!Number.isFinite(taxPct) || taxPct < 0 || taxPct > 100) return null;
    var grossAnnual;
    if (input.mode === "hourly") {
      if (!Number.isFinite(input.rate) || !Number.isFinite(input.hours)) return null;
      if (input.rate < 0 || input.hours < 0 || input.hours > 168 || input.rate > MAX_MONEY) return null;
      grossAnnual = input.rate * input.hours * 52;
    } else {
      if (!Number.isFinite(input.salary) || input.salary < 0 || input.salary > MAX_MONEY) return null;
      grossAnnual = input.salary * 12;
    }
    if (!Number.isFinite(grossAnnual)) return null;
    var bases = { week: grossAnnual / 52, month: grossAnnual / 12, year: grossAnnual };
    var gross = {};
    var tax = {};
    var net = {};
    for (var i = 0; i < PERIODS.length; i += 1) {
      var key = PERIODS[i];
      var g = bases[key];
      var t = (g * taxPct) / 100;
      gross[key] = g;
      tax[key] = t;
      net[key] = g - t;
    }
    return { gross: gross, tax: tax, net: net };
  }

  function formatMoney(amount, currency, lang) {
    if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
    var code = CURRENCIES.indexOf(currency) === -1 ? "USD" : currency;
    var number;
    try {
      number = new Intl.NumberFormat(LOCALES[lang] || "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    } catch (err) {
      return "—";
    }
    var symbol = SYMBOLS[code];
    if (lang === "en") return symbol + number;
    return number + "\u00a0" + symbol;
  }

  function formatHours(amount, lang) {
    if (!Number.isFinite(amount)) return "—";
    try {
      return new Intl.NumberFormat(LOCALES[lang] || "en-US", { maximumFractionDigits: 2 }).format(amount);
    } catch (err) {
      return "—";
    }
  }

  function plainAmount(amount) {
    if (!Number.isFinite(amount)) return "";
    return (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);
  }

  function onAccent(hex) {
    var h = String(hex || "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#f7fffb";
    var n = parseInt(h, 16);
    var y = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    return y > 0.62 ? "#082018" : "#f7fffb";
  }

  function todayISO(date) {
    var d = date || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function isISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split("-").map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return dt.getFullYear() === parts[0] && dt.getMonth() === parts[1] - 1 && dt.getDate() === parts[2];
  }

  function weekStartsOn(lang) {
    if (lang === "ar") return 6;
    if (lang === "en") return 0;
    return 1;
  }

  function monthCells(year, month, weekStart) {
    var first = new Date(year, month, 1);
    var pad = (first.getDay() - weekStart + 7) % 7;
    var count = new Date(year, month + 1, 0).getDate();
    var cells = [];
    var i;
    for (i = 0; i < pad; i += 1) cells.push(null);
    for (var day = 1; day <= count; day += 1) {
      cells.push(year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0"));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  root.PaylyMoney = {
    MAX_MONEY: MAX_MONEY,
    LANGS: LANGS,
    CURRENCIES: CURRENCIES,
    SYMBOLS: SYMBOLS,
    LOCALES: LOCALES,
    parseField: parseField,
    compute: compute,
    formatMoney: formatMoney,
    formatHours: formatHours,
    plainAmount: plainAmount,
    onAccent: onAccent,
    todayISO: todayISO,
    isISODate: isISODate,
    weekStartsOn: weekStartsOn,
    monthCells: monthCells,
  };
})(window);
