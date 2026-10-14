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
var messages_send_exports = {};
__export(messages_send_exports, {
  makeMessagesSocket: () => makeMessagesSocket
});
module.exports = __toCommonJS(messages_send_exports);
var import_node_cache = __toESM(require("@cacheable/node-cache"));
var import_boom = require("@hapi/boom");
var import_WAProto = require("../../WAProto/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_Utils = require("../Utils/index.js");
var import_link_preview = require("../Utils/link-preview.js");
var import_make_mutex = require("../Utils/make-mutex.js");
var import_reporting_utils = require("../Utils/reporting-utils.js");
var import_tc_token_utils = require("../Utils/tc-token-utils.js");
var import_WABinary = require("../WABinary/index.js");
var import_WAUSync = require("../WAUSync/index.js");
var import_newsletter = require("./newsletter.js");
var __Utils = __toESM(require("../Utils/index.js"));
var import_dugong = __toESM(require("./dugong.js"));
const makeMessagesSocket = (config) => {
  const { logger, linkPreviewImageThumbnailWidth, generateHighQualityLinkPreview, options: httpRequestOptions, patchMessageBeforeSending, cachedGroupMetadata, enableRecentMessageCache, maxMsgRetryCount } = config;
  const sock = (0, import_newsletter.makeNewsletterSocket)(config);
  const { ev, authState, messageMutex, signalRepository, upsertMessage, query, fetchPrivacySettings, sendNode, groupMetadata, groupToggleEphemeral, registerSocketEndHandler } = sock;
  const getLIDForPN = signalRepository.lidMapping.getLIDForPN.bind(signalRepository.lidMapping);
  const inFlightTcTokenIssuance = /* @__PURE__ */ new Set();
  const userDevicesCache = config.userDevicesCache || new import_node_cache.default({
    stdTTL: import_Defaults.DEFAULT_CACHE_TTLS.USER_DEVICES,
    // 5 minutes
    useClones: false
  });
  const devicesMutex = (0, import_make_mutex.makeMutex)();
  const messageRetryManager = enableRecentMessageCache ? new import_Utils.MessageRetryManager(logger, maxMsgRetryCount) : null;
  const encryptionMutex = (0, import_make_mutex.makeKeyedMutex)();
  let mediaConn;
  let mediaHost = import_Utils.DEF_MEDIA_HOST;
  const refreshMediaConn = async (forceGet = false) => {
    const media = await mediaConn;
    if (!media || forceGet || (/* @__PURE__ */ new Date()).getTime() - media.fetchDate.getTime() > media.ttl * 1e3) {
      mediaConn = (async () => {
        const result = await query({
          tag: "iq",
          attrs: {
            type: "set",
            xmlns: "w:m",
            to: import_WABinary.S_WHATSAPP_NET
          },
          content: [{ tag: "media_conn", attrs: {} }]
        });
        const mediaConnNode = (0, import_WABinary.getBinaryNodeChild)(result, "media_conn");
        const node = {
          hosts: (0, import_WABinary.getBinaryNodeChildren)(mediaConnNode, "host").map(({ attrs }) => ({
            hostname: attrs.hostname,
            maxContentLengthBytes: +attrs.maxContentLengthBytes
          })),
          auth: mediaConnNode.attrs.auth,
          ttl: +mediaConnNode.attrs.ttl,
          fetchDate: /* @__PURE__ */ new Date()
        };
        logger.debug("fetched media conn");
        if (node.hosts[0]) {
          mediaHost = node.hosts[0].hostname;
        }
        return node;
      })();
    }
    return mediaConn;
  };
  const sendReceipt = async (jid, participant, messageIds, type) => {
    if (!messageIds || messageIds.length === 0) {
      throw new import_boom.Boom("missing ids in receipt");
    }
    const node = {
      tag: "receipt",
      attrs: {
        id: messageIds[0]
      }
    };
    const isReadReceipt = type === "read" || type === "read-self";
    if (isReadReceipt) {
      node.attrs.t = (0, import_Utils.unixTimestampSeconds)().toString();
    }
    if (type === "sender" && ((0, import_WABinary.isPnUser)(jid) || (0, import_WABinary.isLidUser)(jid))) {
      node.attrs.recipient = jid;
      node.attrs.to = participant;
    } else {
      node.attrs.to = jid;
      if (participant) {
        node.attrs.participant = participant;
      }
    }
    if (type) {
      node.attrs.type = type;
    }
    const remainingMessageIds = messageIds.slice(1);
    if (remainingMessageIds.length) {
      node.content = [
        {
          tag: "list",
          attrs: {},
          content: remainingMessageIds.map((id) => ({
            tag: "item",
            attrs: { id }
          }))
        }
      ];
    }
    logger.debug({ attrs: node.attrs, messageIds }, "sending receipt for messages");
    await sendNode(node);
  };
  const sendReceipts = async (keys, type) => {
    const recps = (0, import_Utils.aggregateMessageKeysNotFromMe)(keys);
    for (const { jid, participant, messageIds } of recps) {
      await sendReceipt(jid, participant, messageIds, type);
    }
  };
  const readMessages = async (keys) => {
    const privacySettings = await fetchPrivacySettings();
    const readType = privacySettings.readreceipts === "all" ? "read" : "read-self";
    await sendReceipts(keys, readType);
  };
  const getUSyncDevices = async (jids, useCache, ignoreZeroDevices) => {
    const deviceResults = [];
    if (!useCache) {
      logger.debug("not using cache for devices");
    }
    const toFetch = [];
    const jidsWithUser = jids.map((jid) => {
      const decoded = (0, import_WABinary.jidDecode)(jid);
      const user = decoded?.user;
      const device = decoded?.device;
      const isExplicitDevice = typeof device === "number" && device >= 0;
      if (isExplicitDevice && user) {
        deviceResults.push({
          user,
          device,
          jid
        });
        return null;
      }
      jid = (0, import_WABinary.jidNormalizedUser)(jid);
      return { jid, user };
    }).filter((jid) => jid !== null);
    let mgetDevices;
    if (useCache && userDevicesCache.mget) {
      const usersToFetch = jidsWithUser.map((j) => j?.user).filter(Boolean);
      mgetDevices = await userDevicesCache.mget(usersToFetch);
    }
    for (const { jid, user } of jidsWithUser) {
      if (useCache) {
        const devices = mgetDevices?.[user] || (userDevicesCache.mget ? void 0 : await userDevicesCache.get(user));
        if (devices) {
          const devicesWithJid = devices.map((d) => ({
            ...d,
            jid: (0, import_WABinary.jidEncode)(d.user, d.server, d.device)
          }));
          deviceResults.push(...devicesWithJid);
          logger.trace({ user }, "using cache for devices");
        } else {
          toFetch.push(jid);
        }
      } else {
        toFetch.push(jid);
      }
    }
    if (!toFetch.length) {
      return deviceResults;
    }
    const requestedLidUsers = /* @__PURE__ */ new Set();
    for (const jid of toFetch) {
      if ((0, import_WABinary.isLidUser)(jid) || (0, import_WABinary.isHostedLidUser)(jid)) {
        const user = (0, import_WABinary.jidDecode)(jid)?.user;
        if (user)
          requestedLidUsers.add(user);
      }
    }
    const query2 = new import_WAUSync.USyncQuery().withContext("message").withDeviceProtocol().withLIDProtocol();
    for (const jid of toFetch) {
      query2.withUser(new import_WAUSync.USyncUser().withId(jid));
    }
    const result = await sock.executeUSyncQuery(query2);
    if (result) {
      const lidResults = result.list.filter((a) => !!a.lid);
      if (lidResults.length > 0) {
        logger.trace("Storing LID maps from device call");
        await signalRepository.lidMapping.storeLIDPNMappings(lidResults.map((a) => ({ lid: a.lid, pn: a.id })));
        try {
          const lids = lidResults.map((a) => a.lid);
          if (lids.length) {
            await assertSessions(lids, true);
          }
        } catch (e) {
          logger.warn({ e, count: lidResults.length }, "failed to assert sessions for newly mapped LIDs");
        }
      }
      const extracted = (0, import_Utils.extractDeviceJids)(result?.list, authState.creds.me.id, authState.creds.me.lid, ignoreZeroDevices);
      const deviceMap = {};
      for (const item of extracted) {
        deviceMap[item.user] = deviceMap[item.user] || [];
        deviceMap[item.user]?.push(item);
      }
      for (const [user, userDevices] of Object.entries(deviceMap)) {
        const isLidUser2 = requestedLidUsers.has(user);
        for (const item of userDevices) {
          const finalJid = isLidUser2 ? (0, import_WABinary.jidEncode)(user, item.server, item.device) : (0, import_WABinary.jidEncode)(item.user, item.server, item.device);
          deviceResults.push({
            ...item,
            jid: finalJid
          });
          logger.debug({
            user: item.user,
            device: item.device,
            finalJid,
            usedLid: isLidUser2
          }, "Processed device with LID priority");
        }
      }
      await devicesMutex.mutex(async () => {
        if (userDevicesCache.mset) {
          await userDevicesCache.mset(Object.entries(deviceMap).map(([key, value]) => ({ key, value })));
        } else {
          for (const key in deviceMap) {
            if (deviceMap[key])
              await userDevicesCache.set(key, deviceMap[key]);
          }
        }
      });
      const userDeviceUpdates = {};
      for (const [userId, devices] of Object.entries(deviceMap)) {
        if (devices && devices.length > 0) {
          userDeviceUpdates[userId] = devices.map((d) => d.device?.toString() || "0");
        }
      }
      if (Object.keys(userDeviceUpdates).length > 0) {
        try {
          await authState.keys.set({ "device-list": userDeviceUpdates });
          logger.debug({ userCount: Object.keys(userDeviceUpdates).length }, "stored user device lists for bulk migration");
        } catch (error) {
          logger.warn({ error }, "failed to store user device lists");
        }
      }
    }
    return deviceResults;
  };
  const updateMemberLabel = (jid, memberLabel) => {
    return relayMessage(jid, {
      protocolMessage: {
        type: import_WAProto.proto.Message.ProtocolMessage.Type.GROUP_MEMBER_LABEL_CHANGE,
        memberLabel: {
          label: memberLabel?.slice(0, 30),
          labelTimestamp: (0, import_Utils.unixTimestampSeconds)()
        }
      }
    }, {
      additionalNodes: [
        {
          tag: "meta",
          attrs: {
            tag_reason: "user_update",
            appdata: "member_tag"
          },
          content: void 0
        }
      ]
    });
  };
  const assertSessions = async (jids, force) => {
    let didFetchNewSession = false;
    const uniqueJids = [...new Set(jids)];
    const jidsRequiringFetch = [];
    logger.debug({ jids }, "assertSessions call with jids");
    for (const jid of uniqueJids) {
      if (!force) {
        const sessionValidation = await signalRepository.validateSession(jid);
        if (sessionValidation.exists) {
          continue;
        }
      }
      jidsRequiringFetch.push(jid);
    }
    if (jidsRequiringFetch.length) {
      const wireJids = [
        ...jidsRequiringFetch.filter((jid) => !!(0, import_WABinary.isLidUser)(jid) || !!(0, import_WABinary.isHostedLidUser)(jid)),
        ...(await signalRepository.lidMapping.getLIDsForPNs(jidsRequiringFetch.filter((jid) => !!(0, import_WABinary.isPnUser)(jid) || !!(0, import_WABinary.isHostedPnUser)(jid))) || []).map((a) => a.lid)
      ];
      logger.debug({ jidsRequiringFetch, wireJids }, "fetching sessions");
      const result = await query({
        tag: "iq",
        attrs: {
          xmlns: "encrypt",
          type: "get",
          to: import_WABinary.S_WHATSAPP_NET
        },
        content: [
          {
            tag: "key",
            attrs: {},
            content: wireJids.map((jid) => {
              const attrs = { jid };
              if (force)
                attrs.reason = "identity";
              return { tag: "user", attrs };
            })
          }
        ]
      });
      await (0, import_Utils.parseAndInjectE2ESessions)(result, signalRepository);
      didFetchNewSession = true;
    }
    return didFetchNewSession;
  };
  const sendPeerDataOperationMessage = async (pdoMessage) => {
    if (!authState.creds.me?.id) {
      throw new import_boom.Boom("Not authenticated");
    }
    const protocolMessage = {
      protocolMessage: {
        peerDataOperationRequestMessage: pdoMessage,
        type: import_WAProto.proto.Message.ProtocolMessage.Type.PEER_DATA_OPERATION_REQUEST_MESSAGE
      }
    };
    const meJid = (0, import_WABinary.jidNormalizedUser)(authState.creds.me.id);
    const msgId = await relayMessage(meJid, protocolMessage, {
      additionalAttributes: {
        category: "peer",
        push_priority: "high_force"
      },
      additionalNodes: [
        {
          tag: "meta",
          attrs: { appdata: "default" }
        }
      ]
    });
    return msgId;
  };
  const createParticipantNodes = async (recipientJids, message, extraAttrs, dsmMessage) => {
    if (!recipientJids.length) {
      return { nodes: [], shouldIncludeDeviceIdentity: false };
    }
    const patched = await patchMessageBeforeSending(message, recipientJids);
    const patchedMessages = Array.isArray(patched) ? patched : recipientJids.map((jid) => ({ recipientJid: jid, message: patched }));
    let shouldIncludeDeviceIdentity = false;
    const meId = authState.creds.me.id;
    const meLid = authState.creds.me?.lid;
    const meLidUser = meLid ? (0, import_WABinary.jidDecode)(meLid)?.user : null;
    const encryptionPromises = patchedMessages.map(async ({ recipientJid: jid, message: patchedMessage }) => {
      try {
        if (!jid)
          return null;
        let msgToEncrypt = patchedMessage;
        if (dsmMessage) {
          const { user: targetUser } = (0, import_WABinary.jidDecode)(jid);
          const { user: ownPnUser } = (0, import_WABinary.jidDecode)(meId);
          const ownLidUser = meLidUser;
          const isOwnUser = targetUser === ownPnUser || ownLidUser && targetUser === ownLidUser;
          const isExactSenderDevice = jid === meId || meLid && jid === meLid;
          if (isOwnUser && !isExactSenderDevice) {
            msgToEncrypt = dsmMessage;
            logger.debug({ jid, targetUser }, "Using DSM for own device");
          }
        }
        const bytes = (0, import_Utils.encodeWAMessage)(msgToEncrypt);
        const mutexKey = jid;
        const node = await encryptionMutex.mutex(mutexKey, async () => {
          const { type, ciphertext } = await signalRepository.encryptMessage({ jid, data: bytes });
          if (type === "pkmsg") {
            shouldIncludeDeviceIdentity = true;
          }
          return {
            tag: "to",
            attrs: { jid },
            content: [
              {
                tag: "enc",
                attrs: { v: "2", type, ...extraAttrs || {} },
                content: ciphertext
              }
            ]
          };
        });
        return node;
      } catch (err) {
        logger.error({ jid, err }, "Failed to encrypt for recipient");
        return null;
      }
    });
    const nodes = (await Promise.all(encryptionPromises)).filter((node) => node !== null);
    if (recipientJids.length > 0 && nodes.length === 0) {
      throw new import_boom.Boom("All encryptions failed", { statusCode: 500 });
    }
    return { nodes, shouldIncludeDeviceIdentity };
  };
  const relayMessage = async (jid, message, { messageId: msgId, participant, additionalAttributes, additionalNodes, useUserDevicesCache, useCachedGroupMetadata, statusJidList, AI = true }) => {
    const meId = (0, import_Utils.assertMeId)(authState.creds);
    const meLid = authState.creds.me?.lid;
    const isRetryResend = Boolean(participant?.jid);
    let shouldIncludeDeviceIdentity = isRetryResend;
    const statusJid = "status@broadcast";
    const { user, server } = (0, import_WABinary.jidDecode)(jid);
    const isGroup = server === "g.us";
    const isStatus = jid === statusJid;
    const isLid = server === "lid";
    const isNewsletter = server === "newsletter";
    const isPrivate = server === "s.whatsapp.net";
    const buttonType = getButtonType((0, import_Utils.normalizeMessageContent)(message) || {});
    const isGroupOrStatus = isGroup || isStatus;
    const finalJid = jid;
    msgId = msgId || (0, import_Utils.generateMessageIDV2)(meId);
    useUserDevicesCache = useUserDevicesCache !== false;
    useCachedGroupMetadata = useCachedGroupMetadata !== false && !isStatus;
    const participants = [];
    const destinationJid = !isStatus ? finalJid : statusJid;
    const binaryNodeContent = [];
    const devices = [];
    let reportingMessage;
    const meMsg = {
      deviceSentMessage: {
        destinationJid,
        message
      },
      messageContextInfo: message.messageContextInfo
    };
    const extraAttrs = {};
    if (participant) {
      if (!isGroup && !isStatus) {
        additionalAttributes = { ...additionalAttributes, device_fanout: "false" };
      }
      const { user: user2, device } = (0, import_WABinary.jidDecode)(participant.jid);
      devices.push({
        user: user2,
        device,
        jid: participant.jid
      });
    }
    await authState.keys.transaction(async () => {
      const mediaType = getMediaType(message);
      if (mediaType) {
        extraAttrs["mediatype"] = mediaType;
      }
      if (isNewsletter) {
        const patched = patchMessageBeforeSending ? await patchMessageBeforeSending(message, []) : message;
        const bytes = (0, import_Utils.encodeNewsletterMessage)(patched);
        binaryNodeContent.push({
          tag: "plaintext",
          attrs: {},
          content: bytes
        });
        const stanza2 = {
          tag: "message",
          attrs: {
            to: jid,
            id: msgId,
            type: getMessageType(message),
            ...additionalAttributes || {}
          },
          content: binaryNodeContent
        };
        logger.debug({ msgId }, `sending newsletter message to ${jid}`);
        await sendNode(stanza2);
        return;
      }
      if ((0, import_Utils.normalizeMessageContent)(message)?.pinInChatMessage || (0, import_Utils.normalizeMessageContent)(message)?.reactionMessage) {
        extraAttrs["decrypt-fail"] = "hide";
      }
      if (isGroupOrStatus && !isRetryResend) {
        const [groupData, senderKeyMap] = await Promise.all([
          (async () => {
            let groupData2 = useCachedGroupMetadata && cachedGroupMetadata ? await cachedGroupMetadata(jid) : void 0;
            if (groupData2 && Array.isArray(groupData2?.participants)) {
              logger.trace({ jid, participants: groupData2.participants.length }, "using cached group metadata");
            } else if (!isStatus) {
              groupData2 = await groupMetadata(jid);
            }
            return groupData2;
          })(),
          (async () => {
            if (!participant && !isStatus) {
              const result = await authState.keys.get("sender-key-memory", [jid]);
              return result[jid] || {};
            }
            return {};
          })()
        ]);
        const participantsList = groupData ? groupData.participants.map((p) => p.id) : [];
        if (groupData?.ephemeralDuration && groupData.ephemeralDuration > 0) {
          additionalAttributes = {
            ...additionalAttributes,
            expiration: groupData.ephemeralDuration.toString()
          };
        }
        if (isStatus && statusJidList) {
          participantsList.push(...statusJidList);
        }
        const additionalDevices = await getUSyncDevices(participantsList, !!useUserDevicesCache, false);
        devices.push(...additionalDevices);
        if (isGroup) {
          additionalAttributes = {
            ...additionalAttributes,
            addressing_mode: groupData?.addressingMode || "lid"
          };
        }
        const patched = await patchMessageBeforeSending(message);
        if (Array.isArray(patched)) {
          throw new import_boom.Boom("Per-jid patching is not supported in groups");
        }
        const bytes = (0, import_Utils.encodeWAMessage)(patched);
        reportingMessage = patched;
        const groupAddressingMode = additionalAttributes?.["addressing_mode"] || groupData?.addressingMode || "lid";
        const groupSenderIdentity = groupAddressingMode === "lid" && meLid ? meLid : meId;
        const { ciphertext, senderKeyDistributionMessage } = await signalRepository.encryptGroupMessage({
          group: destinationJid,
          data: bytes,
          meId: groupSenderIdentity
        });
        const senderKeyRecipients = [];
        for (const device of devices) {
          const deviceJid = device.jid;
          const hasKey = !!senderKeyMap[deviceJid];
          if ((!hasKey || !!participant) && !(0, import_WABinary.isHostedLidUser)(deviceJid) && !(0, import_WABinary.isHostedPnUser)(deviceJid) && device.device !== 99) {
            senderKeyRecipients.push(deviceJid);
            senderKeyMap[deviceJid] = true;
          }
        }
        if (senderKeyRecipients.length) {
          logger.debug({ senderKeyJids: senderKeyRecipients }, "sending new sender key");
          const senderKeyMsg = {
            senderKeyDistributionMessage: {
              axolotlSenderKeyDistributionMessage: senderKeyDistributionMessage,
              groupId: destinationJid
            }
          };
          const senderKeySessionTargets = senderKeyRecipients;
          await assertSessions(senderKeySessionTargets);
          const result = await createParticipantNodes(senderKeyRecipients, senderKeyMsg, extraAttrs);
          shouldIncludeDeviceIdentity = shouldIncludeDeviceIdentity || result.shouldIncludeDeviceIdentity;
          participants.push(...result.nodes);
        }
        binaryNodeContent.push({
          tag: "enc",
          attrs: { v: "2", type: "skmsg", ...extraAttrs },
          content: ciphertext
        });
        await authState.keys.set({ "sender-key-memory": { [jid]: senderKeyMap } });
      } else {
        let ownId = meId;
        if (isLid && meLid) {
          ownId = meLid;
          logger.debug({ to: jid, ownId }, "Using LID identity for @lid conversation");
        } else {
          logger.debug({ to: jid, ownId }, "Using PN identity for @s.whatsapp.net conversation");
        }
        const { user: ownUser } = (0, import_WABinary.jidDecode)(ownId);
        if (!participant) {
          const patchedForReporting = await patchMessageBeforeSending(message, [jid]);
          reportingMessage = Array.isArray(patchedForReporting) ? patchedForReporting.find((item) => item.recipientJid === jid) || patchedForReporting[0] : patchedForReporting;
        }
        if (!isRetryResend) {
          const targetUserServer = isLid ? "lid" : "s.whatsapp.net";
          devices.push({
            user,
            device: 0,
            jid: (0, import_WABinary.jidEncode)(user, targetUserServer, 0)
            // rajeh, todo: this entire logic is convoluted and weird.
          });
          if (user !== ownUser) {
            const ownUserServer = isLid ? "lid" : "s.whatsapp.net";
            const ownUserForAddressing = isLid && meLid ? (0, import_WABinary.jidDecode)(meLid).user : (0, import_WABinary.jidDecode)(meId).user;
            devices.push({
              user: ownUserForAddressing,
              device: 0,
              jid: (0, import_WABinary.jidEncode)(ownUserForAddressing, ownUserServer, 0)
            });
          }
          if (additionalAttributes?.["category"] !== "peer") {
            devices.length = 0;
            const senderIdentity = isLid && meLid ? (0, import_WABinary.jidEncode)((0, import_WABinary.jidDecode)(meLid)?.user, "lid", void 0) : (0, import_WABinary.jidEncode)((0, import_WABinary.jidDecode)(meId)?.user, "s.whatsapp.net", void 0);
            const sessionDevices = await getUSyncDevices([senderIdentity, jid], true, false);
            devices.push(...sessionDevices);
            logger.debug({
              deviceCount: devices.length,
              devices: devices.map((d) => `${d.user}:${d.device}@${(0, import_WABinary.jidDecode)(d.jid)?.server}`)
            }, "Device enumeration complete with unified addressing");
          }
        }
        const allRecipients = [];
        const meRecipients = [];
        const otherRecipients = [];
        const { user: mePnUser } = (0, import_WABinary.jidDecode)(meId);
        const { user: meLidUser } = meLid ? (0, import_WABinary.jidDecode)(meLid) : { user: null };
        for (const { user: user2, jid: jid2 } of devices) {
          const isExactSenderDevice = jid2 === meId || meLid && jid2 === meLid;
          if (isExactSenderDevice) {
            logger.debug({ jid: jid2, meId, meLid }, "Skipping exact sender device (whatsmeow pattern)");
            continue;
          }
          const isMe = user2 === mePnUser || user2 === meLidUser;
          if (isMe) {
            meRecipients.push(jid2);
          } else {
            otherRecipients.push(jid2);
          }
          allRecipients.push(jid2);
        }
        await assertSessions(allRecipients);
        const [{ nodes: meNodes, shouldIncludeDeviceIdentity: s1 }, { nodes: otherNodes, shouldIncludeDeviceIdentity: s2 }] = await Promise.all([
          // For own devices: use DSM if available (1:1 chats only)
          createParticipantNodes(meRecipients, meMsg || message, extraAttrs),
          createParticipantNodes(otherRecipients, message, extraAttrs, meMsg)
        ]);
        participants.push(...meNodes);
        participants.push(...otherNodes);
        if (meRecipients.length > 0 || otherRecipients.length > 0) {
          extraAttrs["phash"] = (0, import_Utils.generateParticipantHashV2)([...meRecipients, ...otherRecipients]);
        }
        shouldIncludeDeviceIdentity = shouldIncludeDeviceIdentity || s1 || s2;
      }
      if (isRetryResend) {
        const isParticipantLid = (0, import_WABinary.isLidUser)(participant.jid);
        const isMe = (0, import_WABinary.areJidsSameUser)(participant.jid, isParticipantLid ? meLid : meId);
        let messageToSend = message;
        if (isGroupOrStatus) {
          let groupSenderIdentity;
          if (meLid && await signalRepository.hasSenderKey({ group: destinationJid, meId: meLid })) {
            groupSenderIdentity = meLid;
          } else if (await signalRepository.hasSenderKey({ group: destinationJid, meId })) {
            groupSenderIdentity = meId;
          }
          if (groupSenderIdentity) {
            try {
              const skdm = await signalRepository.getSenderKeyDistributionMessage({
                group: destinationJid,
                meId: groupSenderIdentity
              });
              messageToSend = {
                ...message,
                senderKeyDistributionMessage: {
                  groupId: destinationJid,
                  axolotlSenderKeyDistributionMessage: skdm
                }
              };
            } catch (err) {
              logger.warn({ err, jid: destinationJid }, "failed to build SKDM for retry, sending without it");
            }
          }
        }
        const encodedMessageToSend = isMe ? (0, import_Utils.encodeWAMessage)({
          deviceSentMessage: {
            destinationJid,
            message: messageToSend
          }
        }) : (0, import_Utils.encodeWAMessage)(messageToSend);
        const { type, ciphertext: encryptedContent } = await signalRepository.encryptMessage({
          data: encodedMessageToSend,
          jid: participant.jid
        });
        binaryNodeContent.push({
          tag: "enc",
          attrs: {
            v: "2",
            type,
            count: participant.count.toString()
          },
          content: encryptedContent
        });
      }
      if (participants.length) {
        if (additionalAttributes?.["category"] === "peer") {
          const peerNode = participants[0]?.content?.[0];
          if (peerNode) {
            binaryNodeContent.push(peerNode);
          }
        } else {
          binaryNodeContent.push({
            tag: "participants",
            attrs: {},
            content: participants
          });
        }
      }
      const stanza = {
        tag: "message",
        attrs: {
          id: msgId,
          to: destinationJid,
          type: getMessageType(message),
          ...additionalAttributes || {}
        },
        content: binaryNodeContent
      };
      if (participant) {
        if ((0, import_WABinary.isJidGroup)(destinationJid)) {
          stanza.attrs.to = destinationJid;
          stanza.attrs.participant = participant.jid;
        } else if ((0, import_WABinary.areJidsSameUser)(participant.jid, meId)) {
          stanza.attrs.to = participant.jid;
          stanza.attrs.recipient = destinationJid;
        } else {
          stanza.attrs.to = participant.jid;
        }
      } else {
        stanza.attrs.to = destinationJid;
      }
      if (shouldIncludeDeviceIdentity) {
        ;
        stanza.content.push({
          tag: "device-identity",
          attrs: {},
          content: (0, import_Utils.encodeSignedDeviceIdentity)(authState.creds.account, true)
        });
        logger.debug({ jid }, "adding device identity");
      }
      if (!isNewsletter && !isRetryResend && reportingMessage?.messageContextInfo?.messageSecret && (0, import_reporting_utils.shouldIncludeReportingToken)(reportingMessage)) {
        try {
          const encoded = (0, import_Utils.encodeWAMessage)(reportingMessage);
          const reportingKey = {
            id: msgId,
            fromMe: true,
            remoteJid: destinationJid,
            participant: participant?.jid
          };
          const reportingNode = await (0, import_reporting_utils.getMessageReportingToken)(encoded, reportingMessage, reportingKey);
          if (reportingNode) {
            ;
            stanza.content.push(reportingNode);
            logger.trace({ jid }, "added reporting token to message");
          }
        } catch (error) {
          logger.warn({ jid, trace: error?.stack }, "failed to attach reporting token");
        }
      }
      const isPeerMessage = additionalAttributes?.["category"] === "peer";
      const is1on1Send = !isGroup && !isRetryResend && !isStatus && !isNewsletter && !isPeerMessage;
      const tcTokenJid = is1on1Send ? await (0, import_tc_token_utils.resolveTcTokenJid)(destinationJid, getLIDForPN) : destinationJid;
      const contactTcTokenData = is1on1Send ? await authState.keys.get("tctoken", [tcTokenJid]) : {};
      const existingTokenEntry = contactTcTokenData[tcTokenJid];
      let tcTokenBuffer = existingTokenEntry?.token;
      if (tcTokenBuffer?.length && (0, import_tc_token_utils.isTcTokenExpired)(existingTokenEntry?.timestamp)) {
        logger.debug({ jid: destinationJid, timestamp: existingTokenEntry?.timestamp }, "tctoken expired, clearing");
        tcTokenBuffer = void 0;
        const cleared = existingTokenEntry?.senderTimestamp !== void 0 ? { token: Buffer.alloc(0), senderTimestamp: existingTokenEntry.senderTimestamp } : null;
        try {
          await authState.keys.set({ tctoken: { [tcTokenJid]: cleared } });
        } catch (err) {
          logger.debug({ jid: destinationJid, err: err?.message }, "failed to persist tctoken expiry cleanup");
        }
      }
      if (tcTokenBuffer?.length && sock.serverProps.privacyTokenOn1to1) {
        ;
        stanza.content.push({
          tag: "tctoken",
          attrs: {},
          content: tcTokenBuffer
        });
      }
      let didPushAdditional = false;
      if (AI && isPrivate) {
        const botNode = { tag: "bot", attrs: { biz_bot: "1" } };
        if ((0, import_WABinary.getBinaryNodeFilter)(additionalNodes ? additionalNodes : [])) {
          stanza.content.push(...additionalNodes);
          didPushAdditional = true;
        } else {
          stanza.content.push(botNode);
        }
      }
      if (!isNewsletter && buttonType && !isStatus) {
        const bizContent = (0, import_WABinary.getAdditionalNode)(buttonType);
        if ((0, import_WABinary.getBinaryNodeFilter)(additionalNodes)) {
          if (!didPushAdditional) stanza.content.push(...additionalNodes);
          didPushAdditional = true;
        } else {
          stanza.content.push(...bizContent);
        }
        logger.debug({ jid }, "adding business node");
      }
      if (!didPushAdditional && additionalNodes && additionalNodes.length > 0) {
        stanza.content.push(...additionalNodes);
      }
      logger.debug({ msgId }, `sending message to ${participants.length} devices`);
      await sendNode(stanza);
      const isProtocolMsg = !!(0, import_Utils.normalizeMessageContent)(message)?.protocolMessage;
      const isBotOrPSA = destinationJid === import_WABinary.PSA_WID || (0, import_WABinary.isJidBot)(destinationJid) || (0, import_WABinary.isJidMetaAI)(destinationJid);
      if (is1on1Send && !isProtocolMsg && !isBotOrPSA && (0, import_tc_token_utils.shouldSendNewTcToken)(existingTokenEntry?.senderTimestamp) && !inFlightTcTokenIssuance.has(tcTokenJid)) {
        inFlightTcTokenIssuance.add(tcTokenJid);
        const issueTimestamp = (0, import_Utils.unixTimestampSeconds)();
        const getPNForLID = signalRepository.lidMapping.getPNForLID.bind(signalRepository.lidMapping);
        (0, import_tc_token_utils.resolveIssuanceJid)(destinationJid, sock.serverProps.lidTrustedTokenIssueToLid, getLIDForPN, getPNForLID).then((issueJid) => issuePrivacyTokens([issueJid], issueTimestamp)).then(async (result) => {
          await (0, import_tc_token_utils.storeTcTokensFromIqResult)({
            result,
            fallbackJid: tcTokenJid,
            keys: authState.keys,
            getLIDForPN
          });
          const currentData = await authState.keys.get("tctoken", [tcTokenJid]);
          const currentEntry = currentData[tcTokenJid];
          const indexWrite = await (0, import_tc_token_utils.buildMergedTcTokenIndexWrite)(authState.keys, [tcTokenJid]);
          await authState.keys.set({
            tctoken: {
              [tcTokenJid]: {
                token: Buffer.alloc(0),
                ...currentEntry,
                senderTimestamp: issueTimestamp
              },
              ...indexWrite
            }
          });
        }).catch((err) => {
          logger.debug({ jid: destinationJid, err: err?.message }, "fire-and-forget tctoken issuance failed");
        }).finally(() => {
          inFlightTcTokenIssuance.delete(tcTokenJid);
        });
      }
      if (messageRetryManager && !participant) {
        messageRetryManager.addRecentMessage(destinationJid, msgId, message);
      }
    }, meId);
    return msgId;
  };
  const getMessageType = (message) => {
    const normalizedMessage = (0, import_Utils.normalizeMessageContent)(message);
    if (!normalizedMessage)
      return "text";
    if (normalizedMessage.reactionMessage || normalizedMessage.encReactionMessage) {
      return "reaction";
    }
    if (normalizedMessage.pollCreationMessage || normalizedMessage.pollCreationMessageV2 || normalizedMessage.pollCreationMessageV3 || normalizedMessage.pollUpdateMessage) {
      return "poll";
    }
    if (normalizedMessage.eventMessage) {
      return "event";
    }
    if (getMediaType(normalizedMessage) !== "") {
      return "media";
    }
    return "text";
  };
  const getMediaType = (message) => {
    if (message.imageMessage) {
      return "image";
    } else if (message.videoMessage) {
      return message.videoMessage.gifPlayback ? "gif" : "video";
    } else if (message.audioMessage) {
      return message.audioMessage.ptt ? "ptt" : "audio";
    } else if (message.contactMessage) {
      return "vcard";
    } else if (message.documentMessage) {
      return "document";
    } else if (message.contactsArrayMessage) {
      return "contact_array";
    } else if (message.liveLocationMessage) {
      return "livelocation";
    } else if (message.stickerMessage) {
      return "sticker";
    } else if (message.listMessage) {
      return "list";
    } else if (message.listResponseMessage) {
      return "list_response";
    } else if (message.buttonsResponseMessage) {
      return "buttons_response";
    } else if (message.orderMessage) {
      return "order";
    } else if (message.productMessage) {
      return "product";
    } else if (message.interactiveResponseMessage) {
      return "native_flow_response";
    } else if (message.groupInviteMessage) {
      return "url";
    } else if (message.stickerPackMessage) {
      return "sticker-pack";
    }
    return "";
  };
  const issuePrivacyTokens = async (jids, timestamp) => {
    const t = (timestamp ?? (0, import_Utils.unixTimestampSeconds)()).toString();
    const result = await query({
      tag: "iq",
      attrs: {
        to: import_WABinary.S_WHATSAPP_NET,
        type: "set",
        xmlns: "privacy"
      },
      content: [
        {
          tag: "tokens",
          attrs: {},
          content: jids.map((jid) => ({
            tag: "token",
            attrs: {
              jid: (0, import_WABinary.jidNormalizedUser)(jid),
              t,
              type: "trusted_contact"
            }
          }))
        }
      ]
    });
    return result;
  };
  const getButtonType = (message) => {
    if (message.listMessage) return "list";
    else if (message.buttonsMessage) return "buttons";
    const flowName = message.interactiveMessage?.nativeFlowMessage?.buttons?.[0]?.name;
    if (flowName === "review_and_pay") return "review_and_pay";
    else if (flowName === "review_order") return "review_order";
    else if (flowName === "payment_info") return "payment_info";
    else if (flowName === "payment_status") return "payment_status";
    else if (flowName === "payment_method") return "payment_method";
    else if (message.interactiveMessage && message.interactiveMessage?.nativeFlowMessage) return "interactive";
  };
  const waUploadToServer = (0, import_Utils.getWAUploadToServer)(config, refreshMediaConn);
  const waitForMsgMediaUpdate = (0, import_Utils.bindWaitForEvent)(ev, "messages.media-update");
  registerSocketEndHandler(() => {
    if (!config.userDevicesCache && userDevicesCache.close) {
      userDevicesCache.close();
    }
    mediaConn = void 0;
    if (messageRetryManager) {
      messageRetryManager.clear();
    }
  });
  const relayMessageCompat = async (jid, message, opts = {}) => {
    const msgId = await relayMessage(jid, message, opts);
    let msgObj = message;
    try {
      msgObj = import_WAProto.proto.Message.fromObject(message);
    } catch {
    }
    const meId = authState.creds.me?.id;
    return import_WAProto.proto.WebMessageInfo.fromObject({
      key: { remoteJid: jid, fromMe: true, id: msgId },
      message: msgObj,
      messageTimestamp: (0, import_Utils.unixTimestampSeconds)(/* @__PURE__ */ new Date()),
      messageStubParameters: [],
      participant: (0, import_WABinary.isJidGroup)(jid) || jid === "status@broadcast" ? meId : void 0,
      status: import_WAProto.proto.WebMessageInfo.Status.PENDING
    });
  };
  const rahmi = new import_dugong.default(__Utils, waUploadToServer, relayMessageCompat);
  return {
    ...sock,
    userDevicesCache,
    devicesMutex,
    issuePrivacyTokens,
    assertSessions,
    relayMessage: relayMessageCompat,
    rahmi,
    sendReceipt,
    sendReceipts,
    readMessages,
    refreshMediaConn,
    // Function (not getter) so the spread in chats.ts preserves the live closure binding.
    getMediaHost: () => mediaHost,
    waUploadToServer,
    fetchPrivacySettings,
    sendPeerDataOperationMessage,
    createParticipantNodes,
    getUSyncDevices,
    messageRetryManager,
    updateMemberLabel,
    updateMediaMessage: async (message) => {
      const content = (0, import_Utils.assertMediaContent)(message.message);
      const mediaKey = content.mediaKey;
      const meId = authState.creds.me.id;
      const node = (0, import_Utils.encryptMediaRetryRequest)(message.key, mediaKey, meId);
      let error = void 0;
      await Promise.all([
        sendNode(node),
        waitForMsgMediaUpdate(async (update) => {
          const result = update.find((c) => c.key.id === message.key.id);
          if (result) {
            if (result.error) {
              error = result.error;
            } else {
              try {
                const media = (0, import_Utils.decryptMediaRetryData)(result.media, mediaKey, result.key.id);
                if (media.result !== import_WAProto.proto.MediaRetryNotification.ResultType.SUCCESS) {
                  const resultStr = import_WAProto.proto.MediaRetryNotification.ResultType[media.result];
                  throw new import_boom.Boom(`Media re-upload failed by device (${resultStr})`, {
                    data: media,
                    statusCode: (0, import_Utils.getStatusCodeForMediaRetry)(media.result) || 404
                  });
                }
                content.directPath = media.directPath;
                content.url = (0, import_Utils.getUrlFromDirectPath)(content.directPath, mediaHost);
                logger.debug({ directPath: media.directPath, key: result.key }, "media update successful");
              } catch (err) {
                error = err;
              }
            }
            return true;
          }
        })
      ]);
      if (error) {
        throw error;
      }
      ev.emit("messages.update", [{ key: message.key, update: { message: message.message } }]);
      return message;
    },
    sendMessage: async (jid, content, options = {}) => {
      const userJid = authState.creds.me.id;
      delete options.ephemeralExpiration;
      const { filter = false, quoted } = options;
      const getParticipantAttr = () => filter ? { participant: { jid } } : {};
      const messageType = content && typeof content === "object" ? rahmi.detectType(content) : null;
      if (messageType) {
        switch (messageType) {
          case "PAYMENT": {
            const paymentContent = await rahmi.handlePayment(content, quoted);
            return await relayMessageCompat(jid, paymentContent, { messageId: __Utils.generateMessageID(), ...getParticipantAttr() });
          }
          case "PRODUCT": {
            const productContent = await rahmi.handleProduct(content, jid, quoted);
            const productMsg = await __Utils.generateWAMessageFromContent(jid, productContent, { quoted });
            return await relayMessageCompat(jid, productMsg.message, { messageId: productMsg.key.id, ...getParticipantAttr() });
          }
          case "INTERACTIVE": {
            const interactiveContent = await rahmi.handleInteractive(content, jid, quoted);
            const interactiveMsg = await __Utils.generateWAMessageFromContent(jid, interactiveContent, { quoted });
            return await relayMessageCompat(jid, interactiveMsg.message, { messageId: interactiveMsg.key.id, ...getParticipantAttr() });
          }
          case "ALBUM":
            return await rahmi.handleAlbum(content, jid, quoted);
          case "EVENT":
            return await rahmi.handleEvent(content, jid, quoted);
          case "POLL_RESULT":
            return await rahmi.handlePollResult(content, jid, quoted);
          case "GROUP_STORY":
            return await rahmi.handleGroupStory(content, jid, quoted);
        }
      }
      if (typeof content === "object" && "disappearingMessagesInChat" in content && typeof content["disappearingMessagesInChat"] !== "undefined" && (0, import_WABinary.isJidGroup)(jid)) {
        const { disappearingMessagesInChat } = content;
        const value = typeof disappearingMessagesInChat === "boolean" ? disappearingMessagesInChat ? import_Defaults.WA_DEFAULT_EPHEMERAL : 0 : disappearingMessagesInChat;
        await groupToggleEphemeral(jid, value);
      } else {
        const fullMsg = await (0, import_Utils.generateWAMessage)(jid, content, {
          logger,
          userJid,
          getUrlInfo: (text) => (0, import_link_preview.getUrlInfo)(text, {
            thumbnailWidth: linkPreviewImageThumbnailWidth,
            fetchOpts: {
              timeout: 3e3,
              ...httpRequestOptions || {}
            },
            logger,
            uploadImage: generateHighQualityLinkPreview ? waUploadToServer : void 0
          }),
          //TODO: CACHE
          getProfilePicUrl: sock.profilePictureUrl,
          getCallLink: sock.createCallLink,
          upload: waUploadToServer,
          mediaCache: config.mediaCache,
          options: config.options,
          messageId: (0, import_Utils.generateMessageIDV2)(sock.user?.id),
          ...options
        });
        const isEventMsg = "event" in content && !!content.event;
        const isDeleteMsg = "delete" in content && !!content.delete;
        const isEditMsg = "edit" in content && !!content.edit;
        const isPinMsg = "pin" in content && !!content.pin;
        const isPollMessage = "poll" in content && !!content.poll;
        const isAiMsg = "ai" in content && !!content.ai;
        const additionalAttributes = {};
        const additionalNodes = [];
        if (isDeleteMsg) {
          if ((0, import_WABinary.isJidGroup)(content.delete?.remoteJid) && !content.delete?.fromMe) {
            additionalAttributes.edit = "8";
          } else {
            additionalAttributes.edit = "7";
          }
        } else if (isEditMsg) {
          additionalAttributes.edit = "1";
        } else if (isPinMsg) {
          additionalAttributes.edit = "2";
        } else if (isPollMessage) {
          additionalNodes.push({
            tag: "meta",
            attrs: {
              polltype: "creation"
            }
          });
        } else if (isEventMsg) {
          additionalNodes.push({
            tag: "meta",
            attrs: {
              event_type: "creation"
            }
          });
        } else if (isAiMsg) {
          additionalNodes.push({ tag: "bot", attrs: { biz_bot: "1" } });
        }
        if (Array.isArray(options.additionalNodes)) {
          additionalNodes.push(...options.additionalNodes);
        }
        await relayMessage(jid, fullMsg.message, {
          messageId: fullMsg.key.id,
          useCachedGroupMetadata: options.useCachedGroupMetadata,
          additionalAttributes,
          statusJidList: options.statusJidList,
          additionalNodes
        });
        if (config.emitOwnEvents) {
          process.nextTick(async () => {
            await messageMutex.mutex(() => upsertMessage(fullMsg, "append"));
          });
        }
        return fullMsg;
      }
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeMessagesSocket
});
