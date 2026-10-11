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
var USyncDisappearingModeProtocol_exports = {};
__export(USyncDisappearingModeProtocol_exports, {
  USyncDisappearingModeProtocol: () => USyncDisappearingModeProtocol
});
module.exports = __toCommonJS(USyncDisappearingModeProtocol_exports);
var import_WABinary = require("../../WABinary/index.js");
class USyncDisappearingModeProtocol {
  constructor() {
    this.name = "disappearing_mode";
  }
  getQueryElement() {
    return {
      tag: "disappearing_mode",
      attrs: {}
    };
  }
  getUserElement() {
    return null;
  }
  parser(node) {
    if (node.tag === "disappearing_mode") {
      (0, import_WABinary.assertNodeErrorFree)(node);
      const duration = +node?.attrs.duration;
      const setAt = new Date(+(node?.attrs.t || 0) * 1e3);
      return {
        duration,
        setAt
      };
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncDisappearingModeProtocol
});
