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
var offline_node_processor_exports = {};
__export(offline_node_processor_exports, {
  makeOfflineNodeProcessor: () => makeOfflineNodeProcessor
});
module.exports = __toCommonJS(offline_node_processor_exports);
function makeOfflineNodeProcessor(nodeProcessorMap, deps, batchSize = 10) {
  const nodes = [];
  let isProcessing = false;
  const enqueue = (type, node) => {
    nodes.push({ type, node });
    if (isProcessing) {
      return;
    }
    isProcessing = true;
    const promise = async () => {
      let processedInBatch = 0;
      while (nodes.length && deps.isWsOpen()) {
        const { type: type2, node: node2 } = nodes.shift();
        const nodeProcessor = nodeProcessorMap.get(type2);
        if (!nodeProcessor) {
          deps.onUnexpectedError(new Error(`unknown offline node type: ${type2}`), "processing offline node");
          continue;
        }
        await nodeProcessor(node2).catch((err) => deps.onUnexpectedError(err, `processing offline ${type2}`));
        processedInBatch++;
        if (processedInBatch >= batchSize) {
          processedInBatch = 0;
          await deps.yieldToEventLoop();
        }
      }
      isProcessing = false;
    };
    promise().catch((error) => deps.onUnexpectedError(error, "processing offline nodes"));
  };
  return { enqueue };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeOfflineNodeProcessor
});
