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
var websocket_exports = {};
__export(websocket_exports, {
  WebSocketClient: () => WebSocketClient
});
module.exports = __toCommonJS(websocket_exports);
var import_ws = __toESM(require("ws"));
var import_Defaults = require("../../Defaults/index.js");
var import_types = require("./types.js");
class WebSocketClient extends import_types.AbstractSocketClient {
  constructor() {
    super(...arguments);
    this.socket = null;
  }
  get isOpen() {
    return this.socket?.readyState === import_ws.default.OPEN;
  }
  get isClosed() {
    return this.socket === null || this.socket?.readyState === import_ws.default.CLOSED;
  }
  get isClosing() {
    return this.socket === null || this.socket?.readyState === import_ws.default.CLOSING;
  }
  get isConnecting() {
    return this.socket?.readyState === import_ws.default.CONNECTING;
  }
  connect() {
    if (this.socket) {
      return;
    }
    this.socket = new import_ws.default(this.url, {
      origin: import_Defaults.DEFAULT_ORIGIN,
      headers: this.config.options?.headers,
      handshakeTimeout: this.config.connectTimeoutMs,
      timeout: this.config.connectTimeoutMs,
      agent: this.config.agent
    });
    this.socket.setMaxListeners(0);
    const events = ["close", "error", "upgrade", "message", "open", "ping", "pong", "unexpected-response"];
    for (const event of events) {
      this.socket?.on(event, (...args) => this.emit(event, ...args));
    }
  }
  async close() {
    if (!this.socket) {
      return;
    }
    const closePromise = new Promise((resolve) => {
      this.socket?.once("close", resolve);
    });
    this.socket.close();
    await closePromise;
    this.socket = null;
  }
  send(str, cb) {
    this.socket?.send(str, cb);
    return Boolean(this.socket);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WebSocketClient
});
