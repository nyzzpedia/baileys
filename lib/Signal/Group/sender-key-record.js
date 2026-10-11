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
var sender_key_record_exports = {};
__export(sender_key_record_exports, {
  SenderKeyRecord: () => SenderKeyRecord
});
module.exports = __toCommonJS(sender_key_record_exports);
var import_generics = require("../../Utils/generics.js");
var import_sender_key_state = require("./sender-key-state.js");
class SenderKeyRecord {
  constructor(serialized) {
    this.MAX_STATES = 5;
    this.senderKeyStates = [];
    if (serialized) {
      for (const structure of serialized) {
        this.senderKeyStates.push(new import_sender_key_state.SenderKeyState(null, null, null, null, null, null, structure));
      }
    }
  }
  isEmpty() {
    return this.senderKeyStates.length === 0;
  }
  getSenderKeyState(keyId) {
    if (keyId === void 0 && this.senderKeyStates.length) {
      return this.senderKeyStates[this.senderKeyStates.length - 1];
    }
    return this.senderKeyStates.find((state) => state.getKeyId() === keyId);
  }
  addSenderKeyState(id, iteration, chainKey, signatureKey) {
    this.senderKeyStates.push(new import_sender_key_state.SenderKeyState(id, iteration, chainKey, null, signatureKey));
    if (this.senderKeyStates.length > this.MAX_STATES) {
      this.senderKeyStates.shift();
    }
  }
  setSenderKeyState(id, iteration, chainKey, keyPair) {
    this.senderKeyStates.length = 0;
    this.senderKeyStates.push(new import_sender_key_state.SenderKeyState(id, iteration, chainKey, keyPair));
  }
  serialize() {
    return this.senderKeyStates.map((state) => state.getStructure());
  }
  static deserialize(data) {
    const str = Buffer.from(data).toString("utf-8");
    const parsed = JSON.parse(str, import_generics.BufferJSON.reviver);
    return new SenderKeyRecord(parsed);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SenderKeyRecord
});
