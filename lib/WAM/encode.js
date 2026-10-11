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
var encode_exports = {};
__export(encode_exports, {
  encodeWAM: () => encodeWAM
});
module.exports = __toCommonJS(encode_exports);
var import_BinaryInfo = require("./BinaryInfo.js");
var import_constants = require("./constants.js");
const getHeaderBitLength = (key) => key < 256 ? 2 : 3;
const encodeWAM = (binaryInfo) => {
  binaryInfo.buffer = [];
  encodeWAMHeader(binaryInfo);
  encodeEvents(binaryInfo);
  const totalSize = binaryInfo.buffer.map((a) => a.length).reduce((a, b) => a + b);
  const buffer = Buffer.alloc(totalSize);
  let offset = 0;
  for (const buffer_ of binaryInfo.buffer) {
    buffer_.copy(buffer, offset);
    offset += buffer_.length;
  }
  return buffer;
};
function encodeWAMHeader(binaryInfo) {
  const headerBuffer = Buffer.alloc(8);
  headerBuffer.write("WAM", 0, "utf8");
  headerBuffer.writeUInt8(binaryInfo.protocolVersion, 3);
  headerBuffer.writeUInt8(1, 4);
  headerBuffer.writeUInt16BE(binaryInfo.sequence, 5);
  headerBuffer.writeUInt8(0, 7);
  binaryInfo.buffer.push(headerBuffer);
}
function encodeGlobalAttributes(binaryInfo, globals) {
  for (const [key, _value] of Object.entries(globals)) {
    const id = import_constants.WEB_GLOBALS.find((a) => a?.name === key).id;
    let value = _value;
    if (typeof value === "boolean") {
      value = value ? 1 : 0;
    }
    binaryInfo.buffer.push(serializeData(id, value, import_constants.FLAG_GLOBAL));
  }
}
function encodeEvents(binaryInfo) {
  for (const [name, { props, globals }] of binaryInfo.events.map((a) => Object.entries(a)[0])) {
    encodeGlobalAttributes(binaryInfo, globals);
    const event = import_constants.WEB_EVENTS.find((a) => a.name === name);
    const props_ = Object.entries(props);
    let extended = false;
    for (const [, value] of props_) {
      extended || (extended = value !== null);
    }
    const eventFlag = extended ? import_constants.FLAG_EVENT : import_constants.FLAG_EVENT | import_constants.FLAG_EXTENDED;
    binaryInfo.buffer.push(serializeData(event.id, -event.weight, eventFlag));
    for (let i = 0; i < props_.length; i++) {
      const [key, _value] = props_[i];
      const id = event.props[key]?.[0];
      extended = i < props_.length - 1;
      let value = _value;
      if (typeof value === "boolean") {
        value = value ? 1 : 0;
      }
      const fieldFlag = extended ? import_constants.FLAG_EVENT : import_constants.FLAG_FIELD | import_constants.FLAG_EXTENDED;
      binaryInfo.buffer.push(serializeData(id, value, fieldFlag));
    }
  }
}
function serializeData(key, value, flag) {
  const bufferLength = getHeaderBitLength(key);
  let buffer;
  let offset = 0;
  if (value === null) {
    if (flag === import_constants.FLAG_GLOBAL) {
      buffer = Buffer.alloc(bufferLength);
      offset = serializeHeader(buffer, offset, key, flag);
      return buffer;
    }
  } else if (typeof value === "number" && Number.isInteger(value)) {
    if (value === 0 || value === 1) {
      buffer = Buffer.alloc(bufferLength);
      offset = serializeHeader(buffer, offset, key, flag | value + 1 << 4);
      return buffer;
    } else if (-128 <= value && value < 128) {
      buffer = Buffer.alloc(bufferLength + 1);
      offset = serializeHeader(buffer, offset, key, flag | 3 << 4);
      buffer.writeInt8(value, offset);
      return buffer;
    } else if (-32768 <= value && value < 32768) {
      buffer = Buffer.alloc(bufferLength + 2);
      offset = serializeHeader(buffer, offset, key, flag | 4 << 4);
      buffer.writeInt16LE(value, offset);
      return buffer;
    } else if (-2147483648 <= value && value < 2147483648) {
      buffer = Buffer.alloc(bufferLength + 4);
      offset = serializeHeader(buffer, offset, key, flag | 5 << 4);
      buffer.writeInt32LE(value, offset);
      return buffer;
    } else {
      buffer = Buffer.alloc(bufferLength + 8);
      offset = serializeHeader(buffer, offset, key, flag | 7 << 4);
      buffer.writeDoubleLE(value, offset);
      return buffer;
    }
  } else if (typeof value === "number") {
    buffer = Buffer.alloc(bufferLength + 8);
    offset = serializeHeader(buffer, offset, key, flag | 7 << 4);
    buffer.writeDoubleLE(value, offset);
    return buffer;
  } else if (typeof value === "string") {
    const utf8Bytes = Buffer.byteLength(value, "utf8");
    if (utf8Bytes < 256) {
      buffer = Buffer.alloc(bufferLength + 1 + utf8Bytes);
      offset = serializeHeader(buffer, offset, key, flag | 8 << 4);
      buffer.writeUint8(utf8Bytes, offset++);
    } else if (utf8Bytes < 65536) {
      buffer = Buffer.alloc(bufferLength + 2 + utf8Bytes);
      offset = serializeHeader(buffer, offset, key, flag | 9 << 4);
      buffer.writeUInt16LE(utf8Bytes, offset);
      offset += 2;
    } else {
      buffer = Buffer.alloc(bufferLength + 4 + utf8Bytes);
      offset = serializeHeader(buffer, offset, key, flag | 10 << 4);
      buffer.writeUInt32LE(utf8Bytes, offset);
      offset += 4;
    }
    buffer.write(value, offset, "utf8");
    return buffer;
  }
  throw "missing";
}
function serializeHeader(buffer, offset, key, flag) {
  if (key < 256) {
    buffer.writeUInt8(flag, offset);
    offset += 1;
    buffer.writeUInt8(key, offset);
    offset += 1;
  } else {
    buffer.writeUInt8(flag | import_constants.FLAG_BYTE, offset);
    offset += 1;
    buffer.writeUInt16LE(key, offset);
    offset += 2;
  }
  return offset;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  encodeWAM
});
