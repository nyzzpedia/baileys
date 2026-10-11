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
var USyncStatusProtocol_exports = {};
__export(USyncStatusProtocol_exports, {
  USyncStatusProtocol: () => USyncStatusProtocol
});
module.exports = __toCommonJS(USyncStatusProtocol_exports);
var import_WABinary = require("../../WABinary/index.js");
class USyncStatusProtocol {
  constructor() {
    this.name = "status";
  }
  getQueryElement() {
    return {
      tag: "status",
      attrs: {}
    };
  }
  getUserElement() {
    return null;
  }
  parser(node) {
    if (node.tag === "status") {
      (0, import_WABinary.assertNodeErrorFree)(node);
      let status = node?.content?.toString() ?? null;
      const setAt = new Date(+(node?.attrs.t || 0) * 1e3);
      if (!status) {
        if (node.attrs?.code && +node.attrs.code === 401) {
          status = "";
        } else {
          status = null;
        }
      } else if (typeof status === "string" && status.length === 0) {
        status = null;
      }
      return {
        status,
        setAt
      };
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncStatusProtocol
});
