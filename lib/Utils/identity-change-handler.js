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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var identity_change_handler_exports = {};
__export(identity_change_handler_exports, {
  handleIdentityChange: () => handleIdentityChange
});
module.exports = __toCommonJS(identity_change_handler_exports);
var import_node_cache = __toESM(require("@cacheable/node-cache"));
var import_WABinary = require("../WABinary/index.js");
var import_generics = require("./generics.js");
async function handleIdentityChange(node, ctx) {
  const from = node.attrs.from;
  if (!from) {
    return { action: "invalid_notification" };
  }
  const identityNode = (0, import_WABinary.getBinaryNodeChild)(node, "identity");
  if (!identityNode) {
    return { action: "no_identity_node" };
  }
  ctx.logger.info({ jid: from }, "identity changed");
  const decoded = (0, import_WABinary.jidDecode)(from);
  if (decoded?.device && decoded.device !== 0) {
    ctx.logger.debug({ jid: from, device: decoded.device }, "ignoring identity change from companion device");
    return { action: "skipped_companion_device", device: decoded.device };
  }
  const isSelfPrimary = ctx.meId && ((0, import_WABinary.areJidsSameUser)(from, ctx.meId) || ctx.meLid && (0, import_WABinary.areJidsSameUser)(from, ctx.meLid));
  if (isSelfPrimary) {
    ctx.logger.info({ jid: from }, "self primary identity changed");
    return { action: "skipped_self_primary" };
  }
  if (ctx.debounceCache.get(from)) {
    ctx.logger.debug({ jid: from }, "skipping identity assert (debounced)");
    return { action: "debounced" };
  }
  ctx.debounceCache.set(from, true);
  const isOfflineNotification = !(0, import_generics.isStringNullOrEmpty)(node.attrs.offline);
  const hasExistingSession = await ctx.validateSession(from);
  if (!hasExistingSession.exists) {
    ctx.logger.debug({ jid: from }, "no old session, skipping session refresh");
    return { action: "skipped_no_session" };
  }
  ctx.logger.debug({ jid: from }, "old session exists, will refresh session");
  if (isOfflineNotification) {
    ctx.logger.debug({ jid: from }, "skipping session refresh during offline processing");
    return { action: "skipped_offline" };
  }
  ctx.onBeforeSessionRefresh?.(from);
  try {
    await ctx.assertSessions([from], true);
    return { action: "session_refreshed" };
  } catch (error) {
    ctx.logger.warn({ error, jid: from }, "failed to assert sessions after identity change");
    return { action: "session_refresh_failed", error };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handleIdentityChange
});
