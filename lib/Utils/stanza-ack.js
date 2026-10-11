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
var stanza_ack_exports = {};
__export(stanza_ack_exports, {
  buildAckStanza: () => buildAckStanza
});
module.exports = __toCommonJS(stanza_ack_exports);
function buildAckStanza(node, errorCode, meId) {
  const { tag, attrs } = node;
  const stanza = {
    tag: "ack",
    attrs: {
      id: attrs.id,
      to: attrs.from,
      class: tag
    }
  };
  if (errorCode) {
    stanza.attrs.error = errorCode.toString();
  }
  if (attrs.participant) {
    stanza.attrs.participant = attrs.participant;
  }
  if (attrs.recipient) {
    stanza.attrs.recipient = attrs.recipient;
  }
  if (attrs.type) {
    stanza.attrs.type = attrs.type;
  }
  if (tag === "message" && meId) {
    stanza.attrs.from = meId;
  }
  return stanza;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildAckStanza
});
