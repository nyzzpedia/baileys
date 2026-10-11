var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var make_cache_manager_store_exports = {};
__export(make_cache_manager_store_exports, {
  default: () => makeCacheManagerAuthState
});
module.exports = __toCommonJS(make_cache_manager_store_exports);
var WAProto_1 = __toESM(require("../../WAProto/index.js"));
var Utils_1 = __toESM(require("../Utils/index.js"));
var import_logger = __toESM(require("../Utils/logger.js"));
async function makeCacheManagerAuthState(store, sessionKey) {
  let cacheManager;
  try {
    cacheManager = require("cache-manager");
  } catch {
    throw new Error("makeCacheManagerAuthState requires the optional 'cache-manager' package. Install it with: npm install cache-manager");
  }
  const defaultKey = (file) => `${sessionKey}:${file}`;
  const databaseConn = await cacheManager.caching(store);
  const writeData = async (file, data) => {
    let ttl = void 0;
    if (file === "creds") ttl = 63115200;
    await databaseConn.set(defaultKey(file), JSON.stringify(data, Utils_1.BufferJSON.replacer), ttl);
  };
  const readData = async (file) => {
    try {
      const data = await databaseConn.get(defaultKey(file));
      if (data) return JSON.parse(data, Utils_1.BufferJSON.reviver);
      return null;
    } catch (error) {
      import_logger.default.error(error);
      return null;
    }
  };
  const removeData = async (file) => {
    try {
      return await databaseConn.del(defaultKey(file));
    } catch {
      import_logger.default.error(`Error removing ${file} from session ${sessionKey}`);
    }
  };
  const clearState = async () => {
    try {
      const result = await databaseConn.store.keys(`${sessionKey}*`);
      await Promise.all(result.map(async (key) => databaseConn.del(key)));
    } catch {
    }
  };
  const creds = await readData("creds") || Utils_1.initAuthCreds();
  return {
    clearState,
    saveCreds: () => writeData("creds", creds),
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let value = await readData(`${type}-${id}`);
            if (type === "app-state-sync-key" && value) {
              value = WAProto_1.proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        }
      }
    }
  };
}
