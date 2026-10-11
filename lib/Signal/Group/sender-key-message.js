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
var sender_key_message_exports = {};
__export(sender_key_message_exports, {
  SenderKeyMessage: () => SenderKeyMessage
});
module.exports = __toCommonJS(sender_key_message_exports);
var import_curve = require("../../../vendor/libsignal/src/curve.js");
var import_WAProto = require("../../../WAProto/index.js");
var import_ciphertext_message = require("./ciphertext-message.js");
class SenderKeyMessage extends import_ciphertext_message.CiphertextMessage {
  constructor(keyId, iteration, ciphertext, signatureKey, serialized) {
    super();
    this.SIGNATURE_LENGTH = 64;
    if (serialized) {
      const version = serialized[0];
      const message = serialized.slice(1, serialized.length - this.SIGNATURE_LENGTH);
      const signature = serialized.slice(-1 * this.SIGNATURE_LENGTH);
      const senderKeyMessage = import_WAProto.proto.SenderKeyMessage.decode(message).toJSON();
      this.serialized = serialized;
      this.messageVersion = (version & 255) >> 4;
      this.keyId = senderKeyMessage.id;
      this.iteration = senderKeyMessage.iteration;
      this.ciphertext = typeof senderKeyMessage.ciphertext === "string" ? Buffer.from(senderKeyMessage.ciphertext, "base64") : senderKeyMessage.ciphertext;
      this.signature = signature;
    } else {
      const version = ((this.CURRENT_VERSION << 4 | this.CURRENT_VERSION) & 255) % 256;
      const ciphertextBuffer = Buffer.from(ciphertext);
      const message = import_WAProto.proto.SenderKeyMessage.encode(import_WAProto.proto.SenderKeyMessage.create({
        id: keyId,
        iteration,
        ciphertext: ciphertextBuffer
      })).finish();
      const signature = this.getSignature(signatureKey, Buffer.concat([Buffer.from([version]), message]));
      this.serialized = Buffer.concat([Buffer.from([version]), message, Buffer.from(signature)]);
      this.messageVersion = this.CURRENT_VERSION;
      this.keyId = keyId;
      this.iteration = iteration;
      this.ciphertext = ciphertextBuffer;
      this.signature = signature;
    }
  }
  getKeyId() {
    return this.keyId;
  }
  getIteration() {
    return this.iteration;
  }
  getCipherText() {
    return this.ciphertext;
  }
  verifySignature(signatureKey) {
    const part1 = this.serialized.slice(0, this.serialized.length - this.SIGNATURE_LENGTH);
    const part2 = this.serialized.slice(-1 * this.SIGNATURE_LENGTH);
    const res = (0, import_curve.verifySignature)(signatureKey, part1, part2);
    if (!res)
      throw new Error("Invalid signature!");
  }
  getSignature(signatureKey, serialized) {
    return Buffer.from((0, import_curve.calculateSignature)(signatureKey, serialized));
  }
  serialize() {
    return this.serialized;
  }
  getType() {
    return 4;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SenderKeyMessage
});
