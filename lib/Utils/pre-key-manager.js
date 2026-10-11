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
var pre_key_manager_exports = {};
__export(pre_key_manager_exports, {
  PreKeyManager: () => PreKeyManager
});
module.exports = __toCommonJS(pre_key_manager_exports);
var import_p_queue = __toESM(require("p-queue"));
class PreKeyManager {
  constructor(store, logger) {
    this.store = store;
    this.logger = logger;
    this.queues = /* @__PURE__ */ new Map();
  }
  /**
   * Get or create a queue for a specific key type
   */
  getQueue(keyType) {
    if (!this.queues.has(keyType)) {
      this.queues.set(keyType, new import_p_queue.default({ concurrency: 1 }));
    }
    return this.queues.get(keyType);
  }
  /**
   * Process pre-key operations (updates and deletions)
   */
  async processOperations(data, keyType, transactionCache, mutations, isInTransaction) {
    const keyData = data[keyType];
    if (!keyData)
      return;
    return this.getQueue(keyType).add(async () => {
      transactionCache[keyType] = transactionCache[keyType] || {};
      mutations[keyType] = mutations[keyType] || {};
      const deletions = [];
      const updates = {};
      for (const keyId in keyData) {
        if (keyData[keyId] === null) {
          deletions.push(keyId);
        } else {
          updates[keyId] = keyData[keyId];
        }
      }
      if (Object.keys(updates).length > 0) {
        Object.assign(transactionCache[keyType], updates);
        Object.assign(mutations[keyType], updates);
      }
      if (deletions.length > 0) {
        await this.processDeletions(keyType, deletions, transactionCache, mutations, isInTransaction);
      }
    });
  }
  /**
   * Process deletions with validation
   */
  async processDeletions(keyType, ids, transactionCache, mutations, isInTransaction) {
    if (isInTransaction) {
      for (const keyId of ids) {
        if (transactionCache[keyType]?.[keyId]) {
          transactionCache[keyType][keyId] = null;
          mutations[keyType][keyId] = null;
        } else {
          this.logger.warn(`Skipping deletion of non-existent ${keyType} in transaction: ${keyId}`);
        }
      }
    } else {
      const existingKeys = await this.store.get(keyType, ids);
      for (const keyId of ids) {
        if (existingKeys[keyId]) {
          transactionCache[keyType][keyId] = null;
          mutations[keyType][keyId] = null;
        } else {
          this.logger.warn(`Skipping deletion of non-existent ${keyType}: ${keyId}`);
        }
      }
    }
  }
  /**
   * Validate and process pre-key deletions outside transactions
   */
  async validateDeletions(data, keyType) {
    const keyData = data[keyType];
    if (!keyData)
      return;
    return this.getQueue(keyType).add(async () => {
      const deletionIds = Object.keys(keyData).filter((id) => keyData[id] === null);
      if (deletionIds.length === 0)
        return;
      const existingKeys = await this.store.get(keyType, deletionIds);
      for (const keyId of deletionIds) {
        if (!existingKeys[keyId]) {
          this.logger.warn(`Skipping deletion of non-existent ${keyType}: ${keyId}`);
          delete data[keyType][keyId];
        }
      }
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PreKeyManager
});
