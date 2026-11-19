/* admin.js — панель редактирования меню.
   Правки живут в памяти браузера (черновик), на сайт попадают через файл data/menu.js. */
(function (global) {
  "use strict";

  /* Если пароль не подошёл, страница уже показала заглушку. Ничего не делаем. */
  if (global.__serviceDenied) return;

  var SITE = global.SITE || {};
  var Store = global.Store;
  var DRAFT_KEY = "teply_ugol_menu_draft";
  var TAGS = ["", "хит", "новинка"];
  var PHOTO_HINT = "Положите файл в assets/img/dishes и добавьте его имя в data/photos.js.";
  var PHOTO_WARN = "Файла нет в списке data/photos.js — фото может не появиться. Проверьте имя файла.";

  var els = {
    editor: document.getElementById("editor"),
    preview: document.getElementById("menu-preview"),
    download: document.getElementById("download-menu"),
    reset: document.getElementById("reset-menu"),
    addCategory: document.getElementById("add-category"),
    count: document.getElementById("editor-count"),
    draftNote: document.getElementById("draft-note"),
    missing: document.getElementById("menu-missing"),
    code: document.getElementById("menu-code")
  };

  var hasSource = Boolean(global.MENU && Array.isArray(global.MENU.categories));
  var ORIGINAL = hasSource
    ? JSON.parse(JSON.stringify(global.MENU))
    : { updated: "", categories: [] };

  var draft = Store ? Store.get(DRAFT_KEY, null) : null;
  var state = (draft && Array.isArray(draft.categories))
    ? draft
    : JSON.parse(JSON.stringify(ORIGINAL));

  if (!hasSource && els.missing) els.missing.hidden = false;
  if (draft && els.draftNote) els.draftNote.hidden = false;

  /* ------------------------------- помощники ------------------------------ */

  function esc(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function plural(n, one, few, many) {
    var num = Math.abs(Number(n));
    var mod10 = num % 10;
    var mod100 = num % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function photoList() {
    return Array.isArray(global.DISH_PHOTOS) ? global.DISH_PHOTOS : [];
  }

  function isKnownPhoto(value) {
    return photoList().indexOf(String(value || "").trim()) !== -1;
  }

  function fillPhotoList() {
    var list = document.getElementById("dish-photos");
    if (!list) return;
    list.innerHTML = "";
    photoList().forEach(function (name) {
      if (!name) return;
      var option = document.createElement("option");
      option.value = String(name);
      list.appendChild(option);
    });
  }

  function updatePhotoNote(field) {
    var line = field.closest ? field.closest(".field-line--photo") : null;
    if (!line) return;
    var note = line.querySelector('[data-role="photo-note"]');
    if (!note) return;
    var value = String(field.value || "").trim();
    var warn = value && !isKnownPhoto(value);
    note.textContent = warn ? PHOTO_WARN : PHOTO_HINT;
    if (warn) note.classList.add("panel-note--warn");
    else note.classList.remove("panel-note--warn");
  }

  function saveDraft() {
    if (Store) Store.set(DRAFT_KEY, state);
  }

  function tagOptions(current) {
    var list = TAGS.slice();
    if (current && list.indexOf(current) === -1) list.push(current);
    return list.map(function (tag) {
      return '<option value="' + esc(tag) + '"' + (tag === current ? " selected" : "") + ">" +
        (tag ? esc(tag) : "без метки") + "</option>";
    }).join("");
  }

  /* -------------------------------- отрисовка ----------------------------- */

  function itemRow(catIndex, itemIndex, item) {
    var base = 'data-cat="' + catIndex + '" data-item="' + itemIndex + '"';
    return '' +
      '<div class="item-row">' +
        '<label class="field-line field-line--name">' +
          "<span>Название</span>" +
          '<input type="text" ' + base + ' data-prop="name" value="' + esc(item.name) + '"' +
          ' aria-label="Название позиции ' + (itemIndex + 1) + '">' +
        "</label>" +
        '<label class="field-line field-line--desc">' +
          "<span>Описание</span>" +
          '<input type="text" ' + base + ' data-prop="desc" value="' + esc(item.desc) + '"' +
          ' aria-label="Описание позиции ' + (itemIndex + 1) + '">' +
        "</label>" +
        '<label class="field-line field-line--price">' +
          "<span>Цена, ₽</span>" +
          '<input type="number" min="0" step="10" ' + base + ' data-prop="price" value="' + esc(item.price) + '"' +
          ' aria-label="Цена позиции ' + (itemIndex + 1) + '">' +
        "</label>" +
        '<label class="field-line">' +
          "<span>Метка</span>" +
          '<select ' + base + ' data-prop="tag" aria-label="Метка позиции ' + (itemIndex + 1) + '">' +
            tagOptions(item.tag) +
          "</select>" +
        "</label>" +
        '<div class="item-actions">' +
          '<button class="btn-tiny" type="button" data-action="item-up" ' + base + '>Выше</button>' +
          '<button class="btn-tiny" type="button" data-action="item-down" ' + base + '>Ниже</button>' +
          '<button class="btn-tiny btn-danger" type="button" data-action="item-del" ' + base + '>Удалить</button>' +
        "</div>" +
        photoField(base, item, itemIndex) +
      "</div>";
  }

  function photoField(base, item, itemIndex) {
    var value = String(item.photo || "");
    var warn = value && !isKnownPhoto(value);

    return '<div class="field-line field-line--photo">' +
      "<span>Фото блюда</span>" +
      '<div class="photo-field">' +
        '<input type="text" list="dish-photos" ' + base + ' data-prop="photo"' +
        ' value="' + esc(value) + '" placeholder="например, syrniki.jpg"' +
        ' aria-label="Фото блюда, позиция ' + (itemIndex + 1) + '">' +
        '<button class="btn-tiny" type="button" data-action="item-photo-clear" ' + base + '>Убрать фото</button>' +
      "</div>" +
      '<p class="photo-note' + (warn ? " panel-note--warn" : "") + '" data-role="photo-note">' +
        (warn ? PHOTO_WARN : PHOTO_HINT) +
      "</p>" +
    "</div>";
  }

  function categoryCard(cat, catIndex) {
    var items = Array.isArray(cat.items) ? cat.items : [];
    var rows = items.map(function (item, itemIndex) {
      return itemRow(catIndex, itemIndex, item || {});
    }).join("");

    return '' +
      '<article class="cat-card">' +
        '<div class="cat-head">' +
          '<label class="field-line">' +
            "<span>Название категории</span>" +
            '<input type="text" data-cat="' + catIndex + '" data-prop="title" value="' + esc(cat.title) + '"' +
            ' aria-label="Название категории ' + (catIndex + 1) + '">' +
          "</label>" +
          '<div class="item-actions">' +
            '<button class="btn-tiny" type="button" data-action="cat-up" data-cat="' + catIndex + '">Выше</button>' +
            '<button class="btn-tiny" type="button" data-action="cat-down" data-cat="' + catIndex + '">Ниже</button>' +
            '<button class="btn-tiny btn-danger" type="button" data-action="cat-del" data-cat="' + catIndex + '">Удалить категорию</button>' +
          "</div>" +
        "</div>" +
        '<div class="items">' + (rows || '<p class="panel-note" style="padding:14px 18px;">Позиций пока нет.</p>') + "</div>" +
        '<div class="cat-foot">' +
          '<button class="btn-tiny" type="button" data-action="item-add" data-cat="' + catIndex + '">+ Добавить позицию</button>' +
        "</div>" +
      "</article>";
  }

  function renderEditor() {
    if (!els.editor) return;

    if (!state.categories.length) {
      els.editor.innerHTML = '<p class="hint">Категорий пока нет. Нажмите «Добавить категорию» — ' +
        "и заполните название, позиции и цены.</p>";
      return;
    }

    els.editor.innerHTML = state.categories.map(function (cat, index) {
      return categoryCard(cat || { title: "", items: [] }, index);
    }).join("");
  }

  function renderPreview() {
    if (!els.preview) return;
    if (global.MenuView && typeof global.MenuView.render === "function") {
      global.MenuView.render(els.preview, state);
    }
  }

  function updateCount() {
    if (!els.count) return;
    var items = 0;
    state.categories.forEach(function (cat) {
      if (cat && Array.isArray(cat.items)) items += cat.items.length;
    });
    els.count.textContent = state.categories.length + " " +
      plural(state.categories.length, "категория", "категории", "категорий") + ", " +
      items + " " + plural(items, "позиция", "позиции", "позиций");
  }

  function refreshFileText() {
    if (els.code) els.code.value = buildMenuFile();
  }

  function renderAll() {
    renderEditor();
    renderPreview();
    updateCount();
    refreshFileText();
  }

  /* ---------------------------- правка значений --------------------------- */

  function onEdit(event) {
    var field = event.target;
    if (!field || !field.getAttribute) return;
    if (!field.hasAttribute("data-prop")) return;
    if (!field.hasAttribute("data-cat")) return;

    var catIndex = Number(field.getAttribute("data-cat"));
    var prop = field.getAttribute("data-prop");
    var cat = state.categories[catIndex];
    if (!cat) return;

    var value = field.value;
    if (prop === "price") {
      value = Number(value);
      if (isNaN(value) || value < 0) value = 0;
    }
    if (prop === "photo") {
      value = String(value || "").trim();
    }

    if (field.hasAttribute("data-item")) {
      var itemIndex = Number(field.getAttribute("data-item"));
      if (!cat.items || !cat.items[itemIndex]) return;
      cat.items[itemIndex][prop] = value;
    } else {
      cat[prop] = value;
    }

    if (prop === "photo") updatePhotoNote(field);

    saveDraft();
    renderPreview();
    refreshFileText();
  }

  /* ------------------------------- действия ------------------------------- */

  function moveItem(list, from, to) {
    if (to < 0 || to >= list.length) return false;
    var moved = list.splice(from, 1)[0];
    list.splice(to, 0, moved);
    return true;
  }

  function onClick(event) {
    var button = event.target.closest ? event.target.closest("[data-action]") : null;
    if (!button) return;

    var action = button.getAttribute("data-action");
    var catIndex = Number(button.getAttribute("data-cat"));
    var itemIndex = button.hasAttribute("data-item") ? Number(button.getAttribute("data-item")) : -1;
    var cat = state.categories[catIndex];
    var changed = false;

    if (action === "cat-up" && cat) changed = moveItem(state.categories, catIndex, catIndex - 1);
    if (action === "cat-down" && cat) changed = moveItem(state.categories, catIndex, catIndex + 1);

    if (action === "cat-del" && cat) {
      var label = cat.title ? "«" + cat.title + "»" : "эту категорию";
      if (!global.confirm("Удалить категорию " + label + " вместе с позициями?")) return;
      state.categories.splice(catIndex, 1);
      changed = true;
    }

    if (action === "item-add" && cat) {
      if (!Array.isArray(cat.items)) cat.items = [];
      cat.items.push({ name: "Новая позиция", desc: "", price: 0, tag: "" });
      changed = true;
    }

    if (action === "item-up" && cat && cat.items) changed = moveItem(cat.items, itemIndex, itemIndex - 1);
    if (action === "item-down" && cat && cat.items) changed = moveItem(cat.items, itemIndex, itemIndex + 1);

    if (action === "item-del" && cat && cat.items && cat.items[itemIndex]) {
      if (!global.confirm("Удалить позицию «" + cat.items[itemIndex].name + "»?")) return;
      cat.items.splice(itemIndex, 1);
      changed = true;
    }

    if (action === "item-photo-clear" && cat && cat.items && cat.items[itemIndex]) {
      cat.items[itemIndex].photo = "";
      changed = true;
    }

    if (changed) {
      saveDraft();
      renderAll();
    }
  }

  /* ------------------------------- готовый файл --------------------------- */

  function humanDate() {
    var now = new Date();
    return pad(now.getDate()) + "." + pad(now.getMonth() + 1) + "." + now.getFullYear();
  }

  function buildMenuFile() {
    var data = JSON.parse(JSON.stringify(state));
    data.updated = new Date().toISOString().slice(0, 10);

    /* поле photo попадает в файл только если оно заполнено */
    if (Array.isArray(data.categories)) {
      data.categories.forEach(function (cat) {
        if (!cat || !Array.isArray(cat.items)) return;
        cat.items.forEach(function (item) {
          if (!item) return;
          var photo = String(item.photo || "").trim();
          if (photo) item.photo = photo;
          else delete item.photo;
        });
      });
    }

    var header = "/* Меню кофейни «" + (SITE.name || "Тёплый угол") + "».\n" +
      "   Файл собран в панели admin.html " + humanDate() + ".\n" +
      "   Замените им файл data/menu.js — и меню на сайте обновится.\n" +
      "   tag: \"\" | \"хит\" | \"новинка\"; price — число рублей;\n" +
      "   photo — имя файла из assets/img/dishes/ (необязательно). */\n\n";

    return header + "window.MENU = " + JSON.stringify(data, null, 2) + ";\n";
  }

  function downloadMenu() {
    var text = buildMenuFile();
    var blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "menu.js";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);

    if (els.code) els.code.value = text;
  }

  /* -------------------------------- запуск -------------------------------- */

  if (els.editor) {
    els.editor.addEventListener("input", onEdit);
    els.editor.addEventListener("change", onEdit);
    els.editor.addEventListener("click", onClick);
  }

  if (els.addCategory) {
    els.addCategory.addEventListener("click", function () {
      state.categories.push({
        id: "cat" + String(Date.now()).slice(-5),
        title: "Новая категория",
        items: [{ name: "Новая позиция", desc: "", price: 0, tag: "" }]
      });
      saveDraft();
      renderAll();
    });
  }

  if (els.reset) {
    els.reset.addEventListener("click", function () {
      if (!global.confirm("Вернуть меню к исходному варианту? Черновик будет удалён.")) return;
      state = JSON.parse(JSON.stringify(ORIGINAL));
      if (Store) Store.remove(DRAFT_KEY);
      if (els.draftNote) els.draftNote.hidden = true;
      renderAll();
    });
  }

  if (els.download) {
    els.download.addEventListener("click", downloadMenu);
  }

  /* --------------------------- редактор отзывов -------------------------- */

  var reviewEls = {
    editor: document.getElementById("reviews-list-editor"),
    enabled: document.getElementById("reviews-enabled"),
    add: document.getElementById("add-review"),
    reset: document.getElementById("reset-reviews"),
    download: document.getElementById("download-reviews"),
    count: document.getElementById("reviews-count"),
    missing: document.getElementById("reviews-missing"),
    code: document.getElementById("reviews-code")
  };

  var hasReviews = Boolean(global.REVIEWS && Array.isArray(global.REVIEWS.items));
  var REVIEW_ORIGINAL = hasReviews
    ? JSON.parse(JSON.stringify(global.REVIEWS))
    : { enabled: true, items: [] };
  var reviewState = JSON.parse(JSON.stringify(REVIEW_ORIGINAL));

  if (!hasReviews && reviewEls.missing) reviewEls.missing.hidden = false;

  var REVIEW_PROPS = [
    ["name", "Имя", "text"],
    ["role", "Кем работает", "text"],
    ["text", "Текст отзыва", "textarea"],
    ["source", "Источник", "text"],
    ["sourceUrl", "Ссылка на источник", "text"],
    ["date", "Дата", "text"],
    ["rating", "Оценка", "text"]
  ];

  function reviewRow(review, index) {
    var fields = REVIEW_PROPS.map(function (info) {
      var key = info[0];
      var label = info[1];
      var kind = info[2];
      var base = 'data-r="' + index + '" data-rprop="' + key + '"';
      var value = review[key] === undefined || review[key] === null ? "" : review[key];
      var aria = ' aria-label="' + esc(label) + ', отзыв ' + (index + 1) + '"';
      var control = kind === "textarea"
        ? "<textarea " + base + " rows=\"3\"" + aria + ">" + esc(value) + "</textarea>"
        : '<input type="text" ' + base + ' value="' + esc(value) + '"' + aria + ">";
      return '<label class="field-line' + (kind === "textarea" ? " field-line--text" : "") + '">' +
        "<span>" + esc(label) + "</span>" + control + "</label>";
    }).join("");

    return '<div class="review-row">' + fields +
      '<label class="toggle-line">' +
        '<input type="checkbox" data-r="' + index + '" data-rprop="demo"' +
        (review.demo === true ? " checked" : "") +
        ' aria-label="Демонстрационный отзыв ' + (index + 1) + '">' +
        "<span>Демонстрационный отзыв</span>" +
      "</label>" +
      '<div class="review-actions">' +
        '<button class="btn-tiny" type="button" data-raction="r-up" data-r="' + index + '">Выше</button> ' +
        '<button class="btn-tiny" type="button" data-raction="r-down" data-r="' + index + '">Ниже</button> ' +
        '<button class="btn-tiny btn-danger" type="button" data-raction="r-del" data-r="' + index + '">Удалить</button>' +
      "</div>" +
    "</div>";
  }

  function buildReviewsFile() {
    var data = JSON.parse(JSON.stringify(reviewState));
    var header = "/* Отзывы кофейни «" + (SITE.name || "Тёплый угол") + "».\n" +
      "   Файл собран в панели admin.html " + humanDate() + ".\n" +
      "   Замените им файл data/reviews.js — и раздел на сайте обновится.\n" +
      "   enabled: false — раздел «Отзывы» исчезает с сайта полностью. */\n\n";
    return header + "window.REVIEWS = " + JSON.stringify(data, null, 2) + ";\n";
  }

  function renderReviewsEditor() {
    if (!reviewEls.editor) return;
    if (reviewEls.enabled) reviewEls.enabled.checked = reviewState.enabled !== false;

    var rows = reviewState.items.map(reviewRow).join("");
    reviewEls.editor.innerHTML =
      '<div class="cat-head"><strong>Отзывы гостей</strong></div>' +
      '<div class="items">' +
      (rows || '<p class="panel-note" style="padding:14px 18px;">Отзывов пока нет. Нажмите «Добавить отзыв».</p>') +
      "</div>";

    if (reviewEls.count) {
      reviewEls.count.textContent = reviewState.items.length + " " +
        plural(reviewState.items.length, "отзыв", "отзыва", "отзывов");
    }
    if (reviewEls.code) reviewEls.code.value = buildReviewsFile();
  }

  function downloadReviews() {
    var text = buildReviewsFile();
    var blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "reviews.js";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    if (reviewEls.code) reviewEls.code.value = text;
  }

  function onReviewEdit(event) {
    var field = event.target;
    if (!field || !field.getAttribute || !field.hasAttribute("data-rprop")) return;
    var index = Number(field.getAttribute("data-r"));
    var prop = field.getAttribute("data-rprop");
    var review = reviewState.items[index];
    if (!review) return;
    review[prop] = prop === "demo" ? field.checked : field.value;
    if (reviewEls.code) reviewEls.code.value = buildReviewsFile();
  }

  function onReviewClick(event) {
    var button = event.target.closest ? event.target.closest("[data-raction]") : null;
    if (!button) return;

    var action = button.getAttribute("data-raction");
    var index = Number(button.getAttribute("data-r"));
    var changed = false;

    if (action === "r-up") changed = moveItem(reviewState.items, index, index - 1);
    if (action === "r-down") changed = moveItem(reviewState.items, index, index + 1);

    if (action === "r-del") {
      var item = reviewState.items[index];
      var label = item && item.name ? "«" + item.name + "»" : "этот отзыв";
      if (!global.confirm("Удалить отзыв " + label + "?")) return;
      reviewState.items.splice(index, 1);
      changed = true;
    }

    if (changed) renderReviewsEditor();
  }

  if (reviewEls.editor) {
    reviewEls.editor.addEventListener("input", onReviewEdit);
    reviewEls.editor.addEventListener("change", onReviewEdit);
    reviewEls.editor.addEventListener("click", onReviewClick);
  }

  if (reviewEls.enabled) {
    reviewEls.enabled.addEventListener("change", function () {
      reviewState.enabled = reviewEls.enabled.checked;
      if (reviewEls.code) reviewEls.code.value = buildReviewsFile();
    });
  }

  if (reviewEls.add) {
    reviewEls.add.addEventListener("click", function () {
      reviewState.items.push({
        name: "Новый гость",
        role: "",
        text: "",
        source: "Отзыв гостя",
        sourceUrl: "",
        date: "",
        rating: "",
        demo: true
      });
      renderReviewsEditor();
    });
  }

  if (reviewEls.reset) {
    reviewEls.reset.addEventListener("click", function () {
      if (!global.confirm("Вернуть отзывы к исходному варианту?")) return;
      reviewState = JSON.parse(JSON.stringify(REVIEW_ORIGINAL));
      renderReviewsEditor();
    });
  }

  if (reviewEls.download) {
    reviewEls.download.addEventListener("click", downloadReviews);
  }

  fillPhotoList();
  renderAll();
  renderReviewsEditor();
})(window);
