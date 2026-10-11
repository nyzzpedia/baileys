var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var group_session_builder_exports = {};
__export(group_session_builder_exports, {
  GroupSessionBuilder: () => GroupSessionBuilder
});
module.exports = __toCommonJS(group_session_builder_exports);
var keyhelper = __toESM(require("./keyhelper.js"));
var import_sender_key_distribution_message = require("./sender-key-distribution-message.js");
var import_sender_key_name = require("./sender-key-name.js");
var import_sender_key_record = require("./sender-key-record.js");
class GroupSessionBuilder {
  constructor(senderKeyStore) {
    this.senderKeyStore = senderKeyStore;
  }
  async process(senderKeyName, senderKeyDistributionMessage) {
    const senderKeyRecord = await this.senderKeyStore.loadSenderKey(senderKeyName);
    senderKeyRecord.addSenderKeyState(senderKeyDistributionMessage.getId(), senderKeyDistributionMessage.getIteration(), senderKeyDistributionMessage.getChainKey(), senderKeyDistributionMessage.getSignatureKey());
    await this.senderKeyStore.storeSenderKey(senderKeyName, senderKeyRecord);
  }
  async create(senderKeyName) {
    const senderKeyRecord = await this.senderKeyStore.loadSenderKey(senderKeyName);
    if (senderKeyRecord.isEmpty()) {
      const keyId = keyhelper.generateSenderKeyId();
      const senderKey = keyhelper.generateSenderKey();
      const signingKey = keyhelper.generateSenderSigningKey();
      senderKeyRecord.setSenderKeyState(keyId, 0, senderKey, signingKey);
      await this.senderKeyStore.storeSenderKey(senderKeyName, senderKeyRecord);
    }
    const state = senderKeyRecord.getSenderKeyState();
    if (!state) {
      throw new Error("No session state available");
    }
    return new import_sender_key_distribution_message.SenderKeyDistributionMessage(state.getKeyId(), state.getSenderChainKey().getIteration(), state.getSenderChainKey().getSeed(), state.getSigningKeyPublic());
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GroupSessionBuilder
});
