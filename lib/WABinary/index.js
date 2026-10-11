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
var WABinary_exports = {};
module.exports = __toCommonJS(WABinary_exports);
__reExport(WABinary_exports, require("./encode.js"), module.exports);
__reExport(WABinary_exports, require("./decode.js"), module.exports);
__reExport(WABinary_exports, require("./generic-utils.js"), module.exports);
__reExport(WABinary_exports, require("./jid-utils.js"), module.exports);
__reExport(WABinary_exports, require("./types.js"), module.exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ...require("./encode.js"),
  ...require("./decode.js"),
  ...require("./generic-utils.js"),
  ...require("./jid-utils.js"),
  ...require("./types.js")
});
