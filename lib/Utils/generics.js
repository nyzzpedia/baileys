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
var generics_exports = {};
__export(generics_exports, {
  BufferJSON: () => BufferJSON,
  bindWaitForConnectionUpdate: () => bindWaitForConnectionUpdate,
  bindWaitForEvent: () => bindWaitForEvent,
  bytesToCrockford: () => bytesToCrockford,
  debouncedTimeout: () => debouncedTimeout,
  delay: () => delay,
  delayCancellable: () => delayCancellable,
  encodeBigEndian: () => encodeBigEndian,
  encodeNewsletterMessage: () => encodeNewsletterMessage,
  encodeWAMessage: () => encodeWAMessage,
  fetchLatestBaileysVersion: () => fetchLatestBaileysVersion,
  fetchLatestWaWebVersion: () => fetchLatestWaWebVersion,
  generateMdTagPrefix: () => generateMdTagPrefix,
  generateMessageID: () => generateMessageID,
  generateMessageIDV2: () => generateMessageIDV2,
  generateParticipantHashV2: () => generateParticipantHashV2,
  generateRegistrationId: () => generateRegistrationId,
  getCallStatusFromNode: () => getCallStatusFromNode,
  getCodeFromWSError: () => getCodeFromWSError,
  getErrorCodeFromStreamError: () => getErrorCodeFromStreamError,
  getKeyAuthor: () => getKeyAuthor,
  getStatusFromReceiptType: () => getStatusFromReceiptType,
  isStringNullOrEmpty: () => isStringNullOrEmpty,
  isWABusinessPlatform: () => isWABusinessPlatform,
  printQRIfNecessaryListener: () => printQRIfNecessaryListener,
  promiseTimeout: () => promiseTimeout,
  toNumber: () => toNumber,
  trimUndefined: () => trimUndefined,
  unixTimestampSeconds: () => unixTimestampSeconds,
  unpadRandomMax16: () => unpadRandomMax16,
  writeRandomPadMax16: () => writeRandomPadMax16
});
module.exports = __toCommonJS(generics_exports);
var import_boom = require("@hapi/boom");
var import_crypto = require("crypto");
var import_WAProto = require("../../WAProto/index.js");
var import_Types = require("../Types/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_crypto2 = require("./crypto.js");
const baileysVersion = [2, 3e3, 1043857760];
const BufferJSON = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replacer: (k, value) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === "Buffer") {
      return { type: "Buffer", data: Buffer.from(value?.data || value).toString("base64") };
    }
    return value;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reviver: (_, value) => {
    if (typeof value === "object" && value !== null && value.type === "Buffer" && typeof value.data === "string") {
      return Buffer.from(value.data, "base64");
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (keys.length > 0 && keys.every((k) => !isNaN(parseInt(k, 10)))) {
        const values = Object.values(value);
        if (values.every((v) => typeof v === "number")) {
          return Buffer.from(values);
        }
      }
    }
    return value;
  }
};
const getKeyAuthor = (key, meId = "me") => (key?.fromMe ? meId : key?.participantAlt || key?.remoteJidAlt || key?.participant || key?.remoteJid) || "";
const isStringNullOrEmpty = (value) => (
  // eslint-disable-next-line eqeqeq
  value == null || value === ""
);
const writeRandomPadMax16 = (msg) => {
  const pad = (0, import_crypto.randomBytes)(1);
  const padLength = (pad[0] & 15) + 1;
  return Buffer.concat([msg, Buffer.alloc(padLength, padLength)]);
};
const unpadRandomMax16 = (e) => {
  const t = new Uint8Array(e);
  if (0 === t.length) {
    throw new Error("unpadPkcs7 given empty bytes");
  }
  var r = t[t.length - 1];
  if (r > t.length) {
    throw new Error(`unpad given ${t.length} bytes, but pad is ${r}`);
  }
  return new Uint8Array(t.buffer, t.byteOffset, t.length - r);
};
const generateParticipantHashV2 = (participants) => {
  participants.sort();
  const sha256Hash = (0, import_crypto2.sha256)(Buffer.from(participants.join(""))).toString("base64");
  return "2:" + sha256Hash.slice(0, 6);
};
const encodeWAMessage = (message) => writeRandomPadMax16(import_WAProto.proto.Message.encode(message).finish());
const generateRegistrationId = () => {
  return Uint16Array.from((0, import_crypto.randomBytes)(2))[0] & 16383;
};
const encodeBigEndian = (e, t = 4) => {
  let r = e;
  const a = new Uint8Array(t);
  for (let i = t - 1; i >= 0; i--) {
    a[i] = 255 & r;
    r >>>= 8;
  }
  return a;
};
const toNumber = (t) => typeof t === "object" && t ? "toNumber" in t ? t.toNumber() : t.low : t || 0;
const unixTimestampSeconds = (date = /* @__PURE__ */ new Date()) => Math.floor(date.getTime() / 1e3);
const debouncedTimeout = (intervalMs = 1e3, task) => {
  let timeout;
  return {
    start: (newIntervalMs, newTask) => {
      task = newTask || task;
      intervalMs = newIntervalMs || intervalMs;
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => task?.(), intervalMs);
    },
    cancel: () => {
      timeout && clearTimeout(timeout);
      timeout = void 0;
    },
    setTask: (newTask) => task = newTask,
    setInterval: (newInterval) => intervalMs = newInterval
  };
};
const delay = (ms) => delayCancellable(ms).delay;
const delayCancellable = (ms) => {
  const stack = new Error().stack;
  let timeout;
  let reject;
  const delay2 = new Promise((resolve, _reject) => {
    timeout = setTimeout(resolve, ms);
    reject = _reject;
  });
  const cancel = () => {
    clearTimeout(timeout);
    reject(new import_boom.Boom("Cancelled", {
      statusCode: 500,
      data: {
        stack
      }
    }));
  };
  return { delay: delay2, cancel };
};
async function promiseTimeout(ms, promise) {
  if (!ms) {
    return new Promise(promise);
  }
  const stack = new Error().stack;
  const { delay: delay2, cancel } = delayCancellable(ms);
  const p = new Promise((resolve, reject) => {
    delay2.then(() => reject(new import_boom.Boom("Timed Out", {
      statusCode: import_Types.DisconnectReason.timedOut,
      data: {
        stack
      }
    }))).catch((err) => reject(err));
    promise(resolve, reject);
  }).finally(cancel);
  return p;
}
const generateMessageIDV2 = (userId) => {
  const data = Buffer.alloc(8 + 20 + 16);
  data.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1e3)));
  if (userId) {
    const id = (0, import_WABinary.jidDecode)(userId);
    if (id?.user) {
      data.write(id.user, 8);
      data.write("@c.us", 8 + id.user.length);
    }
  }
  const random = (0, import_crypto.randomBytes)(16);
  random.copy(data, 28);
  const hash = (0, import_crypto.createHash)("sha256").update(data).digest();
  return "3EB0" + hash.toString("hex").toUpperCase().substring(0, 18);
};
const generateMessageID = () => "3EB0" + (0, import_crypto.randomBytes)(18).toString("hex").toUpperCase();
function bindWaitForEvent(ev, event) {
  return async (check, timeoutMs) => {
    let listener;
    let closeListener;
    await promiseTimeout(timeoutMs, (resolve, reject) => {
      closeListener = ({ connection, lastDisconnect }) => {
        if (connection === "close") {
          reject(lastDisconnect?.error || new import_boom.Boom("Connection Closed", { statusCode: import_Types.DisconnectReason.connectionClosed }));
        }
      };
      ev.on("connection.update", closeListener);
      listener = async (update) => {
        if (await check(update)) {
          resolve();
        }
      };
      ev.on(event, listener);
    }).finally(() => {
      ev.off(event, listener);
      ev.off("connection.update", closeListener);
    });
  };
}
const bindWaitForConnectionUpdate = (ev) => bindWaitForEvent(ev, "connection.update");
const fetchLatestBaileysVersion = async (options = {}) => {
  const URL = "https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/index.ts";
  try {
    const response = await fetch(URL, {
      dispatcher: options.dispatcher,
      method: "GET",
      headers: options.headers
    });
    if (!response.ok) {
      throw new import_boom.Boom(`Failed to fetch latest Baileys version: ${response.statusText}`, { statusCode: response.status });
    }
    const text = await response.text();
    const lines = text.split("\n");
    const versionLine = lines[6];
    const versionMatch = versionLine.match(/const version = \[(\d+),\s*(\d+),\s*(\d+)\]/);
    if (versionMatch) {
      const version = [parseInt(versionMatch[1]), parseInt(versionMatch[2]), parseInt(versionMatch[3])];
      return {
        version,
        isLatest: true
      };
    } else {
      throw new Error("Could not parse version from Defaults/index.ts");
    }
  } catch (error) {
    return {
      version: baileysVersion,
      isLatest: false,
      error
    };
  }
};
const fetchLatestWaWebVersion = async (options = {}) => {
  try {
    const defaultHeaders = {
      "sec-fetch-site": "none",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    };
    const headers = { ...defaultHeaders, ...options.headers };
    const response = await fetch("https://web.whatsapp.com/sw.js", {
      ...options,
      method: "GET",
      headers
    });
    if (!response.ok) {
      throw new import_boom.Boom(`Failed to fetch sw.js: ${response.statusText}`, { statusCode: response.status });
    }
    const data = await response.text();
    const regex = /\\?"client_revision\\?":\s*(\d+)/;
    const match = data.match(regex);
    if (!match?.[1]) {
      return {
        version: baileysVersion,
        isLatest: false,
        error: {
          message: "Could not find client revision in the fetched content"
        }
      };
    }
    const clientRevision = match[1];
    return {
      version: [2, 3e3, +clientRevision],
      isLatest: true
    };
  } catch (error) {
    return {
      version: baileysVersion,
      isLatest: false,
      error
    };
  }
};
const generateMdTagPrefix = () => {
  const bytes = (0, import_crypto.randomBytes)(4);
  return `${bytes.readUInt16BE()}.${bytes.readUInt16BE(2)}-`;
};
const STATUS_MAP = {
  sender: import_WAProto.proto.WebMessageInfo.Status.SERVER_ACK,
  played: import_WAProto.proto.WebMessageInfo.Status.PLAYED,
  read: import_WAProto.proto.WebMessageInfo.Status.READ,
  "read-self": import_WAProto.proto.WebMessageInfo.Status.READ
};
const getStatusFromReceiptType = (type) => {
  const status = STATUS_MAP[type];
  if (typeof type === "undefined") {
    return import_WAProto.proto.WebMessageInfo.Status.DELIVERY_ACK;
  }
  return status;
};
const CODE_MAP = {
  conflict: import_Types.DisconnectReason.connectionReplaced
};
const getErrorCodeFromStreamError = (node) => {
  const [reasonNode] = (0, import_WABinary.getAllBinaryNodeChildren)(node);
  let reason = reasonNode?.tag || "unknown";
  const statusCode = +(node.attrs.code || CODE_MAP[reason] || import_Types.DisconnectReason.badSession);
  if (statusCode === import_Types.DisconnectReason.restartRequired) {
    reason = "restart required";
  }
  return {
    reason,
    statusCode
  };
};
const getCallStatusFromNode = ({ tag, attrs }) => {
  let status;
  switch (tag) {
    case "offer":
    case "offer_notice":
      status = "offer";
      break;
    case "terminate":
      if (attrs.reason === "timeout") {
        status = "timeout";
      } else {
        status = "terminate";
      }
      break;
    case "preaccept":
      status = "preaccept";
      break;
    case "transport":
      status = "transport";
      break;
    case "relaylatency":
      status = "relaylatency";
      break;
    case "reject":
      status = "reject";
      break;
    case "accept":
      status = "accept";
      break;
    default:
      status = "ringing";
      break;
  }
  return status;
};
const UNEXPECTED_SERVER_CODE_TEXT = "Unexpected server response: ";
const getCodeFromWSError = (error) => {
  let statusCode = 500;
  if (error?.message?.includes(UNEXPECTED_SERVER_CODE_TEXT)) {
    const code = +error?.message.slice(UNEXPECTED_SERVER_CODE_TEXT.length);
    if (!Number.isNaN(code) && code >= 400) {
      statusCode = code;
    }
  } else if (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error?.code?.startsWith("E") || error?.message?.includes("timed out")
  ) {
    statusCode = 408;
  }
  return statusCode;
};
const isWABusinessPlatform = (platform) => {
  return platform === "smbi" || platform === "smba";
};
function trimUndefined(obj) {
  for (const key in obj) {
    if (typeof obj[key] === "undefined") {
      delete obj[key];
    }
  }
  return obj;
}
const CROCKFORD_CHARACTERS = "123456789ABCDEFGHJKLMNPQRSTVWXYZ";
function bytesToCrockford(buffer) {
  let value = 0;
  let bitCount = 0;
  const crockford = [];
  for (const element of buffer) {
    value = value << 8 | element & 255;
    bitCount += 8;
    while (bitCount >= 5) {
      crockford.push(CROCKFORD_CHARACTERS.charAt(value >>> bitCount - 5 & 31));
      bitCount -= 5;
    }
  }
  if (bitCount > 0) {
    crockford.push(CROCKFORD_CHARACTERS.charAt(value << 5 - bitCount & 31));
  }
  return crockford.join("");
}
function encodeNewsletterMessage(message) {
  return import_WAProto.proto.Message.encode(message).finish();
}
const printQRIfNecessaryListener = (ev, logger) => {
  ev.on("connection.update", async ({ qr }) => {
    if (qr) {
      const QR = await import("qrcode-terminal").then((m) => m.default || m).catch(() => {
        logger.error("QR code terminal not added as dependency");
      });
      QR?.generate(qr, { small: true });
    }
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BufferJSON,
  bindWaitForConnectionUpdate,
  bindWaitForEvent,
  bytesToCrockford,
  debouncedTimeout,
  delay,
  delayCancellable,
  encodeBigEndian,
  encodeNewsletterMessage,
  encodeWAMessage,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  generateMdTagPrefix,
  generateMessageID,
  generateMessageIDV2,
  generateParticipantHashV2,
  generateRegistrationId,
  getCallStatusFromNode,
  getCodeFromWSError,
  getErrorCodeFromStreamError,
  getKeyAuthor,
  getStatusFromReceiptType,
  isStringNullOrEmpty,
  isWABusinessPlatform,
  printQRIfNecessaryListener,
  promiseTimeout,
  toNumber,
  trimUndefined,
  unixTimestampSeconds,
  unpadRandomMax16,
  writeRandomPadMax16
});
