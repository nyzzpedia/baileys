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
var sender_key_distribution_message_exports = {};
__export(sender_key_distribution_message_exports, {
  SenderKeyDistributionMessage: () => SenderKeyDistributionMessage
});
module.exports = __toCommonJS(sender_key_distribution_message_exports);
var import_WAProto = require("../../../WAProto/index.js");
var import_ciphertext_message = require("./ciphertext-message.js");
class SenderKeyDistributionMessage extends import_ciphertext_message.CiphertextMessage {
  constructor(id, iteration, chainKey, signatureKey, serialized) {
    super();
    if (serialized) {
      try {
        const message = serialized.slice(1);
        const distributionMessage = import_WAProto.proto.SenderKeyDistributionMessage.decode(message).toJSON();
        this.serialized = serialized;
        this.id = distributionMessage.id;
        this.iteration = distributionMessage.iteration;
        this.chainKey = typeof distributionMessage.chainKey === "string" ? Buffer.from(distributionMessage.chainKey, "base64") : distributionMessage.chainKey;
        this.signatureKey = typeof distributionMessage.signingKey === "string" ? Buffer.from(distributionMessage.signingKey, "base64") : distributionMessage.signingKey;
      } catch (e) {
        throw new Error(String(e));
      }
    } else {
      const version = this.intsToByteHighAndLow(this.CURRENT_VERSION, this.CURRENT_VERSION);
      this.id = id;
      this.iteration = iteration;
      this.chainKey = chainKey;
      this.signatureKey = signatureKey;
      const message = import_WAProto.proto.SenderKeyDistributionMessage.encode(import_WAProto.proto.SenderKeyDistributionMessage.create({
        id,
        iteration,
        chainKey,
        signingKey: this.signatureKey
      })).finish();
      this.serialized = Buffer.concat([Buffer.from([version]), message]);
    }
  }
  intsToByteHighAndLow(highValue, lowValue) {
    return ((highValue << 4 | lowValue) & 255) % 256;
  }
  serialize() {
    return this.serialized;
  }
  getType() {
    return this.SENDERKEY_DISTRIBUTION_TYPE;
  }
  getIteration() {
    return this.iteration;
  }
  getChainKey() {
    return this.chainKey;
  }
  getSignatureKey() {
    return this.signatureKey;
  }
  getId() {
    return this.id;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SenderKeyDistributionMessage
});
