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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var Store_exports = {};
__export(Store_exports, {
  MakeCacheManagerStore: () => import_make_cache_manager_store.default,
  MakeOrderedDictionary: () => import_make_ordered_dictionary.default,
  ObjectRepository: () => import_object_repository.default,
  makeCacheManagerAuthState: () => import_make_cache_manager_store2.default,
  makeInMemoryStore: () => import_make_in_memory_store.default
});
module.exports = __toCommonJS(Store_exports);
__reExport(Store_exports, require("./make-cache-manager-store.js"), module.exports);
__reExport(Store_exports, require("./make-ordered-dictionary.js"), module.exports);
__reExport(Store_exports, require("./object-repository.js"), module.exports);
__reExport(Store_exports, require("./make-in-memory-store.js"), module.exports);
var import_make_in_memory_store = __toESM(require("./make-in-memory-store.js"));
var import_make_cache_manager_store = __toESM(require("./make-cache-manager-store.js"));
var import_make_ordered_dictionary = __toESM(require("./make-ordered-dictionary.js"));
var import_object_repository = __toESM(require("./object-repository.js"));
var import_make_cache_manager_store2 = __toESM(require("./make-cache-manager-store.js"));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MakeCacheManagerStore,
  MakeOrderedDictionary,
  ObjectRepository,
  makeCacheManagerAuthState,
  makeInMemoryStore,
  ...require("./make-cache-manager-store.js"),
  ...require("./make-ordered-dictionary.js"),
  ...require("./object-repository.js"),
  ...require("./make-in-memory-store.js")
});
