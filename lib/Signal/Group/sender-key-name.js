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
var sender_key_name_exports = {};
__export(sender_key_name_exports, {
  SenderKeyName: () => SenderKeyName
});
module.exports = __toCommonJS(sender_key_name_exports);
function isNull(str) {
  return str === null || str === "";
}
function intValue(num) {
  const MAX_VALUE = 2147483647;
  const MIN_VALUE = -2147483648;
  if (num > MAX_VALUE || num < MIN_VALUE) {
    return num & 4294967295;
  }
  return num;
}
function hashCode(strKey) {
  let hash = 0;
  if (!isNull(strKey)) {
    for (let i = 0; i < strKey.length; i++) {
      hash = hash * 31 + strKey.charCodeAt(i);
      hash = intValue(hash);
    }
  }
  return hash;
}
class SenderKeyName {
  constructor(groupId, sender) {
    this.groupId = groupId;
    this.sender = sender;
  }
  getGroupId() {
    return this.groupId;
  }
  getSender() {
    return this.sender;
  }
  serialize() {
    return `${this.groupId}::${this.sender.id}::${this.sender.deviceId}`;
  }
  toString() {
    return this.serialize();
  }
  equals(other) {
    if (other === null)
      return false;
    return this.groupId === other.groupId && this.sender.toString() === other.sender.toString();
  }
  hashCode() {
    return hashCode(this.groupId) ^ hashCode(this.sender.toString());
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SenderKeyName
});
