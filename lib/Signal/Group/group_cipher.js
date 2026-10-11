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
var group_cipher_exports = {};
__export(group_cipher_exports, {
  GroupCipher: () => GroupCipher
});
module.exports = __toCommonJS(group_cipher_exports);
var import_crypto = require("../../../vendor/libsignal/src/crypto.js");
var import_sender_key_message = require("./sender-key-message.js");
var import_sender_key_name = require("./sender-key-name.js");
var import_sender_key_record = require("./sender-key-record.js");
var import_sender_key_state = require("./sender-key-state.js");
class GroupCipher {
  constructor(senderKeyStore, senderKeyName) {
    this.senderKeyStore = senderKeyStore;
    this.senderKeyName = senderKeyName;
  }
  async encrypt(paddedPlaintext) {
    const record = await this.senderKeyStore.loadSenderKey(this.senderKeyName);
    if (!record) {
      throw new Error("No SenderKeyRecord found for encryption");
    }
    const senderKeyState = record.getSenderKeyState();
    if (!senderKeyState) {
      throw new Error("No session to encrypt message");
    }
    const iteration = senderKeyState.getSenderChainKey().getIteration();
    const senderKey = this.getSenderKey(senderKeyState, iteration === 0 ? 0 : iteration + 1);
    const ciphertext = await this.getCipherText(senderKey.getIv(), senderKey.getCipherKey(), paddedPlaintext);
    const senderKeyMessage = new import_sender_key_message.SenderKeyMessage(senderKeyState.getKeyId(), senderKey.getIteration(), ciphertext, senderKeyState.getSigningKeyPrivate());
    await this.senderKeyStore.storeSenderKey(this.senderKeyName, record);
    return senderKeyMessage.serialize();
  }
  async decrypt(senderKeyMessageBytes) {
    const record = await this.senderKeyStore.loadSenderKey(this.senderKeyName);
    if (!record) {
      throw new Error("No SenderKeyRecord found for decryption");
    }
    const senderKeyMessage = new import_sender_key_message.SenderKeyMessage(null, null, null, null, senderKeyMessageBytes);
    const senderKeyState = record.getSenderKeyState(senderKeyMessage.getKeyId());
    if (!senderKeyState) {
      throw new Error("No session found to decrypt message");
    }
    senderKeyMessage.verifySignature(senderKeyState.getSigningKeyPublic());
    const senderKey = this.getSenderKey(senderKeyState, senderKeyMessage.getIteration());
    const plaintext = await this.getPlainText(senderKey.getIv(), senderKey.getCipherKey(), senderKeyMessage.getCipherText());
    await this.senderKeyStore.storeSenderKey(this.senderKeyName, record);
    return plaintext;
  }
  getSenderKey(senderKeyState, iteration) {
    let senderChainKey = senderKeyState.getSenderChainKey();
    if (senderChainKey.getIteration() > iteration) {
      if (senderKeyState.hasSenderMessageKey(iteration)) {
        const messageKey = senderKeyState.removeSenderMessageKey(iteration);
        if (!messageKey) {
          throw new Error("No sender message key found for iteration");
        }
        return messageKey;
      }
      throw new Error(`Received message with old counter: ${senderChainKey.getIteration()}, ${iteration}`);
    }
    if (iteration - senderChainKey.getIteration() > 2e3) {
      throw new Error("Over 2000 messages into the future!");
    }
    while (senderChainKey.getIteration() < iteration) {
      senderKeyState.addSenderMessageKey(senderChainKey.getSenderMessageKey());
      senderChainKey = senderChainKey.getNext();
    }
    senderKeyState.setSenderChainKey(senderChainKey.getNext());
    return senderChainKey.getSenderMessageKey();
  }
  async getPlainText(iv, key, ciphertext) {
    try {
      return (0, import_crypto.decrypt)(key, ciphertext, iv);
    } catch (e) {
      throw new Error("InvalidMessageException");
    }
  }
  async getCipherText(iv, key, plaintext) {
    try {
      return (0, import_crypto.encrypt)(key, plaintext, iv);
    } catch (e) {
      throw new Error("InvalidMessageException");
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GroupCipher
});
