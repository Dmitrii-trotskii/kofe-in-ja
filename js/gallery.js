/* gallery.js — фото блюд в блоке «Атмосфера».
   --------------------------------------------------------------------------
   Берёт позиции меню, у которых заполнено поле photo, и ставит их фото
   на три свободных плитки (они помечены data-dish-slot). Если позиций
   с фото больше трёх — остальные плитки добавляются ниже.

   Если фото нет ни у одной позиции, страница остаётся точно такой же,
   как в статичном HTML: три фото и три градиентные плитки.

   Если файл не загрузился, картинка не показывается: вместо неё
   возвращается прежняя градиентная плитка. */
(function (global) {
  "use strict";

  var PHOTO_DIR = "assets/img/dishes/";

  function formatPrice(value) {
    if (global.MenuView && typeof global.MenuView.formatPrice === "function") {
      return global.MenuView.formatPrice(value);
    }
    var n = Math.round(Number(value));
    if (isNaN(n) || n < 0) n = 0;
    return String(n) + "\u00A0₽";
  }

  /* только имя файла: без папок и переходов вверх */
  function fileName(value) {
    return String(value || "").trim().split(/[\\/]/).pop();
  }

  function collectDishes(menu) {
    var result = [];
    var categories = (menu && Array.isArray(menu.categories)) ? menu.categories : [];

    categories.forEach(function (cat) {
      var items = (cat && Array.isArray(cat.items)) ? cat.items : [];
      items.forEach(function (item) {
        if (!item) return;
        var file = fileName(item.photo);
        if (!file) return;
        result.push({
          name: item.name ? String(item.name) : "Блюдо",
          price: item.price,
          src: PHOTO_DIR + encodeURIComponent(file)
        });
      });
    });

    return result;
  }

  function buildTile(dish) {
    var li = document.createElement("li");
    li.className = "tile tile--photo tile--dish";

    var media = document.createElement("span");
    media.className = "tile-media";

    var img = document.createElement("img");
    img.src = dish.src;
    img.alt = dish.name;
    img.width = 1200;
    img.height = 900;
    img.loading = "lazy";
    img.decoding = "async";

    media.appendChild(img);

    var caption = document.createElement("span");
    caption.className = "tile-caption tile-caption--dish";

    var name = document.createElement("span");
    name.className = "dish-caption-name";
    name.textContent = dish.name;

    var price = document.createElement("span");
    price.className = "dish-caption-price";
    price.textContent = formatPrice(dish.price);

    caption.appendChild(name);
    caption.appendChild(price);
    li.appendChild(media);
    li.appendChild(caption);

    return { node: li, img: img };
  }

  function render(menu) {
    var list = document.querySelector("#gallery .gallery");
    if (!list) return;

    var dishes = collectDishes(menu);
    if (!dishes.length) return;

    var slots = Array.prototype.slice.call(list.querySelectorAll("[data-dish-slot]"));
    var original = slots.map(function (slot) { return slot.cloneNode(true); });

    /* первые блюда занимают свободные места по порядку */
    slots.forEach(function (slot, index) {
      var dish = dishes[index];
      if (!dish) return;

      var tile = buildTile(dish);
      if (slot.parentNode) slot.parentNode.replaceChild(tile.node, slot);

      tile.img.addEventListener("error", function () {
        if (tile.node.parentNode) {
          tile.node.parentNode.replaceChild(original[index], tile.node);
        }
      });
    });

    /* лишние блюда — новыми плитками ниже */
    dishes.slice(slots.length).forEach(function (dish) {
      var tile = buildTile(dish);
      list.appendChild(tile.node);

      tile.img.addEventListener("error", function () {
        if (tile.node.parentNode) tile.node.parentNode.removeChild(tile.node);
      });
    });
  }

  function start() {
    try {
      render(global.MENU);
    } catch (error) {
      /* фото блюд — украшение: если что-то пошло не так, страница работает без них */
      if (global.console && global.console.warn) {
        global.console.warn("Фото блюд не показаны:", error);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window);
