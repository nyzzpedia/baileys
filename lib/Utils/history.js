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
var history_exports = {};
__export(history_exports, {
  downloadAndProcessHistorySyncNotification: () => downloadAndProcessHistorySyncNotification,
  downloadHistory: () => downloadHistory,
  getHistoryMsg: () => getHistoryMsg,
  processHistoryMessage: () => processHistoryMessage
});
module.exports = __toCommonJS(history_exports);
var import_promises = require("stream/promises");
var import_util = require("util");
var import_zlib = require("zlib");
var import_WAProto = require("../../WAProto/index.js");
var import_Types = require("../Types/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_generics = require("./generics.js");
var import_messages = require("./messages.js");
var import_messages_media = require("./messages-media.js");
const inflatePromise = (0, import_util.promisify)(import_zlib.inflate);
const extractPnFromMessages = (messages) => {
  for (const msgItem of messages) {
    const message = msgItem.message;
    if (!message?.key?.fromMe || !message.userReceipt?.length) {
      continue;
    }
    const userJid = message.userReceipt[0]?.userJid;
    if (userJid && ((0, import_WABinary.isPnUser)(userJid) || (0, import_WABinary.isHostedPnUser)(userJid))) {
      return userJid;
    }
  }
  return void 0;
};
const downloadHistory = async (msg, options) => {
  const stream = await (0, import_messages_media.downloadContentFromMessage)(msg, "md-msg-hist", { options });
  const inflater = (0, import_zlib.createInflate)();
  const chunks = [];
  inflater.on("data", (chunk) => chunks.push(chunk));
  await (0, import_promises.pipeline)(stream, inflater);
  const buffer = Buffer.concat(chunks);
  const syncData = import_WAProto.proto.HistorySync.decode(buffer);
  return syncData;
};
const processHistoryMessage = (item, logger) => {
  const messages = [];
  const contacts = [];
  const chats = [];
  const lidPnMappings = [];
  logger?.trace({ progress: item.progress }, "processing history of type " + item.syncType?.toString());
  for (const m of item.phoneNumberToLidMappings || []) {
    if (m.lidJid && m.pnJid) {
      lidPnMappings.push({ lid: m.lidJid, pn: m.pnJid });
    }
  }
  switch (item.syncType) {
    case import_WAProto.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP:
    case import_WAProto.proto.HistorySync.HistorySyncType.RECENT:
    case import_WAProto.proto.HistorySync.HistorySyncType.FULL:
    case import_WAProto.proto.HistorySync.HistorySyncType.ON_DEMAND:
      for (const chat of item.conversations) {
        contacts.push({
          id: chat.id,
          name: chat.displayName || chat.name || chat.username || void 0,
          username: chat.username || void 0,
          lid: chat.lidJid || chat.accountLid || void 0,
          phoneNumber: chat.pnJid || void 0
        });
        const chatId = chat.id;
        const isLid = (0, import_WABinary.isLidUser)(chatId) || (0, import_WABinary.isHostedLidUser)(chatId);
        const isPn = (0, import_WABinary.isPnUser)(chatId) || (0, import_WABinary.isHostedPnUser)(chatId);
        if (isLid && chat.pnJid) {
          lidPnMappings.push({ lid: chatId, pn: chat.pnJid });
        } else if (isPn && chat.lidJid) {
          lidPnMappings.push({ lid: chat.lidJid, pn: chatId });
        } else if (isLid && !chat.pnJid) {
          const pnFromReceipt = extractPnFromMessages(chat.messages || []);
          if (pnFromReceipt) {
            lidPnMappings.push({ lid: chatId, pn: pnFromReceipt });
          }
        }
        const msgs = chat.messages || [];
        delete chat.messages;
        for (const item2 of msgs) {
          const message = item2.message;
          messages.push(message);
          if (!chat.messages?.length) {
            chat.messages = [{ message }];
          }
          if (!message.key.fromMe && !chat.lastMessageRecvTimestamp) {
            chat.lastMessageRecvTimestamp = (0, import_generics.toNumber)(message.messageTimestamp);
          }
          if ((message.messageStubType === import_Types.WAMessageStubType.BIZ_PRIVACY_MODE_TO_BSP || message.messageStubType === import_Types.WAMessageStubType.BIZ_PRIVACY_MODE_TO_FB) && message.messageStubParameters?.[0]) {
            contacts.push({
              id: message.key.participant || message.key.remoteJid,
              verifiedName: message.messageStubParameters?.[0]
            });
          }
        }
        chats.push(chat);
      }
      break;
    case import_WAProto.proto.HistorySync.HistorySyncType.PUSH_NAME:
      for (const c of item.pushnames) {
        contacts.push({ id: c.id, notify: c.pushname });
      }
      break;
  }
  return {
    chats,
    contacts,
    messages,
    lidPnMappings,
    pastParticipants: item.pastParticipants,
    syncType: item.syncType,
    progress: item.progress
  };
};
const downloadAndProcessHistorySyncNotification = async (msg, options, logger) => {
  let historyMsg;
  if (msg.initialHistBootstrapInlinePayload) {
    historyMsg = import_WAProto.proto.HistorySync.decode(await inflatePromise(msg.initialHistBootstrapInlinePayload));
  } else {
    historyMsg = await downloadHistory(msg, options);
  }
  return processHistoryMessage(historyMsg, logger);
};
const getHistoryMsg = (message) => {
  const normalizedContent = !!message ? (0, import_messages.normalizeMessageContent)(message) : void 0;
  const anyHistoryMsg = normalizedContent?.protocolMessage?.historySyncNotification;
  return anyHistoryMsg;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  downloadAndProcessHistorySyncNotification,
  downloadHistory,
  getHistoryMsg,
  processHistoryMessage
});
