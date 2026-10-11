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
var crypto_exports = {};
__export(crypto_exports, {
  Curve: () => Curve,
  aesDecrypt: () => aesDecrypt,
  aesDecryptCTR: () => aesDecryptCTR,
  aesDecryptGCM: () => aesDecryptGCM,
  aesDecryptWithIV: () => aesDecryptWithIV,
  aesEncrypWithIV: () => aesEncrypWithIV,
  aesEncrypt: () => aesEncrypt,
  aesEncryptCTR: () => aesEncryptCTR,
  aesEncryptGCM: () => aesEncryptGCM,
  derivePairingCodeKey: () => derivePairingCodeKey,
  generateSignalPubKey: () => generateSignalPubKey,
  hkdf: () => hkdf,
  hmacSign: () => hmacSign,
  md5: () => md5,
  sha256: () => sha256,
  signedKeyPair: () => signedKeyPair
});
module.exports = __toCommonJS(crypto_exports);
var import_crypto = require("crypto");
var curve = __toESM(require("../../vendor/libsignal/src/curve.js"));
var import_Defaults = require("../Defaults/index.js");
var import_crypto2 = require("crypto");
const { subtle } = globalThis.crypto;
const generateSignalPubKey = (pubKey) => pubKey.length === 33 ? pubKey : Buffer.concat([import_Defaults.KEY_BUNDLE_TYPE, pubKey]);
const Curve = {
  generateKeyPair: () => {
    const { pubKey, privKey } = curve.generateKeyPair();
    return {
      private: Buffer.from(privKey),
      // remove version byte
      public: Buffer.from(pubKey.slice(1))
    };
  },
  sharedKey: (privateKey, publicKey) => {
    const shared = curve.calculateAgreement(generateSignalPubKey(publicKey), privateKey);
    return Buffer.from(shared);
  },
  sign: (privateKey, buf) => curve.calculateSignature(privateKey, buf),
  verify: (pubKey, message, signature) => {
    try {
      curve.verifySignature(generateSignalPubKey(pubKey), message, signature);
      return true;
    } catch (error) {
      return false;
    }
  }
};
const signedKeyPair = (identityKeyPair, keyId) => {
  const preKey = Curve.generateKeyPair();
  const pubKey = generateSignalPubKey(preKey.public);
  const signature = Curve.sign(identityKeyPair.private, pubKey);
  return { keyPair: preKey, signature, keyId };
};
const GCM_TAG_LENGTH = 128 >> 3;
function aesEncryptGCM(plaintext, key, iv, additionalData) {
  const cipher = (0, import_crypto.createCipheriv)("aes-256-gcm", key, iv);
  cipher.setAAD(additionalData);
  return Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
}
function aesDecryptGCM(ciphertext, key, iv, additionalData) {
  const decipher = (0, import_crypto.createDecipheriv)("aes-256-gcm", key, iv);
  const enc = ciphertext.slice(0, ciphertext.length - GCM_TAG_LENGTH);
  const tag = ciphertext.slice(ciphertext.length - GCM_TAG_LENGTH);
  decipher.setAAD(additionalData);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}
function aesEncryptCTR(plaintext, key, iv) {
  const cipher = (0, import_crypto.createCipheriv)("aes-256-ctr", key, iv);
  return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}
function aesDecryptCTR(ciphertext, key, iv) {
  const decipher = (0, import_crypto.createDecipheriv)("aes-256-ctr", key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
function aesDecrypt(buffer, key) {
  return aesDecryptWithIV(buffer.subarray(16), key, buffer.subarray(0, 16));
}
function aesDecryptWithIV(buffer, key, IV) {
  const aes = (0, import_crypto.createDecipheriv)("aes-256-cbc", key, IV);
  return Buffer.concat([aes.update(buffer), aes.final()]);
}
function aesEncrypt(buffer, key) {
  const IV = (0, import_crypto.randomBytes)(16);
  const aes = (0, import_crypto.createCipheriv)("aes-256-cbc", key, IV);
  return Buffer.concat([IV, aes.update(buffer), aes.final()]);
}
function aesEncrypWithIV(buffer, key, IV) {
  const aes = (0, import_crypto.createCipheriv)("aes-256-cbc", key, IV);
  return Buffer.concat([aes.update(buffer), aes.final()]);
}
function hmacSign(buffer, key, variant = "sha256") {
  return (0, import_crypto.createHmac)(variant, key).update(buffer).digest();
}
function sha256(buffer) {
  return (0, import_crypto.createHash)("sha256").update(buffer).digest();
}
async function derivePairingCodeKey(pairingCode, salt) {
  const encoder = new TextEncoder();
  const pairingCodeBuffer = encoder.encode(pairingCode);
  const saltBuffer = new Uint8Array(salt instanceof Uint8Array ? salt : new Uint8Array(salt));
  const keyMaterial = await subtle.importKey("raw", pairingCodeBuffer, { name: "PBKDF2" }, false, [
    "deriveBits"
  ]);
  const derivedBits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 2 << 16,
      hash: "SHA-256"
    },
    keyMaterial,
    32 * 8
    // 32 bytes * 8 = 256 bits
  );
  return Buffer.from(derivedBits);
}
const md5 = (buffer) => (0, import_crypto2.createHash)("md5").update(buffer).digest();
const hkdf = (buffer, expandedLength, info = {}) => {
  const ikm = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const salt = info.salt ? Buffer.from(info.salt) : Buffer.alloc(0);
  const infoBuf = info.info === void 0 || info.info === null ? Buffer.alloc(0) : Buffer.isBuffer(info.info) || info.info instanceof Uint8Array ? Buffer.from(info.info) : Buffer.from(String(info.info));
  return Buffer.from((0, import_crypto2.hkdfSync)("sha256", ikm, salt, infoBuf, expandedLength));
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Curve,
  aesDecrypt,
  aesDecryptCTR,
  aesDecryptGCM,
  aesDecryptWithIV,
  aesEncrypWithIV,
  aesEncrypt,
  aesEncryptCTR,
  aesEncryptGCM,
  derivePairingCodeKey,
  generateSignalPubKey,
  hkdf,
  hmacSign,
  md5,
  sha256,
  signedKeyPair
});
