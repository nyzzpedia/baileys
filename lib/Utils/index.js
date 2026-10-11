var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var Utils_exports = {};
module.exports = __toCommonJS(Utils_exports);
__reExport(Utils_exports, require("./generics.js"), module.exports);
__reExport(Utils_exports, require("./decode-wa-message.js"), module.exports);
__reExport(Utils_exports, require("./messages.js"), module.exports);
__reExport(Utils_exports, require("./messages-media.js"), module.exports);
__reExport(Utils_exports, require("./validate-connection.js"), module.exports);
__reExport(Utils_exports, require("./crypto.js"), module.exports);
__reExport(Utils_exports, require("./signal.js"), module.exports);
__reExport(Utils_exports, require("./noise-handler.js"), module.exports);
__reExport(Utils_exports, require("./history.js"), module.exports);
__reExport(Utils_exports, require("./chat-utils.js"), module.exports);
__reExport(Utils_exports, require("./lt-hash.js"), module.exports);
__reExport(Utils_exports, require("./auth-utils.js"), module.exports);
__reExport(Utils_exports, require("./use-multi-file-auth-state.js"), module.exports);
__reExport(Utils_exports, require("./link-preview.js"), module.exports);
__reExport(Utils_exports, require("./event-buffer.js"), module.exports);
__reExport(Utils_exports, require("./process-message.js"), module.exports);
__reExport(Utils_exports, require("./message-retry-manager.js"), module.exports);
__reExport(Utils_exports, require("./browser-utils.js"), module.exports);
__reExport(Utils_exports, require("./companion-reg-client-utils.js"), module.exports);
__reExport(Utils_exports, require("./identity-change-handler.js"), module.exports);
__reExport(Utils_exports, require("./stanza-ack.js"), module.exports);
__reExport(Utils_exports, require("./baileys-event-stream.js"), module.exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ...require("./generics.js"),
  ...require("./decode-wa-message.js"),
  ...require("./messages.js"),
  ...require("./messages-media.js"),
  ...require("./validate-connection.js"),
  ...require("./crypto.js"),
  ...require("./signal.js"),
  ...require("./noise-handler.js"),
  ...require("./history.js"),
  ...require("./chat-utils.js"),
  ...require("./lt-hash.js"),
  ...require("./auth-utils.js"),
  ...require("./use-multi-file-auth-state.js"),
  ...require("./link-preview.js"),
  ...require("./event-buffer.js"),
  ...require("./process-message.js"),
  ...require("./message-retry-manager.js"),
  ...require("./browser-utils.js"),
  ...require("./companion-reg-client-utils.js"),
  ...require("./identity-change-handler.js"),
  ...require("./stanza-ack.js"),
  ...require("./baileys-event-stream.js")
});
