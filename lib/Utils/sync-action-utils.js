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
var sync_action_utils_exports = {};
__export(sync_action_utils_exports, {
  emitSyncActionResults: () => emitSyncActionResults,
  processContactAction: () => processContactAction
});
module.exports = __toCommonJS(sync_action_utils_exports);
var import_WAProto = require("../../WAProto/index.js");
var import_WABinary = require("../WABinary/index.js");
const processContactAction = (action, id, logger) => {
  const results = [];
  if (!id) {
    logger?.warn({ hasFullName: !!action.fullName, hasLidJid: !!action.lidJid, hasPnJid: !!action.pnJid }, "contactAction sync: missing id in index");
    return results;
  }
  const lidJid = action.lidJid;
  const idIsPn = (0, import_WABinary.isPnUser)(id);
  const phoneNumber = idIsPn ? id : action.pnJid || void 0;
  results.push({
    event: "contacts.upsert",
    data: [
      {
        id,
        name: action.fullName || action.firstName || action.username || void 0,
        username: action.username || void 0,
        lid: lidJid || void 0,
        phoneNumber
      }
    ]
  });
  if (lidJid && (0, import_WABinary.isLidUser)(lidJid) && idIsPn) {
    results.push({
      event: "lid-mapping.update",
      data: { lid: lidJid, pn: id }
    });
  }
  return results;
};
const emitSyncActionResults = (ev, results) => {
  for (const result of results) {
    if (result.event === "contacts.upsert") {
      ev.emit("contacts.upsert", result.data);
    } else {
      ev.emit("lid-mapping.update", result.data);
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  emitSyncActionResults,
  processContactAction
});
