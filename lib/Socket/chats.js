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
var chats_exports = {};
__export(chats_exports, {
  buildProfilePictureQueryContent: () => buildProfilePictureQueryContent,
  makeChatsSocket: () => makeChatsSocket
});
module.exports = __toCommonJS(chats_exports);
var import_node_cache = __toESM(require("@cacheable/node-cache"));
var import_boom = require("@hapi/boom");
var import_WAProto = require("../../WAProto/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_Types = require("../Types/index.js");
var import_State = require("../Types/State.js");
var import_Utils = require("../Utils/index.js");
var import_make_mutex = require("../Utils/make-mutex.js");
var import_process_message = __toESM(require("../Utils/process-message.js"));
var import_tc_token_utils = require("../Utils/tc-token-utils.js");
var import_WABinary = require("../WABinary/index.js");
var import_WAUSync = require("../WAUSync/index.js");
var import_socket = require("./socket.js");
const buildProfilePictureQueryContent = (type, tcTokenContent) => {
  const picture = { tag: "picture", attrs: { type, query: "url" } };
  if (tcTokenContent?.length) {
    picture.content = tcTokenContent;
  }
  return [picture];
};
const makeChatsSocket = (config) => {
  const { logger, markOnlineOnConnect, fireInitQueries, appStateMacVerification, shouldIgnoreJid, shouldSyncHistoryMessage, getMessage } = config;
  const sock = (0, import_socket.makeSocket)(config);
  const { ev, ws, authState, generateMessageTag, sendNode, query, signalRepository, onUnexpectedError, sendUnifiedSession, registerSocketEndHandler } = sock;
  const getLIDForPN = signalRepository.lidMapping.getLIDForPN.bind(signalRepository.lidMapping);
  let privacySettings;
  const serverProps = {
    /** AB prop 10518: gate tctoken on 1:1 messages. Default true (safe: avoids 463). */
    privacyTokenOn1to1: true,
    /** AB prop 9666: gate tctoken on profile picture IQs. WA Web default: true. */
    profilePicPrivacyToken: true,
    /** AB prop 14303: issue tctokens to LID instead of PN. WA Web default: false. */
    lidTrustedTokenIssueToLid: false
  };
  let syncState = import_State.SyncState.Connecting;
  const messageMutex = (0, import_make_mutex.makeMutex)();
  const receiptMutex = (0, import_make_mutex.makeMutex)();
  const appStatePatchMutex = (0, import_make_mutex.makeMutex)();
  const notificationMutex = (0, import_make_mutex.makeMutex)();
  let awaitingSyncTimeout;
  const historySyncStatus = {
    initialBootstrapComplete: false,
    recentSyncComplete: false
  };
  let historySyncPausedTimeout;
  const blockedCollections = /* @__PURE__ */ new Set();
  const placeholderResendCache = config.placeholderResendCache || new import_node_cache.default({
    stdTTL: import_Defaults.DEFAULT_CACHE_TTLS.MSG_RETRY,
    // 1 hour
    useClones: false
  });
  const getAppStateSyncKey = async (keyId) => {
    const { [keyId]: key } = await authState.keys.get("app-state-sync-key", [keyId]);
    return key;
  };
  const fetchPrivacySettings = async (force = false) => {
    if (!privacySettings || force) {
      const { content } = await query({
        tag: "iq",
        attrs: {
          xmlns: "privacy",
          to: import_WABinary.S_WHATSAPP_NET,
          type: "get"
        },
        content: [{ tag: "privacy", attrs: {} }]
      });
      privacySettings = (0, import_WABinary.reduceBinaryNodeToDictionary)(content?.[0], "category");
    }
    return privacySettings;
  };
  const privacyQuery = async (name, value) => {
    await query({
      tag: "iq",
      attrs: {
        xmlns: "privacy",
        to: import_WABinary.S_WHATSAPP_NET,
        type: "set"
      },
      content: [
        {
          tag: "privacy",
          attrs: {},
          content: [
            {
              tag: "category",
              attrs: { name, value }
            }
          ]
        }
      ]
    });
  };
  const updateMessagesPrivacy = async (value) => {
    await privacyQuery("messages", value);
  };
  const updateCallPrivacy = async (value) => {
    await privacyQuery("calladd", value);
  };
  const updateLastSeenPrivacy = async (value) => {
    await privacyQuery("last", value);
  };
  const updateOnlinePrivacy = async (value) => {
    await privacyQuery("online", value);
  };
  const updateProfilePicturePrivacy = async (value) => {
    await privacyQuery("profile", value);
  };
  const updateStatusPrivacy = async (value) => {
    await privacyQuery("status", value);
  };
  const updateReadReceiptsPrivacy = async (value) => {
    await privacyQuery("readreceipts", value);
  };
  const updateGroupsAddPrivacy = async (value) => {
    await privacyQuery("groupadd", value);
  };
  const updateDefaultDisappearingMode = async (duration) => {
    await query({
      tag: "iq",
      attrs: {
        xmlns: "disappearing_mode",
        to: import_WABinary.S_WHATSAPP_NET,
        type: "set"
      },
      content: [
        {
          tag: "disappearing_mode",
          attrs: {
            duration: duration.toString()
          }
        }
      ]
    });
  };
  const getBotListV2 = async () => {
    const resp = await query({
      tag: "iq",
      attrs: {
        xmlns: "bot",
        to: import_WABinary.S_WHATSAPP_NET,
        type: "get"
      },
      content: [
        {
          tag: "bot",
          attrs: {
            v: "2"
          }
        }
      ]
    });
    const botNode = (0, import_WABinary.getBinaryNodeChild)(resp, "bot");
    const botList = [];
    for (const section of (0, import_WABinary.getBinaryNodeChildren)(botNode, "section")) {
      if (section.attrs.type === "all") {
        for (const bot of (0, import_WABinary.getBinaryNodeChildren)(section, "bot")) {
          botList.push({
            jid: bot.attrs.jid,
            personaId: bot.attrs["persona_id"]
          });
        }
      }
    }
    return botList;
  };
  const fetchStatus = async (...jids) => {
    const usyncQuery = new import_WAUSync.USyncQuery().withStatusProtocol();
    for (const jid of jids) {
      usyncQuery.withUser(new import_WAUSync.USyncUser().withId(jid));
    }
    const result = await sock.executeUSyncQuery(usyncQuery);
    if (result) {
      return result.list;
    }
  };
  const fetchDisappearingDuration = async (...jids) => {
    const usyncQuery = new import_WAUSync.USyncQuery().withDisappearingModeProtocol();
    for (const jid of jids) {
      usyncQuery.withUser(new import_WAUSync.USyncUser().withId(jid));
    }
    const result = await sock.executeUSyncQuery(usyncQuery);
    if (result) {
      return result.list;
    }
  };
  const updateProfilePicture = async (jid, content, dimensions) => {
    let targetJid;
    if (!jid) {
      throw new import_boom.Boom("Illegal no-jid profile update. Please specify either your ID or the ID of the chat you wish to update");
    }
    if ((0, import_WABinary.jidNormalizedUser)(jid) !== (0, import_WABinary.jidNormalizedUser)(authState.creds.me.id)) {
      targetJid = (0, import_WABinary.jidNormalizedUser)(jid);
    } else {
      targetJid = void 0;
    }
    const { img } = await (0, import_Utils.generateProfilePicture)(content, dimensions);
    await query({
      tag: "iq",
      attrs: {
        to: import_WABinary.S_WHATSAPP_NET,
        type: "set",
        xmlns: "w:profile:picture",
        ...targetJid ? { target: targetJid } : {}
      },
      content: [
        {
          tag: "picture",
          attrs: { type: "image" },
          content: img
        }
      ]
    });
  };
  const removeProfilePicture = async (jid) => {
    let targetJid;
    if (!jid) {
      throw new import_boom.Boom("Illegal no-jid profile update. Please specify either your ID or the ID of the chat you wish to update");
    }
    if ((0, import_WABinary.jidNormalizedUser)(jid) !== (0, import_WABinary.jidNormalizedUser)(authState.creds.me.id)) {
      targetJid = (0, import_WABinary.jidNormalizedUser)(jid);
    } else {
      targetJid = void 0;
    }
    await query({
      tag: "iq",
      attrs: {
        to: import_WABinary.S_WHATSAPP_NET,
        type: "set",
        xmlns: "w:profile:picture",
        ...targetJid ? { target: targetJid } : {}
      }
    });
  };
  const updateProfileStatus = async (status) => {
    await query({
      tag: "iq",
      attrs: {
        to: import_WABinary.S_WHATSAPP_NET,
        type: "set",
        xmlns: "status"
      },
      content: [
        {
          tag: "status",
          attrs: {},
          content: Buffer.from(status, "utf-8")
        }
      ]
    });
  };
  const updateProfileName = async (name) => {
    await chatModify({ pushNameSetting: name }, "");
  };
  const fetchBlocklist = async () => {
    const result = await query({
      tag: "iq",
      attrs: {
        xmlns: "blocklist",
        to: import_WABinary.S_WHATSAPP_NET,
        type: "get"
      }
    });
    const listNode = (0, import_WABinary.getBinaryNodeChild)(result, "list");
    return (0, import_WABinary.getBinaryNodeChildren)(listNode, "item").map((n) => n.attrs.jid);
  };
  const updateBlockStatus = async (jid, action) => {
    const normalizedJid = (0, import_WABinary.jidNormalizedUser)(jid);
    let lid;
    let pn_jid;
    if ((0, import_WABinary.isLidUser)(normalizedJid) || (0, import_WABinary.isHostedLidUser)(normalizedJid)) {
      lid = normalizedJid;
      if (action === "block") {
        const pn = await signalRepository.lidMapping.getPNForLID(normalizedJid);
        if (!pn) {
          throw new import_boom.Boom(`Unable to resolve PN JID for LID: ${jid}`, { statusCode: 400 });
        }
        pn_jid = (0, import_WABinary.jidNormalizedUser)(pn);
      }
    } else if ((0, import_WABinary.isPnUser)(normalizedJid) || (0, import_WABinary.isHostedPnUser)(normalizedJid)) {
      const mapped = await signalRepository.lidMapping.getLIDForPN(normalizedJid);
      if (!mapped) {
        throw new import_boom.Boom(`Unable to resolve LID for PN JID: ${jid}`, { statusCode: 400 });
      }
      lid = mapped;
      if (action === "block") {
        pn_jid = (0, import_WABinary.jidNormalizedUser)(normalizedJid);
      }
    } else {
      throw new import_boom.Boom(`Invalid jid: ${jid}`, { statusCode: 400 });
    }
    const itemAttrs = {
      action,
      jid: lid
    };
    if (action === "block") {
      if (!pn_jid) {
        throw new import_boom.Boom(`pn_jid required for block: ${jid}`, { statusCode: 400 });
      }
      itemAttrs.pn_jid = pn_jid;
    }
    await query({
      tag: "iq",
      attrs: {
        xmlns: "blocklist",
        to: import_WABinary.S_WHATSAPP_NET,
        type: "set"
      },
      content: [
        {
          tag: "item",
          attrs: itemAttrs
        }
      ]
    });
  };
  const getBusinessProfile = async (jid) => {
    const results = await query({
      tag: "iq",
      attrs: {
        to: "s.whatsapp.net",
        xmlns: "w:biz",
        type: "get"
      },
      content: [
        {
          tag: "business_profile",
          attrs: { v: "244" },
          content: [
            {
              tag: "profile",
              attrs: { jid }
            }
          ]
        }
      ]
    });
    const profileNode = (0, import_WABinary.getBinaryNodeChild)(results, "business_profile");
    const profiles = (0, import_WABinary.getBinaryNodeChild)(profileNode, "profile");
    if (profiles) {
      const address = (0, import_WABinary.getBinaryNodeChild)(profiles, "address");
      const description = (0, import_WABinary.getBinaryNodeChild)(profiles, "description");
      const website = (0, import_WABinary.getBinaryNodeChild)(profiles, "website");
      const email = (0, import_WABinary.getBinaryNodeChild)(profiles, "email");
      const category = (0, import_WABinary.getBinaryNodeChild)((0, import_WABinary.getBinaryNodeChild)(profiles, "categories"), "category");
      const businessHours = (0, import_WABinary.getBinaryNodeChild)(profiles, "business_hours");
      const businessHoursConfig = businessHours ? (0, import_WABinary.getBinaryNodeChildren)(businessHours, "business_hours_config") : void 0;
      const websiteStr = website?.content?.toString();
      return {
        wid: profiles.attrs?.jid,
        address: address?.content?.toString(),
        description: description?.content?.toString() || "",
        website: websiteStr ? [websiteStr] : [],
        email: email?.content?.toString(),
        category: category?.content?.toString(),
        business_hours: {
          timezone: businessHours?.attrs?.timezone,
          business_config: businessHoursConfig?.map(({ attrs }) => attrs)
        }
      };
    }
  };
  const cleanDirtyBits = async (type, fromTimestamp) => {
    logger.info({ fromTimestamp }, "clean dirty bits " + type);
    await sendNode({
      tag: "iq",
      attrs: {
        to: import_WABinary.S_WHATSAPP_NET,
        type: "set",
        xmlns: "urn:xmpp:whatsapp:dirty",
        id: generateMessageTag()
      },
      content: [
        {
          tag: "clean",
          attrs: {
            type,
            ...fromTimestamp ? { timestamp: fromTimestamp.toString() } : null
          }
        }
      ]
    });
  };
  const newAppStateChunkHandler = (isInitialSync) => {
    return {
      onMutation(mutation) {
        (0, import_Utils.processSyncAction)(mutation, ev, authState.creds.me, isInitialSync ? { accountSettings: authState.creds.accountSettings } : void 0, logger);
      }
    };
  };
  const resyncAppState = ev.createBufferedFunction(async (collections, isInitialSync) => {
    const appStateSyncKeyCache = /* @__PURE__ */ new Map();
    const getCachedAppStateSyncKey = async (keyId) => {
      if (appStateSyncKeyCache.has(keyId)) {
        return appStateSyncKeyCache.get(keyId) ?? void 0;
      }
      const key = await getAppStateSyncKey(keyId);
      appStateSyncKeyCache.set(keyId, key ?? null);
      return key;
    };
    const initialVersionMap = {};
    const globalMutationMap = {};
    await authState.keys.transaction(async () => {
      const collectionsToHandle = new Set(collections);
      const attemptsMap = {};
      const forceSnapshotCollections = /* @__PURE__ */ new Set();
      while (collectionsToHandle.size) {
        const states = {};
        const nodes = [];
        for (const name of collectionsToHandle) {
          const result2 = await authState.keys.get("app-state-sync-version", [name]);
          let state = result2[name];
          if (state) {
            state = (0, import_Utils.ensureLTHashStateVersion)(state);
            if (typeof initialVersionMap[name] === "undefined") {
              initialVersionMap[name] = state.version;
            }
          } else {
            state = (0, import_Utils.newLTHashState)();
          }
          states[name] = state;
          const shouldForceSnapshot = forceSnapshotCollections.has(name);
          if (shouldForceSnapshot) {
            forceSnapshotCollections.delete(name);
          }
          logger.info(`resyncing ${name} from v${state.version}${shouldForceSnapshot ? " (forcing snapshot)" : ""}`);
          nodes.push({
            tag: "collection",
            attrs: {
              name,
              version: state.version.toString(),
              // return snapshot if syncing from scratch or forcing after a failed attempt
              return_snapshot: (shouldForceSnapshot || !state.version).toString()
            }
          });
        }
        const result = await query({
          tag: "iq",
          attrs: {
            to: import_WABinary.S_WHATSAPP_NET,
            xmlns: "w:sync:app:state",
            type: "set"
          },
          content: [
            {
              tag: "sync",
              attrs: {},
              content: nodes
            }
          ]
        });
        const decoded = await (0, import_Utils.extractSyncdPatches)(result, config?.options);
        for (const key in decoded) {
          const name = key;
          const { patches, hasMorePatches, snapshot } = decoded[name];
          try {
            if (snapshot) {
              const { state: newState, mutationMap } = await (0, import_Utils.decodeSyncdSnapshot)(name, snapshot, getCachedAppStateSyncKey, initialVersionMap[name], appStateMacVerification.snapshot, logger);
              states[name] = newState;
              Object.assign(globalMutationMap, mutationMap);
              logger.info(`restored state of ${name} from snapshot to v${newState.version} with mutations`);
              await authState.keys.set({ "app-state-sync-version": { [name]: newState } });
            }
            if (patches.length) {
              const { state: newState, mutationMap } = await (0, import_Utils.decodePatches)(name, patches, states[name], getCachedAppStateSyncKey, config.options, initialVersionMap[name], logger, appStateMacVerification.patch);
              await authState.keys.set({ "app-state-sync-version": { [name]: newState } });
              logger.info(`synced ${name} to v${newState.version}`);
              initialVersionMap[name] = newState.version;
              Object.assign(globalMutationMap, mutationMap);
            }
            if (hasMorePatches) {
              logger.info(`${name} has more patches...`);
            } else {
              collectionsToHandle.delete(name);
            }
          } catch (error) {
            attemptsMap[name] = (attemptsMap[name] || 0) + 1;
            const logData = {
              name,
              attempt: attemptsMap[name],
              version: states[name].version,
              statusCode: error.output?.statusCode,
              errorType: error.name,
              error: error.stack
            };
            if ((0, import_Utils.isMissingKeyError)(error) && attemptsMap[name] >= import_Utils.MAX_SYNC_ATTEMPTS) {
              logger.warn(logData, `${name} blocked on missing key from v${states[name].version}, parking after ${attemptsMap[name]} attempts`);
              blockedCollections.add(name);
              collectionsToHandle.delete(name);
            } else if ((0, import_Utils.isMissingKeyError)(error)) {
              logger.info(logData, `${name} blocked on missing key from v${states[name].version}, retrying with snapshot`);
              forceSnapshotCollections.add(name);
            } else if ((0, import_Utils.isAppStateSyncIrrecoverable)(error, attemptsMap[name])) {
              logger.warn(logData, `failed to sync ${name} from v${states[name].version}, giving up`);
              collectionsToHandle.delete(name);
            } else {
              logger.info(logData, `failed to sync ${name} from v${states[name].version}, forcing snapshot retry`);
              forceSnapshotCollections.add(name);
            }
          }
        }
      }
    }, authState?.creds?.me?.id || "resync-app-state");
    const { onMutation } = newAppStateChunkHandler(isInitialSync);
    for (const key in globalMutationMap) {
      onMutation(globalMutationMap[key]);
    }
  });
  const profilePictureUrl = async (jid, type = "preview", timeoutMs) => {
    const normalizedJid = (0, import_WABinary.jidNormalizedUser)(jid);
    const isUserJid = (0, import_WABinary.isPnUser)(normalizedJid) || (0, import_WABinary.isLidUser)(normalizedJid);
    const me = authState.creds.me;
    const isSelf = me && (normalizedJid === (0, import_WABinary.jidNormalizedUser)(me.id) || me.lid && normalizedJid === (0, import_WABinary.jidNormalizedUser)(me.lid));
    let tcTokenContent;
    if (serverProps.profilePicPrivacyToken && isUserJid && !isSelf) {
      tcTokenContent = await (0, import_tc_token_utils.buildTcTokenFromJid)({
        authState,
        jid: normalizedJid,
        getLIDForPN
      });
    }
    jid = (0, import_WABinary.jidNormalizedUser)(jid);
    const result = await query({
      tag: "iq",
      attrs: {
        target: jid,
        to: import_WABinary.S_WHATSAPP_NET,
        type: "get",
        xmlns: "w:profile:picture"
      },
      content: buildProfilePictureQueryContent(type, tcTokenContent)
    }, timeoutMs);
    const child = (0, import_WABinary.getBinaryNodeChild)(result, "picture");
    return child?.attrs?.url;
  };
  const createCallLink = async (type, event, timeoutMs) => {
    const result = await query({
      tag: "call",
      attrs: {
        id: generateMessageTag(),
        to: "@call"
      },
      content: [
        {
          tag: "link_create",
          attrs: { media: type },
          content: event ? [{ tag: "event", attrs: { start_time: String(event.startTime) } }] : void 0
        }
      ]
    }, timeoutMs);
    const child = (0, import_WABinary.getBinaryNodeChild)(result, "link_create");
    return child?.attrs?.token;
  };
  const sendPresenceUpdate = async (type, toJid) => {
    const me = authState.creds.me;
    const isAvailableType = type === "available";
    if (isAvailableType || type === "unavailable") {
      if (!me.name) {
        logger.warn("no name present, ignoring presence update request...");
        return;
      }
      ev.emit("connection.update", { isOnline: isAvailableType });
      if (isAvailableType) {
        void sendUnifiedSession();
      }
      await sendNode({
        tag: "presence",
        attrs: {
          name: me.name.replace(/@/g, ""),
          type
        }
      });
    } else {
      const { server } = (0, import_WABinary.jidDecode)(toJid);
      const isLid = server === "lid";
      await sendNode({
        tag: "chatstate",
        attrs: {
          from: isLid ? me.lid : me.id,
          to: toJid
        },
        content: [
          {
            tag: type === "recording" ? "composing" : type,
            attrs: type === "recording" ? { media: "audio" } : {}
          }
        ]
      });
    }
  };
  const presenceSubscribe = async (toJid) => {
    const normalizedToJid = (0, import_WABinary.jidNormalizedUser)(toJid);
    const isUserJid = (0, import_WABinary.isPnUser)(normalizedToJid) || (0, import_WABinary.isLidUser)(normalizedToJid);
    const tcTokenContent = isUserJid ? await (0, import_tc_token_utils.buildTcTokenFromJid)({ authState, jid: normalizedToJid, getLIDForPN }) : void 0;
    return sendNode({
      tag: "presence",
      attrs: {
        to: toJid,
        id: generateMessageTag(),
        type: "subscribe"
      },
      content: tcTokenContent
    });
  };
  const handlePresenceUpdate = ({ tag, attrs, content }) => {
    let presence;
    const jid = attrs.from;
    const participant = attrs.participant || attrs.from;
    if (shouldIgnoreJid(jid) && jid !== import_WABinary.S_WHATSAPP_NET) {
      return;
    }
    if (tag === "presence") {
      presence = {
        lastKnownPresence: attrs.type === "unavailable" ? "unavailable" : "available",
        lastSeen: attrs.last && attrs.last !== "deny" ? +attrs.last : void 0,
        groupOnlineCount: attrs.count ? +attrs.count : void 0
      };
    } else if (Array.isArray(content)) {
      const [firstChild] = content;
      let type = firstChild.tag;
      if (type === "paused") {
        type = "available";
      }
      if (firstChild.attrs?.media === "audio") {
        type = "recording";
      }
      presence = { lastKnownPresence: type };
    } else {
      logger.error({ tag, attrs, content }, "recv invalid presence node");
    }
    if (presence) {
      ev.emit("presence.update", { id: jid, presences: { [participant]: presence } });
    }
  };
  const appPatch = async (patchCreate) => {
    const name = patchCreate.type;
    const myAppStateKeyId = authState.creds.myAppStateKeyId;
    if (!myAppStateKeyId) {
      throw new import_boom.Boom("App state key not present!", { statusCode: 400 });
    }
    let initial;
    let encodeResult;
    await appStatePatchMutex.mutex(async () => {
      await authState.keys.transaction(async () => {
        logger.debug({ patch: patchCreate }, "applying app patch");
        await resyncAppState([name], false);
        const { [name]: currentSyncVersion } = await authState.keys.get("app-state-sync-version", [name]);
        initial = currentSyncVersion ? (0, import_Utils.ensureLTHashStateVersion)(currentSyncVersion) : (0, import_Utils.newLTHashState)();
        encodeResult = await (0, import_Utils.encodeSyncdPatch)(patchCreate, myAppStateKeyId, initial, getAppStateSyncKey);
        const { patch, state } = encodeResult;
        const node = {
          tag: "iq",
          attrs: {
            to: import_WABinary.S_WHATSAPP_NET,
            type: "set",
            xmlns: "w:sync:app:state"
          },
          content: [
            {
              tag: "sync",
              attrs: {},
              content: [
                {
                  tag: "collection",
                  attrs: {
                    name,
                    version: (state.version - 1).toString(),
                    return_snapshot: "false"
                  },
                  content: [
                    {
                      tag: "patch",
                      attrs: {},
                      content: import_WAProto.proto.SyncdPatch.encode(patch).finish()
                    }
                  ]
                }
              ]
            }
          ]
        };
        await query(node);
        await authState.keys.set({ "app-state-sync-version": { [name]: state } });
      }, authState?.creds?.me?.id || "app-patch");
    });
    if (config.emitOwnEvents) {
      const { onMutation } = newAppStateChunkHandler(false);
      const { mutationMap } = await (0, import_Utils.decodePatches)(name, [{ ...encodeResult.patch, version: { version: encodeResult.state.version } }], initial, getAppStateSyncKey, config.options, void 0, logger);
      for (const key in mutationMap) {
        onMutation(mutationMap[key]);
      }
    }
  };
  const fetchProps = async () => {
    const resultNode = await query({
      tag: "iq",
      attrs: {
        to: import_WABinary.S_WHATSAPP_NET,
        xmlns: "abt",
        type: "get"
      },
      content: [
        {
          tag: "props",
          attrs: {
            protocol: "1",
            ...authState?.creds?.lastPropHash ? { hash: authState.creds.lastPropHash } : {}
          }
        }
      ]
    });
    const propsNode = (0, import_WABinary.getBinaryNodeChild)(resultNode, "props");
    let props = {};
    if (propsNode) {
      if (propsNode.attrs?.hash) {
        authState.creds.lastPropHash = propsNode?.attrs?.hash;
        ev.emit("creds.update", authState.creds);
      }
      props = (0, import_WABinary.reduceBinaryNodeToDictionary)(propsNode, "prop");
    }
    const privacyTokenProp = props["10518"] ?? props["privacy_token_sending_on_all_1_on_1_messages"];
    if (privacyTokenProp !== void 0) {
      serverProps.privacyTokenOn1to1 = privacyTokenProp === "true" || privacyTokenProp === "1";
    }
    const profilePicProp = props["9666"] ?? props["profile_scraping_privacy_token_in_photo_iq"];
    if (profilePicProp !== void 0) {
      serverProps.profilePicPrivacyToken = profilePicProp === "true" || profilePicProp === "1";
    }
    const lidIssueProp = props["14303"] ?? props["lid_trusted_token_issue_to_lid"];
    if (lidIssueProp !== void 0) {
      serverProps.lidTrustedTokenIssueToLid = lidIssueProp === "true" || lidIssueProp === "1";
    }
    logger.debug({ serverProps }, "fetched props");
    return props;
  };
  const chatModify = (mod, jid) => {
    const patch = (0, import_Utils.chatModificationToAppPatch)(mod, jid);
    return appPatch(patch);
  };
  const updateDisableLinkPreviewsPrivacy = (isPreviewsDisabled) => {
    return chatModify({
      disableLinkPreviews: { isPreviewsDisabled }
    }, "");
  };
  const star = (jid, messages, star2) => {
    return chatModify({
      star: {
        messages,
        star: star2
      }
    }, jid);
  };
  const addOrEditContact = (jid, contact) => {
    return chatModify({
      contact
    }, jid);
  };
  const removeContact = (jid) => {
    return chatModify({
      contact: null
    }, jid);
  };
  const addLabel = (jid, labels) => {
    return chatModify({
      addLabel: {
        ...labels
      }
    }, jid);
  };
  const addChatLabel = (jid, labelId) => {
    return chatModify({
      addChatLabel: {
        labelId
      }
    }, jid);
  };
  const removeChatLabel = (jid, labelId) => {
    return chatModify({
      removeChatLabel: {
        labelId
      }
    }, jid);
  };
  const addMessageLabel = (jid, messageId, labelId) => {
    return chatModify({
      addMessageLabel: {
        messageId,
        labelId
      }
    }, jid);
  };
  const removeMessageLabel = (jid, messageId, labelId) => {
    return chatModify({
      removeMessageLabel: {
        messageId,
        labelId
      }
    }, jid);
  };
  const addOrEditQuickReply = (quickReply) => {
    return chatModify({
      quickReply
    }, "");
  };
  const removeQuickReply = (timestamp) => {
    return chatModify({
      quickReply: { timestamp, deleted: true }
    }, "");
  };
  const executeInitQueries = async () => {
    await Promise.all([fetchProps(), fetchBlocklist(), fetchPrivacySettings()]);
  };
  const upsertMessage = ev.createBufferedFunction(async (msg, type) => {
    ev.emit("messages.upsert", { messages: [msg], type });
    if (!!msg.pushName) {
      let jid = msg.key.fromMe ? authState.creds.me.id : msg.key.participant || msg.key.remoteJid;
      jid = (0, import_WABinary.jidNormalizedUser)(jid);
      if (!msg.key.fromMe) {
        ev.emit("contacts.update", [{ id: jid, notify: msg.pushName, verifiedName: msg.verifiedBizName }]);
      }
      if (msg.key.fromMe && msg.pushName && authState.creds.me?.name !== msg.pushName) {
        ev.emit("creds.update", { me: { ...authState.creds.me, name: msg.pushName } });
      }
    }
    const historyMsg = (0, import_Utils.getHistoryMsg)(msg.message);
    const shouldProcessHistoryMsg = historyMsg ? shouldSyncHistoryMessage(historyMsg) && import_Defaults.PROCESSABLE_HISTORY_TYPES.includes(historyMsg.syncType) : false;
    if (historyMsg && shouldProcessHistoryMsg) {
      const syncType = historyMsg.syncType;
      if (syncType === import_WAProto.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP && !historySyncStatus.initialBootstrapComplete) {
        historySyncStatus.initialBootstrapComplete = true;
        ev.emit("messaging-history.status", {
          syncType,
          status: "complete",
          explicit: true
        });
      }
      if (syncType === import_WAProto.proto.HistorySync.HistorySyncType.RECENT && historyMsg.progress === 100 && !historySyncStatus.recentSyncComplete) {
        historySyncStatus.recentSyncComplete = true;
        clearTimeout(historySyncPausedTimeout);
        historySyncPausedTimeout = void 0;
        ev.emit("messaging-history.status", {
          syncType,
          status: "complete",
          explicit: true
        });
      }
      if (syncType === import_WAProto.proto.HistorySync.HistorySyncType.RECENT && !historySyncStatus.recentSyncComplete) {
        clearTimeout(historySyncPausedTimeout);
        historySyncPausedTimeout = setTimeout(() => {
          if (!historySyncStatus.recentSyncComplete) {
            historySyncStatus.recentSyncComplete = true;
            ev.emit("messaging-history.status", {
              syncType: import_WAProto.proto.HistorySync.HistorySyncType.RECENT,
              status: "paused",
              explicit: false
            });
          }
          historySyncPausedTimeout = void 0;
        }, import_Defaults.HISTORY_SYNC_PAUSED_TIMEOUT_MS);
      }
    }
    if (historyMsg && syncState === import_State.SyncState.AwaitingInitialSync) {
      if (awaitingSyncTimeout) {
        clearTimeout(awaitingSyncTimeout);
        awaitingSyncTimeout = void 0;
      }
      if (shouldProcessHistoryMsg) {
        syncState = import_State.SyncState.Syncing;
        logger.info("Transitioned to Syncing state");
      } else {
        syncState = import_State.SyncState.Online;
        logger.info("History sync skipped, transitioning to Online state and flushing buffer");
        ev.flush();
      }
    }
    const doAppStateSync = async () => {
      if (syncState === import_State.SyncState.Syncing) {
        blockedCollections.clear();
        logger.info("Doing app state sync");
        await resyncAppState(import_Types.ALL_WA_PATCH_NAMES, true);
        syncState = import_State.SyncState.Online;
        logger.info("App state sync complete, transitioning to Online state and flushing buffer");
        ev.flush();
        const accountSyncCounter = (authState.creds.accountSyncCounter || 0) + 1;
        ev.emit("creds.update", { accountSyncCounter });
      }
    };
    await Promise.all([
      (async () => {
        if (shouldProcessHistoryMsg) {
          await doAppStateSync();
        }
      })(),
      (0, import_process_message.default)(msg, {
        signalRepository,
        shouldProcessHistoryMsg,
        placeholderResendCache,
        ev,
        creds: authState.creds,
        keyStore: authState.keys,
        logger,
        options: config.options,
        getMessage
      })
    ]);
    if (msg.message?.protocolMessage?.appStateSyncKeyShare && syncState === import_State.SyncState.Syncing) {
      logger.info("App state sync key arrived, triggering app state sync");
      await doAppStateSync();
    }
  });
  ws.on("CB:presence", handlePresenceUpdate);
  ws.on("CB:chatstate", handlePresenceUpdate);
  ws.on("CB:ib,,dirty", async (node) => {
    const { attrs } = (0, import_WABinary.getBinaryNodeChild)(node, "dirty");
    const type = attrs.type;
    switch (type) {
      case "account_sync":
        if (attrs.timestamp) {
          let { lastAccountSyncTimestamp } = authState.creds;
          if (lastAccountSyncTimestamp) {
            await cleanDirtyBits("account_sync", lastAccountSyncTimestamp);
          }
          lastAccountSyncTimestamp = +attrs.timestamp;
          ev.emit("creds.update", { lastAccountSyncTimestamp });
        }
        break;
      case "groups":
        break;
      default:
        logger.info({ node }, "received unknown sync");
        break;
    }
  });
  ev.on("connection.update", ({ connection, receivedPendingNotifications }) => {
    if (connection === "close") {
      blockedCollections.clear();
      clearTimeout(historySyncPausedTimeout);
      historySyncPausedTimeout = void 0;
    }
    if (connection === "open") {
      if (fireInitQueries) {
        executeInitQueries().catch((error) => onUnexpectedError(error, "init queries"));
      }
      sendPresenceUpdate(markOnlineOnConnect ? "available" : "unavailable").catch((error) => onUnexpectedError(error, "presence update requests"));
    }
    if (!receivedPendingNotifications || syncState !== import_State.SyncState.Connecting) {
      return;
    }
    historySyncStatus.initialBootstrapComplete = false;
    historySyncStatus.recentSyncComplete = false;
    clearTimeout(historySyncPausedTimeout);
    historySyncPausedTimeout = void 0;
    syncState = import_State.SyncState.AwaitingInitialSync;
    logger.info("Connection is now AwaitingInitialSync, buffering events");
    ev.buffer();
    const willSyncHistory = shouldSyncHistoryMessage(import_WAProto.proto.Message.HistorySyncNotification.create({
      syncType: import_WAProto.proto.HistorySync.HistorySyncType.RECENT
    }));
    if (!willSyncHistory) {
      logger.info("History sync is disabled by config, not waiting for notification. Transitioning to Online.");
      syncState = import_State.SyncState.Online;
      setTimeout(() => ev.flush(), 0);
      return;
    }
    if (authState.creds.accountSyncCounter > 0) {
      logger.info("Reconnection with existing sync data, skipping history sync wait. Transitioning to Online.");
      syncState = import_State.SyncState.Online;
      setTimeout(() => ev.flush(), 0);
      return;
    }
    logger.info("First connection, awaiting history sync notification with a 20s timeout.");
    if (awaitingSyncTimeout) {
      clearTimeout(awaitingSyncTimeout);
    }
    awaitingSyncTimeout = setTimeout(() => {
      if (syncState === import_State.SyncState.AwaitingInitialSync) {
        logger.warn("Timeout in AwaitingInitialSync, forcing state to Online and flushing buffer");
        syncState = import_State.SyncState.Online;
        ev.flush();
        const accountSyncCounter = (authState.creds.accountSyncCounter || 0) + 1;
        ev.emit("creds.update", { accountSyncCounter });
      }
    }, 2e4);
  });
  ev.on("creds.update", ({ myAppStateKeyId }) => {
    if (!myAppStateKeyId || blockedCollections.size === 0) {
      return;
    }
    if (syncState === import_State.SyncState.Syncing) {
      blockedCollections.clear();
      return;
    }
    const collections = [...blockedCollections];
    blockedCollections.clear();
    logger.info({ collections }, "app state sync key arrived, re-syncing blocked collections");
    resyncAppState(collections, false).catch((error) => onUnexpectedError(error, "blocked collections resync"));
  });
  ev.on("lid-mapping.update", async ({ lid, pn }) => {
    try {
      await signalRepository.lidMapping.storeLIDPNMappings([{ lid, pn }]);
    } catch (error) {
      logger.warn({ lid, pn, error }, "Failed to store LID-PN mapping");
    }
  });
  registerSocketEndHandler(() => {
    if (awaitingSyncTimeout) {
      clearTimeout(awaitingSyncTimeout);
      awaitingSyncTimeout = void 0;
    }
    if (!config.placeholderResendCache && placeholderResendCache.close) {
      placeholderResendCache.close();
    }
    syncState = import_State.SyncState.Connecting;
    privacySettings = void 0;
  });
  return {
    ...sock,
    serverProps,
    createCallLink,
    getBotListV2,
    messageMutex,
    receiptMutex,
    appStatePatchMutex,
    notificationMutex,
    fetchPrivacySettings,
    upsertMessage,
    appPatch,
    sendPresenceUpdate,
    presenceSubscribe,
    profilePictureUrl,
    fetchBlocklist,
    fetchStatus,
    fetchDisappearingDuration,
    updateProfilePicture,
    removeProfilePicture,
    updateProfileStatus,
    updateProfileName,
    updateBlockStatus,
    updateDisableLinkPreviewsPrivacy,
    updateCallPrivacy,
    updateMessagesPrivacy,
    updateLastSeenPrivacy,
    updateOnlinePrivacy,
    updateProfilePicturePrivacy,
    updateStatusPrivacy,
    updateReadReceiptsPrivacy,
    updateGroupsAddPrivacy,
    updateDefaultDisappearingMode,
    getBusinessProfile,
    resyncAppState,
    chatModify,
    cleanDirtyBits,
    addOrEditContact,
    removeContact,
    placeholderResendCache,
    addLabel,
    addChatLabel,
    removeChatLabel,
    addMessageLabel,
    removeMessageLabel,
    star,
    addOrEditQuickReply,
    removeQuickReply
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildProfilePictureQueryContent,
  makeChatsSocket
});
