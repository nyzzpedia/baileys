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
var lt_hash_exports = {};
__export(lt_hash_exports, {
  LT_HASH_ANTI_TAMPERING: () => LT_HASH_ANTI_TAMPERING
});
module.exports = __toCommonJS(lt_hash_exports);
var import_crypto = require("./crypto.js");
const HASH_LEN = 128;
class LTHash {
  constructor(salt) {
    this.salt = salt;
  }
  _expand(item) {
    return (0, import_crypto.hkdf)(Buffer.from(item), HASH_LEN, { info: this.salt });
  }
  _apply(base, items, fn) {
    let cur = new Uint8Array(base);
    for (const item of items) {
      const other = this._expand(item);
      const a = new DataView(cur.buffer, cur.byteOffset, cur.byteLength);
      const b = new DataView(other.buffer, other.byteOffset, other.byteLength);
      const out = new Uint8Array(cur.byteLength);
      const o = new DataView(out.buffer);
      for (let i = 0; i < cur.byteLength; i += 2) o.setUint16(i, fn(a.getUint16(i, true), b.getUint16(i, true)), true);
      cur = out;
    }
    return cur;
  }
  add(base, items) {
    return this._apply(base, items, (x, y) => x + y);
  }
  subtract(base, items) {
    return this._apply(base, items, (x, y) => x - y);
  }
  subtractThenAdd(base, subtractItems, addItems) {
    return this.add(this.subtract(base, subtractItems), addItems);
  }
}
const LT_HASH_ANTI_TAMPERING = new LTHash("WhatsApp Patch Integrity");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LT_HASH_ANTI_TAMPERING
});
