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
var Message_exports = {};
__export(Message_exports, {
  WAMessageAddressingMode: () => WAMessageAddressingMode,
  WAMessageStatus: () => WAMessageStatus,
  WAMessageStubType: () => WAMessageStubType,
  WAProto: () => import_WAProto.proto
});
module.exports = __toCommonJS(Message_exports);
var import_WAProto = require("../../WAProto/index.js");
const WAMessageStubType = import_WAProto.proto.WebMessageInfo.StubType;
const WAMessageStatus = import_WAProto.proto.WebMessageInfo.Status;
var WAMessageAddressingMode;
(function(WAMessageAddressingMode2) {
  WAMessageAddressingMode2["PN"] = "pn";
  WAMessageAddressingMode2["LID"] = "lid";
})(WAMessageAddressingMode || (WAMessageAddressingMode = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WAMessageAddressingMode,
  WAMessageStatus,
  WAMessageStubType,
  WAProto
});
