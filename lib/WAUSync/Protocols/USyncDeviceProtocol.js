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
var USyncDeviceProtocol_exports = {};
__export(USyncDeviceProtocol_exports, {
  USyncDeviceProtocol: () => USyncDeviceProtocol
});
module.exports = __toCommonJS(USyncDeviceProtocol_exports);
var import_WABinary = require("../../WABinary/index.js");
class USyncDeviceProtocol {
  constructor() {
    this.name = "devices";
  }
  getQueryElement() {
    return {
      tag: "devices",
      attrs: {
        version: "2"
      }
    };
  }
  getUserElement() {
    return null;
  }
  parser(node) {
    const deviceList = [];
    let keyIndex = void 0;
    if (node.tag === "devices") {
      (0, import_WABinary.assertNodeErrorFree)(node);
      const deviceListNode = (0, import_WABinary.getBinaryNodeChild)(node, "device-list");
      const keyIndexNode = (0, import_WABinary.getBinaryNodeChild)(node, "key-index-list");
      if (Array.isArray(deviceListNode?.content)) {
        for (const { tag, attrs } of deviceListNode.content) {
          const id = +attrs.id;
          const keyIndex2 = +attrs["key-index"];
          if (tag === "device") {
            deviceList.push({
              id,
              keyIndex: keyIndex2,
              isHosted: !!(attrs["is_hosted"] && attrs["is_hosted"] === "true")
            });
          }
        }
      }
      if (keyIndexNode?.tag === "key-index-list") {
        keyIndex = {
          timestamp: +keyIndexNode.attrs["ts"],
          signedKeyIndex: keyIndexNode?.content,
          expectedTimestamp: keyIndexNode.attrs["expected_ts"] ? +keyIndexNode.attrs["expected_ts"] : void 0
        };
      }
    }
    return {
      deviceList,
      keyIndex
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncDeviceProtocol
});
