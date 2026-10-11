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
var Group_exports = {};
__export(Group_exports, {
  CiphertextMessage: () => import_ciphertext_message.CiphertextMessage,
  GroupCipher: () => import_group_cipher.GroupCipher,
  GroupSessionBuilder: () => import_group_session_builder.GroupSessionBuilder,
  SenderChainKey: () => import_sender_chain_key.SenderChainKey,
  SenderKeyDistributionMessage: () => import_sender_key_distribution_message.SenderKeyDistributionMessage,
  SenderKeyMessage: () => import_sender_key_message.SenderKeyMessage,
  SenderKeyName: () => import_sender_key_name.SenderKeyName,
  SenderKeyRecord: () => import_sender_key_record.SenderKeyRecord,
  SenderKeyState: () => import_sender_key_state.SenderKeyState,
  SenderMessageKey: () => import_sender_message_key.SenderMessageKey,
  keyhelper: () => keyhelper
});
module.exports = __toCommonJS(Group_exports);
var import_group_session_builder = require("./group-session-builder.js");
var import_sender_key_distribution_message = require("./sender-key-distribution-message.js");
var import_sender_key_record = require("./sender-key-record.js");
var import_sender_key_name = require("./sender-key-name.js");
var import_group_cipher = require("./group_cipher.js");
var import_sender_key_state = require("./sender-key-state.js");
var import_sender_key_message = require("./sender-key-message.js");
var import_sender_message_key = require("./sender-message-key.js");
var import_sender_chain_key = require("./sender-chain-key.js");
var import_ciphertext_message = require("./ciphertext-message.js");
var keyhelper = __toESM(require("./keyhelper.js"));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CiphertextMessage,
  GroupCipher,
  GroupSessionBuilder,
  SenderChainKey,
  SenderKeyDistributionMessage,
  SenderKeyMessage,
  SenderKeyName,
  SenderKeyRecord,
  SenderKeyState,
  SenderMessageKey,
  keyhelper
});
