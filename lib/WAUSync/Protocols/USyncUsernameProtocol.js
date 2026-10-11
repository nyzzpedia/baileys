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
var USyncUsernameProtocol_exports = {};
__export(USyncUsernameProtocol_exports, {
  USyncUsernameProtocol: () => USyncUsernameProtocol
});
module.exports = __toCommonJS(USyncUsernameProtocol_exports);
var import_WABinary = require("../../WABinary/index.js");
var import_USyncUser = require("../USyncUser.js");
class USyncUsernameProtocol {
  constructor() {
    this.name = "username";
  }
  getQueryElement() {
    return {
      tag: "username",
      attrs: {}
    };
  }
  getUserElement(user) {
    void user;
    return null;
  }
  parser(node) {
    if (node.tag === "username") {
      (0, import_WABinary.assertNodeErrorFree)(node);
      return typeof node.content === "string" ? node.content : null;
    }
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncUsernameProtocol
});
