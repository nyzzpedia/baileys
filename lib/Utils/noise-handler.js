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
var noise_handler_exports = {};
__export(noise_handler_exports, {
  makeNoiseHandler: () => makeNoiseHandler
});
module.exports = __toCommonJS(noise_handler_exports);
var import_boom = require("@hapi/boom");
var import_WAProto = require("../../WAProto/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_crypto = require("./crypto.js");
const IV_LENGTH = 12;
const EMPTY_BUFFER = Buffer.alloc(0);
const generateIV = (counter) => {
  const iv = new ArrayBuffer(IV_LENGTH);
  new DataView(iv).setUint32(8, counter);
  return new Uint8Array(iv);
};
class TransportState {
  constructor(encKey, decKey) {
    this.encKey = encKey;
    this.decKey = decKey;
    this.readCounter = 0;
    this.writeCounter = 0;
    this.iv = new Uint8Array(IV_LENGTH);
  }
  encrypt(plaintext) {
    const c = this.writeCounter++;
    this.iv[8] = c >>> 24 & 255;
    this.iv[9] = c >>> 16 & 255;
    this.iv[10] = c >>> 8 & 255;
    this.iv[11] = c & 255;
    return (0, import_crypto.aesEncryptGCM)(plaintext, this.encKey, this.iv, EMPTY_BUFFER);
  }
  decrypt(ciphertext) {
    const c = this.readCounter++;
    this.iv[8] = c >>> 24 & 255;
    this.iv[9] = c >>> 16 & 255;
    this.iv[10] = c >>> 8 & 255;
    this.iv[11] = c & 255;
    return (0, import_crypto.aesDecryptGCM)(ciphertext, this.decKey, this.iv, EMPTY_BUFFER);
  }
}
const makeNoiseHandler = ({ keyPair: { private: privateKey, public: publicKey }, NOISE_HEADER, logger, routingInfo }) => {
  logger = logger.child({ class: "ns" });
  const data = Buffer.from(import_Defaults.NOISE_MODE);
  let hash = data.byteLength === 32 ? data : (0, import_crypto.sha256)(data);
  let salt = hash;
  let encKey = hash;
  let decKey = hash;
  let counter = 0;
  let sentIntro = false;
  let inBytes = Buffer.alloc(0);
  let transport = null;
  let isWaitingForTransport = false;
  let pendingOnFrame = null;
  let introHeader;
  if (routingInfo) {
    introHeader = Buffer.alloc(7 + routingInfo.byteLength + NOISE_HEADER.length);
    introHeader.write("ED", 0, "utf8");
    introHeader.writeUint8(0, 2);
    introHeader.writeUint8(1, 3);
    introHeader.writeUint8(routingInfo.byteLength >> 16, 4);
    introHeader.writeUint16BE(routingInfo.byteLength & 65535, 5);
    introHeader.set(routingInfo, 7);
    introHeader.set(NOISE_HEADER, 7 + routingInfo.byteLength);
  } else {
    introHeader = Buffer.from(NOISE_HEADER);
  }
  const authenticate = (data2) => {
    if (!transport) {
      hash = (0, import_crypto.sha256)(Buffer.concat([hash, data2]));
    }
  };
  const encrypt = (plaintext) => {
    if (transport) {
      return transport.encrypt(plaintext);
    }
    const result = (0, import_crypto.aesEncryptGCM)(plaintext, encKey, generateIV(counter++), hash);
    authenticate(result);
    return result;
  };
  const decrypt = (ciphertext) => {
    if (transport) {
      return transport.decrypt(ciphertext);
    }
    const result = (0, import_crypto.aesDecryptGCM)(ciphertext, decKey, generateIV(counter++), hash);
    authenticate(ciphertext);
    return result;
  };
  const localHKDF = (data2) => {
    const key = (0, import_crypto.hkdf)(Buffer.from(data2), 64, { salt, info: "" });
    return [key.subarray(0, 32), key.subarray(32)];
  };
  const mixIntoKey = (data2) => {
    const [write, read] = localHKDF(data2);
    salt = write;
    encKey = read;
    decKey = read;
    counter = 0;
  };
  const finishInit = async () => {
    isWaitingForTransport = true;
    const [write, read] = localHKDF(new Uint8Array(0));
    transport = new TransportState(write, read);
    isWaitingForTransport = false;
    logger.trace("Noise handler transitioned to Transport state");
    if (pendingOnFrame) {
      logger.trace({ length: inBytes.length }, "Flushing buffered frames after transport ready");
      await processData(pendingOnFrame);
      pendingOnFrame = null;
    }
  };
  const processData = async (onFrame) => {
    let size;
    while (true) {
      if (inBytes.length < 3)
        return;
      size = inBytes[0] << 16 | inBytes[1] << 8 | inBytes[2];
      if (inBytes.length < size + 3)
        return;
      let frame = inBytes.subarray(3, size + 3);
      inBytes = inBytes.subarray(size + 3);
      if (transport) {
        const result = transport.decrypt(frame);
        frame = await (0, import_WABinary.decodeBinaryNode)(result);
      }
      if (logger.level === "trace") {
        logger.trace({ msg: frame?.attrs?.id }, "recv frame");
      }
      onFrame(frame);
    }
  };
  authenticate(NOISE_HEADER);
  authenticate(publicKey);
  return {
    encrypt,
    decrypt,
    authenticate,
    mixIntoKey,
    finishInit,
    processHandshake: ({ serverHello }, noiseKey) => {
      authenticate(serverHello.ephemeral);
      mixIntoKey(import_crypto.Curve.sharedKey(privateKey, serverHello.ephemeral));
      const decStaticContent = decrypt(serverHello.static);
      mixIntoKey(import_crypto.Curve.sharedKey(privateKey, decStaticContent));
      const certDecoded = decrypt(serverHello.payload);
      const { intermediate: certIntermediate, leaf } = import_WAProto.proto.CertChain.decode(certDecoded);
      if (!leaf?.details || !leaf?.signature) {
        throw new import_boom.Boom("invalid noise leaf certificate", { statusCode: 400 });
      }
      if (!certIntermediate?.details || !certIntermediate?.signature) {
        throw new import_boom.Boom("invalid noise intermediate certificate", { statusCode: 400 });
      }
      const details = import_WAProto.proto.CertChain.NoiseCertificate.Details.decode(certIntermediate.details);
      const { issuerSerial } = details;
      const verify = import_crypto.Curve.verify(details.key, leaf.details, leaf.signature);
      const verifyIntermediate = import_crypto.Curve.verify(import_Defaults.WA_CERT_DETAILS.PUBLIC_KEY, certIntermediate.details, certIntermediate.signature);
      if (!verify) {
        throw new import_boom.Boom("noise certificate signature invalid", { statusCode: 400 });
      }
      if (!verifyIntermediate) {
        throw new import_boom.Boom("noise intermediate certificate signature invalid", { statusCode: 400 });
      }
      if (issuerSerial !== import_Defaults.WA_CERT_DETAILS.SERIAL) {
        throw new import_boom.Boom("certification match failed", { statusCode: 400 });
      }
      const keyEnc = encrypt(noiseKey.public);
      mixIntoKey(import_crypto.Curve.sharedKey(noiseKey.private, serverHello.ephemeral));
      return keyEnc;
    },
    encodeFrame: (data2) => {
      if (transport) {
        data2 = transport.encrypt(data2);
      }
      const dataLen = data2.byteLength;
      const introSize = sentIntro ? 0 : introHeader.length;
      const frame = Buffer.allocUnsafe(introSize + 3 + dataLen);
      if (!sentIntro) {
        frame.set(introHeader);
        sentIntro = true;
      }
      frame[introSize] = dataLen >>> 16 & 255;
      frame[introSize + 1] = dataLen >>> 8 & 255;
      frame[introSize + 2] = dataLen & 255;
      frame.set(data2, introSize + 3);
      return frame;
    },
    decodeFrame: async (newData, onFrame) => {
      if (isWaitingForTransport) {
        inBytes = Buffer.concat([inBytes, newData]);
        pendingOnFrame = onFrame;
        return;
      }
      if (inBytes.length === 0) {
        inBytes = Buffer.from(newData);
      } else {
        inBytes = Buffer.concat([inBytes, newData]);
      }
      await processData(onFrame);
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeNoiseHandler
});
