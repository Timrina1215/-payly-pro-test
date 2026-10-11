(function () {
  "use strict";

  var M = window.PaylyMoney;
  var I = window.PaylyI18n;
  var KEY = "payly-pro";
  var now = new Date();
  var state = {
    lang: "en",
    theme: "light",
    themePref: null,
    currency: "USD",
    mode: "hourly",
    period: "month",
    hourlyRate: "",
    hours: "",
    salary: "",
    tax: "",
    entries: [],
    appName: "",
    accent: null,
    textColor: null,
    textOutline: "none",
    outlineStrength: "thin",
    background: "default",
    tab: "calc",
  };
  var cursor = { y: now.getFullYear(), m: now.getMonth() };
  var draft = null;
  var confirming = false;
  var manual = false;

  function $(id) { return document.getElementById(id); }
  function t(key) { return I.translate(state.lang, key); }
  function name() { return state.appName.trim() || "Payly Pro"; }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function errorText(code) {
    if (code === "negative") return t("errNegative");
    if (code === "tax") return t("errTax");
    if (code === "hours") return t("errHours");
    if (code === "large") return t("errLarge");
    return t("errInvalid");
  }

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || typeof data !== "object") return;
      if (M.LANGS.indexOf(data.lang) !== -1) state.lang = data.lang;
      if (data.theme === "light" || data.theme === "dark") {
        state.themePref = data.theme;
        state.theme = data.theme;
        manual = true;
      }
      if (M.CURRENCIES.indexOf(data.currency) !== -1) state.currency = data.currency;
      if (data.mode === "monthly" || data.mode === "hourly") state.mode = data.mode;
      if (data.period === "week" || data.period === "month" || data.period === "year") state.period = data.period;
      ["hourlyRate", "hours", "salary", "tax", "appName"].forEach(function (key) {
        if (typeof data[key] === "string") state[key] = data[key];
      });
      if (typeof data.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(data.accent)) state.accent = data.accent;
      if (typeof data.textColor === "string" && /^#[0-9a-fA-F]{6}$/.test(data.textColor)) state.textColor = data.textColor;
      if (["none", "black", "white"].indexOf(data.textOutline) !== -1) state.textOutline = data.textOutline;
      if (["thin", "medium", "strong"].indexOf(data.outlineStrength) !== -1) state.outlineStrength = data.outlineStrength;
      if (data.background === "photo" || data.background === "none" || data.background === "default") state.background = data.background;
      if (Array.isArray(data.entries)) {
        state.entries = data.entries.filter(function (row) {
          if (!row || typeof row.date !== "string" || !M.isISODate(row.date)) return false;
          if (M.CURRENCIES.indexOf(row.currency) === -1) return false;
          if ([row.gross, row.tax, row.net, row.hours].some(function (n) { return typeof n !== "number" || n < 0; })) return false;
          if (!row.id) row.id = uid();
          return true;
        });
      }
    } catch (err) { /* ignore */ }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        lang: state.lang,
        theme: state.themePref,
        currency: state.currency,
        mode: state.mode,
        period: state.period,
        hourlyRate: state.hourlyRate,
        hours: state.hours,
        salary: state.salary,
        tax: state.tax,
        entries: state.entries,
        appName: state.appName,
        accent: state.accent,
        textColor: state.textColor,
        textOutline: state.textOutline,
        outlineStrength: state.outlineStrength,
        background: state.background,
      }));
    } catch (err) { /* private mode */ }
  }

  function systemTheme() {
    var tg = telegram();
    if (tg && inside(tg) && (tg.colorScheme === "dark" || tg.colorScheme === "light")) return tg.colorScheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function telegram() {
    return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  }
  function inside(tg) {
    if (!tg) return false;
    if (tg.initData && String(tg.initData).length > 0) return true;
    if (tg.platform && tg.platform !== "unknown") return true;
    return false;
  }

  function applyChrome() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("data-theme", state.theme);
    document.documentElement.setAttribute("data-bg", state.background);
    document.title = name();
    var meta = $("theme-color");
    if (meta) meta.setAttribute("content", state.theme === "dark" ? "#101211" : "#e7eee9");
    var app = $("app");
    if (state.accent) {
      app.style.setProperty("--accent", state.accent);
      app.style.setProperty("--on-accent", M.onAccent(state.accent));
      app.style.setProperty("--accent-2", "color-mix(in srgb, " + state.accent + " 18%, transparent)");
    } else {
      app.style.removeProperty("--accent");
      app.style.removeProperty("--on-accent");
      app.style.removeProperty("--accent-2");
    }
    if (state.textColor) app.style.setProperty("--custom-text", state.textColor);
    else app.style.removeProperty("--custom-text");
    var outlineColor = state.textOutline === "black" ? "#000" : state.textOutline === "white" ? "#fff" : "transparent";
    var outlineSize = state.outlineStrength === "strong" ? 1.25 : state.outlineStrength === "medium" ? 0.8 : 0.45;
    app.style.setProperty("--text-outline-color", outlineColor);
    app.style.setProperty("--text-outline-size", outlineSize + "px");
    app.setAttribute("data-text-outline", state.textOutline);
    var tg = telegram();
    if (tg && inside(tg)) {
      try {
        tg.ready();
        tg.expand();
        var bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
        if (bg && tg.setHeaderColor) tg.setHeaderColor(bg);
        if (bg && tg.setBackgroundColor) tg.setBackgroundColor(bg);
      } catch (err) { /* optional */ }
    }
  }

  function setInput(id, value) {
    var el = $(id);
    if (!el || document.activeElement === el) return;
    if (el.value !== value) el.value = value;
  }

  function showError(id, message) {
    var control = document.querySelector('[data-control="' + id + '"]');
    var error = document.querySelector('[data-for="' + id + '"]');
    if (control) control.classList.toggle("is-invalid", Boolean(message));
    if (error) error.textContent = message || "";
  }

  function periodLabel(key) {
    if (key === "week") return t("weekly");
    if (key === "year") return t("annual");
    return t("monthRow");
  }
  function caption(key) {
    if (key === "week") return t("perWeek");
    if (key === "year") return t("perYear");
    return t("perMonth");
  }

  function resultNow() {
    var rate = M.parseField(state.hourlyRate, { max: M.MAX_MONEY, lang: state.lang });
    var hours = M.parseField(state.hours, { max: 168, tooBig: "hours", lang: state.lang });
    var salary = M.parseField(state.salary, { max: M.MAX_MONEY, lang: state.lang });
    var tax = M.parseField(state.tax, { max: 100, tooBig: "tax", lang: state.lang });
    var errors = {};
    if (state.mode === "hourly") {
      if (!rate.ok) errors["hourly-rate"] = errorText(rate.error);
      if (!hours.ok) errors["hours-week"] = errorText(hours.error);
    } else if (!salary.ok) errors["monthly-salary"] = errorText(salary.error);
    if (!tax.ok) errors["tax-rate"] = errorText(tax.error);
    var hasInput = state.mode === "hourly"
      ? state.hourlyRate.trim() || state.hours.trim() || state.tax.trim()
      : state.salary.trim() || state.tax.trim();
    var result = null;
    if (!Object.keys(errors).length) {
      result = M.compute({
        mode: state.mode,
        rate: rate.value,
        hours: hours.value,
        salary: salary.value,
        taxPct: tax.value,
      });
    }
    return { errors: errors, result: hasInput ? result : null };
  }

  function i18n() {
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var key = node.getAttribute("data-i18n");
      var attr = node.getAttribute("data-i18n-attr");
      if (attr) node.setAttribute(attr, t(key));
      else node.textContent = t(key);
    }
    var langs = document.querySelectorAll("#lang-switch button");
    for (var j = 0; j < langs.length; j += 1) {
      langs[j].setAttribute("aria-checked", langs[j].getAttribute("data-lang") === state.lang ? "true" : "false");
    }
    $("theme-label").textContent = state.theme === "dark" ? t("themeDark") : t("themeLight");
    $("theme-toggle").setAttribute("aria-label", state.theme === "dark" ? t("themeToLight") : t("themeToDark"));
    $("theme-icon").innerHTML = state.theme === "dark"
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>';
    $("app-title").textContent = name();
    var suffix = M.SYMBOLS[state.currency];
    var marks = document.querySelectorAll(".currency-suffix");
    for (var k = 0; k < marks.length; k += 1) marks[k].textContent = suffix;
    var currencies = document.querySelectorAll("#currency-switch button");
    for (var c = 0; c < currencies.length; c += 1) {
      currencies[c].setAttribute("aria-checked", currencies[c].getAttribute("data-currency") === state.currency ? "true" : "false");
    }
    var modes = document.querySelectorAll("#mode-switch button");
    for (var m = 0; m < modes.length; m += 1) {
      var on = modes[m].getAttribute("data-mode") === state.mode;
      modes[m].setAttribute("aria-selected", on ? "true" : "false");
    }
    $("panel-hourly").hidden = state.mode !== "hourly";
    $("panel-monthly").hidden = state.mode !== "monthly";
    var periods = document.querySelectorAll("#period-switch button");
    for (var p = 0; p < periods.length; p += 1) {
      periods[p].setAttribute("aria-checked", periods[p].getAttribute("data-period") === state.period ? "true" : "false");
    }
    var tabs = document.querySelectorAll("#dock button");
    for (var n = 0; n < tabs.length; n += 1) {
      var current = tabs[n].getAttribute("data-tab") === state.tab;
      if (current) tabs[n].setAttribute("aria-current", "page");
      else tabs[n].removeAttribute("aria-current");
    }
    $("view-calc").hidden = state.tab !== "calc";
    $("view-calendar").hidden = state.tab !== "calendar";
    $("view-history").hidden = state.tab !== "history";
    $("view-settings").hidden = state.tab !== "settings";
    var bgs = document.querySelectorAll("#bg-switch button");
    for (var b = 0; b < bgs.length; b += 1) {
      bgs[b].setAttribute("aria-checked", bgs[b].getAttribute("data-bg") === state.background ? "true" : "false");
    }
    $("bg-hint").textContent = state.background === "photo" ? t("bgPhotoHint") : state.background === "none" ? t("bgNoneHint") : t("bgDefaultHint");
    $("accent-label").textContent = state.accent || t("accentDefault");
    $("accent-color").value = state.accent || "#0d5c45";
    $("text-color-label").textContent = state.textColor || t("textDefault");
    $("text-color").value = state.textColor || (state.theme === "dark" ? "#f2f5f3" : "#202522");
    $("text-outline").value = state.textOutline;
    $("outline-strength").value = state.outlineStrength;
  }

  function paintCalc() {
    var calc = resultNow();
    showError("hourly-rate", calc.errors["hourly-rate"] || "");
    showError("hours-week", calc.errors["hours-week"] || "");
    showError("monthly-salary", calc.errors["monthly-salary"] || "");
    showError("tax-rate", calc.errors["tax-rate"] || "");
    var result = calc.result;
    var money = function (group, key) { return result ? M.formatMoney(result[group][key], state.currency, state.lang) : "—"; };
    $("net-hero").textContent = money("net", state.period);
    $("hero-period").textContent = caption(state.period);
    $("gross-now").textContent = money("gross", state.period);
    $("tax-now").textContent = money("tax", state.period);
    $("gross-cap").textContent = caption(state.period);
    $("tax-cap").textContent = caption(state.period);
    var others = ["week", "month", "year"].filter(function (key) { return key !== state.period; });
    $("hero-split").innerHTML = others.map(function (key) {
      return "<div><span>" + periodLabel(key) + "</span><strong class=\"num\">" + money("net", key) + "</strong></div>";
    }).join("");
    $("breakdown-list").innerHTML = ["week", "month", "year"].map(function (key) {
      return '<li class="break-row' + (key === state.period ? " is-focus" : "") + '"><p class="break-period">' + periodLabel(key) + '</p><div class="break-grid">' +
        ["gross", "tax", "net"].map(function (group) {
          var label = group === "gross" ? "grossShort" : group === "tax" ? "taxShort" : "netShort";
          return "<div><span>" + t(label) + "</span><strong class=\"num\">" + money(group, key) + "</strong></div>";
        }).join("") + "</div></li>";
    }).join("");
    $("save-calc").disabled = !result;
    $("copy-result").disabled = !result;
  }

  function paintCalendar() {
    var labels = [];
    var start = M.weekStartsOn(state.lang);
    var sunday = new Date(2024, 0, 7);
    var fmt = new Intl.DateTimeFormat(M.LOCALES[state.lang], { weekday: "short" });
    for (var i = 0; i < 7; i += 1) {
      var date = new Date(sunday);
      date.setDate(sunday.getDate() + ((start + i) % 7));
      labels.push("<span>" + fmt.format(date) + "</span>");
    }
    $("weekdays").innerHTML = labels.join("");
    $("month-title").textContent = new Intl.DateTimeFormat(M.LOCALES[state.lang], { month: "long", year: "numeric" }).format(new Date(cursor.y, cursor.m, 1));
    var byDate = {};
    state.entries.forEach(function (entry) { byDate[entry.date] = entry; });
    var today = M.todayISO();
    $("days").innerHTML = M.monthCells(cursor.y, cursor.m, start).map(function (iso) {
      if (!iso) return '<span class="day is-empty"></span>';
      var day = Number(iso.slice(-2));
      var cls = "day" + (iso === today ? " is-today" : "") + (byDate[iso] ? " has-entry" : "");
      var label = iso + ". " + (byDate[iso] ? t("openEntry") : t("addEntry"));
      return '<button type="button" class="' + cls + '" data-date="' + iso + '" aria-label="' + label + '">' + day + (byDate[iso] ? '<i class="dot"></i>' : "") + "</button>";
    }).join("");
    var monthKey = cursor.y + "-" + String(cursor.m + 1).padStart(2, "0");
    var rows = state.entries.filter(function (entry) { return entry.date.indexOf(monthKey) === 0; });
    var html = "";
    if (!rows.length) html += '<p class="lead">' + t("noEntriesMonth") + "</p>";
    var groups = {};
    var order = [];
    if (!rows.length) {
      groups[state.currency] = { currency: state.currency, hours: 0, gross: 0, tax: 0, net: 0 };
      order.push(state.currency);
    }
    rows.forEach(function (entry) {
      if (!groups[entry.currency]) {
        groups[entry.currency] = { currency: entry.currency, hours: 0, gross: 0, tax: 0, net: 0 };
        order.push(entry.currency);
      }
      groups[entry.currency].hours += entry.hours;
      groups[entry.currency].gross += entry.gross;
      groups[entry.currency].tax += entry.tax;
      groups[entry.currency].net += entry.net;
    });
    if (order.length > 1) html += '<p class="summary-note">' + t("mixedTotals") + "</p>";
    order.forEach(function (code) {
      var group = groups[code];
      html += '<div class="currency-block">' + (order.length > 1 ? '<p class="currency-kicker">' + code + "</p>" : "") +
        '<div class="summary-grid"><div><span>' + t("totalHours") + "</span><strong>" + M.formatHours(group.hours, state.lang) + "</strong></div>" +
        "<div><span>" + t("grossShort") + '</span><strong class="num">' + M.formatMoney(group.gross, code, state.lang) + "</strong></div>" +
        "<div><span>" + t("taxShort") + '</span><strong class="num">' + M.formatMoney(group.tax, code, state.lang) + "</strong></div>" +
        "<div><span>" + t("netShort") + '</span><strong class="num">' + M.formatMoney(group.net, code, state.lang) + "</strong></div></div></div>";
    });
    $("month-summary").innerHTML = html;
  }

  function paintHistory() {
    var sorted = state.entries.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    $("history-empty").hidden = sorted.length > 0;
    var fmt = new Intl.DateTimeFormat(M.LOCALES[state.lang], { day: "numeric", month: "short", year: "numeric" });
    $("history-list").innerHTML = sorted.map(function (entry) {
      var date = entry.date.split("-");
      var label = fmt.format(new Date(Number(date[0]), Number(date[1]) - 1, Number(date[2])));
      return '<li><button type="button" class="history-item" data-id="' + entry.id + '" data-date="' + entry.date + '"><span><strong>' + label + "</strong><em>" +
        M.formatHours(entry.hours, state.lang) + " " + t("hoursSuffix") + " · " + entry.currency + '</em></span><strong class="num">' +
        M.formatMoney(entry.net, entry.currency, state.lang) + "</strong>" +
        (entry.note ? '<span class="history-note">' + escapeHtml(entry.note) + "</span>" : "") + "</button></li>";
    }).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;")
      .replace(/'/g, "\u0026#39;");
  }

  function paintSwatches() {
    var presets = [
      { value: "", swatch: "#0d5c45", label: t("accentDefault") },
      { value: "#1f4e89", swatch: "#1f4e89", label: "#1f4e89" },
      { value: "#8a5a32", swatch: "#8a5a32", label: "#8a5a32" },
      { value: "#7a3142", swatch: "#7a3142", label: "#7a3142" },
      { value: "#24312c", swatch: "#24312c", label: "#24312c" },
    ];
    $("swatches").innerHTML = presets.map(function (preset) {
      var selected = (state.accent || "") === preset.value;
      return '<button type="button" class="swatch" role="radio" aria-checked="' + (selected ? "true" : "false") + '" aria-label="' + preset.label + '" data-accent="' + preset.value + '" style="background:' + preset.swatch + '"></button>';
    }).join("");
  }

  function render() {
    applyChrome();
    i18n();
    setInput("hourly-rate", state.hourlyRate);
    setInput("hours-week", state.hours);
    setInput("monthly-salary", state.salary);
    setInput("tax-rate", state.tax);
    setInput("app-name", state.appName);
    paintCalc();
    if (state.tab === "calendar") paintCalendar();
    if (state.tab === "history") paintHistory();
    if (state.tab === "settings") paintSwatches();
    if (draft) paintDialog();
    persist();
  }

  function entriesForDate(date) {
    return state.entries.filter(function (entry) { return entry.date === date; }).sort(function (a, b) {
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
  }

  function findEntry(date) {
    return entriesForDate(date)[0] || null;
  }

  function findEntryById(id) {
    return state.entries.filter(function (entry) { return entry.id === id; })[0] || null;
  }

  function seed() {
    var calc = resultNow();
    if (!calc.result) return { gross: "", tax: "", net: "", hours: "", note: "", currency: state.currency };
    return {
      gross: M.plainAmount(calc.result.gross[state.period]),
      tax: M.plainAmount(calc.result.tax[state.period]),
      net: M.plainAmount(calc.result.net[state.period]),
      hours: state.mode === "hourly" ? state.hours.trim() : "",
      note: "",
      currency: state.currency,
    };
  }

  var selectedDay = null;

  function openDay(date) {
    var entries = entriesForDate(date);
    if (!entries.length) { openCreate(date); return; }
    selectedDay = date;
    var parts = date.split("-");
    var displayDate = new Intl.DateTimeFormat(M.LOCALES[state.lang], { day: "numeric", month: "long", year: "numeric" }).format(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    $("day-sheet-title").textContent = displayDate;
    $("day-sheet-count").textContent = t("entriesCount").replace("{count}", String(entries.length));
    $("day-entry-list").innerHTML = entries.map(function (entry) {
      return '<button type="button" class="day-entry" data-id="' + entry.id + '"><span><strong class="num">' + M.formatMoney(entry.net, entry.currency, state.lang) + '</strong><em>' + M.formatHours(entry.hours, state.lang) + ' ' + t("hoursSuffix") + ' · ' + entry.currency + '</em></span>' + (entry.note ? '<span class="day-entry-note">' + escapeHtml(entry.note) + '</span>' : '') + '</button>';
    }).join("");
    var sheet = $("day-sheet");
    if (!sheet.open) sheet.showModal();
  }

  function closeDaySheet() {
    selectedDay = null;
    var sheet = $("day-sheet");
    if (sheet.open) sheet.close();
  }

  function openCreate(date) {
    var existing = findEntry(date);
    var seeded = seed();
    if (existing && !seeded.gross && !seeded.hours) {
      openExisting(existing);
      return;
    }
    draft = {
      id: null,
      originDate: null,
      followPeriod: seeded.gross || seeded.hours ? state.period : null,
      date: date,
      gross: seeded.gross,
      tax: seeded.tax,
      net: seeded.net,
      hours: seeded.hours,
      note: "",
      currency: seeded.currency,
    };
    confirming = false;
    fillDialog();
    showSheet();
  }

  function openExisting(entry) {
    draft = {
      id: entry.id,
      originDate: entry.date,
      followPeriod: null,
      date: entry.date,
      gross: M.plainAmount(entry.gross),
      tax: M.plainAmount(entry.tax),
      net: M.plainAmount(entry.net),
      hours: String(Math.round(entry.hours * 100) / 100),
      note: entry.note,
      currency: entry.currency,
    };
    confirming = false;
    fillDialog();
    showSheet();
  }

  function showSheet() {
    var sheet = $("sheet");
    if (!sheet.open) sheet.showModal();
    paintDialog();
  }

  function closeSheet() {
    draft = null;
    confirming = false;
    var sheet = $("sheet");
    if (sheet.open) sheet.close();
  }

  function fillDialog() {
    $("entry-date").value = draft.date;
    $("entry-gross").value = draft.gross;
    $("entry-tax").value = draft.tax;
    $("entry-net").value = draft.net;
    $("entry-hours").value = draft.hours;
    $("entry-note").value = draft.note;
  }

  function readDraft() {
    draft.date = $("entry-date").value;
    draft.gross = $("entry-gross").value;
    draft.tax = $("entry-tax").value;
    draft.net = $("entry-net").value;
    draft.hours = $("entry-hours").value;
    draft.note = $("entry-note").value;
  }

  function paintDialog() {
    if (!draft) return;
    var isUpdate = Boolean(draft.id);
    $("entry-title").textContent = isUpdate && draft.originDate ? t("editEntry") : t("newEntry");
    $("replace-warning").hidden = true;
    $("amounts-follow").hidden = !draft.followPeriod;
    $("amounts-follow").textContent = t("amountsFollow").replace("{period}", I.periodWord(state.lang, draft.followPeriod || "month"));
    var symbol = M.SYMBOLS[draft.currency] || "$";
    $("entry-symbol").textContent = symbol;
    var symbols = document.querySelectorAll(".entry-symbol");
    for (var i = 0; i < symbols.length; i += 1) symbols[i].textContent = symbol;
    var actions = "";
    if (confirming) {
      actions = '<p class="banner">' + t("deleteAsk") + '</p><button type="button" class="btn btn-primary" id="confirm-delete">' + t("delete") + '</button><button type="button" class="btn btn-line" id="cancel-delete">' + t("cancel") + "</button>";
    } else {
      actions = '<button type="submit" class="btn btn-primary">' + (isUpdate ? t("update") : t("save")) + '</button><button type="button" class="btn btn-line" id="cancel-sheet">' + t("cancel") + "</button>";
      if (draft.originDate) actions += '<button type="button" class="btn btn-danger" id="ask-delete">' + t("delete") + "</button>";
    }
    $("sheet-actions").innerHTML = actions;
  }

  function saveDraft(event) {
    event.preventDefault();
    readDraft();
    var fields = {
      "entry-date": M.isISODate(draft.date) ? { ok: true } : { ok: false, error: "invalid" },
      "entry-gross": M.parseField(draft.gross, { lang: state.lang, max: M.MAX_MONEY }),
      "entry-tax": M.parseField(draft.tax, { lang: state.lang, max: M.MAX_MONEY }),
      "entry-net": M.parseField(draft.net, { lang: state.lang, max: M.MAX_MONEY }),
      "entry-hours": M.parseField(draft.hours, { lang: state.lang, max: 100000 }),
    };
    var bad = false;
    Object.keys(fields).forEach(function (id) {
      var parsed = fields[id];
      var message = parsed.ok ? "" : errorText(parsed.error || "invalid");
      showError(id, message);
      if (message) bad = true;
    });
    if (bad) return;
    var previous = draft.id ? findEntryById(draft.id) : null;
    var stamp = new Date().toISOString();
    var entry = {
      id: (previous && previous.id) || draft.id || uid(),
      date: draft.date,
      gross: fields["entry-gross"].value,
      tax: fields["entry-tax"].value,
      net: fields["entry-net"].value,
      hours: fields["entry-hours"].value,
      note: draft.note.trim().slice(0, 500),
      currency: draft.currency,
      createdAt: (previous && previous.createdAt) || stamp,
      updatedAt: stamp,
    };
    state.entries = state.entries.filter(function (item) {
      return item.id !== entry.id;
    }).concat([entry]);
    closeSheet();
    render();
  }

  function removeDraft() {
    state.entries = state.entries.filter(function (item) {
      return item.id !== draft.id;
    });
    closeSheet();
    render();
  }

  function legacyCopy(text) {
    try {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      var ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  function copyResult() {
    var calc = resultNow();
    if (!calc.result) return;
    var block = function (label, key) {
      return [label, t("gross") + ": " + M.formatMoney(calc.result.gross[key], state.currency, state.lang), t("taxes") + ": " + M.formatMoney(calc.result.tax[key], state.currency, state.lang), t("net") + ": " + M.formatMoney(calc.result.net[key], state.currency, state.lang)].join("\n");
    };
    var text = [name(), state.currency + " · " + (state.mode === "hourly" ? t("hourly") : t("monthly")), "", block(t("weekly"), "week"), "", block(t("monthRow"), "month"), "", block(t("annual"), "year")].join("\n");
    var finish = function (ok) {
      $("live").textContent = ok ? t("copied") : t("copyFailed");
      $("copy-failed").hidden = ok;
      $("copy-failed").textContent = t("copyFailed");
      if (ok) {
        $("copy-result").textContent = t("copied");
        window.setTimeout(function () { $("copy-result").textContent = t("copyResult"); }, 1800);
      }
    };
    if (legacyCopy(text)) { finish(true); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { finish(true); }, function () { finish(false); });
      return;
    }
    finish(false);
  }

  function bindTelegram() {
    var tg = telegram();
    if (!tg || !inside(tg)) return;
    if (!manual && (tg.colorScheme === "dark" || tg.colorScheme === "light")) state.theme = tg.colorScheme;
    if (tg.onEvent) {
      tg.onEvent("themeChanged", function () {
        if (manual) return;
        if (tg.colorScheme === "dark" || tg.colorScheme === "light") {
          state.theme = tg.colorScheme;
          render();
        }
      });
    }
    render();
  }

  function boot() {
    if (!state.themePref) state.theme = systemTheme();
    var box = $("currency-switch");
    box.innerHTML = M.CURRENCIES.map(function (code) {
      var label = code === "CHF" || code === "AED" ? code : M.SYMBOLS[code] + " " + code;
      return '<button type="button" role="radio" data-currency="' + code + '">' + label + "</button>";
    }).join("");
    render();
    ["hourly-rate", "hours-week", "monthly-salary", "tax-rate", "app-name"].forEach(function (id) {
      $(id).addEventListener("input", function (event) {
        var map = { "hourly-rate": "hourlyRate", "hours-week": "hours", "monthly-salary": "salary", "tax-rate": "tax", "app-name": "appName" };
        state[map[id]] = event.target.value;
        render();
      });
    });
    $("lang-switch").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      state.lang = btn.getAttribute("data-lang");
      render();
    });
    $("currency-switch").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      state.currency = btn.getAttribute("data-currency");
      render();
    });
    $("mode-switch").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      state.mode = btn.getAttribute("data-mode");
      render();
    });
    $("period-switch").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      state.period = btn.getAttribute("data-period");
      render();
    });
    $("theme-toggle").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      state.themePref = state.theme;
      manual = true;
      render();
    });
    $("reset").addEventListener("click", function () {
      state.hourlyRate = "";
      state.hours = "";
      state.salary = "";
      state.tax = "";
      render();
    });
    $("save-calc").addEventListener("click", function () { openCreate(M.todayISO()); });
    $("copy-result").addEventListener("click", copyResult);
    $("dock").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      state.tab = btn.getAttribute("data-tab");
      render();
    });
    $("prev-month").addEventListener("click", function () {
      var date = new Date(cursor.y, cursor.m - 1, 1);
      cursor = { y: date.getFullYear(), m: date.getMonth() };
      render();
    });
    $("next-month").addEventListener("click", function () {
      var date = new Date(cursor.y, cursor.m + 1, 1);
      cursor = { y: date.getFullYear(), m: date.getMonth() };
      render();
    });
    $("days").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      var date = btn.getAttribute("data-date");
      var entries = entriesForDate(date);
      if (entries.length) openDay(date);
      else openCreate(date);
    });
    $("history-list").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      var existing = findEntryById(btn.getAttribute("data-id"));
      if (existing) openExisting(existing);
    });
    $("day-sheet-close").addEventListener("click", closeDaySheet);
    $("day-sheet").addEventListener("click", function (event) { if (event.target === $("day-sheet")) closeDaySheet(); });
    $("day-entry-list").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      var existing = findEntryById(btn.getAttribute("data-id"));
      closeDaySheet();
      if (existing) openExisting(existing);
    });
    $("day-add-entry").addEventListener("click", function () {
      var date = selectedDay;
      closeDaySheet();
      if (date) openCreate(date);
    });
    $("bg-switch").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      state.background = btn.getAttribute("data-bg");
      render();
    });
    $("swatches").addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      state.accent = btn.getAttribute("data-accent") || null;
      render();
    });
    $("accent-color").addEventListener("input", function (event) {
      state.accent = event.target.value;
      render();
    });
    $("text-color").addEventListener("input", function (event) {
      state.textColor = event.target.value;
      render();
    });
    $("text-outline").addEventListener("change", function (event) {
      state.textOutline = event.target.value;
      render();
    });
    $("outline-strength").addEventListener("change", function (event) {
      state.outlineStrength = event.target.value;
      render();
    });
    $("reset-appearance").addEventListener("click", function () {
      state.accent = null; state.textColor = null; state.textOutline = "none"; state.outlineStrength = "thin";
      render();
    });
    $("entry-form").addEventListener("submit", saveDraft);
    $("entry-gross").addEventListener("input", syncNet);
    $("entry-tax").addEventListener("input", syncNet);
    $("sheet-close").addEventListener("click", closeSheet);
    $("sheet").addEventListener("click", function (event) { if (event.target === $("sheet")) closeSheet(); });
    $("sheet").addEventListener("close", function () { draft = null; confirming = false; });
    $("sheet-actions").addEventListener("click", function (event) {
      var id = event.target.id;
      if (id === "cancel-sheet") closeSheet();
      if (id === "ask-delete") { confirming = true; paintDialog(); }
      if (id === "cancel-delete") { confirming = false; paintDialog(); }
      if (id === "confirm-delete") removeDraft();
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if (!manual) { state.theme = systemTheme(); render(); }
    });
    if (telegram()) bindTelegram();
    else {
      var hinted = /tgWebApp/i.test(String(location.hash || "") + String(location.search || "")) || window.TelegramWebviewProxy || window.TelegramWebviewProxyProto;
      if (hinted) {
        var script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-web-app.js";
        script.async = true;
        script.onload = bindTelegram;
        document.head.appendChild(script);
      }
    }
  }

  function syncNet() {
    var gross = M.parseField($("entry-gross").value, { lang: state.lang, max: M.MAX_MONEY });
    var tax = M.parseField($("entry-tax").value, { lang: state.lang, max: M.MAX_MONEY });
    if (gross.ok && tax.ok) $("entry-net").value = M.plainAmount(gross.value - tax.value);
  }

  load();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
