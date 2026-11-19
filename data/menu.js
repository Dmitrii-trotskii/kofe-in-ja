/* Меню кофейни «Тёплый угол».
   Правьте вручную или через панель admin.html (там кнопка «Скачать menu.js»).
   tag: "" | "хит" | "новинка"
   price: число рублей
   photo: имя файла из assets/img/dishes/, например "syrniki.jpg" (необязательно) */
window.MENU = {
  updated: "2026-11-18",
  categories: [
    {
      id: "coffee",
      title: "Кофе",
      items: [
        { name: "Эспрессо", desc: "двойной, 40 мл", price: 150, tag: "" },
        { name: "Капучино", desc: "плотная пенка, 250 мл", price: 240, tag: "" },
        { name: "Флэт уайт", desc: "двойное эспрессо и молоко", price: 260, tag: "хит" },
        { name: "Фильтр V60", desc: "светлая обжарка, 300 мл", price: 290, tag: "", photo: "filtr-v60.jpg" },
        { name: "Колд брю", desc: "настаиваем 16 часов", price: 300, tag: "", photo: "cold-brew.jpg" },
        { name: "Раф на овсяном", desc: "сливки, ваниль, овсяное молоко", price: 300, tag: "новинка" }
      ]
    },
    {
      id: "desserts",
      title: "Десерты",
      items: [
        { name: "Круассан с миндалём", desc: "печём утром", price: 220, tag: "хит", photo: "kruassan.jpg" },
        { name: "Медовик", desc: "шесть коржей, сметанный крем", price: 260, tag: "", photo: "medovik.jpg" },
        { name: "Брауни без муки", desc: "горький шоколад", price: 240, tag: "" },
        { name: "Чизкейк с облепихой", desc: "кисло-сладкий", price: 290, tag: "", photo: "cheesecake.jpg" },
        { name: "Печенье с солью", desc: "к кофе", price: 120, tag: "" },
        { name: "Тарт с грушей", desc: "с тимьяном, тёплый", price: 280, tag: "новинка", photo: "tart-grusha.jpg" }
      ]
    },
    {
      id: "breakfast",
      title: "Завтраки",
      items: [
        { name: "Сырники с мёдом и сметаной", desc: "три штуки", price: 340, tag: "хит", photo: "syrniki.jpg" },
        { name: "Овсяная каша с грушей", desc: "на молоке или воде", price: 280, tag: "" },
        { name: "Омлет с томатами и сыром", desc: "два яйца", price: 320, tag: "" },
        { name: "Сэндвич с индейкой", desc: "на закваске", price: 290, tag: "", photo: "sendvich.jpg" },
        { name: "Гранола с йогуртом", desc: "ягоды, мёд", price: 260, tag: "" }
      ]
    },
    {
      id: "bakery",
      title: "Пекарня",
      items: [
        { name: "Хлеб на закваске", desc: "выпекаем утром", price: 180, tag: "" },
        { name: "Булочка с корицей", desc: "тёплая, к кофе", price: 150, tag: "" },
        { name: "Багет на заказ", desc: "закажите заранее", price: 170, tag: "" }
      ]
    }
  ]
};
