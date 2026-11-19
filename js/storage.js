/* storage.js — одно место для работы с памятью браузера (localStorage).
   Если браузер запрещает хранение, всё продолжает работать в памяти вкладки:
   страница не падает, просто данные не переживут перезагрузку. */
(function (global) {
  "use strict";

  var REQUESTS_KEY = "teply_ugol_requests";
  var memory = {};
  var available = true;

  try {
    var probe = "__teply_probe__";
    global.localStorage.setItem(probe, "1");
    global.localStorage.removeItem(probe);
  } catch (e) {
    available = false;
  }

  function readRaw(key) {
    if (available) {
      try {
        return global.localStorage.getItem(key);
      } catch (e) { /* хранилище закрылось — читаем из памяти */ }
    }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }

  function writeRaw(key, value) {
    memory[key] = value;
    if (!available) return false;
    try {
      global.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  function get(key, fallback) {
    var raw = readRaw(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }

  function set(key, value) {
    return writeRaw(key, JSON.stringify(value));
  }

  function remove(key) {
    delete memory[key];
    if (!available) return;
    try { global.localStorage.removeItem(key); } catch (e) { /* ничего */ }
  }

  function getRequests() {
    var list = get(REQUESTS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveRequests(list) {
    return set(REQUESTS_KEY, list);
  }

  function addRequest(request) {
    var list = getRequests();
    list.push(request);
    return saveRequests(list);
  }

  function updateRequest(id, patch) {
    var list = getRequests();
    var changed = false;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) {
        list[i] = Object.assign({}, list[i], patch);
        changed = true;
      }
    }
    if (changed) saveRequests(list);
    return changed;
  }

  function clearRequests() {
    return set(REQUESTS_KEY, []);
  }

  /* Номера заявок: продолжаем с 128, чтобы демонстрация выглядела живой */
  function nextId() {
    var max = 127;
    getRequests().forEach(function (item) {
      var n = Number(item && item.id);
      if (!isNaN(n) && n > max) max = n;
    });
    return max + 1;
  }

  global.Store = {
    available: available,
    keys: { requests: REQUESTS_KEY },
    get: get,
    set: set,
    remove: remove,
    getRequests: getRequests,
    saveRequests: saveRequests,
    addRequest: addRequest,
    updateRequest: updateRequest,
    clearRequests: clearRequests,
    nextId: nextId
  };
})(window);
