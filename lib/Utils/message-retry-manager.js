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
var message_retry_manager_exports = {};
__export(message_retry_manager_exports, {
  MessageRetryManager: () => MessageRetryManager,
  RetryReason: () => RetryReason
});
module.exports = __toCommonJS(message_retry_manager_exports);
var import_lru_cache = require("lru-cache");
const RECENT_MESSAGES_SIZE = 512;
const MESSAGE_KEY_SEPARATOR = "\0";
const RECREATE_SESSION_TIMEOUT = 60 * 60 * 1e3;
const PHONE_REQUEST_DELAY = 3e3;
var RetryReason;
(function(RetryReason2) {
  RetryReason2[RetryReason2["UnknownError"] = 0] = "UnknownError";
  RetryReason2[RetryReason2["SignalErrorNoSession"] = 1] = "SignalErrorNoSession";
  RetryReason2[RetryReason2["SignalErrorInvalidKey"] = 2] = "SignalErrorInvalidKey";
  RetryReason2[RetryReason2["SignalErrorInvalidKeyId"] = 3] = "SignalErrorInvalidKeyId";
  RetryReason2[RetryReason2["SignalErrorInvalidMessage"] = 4] = "SignalErrorInvalidMessage";
  RetryReason2[RetryReason2["SignalErrorInvalidSignature"] = 5] = "SignalErrorInvalidSignature";
  RetryReason2[RetryReason2["SignalErrorFutureMessage"] = 6] = "SignalErrorFutureMessage";
  RetryReason2[RetryReason2["SignalErrorBadMac"] = 7] = "SignalErrorBadMac";
  RetryReason2[RetryReason2["SignalErrorInvalidSession"] = 8] = "SignalErrorInvalidSession";
  RetryReason2[RetryReason2["SignalErrorInvalidMsgKey"] = 9] = "SignalErrorInvalidMsgKey";
  RetryReason2[RetryReason2["BadBroadcastEphemeralSetting"] = 10] = "BadBroadcastEphemeralSetting";
  RetryReason2[RetryReason2["UnknownCompanionNoPrekey"] = 11] = "UnknownCompanionNoPrekey";
  RetryReason2[RetryReason2["AdvFailure"] = 12] = "AdvFailure";
  RetryReason2[RetryReason2["StatusRevokeDelay"] = 13] = "StatusRevokeDelay";
})(RetryReason || (RetryReason = {}));
const MAC_ERROR_CODES = /* @__PURE__ */ new Set([RetryReason.SignalErrorInvalidMessage, RetryReason.SignalErrorBadMac]);
class MessageRetryManager {
  constructor(logger, maxMsgRetryCount) {
    this.logger = logger;
    this.recentMessagesMap = new import_lru_cache.LRUCache({
      max: RECENT_MESSAGES_SIZE,
      ttl: 5 * 60 * 1e3,
      ttlAutopurge: true,
      dispose: (_value, key) => {
        const separatorIndex = key.lastIndexOf(MESSAGE_KEY_SEPARATOR);
        if (separatorIndex > -1) {
          const messageId = key.slice(separatorIndex + MESSAGE_KEY_SEPARATOR.length);
          this.messageKeyIndex.delete(messageId);
        }
      }
    });
    this.messageKeyIndex = /* @__PURE__ */ new Map();
    this.sessionRecreateHistory = new import_lru_cache.LRUCache({
      ttl: RECREATE_SESSION_TIMEOUT * 2,
      ttlAutopurge: true
    });
    this.retryCounters = new import_lru_cache.LRUCache({
      ttl: 15 * 60 * 1e3,
      ttlAutopurge: true,
      updateAgeOnGet: true
    });
    this.baseKeys = new import_lru_cache.LRUCache({
      max: 1024,
      ttl: 15 * 60 * 1e3,
      ttlAutopurge: true
    });
    this.pendingPhoneRequests = {};
    this.maxMsgRetryCount = 5;
    this.statistics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      mediaRetries: 0,
      sessionRecreations: 0,
      phoneRequests: 0
    };
    this.maxMsgRetryCount = maxMsgRetryCount;
  }
  /**
   * Add a recent message to the cache for retry handling
   */
  addRecentMessage(to, id, message) {
    const key = { to, id };
    const keyStr = this.keyToString(key);
    this.recentMessagesMap.set(keyStr, {
      message,
      timestamp: Date.now()
    });
    this.messageKeyIndex.set(id, keyStr);
    this.logger.debug(`Added message to retry cache: ${to}/${id}`);
  }
  /**
   * Get a recent message from the cache
   */
  getRecentMessage(to, id) {
    const key = { to, id };
    const keyStr = this.keyToString(key);
    return this.recentMessagesMap.get(keyStr);
  }
  /**
   * Check if a session should be recreated based on retry count, history, and error code.
   * MAC errors (codes 4 and 7) trigger immediate session recreation regardless of timeout.
   */
  shouldRecreateSession(jid, hasSession, errorCode) {
    if (!hasSession) {
      this.sessionRecreateHistory.set(jid, Date.now());
      this.statistics.sessionRecreations++;
      return {
        reason: "we don't have a Signal session with them",
        recreate: true
      };
    }
    if (errorCode !== void 0 && MAC_ERROR_CODES.has(errorCode)) {
      this.sessionRecreateHistory.set(jid, Date.now());
      this.statistics.sessionRecreations++;
      this.logger.warn({ jid, errorCode: RetryReason[errorCode] }, "MAC error detected, forcing immediate session recreation");
      return {
        reason: `MAC error (code ${errorCode}: ${RetryReason[errorCode]}), immediate session recreation`,
        recreate: true
      };
    }
    const now = Date.now();
    const prevTime = this.sessionRecreateHistory.get(jid);
    if (!prevTime || now - prevTime > RECREATE_SESSION_TIMEOUT) {
      this.sessionRecreateHistory.set(jid, now);
      this.statistics.sessionRecreations++;
      return {
        reason: "retry count > 1 and over an hour since last recreation",
        recreate: true
      };
    }
    return { reason: "", recreate: false };
  }
  /**
   * Parse error code from retry receipt's retry node.
   * Returns undefined if no error code is present.
   */
  parseRetryErrorCode(errorAttr) {
    if (errorAttr === void 0 || errorAttr === "") {
      return void 0;
    }
    const code = parseInt(errorAttr, 10);
    if (Number.isNaN(code)) {
      return void 0;
    }
    if (code >= RetryReason.UnknownError && code <= RetryReason.StatusRevokeDelay) {
      return code;
    }
    return RetryReason.UnknownError;
  }
  /**
   * Check if an error code indicates a MAC failure
   */
  isMacError(errorCode) {
    return errorCode !== void 0 && MAC_ERROR_CODES.has(errorCode);
  }
  /**
   * Increment retry counter for a message
   */
  incrementRetryCount(messageId) {
    this.retryCounters.set(messageId, (this.retryCounters.get(messageId) || 0) + 1);
    this.statistics.totalRetries++;
    return this.retryCounters.get(messageId);
  }
  /**
   * Get retry count for a message
   */
  getRetryCount(messageId) {
    return this.retryCounters.get(messageId) || 0;
  }
  /**
   * Check if message has exceeded maximum retry attempts
   */
  hasExceededMaxRetries(messageId) {
    return this.getRetryCount(messageId) >= this.maxMsgRetryCount;
  }
  /**
   * Mark retry as successful
   */
  markRetrySuccess(messageId) {
    this.statistics.successfulRetries++;
    this.retryCounters.delete(messageId);
    this.cancelPendingPhoneRequest(messageId);
    this.removeRecentMessage(messageId);
  }
  /**
   * Mark retry as failed
   */
  markRetryFailed(messageId) {
    this.statistics.failedRetries++;
    this.retryCounters.delete(messageId);
    this.cancelPendingPhoneRequest(messageId);
    this.removeRecentMessage(messageId);
  }
  /**
   * Schedule a phone request with delay
   */
  schedulePhoneRequest(messageId, callback, delay = PHONE_REQUEST_DELAY) {
    this.cancelPendingPhoneRequest(messageId);
    this.pendingPhoneRequests[messageId] = setTimeout(() => {
      delete this.pendingPhoneRequests[messageId];
      this.statistics.phoneRequests++;
      callback();
    }, delay);
    this.logger.debug(`Scheduled phone request for message ${messageId} with ${delay}ms delay`);
  }
  /**
   * Cancel pending phone request
   */
  cancelPendingPhoneRequest(messageId) {
    const timeout = this.pendingPhoneRequests[messageId];
    if (timeout) {
      clearTimeout(timeout);
      delete this.pendingPhoneRequests[messageId];
      this.logger.debug(`Cancelled pending phone request for message ${messageId}`);
    }
  }
  clear() {
    this.recentMessagesMap.clear();
    this.messageKeyIndex.clear();
    this.sessionRecreateHistory.clear();
    this.retryCounters.clear();
    this.baseKeys.clear();
    for (const messageId of Object.keys(this.pendingPhoneRequests)) {
      this.cancelPendingPhoneRequest(messageId);
    }
    this.statistics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      mediaRetries: 0,
      sessionRecreations: 0,
      phoneRequests: 0
    };
  }
  saveBaseKey(addr, msgId, baseKey) {
    this.baseKeys.set(`${addr}:${msgId}`, baseKey);
  }
  hasSameBaseKey(addr, msgId, baseKey) {
    const stored = this.baseKeys.get(`${addr}:${msgId}`);
    if (!stored || stored.length !== baseKey.length) {
      return false;
    }
    for (let i = 0; i < stored.length; i++) {
      if (stored[i] !== baseKey[i])
        return false;
    }
    return true;
  }
  deleteBaseKey(addr, msgId) {
    this.baseKeys.delete(`${addr}:${msgId}`);
  }
  keyToString(key) {
    return `${key.to}${MESSAGE_KEY_SEPARATOR}${key.id}`;
  }
  removeRecentMessage(messageId) {
    const keyStr = this.messageKeyIndex.get(messageId);
    if (!keyStr) {
      return;
    }
    this.recentMessagesMap.delete(keyStr);
    this.messageKeyIndex.delete(messageId);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MessageRetryManager,
  RetryReason
});
