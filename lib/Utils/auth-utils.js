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
var auth_utils_exports = {};
__export(auth_utils_exports, {
  addTransactionCapability: () => addTransactionCapability,
  assertMeId: () => assertMeId,
  initAuthCreds: () => initAuthCreds,
  makeCacheableSignalKeyStore: () => makeCacheableSignalKeyStore
});
module.exports = __toCommonJS(auth_utils_exports);
var import_node_cache = __toESM(require("@cacheable/node-cache"));
var import_boom = require("@hapi/boom");
var import_async_hooks = require("async_hooks");
var import_async_mutex = require("async-mutex");
var import_crypto = require("crypto");
var import_p_queue = __toESM(require("p-queue"));
var import_Defaults = require("../Defaults/index.js");
var import_crypto2 = require("./crypto.js");
var import_generics = require("./generics.js");
var import_pre_key_manager = require("./pre-key-manager.js");
function makeCacheableSignalKeyStore(store, logger, _cache) {
  const cache = _cache || new import_node_cache.default({
    stdTTL: import_Defaults.DEFAULT_CACHE_TTLS.SIGNAL_STORE,
    // 5 minutes
    useClones: false,
    deleteOnExpire: true
  });
  const cacheMutex = new import_async_mutex.Mutex();
  function getUniqueId(type, id) {
    return `${type}.${id}`;
  }
  return {
    async get(type, ids) {
      return cacheMutex.runExclusive(async () => {
        const data = {};
        const idsToFetch = [];
        for (const id of ids) {
          const item = await cache.get(getUniqueId(type, id));
          if (typeof item !== "undefined") {
            data[id] = item;
          } else {
            idsToFetch.push(id);
          }
        }
        if (idsToFetch.length) {
          logger?.trace({ items: idsToFetch.length }, "loading from store");
          const fetched = await store.get(type, idsToFetch);
          for (const id of idsToFetch) {
            const item = fetched[id];
            if (item) {
              data[id] = item;
              await cache.set(getUniqueId(type, id), item);
            }
          }
        }
        return data;
      });
    },
    async set(data) {
      return cacheMutex.runExclusive(async () => {
        let keys = 0;
        for (const type in data) {
          for (const id in data[type]) {
            await cache.set(getUniqueId(type, id), data[type][id]);
            keys += 1;
          }
        }
        logger?.trace({ keys }, "updated cache");
        await store.set(data);
      });
    },
    async clear() {
      await cache.flushAll();
      await store.clear?.();
    }
  };
}
const addTransactionCapability = (state, logger, { maxCommitRetries, delayBetweenTriesMs }) => {
  const txStorage = new import_async_hooks.AsyncLocalStorage();
  const keyQueues = /* @__PURE__ */ new Map();
  const txMutexes = /* @__PURE__ */ new Map();
  const txMutexRefCounts = /* @__PURE__ */ new Map();
  const preKeyManager = new import_pre_key_manager.PreKeyManager(state, logger);
  function getQueue(key) {
    if (!keyQueues.has(key)) {
      keyQueues.set(key, new import_p_queue.default({ concurrency: 1 }));
    }
    return keyQueues.get(key);
  }
  function getTxMutex(key) {
    if (!txMutexes.has(key)) {
      txMutexes.set(key, new import_async_mutex.Mutex());
      txMutexRefCounts.set(key, 0);
    }
    return txMutexes.get(key);
  }
  function acquireTxMutexRef(key) {
    const count = txMutexRefCounts.get(key) ?? 0;
    txMutexRefCounts.set(key, count + 1);
  }
  function releaseTxMutexRef(key) {
    const count = (txMutexRefCounts.get(key) ?? 1) - 1;
    txMutexRefCounts.set(key, count);
    if (count <= 0) {
      const mutex = txMutexes.get(key);
      if (mutex && !mutex.isLocked()) {
        txMutexes.delete(key);
        txMutexRefCounts.delete(key);
      }
    }
  }
  function isInTransaction() {
    return !!txStorage.getStore();
  }
  async function commitWithRetry(mutations) {
    if (Object.keys(mutations).length === 0) {
      logger.trace("no mutations in transaction");
      return;
    }
    logger.trace("committing transaction");
    for (let attempt = 0; attempt < maxCommitRetries; attempt++) {
      try {
        await state.set(mutations);
        logger.trace({ mutationCount: Object.keys(mutations).length }, "committed transaction");
        return;
      } catch (error) {
        const retriesLeft = maxCommitRetries - attempt - 1;
        logger.warn(`failed to commit mutations, retries left=${retriesLeft}`);
        if (retriesLeft === 0) {
          throw error;
        }
        await (0, import_generics.delay)(delayBetweenTriesMs);
      }
    }
  }
  return {
    get: async (type, ids) => {
      const ctx = txStorage.getStore();
      if (!ctx) {
        return state.get(type, ids);
      }
      const cached = ctx.cache[type] || {};
      const missing = ids.filter((id) => !(id in cached));
      if (missing.length > 0) {
        ctx.dbQueries++;
        logger.trace({ type, count: missing.length }, "fetching missing keys in transaction");
        const fetched = await getTxMutex(type).runExclusive(() => state.get(type, missing));
        ctx.cache[type] = ctx.cache[type] || {};
        Object.assign(ctx.cache[type], fetched);
      }
      const result = {};
      for (const id of ids) {
        const value = ctx.cache[type]?.[id];
        if (value !== void 0 && value !== null) {
          result[id] = value;
        }
      }
      return result;
    },
    set: async (data) => {
      const ctx = txStorage.getStore();
      if (!ctx) {
        const types = Object.keys(data);
        for (const type_ of types) {
          const type = type_;
          if (type === "pre-key") {
            await preKeyManager.validateDeletions(data, type);
          }
        }
        await Promise.all(types.map((type) => getQueue(type).add(async () => {
          const typeData = { [type]: data[type] };
          await state.set(typeData);
        })));
        return;
      }
      logger.trace({ types: Object.keys(data) }, "caching in transaction");
      for (const key_ in data) {
        const key = key_;
        ctx.cache[key] = ctx.cache[key] || {};
        ctx.mutations[key] = ctx.mutations[key] || {};
        if (key === "pre-key") {
          await preKeyManager.processOperations(data, key, ctx.cache, ctx.mutations, true);
        } else {
          Object.assign(ctx.cache[key], data[key]);
          Object.assign(ctx.mutations[key], data[key]);
        }
      }
    },
    isInTransaction,
    transaction: async (work, key) => {
      const existing = txStorage.getStore();
      if (existing) {
        logger.trace("reusing existing transaction context");
        return work();
      }
      const mutex = getTxMutex(key);
      acquireTxMutexRef(key);
      try {
        return await mutex.runExclusive(async () => {
          const ctx = {
            cache: {},
            mutations: {},
            dbQueries: 0
          };
          logger.trace("entering transaction");
          try {
            const result = await txStorage.run(ctx, work);
            await commitWithRetry(ctx.mutations);
            logger.trace({ dbQueries: ctx.dbQueries }, "transaction completed");
            return result;
          } catch (error) {
            logger.error({ error }, "transaction failed, rolling back");
            throw error;
          }
        });
      } finally {
        releaseTxMutexRef(key);
      }
    }
  };
};
const assertMeId = (creds) => {
  const id = creds.me?.id;
  if (!id) {
    throw new import_boom.Boom("Cannot proceed: socket is not authenticated yet (creds.me.id is missing)", { statusCode: 401 });
  }
  return id;
};
const initAuthCreds = () => {
  const identityKey = import_crypto2.Curve.generateKeyPair();
  return {
    noiseKey: import_crypto2.Curve.generateKeyPair(),
    pairingEphemeralKeyPair: import_crypto2.Curve.generateKeyPair(),
    signedIdentityKey: identityKey,
    signedPreKey: (0, import_crypto2.signedKeyPair)(identityKey, 1),
    registrationId: (0, import_generics.generateRegistrationId)(),
    advSecretKey: (0, import_crypto.randomBytes)(32).toString("base64"),
    processedHistoryMessages: [],
    nextPreKeyId: 1,
    firstUnuploadedPreKeyId: 1,
    accountSyncCounter: 0,
    accountSettings: {
      unarchiveChats: false
    },
    registered: false,
    pairingCode: void 0,
    lastPropHash: void 0,
    routingInfo: void 0,
    additionalData: void 0
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addTransactionCapability,
  assertMeId,
  initAuthCreds,
  makeCacheableSignalKeyStore
});
