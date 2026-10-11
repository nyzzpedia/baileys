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
var USyncContactProtocol_exports = {};
__export(USyncContactProtocol_exports, {
  USyncContactProtocol: () => USyncContactProtocol
});
module.exports = __toCommonJS(USyncContactProtocol_exports);
var import_WABinary = require("../../WABinary/index.js");
var import_USyncUser = require("../USyncUser.js");
class USyncContactProtocol {
  constructor() {
    this.name = "contact";
  }
  getQueryElement() {
    return {
      tag: "contact",
      attrs: {}
    };
  }
  getUserElement(user) {
    if (user.phone) {
      return {
        tag: "contact",
        attrs: {},
        content: user.phone
      };
    }
    if (user.username) {
      return {
        tag: "contact",
        attrs: {
          username: user.username,
          ...user.usernameKey ? { pin: user.usernameKey } : {},
          ...user.lid ? { lid: user.lid } : {}
        }
      };
    }
    if (user.type) {
      return {
        tag: "contact",
        attrs: {
          type: user.type
        }
      };
    }
    return {
      tag: "contact",
      attrs: {}
    };
  }
  parser(node) {
    if (node.tag === "contact") {
      (0, import_WABinary.assertNodeErrorFree)(node);
      return node?.attrs?.type === "in";
    }
    return false;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncContactProtocol
});
