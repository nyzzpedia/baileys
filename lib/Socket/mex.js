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
var mex_exports = {};
__export(mex_exports, {
  executeWMexQuery: () => executeWMexQuery
});
module.exports = __toCommonJS(mex_exports);
var import_boom = require("@hapi/boom");
var import_WABinary = require("../WABinary/index.js");
const wMexQuery = (variables, queryId, query, generateMessageTag) => {
  return query({
    tag: "iq",
    attrs: {
      id: generateMessageTag(),
      type: "get",
      to: import_WABinary.S_WHATSAPP_NET,
      xmlns: "w:mex"
    },
    content: [
      {
        tag: "query",
        attrs: { query_id: queryId },
        content: Buffer.from(JSON.stringify({ variables }), "utf-8")
      }
    ]
  });
};
const executeWMexQuery = async (variables, queryId, dataPath, query, generateMessageTag) => {
  const result = await wMexQuery(variables, queryId, query, generateMessageTag);
  const child = (0, import_WABinary.getBinaryNodeChild)(result, "result");
  if (child?.content) {
    const data = JSON.parse(child.content.toString());
    if (data.errors && data.errors.length > 0) {
      const errorMessages = data.errors.map((err) => err.message || "Unknown error").join(", ");
      const firstError = data.errors[0];
      const errorCode = firstError.extensions?.error_code || 400;
      throw new import_boom.Boom(`GraphQL server error: ${errorMessages}`, { statusCode: errorCode, data: firstError });
    }
    const response = dataPath ? data?.data?.[dataPath] : data?.data;
    if (typeof response !== "undefined") {
      return response;
    }
  }
  const action = (dataPath || "").startsWith("xwa2_") ? dataPath.substring(5).replace(/_/g, " ") : dataPath?.replace(/_/g, " ");
  throw new import_boom.Boom(`Failed to ${action}, unexpected response structure.`, { statusCode: 400, data: result });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  executeWMexQuery
});
