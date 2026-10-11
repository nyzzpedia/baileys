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
var make_ordered_dictionary_exports = {};
__export(make_ordered_dictionary_exports, {
  default: () => makeOrderedDictionary
});
module.exports = __toCommonJS(make_ordered_dictionary_exports);
function makeOrderedDictionary(idGetter) {
  const array = [];
  const dict = {};
  const get = (id) => dict[id];
  const update = (item) => {
    const id = idGetter(item);
    const idx = array.findIndex((i) => idGetter(i) === id);
    if (idx >= 0) {
      array[idx] = item;
      dict[id] = item;
    }
    return false;
  };
  const upsert = (item, mode) => {
    const id = idGetter(item);
    if (get(id)) {
      update(item);
    } else {
      if (mode === "append") array.push(item);
      else array.unshift(item);
      dict[id] = item;
    }
  };
  const remove = (item) => {
    const id = idGetter(item);
    const idx = array.findIndex((i) => idGetter(i) === id);
    if (idx >= 0) {
      array.splice(idx, 1);
      delete dict[id];
      return true;
    }
    return false;
  };
  return {
    array,
    get,
    upsert,
    update,
    remove,
    updateAssign: (id, update2) => {
      const item = get(id);
      if (item) {
        Object.assign(item, update2);
        delete dict[id];
        dict[idGetter(item)] = item;
        return true;
      }
      return false;
    },
    clear: () => {
      array.length = 0;
      for (const key of Object.keys(dict)) delete dict[key];
    },
    filter: (contain) => {
      let i = 0;
      while (i < array.length) {
        if (!contain(array[i])) {
          delete dict[idGetter(array[i])];
          array.splice(i, 1);
        } else {
          i++;
        }
      }
    },
    toJSON: () => array,
    fromJSON: (newItems) => {
      array.splice(0, array.length, ...newItems);
    }
  };
}
