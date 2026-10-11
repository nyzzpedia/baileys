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
var ciphertext_message_exports = {};
__export(ciphertext_message_exports, {
  CiphertextMessage: () => CiphertextMessage
});
module.exports = __toCommonJS(ciphertext_message_exports);
class CiphertextMessage {
  constructor() {
    this.UNSUPPORTED_VERSION = 1;
    this.CURRENT_VERSION = 3;
    this.WHISPER_TYPE = 2;
    this.PREKEY_TYPE = 3;
    this.SENDERKEY_TYPE = 4;
    this.SENDERKEY_DISTRIBUTION_TYPE = 5;
    this.ENCRYPTED_MESSAGE_OVERHEAD = 53;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CiphertextMessage
});
