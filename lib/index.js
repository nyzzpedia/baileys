"use strict";

const fs = require("fs");
const path = require("path");

const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
);

const VERSION = packageJson.version;
const PACKAGE_NAME = packageJson.name;

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN_BRIGHT = "\x1b[92m";

function printBaileysBanner() {
    console.clear();

    console.log(BOLD + "\x1b[38;5;196m███╗   ██╗\x1b[38;5;208m██╗   ██╗\x1b[38;5;226m███████╗\x1b[38;5;46m███████╗\x1b[0m");
    console.log(BOLD + "\x1b[38;5;196m████╗  ██║\x1b[38;5;208m╚██╗ ██╔╝\x1b[38;5;226m╚══███╔╝\x1b[38;5;46m╚══███╔╝\x1b[0m");
    console.log(BOLD + "\x1b[38;5;196m██╔██╗ ██║\x1b[38;5;208m ╚████╔╝ \x1b[38;5;226m  ███╔╝ \x1b[38;5;46m  ███╔╝ \x1b[0m");
    console.log(BOLD + "\x1b[38;5;196m██║╚██╗██║\x1b[38;5;208m  ╚██╔╝  \x1b[38;5;226m ███╔╝  \x1b[38;5;46m ███╔╝  \x1b[0m");
    console.log(BOLD + "\x1b[38;5;196m██║ ╚████║\x1b[38;5;208m   ██║   \x1b[38;5;226m███████╗\x1b[38;5;46m███████╗\x1b[0m");
    console.log(BOLD + "\x1b[38;5;196m╚═╝  ╚═══╝\x1b[38;5;208m   ╚═╝   \x1b[38;5;226m╚══════╝\x1b[38;5;46m╚══════╝\x1b[0m");

    console.log();

    console.log(BOLD + "\x1b[38;5;33m██████╗ \x1b[38;5;54m███████╗\x1b[38;5;129m██████╗ \x1b[38;5;196m██╗\x1b[38;5;208m █████╗ \x1b[0m");
    console.log(BOLD + "\x1b[38;5;33m██╔══██╗\x1b[38;5;54m██╔════╝\x1b[38;5;129m██╔══██╗\x1b[38;5;196m██║\x1b[38;5;208m██╔══██╗\x1b[0m");
    console.log(BOLD + "\x1b[38;5;33m██████╔╝\x1b[38;5;54m█████╗  \x1b[38;5;129m██║  ██║\x1b[38;5;196m██║\x1b[38;5;208m███████║\x1b[0m");
    console.log(BOLD + "\x1b[38;5;33m██╔═══╝ \x1b[38;5;54m██╔══╝  \x1b[38;5;129m██║  ██║\x1b[38;5;196m██║\x1b[38;5;208m██╔══██║\x1b[0m");
    console.log(BOLD + "\x1b[38;5;33m██║     \x1b[38;5;54m███████╗\x1b[38;5;129m██████╔╝\x1b[38;5;196m██║\x1b[38;5;208m██║  ██║\x1b[0m");
    console.log(BOLD + "\x1b[38;5;33m╚═╝     \x1b[38;5;54m╚══════╝\x1b[38;5;129m╚═════╝ \x1b[38;5;196m╚═╝\x1b[38;5;208m╚═╝  ╚═╝\x1b[0m");

    console.log();
    console.log(BOLD + GREEN_BRIGHT + "  🚀 Nyzzpedia WhatsApp Engine" + RESET);
    console.log(
        BOLD + GREEN_BRIGHT + `  📦 v${VERSION} — ${PACKAGE_NAME}` + RESET
    );
    console.log();
}

printBaileysBanner();

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var index_exports = {};
__export(index_exports, {
  default: () => index_default,
  makeWASocket: () => import_Socket.default
});
module.exports = __toCommonJS(index_exports);
var import_Socket = __toESM(require("./Socket/index.js"));
__reExport(index_exports, require("../WAProto/index.js"), module.exports);
__reExport(index_exports, require("./Utils/index.js"), module.exports);
__reExport(index_exports, require("./Types/index.js"), module.exports);
__reExport(index_exports, require("./Defaults/index.js"), module.exports);
__reExport(index_exports, require("./WABinary/index.js"), module.exports);
__reExport(index_exports, require("./WAM/index.js"), module.exports);
__reExport(index_exports, require("./WAUSync/index.js"), module.exports);
__reExport(index_exports, require("./Store/index.js"), module.exports);
var index_default = import_Socket.default;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeWASocket,
  ...require("../WAProto/index.js"),
  ...require("./Utils/index.js"),
  ...require("./Types/index.js"),
  ...require("./Defaults/index.js"),
  ...require("./WABinary/index.js"),
  ...require("./WAM/index.js"),
  ...require("./WAUSync/index.js"),
  ...require("./Store/index.js")
});
