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
var companion_reg_client_utils_exports = {};
__export(companion_reg_client_utils_exports, {
  CompanionWebClientType: () => CompanionWebClientType,
  buildPairingQRData: () => buildPairingQRData,
  getCompanionPlatformId: () => getCompanionPlatformId,
  getCompanionWebClientType: () => getCompanionWebClientType
});
module.exports = __toCommonJS(companion_reg_client_utils_exports);
var CompanionWebClientType;
(function(CompanionWebClientType2) {
  CompanionWebClientType2[CompanionWebClientType2["UNKNOWN"] = 0] = "UNKNOWN";
  CompanionWebClientType2[CompanionWebClientType2["CHROME"] = 1] = "CHROME";
  CompanionWebClientType2[CompanionWebClientType2["EDGE"] = 2] = "EDGE";
  CompanionWebClientType2[CompanionWebClientType2["FIREFOX"] = 3] = "FIREFOX";
  CompanionWebClientType2[CompanionWebClientType2["IE"] = 4] = "IE";
  CompanionWebClientType2[CompanionWebClientType2["OPERA"] = 5] = "OPERA";
  CompanionWebClientType2[CompanionWebClientType2["SAFARI"] = 6] = "SAFARI";
  CompanionWebClientType2[CompanionWebClientType2["ELECTRON"] = 7] = "ELECTRON";
  CompanionWebClientType2[CompanionWebClientType2["UWP"] = 8] = "UWP";
  CompanionWebClientType2[CompanionWebClientType2["OTHER_WEB_CLIENT"] = 9] = "OTHER_WEB_CLIENT";
})(CompanionWebClientType || (CompanionWebClientType = {}));
const BROWSER_TO_COMPANION_WEB_CLIENT = {
  Chrome: CompanionWebClientType.CHROME,
  Edge: CompanionWebClientType.EDGE,
  Firefox: CompanionWebClientType.FIREFOX,
  IE: CompanionWebClientType.IE,
  Opera: CompanionWebClientType.OPERA,
  Safari: CompanionWebClientType.SAFARI
};
const getCompanionWebClientType = ([os, browserName]) => {
  if (browserName === "Desktop") {
    return os === "Windows" ? CompanionWebClientType.UWP : CompanionWebClientType.ELECTRON;
  }
  return BROWSER_TO_COMPANION_WEB_CLIENT[browserName] || CompanionWebClientType.OTHER_WEB_CLIENT;
};
const getCompanionPlatformId = (browser) => {
  return getCompanionWebClientType(browser).toString();
};
const buildPairingQRData = (ref, noiseKeyB64, identityKeyB64, advB64, browser) => {
  return "https://wa.me/settings/linked_devices#" + [ref, noiseKeyB64, identityKeyB64, advB64, getCompanionPlatformId(browser)].join(",");
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CompanionWebClientType,
  buildPairingQRData,
  getCompanionPlatformId,
  getCompanionWebClientType
});
