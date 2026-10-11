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
var USyncUser_exports = {};
__export(USyncUser_exports, {
  USyncUser: () => USyncUser
});
module.exports = __toCommonJS(USyncUser_exports);
class USyncUser {
  withId(id) {
    this.id = id;
    return this;
  }
  withLid(lid) {
    this.lid = lid;
    return this;
  }
  withPhone(phone) {
    this.phone = phone;
    return this;
  }
  withUsername(username) {
    this.username = username;
    return this;
  }
  withUsernameKey(usernameKey) {
    this.usernameKey = usernameKey;
    return this;
  }
  withType(type) {
    this.type = type;
    return this;
  }
  withPersonaId(personaId) {
    this.personaId = personaId;
    return this;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  USyncUser
});
