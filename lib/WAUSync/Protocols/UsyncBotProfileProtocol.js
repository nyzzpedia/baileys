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
var UsyncBotProfileProtocol_exports = {};
__export(UsyncBotProfileProtocol_exports, {
  USyncBotProfileProtocol: () => USyncBotProfileProtocol
});
module.exports = __toCommonJS(UsyncBotProfileProtocol_exports);
var import_WABinary = require("../../WABinary/index.js");
var import_USyncUser = require("../USyncUser.js");
class USyncBotProfileProtocol {
  constructor() {
    this.name = "bot";
  }
  getQueryElement() {
    return {
      tag: "bot",
      attrs: {},
      content: [{ tag: "profile", attrs: { v: "1" } }]
    };
  }
  getUserElement(user) {
    return {
      tag: "bot",
      attrs: {},
      content: [{ tag: "profile", attrs: { persona_id: user.personaId } }]
    };
  }
  parser(node) {
    const botNode = (0, import_WABinary.getBinaryNodeChild)(node, "bot");
    const profile = (0, import_WABinary.getBinaryNodeChild)(botNode, "profile");
    const commandsNode = (0, import_WABinary.getBinaryNodeChild)(profile, "commands");
    const promptsNode = (0, import_WABinary.getBinaryNodeChild)(profile, "prompts");
    const commands = [];
    const prompts = [];
    for (const command of (0, import_WABinary.getBinaryNodeChildren)(commandsNode, "command")) {
      commands.push({
        name: (0, import_WABinary.getBinaryNodeChildString)(command, "name"),
        description: (0, import_WABinary.getBinaryNodeChildString)(command, "description")
      });
    }
    for (const prompt of (0, import_WABinary.getBinaryNodeChildren)(promptsNode, "prompt")) {
      prompts.push(`${(0, import_WABinary.getBinaryNodeChildString)(prompt, "emoji")} ${(0, import_WABinary.getBinaryNodeChildString)(prompt, "text")}`);
    }
    return {
      isDefault: !!(0, import_WABinary.getBinaryNodeChild)(profile, "default"),
      jid: node.attrs.jid,
      name: (0, import_WABinary.getBinaryNodeChildString)(profile, "name"),
      attributes: (0, import_WABinary.getBinaryNodeChildString)(profile, "attributes"),
      description: (0, import_WABinary.getBinaryNodeChildString)(profile, "description"),
      category: (0, import_WABinary.getBinaryNodeChildString)(profile, "category"),
      personaId: profile.attrs["persona_id"],
      commandsDescription: (0, import_WABinary.getBinaryNodeChildString)(commandsNode, "description"),
      commands,
      prompts
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncBotProfileProtocol
});
