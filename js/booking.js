/* booking.js — форма брони.
   По умолчанию режим «заглушка»: заявка сохраняется в этом браузере
   и появляется на странице zakazy.html. Ничего никуда не отправляется.
   Режим "webhook" в js/config.js включает отправку на свой адрес. */
(function (global) {
  "use strict";

  var form = document.getElementById("booking-form");
  if (!form) return;

  var SITE = global.SITE || {};
  var Store = global.Store;
  var MIN_GAP_MS = 60 * 1000;           /* не чаще одной заявки в минуту */
  var LAST_KEY = "teply_ugol_last_request";
  var MAX_DAYS_AHEAD = 90;
  var busy = false;

  var els = {
    name: document.getElementById("booking-name"),
    phone: document.getElementById("booking-phone"),
    date: document.getElementById("booking-date"),
    time: document.getElementById("booking-time"),
    guests: document.getElementById("booking-guests"),
    comment: document.getElementById("booking-comment"),
    consent: document.getElementById("booking-consent"),
    trap: document.getElementById("booking-company"),
    submit: document.getElementById("booking-submit"),
    status: document.getElementById("booking-status"),
    success: document.getElementById("booking-success"),
    successId: document.getElementById("success-id"),
    summary: document.getElementById("success-summary"),
    warning: document.getElementById("success-warning"),
    tg: document.getElementById("tg-preview"),
    again: document.getElementById("booking-again"),
    demoNotice: document.getElementById("booking-demo-notice")
  };

  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  /* ---------------------------- вспомогательное --------------------------- */

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function formatDateRu(iso) {
    var parts = String(iso || "").split("-");
    if (parts.length !== 3) return iso || "";
    var day = Number(parts[2]);
    var month = MONTHS[Number(parts[1]) - 1];
    return month ? day + " " + month : iso;
  }

  function plural(n, one, few, many) {
    var num = Math.abs(Number(n));
    var mod10 = num % 10;
    var mod100 = num % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function guestsLabel(value) {
    if (value === "8+") return "8 и больше";
    var n = Number(value);
    if (!n) return "не указано";
    return n + " " + plural(n, "гость", "гостя", "гостей");
  }

  function maskPhone(value) {
    var digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.charAt(0) === "8") digits = "7" + digits.slice(1);
    if (digits.charAt(0) !== "7") digits = "7" + digits;
    digits = digits.slice(0, 11);

    var out = "+7";
    if (digits.length > 1) out += " (" + digits.slice(1, 4);
    if (digits.length >= 4) out += ") " + digits.slice(4, 7);
    if (digits.length >= 7) out += "-" + digits.slice(7, 9);
    if (digits.length >= 9) out += "-" + digits.slice(9, 11);
    return out;
  }

  function setStatus(message) {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.hidden = !message;
  }

  /* ------------------------------ проверки -------------------------------- */

  var validators = {
    name: function (value) {
      var v = String(value || "").trim();
      if (!v) return "Напишите, как к вам обращаться";
      if (v.length < 2) return "Слишком коротко — нужно хотя бы две буквы";
      if (v.length > 40) return "Слишком длинно — сократите до 40 знаков";
      if (!/^[А-Яа-яЁёA-Za-z\s-]+$/.test(v)) return "В имени можно использовать только буквы, пробел и дефис";
      return "";
    },
    phone: function (value) {
      var digits = String(value || "").replace(/\D/g, "");
      if (!digits) return "Напишите номер телефона, чтобы мы могли перезвонить";
      if (digits.length !== 11 || digits.charAt(0) !== "7") {
        return "Нужен номер из 11 цифр, например +7 (900) 123-45-67";
      }
      return "";
    },
    date: function (value) {
      if (!value) return "Выберите дату";
      var chosen = new Date(value + "T00:00:00");
      if (isNaN(chosen.getTime())) return "Дата непонятна — выберите её в календаре";
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      if (chosen < today) return "Эта дата уже прошла — выберите сегодняшнюю или позже";
      var max = new Date(today.getTime() + MAX_DAYS_AHEAD * 86400000);
      if (chosen > max) return "Брони принимаем на 90 дней вперёд";
      return "";
    },
    time: function (value) {
      if (!value) return "Выберите время";
      var match = /^(\d{1,2}):(\d{2})$/.exec(String(value));
      if (!match) return "Время непонятно — выберите его в списке";
      var minutes = Number(match[1]) * 60 + Number(match[2]);
      if (minutes < 8 * 60) return "Мы открываемся в 8:00 — выберите время позже";
      if (minutes > 21 * 60) return "Последняя бронь — в 21:00, чтобы вы успели спокойно посидеть";
      return "";
    },
    guests: function (value) {
      if (!value) return "Укажите, сколько вас будет";
      return "";
    },
    comment: function (value) {
      if (String(value || "").length > 300) return "Слишком длинный комментарий — до 300 знаков";
      return "";
    },
    consent: function (checked) {
      if (!checked) return "Без согласия на обработку данных мы не можем принять заявку";
      return "";
    }
  };

  function fieldWrap(name) {
    return form.querySelector('[data-field="' + name + '"]');
  }

  function showError(name, message) {
    var wrap = fieldWrap(name);
    if (!wrap) return;
    var control = wrap.querySelector("input, select, textarea");
    var error = wrap.querySelector(".field-error");
    if (message) {
      wrap.classList.add("is-invalid");
      if (control) control.setAttribute("aria-invalid", "true");
      if (error) {
        error.textContent = message;
        error.hidden = false;
      }
    } else {
      wrap.classList.remove("is-invalid");
      if (control) control.removeAttribute("aria-invalid");
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }
    }
  }

  function readValues() {
    return {
      name: String(els.name && els.name.value || "").trim().replace(/\s+/g, " "),
      phone: maskPhone(els.phone && els.phone.value),
      date: String(els.date && els.date.value || ""),
      time: String(els.time && els.time.value || ""),
      guests: String(els.guests && els.guests.value || ""),
      comment: String(els.comment && els.comment.value || "").trim(),
      consent: Boolean(els.consent && els.consent.checked)
    };
  }

  function toggleBusy(state) {
    busy = state;
    if (!els.submit) return;
    els.submit.disabled = state;
    els.submit.textContent = state ? "Отправляем…" : "Забронировать столик";
  }

  /* ------------------------------- отправка ------------------------------- */

  function buildTelegramText(request) {
    var lines = [
      "☕ Новая заявка № " + request.id,
      "Имя: " + request.name,
      "Телефон: " + request.phone,
      "Когда: " + formatDateRu(request.date) + ", " + request.time,
      "Гостей: " + guestsLabel(request.guests),
      "Комментарий: " + (request.comment || "—"),
      "Источник: сайт"
    ];
    return lines.join("\n");
  }

  function fillSummary(request) {
    if (!els.summary) return;
    var rows = [
      ["Имя", request.name],
      ["Телефон", request.phone],
      ["Когда", formatDateRu(request.date) + ", " + request.time],
      ["Гостей", guestsLabel(request.guests)]
    ];
    if (request.comment) rows.push(["Пожелание", request.comment]);

    els.summary.innerHTML = "";
    rows.forEach(function (row) {
      var div = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = row[0];
      dd.textContent = row[1];
      div.appendChild(dt);
      div.appendChild(dd);
      els.summary.appendChild(div);
    });
  }

  function showSuccess(request, warning) {
    if (els.successId) els.successId.textContent = String(request.id);
    fillSummary(request);

    if (els.tg) els.tg.textContent = buildTelegramText(request);

    /* Демо-пояснения управляются и режимом, и пометками из js/config.js.
       main.js уже мог скрыть их — здесь важно их не вернуть обратно. */
    var marks = SITE.marks || {};
    var isDemo = SITE.mode === "demo";

    if (els.demoNotice) {
      els.demoNotice.hidden = !isDemo || marks.demoNotice === false;
    }

    /* Ссылка на журнал заявок — только в демо и только если пометка включена */
    var journal = document.getElementById("success-journal");
    if (journal) journal.hidden = !isDemo || marks.demoJournal === false;

    if (els.warning) {
      if (warning) {
        els.warning.textContent = warning;
        els.warning.hidden = false;
      } else {
        els.warning.textContent = "";
        els.warning.hidden = true;
      }
    }

    if (els.status) {
      els.status.hidden = true;
      els.status.textContent = "";
    }

    form.hidden = true;
    if (els.success) {
      els.success.hidden = false;
      try { els.success.focus({ preventScroll: true }); } catch (e) { els.success.focus(); }
      els.success.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function saveRequest(request) {
    if (!Store) return false;
    return Store.addRequest(request);
  }

  function submitRequest(values) {
    var request = {
      id: Store ? Store.nextId() : 128,
      created: new Date().toISOString(),
      name: values.name,
      phone: values.phone,
      date: values.date,
      time: values.time,
      guests: values.guests,
      comment: values.comment,
      status: "новая",
      source: "сайт"
    };

    var useWebhook = SITE.bookingChannel === "webhook" && SITE.webhookUrl;
    toggleBusy(true);
    setStatus("");

    function finish(warning) {
      var saved = saveRequest(request);
      if (Store) Store.set(LAST_KEY, Date.now());
      toggleBusy(false);

      if (!saved && !warning) {
        warning = "Заявка не сохранилась в браузере. Позвоните нам, пожалуйста: " + (SITE.phone || "");
      }
      showSuccess(request, warning);
      if (typeof global.goal === "function") global.goal("booking_send");
    }

    if (useWebhook) {
      /* Боевой режим: заявка уходит на свой адрес. Ошибку показываем честно. */
      fetch(SITE.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      }).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        finish("");
      }).catch(function () {
        finish("Заявка сохранена на этом устройстве, но уведомление владельцу не ушло. " +
          "Позвоните, пожалуйста: " + (SITE.phone || "") + " — так мы точно её увидим.");
      });
    } else {
      /* Демонстрация: короткая пауза, чтобы было похоже на настоящую отправку. */
      global.setTimeout(function () { finish(""); }, 350);
    }
  }

  /* -------------------------------- события ------------------------------- */

  if (els.date) {
    els.date.min = todayIso();
  }

  if (els.phone) {
    els.phone.addEventListener("input", function () {
      var masked = maskPhone(els.phone.value);
      if (masked !== els.phone.value) els.phone.value = masked;
      if (fieldWrap("phone") && fieldWrap("phone").classList.contains("is-invalid")) {
        showError("phone", validators.phone(els.phone.value));
      }
    });
    els.phone.addEventListener("blur", function () {
      showError("phone", validators.phone(els.phone.value));
    });
  }

  ["name", "date", "time", "guests"].forEach(function (name) {
    var control = els[name];
    if (!control) return;
    control.addEventListener("blur", function () {
      showError(name, validators[name](control.value));
    });
    control.addEventListener("input", function () {
      var wrap = fieldWrap(name);
      if (wrap && wrap.classList.contains("is-invalid")) {
        showError(name, validators[name](control.value));
      }
    });
  });

  if (els.consent) {
    els.consent.addEventListener("change", function () {
      showError("consent", validators.consent(els.consent.checked));
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy) return;

    setStatus("");

    /* Поле-ловушка: человек его не видит и не заполняет. */
    if (els.trap && els.trap.value) {
      setStatus("Заявка не принята. Обновите страницу и попробуйте снова.");
      return;
    }

    var values = readValues();
    var order = ["name", "phone", "date", "time", "guests", "comment", "consent"];
    var firstInvalid = null;

    order.forEach(function (name) {
      var message = validators[name](values[name]);
      showError(name, message);
      if (message && !firstInvalid) firstInvalid = name;
    });

    if (firstInvalid) {
      var wrap = fieldWrap(firstInvalid);
      var control = wrap && wrap.querySelector("input, select, textarea");
      if (control) control.focus();
      setStatus("Проверьте отмеченные поля — там не хватает данных.");
      return;
    }

    var last = Store ? Number(Store.get(LAST_KEY, 0)) || 0 : 0;
    var wait = MIN_GAP_MS - (Date.now() - last);
    if (wait > 0) {
      setStatus("Вы уже отправляли заявку меньше минуты назад. Подождите " +
        Math.ceil(wait / 1000) + " сек. и попробуйте ещё раз. " +
        "Если нужно срочно — позвоните: " + (SITE.phone || ""));
      return;
    }

    submitRequest(values);
  });

  if (els.again) {
    els.again.addEventListener("click", function () {
      form.reset();
      ["name", "phone", "date", "time", "guests", "comment", "consent"].forEach(function (name) {
        showError(name, "");
      });
      if (els.date) els.date.min = todayIso();
      if (els.success) els.success.hidden = true;
      form.hidden = false;
      setStatus("");
      if (els.name) els.name.focus();
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
})(window);
