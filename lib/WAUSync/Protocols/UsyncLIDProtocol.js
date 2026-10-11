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
var UsyncLIDProtocol_exports = {};
__export(UsyncLIDProtocol_exports, {
  USyncLIDProtocol: () => USyncLIDProtocol
});
module.exports = __toCommonJS(UsyncLIDProtocol_exports);
class USyncLIDProtocol {
  constructor() {
    this.name = "lid";
  }
  getQueryElement() {
    return {
      tag: "lid",
      attrs: {}
    };
  }
  getUserElement(user) {
    if (user.lid) {
      return {
        tag: "lid",
        attrs: { jid: user.lid }
      };
    } else {
      return null;
    }
  }
  parser(node) {
    if (node.tag === "lid") {
      return node.attrs.val;
    }
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncLIDProtocol
});
