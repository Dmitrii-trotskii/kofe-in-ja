/* zakazy.js — журнал заявок: таблица, статусы, экспорт в CSV, очистка.
   Всё работает без интернета: данные лежат в памяти браузера. */
(function (global) {
  "use strict";

  /* Если пароль не подошёл, страница уже показала заглушку. Ничего не делаем. */
  if (global.__serviceDenied) return;

  var Store = global.Store;
  var STATUSES = [
    { value: "новая", label: "Новая" },
    { value: "подтверждена", label: "Подтверждена" },
    { value: "отменена", label: "Отменена" }
  ];

  var els = {
    body: document.getElementById("requests-body"),
    tableWrap: document.getElementById("table-wrap"),
    empty: document.getElementById("empty-state"),
    total: document.getElementById("stat-total"),
    fresh: document.getElementById("stat-new"),
    confirmed: document.getElementById("stat-confirmed"),
    cancelled: document.getElementById("stat-cancelled"),
    exportButton: document.getElementById("export-csv"),
    clearButton: document.getElementById("clear-all"),
    storageNote: document.getElementById("storage-note")
  };

  if (!Store) return;

  if (!Store.available && els.storageNote) {
    els.storageNote.hidden = false;
  }

  /* ------------------------------ форматирование -------------------------- */

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function formatMoment(iso) {
    if (!iso) return "—";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return String(iso);
    return pad(date.getDate()) + "." + pad(date.getMonth() + 1) + "." + date.getFullYear() +
      ", " + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function formatIsoDate(iso) {
    if (!iso) return "—";
    var parts = String(iso).split("-");
    if (parts.length !== 3) return String(iso);
    return parts[2] + "." + parts[1] + "." + parts[0];
  }

  function plural(n, one, few, many) {
    var num = Math.abs(Number(n));
    var mod10 = num % 10;
    var mod100 = num % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function guestsText(value) {
    if (value === "8+") return "8+";
    var n = Number(value);
    if (!n) return "—";
    return n + " " + plural(n, "гость", "гостя", "гостей");
  }

  function sortedRequests() {
    var list = Store.getRequests().slice();
    list.sort(function (a, b) {
      var da = Date.parse(a && a.created) || 0;
      var db = Date.parse(b && b.created) || 0;
      if (da !== db) return db - da;
      return (Number(b && b.id) || 0) - (Number(a && a.id) || 0);
    });
    return list;
  }

  /* -------------------------------- таблица ------------------------------- */

  function cell(text, className) {
    var td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text;
    return td;
  }

  function statusCell(request) {
    var td = document.createElement("td");
    var select = document.createElement("select");
    select.className = "status-select";
    select.setAttribute("data-id", String(request.id));
    select.setAttribute("aria-label", "Статус заявки № " + request.id);

    var current = STATUSES.some(function (s) { return s.value === request.status; })
      ? request.status
      : "новая";
    select.setAttribute("data-status", current);

    STATUSES.forEach(function (status) {
      var option = document.createElement("option");
      option.value = status.value;
      option.textContent = status.label;
      if (status.value === current) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener("change", function () {
      Store.updateRequest(request.id, { status: select.value });
      select.setAttribute("data-status", select.value);
      updateStats();
    });

    td.appendChild(select);
    return td;
  }

  function row(request) {
    var tr = document.createElement("tr");

    tr.appendChild(cell(String(request.id || "—"), "cell-id"));
    tr.appendChild(cell(formatMoment(request.created), "cell-time"));
    tr.appendChild(cell(request.name || "—"));
    tr.appendChild(cell(request.phone || "—", "cell-phone"));
    tr.appendChild(cell(
      formatIsoDate(request.date) + (request.time ? ", " + request.time : ""),
      "cell-time"
    ));
    tr.appendChild(cell(guestsText(request.guests)));
    tr.appendChild(cell(request.comment || "—", "cell-comment"));
    tr.appendChild(statusCell(request));

    return tr;
  }

  function updateStats() {
    var list = Store.getRequests();
    var counts = { total: list.length, "новая": 0, "подтверждена": 0, "отменена": 0 };

    list.forEach(function (item) {
      if (counts[item.status] === undefined) counts["новая"] += 1;
      else counts[item.status] += 1;
    });

    if (els.total) els.total.textContent = String(counts.total);
    if (els.fresh) els.fresh.textContent = String(counts["новая"]);
    if (els.confirmed) els.confirmed.textContent = String(counts["подтверждена"]);
    if (els.cancelled) els.cancelled.textContent = String(counts["отменена"]);

    var hasRequests = counts.total > 0;
    if (els.tableWrap) els.tableWrap.hidden = !hasRequests;
    if (els.empty) els.empty.hidden = hasRequests;
    if (els.exportButton) els.exportButton.disabled = !hasRequests;
    if (els.clearButton) els.clearButton.disabled = !hasRequests;
  }

  function render() {
    if (!els.body) return;
    var list = sortedRequests();
    els.body.innerHTML = "";
    list.forEach(function (request) {
      els.body.appendChild(row(request));
    });
    updateStats();
  }

  /* ----------------------------- экспорт в CSV ---------------------------- */

  function csvValue(value) {
    var text = String(value === undefined || value === null ? "" : value);
    if (/[;"\n\r]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function buildCsv() {
    var head = ["Номер", "Заявка пришла", "Имя", "Телефон", "Дата брони", "Время", "Гостей", "Комментарий", "Статус", "Источник"];
    var lines = [head.join(";")];

    sortedRequests().forEach(function (item) {
      lines.push([
        item.id,
        formatMoment(item.created),
        item.name,
        item.phone,
        formatIsoDate(item.date),
        item.time,
        guestsText(item.guests),
        item.comment,
        item.status,
        item.source || "сайт"
      ].map(csvValue).join(";"));
    });

    return "\uFEFF" + lines.join("\r\n") + "\r\n";
  }

  function downloadCsv() {
    var text = buildCsv();
    var stamp = new Date();
    var name = "zayavki-" + stamp.getFullYear() + "-" + pad(stamp.getMonth() + 1) + "-" + pad(stamp.getDate()) + ".csv";
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" });

    if (global.navigator && global.navigator.msSaveOrOpenBlob) {
      global.navigator.msSaveOrOpenBlob(blob, name);
      return;
    }

    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* -------------------------------- события ------------------------------- */

  if (els.exportButton) {
    els.exportButton.addEventListener("click", downloadCsv);
  }

  if (els.clearButton) {
    els.clearButton.addEventListener("click", function () {
      var count = Store.getRequests().length;
      if (!count) return;
      if (!global.confirm("Удалить все заявки (" + count + ")? Это действие нельзя отменить.")) return;
      Store.clearRequests();
      render();
    });
  }

  /* Обновляем таблицу, если заявку отправили в другой вкладке этого же сайта. */
  global.addEventListener("storage", function (event) {
    if (event.key === Store.keys.requests) render();
  });

  render();
})(window);
