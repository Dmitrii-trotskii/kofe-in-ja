/* main.js — общая логика страницы:
   контакты из js/config.js, меню из data/menu.js, карта без кнопки,
   плашка cookie, счётчик-заготовка, разметка для поисковиков, цели-заглушки,
   пометки (marks), реквизиты в подвале (legal.type), видео в первом экране. */
(function (global) {
  "use strict";

  var SITE = global.SITE || {};
  var COOKIE_KEY = "teply_ugol_cookie_choice";
  var metrikaStarted = false;

  /* ------------------------------ помощники ------------------------------- */

  function get(path, fallback) {
    var parts = String(path).split(".");
    var current = SITE;
    for (var i = 0; i < parts.length; i++) {
      if (current === null || current === undefined) return fallback;
      current = current[parts[i]];
    }
    return (current === undefined || current === null) ? fallback : current;
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  var linkBuilders = {
    phone: function () {
      return "tel:" + String(get("phoneHref", "")).replace(/[^\d+]/g, "");
    },
    email: function () {
      return "mailto:" + get("email", "");
    },
    whatsapp: function () { return get("whatsapp", ""); },
    telegram: function () { return get("telegram", ""); },
    vk: function () { return get("vk", ""); },
    route: function () {
      var coords = get("coords", {});
      if (!coords || coords.lat === undefined) return "";
      return "https://yandex.ru/maps/?rtext=~" + coords.lat + "%2C" + coords.lon + "&rtt=auto";
    }
  };

  /* --------------------------- контакты из настроек ----------------------- */

  function applySiteValues() {
    var nodes = document.querySelectorAll("[data-site]");
    Array.prototype.forEach.call(nodes, function (node) {
      var key = node.getAttribute("data-site");
      var value = get(key, null);
      if (key === "bakeryLabel") {
        value = get("bakery", true) ? "кофейня и пекарня" : "кофейня";
      }
      if (value === null) return;

      if (node.hasAttribute("data-site-lines")) {
        var lines = Array.isArray(value)
          ? value
          : String(value).split("·").map(function (s) { return s.trim(); }).filter(Boolean);
        node.innerHTML = lines.map(esc).join("<br>");
      } else {
        node.textContent = String(value);
      }
    });

    var links = document.querySelectorAll("[data-site-link]");
    Array.prototype.forEach.call(links, function (node) {
      var key = node.getAttribute("data-site-link");
      var href = linkBuilders[key] ? linkBuilders[key]() : get(key, "");
      if (href) node.setAttribute("href", href);
    });
  }

  /* --------------------- пометки («демо» и прочие) ------------------------ */

  /* Элементы с data-mark прячутся, если в config.js у пометки стоит false.
     Место на странице не остаётся: hidden убирает элемент из потока. */
  function applyMarks() {
    var marks = get("marks", null);
    if (!marks || typeof marks !== "object") return;

    var nodes = document.querySelectorAll("[data-mark]");
    Array.prototype.forEach.call(nodes, function (node) {
      var key = node.getAttribute("data-mark");
      if (marks[key] === false) node.hidden = true;
    });

    /* Когда демо-плашка выключена, убираем демо-фразу и из описания страницы.
       В HTML фраза остаётся — на случай выключенных скриптов. */
    if (marks.demoBanner === false) {
      var meta = document.querySelector('meta[name="description"]');
      if (meta) {
        var phrase = "Демонстрационный макет, данные вымышлены.";
        var text = String(meta.getAttribute("content") || "");
        var index = text.indexOf(phrase);
        if (index !== -1) {
          text = (text.slice(0, index) + " " + text.slice(index + phrase.length))
            .replace(/\s+/g, " ").trim();
          meta.setAttribute("content", text);
        }
      }
      /* В заголовке страницы убираем пометку «(демо)» — она есть не на всех
         страницах, поэтому работаем через замену подстроки. */
      document.title = String(document.title || "").replace(/\s*\(демо\)/gi, "");
    }
  }

  /* ------------------------------ реквизиты ------------------------------- */

  function legalRow(label, value, href) {
    var row = document.createElement("div");
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    if (href) {
      var link = document.createElement("a");
      link.href = href;
      link.textContent = value;
      dd.appendChild(link);
    } else {
      dd.textContent = value;
    }
    row.appendChild(dt);
    row.appendChild(dd);
    return row;
  }

  /* Подвал собирается по типу владельца: ИП, самозанятый или физлицо.
     Если скрипты выключены, остаётся статичный вариант для ИП из index.html. */
  function renderLegal() {
    var list = document.getElementById("legal-list");
    if (!list) return;

    var type = String(get("legal.type", "ip")).toLowerCase();
    var owner = String(get("legal.fullName", "") || get("legal.entrepreneur", "") || get("legal.name", ""));
    var inn = String(get("legal.inn", "") || "");
    var ogrnip = String(get("legal.ogrnip", "") || "");
    var address = String(get("legal.legalAddress", "") || "");

    var rows = [];
    if (type === "person") {
      rows.push(["Владелец", owner]);
      if (inn) rows.push(["ИНН", inn]);
      if (address) rows.push(["Адрес", address]);
    } else if (type === "self") {
      rows.push(["Самозанятый", owner]);
      if (inn) rows.push(["ИНН", inn]);
      rows.push(["Статус", "Налог на профессиональный доход"]);
      if (address) rows.push(["Адрес", address]);
    } else {
      rows.push(["Предприниматель", owner]);
      if (inn) rows.push(["ИНН", inn]);
      if (ogrnip) rows.push(["ОГРНИП", ogrnip]);
      if (address) rows.push(["Юридический адрес", address]);
    }

    var fragment = document.createDocumentFragment();
    rows.forEach(function (row) {
      if (!row[1]) return;
      fragment.appendChild(legalRow(row[0], row[1]));
    });

    var phone = get("phone", "");
    if (phone) fragment.appendChild(legalRow("Телефон", phone, linkBuilders.phone()));
    var email = get("email", "");
    if (email) fragment.appendChild(legalRow("Почта", email, "mailto:" + email));

    list.textContent = "";
    list.appendChild(fragment);
  }

  /* --------------------- видео вместо фото на первом экране --------------- */

  /* Если в настройках указан heroVideo, поверх фото встаёт тихое видео.
     Пока поле пустое, работает обычное фото. При ошибке загрузки видео
     убирается — остаётся фото. При «меньше движения» видео не включаем. */
  function initHeroVideo() {
    var holder = document.querySelector(".hero-photo");
    if (!holder) return;

    var src = String(get("heroVideo", "") || "").trim();
    if (!src) return;

    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    var probe = document.createElement("video");
    var canPlay = typeof probe.canPlayType === "function" ? probe.canPlayType("video/mp4") : "";
    if (!canPlay) return;

    var video = document.createElement("video");
    video.className = "hero-video";
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = "assets/img/hero.jpg";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");

    video.addEventListener("error", function () {
      if (video.parentNode) video.parentNode.removeChild(video);
    });

    video.src = src;
    holder.appendChild(video);

    var started = video.play();
    if (started && typeof started.catch === "function") {
      started.catch(function () { /* автозапуск запрещён — остаётся постер */ });
    }
  }

  /* --------------------------- копирование текста ------------------------- */

  function copyText(text) {
    return new Promise(function (resolve, reject) {
      function fallback() {
        try {
          var area = document.createElement("textarea");
          area.value = text;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.top = "-1000px";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          area.setSelectionRange(0, area.value.length);
          var ok = document.execCommand("copy");
          document.body.removeChild(area);
          ok ? resolve() : reject(new Error("copy"));
        } catch (e) {
          reject(e);
        }
      }

      if (navigator.clipboard && global.isSecureContext) {
        navigator.clipboard.writeText(text).then(resolve, fallback);
      } else {
        fallback();
      }
    });
  }

  function initCopyButtons() {
    var buttons = document.querySelectorAll("[data-copy]");
    Array.prototype.forEach.call(buttons, function (button) {
      var original = button.textContent;
      button.addEventListener("click", function () {
        var what = button.getAttribute("data-copy");
        var text = what === "address"
          ? [get("address", ""), get("city", "")].filter(Boolean).join(", ")
          : String(get(what, ""));

        copyText(text).then(function () {
          button.textContent = "Скопировано";
          button.classList.add("is-done");
          if (typeof global.goal === "function") global.goal("copy_" + what);
        }).catch(function () {
          button.textContent = "Не получилось — выделите вручную";
          button.classList.add("is-done");
        });

        global.setTimeout(function () {
          button.textContent = original;
          button.classList.remove("is-done");
        }, 2200);
      });
    });
  }

  /* -------------------------------- меню ---------------------------------- */

  function renderMenu() {
    var box = document.getElementById("menu-columns");
    if (!box) return;

    var source = global.MENU;
    var hasItems = source && Array.isArray(source.categories) && source.categories.length > 0;
    var hasRenderer = global.MenuView && typeof global.MenuView.render === "function";

    if (!hasItems || !hasRenderer) {
      var phone = get("phone", "");
      box.innerHTML =
        '<p class="menu-empty">Меню временно недоступно. ' +
        'Загляните чуть позже или спросите цены по телефону ' +
        '<a href="' + esc(linkBuilders.phone()) + '">' + esc(phone) + "</a>.</p>";
      return;
    }

    /* Пекарня — отдельный включатель. При bakery: false категории нет совсем. */
    var categories = get("bakery", true)
      ? source.categories.slice()
      : source.categories.filter(function (cat) { return cat && cat.id !== "bakery"; });

    var menu = { updated: source.updated, categories: categories };
    box.setAttribute("data-count", String(categories.length));
    global.MenuView.render(box, menu);
    updateMenuDate(source);
    updateVisualBadge(source);
  }

  /* Дата меню: ISO-строка из data/menu.js — в вид «18.11.2026». */
  function updateMenuDate(menu) {
    var node = document.getElementById("menu-updated");
    if (!node || !menu || !menu.updated) return;
    var parts = String(menu.updated).split("-");
    if (parts.length !== 3) return;
    node.textContent = "Меню обновлено " + parts[2] + "." + parts[1] + "." + parts[0];
  }

  /* Бейдж на первом экране берёт цену из меню, а не из вёрстки. */
  function updateVisualBadge(menu) {
    var badge = document.querySelector(".visual-badge");
    if (!badge || !menu || !Array.isArray(menu.categories)) return;
    var found = null;
    menu.categories.some(function (cat) {
      if (!cat || !Array.isArray(cat.items)) return false;
      return cat.items.some(function (item) {
        if (item && item.name === "Флэт уайт") { found = item; return true; }
        return false;
      });
    });
    if (!found) return;
    var line = badge.querySelector("span");
    if (!line) return;
    var price = global.MenuView && typeof global.MenuView.formatPrice === "function"
      ? global.MenuView.formatPrice(found.price)
      : String(found.price) + "\u00A0₽";
    line.textContent = price + " · на овсяном молоке";
  }

  /* --------------------------------- карта -------------------------------- */

  function initMap() {
    var box = document.getElementById("map-box");
    if (!box) return;

    /* Без интернета остаётся запасная панель с адресом и ссылкой на маршрут. */
    if (global.navigator && global.navigator.onLine === false) {
      var offlineNote = box.querySelector(".map-failed");
      if (offlineNote) offlineNote.hidden = false;
      return;
    }

    var coords = get("coords", null);
    if (!coords || coords.lat === undefined) return;

    /* Карта — единственное внешнее обращение, и только при включённом интернете. */
    var frame = document.createElement("iframe");
    frame.className = "map-frame";
    frame.title = "Карта: " + get("name", "кофейня") + ", " + get("addressShort", "");
    frame.setAttribute("aria-label", "Карта с отметкой кофейни на Яндекс Картах");
    frame.setAttribute("loading", "lazy");
    frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    frame.setAttribute("allowfullscreen", "");
    frame.src = "https://yandex.ru/map-widget/v1/?ll=" + coords.lon + "%2C" + coords.lat +
      "&z=" + get("mapZoom", 17) +
      "&pt=" + coords.lon + "," + coords.lat + ",pm2rdm";

    var shown = false;
    frame.addEventListener("load", function () {
      if (shown) return;
      shown = true;
      box.classList.remove("is-loading");
      box.classList.add("is-ready");
      if (typeof global.goal === "function") global.goal("map_show");
    });
    frame.addEventListener("error", function () { showMapFailure(box); });

    box.appendChild(frame);

    /* Если карта не ответила — всё равно остаётся адрес и ссылка на маршрут. */
    global.setTimeout(function () {
      if (!shown) showMapFailure(box);
    }, 12000);
  }

  function showMapFailure(box) {
    box.classList.remove("is-loading");
    box.classList.add("is-failed");
    var note = box.querySelector(".map-failed");
    if (note) note.hidden = false;
  }

  /* --------------------------- cookie и счётчик --------------------------- */

  function startMetrika() {
    var id = String(get("metrikaId", "00000000"));
    if (metrikaStarted || !id || id === "00000000") return;
    metrikaStarted = true;

    /* Заготовка: счётчик включится только когда в config.js будет настоящий номер. */
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) return;
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(global, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    global.ym(Number(id), "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true
    });
  }

  global.goal = function (name) {
    if (global.console && console.info) console.info("[цель-заглушка]", name);
    if (!metrikaStarted || typeof global.ym !== "function") return;
    try {
      global.ym(Number(get("metrikaId")), "reachGoal", name);
    } catch (e) { /* счётчика нет — молчим */ }
  };

  function initCookieBanner() {
    var banner = document.getElementById("cookie-banner");
    var Store = global.Store;
    if (!banner) return;

    var choice = Store ? Store.get(COOKIE_KEY, null) : null;
    if (choice === null) {
      global.setTimeout(function () {
        banner.hidden = false;
        var first = banner.querySelector("button, a, input, select, textarea");
        if (first) first.focus();
      }, 700);
    } else if (choice === "all") {
      startMetrika();
    }

    /* Пока диалог открыт, Tab ходит только по его кнопкам. */
    banner.addEventListener("keydown", function (event) {
      if (event.key !== "Tab" || banner.hidden) return;
      var nodes = Array.prototype.slice.call(
        banner.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])")
      ).filter(function (node) { return node.offsetParent !== null || node === document.activeElement; });
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    var buttons = banner.querySelectorAll("[data-cookie]");
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        var value = button.getAttribute("data-cookie");
        if (Store) Store.set(COOKIE_KEY, value);
        banner.hidden = true;
        if (value === "all") startMetrika();
        if (typeof global.goal === "function") global.goal("cookie_" + value);
      });
    });
  }

  /* ------------------------ разметка для поисковиков ---------------------- */

  function buildJsonLd() {
    var holder = document.getElementById("cafe-jsonld");
    if (!holder) return;

    var coords = get("coords", {});
    var domain = String(get("domain", "")).replace(/\/$/, "");
    var opening = get("openingHours", []);
    var data = {
      "@context": "https://schema.org",
      "@type": "CafeOrCoffeeShop",
      name: get("legalName", get("name", "")),
      description: "Кофейня с собственной обжаркой, завтраками и бронью столика.",
      url: domain + "/",
      telephone: get("phoneHref", ""),
      email: get("email", ""),
      priceRange: get("priceRange", ""),
      image: [domain + "/assets/img/hero.jpg", domain + "/assets/img/og.jpg"],
      menu: domain + "/#menu",
      hasMenu: { "@type": "Menu", url: domain + "/#menu" },
      servesCuisine: "Кофейня, завтраки, выпечка",
      acceptsReservations: "True",
      address: {
        "@type": "PostalAddress",
        postalCode: get("postalCode", ""),
        streetAddress: get("addressShort", ""),
        addressLocality: get("city", ""),
        addressCountry: "RU"
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: coords.lat,
        longitude: coords.lon
      },
      openingHoursSpecification: (Array.isArray(opening) ? opening : []).map(function (row) {
        return {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: row.days,
          opens: row.opens,
          closes: row.closes
        };
      }),
      sameAs: [get("whatsapp", ""), get("telegram", ""), get("vk", "")].filter(Boolean)
    };

    if (!data.openingHoursSpecification.length) delete data.openingHoursSpecification;
    holder.textContent = JSON.stringify(data, null, 2);
  }

  /* -------------------------------- цели ---------------------------------- */

  function initGoals() {
    document.addEventListener("click", function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a") : null;
      if (!link) return;
      var href = link.getAttribute("href") || "";
      var explicit = link.getAttribute("data-goal");

      if (explicit) {
        global.goal(explicit);
      } else if (href.indexOf("tel:") === 0) {
        global.goal("phone");
      } else if (link.getAttribute("data-site-link") === "route") {
        global.goal("route");
      }
    });
  }

  /* ------------------------------- меню-бургер ---------------------------- */

  function initNav() {
    var toggle = document.getElementById("nav-toggle");
    if (!toggle) return;
    var links = document.querySelectorAll(".nav a");
    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener("click", function () {
        toggle.checked = false;
      });
    });
  }

  /* ------------------------ открыто / закрыто ----------------------------- */

  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function toMinutes(value) {
    var parts = String(value || "").split(":");
    if (parts.length !== 2) return null;
    var hours = Number(parts[0]);
    var minutes = Number(parts[1]);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  function hoursFor(dayIndex) {
    var name = DAY_NAMES[dayIndex];
    var rows = get("openingHours", []);
    if (!Array.isArray(rows)) return null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].days && rows[i].days.indexOf(name) !== -1) return rows[i];
    }
    return null;
  }

  function updateOpenStatus() {
    var nodes = document.querySelectorAll("[data-open-status]");
    if (!nodes.length) return;

    var now = new Date();
    var today = hoursFor(now.getDay());
    var current = now.getHours() * 60 + now.getMinutes();
    var text = "";

    if (today) {
      var from = toMinutes(today.opens);
      var to = toMinutes(today.closes);
      if (from !== null && to !== null && current >= from && current < to) {
        text = "Открыто до " + today.closes;
      }
    }

    if (!text) {
      var nextOpen = "08:00";
      for (var step = 1; step <= 7; step++) {
        var row = hoursFor((now.getDay() + step) % 7);
        if (row && toMinutes(row.opens) !== null) { nextOpen = row.opens; break; }
      }
      text = "Закрыто, откроется в " + nextOpen;
    }

    Array.prototype.forEach.call(nodes, function (node) { node.textContent = text; });
  }

  function initOpenStatus() {
    updateOpenStatus();
    global.setInterval(updateOpenStatus, 60 * 1000);
  }

  /* -------------------------------- отзывы -------------------------------- */

  function renderReviews() {
    var list = document.getElementById("reviews-list");
    var section = document.getElementById("reviews");
    if (!list || !section) return;

    var data = global.REVIEWS || {};
    var enabled = get("reviewsEnabled", true) !== false && data.enabled !== false;
    if (!enabled) {
      section.hidden = true;
      /* Убираем и пункт меню, чтобы не оставалась ссылка на скрытый раздел. */
      var navLink = document.querySelector('[data-site="reviewsNav"]');
      if (navLink) navLink.hidden = true;
      return;
    }

    var items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) return;

    var fragment = document.createDocumentFragment();
    items.forEach(function (review) {
      if (!review) return;
      var li = document.createElement("li");
      li.className = "review";

      var quote = document.createElement("blockquote");
      var text = document.createElement("p");
      text.textContent = review.text || "";
      quote.appendChild(text);

      var author = document.createElement("p");
      author.className = "review-author";
      var avatar = document.createElement("span");
      avatar.className = "avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = String(review.name || "?").charAt(0);
      author.appendChild(avatar);
      author.appendChild(document.createTextNode([review.name, review.role].filter(Boolean).join(", ")));

      li.appendChild(quote);
      li.appendChild(author);

      var metaText = [review.source, review.date, review.rating].filter(Boolean).join(" · ");
      if (metaText) {
        var meta = document.createElement("p");
        meta.className = "review-meta";
        if (review.sourceUrl) {
          var link = document.createElement("a");
          link.href = review.sourceUrl;
          link.rel = "noopener";
          link.textContent = metaText;
          meta.appendChild(link);
        } else {
          meta.textContent = metaText;
        }
        li.appendChild(meta);
      }

      fragment.appendChild(li);
    });

    list.textContent = "";
    list.appendChild(fragment);
  }

  /* ------------------------- команда и зёрна ------------------------------- */

  function teamPicture(photo, alt) {
    var picture = document.createElement("picture");
    var file = String(photo || "").split(/[\\/]/).pop();
    var base = file.replace(/\.[^.]+$/, "");

    var source = document.createElement("source");
    source.type = "image/webp";
    source.srcset = "assets/img/team/" + base + "-640.webp 640w, assets/img/team/" + base + "-1000.webp 1000w";
    source.sizes = "(max-width: 860px) 100vw, 50vw";

    var img = document.createElement("img");
    img.src = "assets/img/team/" + file;
    img.srcset = "assets/img/team/" + file + " 1536w";
    img.alt = alt || "";
    img.width = 1536;
    img.height = 1024;
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = function () { this.hidden = true; };

    picture.appendChild(source);
    picture.appendChild(img);
    return picture;
  }

  function renderAbout() {
    var data = global.ABOUT;
    if (!data) return;

    var team = document.getElementById("team-list");
    if (team && Array.isArray(data.team) && data.team.length) {
      var people = document.createDocumentFragment();
      data.team.forEach(function (person) {
        if (!person) return;
        var figure = document.createElement("figure");
        figure.className = "team-card";
        figure.appendChild(teamPicture(person.photo, person.name || "Команда кофейни"));

        var caption = document.createElement("figcaption");
        var name = document.createElement("strong");
        name.textContent = person.name || "";
        var role = document.createElement("span");
        role.textContent = person.role || "";
        var text = document.createElement("p");
        text.textContent = person.text || "";
        caption.appendChild(name);
        caption.appendChild(role);
        caption.appendChild(text);

        figure.appendChild(caption);
        people.appendChild(figure);
      });
      team.textContent = "";
      team.appendChild(people);
    }

    var beans = document.getElementById("beans-list");
    if (beans && Array.isArray(data.beans) && data.beans.length) {
      var cards = document.createDocumentFragment();
      data.beans.forEach(function (bean) {
        if (!bean) return;
        var card = document.createElement("article");
        card.className = "bean-card";
        var title = document.createElement("h3");
        title.textContent = bean.name || "";
        var meta = document.createElement("p");
        meta.className = "bean-meta";
        meta.textContent = [bean.origin, bean.roast + " обжарка"].filter(Boolean).join(" · ");
        var note = document.createElement("p");
        note.textContent = bean.note || "";
        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(note);
        cards.appendChild(card);
      });
      beans.textContent = "";
      beans.appendChild(cards);
    }
  }

  /* --------------------- липкая панель на телефоне ------------------------ */

  function initMobileBar() {
    var bar = document.getElementById("mobile-bar");
    var booking = document.getElementById("booking");
    if (!bar || !booking) return;

    function update() {
      var rect = booking.getBoundingClientRect();
      var viewport = global.innerHeight || 0;
      var visible = rect.bottom > 0 && rect.top < viewport;
      bar.classList.toggle("is-hidden", visible);
    }

    if (global.IntersectionObserver) {
      var observer = new global.IntersectionObserver(update, { threshold: 0 });
      observer.observe(booking);
    }
    global.addEventListener("scroll", update, { passive: true });
    global.addEventListener("resize", update);
    update();
  }

  /* -------------------------------- запуск -------------------------------- */

  applySiteValues();
  renderLegal();
  applyMarks();
  initHeroVideo();
  renderMenu();
  renderReviews();
  renderAbout();
  initCopyButtons();
  initMap();
  initOpenStatus();
  initMobileBar();
  initCookieBanner();
  buildJsonLd();
  initGoals();
  initNav();
})(window);
