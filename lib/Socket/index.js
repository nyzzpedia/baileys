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
var Socket_exports = {};
__export(Socket_exports, {
  default: () => Socket_default
});
module.exports = __toCommonJS(Socket_exports);
var import_Defaults = require("../Defaults/index.js");
var import_communities = require("./communities.js");
const makeWASocket = (config) => {
  const newConfig = {
    ...import_Defaults.DEFAULT_CONNECTION_CONFIG,
    ...config
  };
  return (0, import_communities.makeCommunitiesSocket)(newConfig);
};
var Socket_default = makeWASocket;
