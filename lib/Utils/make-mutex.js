var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var make_mutex_exports = {};
__export(make_mutex_exports, {
  makeKeyedMutex: () => makeKeyedMutex,
  makeMutex: () => makeMutex
});
module.exports = __toCommonJS(make_mutex_exports);
var import_async_mutex = require("async-mutex");
const makeMutex = () => {
  const mutex = new import_async_mutex.Mutex();
  return {
    mutex(code) {
      return mutex.runExclusive(code);
    }
  };
};
const makeKeyedMutex = () => {
  const map = /* @__PURE__ */ new Map();
  return {
    async mutex(key, task) {
      let entry = map.get(key);
      if (!entry) {
        entry = { mutex: new import_async_mutex.Mutex(), refCount: 0 };
        map.set(key, entry);
      }
      entry.refCount++;
      try {
        return await entry.mutex.runExclusive(task);
      } finally {
        entry.refCount--;
        if (entry.refCount === 0 && map.get(key) === entry) {
          map.delete(key);
        }
      }
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeKeyedMutex,
  makeMutex
});
