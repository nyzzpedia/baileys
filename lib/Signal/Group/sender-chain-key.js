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
var sender_chain_key_exports = {};
__export(sender_chain_key_exports, {
  SenderChainKey: () => SenderChainKey
});
module.exports = __toCommonJS(sender_chain_key_exports);
var import_crypto = require("../../../vendor/libsignal/src/crypto.js");
var import_sender_message_key = require("./sender-message-key.js");
class SenderChainKey {
  constructor(iteration, chainKey) {
    this.MESSAGE_KEY_SEED = Buffer.from([1]);
    this.CHAIN_KEY_SEED = Buffer.from([2]);
    this.iteration = iteration;
    this.chainKey = Buffer.from(chainKey);
  }
  getIteration() {
    return this.iteration;
  }
  getSenderMessageKey() {
    return new import_sender_message_key.SenderMessageKey(this.iteration, this.getDerivative(this.MESSAGE_KEY_SEED, this.chainKey));
  }
  getNext() {
    return new SenderChainKey(this.iteration + 1, this.getDerivative(this.CHAIN_KEY_SEED, this.chainKey));
  }
  getSeed() {
    return this.chainKey;
  }
  getDerivative(seed, key) {
    return (0, import_crypto.calculateMAC)(key, seed);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SenderChainKey
});
