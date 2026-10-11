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
var USyncQuery_exports = {};
__export(USyncQuery_exports, {
  USyncQuery: () => USyncQuery
});
module.exports = __toCommonJS(USyncQuery_exports);
var import_WABinary = require("../WABinary/index.js");
var import_UsyncBotProfileProtocol = require("./Protocols/UsyncBotProfileProtocol.js");
var import_UsyncLIDProtocol = require("./Protocols/UsyncLIDProtocol.js");
var import_Protocols = require("./Protocols/index.js");
var import_USyncUser = require("./USyncUser.js");
class USyncQuery {
  constructor() {
    this.protocols = [];
    this.users = [];
    this.context = "interactive";
    this.mode = "query";
  }
  withMode(mode) {
    this.mode = mode;
    return this;
  }
  withContext(context) {
    this.context = context;
    return this;
  }
  withUser(user) {
    this.users.push(user);
    return this;
  }
  parseUSyncQueryResult(result) {
    if (result?.attrs.type !== "result") {
      return;
    }
    const protocolMap = Object.fromEntries(this.protocols.map((protocol) => {
      return [protocol.name, protocol.parser];
    }));
    const queryResult = {
      // TODO: implement errors etc.
      list: [],
      sideList: []
    };
    const usyncNode = (0, import_WABinary.getBinaryNodeChild)(result, "usync");
    const listNode = usyncNode ? (0, import_WABinary.getBinaryNodeChild)(usyncNode, "list") : void 0;
    if (listNode?.content && Array.isArray(listNode.content)) {
      queryResult.list = listNode.content.reduce((acc, node) => {
        const id = node?.attrs.jid;
        if (id) {
          const data = Array.isArray(node?.content) ? Object.fromEntries(node.content.map((content) => {
            const protocol = content.tag;
            const parser = protocolMap[protocol];
            if (parser) {
              return [protocol, parser(content)];
            } else {
              return [protocol, null];
            }
          }).filter(([, b]) => b !== null)) : {};
          acc.push({ ...data, id });
        }
        return acc;
      }, []);
    }
    return queryResult;
  }
  withDeviceProtocol() {
    this.protocols.push(new import_Protocols.USyncDeviceProtocol());
    return this;
  }
  withContactProtocol() {
    this.protocols.push(new import_Protocols.USyncContactProtocol());
    return this;
  }
  withStatusProtocol() {
    this.protocols.push(new import_Protocols.USyncStatusProtocol());
    return this;
  }
  withDisappearingModeProtocol() {
    this.protocols.push(new import_Protocols.USyncDisappearingModeProtocol());
    return this;
  }
  withBotProfileProtocol() {
    this.protocols.push(new import_UsyncBotProfileProtocol.USyncBotProfileProtocol());
    return this;
  }
  withLIDProtocol() {
    this.protocols.push(new import_UsyncLIDProtocol.USyncLIDProtocol());
    return this;
  }
  withUsernameProtocol() {
    this.protocols.push(new import_Protocols.USyncUsernameProtocol());
    return this;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncQuery
});
