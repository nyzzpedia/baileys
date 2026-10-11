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
var sender_message_key_exports = {};
__export(sender_message_key_exports, {
  SenderMessageKey: () => SenderMessageKey
});
module.exports = __toCommonJS(sender_message_key_exports);
var import_crypto = require("../../../vendor/libsignal/src/crypto.js");
class SenderMessageKey {
  constructor(iteration, seed) {
    const derivative = (0, import_crypto.deriveSecrets)(seed, Buffer.alloc(32), Buffer.from("WhisperGroup"));
    const keys = new Uint8Array(32);
    keys.set(new Uint8Array(derivative[0].slice(16)));
    keys.set(new Uint8Array(derivative[1].slice(0, 16)), 16);
    this.iv = Buffer.from(derivative[0].slice(0, 16));
    this.cipherKey = Buffer.from(keys.buffer);
    this.iteration = iteration;
    this.seed = seed;
  }
  getIteration() {
    return this.iteration;
  }
  getIv() {
    return this.iv;
  }
  getCipherKey() {
    return this.cipherKey;
  }
  getSeed() {
    return this.seed;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SenderMessageKey
});
