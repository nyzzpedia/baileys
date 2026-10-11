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
var object_repository_exports = {};
__export(object_repository_exports, {
  ObjectRepository: () => ObjectRepository,
  default: () => object_repository_default
});
module.exports = __toCommonJS(object_repository_exports);
class ObjectRepository {
  constructor(entities = {}) {
    this.entityMap = new Map(Object.entries(entities));
  }
  findById(id) {
    return this.entityMap.get(id);
  }
  findAll() {
    return Array.from(this.entityMap.values());
  }
  upsertById(id, entity) {
    this.entityMap.set(id, {
      ...entity
    });
    return this;
  }
  deleteById(id) {
    return this.entityMap.delete(id);
  }
  count() {
    return this.entityMap.size;
  }
  toJSON() {
    return this.findAll();
  }
}
var object_repository_default = ObjectRepository;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ObjectRepository
});
