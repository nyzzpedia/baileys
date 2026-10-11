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
var tc_token_utils_exports = {};
__export(tc_token_utils_exports, {
  TC_TOKEN_INDEX_KEY: () => TC_TOKEN_INDEX_KEY,
  buildMergedTcTokenIndexWrite: () => buildMergedTcTokenIndexWrite,
  buildTcTokenFromJid: () => buildTcTokenFromJid,
  isTcTokenExpired: () => isTcTokenExpired,
  readTcTokenIndex: () => readTcTokenIndex,
  resolveIssuanceJid: () => resolveIssuanceJid,
  resolveTcTokenJid: () => resolveTcTokenJid,
  shouldSendNewTcToken: () => shouldSendNewTcToken,
  storeTcTokensFromIqResult: () => storeTcTokensFromIqResult
});
module.exports = __toCommonJS(tc_token_utils_exports);
var import_WABinary = require("../WABinary/index.js");
const BOT_PHONE_REGEX = /^1313555\d{4}$|^131655500\d{2}$/;
function isRegularUser(jid) {
  if (!jid)
    return false;
  const user = jid.split("@")[0] ?? "";
  if (user === "0")
    return false;
  if (BOT_PHONE_REGEX.test(user))
    return false;
  if ((0, import_WABinary.isJidMetaAI)(jid))
    return false;
  return !!((0, import_WABinary.isPnUser)(jid) || (0, import_WABinary.isLidUser)(jid) || (0, import_WABinary.isHostedPnUser)(jid) || (0, import_WABinary.isHostedLidUser)(jid) || jid.endsWith("@c.us"));
}
const TC_TOKEN_BUCKET_DURATION = 604800;
const TC_TOKEN_NUM_BUCKETS = 4;
const TC_TOKEN_INDEX_KEY = "__index";
async function readTcTokenIndex(keys) {
  const data = await keys.get("tctoken", [TC_TOKEN_INDEX_KEY]);
  const entry = data[TC_TOKEN_INDEX_KEY];
  if (!entry?.token?.length)
    return [];
  try {
    const parsed = JSON.parse(Buffer.from(entry.token).toString());
    if (!Array.isArray(parsed))
      return [];
    return parsed.filter((j) => typeof j === "string" && j.length > 0 && j !== TC_TOKEN_INDEX_KEY);
  } catch {
    return [];
  }
}
async function buildMergedTcTokenIndexWrite(keys, addedJids) {
  const persisted = await readTcTokenIndex(keys);
  const merged = new Set(persisted);
  for (const jid of addedJids) {
    if (jid && jid !== TC_TOKEN_INDEX_KEY)
      merged.add(jid);
  }
  return {
    [TC_TOKEN_INDEX_KEY]: { token: Buffer.from(JSON.stringify([...merged])) }
  };
}
function isTcTokenExpired(timestamp) {
  if (timestamp === null || timestamp === void 0)
    return true;
  const ts = typeof timestamp === "string" ? parseInt(timestamp) : timestamp;
  if (isNaN(ts))
    return true;
  const now = Math.floor(Date.now() / 1e3);
  const currentBucket = Math.floor(now / TC_TOKEN_BUCKET_DURATION);
  const cutoffBucket = currentBucket - (TC_TOKEN_NUM_BUCKETS - 1);
  const cutoffTimestamp = cutoffBucket * TC_TOKEN_BUCKET_DURATION;
  return ts < cutoffTimestamp;
}
function shouldSendNewTcToken(senderTimestamp) {
  if (senderTimestamp === void 0)
    return true;
  const now = Math.floor(Date.now() / 1e3);
  const currentBucket = Math.floor(now / TC_TOKEN_BUCKET_DURATION);
  const senderBucket = Math.floor(senderTimestamp / TC_TOKEN_BUCKET_DURATION);
  return currentBucket > senderBucket;
}
async function resolveTcTokenJid(jid, getLIDForPN) {
  if ((0, import_WABinary.isLidUser)(jid))
    return jid;
  const lid = await getLIDForPN(jid);
  return lid ?? jid;
}
async function resolveIssuanceJid(jid, issueToLid, getLIDForPN, getPNForLID) {
  if (issueToLid) {
    if ((0, import_WABinary.isLidUser)(jid))
      return jid;
    const lid = await getLIDForPN(jid);
    return lid ?? jid;
  }
  if (!(0, import_WABinary.isLidUser)(jid))
    return jid;
  if (getPNForLID) {
    const pn = await getPNForLID(jid);
    return pn ?? jid;
  }
  return jid;
}
async function buildTcTokenFromJid({ authState, jid, baseContent = [], getLIDForPN }) {
  try {
    const storageJid = await resolveTcTokenJid(jid, getLIDForPN);
    const tcTokenData = await authState.keys.get("tctoken", [storageJid]);
    const entry = tcTokenData?.[storageJid];
    const tcTokenBuffer = entry?.token;
    const timestamp = entry?.timestamp;
    if (!tcTokenBuffer?.length || timestamp === void 0 || isTcTokenExpired(timestamp)) {
      if (tcTokenBuffer) {
        const cleared = entry?.senderTimestamp !== void 0 ? { token: Buffer.alloc(0), senderTimestamp: entry.senderTimestamp } : null;
        await authState.keys.set({ tctoken: { [storageJid]: cleared } });
      }
      return baseContent.length > 0 ? baseContent : void 0;
    }
    baseContent.push({
      tag: "tctoken",
      attrs: { t: String(timestamp) },
      content: tcTokenBuffer
    });
    return baseContent;
  } catch (error) {
    return baseContent.length > 0 ? baseContent : void 0;
  }
}
async function storeTcTokensFromIqResult({ result, fallbackJid, keys, getLIDForPN, onNewJidStored }) {
  const tokensNode = (0, import_WABinary.getBinaryNodeChild)(result, "tokens");
  if (!tokensNode)
    return;
  const tokenNodes = (0, import_WABinary.getBinaryNodeChildren)(tokensNode, "token");
  for (const tokenNode of tokenNodes) {
    if (tokenNode.attrs.type !== "trusted_contact" || !(tokenNode.content instanceof Uint8Array)) {
      continue;
    }
    const rawJid = (0, import_WABinary.jidNormalizedUser)(fallbackJid || tokenNode.attrs.jid);
    if (!isRegularUser(rawJid))
      continue;
    const storageJid = await resolveTcTokenJid(rawJid, getLIDForPN);
    const existingTcData = await keys.get("tctoken", [storageJid]);
    const existingEntry = existingTcData[storageJid];
    const existingTs = existingEntry?.timestamp ? Number(existingEntry.timestamp) : 0;
    const incomingTs = tokenNode.attrs.t ? Number(tokenNode.attrs.t) : 0;
    if (!incomingTs)
      continue;
    if (existingTs > 0 && existingTs > incomingTs)
      continue;
    await keys.set({
      tctoken: {
        [storageJid]: {
          ...existingEntry,
          token: Buffer.from(tokenNode.content),
          timestamp: tokenNode.attrs.t
        }
      }
    });
    onNewJidStored?.(storageJid);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TC_TOKEN_INDEX_KEY,
  buildMergedTcTokenIndexWrite,
  buildTcTokenFromJid,
  isTcTokenExpired,
  readTcTokenIndex,
  resolveIssuanceJid,
  resolveTcTokenJid,
  shouldSendNewTcToken,
  storeTcTokensFromIqResult
});
