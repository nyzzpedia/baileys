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
var browser_utils_exports = {};
__export(browser_utils_exports, {
  Browsers: () => Browsers,
  getPlatformId: () => getPlatformId
});
module.exports = __toCommonJS(browser_utils_exports);
var import_os = require("os");
var import_WAProto = require("../../WAProto/index.js");
const PLATFORM_MAP = {
  aix: "AIX",
  darwin: "Mac OS",
  win32: "Windows",
  android: "Android",
  freebsd: "FreeBSD",
  openbsd: "OpenBSD",
  sunos: "Solaris",
  linux: void 0,
  haiku: void 0,
  cygwin: void 0,
  netbsd: void 0
};
const __appropriate = (browser) => [PLATFORM_MAP[(0, import_os.platform)()] || "Ubuntu", browser, (0, import_os.release)()];
const Browsers = Object.assign((browser) => __appropriate(browser), {
  ubuntu: (browser) => ["Ubuntu", browser, "22.04.4"],
  macOS: (browser) => ["Mac OS", browser, "14.4.1"],
  baileys: (browser) => ["Baileys", browser, "6.5.0"],
  windows: (browser) => ["Windows", browser, "10.0.22631"],
  android: (browser) => [browser, "Android", ""],
  /** The appropriate browser based on your OS & release */
  appropriate: __appropriate
});
const getPlatformId = (browser) => {
  const platformType = import_WAProto.proto.DeviceProps.PlatformType[browser.toUpperCase()];
  return platformType ? platformType.toString() : "1";
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Browsers,
  getPlatformId
});
