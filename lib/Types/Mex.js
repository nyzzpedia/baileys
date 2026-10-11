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
var Mex_exports = {};
__export(Mex_exports, {
  QueryIds: () => QueryIds,
  XWAPaths: () => XWAPaths
});
module.exports = __toCommonJS(Mex_exports);
var XWAPaths;
(function(XWAPaths2) {
  XWAPaths2["xwa2_newsletter_create"] = "xwa2_newsletter_create";
  XWAPaths2["xwa2_newsletter_subscribers"] = "xwa2_newsletter_subscribers";
  XWAPaths2["xwa2_newsletter_view"] = "xwa2_newsletter_view";
  XWAPaths2["xwa2_newsletter_metadata"] = "xwa2_newsletter";
  XWAPaths2["xwa2_newsletter_admin_count"] = "xwa2_newsletter_admin";
  XWAPaths2["xwa2_newsletter_mute_v2"] = "xwa2_newsletter_mute_v2";
  XWAPaths2["xwa2_newsletter_unmute_v2"] = "xwa2_newsletter_unmute_v2";
  XWAPaths2["xwa2_newsletter_follow"] = "xwa2_newsletter_follow";
  XWAPaths2["xwa2_newsletter_unfollow"] = "xwa2_newsletter_unfollow";
  XWAPaths2["xwa2_newsletter_join_v2"] = "xwa2_newsletter_join_v2";
  XWAPaths2["xwa2_newsletter_leave_v2"] = "xwa2_newsletter_leave_v2";
  XWAPaths2["xwa2_newsletter_change_owner"] = "xwa2_newsletter_change_owner";
  XWAPaths2["xwa2_newsletter_demote"] = "xwa2_newsletter_demote";
  XWAPaths2["xwa2_newsletter_delete_v2"] = "xwa2_newsletter_delete_v2";
  XWAPaths2["xwa2_fetch_account_reachout_timelock"] = "xwa2_fetch_account_reachout_timelock";
  XWAPaths2["xwa2_message_capping_info"] = "xwa2_message_capping_info";
})(XWAPaths || (XWAPaths = {}));
var QueryIds;
(function(QueryIds2) {
  QueryIds2["CREATE"] = "8823471724422422";
  QueryIds2["UPDATE_METADATA"] = "24250201037901610";
  QueryIds2["METADATA"] = "6563316087068696";
  QueryIds2["SUBSCRIBERS"] = "9783111038412085";
  QueryIds2["FOLLOW"] = "24404358912487870";
  QueryIds2["UNFOLLOW"] = "9767147403369991";
  QueryIds2["MUTE"] = "29766401636284406";
  QueryIds2["UNMUTE"] = "9864994326891137";
  QueryIds2["ADMIN_COUNT"] = "7130823597031706";
  QueryIds2["CHANGE_OWNER"] = "7341777602580933";
  QueryIds2["DEMOTE"] = "6551828931592903";
  QueryIds2["DELETE"] = "30062808666639665";
  QueryIds2["REACHOUT_TIMELOCK"] = "23983697327930364";
  QueryIds2["MESSAGE_CAPPING_INFO"] = "24503548349331633";
})(QueryIds || (QueryIds = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  QueryIds,
  XWAPaths
});
