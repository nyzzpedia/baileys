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
var sender_key_state_exports = {};
__export(sender_key_state_exports, {
  SenderKeyState: () => SenderKeyState
});
module.exports = __toCommonJS(sender_key_state_exports);
var import_sender_chain_key = require("./sender-chain-key.js");
var import_sender_message_key = require("./sender-message-key.js");
class SenderKeyState {
  constructor(id, iteration, chainKey, signatureKeyPair, signatureKeyPublic, signatureKeyPrivate, senderKeyStateStructure) {
    this.MAX_MESSAGE_KEYS = 2e3;
    if (senderKeyStateStructure) {
      this.senderKeyStateStructure = {
        ...senderKeyStateStructure,
        senderMessageKeys: Array.isArray(senderKeyStateStructure.senderMessageKeys) ? senderKeyStateStructure.senderMessageKeys : []
      };
    } else {
      if (signatureKeyPair) {
        signatureKeyPublic = signatureKeyPair.public;
        signatureKeyPrivate = signatureKeyPair.private;
      }
      this.senderKeyStateStructure = {
        senderKeyId: id || 0,
        senderChainKey: {
          iteration: iteration || 0,
          seed: Buffer.from(chainKey || [])
        },
        senderSigningKey: {
          public: Buffer.from(signatureKeyPublic || []),
          private: Buffer.from(signatureKeyPrivate || [])
        },
        senderMessageKeys: []
      };
    }
  }
  getKeyId() {
    return this.senderKeyStateStructure.senderKeyId;
  }
  getSenderChainKey() {
    return new import_sender_chain_key.SenderChainKey(this.senderKeyStateStructure.senderChainKey.iteration, this.senderKeyStateStructure.senderChainKey.seed);
  }
  setSenderChainKey(chainKey) {
    this.senderKeyStateStructure.senderChainKey = {
      iteration: chainKey.getIteration(),
      seed: chainKey.getSeed()
    };
  }
  getSigningKeyPublic() {
    const publicKey = Buffer.from(this.senderKeyStateStructure.senderSigningKey.public);
    if (publicKey.length === 32) {
      const fixed = Buffer.alloc(33);
      fixed[0] = 5;
      publicKey.copy(fixed, 1);
      return fixed;
    }
    return publicKey;
  }
  getSigningKeyPrivate() {
    const privateKey = this.senderKeyStateStructure.senderSigningKey.private;
    return Buffer.from(privateKey || []);
  }
  hasSenderMessageKey(iteration) {
    return this.senderKeyStateStructure.senderMessageKeys.some((key) => key.iteration === iteration);
  }
  addSenderMessageKey(senderMessageKey) {
    this.senderKeyStateStructure.senderMessageKeys.push({
      iteration: senderMessageKey.getIteration(),
      seed: senderMessageKey.getSeed()
    });
    if (this.senderKeyStateStructure.senderMessageKeys.length > this.MAX_MESSAGE_KEYS) {
      this.senderKeyStateStructure.senderMessageKeys.shift();
    }
  }
  removeSenderMessageKey(iteration) {
    const index = this.senderKeyStateStructure.senderMessageKeys.findIndex((key) => key.iteration === iteration);
    if (index !== -1) {
      const messageKey = this.senderKeyStateStructure.senderMessageKeys[index];
      this.senderKeyStateStructure.senderMessageKeys.splice(index, 1);
      return new import_sender_message_key.SenderMessageKey(messageKey.iteration, messageKey.seed);
    }
    return null;
  }
  getStructure() {
    return this.senderKeyStateStructure;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SenderKeyState
});
