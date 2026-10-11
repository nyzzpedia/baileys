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
var use_multi_file_auth_state_exports = {};
__export(use_multi_file_auth_state_exports, {
  useMultiFileAuthState: () => useMultiFileAuthState
});
module.exports = __toCommonJS(use_multi_file_auth_state_exports);
var import_async_mutex = require("async-mutex");
var import_promises = require("fs/promises");
var import_path = require("path");
var import_WAProto = require("../../WAProto/index.js");
var import_auth_utils = require("./auth-utils.js");
var import_generics = require("./generics.js");
const fileLocks = /* @__PURE__ */ new Map();
const getFileLock = (path) => {
  let mutex = fileLocks.get(path);
  if (!mutex) {
    mutex = new import_async_mutex.Mutex();
    fileLocks.set(path, mutex);
  }
  return mutex;
};
const useMultiFileAuthState = async (folder) => {
  const writeData = async (data, file) => {
    const filePath = (0, import_path.join)(folder, fixFileName(file));
    const mutex = getFileLock(filePath);
    return mutex.acquire().then(async (release) => {
      try {
        await (0, import_promises.writeFile)(filePath, JSON.stringify(data, import_generics.BufferJSON.replacer));
      } finally {
        release();
      }
    });
  };
  const readData = async (file) => {
    try {
      const filePath = (0, import_path.join)(folder, fixFileName(file));
      const mutex = getFileLock(filePath);
      return await mutex.acquire().then(async (release) => {
        try {
          const data = await (0, import_promises.readFile)(filePath, { encoding: "utf-8" });
          return JSON.parse(data, import_generics.BufferJSON.reviver);
        } finally {
          release();
        }
      });
    } catch (error) {
      return null;
    }
  };
  const removeData = async (file) => {
    try {
      const filePath = (0, import_path.join)(folder, fixFileName(file));
      const mutex = getFileLock(filePath);
      return mutex.acquire().then(async (release) => {
        try {
          await (0, import_promises.unlink)(filePath);
        } catch {
        } finally {
          release();
        }
      });
    } catch {
    }
  };
  const folderInfo = await (0, import_promises.stat)(folder).catch(() => {
  });
  if (folderInfo) {
    if (!folderInfo.isDirectory()) {
      throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`);
    }
  } else {
    await (0, import_promises.mkdir)(folder, { recursive: true });
  }
  const fixFileName = (file) => file?.replace(/\//g, "__")?.replace(/:/g, "-");
  const creds = await readData("creds.json") || (0, import_auth_utils.initAuthCreds)();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let value = await readData(`${type}-${id}.json`);
            if (type === "app-state-sync-key" && value) {
              value = import_WAProto.proto.Message.AppStateSyncKeyData.fromObject(value);
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
              const file = `${category}-${id}.json`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      return writeData(creds, "creds.json");
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useMultiFileAuthState
});
