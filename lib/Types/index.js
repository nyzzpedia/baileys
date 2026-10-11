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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var Types_exports = {};
__export(Types_exports, {
  DisconnectReason: () => DisconnectReason
});
module.exports = __toCommonJS(Types_exports);
__reExport(Types_exports, require("./Auth.js"), module.exports);
__reExport(Types_exports, require("./GroupMetadata.js"), module.exports);
__reExport(Types_exports, require("./Chat.js"), module.exports);
__reExport(Types_exports, require("./Contact.js"), module.exports);
__reExport(Types_exports, require("./State.js"), module.exports);
__reExport(Types_exports, require("./Message.js"), module.exports);
__reExport(Types_exports, require("./Socket.js"), module.exports);
__reExport(Types_exports, require("./Events.js"), module.exports);
__reExport(Types_exports, require("./Product.js"), module.exports);
__reExport(Types_exports, require("./Call.js"), module.exports);
__reExport(Types_exports, require("./Signal.js"), module.exports);
__reExport(Types_exports, require("./Mex.js"), module.exports);
var DisconnectReason;
(function(DisconnectReason2) {
  DisconnectReason2[DisconnectReason2["connectionClosed"] = 428] = "connectionClosed";
  DisconnectReason2[DisconnectReason2["connectionLost"] = 408] = "connectionLost";
  DisconnectReason2[DisconnectReason2["connectionReplaced"] = 440] = "connectionReplaced";
  DisconnectReason2[DisconnectReason2["timedOut"] = 408] = "timedOut";
  DisconnectReason2[DisconnectReason2["loggedOut"] = 401] = "loggedOut";
  DisconnectReason2[DisconnectReason2["badSession"] = 500] = "badSession";
  DisconnectReason2[DisconnectReason2["restartRequired"] = 515] = "restartRequired";
  DisconnectReason2[DisconnectReason2["multideviceMismatch"] = 411] = "multideviceMismatch";
  DisconnectReason2[DisconnectReason2["forbidden"] = 403] = "forbidden";
  DisconnectReason2[DisconnectReason2["unavailableService"] = 503] = "unavailableService";
})(DisconnectReason || (DisconnectReason = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DisconnectReason,
  ...require("./Auth.js"),
  ...require("./GroupMetadata.js"),
  ...require("./Chat.js"),
  ...require("./Contact.js"),
  ...require("./State.js"),
  ...require("./Message.js"),
  ...require("./Socket.js"),
  ...require("./Events.js"),
  ...require("./Product.js"),
  ...require("./Call.js"),
  ...require("./Signal.js"),
  ...require("./Mex.js")
});
