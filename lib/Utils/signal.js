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
var signal_exports = {};
__export(signal_exports, {
  createSignalIdentity: () => createSignalIdentity,
  extractDeviceJids: () => extractDeviceJids,
  extractE2ESessionFromRetryReceipt: () => extractE2ESessionFromRetryReceipt,
  generateOrGetPreKeys: () => generateOrGetPreKeys,
  getNextPreKeys: () => getNextPreKeys,
  getNextPreKeysNode: () => getNextPreKeysNode,
  getPreKeys: () => getPreKeys,
  parseAndInjectE2ESessions: () => parseAndInjectE2ESessions,
  xmppPreKey: () => xmppPreKey,
  xmppSignedPreKey: () => xmppSignedPreKey
});
module.exports = __toCommonJS(signal_exports);
var import_Defaults = require("../Defaults/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_crypto = require("./crypto.js");
var import_generics = require("./generics.js");
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
const createSignalIdentity = (wid, accountSignatureKey) => {
  return {
    identifier: { name: wid, deviceId: 0 },
    identifierKey: (0, import_crypto.generateSignalPubKey)(accountSignatureKey)
  };
};
const getPreKeys = async ({ get }, min, limit) => {
  const idList = [];
  for (let id = min; id < limit; id++) {
    idList.push(id.toString());
  }
  return get("pre-key", idList);
};
const generateOrGetPreKeys = (creds, range) => {
  const avaliable = creds.nextPreKeyId - creds.firstUnuploadedPreKeyId;
  const remaining = range - avaliable;
  const lastPreKeyId = creds.nextPreKeyId + remaining - 1;
  const newPreKeys = {};
  if (remaining > 0) {
    for (let i = creds.nextPreKeyId; i <= lastPreKeyId; i++) {
      newPreKeys[i] = import_crypto.Curve.generateKeyPair();
    }
  }
  return {
    newPreKeys,
    lastPreKeyId,
    preKeysRange: [creds.firstUnuploadedPreKeyId, range]
  };
};
const xmppSignedPreKey = (key) => ({
  tag: "skey",
  attrs: {},
  content: [
    { tag: "id", attrs: {}, content: (0, import_generics.encodeBigEndian)(key.keyId, 3) },
    { tag: "value", attrs: {}, content: key.keyPair.public },
    { tag: "signature", attrs: {}, content: key.signature }
  ]
});
const xmppPreKey = (pair, id) => ({
  tag: "key",
  attrs: {},
  content: [
    { tag: "id", attrs: {}, content: (0, import_generics.encodeBigEndian)(id, 3) },
    { tag: "value", attrs: {}, content: pair.public }
  ]
});
const isValidUInt = (n) => typeof n === "number" && Number.isInteger(n);
const extractE2ESessionFromRetryReceipt = (receipt) => {
  const keysNode = (0, import_WABinary.getBinaryNodeChild)(receipt, "keys");
  if (!keysNode)
    return null;
  const typeBuf = (0, import_WABinary.getBinaryNodeChildBuffer)(keysNode, "type");
  if (!typeBuf || typeBuf.length !== 1 || typeBuf[0] !== import_Defaults.KEY_BUNDLE_TYPE[0])
    return null;
  const identity = (0, import_WABinary.getBinaryNodeChildBuffer)(keysNode, "identity");
  const skey = (0, import_WABinary.getBinaryNodeChild)(keysNode, "skey");
  if (!identity || identity.length !== 32 || !skey)
    return null;
  const registrationId = (0, import_WABinary.getBinaryNodeChildUInt)(receipt, "registration", 4);
  if (!isValidUInt(registrationId))
    return null;
  const signedPubKey = (0, import_WABinary.getBinaryNodeChildBuffer)(skey, "value");
  const signedSig = (0, import_WABinary.getBinaryNodeChildBuffer)(skey, "signature");
  const signedKeyId = (0, import_WABinary.getBinaryNodeChildUInt)(skey, "id", 3);
  if (!signedPubKey || signedPubKey.length !== 32 || !signedSig || !isValidUInt(signedKeyId)) {
    return null;
  }
  const preKeyNode = (0, import_WABinary.getBinaryNodeChild)(keysNode, "key");
  let preKey;
  if (preKeyNode) {
    const preKeyPub = (0, import_WABinary.getBinaryNodeChildBuffer)(preKeyNode, "value");
    const preKeyId = (0, import_WABinary.getBinaryNodeChildUInt)(preKeyNode, "id", 3);
    if (!preKeyPub || preKeyPub.length !== 32 || !isValidUInt(preKeyId)) {
      return null;
    }
    preKey = { keyId: preKeyId, publicKey: (0, import_crypto.generateSignalPubKey)(preKeyPub) };
  }
  return {
    registrationId,
    identityKey: (0, import_crypto.generateSignalPubKey)(identity),
    signedPreKey: {
      keyId: signedKeyId,
      publicKey: (0, import_crypto.generateSignalPubKey)(signedPubKey),
      signature: signedSig
    },
    preKey
  };
};
const parseAndInjectE2ESessions = async (node, repository) => {
  const extractKey = (key) => key ? {
    keyId: (0, import_WABinary.getBinaryNodeChildUInt)(key, "id", 3),
    publicKey: (0, import_crypto.generateSignalPubKey)((0, import_WABinary.getBinaryNodeChildBuffer)(key, "value")),
    signature: (0, import_WABinary.getBinaryNodeChildBuffer)(key, "signature")
  } : void 0;
  const nodes = (0, import_WABinary.getBinaryNodeChildren)((0, import_WABinary.getBinaryNodeChild)(node, "list"), "user");
  for (const node2 of nodes) {
    (0, import_WABinary.assertNodeErrorFree)(node2);
  }
  const chunkSize = 100;
  const chunks = chunk(nodes, chunkSize);
  for (const nodesChunk of chunks) {
    for (const node2 of nodesChunk) {
      const signedKey = (0, import_WABinary.getBinaryNodeChild)(node2, "skey");
      const key = (0, import_WABinary.getBinaryNodeChild)(node2, "key");
      const identity = (0, import_WABinary.getBinaryNodeChildBuffer)(node2, "identity");
      const jid = node2.attrs.jid;
      const registrationId = (0, import_WABinary.getBinaryNodeChildUInt)(node2, "registration", 4);
      await repository.injectE2ESession({
        jid,
        session: {
          registrationId,
          identityKey: (0, import_crypto.generateSignalPubKey)(identity),
          signedPreKey: extractKey(signedKey),
          preKey: extractKey(key)
        }
      });
    }
  }
};
const extractDeviceJids = (result, myJid, myLid, excludeZeroDevices) => {
  const { user: myUser, device: myDevice } = (0, import_WABinary.jidDecode)(myJid);
  const extracted = [];
  for (const userResult of result) {
    const { devices, id } = userResult;
    const decoded = (0, import_WABinary.jidDecode)(id), { user, server } = decoded;
    let { domainType } = decoded;
    const deviceList = devices?.deviceList;
    if (!Array.isArray(deviceList))
      continue;
    for (const { id: device, keyIndex, isHosted } of deviceList) {
      if ((!excludeZeroDevices || device !== 0) && // if zero devices are not-excluded, or device is non zero
      (myUser !== user && myLid !== user || myDevice !== device) && // either different user or if me user, not this device
      (device === 0 || !!keyIndex)) {
        if (isHosted) {
          domainType = domainType === import_WABinary.WAJIDDomains.LID ? import_WABinary.WAJIDDomains.HOSTED_LID : import_WABinary.WAJIDDomains.HOSTED;
        }
        extracted.push({
          user,
          device,
          domainType,
          server: (0, import_WABinary.getServerFromDomainType)(server, domainType)
        });
      }
    }
  }
  return extracted;
};
const getNextPreKeys = async ({ creds, keys }, count) => {
  const { newPreKeys, lastPreKeyId, preKeysRange } = generateOrGetPreKeys(creds, count);
  const update = {
    nextPreKeyId: Math.max(lastPreKeyId + 1, creds.nextPreKeyId),
    firstUnuploadedPreKeyId: Math.max(creds.firstUnuploadedPreKeyId, lastPreKeyId + 1)
  };
  await keys.set({ "pre-key": newPreKeys });
  const preKeys = await getPreKeys(keys, preKeysRange[0], preKeysRange[0] + preKeysRange[1]);
  return { update, preKeys };
};
const getNextPreKeysNode = async (state, count) => {
  const { creds } = state;
  const { update, preKeys } = await getNextPreKeys(state, count);
  const node = {
    tag: "iq",
    attrs: {
      xmlns: "encrypt",
      type: "set",
      to: import_WABinary.S_WHATSAPP_NET
    },
    content: [
      { tag: "registration", attrs: {}, content: (0, import_generics.encodeBigEndian)(creds.registrationId) },
      { tag: "type", attrs: {}, content: import_Defaults.KEY_BUNDLE_TYPE },
      { tag: "identity", attrs: {}, content: creds.signedIdentityKey.public },
      { tag: "list", attrs: {}, content: Object.keys(preKeys).map((k) => xmppPreKey(preKeys[+k], +k)) },
      xmppSignedPreKey(creds.signedPreKey)
    ]
  };
  return { update, node };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createSignalIdentity,
  extractDeviceJids,
  extractE2ESessionFromRetryReceipt,
  generateOrGetPreKeys,
  getNextPreKeys,
  getNextPreKeysNode,
  getPreKeys,
  parseAndInjectE2ESessions,
  xmppPreKey,
  xmppSignedPreKey
});
