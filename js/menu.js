/* menu.js — отрисовка меню из файла data/menu.js.
   Используется и на сайте, и в панели admin.html (предпросмотр). */
(function (global) {
  "use strict";

  function formatPrice(value) {
    var n = Math.round(Number(value));
    if (isNaN(n) || n < 0) n = 0;
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") + "\u00A0₽";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function render(container, menu) {
    if (!container) return;
    container.innerHTML = "";

    var categories = (menu && Array.isArray(menu.categories)) ? menu.categories : [];

    categories.forEach(function (cat, index) {
      var items = (cat && Array.isArray(cat.items)) ? cat.items : [];
      if (!cat || (!cat.title && !items.length)) return;

      var id = "menu-" + (cat.id || index);
      var block = el("section", "menu-col");
      block.setAttribute("aria-labelledby", id);

      var title = el("h3", "", cat.title || "Без названия");
      title.id = id;

      var list = el("ul", "dishes");

      items.forEach(function (item) {
        if (!item) return;
        var li = el("li");
        var text = el("span", "dish-text");
        text.appendChild(el("span", "dish-name", item.name || ""));

        if (item.tag) {
          text.appendChild(el("span", "dish-tag", item.tag));
        }
        if (item.desc) {
          text.appendChild(el("span", "dish-desc", item.desc));
        }

        li.appendChild(text);
        li.appendChild(el("span", "dish-price", formatPrice(item.price)));
        list.appendChild(li);
      });

      block.appendChild(title);
      block.appendChild(list);
      container.appendChild(block);
    });
  }

  global.MenuView = { render: render, formatPrice: formatPrice };
})(window);
