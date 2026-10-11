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
var messages_recv_exports = {};
__export(messages_recv_exports, {
  makeMessagesRecvSocket: () => makeMessagesRecvSocket
});
module.exports = __toCommonJS(messages_recv_exports);
var import_node_cache = __toESM(require("@cacheable/node-cache"));
var import_boom = require("@hapi/boom");
var import_crypto = require("crypto");
var import_long = __toESM(require("long"));
var import_WAProto = require("../../WAProto/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_Types = require("../Types/index.js");
var import_Utils = require("../Utils/index.js");
var import_make_mutex = require("../Utils/make-mutex.js");
var import_offline_node_processor = require("../Utils/offline-node-processor.js");
var import_stanza_ack = require("../Utils/stanza-ack.js");
var import_tc_token_utils = require("../Utils/tc-token-utils.js");
var import_WABinary = require("../WABinary/index.js");
var import_groups = require("./groups.js");
var import_messages_send = require("./messages-send.js");
const ENFORCEMENT_TYPE_VALUES = new Set(Object.values(import_Types.ReachoutTimelockEnforcementType));
function isValidEnforcementType(value) {
  return typeof value === "string" && ENFORCEMENT_TYPE_VALUES.has(value);
}
const makeMessagesRecvSocket = (config) => {
  const { logger, retryRequestDelayMs, maxMsgRetryCount, getMessage, shouldIgnoreJid, enableAutoSessionRecreation } = config;
  const sock = (0, import_messages_send.makeMessagesSocket)(config);
  const { userDevicesCache, devicesMutex, ev, authState, ws, messageMutex, notificationMutex, receiptMutex, signalRepository, query, upsertMessage, resyncAppState, onUnexpectedError, assertSessions, sendNode, relayMessage, sendReceipt, uploadPreKeys, sendPeerDataOperationMessage, messageRetryManager, registerSocketEndHandler, issuePrivacyTokens, fetchAccountReachoutTimelock, placeholderResendCache } = sock;
  const getLIDForPN = signalRepository.lidMapping.getLIDForPN.bind(signalRepository.lidMapping);
  const retryMutex = (0, import_make_mutex.makeMutex)();
  const msgRetryCache = config.msgRetryCounterCache || new import_node_cache.default({
    stdTTL: import_Defaults.DEFAULT_CACHE_TTLS.MSG_RETRY,
    // 1 hour
    useClones: false
  });
  const callOfferCache = config.callOfferCache || new import_node_cache.default({
    stdTTL: import_Defaults.DEFAULT_CACHE_TTLS.CALL_OFFER,
    // 5 mins
    useClones: false
  });
  const identityAssertDebounce = new import_node_cache.default({ stdTTL: 5, useClones: false });
  let sendActiveReceipts = false;
  const fetchMessageHistory = async (count, oldestMsgKey, oldestMsgTimestamp) => {
    if (!authState.creds.me?.id) {
      throw new import_boom.Boom("Not authenticated");
    }
    const pdoMessage = {
      historySyncOnDemandRequest: {
        chatJid: oldestMsgKey.remoteJid,
        oldestMsgFromMe: oldestMsgKey.fromMe,
        oldestMsgId: oldestMsgKey.id,
        oldestMsgTimestampMs: oldestMsgTimestamp,
        onDemandMsgCount: count
      },
      peerDataOperationRequestType: import_WAProto.proto.Message.PeerDataOperationRequestType.HISTORY_SYNC_ON_DEMAND
    };
    return sendPeerDataOperationMessage(pdoMessage);
  };
  const requestPlaceholderResend = async (messageKey, msgData) => {
    if (!authState.creds.me?.id) {
      throw new import_boom.Boom("Not authenticated");
    }
    if (await placeholderResendCache.get(messageKey?.id)) {
      logger.debug({ messageKey }, "already requested resend");
      return;
    } else {
      await placeholderResendCache.set(messageKey?.id, msgData || true);
    }
    await (0, import_Utils.delay)(2e3);
    if (!await placeholderResendCache.get(messageKey?.id)) {
      logger.debug({ messageKey }, "message received while resend requested");
      return "RESOLVED";
    }
    const pdoMessage = {
      placeholderMessageResendRequest: [
        {
          messageKey
        }
      ],
      peerDataOperationRequestType: import_WAProto.proto.Message.PeerDataOperationRequestType.PLACEHOLDER_MESSAGE_RESEND
    };
    setTimeout(async () => {
      if (await placeholderResendCache.get(messageKey?.id)) {
        logger.debug({ messageKey }, "PDO message without response after 8 seconds. Phone possibly offline");
        await placeholderResendCache.del(messageKey?.id);
      }
    }, 8e3);
    return sendPeerDataOperationMessage(pdoMessage);
  };
  const handleMexNotification = async (node) => {
    const updateNode = (0, import_WABinary.getBinaryNodeChild)(node, "update");
    if (updateNode) {
      const opName = updateNode.attrs?.op_name;
      if (!opName) {
        logger.warn({ node: (0, import_WABinary.binaryNodeToString)(node) }, "mex notification missing op_name, fallback to legacy");
        await handleLegacyMexNewsletterNotification(node);
        return;
      }
      let mexResponse;
      try {
        mexResponse = JSON.parse(updateNode.content.toString());
      } catch (error) {
        logger.error({ err: error, opName }, "failed to parse mex notification JSON");
        return;
      }
      if (mexResponse.errors?.length) {
        logger.warn({ errors: mexResponse.errors, opName }, "mex notification has GQL errors");
        return;
      }
      const data = mexResponse.data;
      if (!data) {
        logger.warn({ opName }, "mex notification has null data");
        return;
      }
      logger.debug({ opName }, "processing mex notification");
      switch (opName) {
        case "NotificationUserReachoutTimelockUpdate":
          handleReachoutTimelockNotification(data);
          break;
        case "MessageCappingInfoNotification":
          handleMessageCappingNotification(data);
          break;
        // newsletter ops still use the legacy <mex> child structure
        case "NotificationNewsletterUpdate":
        case "NotificationLinkedProfilesUpdates":
        case "NotificationNewsletterAdminPromote":
        case "NotificationNewsletterAdminDemote":
        case "NotificationNewsletterUserSettingChange":
        case "NotificationNewsletterJoin":
        case "NotificationNewsletterLeave":
        case "NotificationNewsletterStateChange":
        case "NotificationNewsletterAdminMetadataUpdate":
        case "NotificationNewsletterOwnerUpdate":
        case "NotificationNewsletterAdminInviteRevoke":
        case "NotificationNewsletterWamoSubStatusChange":
        case "NotificationNewsletterBlockUser":
        case "NotificationNewsletterPaidPartnership":
        case "NotificationNewsletterMilestone":
        case "NewsletterResponseStateUpdate":
          await handleLegacyMexNewsletterNotification(node);
          break;
        default:
          logger.debug({ opName }, "unhandled mex notification");
          break;
      }
      return;
    }
    await handleLegacyMexNewsletterNotification(node);
  };
  const handleReachoutTimelockNotification = (data) => {
    const payload = data.xwa2_notify_account_reachout_timelock;
    if (!payload) {
      logger.warn("reachout timelock notification missing payload");
      return;
    }
    if (!payload.is_active) {
      logger.info("reachout timelock restriction lifted");
      ev.emit("connection.update", {
        reachoutTimeLock: {
          isActive: false,
          enforcementType: import_Types.ReachoutTimelockEnforcementType.DEFAULT
        }
      });
      return;
    }
    const timeEnforcementEnds = payload.time_enforcement_ends ? new Date(parseInt(payload.time_enforcement_ends, 10) * 1e3) : new Date(Date.now() + 6e4);
    const enforcementType = isValidEnforcementType(payload.enforcement_type) ? payload.enforcement_type : import_Types.ReachoutTimelockEnforcementType.DEFAULT;
    logger.info({ enforcementType, timeEnforcementEnds }, "reachout timelock restriction set");
    ev.emit("connection.update", {
      reachoutTimeLock: {
        isActive: true,
        timeEnforcementEnds,
        enforcementType
      }
    });
  };
  const handleMessageCappingNotification = (data) => {
    const payload = data.xwa2_notify_new_chat_messages_capping_info_update;
    if (!payload) {
      logger.warn("message capping notification missing payload");
      return;
    }
    logger.info({ payload }, "received message capping update");
    ev.emit("message-capping.update", payload);
  };
  const handleLegacyMexNewsletterNotification = async (node) => {
    const mexNode = (0, import_WABinary.getBinaryNodeChild)(node, "mex");
    const updateNode = mexNode?.content ? null : (0, import_WABinary.getBinaryNodeChild)(node, "update") || (0, import_WABinary.getAllBinaryNodeChildren)(node)[0];
    const payloadNode = mexNode?.content ? mexNode : updateNode;
    if (!payloadNode?.content) {
      logger.warn({ node: (0, import_WABinary.binaryNodeToString)(node) }, "invalid mex newsletter notification");
      return;
    }
    let data;
    try {
      const payloadContent = payloadNode.content;
      if (Array.isArray(payloadContent)) {
        logger.warn({ payloadNode }, "invalid mex newsletter notification payload format");
        return;
      }
      const contentBuf = typeof payloadContent === "string" ? Buffer.from(payloadContent, "binary") : Buffer.from(payloadContent);
      data = JSON.parse(contentBuf.toString());
    } catch (error) {
      logger.error({ err: error, node: (0, import_WABinary.binaryNodeToString)(node) }, "failed to parse mex newsletter notification");
      return;
    }
    const operation = data?.operation ?? payloadNode?.attrs?.op_name;
    let updates = data?.updates;
    if (!updates) {
      const linkedProfiles = data?.data?.xwa2_notify_linked_profiles;
      if (linkedProfiles) {
        updates = [linkedProfiles];
      }
    }
    if (!updates || !operation) {
      logger.warn({ data }, "invalid mex newsletter notification content");
      return;
    }
    logger.info({ operation, updates }, "got mex newsletter notification");
    switch (operation) {
      case "NotificationNewsletterUpdate":
        for (const update of updates) {
          if (update.jid && update.settings && Object.keys(update.settings).length > 0) {
            ev.emit("newsletter-settings.update", {
              id: update.jid,
              update: update.settings
            });
          }
        }
        break;
      case "NotificationNewsletterAdminPromote":
        for (const update of updates) {
          if (update.jid && update.user) {
            ev.emit("newsletter-participants.update", {
              id: update.jid,
              author: node.attrs.from,
              user: update.user,
              new_role: "ADMIN",
              action: "promote"
            });
          }
        }
        break;
      case "NotificationLinkedProfilesUpdates":
        for (const update of updates) {
          const lid = update?.jid;
          const addedProfiles = Array.isArray(update?.added_profiles) ? update.added_profiles : [];
          const mappings = [];
          for (const profile of addedProfiles) {
            const pn = typeof profile === "string" ? profile : profile?.pn ?? profile?.jid ?? null;
            if (lid && pn) {
              const mapping = { lid, pn };
              ev.emit("lid-mapping.update", mapping);
              mappings.push(mapping);
            }
          }
          await signalRepository.lidMapping.storeLIDPNMappings(mappings);
        }
        break;
      default:
        logger.info({ operation, data }, "unhandled mex newsletter notification");
        break;
    }
  };
  const handleNewsletterNotification = async (node) => {
    const from = node.attrs.from;
    const children = (0, import_WABinary.getAllBinaryNodeChildren)(node);
    const author = node.attrs.participant;
    for (const child of children) {
      logger.debug({ from, child }, "got newsletter notification");
      switch (child.tag) {
        case "reaction": {
          const reactionUpdate = {
            id: from,
            server_id: child.attrs.message_id,
            reaction: {
              code: (0, import_WABinary.getBinaryNodeChildString)(child, "reaction"),
              count: 1
            }
          };
          ev.emit("newsletter.reaction", reactionUpdate);
          break;
        }
        case "view": {
          const viewUpdate = {
            id: from,
            server_id: child.attrs.message_id,
            count: parseInt(child.content?.toString() || "0", 10)
          };
          ev.emit("newsletter.view", viewUpdate);
          break;
        }
        case "participant": {
          const participantUpdate = {
            id: from,
            author,
            user: child.attrs.jid,
            action: child.attrs.action,
            new_role: child.attrs.role
          };
          ev.emit("newsletter-participants.update", participantUpdate);
          break;
        }
        case "update": {
          const settingsNode = (0, import_WABinary.getBinaryNodeChild)(child, "settings");
          if (settingsNode) {
            const update = {};
            const nameNode = (0, import_WABinary.getBinaryNodeChild)(settingsNode, "name");
            if (nameNode?.content)
              update.name = nameNode.content.toString();
            const descriptionNode = (0, import_WABinary.getBinaryNodeChild)(settingsNode, "description");
            if (descriptionNode?.content)
              update.description = descriptionNode.content.toString();
            ev.emit("newsletter-settings.update", {
              id: from,
              update
            });
          }
          break;
        }
        case "message": {
          const plaintextNode = (0, import_WABinary.getBinaryNodeChild)(child, "plaintext");
          if (plaintextNode?.content) {
            try {
              const contentBuf = typeof plaintextNode.content === "string" ? Buffer.from(plaintextNode.content, "binary") : Buffer.from(plaintextNode.content);
              const messageProto = import_WAProto.proto.Message.decode(contentBuf).toJSON();
              const fullMessage = import_WAProto.proto.WebMessageInfo.fromObject({
                key: {
                  remoteJid: from,
                  id: child.attrs.message_id || child.attrs.server_id,
                  fromMe: false
                  // TODO: is this really true though
                },
                message: messageProto,
                messageTimestamp: +child.attrs.t
              }).toJSON();
              await upsertMessage(fullMessage, "append");
              logger.debug("Processed plaintext newsletter message");
            } catch (error) {
              logger.error({ error }, "Failed to decode plaintext newsletter message");
            }
          }
          break;
        }
        default:
          logger.warn({ node, child }, "Unknown newsletter notification child");
          break;
      }
    }
  };
  const sendMessageAck = async (node, errorCode) => {
    const stanza = (0, import_stanza_ack.buildAckStanza)(node, errorCode, authState.creds.me.id);
    logger.debug({ recv: { tag: node.tag, attrs: node.attrs }, sent: stanza.attrs }, "sent ack");
    await sendNode(stanza);
  };
  const rejectCall = async (callId, callFrom) => {
    const stanza = {
      tag: "call",
      attrs: {
        from: authState.creds.me.id,
        to: callFrom
      },
      content: [
        {
          tag: "reject",
          attrs: {
            "call-id": callId,
            "call-creator": callFrom,
            count: "0"
          },
          content: void 0
        }
      ]
    };
    await query(stanza);
  };
  const sendRetryRequest = async (node, forceIncludeKeys = false) => {
    const { fullMessage } = (0, import_Utils.decodeMessageNode)(node, authState.creds.me.id, authState.creds.me.lid || "");
    const { key: msgKey } = fullMessage;
    const msgId = msgKey.id;
    if (messageRetryManager) {
      if (messageRetryManager.hasExceededMaxRetries(msgId)) {
        logger.debug({ msgId }, "reached retry limit with new retry manager, clearing");
        messageRetryManager.markRetryFailed(msgId);
        return;
      }
      const retryCount2 = messageRetryManager.incrementRetryCount(msgId);
      const key2 = `${msgId}:${msgKey?.participant}`;
      await msgRetryCache.set(key2, retryCount2);
    } else {
      const key2 = `${msgId}:${msgKey?.participant}`;
      let retryCount2 = await msgRetryCache.get(key2) || 0;
      if (retryCount2 >= maxMsgRetryCount) {
        logger.debug({ retryCount: retryCount2, msgId }, "reached retry limit, clearing");
        await msgRetryCache.del(key2);
        return;
      }
      retryCount2 += 1;
      await msgRetryCache.set(key2, retryCount2);
    }
    const key = `${msgId}:${msgKey?.participant}`;
    const retryCount = await msgRetryCache.get(key) || 1;
    const { account, signedPreKey, signedIdentityKey: identityKey } = authState.creds;
    const fromJid = node.attrs.from;
    let shouldRecreateSession = false;
    let recreateReason = "";
    if (enableAutoSessionRecreation && messageRetryManager && retryCount > 1) {
      try {
        const sessionId = signalRepository.jidToSignalProtocolAddress(fromJid);
        const hasSession = await signalRepository.validateSession(fromJid);
        const result = messageRetryManager.shouldRecreateSession(fromJid, hasSession.exists);
        shouldRecreateSession = result.recreate;
        recreateReason = result.reason;
        if (shouldRecreateSession) {
          logger.debug({ fromJid, retryCount, reason: recreateReason }, "recreating session for retry");
          await authState.keys.set({ session: { [sessionId]: null } });
          forceIncludeKeys = true;
        }
      } catch (error) {
        logger.warn({ error, fromJid }, "failed to check session recreation");
      }
    }
    if (retryCount <= 2) {
      if (messageRetryManager) {
        messageRetryManager.schedulePhoneRequest(msgId, async () => {
          try {
            const requestId = await requestPlaceholderResend(msgKey);
            logger.debug(`sendRetryRequest: requested placeholder resend (${requestId}) for message ${msgId} (scheduled)`);
          } catch (error) {
            logger.warn({ error, msgId }, "failed to send scheduled phone request");
          }
        });
      } else {
        const msgId2 = await requestPlaceholderResend(msgKey);
        logger.debug(`sendRetryRequest: requested placeholder resend for message ${msgId2}`);
      }
    }
    const deviceIdentity = (0, import_Utils.encodeSignedDeviceIdentity)(account, true);
    await authState.keys.transaction(async () => {
      const receipt = {
        tag: "receipt",
        attrs: {
          id: msgId,
          type: "retry",
          to: node.attrs.from
        },
        content: [
          {
            tag: "retry",
            attrs: {
              count: retryCount.toString(),
              id: node.attrs.id,
              t: node.attrs.t,
              v: "1",
              // ADD ERROR FIELD
              error: "0"
            }
          },
          {
            tag: "registration",
            attrs: {},
            content: (0, import_Utils.encodeBigEndian)(authState.creds.registrationId)
          }
        ]
      };
      if (node.attrs.recipient) {
        receipt.attrs.recipient = node.attrs.recipient;
      }
      if (node.attrs.participant) {
        receipt.attrs.participant = node.attrs.participant;
      }
      if (retryCount > 1 || forceIncludeKeys || shouldRecreateSession) {
        const { update, preKeys } = await (0, import_Utils.getNextPreKeys)(authState, 1);
        const [keyId] = Object.keys(preKeys);
        const key2 = preKeys[+keyId];
        const content = receipt.content;
        content.push({
          tag: "keys",
          attrs: {},
          content: [
            { tag: "type", attrs: {}, content: Buffer.from(import_Defaults.KEY_BUNDLE_TYPE) },
            { tag: "identity", attrs: {}, content: identityKey.public },
            (0, import_Utils.xmppPreKey)(key2, +keyId),
            (0, import_Utils.xmppSignedPreKey)(signedPreKey),
            { tag: "device-identity", attrs: {}, content: deviceIdentity }
          ]
        });
        ev.emit("creds.update", update);
      }
      await sendNode(receipt);
      logger.info({ msgAttrs: node.attrs, retryCount }, "sent retry receipt");
    }, authState?.creds?.me?.id || "sendRetryRequest");
  };
  const inFlightPreKeyLow = /* @__PURE__ */ new Set();
  const reissueTcTokenAfterIdentityChange = (from) => {
    void (async () => {
      const normalizedJid = (0, import_WABinary.jidNormalizedUser)(from);
      const tcJid = await (0, import_tc_token_utils.resolveTcTokenJid)(normalizedJid, getLIDForPN);
      const tcTokenData = await authState.keys.get("tctoken", [tcJid]);
      const senderTs = tcTokenData?.[tcJid]?.senderTimestamp;
      if (senderTs === null || senderTs === void 0 || (0, import_tc_token_utils.isTcTokenExpired)(senderTs)) {
        return;
      }
      logger.debug({ jid: normalizedJid, senderTimestamp: senderTs }, "identity changed, re-issuing tctoken");
      const getPNForLID = signalRepository.lidMapping.getPNForLID.bind(signalRepository.lidMapping);
      const issueJid = await (0, import_tc_token_utils.resolveIssuanceJid)(normalizedJid, sock.serverProps.lidTrustedTokenIssueToLid, getLIDForPN, getPNForLID);
      const result = await issuePrivacyTokens([issueJid], senderTs);
      await (0, import_tc_token_utils.storeTcTokensFromIqResult)({
        result,
        fallbackJid: tcJid,
        keys: authState.keys,
        getLIDForPN,
        onNewJidStored: trackTcTokenJid
      });
    })().catch((err) => {
      logger.debug({ jid: from, err: err?.message }, "failed to re-issue tctoken after identity change");
    });
  };
  const handleEncryptNotification = async (node) => {
    const from = node.attrs.from;
    if (from === import_WABinary.S_WHATSAPP_NET) {
      const stanzaId = node.attrs.id;
      if (stanzaId && inFlightPreKeyLow.has(stanzaId)) {
        return;
      }
      const countChild = (0, import_WABinary.getBinaryNodeChild)(node, "count");
      const count = +countChild.attrs.value;
      const shouldUploadMorePreKeys = count < import_Defaults.MIN_PREKEY_COUNT;
      logger.debug({ count, shouldUploadMorePreKeys }, "recv pre-key count");
      if (shouldUploadMorePreKeys) {
        if (stanzaId)
          inFlightPreKeyLow.add(stanzaId);
        try {
          await uploadPreKeys();
        } finally {
          if (stanzaId)
            inFlightPreKeyLow.delete(stanzaId);
        }
      }
    } else {
      const result = await (0, import_Utils.handleIdentityChange)(node, {
        meId: authState.creds.me?.id,
        meLid: authState.creds.me?.lid,
        validateSession: signalRepository.validateSession,
        assertSessions,
        debounceCache: identityAssertDebounce,
        logger,
        onBeforeSessionRefresh: reissueTcTokenAfterIdentityChange
      });
      if (result.action === "no_identity_node") {
        logger.info({ node }, "unknown encrypt notification");
      }
    }
  };
  const handleGroupNotification = (fullNode, child, msg) => {
    const actingParticipantLid = fullNode.attrs.participant;
    const actingParticipantPn = fullNode.attrs.participant_pn;
    const actingParticipantUsername = fullNode.attrs.participant_username;
    const affectedParticipantLid = (0, import_WABinary.getBinaryNodeChild)(child, "participant")?.attrs?.jid || actingParticipantLid;
    const affectedParticipantPn = (0, import_WABinary.getBinaryNodeChild)(child, "participant")?.attrs?.phone_number || actingParticipantPn;
    switch (child?.tag) {
      case "create":
        const metadata = (0, import_groups.extractGroupMetadata)(child);
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_CREATE;
        msg.messageStubParameters = [metadata.subject];
        msg.key = { participant: metadata.owner, participantAlt: metadata.ownerPn };
        ev.emit("chats.upsert", [
          {
            id: metadata.id,
            name: metadata.subject,
            conversationTimestamp: metadata.creation
          }
        ]);
        ev.emit("groups.upsert", [
          {
            ...metadata,
            author: actingParticipantLid,
            authorPn: actingParticipantPn,
            authorUsername: actingParticipantUsername
          }
        ]);
        break;
      case "ephemeral":
      case "not_ephemeral":
        msg.message = {
          protocolMessage: {
            type: import_WAProto.proto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING,
            ephemeralExpiration: +(child.attrs.expiration || 0)
          }
        };
        break;
      case "modify":
        const oldNumber = (0, import_WABinary.getBinaryNodeChildren)(child, "participant").map((p) => p.attrs.jid);
        msg.messageStubParameters = oldNumber || [];
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_PARTICIPANT_CHANGE_NUMBER;
        break;
      case "promote":
      case "demote":
      case "remove":
      case "add":
      case "leave":
        const stubType = `GROUP_PARTICIPANT_${child.tag.toUpperCase()}`;
        msg.messageStubType = import_Types.WAMessageStubType[stubType];
        const participants = (0, import_WABinary.getBinaryNodeChildren)(child, "participant").map(({ attrs }) => {
          return {
            id: attrs.jid,
            phoneNumber: (0, import_WABinary.isLidUser)(attrs.jid) && (0, import_WABinary.isPnUser)(attrs.phone_number) ? attrs.phone_number : void 0,
            lid: (0, import_WABinary.isPnUser)(attrs.jid) && (0, import_WABinary.isLidUser)(attrs.lid) ? attrs.lid : void 0,
            username: attrs.participant_username || attrs.username || void 0,
            admin: attrs.type || null
          };
        });
        if (participants.length === 1 && // if recv. "remove" message and sender removed themselves
        // mark as left
        ((0, import_WABinary.areJidsSameUser)(participants[0].id, actingParticipantLid) || (0, import_WABinary.areJidsSameUser)(participants[0].id, actingParticipantPn)) && child.tag === "remove") {
          msg.messageStubType = import_Types.WAMessageStubType.GROUP_PARTICIPANT_LEAVE;
        }
        msg.messageStubParameters = participants.map((a) => JSON.stringify(a));
        break;
      case "subject":
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_CHANGE_SUBJECT;
        msg.messageStubParameters = [child.attrs.subject];
        break;
      case "description":
        const description = (0, import_WABinary.getBinaryNodeChild)(child, "body")?.content?.toString();
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_CHANGE_DESCRIPTION;
        msg.messageStubParameters = description ? [description] : void 0;
        break;
      case "announcement":
      case "not_announcement":
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_CHANGE_ANNOUNCE;
        msg.messageStubParameters = [child.tag === "announcement" ? "on" : "off"];
        break;
      case "locked":
      case "unlocked":
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_CHANGE_RESTRICT;
        msg.messageStubParameters = [child.tag === "locked" ? "on" : "off"];
        break;
      case "invite":
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_CHANGE_INVITE_LINK;
        msg.messageStubParameters = [child.attrs.code];
        break;
      case "member_add_mode":
        const addMode = child.content;
        if (addMode) {
          msg.messageStubType = import_Types.WAMessageStubType.GROUP_MEMBER_ADD_MODE;
          msg.messageStubParameters = [addMode.toString()];
        }
        break;
      case "membership_approval_mode":
        const approvalMode = (0, import_WABinary.getBinaryNodeChild)(child, "group_join");
        if (approvalMode) {
          msg.messageStubType = import_Types.WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_MODE;
          msg.messageStubParameters = [approvalMode.attrs.state];
        }
        break;
      case "created_membership_requests":
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_REQUEST_NON_ADMIN_ADD;
        msg.messageStubParameters = [
          JSON.stringify({ lid: affectedParticipantLid, pn: affectedParticipantPn }),
          "created",
          child.attrs.request_method
        ];
        break;
      case "revoked_membership_requests":
        const isDenied = (0, import_WABinary.areJidsSameUser)(affectedParticipantLid, actingParticipantLid);
        msg.messageStubType = import_Types.WAMessageStubType.GROUP_MEMBERSHIP_JOIN_APPROVAL_REQUEST_NON_ADMIN_ADD;
        msg.messageStubParameters = [
          JSON.stringify({ lid: affectedParticipantLid, pn: affectedParticipantPn }),
          isDenied ? "revoked" : "rejected"
        ];
        break;
    }
  };
  const handleDevicesNotification = async (node) => {
    const [child] = (0, import_WABinary.getAllBinaryNodeChildren)(node);
    const from = (0, import_WABinary.jidNormalizedUser)(node.attrs.from);
    if (!child) {
      logger.debug({ from }, "devices notification missing child, skipping");
      return;
    }
    const tag = child.tag;
    const deviceHash = child.attrs.device_hash;
    const devices = (0, import_WABinary.getBinaryNodeChildren)(child, "device");
    if ((0, import_WABinary.areJidsSameUser)(from, authState.creds.me.id) || (0, import_WABinary.areJidsSameUser)(from, authState.creds.me.lid)) {
      const deviceJids = devices.map((d) => d.attrs.jid);
      logger.info({ deviceJids }, "got my own devices");
    }
    if (!devices.length) {
      logger.debug({ from, tag }, "no devices in notification, skipping");
      return;
    }
    const decoded = [];
    for (const d of devices) {
      const jid = d.attrs.jid;
      if (!jid)
        continue;
      const parts = (0, import_WABinary.jidDecode)(jid);
      if (!parts) {
        logger.debug({ jid }, "failed to decode device jid, skipping");
        continue;
      }
      decoded.push({ jid, user: parts.user, server: parts.server, device: parts.device });
    }
    if (!decoded.length)
      return;
    await devicesMutex.mutex(async () => {
      const byUser = /* @__PURE__ */ new Map();
      for (const d of decoded) {
        const list = byUser.get(d.user) || [];
        list.push(d);
        byUser.set(d.user, list);
      }
      for (const [user, entries] of byUser) {
        if (tag === "update") {
          logger.debug({ user }, `${user}'s device list updated, dropping cached devices`);
          await userDevicesCache?.del(user);
          continue;
        }
        if (tag === "remove") {
          await signalRepository.deleteSession(entries.map((e) => e.jid));
        }
        const existingCache = await userDevicesCache?.get(user) || [];
        if (!existingCache.length) {
          logger.debug({ user, tag }, "device list not cached, deferring to USync refresh");
          continue;
        }
        const affected = new Set(entries.map((e) => e.device));
        let updatedDevices;
        switch (tag) {
          case "add":
            logger.info({ deviceHash, count: entries.length }, "devices added");
            updatedDevices = [
              ...existingCache.filter((d) => !affected.has(d.device)),
              ...entries.map((e) => ({ user: e.user, server: e.server, device: e.device }))
            ];
            break;
          case "remove":
            logger.info({ deviceHash, count: entries.length }, "devices removed");
            updatedDevices = existingCache.filter((d) => !affected.has(d.device));
            break;
          default:
            logger.debug({ tag }, "Unknown device list change tag");
            continue;
        }
        if (updatedDevices.length === 0) {
          await userDevicesCache?.del(user);
        } else {
          await userDevicesCache?.set(user, updatedDevices);
        }
      }
    });
  };
  const processNotification = async (node) => {
    const result = {};
    const [child] = (0, import_WABinary.getAllBinaryNodeChildren)(node);
    const nodeType = node.attrs.type;
    const from = (0, import_WABinary.jidNormalizedUser)(node.attrs.from);
    switch (nodeType) {
      case "newsletter":
        await handleNewsletterNotification(node);
        break;
      case "mex":
        await handleMexNotification(node);
        break;
      case "w:gp2":
        handleGroupNotification(node, child, result);
        break;
      case "mediaretry":
        const event = (0, import_Utils.decodeMediaRetryNode)(node);
        ev.emit("messages.media-update", [event]);
        break;
      case "encrypt":
        await handleEncryptNotification(node);
        break;
      case "devices":
        try {
          await handleDevicesNotification(node);
        } catch (error) {
          logger.error({ error, node }, "failed to handle devices notification");
        }
        break;
      case "server_sync":
        const update = (0, import_WABinary.getBinaryNodeChild)(node, "collection");
        if (update) {
          const name = update.attrs.name;
          await resyncAppState([name], false);
        }
        break;
      case "picture":
        const setPicture = (0, import_WABinary.getBinaryNodeChild)(node, "set");
        const delPicture = (0, import_WABinary.getBinaryNodeChild)(node, "delete");
        ev.emit("contacts.update", [
          {
            id: (0, import_WABinary.jidNormalizedUser)(node?.attrs?.from) || (setPicture || delPicture)?.attrs?.hash || "",
            imgUrl: setPicture ? "changed" : "removed"
          }
        ]);
        if ((0, import_WABinary.isJidGroup)(from)) {
          const node2 = setPicture || delPicture;
          result.messageStubType = import_Types.WAMessageStubType.GROUP_CHANGE_ICON;
          if (setPicture) {
            result.messageStubParameters = [setPicture.attrs.id];
          }
          result.participant = node2?.attrs.author;
          result.key = {
            ...result.key || {},
            participant: setPicture?.attrs.author
          };
        }
        break;
      case "account_sync":
        if (child.tag === "disappearing_mode") {
          const newDuration = +child.attrs.duration;
          const timestamp = +child.attrs.t;
          logger.info({ newDuration }, "updated account disappearing mode");
          ev.emit("creds.update", {
            accountSettings: {
              ...authState.creds.accountSettings,
              defaultDisappearingMode: {
                ephemeralExpiration: newDuration,
                ephemeralSettingTimestamp: timestamp
              }
            }
          });
        } else if (child.tag === "blocklist") {
          const blocklists = (0, import_WABinary.getBinaryNodeChildren)(child, "item");
          for (const { attrs } of blocklists) {
            const blocklist = [attrs.jid];
            const type = attrs.action === "block" ? "add" : "remove";
            ev.emit("blocklist.update", { blocklist, type });
          }
        }
        break;
      case "link_code_companion_reg":
        const linkCodeCompanionReg = (0, import_WABinary.getBinaryNodeChild)(node, "link_code_companion_reg");
        const ref = toRequiredBuffer((0, import_WABinary.getBinaryNodeChildBuffer)(linkCodeCompanionReg, "link_code_pairing_ref"));
        const primaryIdentityPublicKey = toRequiredBuffer((0, import_WABinary.getBinaryNodeChildBuffer)(linkCodeCompanionReg, "primary_identity_pub"));
        const primaryEphemeralPublicKeyWrapped = toRequiredBuffer((0, import_WABinary.getBinaryNodeChildBuffer)(linkCodeCompanionReg, "link_code_pairing_wrapped_primary_ephemeral_pub"));
        const codePairingPublicKey = await decipherLinkPublicKey(primaryEphemeralPublicKeyWrapped);
        const companionSharedKey = import_Utils.Curve.sharedKey(authState.creds.pairingEphemeralKeyPair.private, codePairingPublicKey);
        const random = (0, import_crypto.randomBytes)(32);
        const linkCodeSalt = (0, import_crypto.randomBytes)(32);
        const linkCodePairingExpanded = (0, import_Utils.hkdf)(companionSharedKey, 32, {
          salt: linkCodeSalt,
          info: "link_code_pairing_key_bundle_encryption_key"
        });
        const encryptPayload = Buffer.concat([
          Buffer.from(authState.creds.signedIdentityKey.public),
          primaryIdentityPublicKey,
          random
        ]);
        const encryptIv = (0, import_crypto.randomBytes)(12);
        const encrypted = (0, import_Utils.aesEncryptGCM)(encryptPayload, linkCodePairingExpanded, encryptIv, Buffer.alloc(0));
        const encryptedPayload = Buffer.concat([linkCodeSalt, encryptIv, encrypted]);
        const identitySharedKey = import_Utils.Curve.sharedKey(authState.creds.signedIdentityKey.private, primaryIdentityPublicKey);
        const identityPayload = Buffer.concat([companionSharedKey, identitySharedKey, random]);
        authState.creds.advSecretKey = Buffer.from((0, import_Utils.hkdf)(identityPayload, 32, { info: "adv_secret" })).toString("base64");
        await query({
          tag: "iq",
          attrs: {
            to: import_WABinary.S_WHATSAPP_NET,
            type: "set",
            id: sock.generateMessageTag(),
            xmlns: "md"
          },
          content: [
            {
              tag: "link_code_companion_reg",
              attrs: {
                jid: authState.creds.me.id,
                stage: "companion_finish"
              },
              content: [
                {
                  tag: "link_code_pairing_wrapped_key_bundle",
                  attrs: {},
                  content: encryptedPayload
                },
                {
                  tag: "companion_identity_public",
                  attrs: {},
                  content: authState.creds.signedIdentityKey.public
                },
                {
                  tag: "link_code_pairing_ref",
                  attrs: {},
                  content: ref
                }
              ]
            }
          ]
        });
        authState.creds.registered = true;
        ev.emit("creds.update", authState.creds);
        break;
      case "privacy_token":
        await handlePrivacyTokenNotification(node);
        break;
    }
    if (Object.keys(result).length) {
      return result;
    }
  };
  const tcTokenKnownJids = /* @__PURE__ */ new Set();
  const tcTokenIndexLoaded = (async () => {
    try {
      const jids = await (0, import_tc_token_utils.readTcTokenIndex)(authState.keys);
      for (const jid of jids)
        tcTokenKnownJids.add(jid);
      logger.debug({ count: tcTokenKnownJids.size }, "loaded tctoken index");
    } catch (err) {
      logger.warn({ err: err?.message }, "failed to load tctoken index");
    }
  })();
  let tcTokenIndexTimer;
  async function flushTcTokenIndex() {
    if (tcTokenIndexTimer) {
      clearTimeout(tcTokenIndexTimer);
      tcTokenIndexTimer = void 0;
    }
    const write = await (0, import_tc_token_utils.buildMergedTcTokenIndexWrite)(authState.keys, tcTokenKnownJids);
    return authState.keys.set({ tctoken: write });
  }
  function scheduleTcTokenIndexSave() {
    if (tcTokenIndexTimer) {
      clearTimeout(tcTokenIndexTimer);
    }
    tcTokenIndexTimer = setTimeout(() => {
      tcTokenIndexTimer = void 0;
      flushTcTokenIndex().catch((err) => {
        logger.warn({ err: err?.message }, "failed to save tctoken index");
      });
    }, 5e3);
  }
  function trackTcTokenJid(jid) {
    if (jid && jid !== import_tc_token_utils.TC_TOKEN_INDEX_KEY && !tcTokenKnownJids.has(jid)) {
      tcTokenKnownJids.add(jid);
      scheduleTcTokenIndexSave();
    }
  }
  const handlePrivacyTokenNotification = async (node) => {
    const tokensNode = (0, import_WABinary.getBinaryNodeChild)(node, "tokens");
    if (!tokensNode)
      return;
    const from = (0, import_WABinary.jidNormalizedUser)(node.attrs.from);
    const senderLid = node.attrs.sender_lid && (0, import_WABinary.isLidUser)((0, import_WABinary.jidNormalizedUser)(node.attrs.sender_lid)) ? (0, import_WABinary.jidNormalizedUser)(node.attrs.sender_lid) : void 0;
    const fallbackJid = senderLid ?? await (0, import_tc_token_utils.resolveTcTokenJid)(from, getLIDForPN);
    logger.debug({ from, storageJid: fallbackJid }, "processing privacy token notification");
    await (0, import_tc_token_utils.storeTcTokensFromIqResult)({
      result: node,
      fallbackJid,
      keys: authState.keys,
      getLIDForPN,
      onNewJidStored: trackTcTokenJid
    });
  };
  async function decipherLinkPublicKey(data) {
    const buffer = toRequiredBuffer(data);
    const salt = buffer.slice(0, 32);
    const secretKey = await (0, import_Utils.derivePairingCodeKey)(authState.creds.pairingCode, salt);
    const iv = buffer.slice(32, 48);
    const payload = buffer.slice(48, 80);
    return (0, import_Utils.aesDecryptCTR)(payload, secretKey, iv);
  }
  function toRequiredBuffer(data) {
    if (data === void 0) {
      throw new import_boom.Boom("Invalid buffer", { statusCode: 400 });
    }
    return data instanceof Buffer ? data : Buffer.from(data);
  }
  const willSendMessageAgain = async (id, participant) => {
    const key = `${id}:${participant}`;
    const retryCount = await msgRetryCache.get(key) || 0;
    return retryCount < maxMsgRetryCount;
  };
  const updateSendMessageAgainCount = async (id, participant) => {
    const key = `${id}:${participant}`;
    const newValue = (await msgRetryCache.get(key) || 0) + 1;
    await msgRetryCache.set(key, newValue);
  };
  const sendMessagesAgain = async (key, ids, retryNode, receiptNode) => {
    const remoteJid = key.remoteJid;
    const participant = key.participant || remoteJid;
    const retryCount = +retryNode.attrs.count || 1;
    const msgId = ids[0];
    const msgs = [];
    for (const id of ids) {
      let msg;
      if (messageRetryManager) {
        const cachedMsg = messageRetryManager.getRecentMessage(remoteJid, id);
        if (cachedMsg) {
          msg = cachedMsg.message;
          logger.debug({ jid: remoteJid, id }, "found message in retry cache");
          messageRetryManager.markRetrySuccess(id);
        }
      }
      if (!msg) {
        msg = await getMessage({ ...key, id });
        if (msg) {
          logger.debug({ jid: remoteJid, id }, "found message via getMessage");
          if (messageRetryManager) {
            messageRetryManager.markRetrySuccess(id);
          }
        }
      }
      msgs.push(msg);
    }
    const sendToAll = !(0, import_WABinary.jidDecode)(participant)?.device;
    const sessionId = signalRepository.jidToSignalProtocolAddress(participant);
    let injectedFromBundle = false;
    const bundle = (0, import_Utils.extractE2ESessionFromRetryReceipt)(receiptNode);
    if (bundle) {
      try {
        await signalRepository.injectE2ESession({ jid: participant, session: bundle });
        injectedFromBundle = true;
        logger.debug({ participant, retryCount }, "injected session from retry receipt key bundle");
      } catch (error) {
        logger.warn({ error, participant }, "failed to inject session from retry receipt");
      }
    }
    if (!injectedFromBundle) {
      const receivedRegId = (0, import_WABinary.getBinaryNodeChildUInt)(receiptNode, "registration", 4);
      if (typeof receivedRegId === "number" && Number.isInteger(receivedRegId)) {
        const info = await signalRepository.getSessionInfo(participant);
        if (info && info.registrationId !== 0 && info.registrationId !== receivedRegId) {
          logger.info({ participant, stored: info.registrationId, received: receivedRegId }, "reg id mismatch on retry without bundle, deleting session");
          await authState.keys.set({ session: { [sessionId]: null } });
        }
      }
    }
    const BASE_KEY_CHECK_RETRY = 2;
    if (msgId && messageRetryManager) {
      const info = await signalRepository.getSessionInfo(participant);
      if (info) {
        if (retryCount === BASE_KEY_CHECK_RETRY) {
          messageRetryManager.saveBaseKey(sessionId, msgId, info.baseKey);
        } else if (retryCount > BASE_KEY_CHECK_RETRY) {
          if (messageRetryManager.hasSameBaseKey(sessionId, msgId, info.baseKey)) {
            logger.warn({ participant, retryCount }, "base key collision on retry, forcing fresh session");
            await authState.keys.set({ session: { [sessionId]: null } });
          }
          messageRetryManager.deleteBaseKey(sessionId, msgId);
        }
      }
    }
    let shouldRecreateSession = false;
    let recreateReason = "";
    if (enableAutoSessionRecreation && messageRetryManager && retryCount > 1 && !injectedFromBundle) {
      try {
        const hasSession = await signalRepository.validateSession(participant);
        const result = messageRetryManager.shouldRecreateSession(participant, hasSession.exists);
        shouldRecreateSession = result.recreate;
        recreateReason = result.reason;
        if (shouldRecreateSession) {
          logger.debug({ participant, retryCount, reason: recreateReason }, "recreating session for outgoing retry");
          await authState.keys.set({ session: { [sessionId]: null } });
        }
      } catch (error) {
        logger.warn({ error, participant }, "failed to check session recreation for outgoing retry");
      }
    }
    if (!injectedFromBundle) {
      await assertSessions([participant], true);
    }
    if ((0, import_WABinary.isJidGroup)(remoteJid)) {
      await authState.keys.set({ "sender-key-memory": { [remoteJid]: null } });
    }
    logger.debug({ participant, sendToAll, shouldRecreateSession, recreateReason, injectedFromBundle }, "prepared session for retry resend");
    for (const [i, msg] of msgs.entries()) {
      if (!ids[i])
        continue;
      if (msg && await willSendMessageAgain(ids[i], participant)) {
        await updateSendMessageAgainCount(ids[i], participant);
        const msgRelayOpts = { messageId: ids[i] };
        if (sendToAll) {
          msgRelayOpts.useUserDevicesCache = false;
        } else {
          msgRelayOpts.participant = {
            jid: participant,
            count: +retryNode.attrs.count
          };
        }
        await relayMessage(key.remoteJid, msg, msgRelayOpts);
      } else {
        logger.debug({ jid: key.remoteJid, id: ids[i] }, "recv retry request, but message not available");
      }
    }
  };
  const handleReceipt = async (node) => {
    const { attrs, content } = node;
    const isLid = attrs.from.includes("lid");
    const isNodeFromMe = (0, import_WABinary.areJidsSameUser)(attrs.participant || attrs.from, isLid ? authState.creds.me?.lid : authState.creds.me?.id);
    const remoteJid = !isNodeFromMe || (0, import_WABinary.isJidGroup)(attrs.from) ? attrs.from : attrs.recipient;
    const fromMe = !attrs.recipient || (attrs.type === "retry" || attrs.type === "sender") && isNodeFromMe;
    const key = {
      remoteJid,
      id: "",
      fromMe,
      participant: attrs.participant
    };
    const ids = [attrs.id];
    if (Array.isArray(content)) {
      const items = (0, import_WABinary.getBinaryNodeChildren)(content[0], "item");
      ids.push(...items.map((i) => i.attrs.id));
    }
    try {
      await Promise.all([
        receiptMutex.mutex(async () => {
          const status = (0, import_Utils.getStatusFromReceiptType)(attrs.type);
          if (typeof status !== "undefined" && // basically, we only want to know when a message from us has been delivered to/read by the other person
          // or another device of ours has read some messages
          (status >= import_WAProto.proto.WebMessageInfo.Status.SERVER_ACK || !isNodeFromMe)) {
            if ((0, import_WABinary.isJidGroup)(remoteJid) || (0, import_WABinary.isJidStatusBroadcast)(remoteJid)) {
              if (attrs.participant) {
                const updateKey = status === import_WAProto.proto.WebMessageInfo.Status.DELIVERY_ACK ? "receiptTimestamp" : "readTimestamp";
                ev.emit("message-receipt.update", ids.map((id) => ({
                  key: { ...key, id },
                  receipt: {
                    userJid: (0, import_WABinary.jidNormalizedUser)(attrs.participant),
                    [updateKey]: +attrs.t
                  }
                })));
              }
            } else {
              ev.emit("messages.update", ids.map((id) => ({
                key: { ...key, id },
                update: { status, messageTimestamp: (0, import_Utils.toNumber)(+(attrs.t ?? 0)) }
              })));
            }
          }
          if (attrs.type === "retry") {
            key.participant = key.participant || attrs.from;
            const retryNode = (0, import_WABinary.getBinaryNodeChild)(node, "retry");
            if (ids[0] && key.participant && await willSendMessageAgain(ids[0], key.participant)) {
              if (key.fromMe) {
                try {
                  await updateSendMessageAgainCount(ids[0], key.participant);
                  logger.debug({ attrs, key }, "recv retry request");
                  await sendMessagesAgain(key, ids, retryNode, node);
                } catch (error) {
                  logger.error({ key, ids, trace: error instanceof Error ? error.stack : "Unknown error" }, "error in sending message again");
                }
              } else {
                logger.info({ attrs, key }, "recv retry for not fromMe message");
              }
            } else {
              logger.info({ attrs, key }, "will not send message again, as sent too many times");
            }
          }
        })
      ]);
    } finally {
      await sendMessageAck(node).catch((ackErr) => logger.error({ ackErr }, "failed to ack receipt"));
    }
  };
  const handleNotification = async (node) => {
    const remoteJid = node.attrs.from;
    try {
      await Promise.all([
        notificationMutex.mutex(async () => {
          const msg = await processNotification(node);
          if (msg) {
            const fromMe = (0, import_WABinary.areJidsSameUser)(node.attrs.participant || remoteJid, authState.creds.me.id);
            const { senderAlt: participantAlt, addressingMode } = (0, import_Utils.extractAddressingContext)(node);
            msg.key = {
              remoteJid,
              fromMe,
              participant: node.attrs.participant,
              participantAlt,
              participantUsername: node.attrs.participant_username,
              addressingMode,
              id: node.attrs.id,
              ...msg.key || {}
            };
            msg.participant ?? (msg.participant = node.attrs.participant);
            msg.messageTimestamp = +node.attrs.t;
            const fullMsg = import_WAProto.proto.WebMessageInfo.fromObject(msg);
            await upsertMessage(fullMsg, "append");
          }
        })
      ]);
    } finally {
      await sendMessageAck(node).catch((ackErr) => logger.error({ ackErr }, "failed to ack notification"));
    }
  };
  const handleMessage = async (node) => {
    const encNode = (0, import_WABinary.getBinaryNodeChild)(node, "enc");
    if (encNode?.attrs.type === "msmsg") {
      logger.debug({ key: node.attrs.key }, "ignored msmsg");
      await sendMessageAck(node, import_Utils.NACK_REASONS.MissingMessageSecret);
      return;
    }
    let acked = false;
    try {
      const { fullMessage: msg, category, author, decrypt } = (0, import_Utils.decryptMessageNode)(node, authState.creds.me.id, authState.creds.me.lid || "", signalRepository, logger);
      const alt = msg.key.participantAlt || msg.key.remoteJidAlt;
      if (!!alt) {
        const altServer = (0, import_WABinary.jidDecode)(alt)?.server;
        const primaryJid = msg.key.participant || msg.key.remoteJid;
        if (altServer === "lid") {
          if (!await signalRepository.lidMapping.getPNForLID(alt)) {
            await signalRepository.lidMapping.storeLIDPNMappings([{ lid: alt, pn: primaryJid }]);
            await signalRepository.migrateSession(primaryJid, alt);
          }
        } else {
          await signalRepository.lidMapping.storeLIDPNMappings([{ lid: primaryJid, pn: alt }]);
          await signalRepository.migrateSession(alt, primaryJid);
        }
      }
      await messageMutex.mutex(async () => {
        await decrypt();
        if (msg.key?.remoteJid && msg.key?.id && msg.message && messageRetryManager) {
          messageRetryManager.addRecentMessage(msg.key.remoteJid, msg.key.id, msg.message);
        }
        if (msg.messageStubType === import_WAProto.proto.WebMessageInfo.StubType.CIPHERTEXT && msg.category !== "peer") {
          if (msg?.messageStubParameters?.[0] === import_Utils.MISSING_KEYS_ERROR_TEXT) {
            acked = true;
            return sendMessageAck(node, import_Utils.NACK_REASONS.ParsingError);
          }
          if (msg.messageStubParameters?.[0] === import_Utils.NO_MESSAGE_FOUND_ERROR_TEXT) {
            const unavailableNode = (0, import_WABinary.getBinaryNodeChild)(node, "unavailable");
            const unavailableType = unavailableNode?.attrs?.type;
            if (unavailableType === "bot_unavailable_fanout" || unavailableType === "hosted_unavailable_fanout" || unavailableType === "view_once_unavailable_fanout") {
              logger.debug({ msgId: msg.key.id, unavailableType }, "skipping placeholder resend for excluded unavailable type");
              acked = true;
              return sendMessageAck(node);
            }
            const messageAge = (0, import_Utils.unixTimestampSeconds)() - (0, import_Utils.toNumber)(msg.messageTimestamp);
            if (messageAge > import_Defaults.PLACEHOLDER_MAX_AGE_SECONDS) {
              logger.debug({ msgId: msg.key.id, messageAge }, "skipping placeholder resend for old message");
              acked = true;
              return sendMessageAck(node);
            }
            const cleanKey = {
              remoteJid: msg.key.remoteJid,
              fromMe: msg.key.fromMe,
              id: msg.key.id,
              participant: msg.key.participant
            };
            const msgData = {
              key: msg.key,
              messageTimestamp: msg.messageTimestamp,
              pushName: msg.pushName,
              participant: msg.participant,
              verifiedBizName: msg.verifiedBizName
            };
            requestPlaceholderResend(cleanKey, msgData).then((requestId) => {
              if (requestId && requestId !== "RESOLVED") {
                logger.debug({ msgId: msg.key.id, requestId }, "requested placeholder resend for unavailable message");
                ev.emit("messages.update", [
                  {
                    key: msg.key,
                    update: { messageStubParameters: [import_Utils.NO_MESSAGE_FOUND_ERROR_TEXT, requestId] }
                  }
                ]);
              }
            }).catch((err) => {
              logger.warn({ err, msgId: msg.key.id }, "failed to request placeholder resend for unavailable message");
            });
            acked = true;
            await sendMessageAck(node);
          } else {
            if ((0, import_WABinary.isJidStatusBroadcast)(msg.key.remoteJid)) {
              const messageAge = (0, import_Utils.unixTimestampSeconds)() - (0, import_Utils.toNumber)(msg.messageTimestamp);
              if (messageAge > import_Defaults.STATUS_EXPIRY_SECONDS) {
                logger.debug({ msgId: msg.key.id, messageAge, remoteJid: msg.key.remoteJid }, "skipping retry for expired status message");
                acked = true;
                return sendMessageAck(node);
              }
            }
            logger.debug("[handleMessage] Attempting retry request for failed decryption");
            await retryMutex.mutex(async () => {
              try {
                if (!ws.isOpen) {
                  logger.debug({ node }, "Connection closed, skipping retry");
                  return;
                }
                const encNode2 = (0, import_WABinary.getBinaryNodeChild)(node, "enc");
                await sendRetryRequest(node, !encNode2);
                if (retryRequestDelayMs) {
                  await (0, import_Utils.delay)(retryRequestDelayMs);
                }
              } catch (err) {
                logger.error({ err }, "Failed to send retry");
              }
              acked = true;
              await sendMessageAck(node, import_Utils.NACK_REASONS.UnhandledError);
            });
          }
        } else {
          if (messageRetryManager && msg.key.id) {
            messageRetryManager.cancelPendingPhoneRequest(msg.key.id);
          }
          const isNewsletter = (0, import_WABinary.isJidNewsletter)(msg.key.remoteJid);
          if (!isNewsletter) {
            let type = void 0;
            let participant = msg.key.participant;
            if (category === "peer") {
              type = "peer_msg";
            } else if (msg.key.fromMe) {
              type = "sender";
              if ((0, import_WABinary.isLidUser)(msg.key.remoteJid) || (0, import_WABinary.isLidUser)(msg.key.remoteJidAlt)) {
                participant = author;
              }
            } else if (!sendActiveReceipts) {
              type = "inactive";
            }
            acked = true;
            await sendReceipt(msg.key.remoteJid, participant, [msg.key.id], type);
            const isAnyHistoryMsg = (0, import_Utils.getHistoryMsg)(msg.message);
            if (isAnyHistoryMsg) {
              const jid = (0, import_WABinary.jidNormalizedUser)(msg.key.remoteJid);
              await sendReceipt(jid, void 0, [msg.key.id], "hist_sync");
            }
          } else {
            acked = true;
            await sendMessageAck(node);
            logger.debug({ key: msg.key }, "processed newsletter message without receipts");
          }
        }
        (0, import_Utils.cleanMessage)(msg, authState.creds.me.id, authState.creds.me.lid);
        await upsertMessage(msg, node.attrs.offline ? "append" : "notify");
      });
    } catch (error) {
      logger.error({ error, node: (0, import_WABinary.binaryNodeToString)(node) }, "error in handling message");
      if (!acked) {
        await sendMessageAck(node, import_Utils.NACK_REASONS.UnhandledError).catch((ackErr) => logger.error({ ackErr }, "failed to ack message after error"));
      }
    }
  };
  const handleCall = async (node) => {
    try {
      const { attrs } = node;
      const [infoChild] = (0, import_WABinary.getAllBinaryNodeChildren)(node);
      if (!infoChild) {
        throw new import_boom.Boom("Missing call info in call node");
      }
      const status = (0, import_Utils.getCallStatusFromNode)(infoChild);
      const callId = infoChild.attrs["call-id"];
      const from = infoChild.attrs.from || infoChild.attrs["call-creator"];
      const call = {
        chatId: attrs.from,
        from,
        callerPn: infoChild.attrs["caller_pn"],
        id: callId,
        date: new Date(+attrs.t * 1e3),
        offline: !!attrs.offline,
        status
      };
      if (status === "relaylatency") {
        const latencyValue = infoChild.attrs.latency || infoChild.attrs["latency_ms"] || infoChild.attrs["latency-ms"];
        const latencyMs = latencyValue ? Number(latencyValue) : void 0;
        if (Number.isFinite(latencyMs)) {
          call.latencyMs = latencyMs;
        }
      }
      if (status === "offer") {
        call.isVideo = !!(0, import_WABinary.getBinaryNodeChild)(infoChild, "video");
        call.isGroup = infoChild.attrs.type === "group" || !!infoChild.attrs["group-jid"];
        call.groupJid = infoChild.attrs["group-jid"];
        await callOfferCache.set(call.id, call);
      }
      const existingCall = await callOfferCache.get(call.id);
      if (existingCall) {
        call.isVideo = existingCall.isVideo;
        call.isGroup = existingCall.isGroup;
        call.callerPn = call.callerPn || existingCall.callerPn;
      }
      if (status === "reject" || status === "accept" || status === "timeout" || status === "terminate") {
        await callOfferCache.del(call.id);
      }
      ev.emit("call", [call]);
    } catch (error) {
      logger.error({ error, node: (0, import_WABinary.binaryNodeToString)(node) }, "error in handling call");
    } finally {
      await sendMessageAck(node).catch((ackErr) => logger.error({ ackErr }, "failed to ack call"));
    }
  };
  const handleBadAck = async ({ attrs }) => {
    const key = { remoteJid: attrs.from, fromMe: true, id: attrs.id };
    if (attrs.error) {
      const isReachoutTimelocked = attrs.error === String(import_Utils.NACK_REASONS.SenderReachoutTimelocked);
      if (attrs.error === import_Utils.SERVER_ERROR_CODES.MessageAccountRestriction) {
        logger.warn({ msgId: attrs.id, from: attrs.from }, "error 463: account restricted or missing tctoken for contact");
        const ackFrom = attrs.from;
        if (ackFrom && !inFlight463Recoveries.has(ackFrom)) {
          inFlight463Recoveries.add(ackFrom);
          void (async () => {
            try {
              const getPNForLID = signalRepository.lidMapping.getPNForLID.bind(signalRepository.lidMapping);
              const tcStorageJid = await (0, import_tc_token_utils.resolveTcTokenJid)(ackFrom, getLIDForPN);
              const issueJid = await (0, import_tc_token_utils.resolveIssuanceJid)(ackFrom, sock.serverProps.lidTrustedTokenIssueToLid, getLIDForPN, getPNForLID);
              const result = await issuePrivacyTokens([issueJid], (0, import_Utils.unixTimestampSeconds)());
              await (0, import_tc_token_utils.storeTcTokensFromIqResult)({
                result,
                fallbackJid: tcStorageJid,
                keys: authState.keys,
                getLIDForPN,
                onNewJidStored: trackTcTokenJid
              });
              logger.debug({ from: ackFrom }, "completed 463 token recovery issuance");
            } catch (err) {
              logger.debug({ from: ackFrom, err: err?.message }, "failed 463 token recovery issuance");
            } finally {
              inFlight463Recoveries.delete(ackFrom);
            }
          })();
        }
      } else if (attrs.error === import_Utils.SERVER_ERROR_CODES.SmaxInvalid) {
        logger.warn({ msgId: attrs.id, from: attrs.from }, "smax-invalid (479): stanza rejected by server — likely stale device session or malformed addressing");
      } else if (isReachoutTimelocked) {
        await fetchAccountReachoutTimelock().catch((err) => logger.warn({ err }, "failed to fetch reachout timelock"));
        logger.warn({ attrs }, "received error in ack");
      } else {
        logger.warn({ attrs }, "received error in ack");
      }
      ev.emit("messages.update", [
        {
          key,
          update: {
            status: import_Types.WAMessageStatus.ERROR,
            messageStubParameters: isReachoutTimelocked ? [attrs.error, import_Utils.ACCOUNT_RESTRICTED_TEXT] : [attrs.error]
          }
        }
      ]);
    }
  };
  const processNodeWithBuffer = async (node, identifier, exec) => {
    ev.buffer();
    await execTask();
    ev.flush();
    function execTask() {
      return exec(node, false).catch((err) => onUnexpectedError(err, identifier));
    }
  };
  const offlineNodeProcessor = (0, import_offline_node_processor.makeOfflineNodeProcessor)(/* @__PURE__ */ new Map([
    ["message", handleMessage],
    ["call", handleCall],
    ["receipt", handleReceipt],
    ["notification", handleNotification]
  ]), {
    isWsOpen: () => ws.isOpen,
    onUnexpectedError,
    yieldToEventLoop: () => new Promise((resolve) => setImmediate(resolve))
  });
  const processNode = async (type, node, identifier, exec) => {
    const from = node.attrs.from;
    let ignoreJid = from;
    if (type === "receipt" && from) {
      const attrs = node.attrs;
      const isLid = attrs.from.includes("lid");
      const isNodeFromMe = (0, import_WABinary.areJidsSameUser)(attrs.participant || attrs.from, isLid ? authState.creds.me?.lid : authState.creds.me?.id);
      ignoreJid = !isNodeFromMe || (0, import_WABinary.isJidGroup)(attrs.from) ? attrs.from : attrs.recipient;
    }
    if (ignoreJid && ignoreJid !== import_WABinary.S_WHATSAPP_NET && shouldIgnoreJid(ignoreJid)) {
      await sendMessageAck(node, type === "message" ? import_Utils.NACK_REASONS.UnhandledError : void 0);
      return;
    }
    const isOffline = !!node.attrs.offline;
    if (isOffline) {
      offlineNodeProcessor.enqueue(type, node);
    } else {
      await processNodeWithBuffer(node, identifier, exec);
    }
  };
  ws.on("CB:message", async (node) => {
    await processNode("message", node, "processing message", handleMessage);
  });
  ws.on("CB:call", async (node) => {
    await processNode("call", node, "handling call", handleCall);
  });
  ws.on("CB:receipt", async (node) => {
    await processNode("receipt", node, "handling receipt", handleReceipt);
  });
  ws.on("CB:notification", async (node) => {
    await processNode("notification", node, "handling notification", handleNotification);
  });
  ws.on("CB:ack,class:message", (node) => {
    handleBadAck(node).catch((error) => onUnexpectedError(error, "handling bad ack"));
  });
  ev.on("call", async ([call]) => {
    if (!call) {
      return;
    }
    if (call.status === "timeout" || call.status === "offer" && call.isGroup) {
      const msg = {
        key: {
          remoteJid: call.chatId,
          id: call.id,
          fromMe: false
        },
        messageTimestamp: (0, import_Utils.unixTimestampSeconds)(call.date)
      };
      if (call.status === "timeout") {
        if (call.isGroup) {
          msg.messageStubType = call.isVideo ? import_Types.WAMessageStubType.CALL_MISSED_GROUP_VIDEO : import_Types.WAMessageStubType.CALL_MISSED_GROUP_VOICE;
        } else {
          msg.messageStubType = call.isVideo ? import_Types.WAMessageStubType.CALL_MISSED_VIDEO : import_Types.WAMessageStubType.CALL_MISSED_VOICE;
        }
      } else {
        msg.message = { call: { callKey: Buffer.from(call.id) } };
      }
      const protoMsg = import_WAProto.proto.WebMessageInfo.fromObject(msg);
      await upsertMessage(protoMsg, call.offline ? "append" : "notify");
    }
  });
  let lastTcTokenPruneTs = 0;
  const inFlight463Recoveries = /* @__PURE__ */ new Set();
  ev.on("connection.update", ({ isOnline, connection }) => {
    if (typeof isOnline !== "undefined") {
      sendActiveReceipts = isOnline;
      logger.trace(`sendActiveReceipts set to "${sendActiveReceipts}"`);
    }
    if (connection === "close" && tcTokenIndexTimer) {
      clearTimeout(tcTokenIndexTimer);
      tcTokenIndexTimer = void 0;
      try {
        void Promise.resolve(flushTcTokenIndex()).catch(() => {
        });
      } catch {
      }
    }
    if (isOnline) {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1e3;
      if (now - lastTcTokenPruneTs >= DAY_MS) {
        lastTcTokenPruneTs = now;
        void pruneExpiredTcTokens();
      }
    }
  });
  registerSocketEndHandler(() => {
    if (!config.msgRetryCounterCache && msgRetryCache.close) {
      msgRetryCache.close();
    }
    if (!config.callOfferCache && callOfferCache.close) {
      callOfferCache.close();
    }
    identityAssertDebounce.close();
    sendActiveReceipts = false;
  });
  async function pruneExpiredTcTokens() {
    try {
      await tcTokenIndexLoaded;
      const persisted = await (0, import_tc_token_utils.readTcTokenIndex)(authState.keys);
      const allJids = new Set(tcTokenKnownJids);
      for (const jid of persisted)
        allJids.add(jid);
      if (!allJids.size)
        return;
      const jids = [...allJids];
      const allTokens = await authState.keys.get("tctoken", jids);
      const writes = {};
      const survivors = /* @__PURE__ */ new Set();
      let mutated = 0;
      for (const jid of jids) {
        const entry = allTokens[jid];
        if (!entry) {
          mutated++;
          continue;
        }
        const hasPeerToken = !!entry.token?.length;
        const peerTokenExpired = hasPeerToken && (0, import_tc_token_utils.isTcTokenExpired)(entry.timestamp);
        const hasSenderTs = entry.senderTimestamp !== void 0;
        const senderTsExpired = hasSenderTs && (0, import_tc_token_utils.isTcTokenExpired)(entry.senderTimestamp);
        const keepPeerToken = hasPeerToken && !peerTokenExpired;
        const keepSenderTs = hasSenderTs && !senderTsExpired;
        if (!keepPeerToken && !keepSenderTs) {
          writes[jid] = null;
          mutated++;
        } else if (peerTokenExpired && keepSenderTs) {
          writes[jid] = { token: Buffer.alloc(0), senderTimestamp: entry.senderTimestamp };
          survivors.add(jid);
          mutated++;
        } else {
          survivors.add(jid);
        }
      }
      if (mutated === 0)
        return;
      await authState.keys.set({
        tctoken: {
          ...writes,
          [import_tc_token_utils.TC_TOKEN_INDEX_KEY]: {
            token: Buffer.from(JSON.stringify([...survivors]))
          }
        }
      });
      tcTokenKnownJids.clear();
      for (const jid of survivors)
        tcTokenKnownJids.add(jid);
      logger.debug({ mutated, remaining: survivors.size }, "pruned expired tctokens");
    } catch (err) {
      logger.warn({ err: err?.message }, "failed to prune expired tctokens");
    }
  }
  return {
    ...sock,
    sendMessageAck,
    sendRetryRequest,
    rejectCall,
    fetchMessageHistory,
    requestPlaceholderResend,
    messageRetryManager
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeMessagesRecvSocket
});
