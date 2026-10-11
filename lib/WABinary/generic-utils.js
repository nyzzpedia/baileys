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
var generic_utils_exports = {};
__export(generic_utils_exports, {
  assertNodeErrorFree: () => assertNodeErrorFree,
  binaryNodeToString: () => binaryNodeToString,
  getAdditionalNode: () => getAdditionalNode,
  getAllBinaryNodeChildren: () => getAllBinaryNodeChildren,
  getBinaryNodeChild: () => getBinaryNodeChild,
  getBinaryNodeChildBuffer: () => getBinaryNodeChildBuffer,
  getBinaryNodeChildString: () => getBinaryNodeChildString,
  getBinaryNodeChildUInt: () => getBinaryNodeChildUInt,
  getBinaryNodeChildren: () => getBinaryNodeChildren,
  getBinaryNodeFilter: () => getBinaryNodeFilter,
  getBinaryNodeMessages: () => getBinaryNodeMessages,
  reduceBinaryNodeToDictionary: () => reduceBinaryNodeToDictionary
});
module.exports = __toCommonJS(generic_utils_exports);
var import_boom = require("@hapi/boom");
var import_WAProto = require("../../WAProto/index.js");
var import_types = require("./types.js");
const indexCache = /* @__PURE__ */ new WeakMap();
const getBinaryNodeChildren = (node, childTag) => {
  if (!node || !Array.isArray(node.content))
    return [];
  let index = indexCache.get(node);
  if (!index) {
    index = /* @__PURE__ */ new Map();
    for (const child of node.content) {
      let arr = index.get(child.tag);
      if (!arr)
        index.set(child.tag, arr = []);
      arr.push(child);
    }
    indexCache.set(node, index);
  }
  return index.get(childTag) || [];
};
const getBinaryNodeChild = (node, childTag) => {
  return getBinaryNodeChildren(node, childTag)[0];
};
const getAllBinaryNodeChildren = ({ content }) => {
  if (Array.isArray(content)) {
    return content;
  }
  return [];
};
const getBinaryNodeChildBuffer = (node, childTag) => {
  const child = getBinaryNodeChild(node, childTag)?.content;
  if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
    return child;
  }
};
const getBinaryNodeChildString = (node, childTag) => {
  const child = getBinaryNodeChild(node, childTag)?.content;
  if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
    return Buffer.from(child).toString("utf-8");
  } else if (typeof child === "string") {
    return child;
  }
};
const getBinaryNodeChildUInt = (node, childTag, length) => {
  const buff = getBinaryNodeChildBuffer(node, childTag);
  if (buff) {
    return bufferToUInt(buff, length);
  }
};
const assertNodeErrorFree = (node) => {
  const errNode = getBinaryNodeChild(node, "error");
  if (errNode) {
    throw new import_boom.Boom(errNode.attrs.text || "Unknown error", { data: +errNode.attrs.code });
  }
};
const reduceBinaryNodeToDictionary = (node, tag) => {
  const nodes = getBinaryNodeChildren(node, tag);
  const dict = nodes.reduce((dict2, { attrs }) => {
    if (typeof attrs.name === "string") {
      dict2[attrs.name] = attrs.value || attrs.config_value;
    } else {
      dict2[attrs.config_code] = attrs.value || attrs.config_value;
    }
    return dict2;
  }, {});
  return dict;
};
const getBinaryNodeMessages = ({ content }) => {
  const msgs = [];
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.tag === "message") {
        msgs.push(import_WAProto.proto.WebMessageInfo.decode(item.content).toJSON());
      }
    }
  }
  return msgs;
};
function bufferToUInt(e, t) {
  let a = 0;
  for (let i = 0; i < t; i++) {
    a = 256 * a + e[i];
  }
  return a;
}
const tabs = (n) => "	".repeat(n);
function binaryNodeToString(node, i = 0) {
  if (!node) {
    return node;
  }
  if (typeof node === "string") {
    return tabs(i) + node;
  }
  if (node instanceof Uint8Array) {
    return tabs(i) + Buffer.from(node).toString("hex");
  }
  if (Array.isArray(node)) {
    return node.map((x) => tabs(i + 1) + binaryNodeToString(x, i + 1)).join("\n");
  }
  const children = binaryNodeToString(node.content, i + 1);
  const tag = `<${node.tag} ${Object.entries(node.attrs || {}).filter(([, v]) => v !== void 0).map(([k, v]) => `${k}='${v}'`).join(" ")}`;
  const content = children ? `>
${children}
${tabs(i)}</${node.tag}>` : "/>";
  return tag + content;
}
const getBinaryNodeFilter = (node) => {
  if (!Array.isArray(node)) return false;
  return node.some((item) => ["native_flow"].includes(item?.content?.[0]?.content?.[0]?.tag) || ["interactive", "buttons", "list"].includes(item?.content?.[0]?.tag) || ["hsm", "biz"].includes(item?.tag) || ["bot"].includes(item?.tag) && item?.attrs?.biz_bot === "1");
};
const getAdditionalNode = (name) => {
  if (name) name = name.toLowerCase();
  const ts = Math.floor(Date.now() / 1e3) - 77980457;
  const order_response_name = {
    review_and_pay: "order_details",
    review_order: "order_status",
    payment_info: "payment_info",
    payment_status: "payment_status",
    payment_method: "payment_method"
  };
  const flow_name = {
    cta_catalog: "cta_catalog",
    mpm: "mpm",
    call_request: "call_permission_request",
    view_catalog: "automated_greeting_message_view_catalog",
    wa_pay_detail: "wa_payment_transaction_details",
    send_location: "send_location"
  };
  if (order_response_name[name]) {
    return [{ tag: "biz", attrs: { native_flow_name: order_response_name[name] }, content: [] }];
  } else if (flow_name[name] || name === "interactive" || name === "buttons") {
    return [{
      tag: "biz",
      attrs: { actual_actors: "2", host_storage: "2", privacy_mode_ts: `${ts}` },
      content: [
        { tag: "engagement", attrs: { customer_service_state: "open", conversation_state: "open" } },
        {
          tag: "interactive",
          attrs: { type: "native_flow", v: "1" },
          content: [{ tag: "native_flow", attrs: { v: "9", name: flow_name[name] ?? "mixed" }, content: [] }]
        }
      ]
    }];
  } else {
    return [{
      tag: "biz",
      attrs: { actual_actors: "2", host_storage: "2", privacy_mode_ts: `${ts}` },
      content: [{ tag: "engagement", attrs: { customer_service_state: "open", conversation_state: "open" } }]
    }];
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertNodeErrorFree,
  binaryNodeToString,
  getAdditionalNode,
  getAllBinaryNodeChildren,
  getBinaryNodeChild,
  getBinaryNodeChildBuffer,
  getBinaryNodeChildString,
  getBinaryNodeChildUInt,
  getBinaryNodeChildren,
  getBinaryNodeFilter,
  getBinaryNodeMessages,
  reduceBinaryNodeToDictionary
});
