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
var process_message_exports = {};
__export(process_message_exports, {
  cleanMessage: () => cleanMessage,
  decryptEventResponse: () => decryptEventResponse,
  decryptPollVote: () => decryptPollVote,
  default: () => process_message_default,
  getChatId: () => getChatId,
  isRealMessage: () => isRealMessage,
  shouldIncrementChatUnread: () => shouldIncrementChatUnread
});
module.exports = __toCommonJS(process_message_exports);
var import_boom = require("@hapi/boom");
var import_WAProto = require("../../WAProto/index.js");
var import_Types = require("../Types/index.js");
var import_messages = require("../Utils/messages.js");
var import_WABinary = require("../WABinary/index.js");
var import_crypto = require("./crypto.js");
var import_generics = require("./generics.js");
var import_history = require("./history.js");
var import_tc_token_utils = require("./tc-token-utils.js");
const REAL_MSG_STUB_TYPES = /* @__PURE__ */ new Set([
  import_Types.WAMessageStubType.CALL_MISSED_GROUP_VIDEO,
  import_Types.WAMessageStubType.CALL_MISSED_GROUP_VOICE,
  import_Types.WAMessageStubType.CALL_MISSED_VIDEO,
  import_Types.WAMessageStubType.CALL_MISSED_VOICE
]);
const REAL_MSG_REQ_ME_STUB_TYPES = /* @__PURE__ */ new Set([import_Types.WAMessageStubType.GROUP_PARTICIPANT_ADD]);
async function storeTcTokensFromHistorySync(chats, signalRepository, keyStore, logger) {
  const getLIDForPN = signalRepository.lidMapping.getLIDForPN.bind(signalRepository.lidMapping);
  const candidates = [];
  for (const chat of chats) {
    const ts = chat.tcTokenTimestamp ? (0, import_generics.toNumber)(chat.tcTokenTimestamp) : 0;
    if (chat.tcToken?.length && ts > 0) {
      const jid = (0, import_WABinary.jidNormalizedUser)(chat.id);
      const storageJid = await (0, import_tc_token_utils.resolveTcTokenJid)(jid, getLIDForPN);
      candidates.push({
        storageJid,
        token: Buffer.from(chat.tcToken),
        ts,
        senderTs: chat.tcTokenSenderTimestamp ? (0, import_generics.toNumber)(chat.tcTokenSenderTimestamp) : void 0
      });
    }
  }
  if (!candidates.length) {
    return;
  }
  const jids = candidates.map((c) => c.storageJid);
  const existing = await keyStore.get("tctoken", jids);
  const entries = {};
  for (const c of candidates) {
    const existingEntry = existing[c.storageJid];
    const existingTs = existingEntry?.timestamp ? Number(existingEntry.timestamp) : 0;
    if (existingTs > 0 && existingTs >= c.ts) {
      continue;
    }
    entries[c.storageJid] = {
      ...existingEntry,
      token: c.token,
      timestamp: String(c.ts),
      ...c.senderTs !== void 0 ? { senderTimestamp: c.senderTs } : {}
    };
  }
  if (Object.keys(entries).length) {
    logger?.debug({ count: Object.keys(entries).length }, "storing tctokens from history sync");
    try {
      const indexWrite = await (0, import_tc_token_utils.buildMergedTcTokenIndexWrite)(keyStore, Object.keys(entries));
      await keyStore.set({ tctoken: { ...entries, ...indexWrite } });
    } catch (err) {
      logger?.warn({ err }, "failed to store tctokens from history sync");
    }
  }
}
const cleanMessage = (message, meId, meLid) => {
  if ((0, import_WABinary.isHostedPnUser)(message.key.remoteJid) || (0, import_WABinary.isHostedLidUser)(message.key.remoteJid)) {
    message.key.remoteJid = (0, import_WABinary.jidEncode)((0, import_WABinary.jidDecode)(message.key?.remoteJid)?.user, (0, import_WABinary.isHostedPnUser)(message.key.remoteJid) ? "s.whatsapp.net" : "lid");
  } else {
    message.key.remoteJid = (0, import_WABinary.jidNormalizedUser)(message.key.remoteJid);
  }
  if ((0, import_WABinary.isHostedPnUser)(message.key.participant) || (0, import_WABinary.isHostedLidUser)(message.key.participant)) {
    message.key.participant = (0, import_WABinary.jidEncode)((0, import_WABinary.jidDecode)(message.key.participant)?.user, (0, import_WABinary.isHostedPnUser)(message.key.participant) ? "s.whatsapp.net" : "lid");
  } else {
    message.key.participant = (0, import_WABinary.jidNormalizedUser)(message.key.participant);
  }
  const content = (0, import_messages.normalizeMessageContent)(message.message);
  if (content?.reactionMessage) {
    normaliseKey(content.reactionMessage.key);
  }
  if (content?.pollUpdateMessage) {
    normaliseKey(content.pollUpdateMessage.pollCreationMessageKey);
  }
  function normaliseKey(msgKey) {
    if (!message.key.fromMe) {
      msgKey.fromMe = !msgKey.fromMe ? (0, import_WABinary.areJidsSameUser)(msgKey.participant || msgKey.remoteJid, meId) || (0, import_WABinary.areJidsSameUser)(msgKey.participant || msgKey.remoteJid, meLid) : (
        // if the message being reacted to, was from them
        // fromMe automatically becomes false
        false
      );
      msgKey.remoteJid = message.key.remoteJid;
      msgKey.participant = msgKey.participant || message.key.participant;
    }
  }
};
const isRealMessage = (message) => {
  const normalizedContent = (0, import_messages.normalizeMessageContent)(message.message);
  const hasSomeContent = !!(0, import_messages.getContentType)(normalizedContent);
  return (!!normalizedContent || REAL_MSG_STUB_TYPES.has(message.messageStubType) || REAL_MSG_REQ_ME_STUB_TYPES.has(message.messageStubType)) && hasSomeContent && !normalizedContent?.protocolMessage && !normalizedContent?.reactionMessage && !normalizedContent?.pollUpdateMessage;
};
const shouldIncrementChatUnread = (message) => !message.key.fromMe && !message.messageStubType;
const getChatId = ({ remoteJid, participant, fromMe }) => {
  if (!remoteJid) {
    throw new import_boom.Boom("Cannot derive chat id: message key is missing remoteJid", {
      data: { remoteJid, participant, fromMe }
    });
  }
  if ((0, import_WABinary.isJidBroadcast)(remoteJid) && !(0, import_WABinary.isJidStatusBroadcast)(remoteJid) && !fromMe) {
    if (!participant) {
      throw new import_boom.Boom("Cannot derive chat id: broadcast message key is missing participant", {
        data: { remoteJid, fromMe }
      });
    }
    return participant;
  }
  return remoteJid;
};
function decryptPollVote({ encPayload, encIv }, { pollCreatorJid, pollMsgId, pollEncKey, voterJid }) {
  const sign = Buffer.concat([
    toBinary(pollMsgId),
    toBinary(pollCreatorJid),
    toBinary(voterJid),
    toBinary("Poll Vote"),
    new Uint8Array([1])
  ]);
  const key0 = (0, import_crypto.hmacSign)(pollEncKey, new Uint8Array(32), "sha256");
  const decKey = (0, import_crypto.hmacSign)(sign, key0, "sha256");
  const aad = toBinary(`${pollMsgId}\0${voterJid}`);
  const decrypted = (0, import_crypto.aesDecryptGCM)(encPayload, decKey, encIv, aad);
  return import_WAProto.proto.Message.PollVoteMessage.decode(decrypted);
  function toBinary(txt) {
    return Buffer.from(txt);
  }
}
function decryptEventResponse({ encPayload, encIv }, { eventCreatorJid, eventMsgId, eventEncKey, responderJid }) {
  const sign = Buffer.concat([
    toBinary(eventMsgId),
    toBinary(eventCreatorJid),
    toBinary(responderJid),
    toBinary("Event Response"),
    new Uint8Array([1])
  ]);
  const key0 = (0, import_crypto.hmacSign)(eventEncKey, new Uint8Array(32), "sha256");
  const decKey = (0, import_crypto.hmacSign)(sign, key0, "sha256");
  const aad = toBinary(`${eventMsgId}\0${responderJid}`);
  const decrypted = (0, import_crypto.aesDecryptGCM)(encPayload, decKey, encIv, aad);
  return import_WAProto.proto.Message.EventResponseMessage.decode(decrypted);
  function toBinary(txt) {
    return Buffer.from(txt);
  }
}
const processMessage = async (message, { shouldProcessHistoryMsg, placeholderResendCache, ev, creds, signalRepository, keyStore, logger, options, getMessage }) => {
  const meId = creds.me.id;
  const { accountSettings } = creds;
  const chat = { id: (0, import_WABinary.jidNormalizedUser)(getChatId(message.key)) };
  const isRealMsg = isRealMessage(message);
  if (isRealMsg) {
    chat.messages = [{ message }];
    chat.conversationTimestamp = (0, import_generics.toNumber)(message.messageTimestamp);
    if (shouldIncrementChatUnread(message)) {
      chat.unreadCount = (chat.unreadCount || 0) + 1;
    }
  }
  const content = (0, import_messages.normalizeMessageContent)(message.message);
  if ((isRealMsg || content?.reactionMessage?.key?.fromMe) && accountSettings?.unarchiveChats) {
    chat.archived = false;
    chat.readOnly = false;
  }
  const protocolMsg = content?.protocolMessage;
  if (protocolMsg) {
    const SELF_ONLY_TYPES = /* @__PURE__ */ new Set([
      import_WAProto.proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION,
      import_WAProto.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_SHARE,
      import_WAProto.proto.Message.ProtocolMessage.Type.LID_MIGRATION_MAPPING_SYNC,
      import_WAProto.proto.Message.ProtocolMessage.Type.PEER_DATA_OPERATION_REQUEST_RESPONSE_MESSAGE
    ]);
    if (protocolMsg.type !== null && protocolMsg.type !== void 0 && SELF_ONLY_TYPES.has(protocolMsg.type) && !message.key.fromMe) {
      logger?.warn({ msgId: message.key.id, type: protocolMsg.type, from: message.key.participant || message.key.remoteJid }, "dropping spoofed self-only protocolMessage from non-self origin");
      return;
    }
    switch (protocolMsg.type) {
      case import_WAProto.proto.Message.ProtocolMessage.Type.HISTORY_SYNC_NOTIFICATION:
        const histNotification = protocolMsg.historySyncNotification;
        const process = shouldProcessHistoryMsg;
        const isLatest = !creds.processedHistoryMessages?.length;
        logger?.info({
          histNotification,
          process,
          id: message.key.id,
          isLatest
        }, "got history notification");
        if (process) {
          if (histNotification.syncType !== import_WAProto.proto.HistorySync.HistorySyncType.ON_DEMAND) {
            ev.emit("creds.update", {
              processedHistoryMessages: [
                ...creds.processedHistoryMessages || [],
                { key: message.key, messageTimestamp: message.messageTimestamp }
              ]
            });
          }
          const data = await (0, import_history.downloadAndProcessHistorySyncNotification)(histNotification, options, logger);
          if (data.lidPnMappings?.length) {
            logger?.debug({ count: data.lidPnMappings.length }, "processing LID-PN mappings from history sync");
            await signalRepository.lidMapping.storeLIDPNMappings(data.lidPnMappings).catch((err) => logger?.warn({ err }, "failed to store LID-PN mappings from history sync"));
          }
          await storeTcTokensFromHistorySync(data.chats, signalRepository, keyStore, logger);
          ev.emit("messaging-history.set", {
            ...data,
            isLatest: histNotification.syncType !== import_WAProto.proto.HistorySync.HistorySyncType.ON_DEMAND ? isLatest : void 0,
            chunkOrder: histNotification.chunkOrder,
            peerDataRequestSessionId: histNotification.peerDataRequestSessionId
          });
        }
        break;
      case import_WAProto.proto.Message.ProtocolMessage.Type.APP_STATE_SYNC_KEY_SHARE:
        const keys = protocolMsg.appStateSyncKeyShare.keys;
        if (keys?.length) {
          let newAppStateSyncKeyId = "";
          await keyStore.transaction(async () => {
            const newKeys = [];
            for (const { keyData, keyId } of keys) {
              const strKeyId = Buffer.from(keyId.keyId).toString("base64");
              newKeys.push(strKeyId);
              await keyStore.set({ "app-state-sync-key": { [strKeyId]: keyData } });
              newAppStateSyncKeyId = strKeyId;
            }
            logger?.info({ newAppStateSyncKeyId, newKeys }, "injecting new app state sync keys");
          }, meId);
          ev.emit("creds.update", { myAppStateKeyId: newAppStateSyncKeyId });
        } else {
          logger?.info({ protocolMsg }, "recv app state sync with 0 keys");
        }
        break;
      case import_WAProto.proto.Message.ProtocolMessage.Type.REVOKE:
        ev.emit("messages.update", [
          {
            key: {
              ...message.key,
              id: protocolMsg.key.id
            },
            update: { message: null, messageStubType: import_Types.WAMessageStubType.REVOKE, key: message.key }
          }
        ]);
        break;
      case import_WAProto.proto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING:
        Object.assign(chat, {
          ephemeralSettingTimestamp: (0, import_generics.toNumber)(message.messageTimestamp),
          ephemeralExpiration: protocolMsg.ephemeralExpiration || null
        });
        break;
      case import_WAProto.proto.Message.ProtocolMessage.Type.PEER_DATA_OPERATION_REQUEST_RESPONSE_MESSAGE:
        const response = protocolMsg.peerDataOperationRequestResponseMessage;
        if (response) {
          const peerDataOperationResult = response.peerDataOperationResult || [];
          for (const result of peerDataOperationResult) {
            const retryResponse = result?.placeholderMessageResendResponse;
            if (!retryResponse?.webMessageInfoBytes) {
              continue;
            }
            try {
              const webMessageInfo = import_WAProto.proto.WebMessageInfo.decode(retryResponse.webMessageInfoBytes);
              const msgId = webMessageInfo.key?.id;
              const cachedData = msgId ? await placeholderResendCache?.get(msgId) : void 0;
              if (msgId) {
                await placeholderResendCache?.del(msgId);
              }
              let finalMsg;
              if (cachedData && typeof cachedData === "object") {
                cachedData.message = webMessageInfo.message;
                if (webMessageInfo.messageTimestamp) {
                  cachedData.messageTimestamp = webMessageInfo.messageTimestamp;
                }
                finalMsg = cachedData;
              } else {
                finalMsg = webMessageInfo;
              }
              logger?.debug({ msgId, requestId: response.stanzaId }, "received placeholder resend");
              ev.emit("messages.upsert", {
                messages: [finalMsg],
                type: "notify",
                requestId: response.stanzaId
              });
            } catch (err) {
              logger?.warn({ err, stanzaId: response.stanzaId }, "failed to decode placeholder resend response");
            }
          }
        }
        break;
      case import_WAProto.proto.Message.ProtocolMessage.Type.MESSAGE_EDIT:
        ev.emit("messages.update", [
          {
            // flip the sender / fromMe properties because they're in the perspective of the sender
            key: { ...message.key, id: protocolMsg.key?.id },
            update: {
              message: {
                editedMessage: {
                  message: protocolMsg.editedMessage
                }
              },
              messageTimestamp: protocolMsg.timestampMs ? Math.floor((0, import_generics.toNumber)(protocolMsg.timestampMs) / 1e3) : message.messageTimestamp
            }
          }
        ]);
        break;
      case import_WAProto.proto.Message.ProtocolMessage.Type.GROUP_MEMBER_LABEL_CHANGE:
        const labelAssociationMsg = protocolMsg.memberLabel;
        if (labelAssociationMsg?.label) {
          ev.emit("group.member-tag.update", {
            groupId: chat.id,
            label: labelAssociationMsg.label,
            participant: message.key.participant,
            participantAlt: message.key.participantAlt,
            messageTimestamp: Number(message.messageTimestamp)
          });
        }
        break;
      case import_WAProto.proto.Message.ProtocolMessage.Type.LID_MIGRATION_MAPPING_SYNC:
        const encodedPayload = protocolMsg.lidMigrationMappingSyncMessage?.encodedMappingPayload;
        const { pnToLidMappings, chatDbMigrationTimestamp } = import_WAProto.proto.LIDMigrationMappingSyncPayload.decode(encodedPayload);
        logger?.debug({ pnToLidMappings, chatDbMigrationTimestamp }, "got lid mappings and chat db migration timestamp");
        const pairs = [];
        for (const { pn, latestLid, assignedLid } of pnToLidMappings) {
          const lid = latestLid || assignedLid;
          pairs.push({ lid: `${lid}@lid`, pn: `${pn}@s.whatsapp.net` });
        }
        await signalRepository.lidMapping.storeLIDPNMappings(pairs);
        if (pairs.length) {
          for (const { pn, lid } of pairs) {
            await signalRepository.migrateSession(pn, lid);
          }
        }
    }
  } else if (content?.reactionMessage) {
    const reaction = {
      ...content.reactionMessage,
      key: message.key
    };
    ev.emit("messages.reaction", [
      {
        reaction,
        key: content.reactionMessage?.key
      }
    ]);
  } else if (content?.encEventResponseMessage) {
    const encEventResponse = content.encEventResponseMessage;
    const creationMsgKey = encEventResponse.eventCreationMessageKey;
    const eventMsg = await getMessage(creationMsgKey);
    if (eventMsg) {
      try {
        const meIdNormalised = (0, import_WABinary.jidNormalizedUser)(meId);
        const eventCreatorKey = creationMsgKey.participant || creationMsgKey.remoteJid;
        const eventCreatorPn = (0, import_WABinary.isLidUser)(eventCreatorKey) ? await signalRepository.lidMapping.getPNForLID(eventCreatorKey) : eventCreatorKey;
        const eventCreatorJid = (0, import_generics.getKeyAuthor)({ remoteJid: (0, import_WABinary.jidNormalizedUser)(eventCreatorPn), fromMe: meIdNormalised === eventCreatorPn }, meIdNormalised);
        const responderJid = (0, import_generics.getKeyAuthor)(message.key, meIdNormalised);
        const eventEncKey = eventMsg?.messageContextInfo?.messageSecret;
        if (!eventEncKey) {
          logger?.warn({ creationMsgKey }, "event response: missing messageSecret for decryption");
        } else {
          const responseMsg = decryptEventResponse(encEventResponse, {
            eventEncKey,
            eventCreatorJid,
            eventMsgId: creationMsgKey.id,
            responderJid
          });
          const eventResponse = {
            eventResponseMessageKey: message.key,
            senderTimestampMs: responseMsg.timestampMs,
            response: responseMsg
          };
          ev.emit("messages.update", [
            {
              key: creationMsgKey,
              update: {
                eventResponses: [eventResponse]
              }
            }
          ]);
        }
      } catch (err) {
        logger?.warn({ err, creationMsgKey }, "failed to decrypt event response");
      }
    } else {
      logger?.warn({ creationMsgKey }, "event creation message not found, cannot decrypt response");
    }
  } else if (message.messageStubType) {
    const jid = message.key?.remoteJid;
    let participants;
    const emitParticipantsUpdate = (action) => ev.emit("group-participants.update", {
      id: jid,
      author: message.key.participant,
      authorPn: message.key.participantAlt,
      authorUsername: message.key.participantUsername,
      participants,
      action
    });
    const emitGroupUpdate = (update) => {
      ev.emit("groups.update", [
        {
          id: jid,
          ...update,
          author: message.key.participant ?? void 0,
          authorPn: message.key.participantAlt,
          authorUsername: message.key.participantUsername
        }
      ]);
    };
    const emitGroupRequestJoin = (participant, action, method) => {
      ev.emit("group.join-request", {
        id: jid,
        author: message.key.participant,
        authorPn: message.key.participantAlt,
        authorUsername: message.key.participantUsername,
        participant: participant.lid,
        participantPn: participant.pn,
        action,
        method
      });
    };
    const participantsIncludesMe = () => participants.find((jid2) => (0, import_WABinary.areJidsSameUser)(meId, jid2.phoneNumber));
    switch (message.messageStubType) {
      case import_Types.WAMessageStubType.GROUP_PARTICIPANT_CHANGE_NUMBER:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate("modify");
        break;
      case import_Types.WAMessageStubType.GROUP_PARTICIPANT_LEAVE:
      case import_Types.WAMessageStubType.GROUP_PARTICIPANT_REMOVE:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate("remove");
        if (participantsIncludesMe()) {
          chat.readOnly = true;
        }
        break;
      case import_Types.WAMessageStubType.GROUP_PARTICIPANT_ADD:
      case import_Types.WAMessageStubType.GROUP_PARTICIPANT_INVITE:
      case import_Types.WAMessageStubType.GROUP_PARTICIPANT_ADD_REQUEST_JOIN:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        if (participantsIncludesMe()) {
          chat.readOnly = false;
        }
        emitParticipantsUpdate("add");
        break;
      case import_Types.WAMessageStubType.GROUP_PARTICIPANT_DEMOTE:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate("demote");
        break;
      case import_Types.WAMessageStubType.GROUP_PARTICIPANT_PROMOTE:
        participants = message.messageStubParameters.map((a) => JSON.parse(a)) || [];
        emitParticipantsUpdate("promote");
        break;
      case import_Types.WAMessageStubType.GROUP_CHANGE_ANNOUNCE:
        const announceValue = message.messageStubParameters?.[0];
        emitGroupUpdate({ announce: announceValue === "true" || announceValue === "on" });
        break;
      case import_Types.WAMessageStubType.GROUP_CHANGE_RESTRICT:
        const restrictValue = message.messageStubParameters?.[0];
        emitGroupUpdate({ restrict: restrictValue === "true" || restrictValue === "on" });
        break;
      case import_Types.WAMessageStubType.GROUP_CHANGE_SUBJECT:
        const name = message.messageStubParameters?.[0];
        chat.name = name;
        emitGroupUpdate({ subject: name });
        break;
      case import_Types.WAMessageStubType.GROUP_CHANGE_DESCRIPTION:
        const description = message.messageStubParameters?.[0];
        chat.description = description;
        emitGroupUpdate({ desc: description });
        break;
      case import_Types.WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
        const code = message.messageStubParameters?.[0];
        emitGroupUpdate({ inviteCode: code });
        break;
      case import_Types.WAMessageStubType.GROUP_MEMBER_ADD_MODE:
        const memberAddValue = message.messageStubParameters?.[0];
        emitGroupUpdate({ memberAddMode: memberAddValue === "all_member_add" });
        break;
      case import_Types.WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_MODE:
        const approvalMode = message.messageStubParameters?.[0];
        emitGroupUpdate({ joinApprovalMode: approvalMode === "on" });
        break;
      case import_Types.WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_REQUEST_NON_ADMIN_ADD:
        const participant = JSON.parse(message.messageStubParameters?.[0]);
        const action = message.messageStubParameters?.[1];
        const method = message.messageStubParameters?.[2];
        emitGroupRequestJoin(participant, action, method);
        break;
    }
  }
  if (Object.keys(chat).length > 1) {
    ev.emit("chats.update", [chat]);
  }
};
var process_message_default = processMessage;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cleanMessage,
  decryptEventResponse,
  decryptPollVote,
  getChatId,
  isRealMessage,
  shouldIncrementChatUnread
});
