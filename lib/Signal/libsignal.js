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
var libsignal_exports = {};
__export(libsignal_exports, {
  makeLibSignalRepository: () => makeLibSignalRepository
});
module.exports = __toCommonJS(libsignal_exports);
var libsignal = __toESM(require("../../vendor/libsignal/index.js"));
var import_protobufs = require("../../vendor/libsignal/src/protobufs.js");
var import_lru_cache = require("lru-cache");
var import_Utils = require("../Utils/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_sender_key_name = require("./Group/sender-key-name.js");
var import_sender_key_record = require("./Group/sender-key-record.js");
var import_Group = require("./Group/index.js");
var import_lid_mapping = require("./lid-mapping.js");
function extractIdentityFromPkmsg(ciphertext) {
  try {
    if (!ciphertext || ciphertext.length < 2) {
      return void 0;
    }
    const version = ciphertext[0];
    if ((version & 15) !== 3) {
      return void 0;
    }
    const preKeyProto = import_protobufs.PreKeyWhisperMessage.decode(ciphertext.slice(1));
    if (preKeyProto.identityKey?.length === 33) {
      return new Uint8Array(preKeyProto.identityKey);
    }
    return void 0;
  } catch {
    return void 0;
  }
}
function makeLibSignalRepository(auth, logger, pnToLIDFunc) {
  const lidMapping = new import_lid_mapping.LIDMappingStore(auth.keys, logger, pnToLIDFunc);
  const storage = signalStorage(auth, lidMapping);
  const parsedKeys = auth.keys;
  const migratedSessionCache = new import_lru_cache.LRUCache({
    ttl: 3 * 24 * 60 * 60 * 1e3,
    // 7 days
    ttlAutopurge: true,
    updateAgeOnGet: true
  });
  const ensureSenderKeyAndCreateSkdm = async (group, meId) => {
    const senderName = jidToSignalSenderKeyName(group, meId);
    const senderNameStr = senderName.toString();
    const { [senderNameStr]: senderKey } = await auth.keys.get("sender-key", [senderNameStr]);
    if (!senderKey) {
      await storage.storeSenderKey(senderName, new import_sender_key_record.SenderKeyRecord());
    }
    const skdm = await new import_Group.GroupSessionBuilder(storage).create(senderName);
    return { senderName, skdm };
  };
  const repository = {
    decryptGroupMessage({ group, authorJid, msg }) {
      const senderName = jidToSignalSenderKeyName(group, authorJid);
      const cipher = new import_Group.GroupCipher(storage, senderName);
      return parsedKeys.transaction(async () => {
        return cipher.decrypt(msg);
      }, group);
    },
    async processSenderKeyDistributionMessage({ item, authorJid }) {
      const builder = new import_Group.GroupSessionBuilder(storage);
      if (!item.groupId) {
        throw new Error("Group ID is required for sender key distribution message");
      }
      const senderName = jidToSignalSenderKeyName(item.groupId, authorJid);
      const senderMsg = new import_Group.SenderKeyDistributionMessage(null, null, null, null, item.axolotlSenderKeyDistributionMessage);
      const senderNameStr = senderName.toString();
      const { [senderNameStr]: senderKey } = await auth.keys.get("sender-key", [senderNameStr]);
      if (!senderKey) {
        await storage.storeSenderKey(senderName, new import_sender_key_record.SenderKeyRecord());
      }
      return parsedKeys.transaction(async () => {
        const { [senderNameStr]: senderKey2 } = await auth.keys.get("sender-key", [senderNameStr]);
        if (!senderKey2) {
          await storage.storeSenderKey(senderName, new import_sender_key_record.SenderKeyRecord());
        }
        await builder.process(senderName, senderMsg);
      }, item.groupId);
    },
    async decryptMessage({ jid, type, ciphertext }) {
      const addr = jidToSignalProtocolAddress(jid);
      const session = new libsignal.SessionCipher(storage, addr);
      if (type === "pkmsg") {
        const identityKey = extractIdentityFromPkmsg(ciphertext);
        if (identityKey) {
          const addrStr = addr.toString();
          const identityChanged = await storage.saveIdentity(addrStr, identityKey);
          if (identityChanged) {
            logger.info({ jid, addr: addrStr }, "identity key changed or new contact, session will be re-established");
          }
        }
      }
      async function doDecrypt() {
        let result;
        switch (type) {
          case "pkmsg":
            result = await session.decryptPreKeyWhisperMessage(ciphertext);
            break;
          case "msg":
            result = await session.decryptWhisperMessage(ciphertext);
            break;
        }
        return result;
      }
      return parsedKeys.transaction(async () => {
        return await doDecrypt();
      }, jid);
    },
    async encryptMessage({ jid, data }) {
      const addr = jidToSignalProtocolAddress(jid);
      const cipher = new libsignal.SessionCipher(storage, addr);
      return parsedKeys.transaction(async () => {
        const { type: sigType, body } = await cipher.encrypt(data);
        const type = sigType === 3 ? "pkmsg" : "msg";
        return { type, ciphertext: Buffer.from(body, "binary") };
      }, jid);
    },
    async encryptGroupMessage({ group, meId, data }) {
      return parsedKeys.transaction(async () => {
        const { senderName, skdm } = await ensureSenderKeyAndCreateSkdm(group, meId);
        const ciphertext = await new import_Group.GroupCipher(storage, senderName).encrypt(data);
        return { ciphertext, senderKeyDistributionMessage: skdm.serialize() };
      }, group);
    },
    async getSenderKeyDistributionMessage({ group, meId }) {
      return parsedKeys.transaction(async () => {
        const { skdm } = await ensureSenderKeyAndCreateSkdm(group, meId);
        return skdm.serialize();
      }, group);
    },
    async hasSenderKey({ group, meId }) {
      const senderName = jidToSignalSenderKeyName(group, meId).toString();
      const { [senderName]: key } = await auth.keys.get("sender-key", [senderName]);
      return !!key;
    },
    async getSessionInfo(jid) {
      const addr = jidToSignalProtocolAddress(jid).toString();
      const session = await storage.loadSession(addr);
      if (!session) {
        return null;
      }
      const open = session.getOpenSession?.();
      const baseKey = open?.indexInfo?.baseKey;
      const registrationId = open?.registrationId;
      if (!baseKey || typeof registrationId !== "number") {
        return null;
      }
      return { baseKey: new Uint8Array(baseKey), registrationId };
    },
    async injectE2ESession({ jid, session }) {
      logger.trace({ jid }, "injecting E2EE session");
      const cipher = new libsignal.SessionBuilder(storage, jidToSignalProtocolAddress(jid));
      return parsedKeys.transaction(async () => {
        await cipher.initOutgoing(session);
      }, jid);
    },
    jidToSignalProtocolAddress(jid) {
      return jidToSignalProtocolAddress(jid).toString();
    },
    // Optimized direct access to LID mapping store
    lidMapping,
    async validateSession(jid) {
      try {
        const addr = jidToSignalProtocolAddress(jid);
        const session = await storage.loadSession(addr.toString());
        if (!session) {
          return { exists: false, reason: "no session" };
        }
        if (!session.haveOpenSession()) {
          return { exists: false, reason: "no open session" };
        }
        return { exists: true };
      } catch (error) {
        return { exists: false, reason: "validation error" };
      }
    },
    async deleteSession(jids) {
      if (!jids.length)
        return;
      const sessionUpdates = {};
      jids.forEach((jid) => {
        const addr = jidToSignalProtocolAddress(jid);
        sessionUpdates[addr.toString()] = null;
      });
      return parsedKeys.transaction(async () => {
        await auth.keys.set({ session: sessionUpdates });
      }, `delete-${jids.length}-sessions`);
    },
    close() {
      migratedSessionCache.clear();
      lidMapping.close();
    },
    async migrateSession(fromJid, toJid) {
      if (!fromJid || !(0, import_WABinary.isLidUser)(toJid) && !(0, import_WABinary.isHostedLidUser)(toJid))
        return { migrated: 0, skipped: 0, total: 0 };
      if (!(0, import_WABinary.isPnUser)(fromJid) && !(0, import_WABinary.isHostedPnUser)(fromJid)) {
        return { migrated: 0, skipped: 0, total: 1 };
      }
      const { user } = (0, import_WABinary.jidDecode)(fromJid);
      logger.debug({ fromJid }, "bulk device migration - loading all user devices");
      const { [user]: userDevices } = await parsedKeys.get("device-list", [user]);
      if (!userDevices) {
        return { migrated: 0, skipped: 0, total: 0 };
      }
      const { device: fromDevice } = (0, import_WABinary.jidDecode)(fromJid);
      const fromDeviceStr = fromDevice?.toString() || "0";
      if (!userDevices.includes(fromDeviceStr)) {
        userDevices.push(fromDeviceStr);
      }
      const uncachedDevices = userDevices.filter((device) => {
        const deviceKey = `${user}.${device}`;
        return !migratedSessionCache.has(deviceKey);
      });
      const deviceSessionKeys = uncachedDevices.map((device) => `${user}.${device}`);
      const existingSessions = await parsedKeys.get("session", deviceSessionKeys);
      const deviceJids = [];
      for (const [sessionKey, sessionData] of Object.entries(existingSessions)) {
        if (sessionData) {
          const deviceStr = sessionKey.split(".")[1];
          if (!deviceStr)
            continue;
          const deviceNum = parseInt(deviceStr);
          let jid = deviceNum === 0 ? `${user}@s.whatsapp.net` : `${user}:${deviceNum}@s.whatsapp.net`;
          if (deviceNum === 99) {
            jid = `${user}:99@hosted`;
          }
          deviceJids.push(jid);
        }
      }
      logger.debug({
        fromJid,
        totalDevices: userDevices.length,
        devicesWithSessions: deviceJids.length,
        devices: deviceJids
      }, "bulk device migration complete - all user devices processed");
      return parsedKeys.transaction(async () => {
        const migrationOps = deviceJids.map((jid) => {
          const lidWithDevice = (0, import_WABinary.transferDevice)(jid, toJid);
          const fromDecoded = (0, import_WABinary.jidDecode)(jid);
          const toDecoded = (0, import_WABinary.jidDecode)(lidWithDevice);
          return {
            fromJid: jid,
            toJid: lidWithDevice,
            pnUser: fromDecoded.user,
            lidUser: toDecoded.user,
            deviceId: fromDecoded.device || 0,
            fromAddr: jidToSignalProtocolAddress(jid),
            toAddr: jidToSignalProtocolAddress(lidWithDevice)
          };
        });
        const totalOps = migrationOps.length;
        let migratedCount = 0;
        const pnAddrStrings = Array.from(new Set(migrationOps.map((op) => op.fromAddr.toString())));
        const pnSessions = await parsedKeys.get("session", pnAddrStrings);
        const sessionUpdates = {};
        for (const op of migrationOps) {
          const pnAddrStr = op.fromAddr.toString();
          const lidAddrStr = op.toAddr.toString();
          const pnSession = pnSessions[pnAddrStr];
          if (pnSession) {
            const fromSession = libsignal.SessionRecord.deserialize(pnSession);
            if (fromSession.haveOpenSession()) {
              sessionUpdates[lidAddrStr] = fromSession.serialize();
              sessionUpdates[pnAddrStr] = null;
              migratedCount++;
            }
          }
        }
        if (Object.keys(sessionUpdates).length > 0) {
          await parsedKeys.set({ session: sessionUpdates });
          logger.debug({ migratedSessions: migratedCount }, "bulk session migration complete");
          for (const op of migrationOps) {
            if (sessionUpdates[op.toAddr.toString()]) {
              const deviceKey = `${op.pnUser}.${op.deviceId}`;
              migratedSessionCache.set(deviceKey, true);
            }
          }
        }
        const skippedCount = totalOps - migratedCount;
        return { migrated: migratedCount, skipped: skippedCount, total: totalOps };
      }, `migrate-${deviceJids.length}-sessions-${(0, import_WABinary.jidDecode)(toJid)?.user}`);
    }
  };
  return repository;
}
const jidToSignalProtocolAddress = (jid) => {
  const decoded = (0, import_WABinary.jidDecode)(jid);
  const { user, device, server, domainType } = decoded;
  if (!user) {
    throw new Error(`JID decoded but user is empty: "${jid}" -> user: "${user}", server: "${server}", device: ${device}`);
  }
  const signalUser = domainType !== import_WABinary.WAJIDDomains.WHATSAPP ? `${user}_${domainType}` : user;
  const finalDevice = device || 0;
  if (device === 99 && decoded.server !== "hosted" && decoded.server !== "hosted.lid") {
    throw new Error("Unexpected non-hosted device JID with device 99. This ID seems invalid. ID:" + jid);
  }
  return new libsignal.ProtocolAddress(signalUser, finalDevice);
};
const jidToSignalSenderKeyName = (group, user) => {
  return new import_sender_key_name.SenderKeyName(group, jidToSignalProtocolAddress(user));
};
function signalStorage({ creds, keys }, lidMapping) {
  const resolveLIDSignalAddress = async (id) => {
    if (id.includes(".")) {
      const [deviceId, device] = id.split(".");
      const [user, domainType_] = deviceId.split("_");
      const domainType = parseInt(domainType_ || "0");
      if (domainType === import_WABinary.WAJIDDomains.LID || domainType === import_WABinary.WAJIDDomains.HOSTED_LID)
        return id;
      const pnJid = `${user}${device !== "0" ? `:${device}` : ""}@${domainType === import_WABinary.WAJIDDomains.HOSTED ? "hosted" : "s.whatsapp.net"}`;
      const lidForPN = await lidMapping.getLIDForPN(pnJid);
      if (lidForPN) {
        const lidAddr = jidToSignalProtocolAddress(lidForPN);
        return lidAddr.toString();
      }
    }
    return id;
  };
  return {
    loadSession: async (id) => {
      try {
        const wireJid = await resolveLIDSignalAddress(id);
        const { [wireJid]: sess } = await keys.get("session", [wireJid]);
        if (sess) {
          return libsignal.SessionRecord.deserialize(sess);
        }
      } catch (e) {
        return null;
      }
      return null;
    },
    storeSession: async (id, session) => {
      const wireJid = await resolveLIDSignalAddress(id);
      await keys.set({ session: { [wireJid]: session.serialize() } });
    },
    isTrustedIdentity: () => {
      return true;
    },
    loadIdentityKey: async (id) => {
      const wireJid = await resolveLIDSignalAddress(id);
      const { [wireJid]: key } = await keys.get("identity-key", [wireJid]);
      return key || void 0;
    },
    saveIdentity: async (id, identityKey) => {
      const wireJid = await resolveLIDSignalAddress(id);
      const { [wireJid]: existingKey } = await keys.get("identity-key", [wireJid]);
      const keysMatch = existingKey?.length === identityKey.length && existingKey.every((byte, i) => byte === identityKey[i]);
      if (existingKey && !keysMatch) {
        await keys.set({
          session: { [wireJid]: null },
          "identity-key": { [wireJid]: identityKey }
        });
        return true;
      }
      if (!existingKey) {
        await keys.set({ "identity-key": { [wireJid]: identityKey } });
        return true;
      }
      return false;
    },
    loadPreKey: async (id) => {
      const keyId = id.toString();
      const { [keyId]: key } = await keys.get("pre-key", [keyId]);
      if (key) {
        return {
          privKey: Buffer.from(key.private),
          pubKey: Buffer.from(key.public)
        };
      }
    },
    removePreKey: (id) => keys.set({ "pre-key": { [id]: null } }),
    loadSignedPreKey: () => {
      const key = creds.signedPreKey;
      return {
        privKey: Buffer.from(key.keyPair.private),
        pubKey: Buffer.from(key.keyPair.public)
      };
    },
    loadSenderKey: async (senderKeyName) => {
      const keyId = senderKeyName.toString();
      const { [keyId]: key } = await keys.get("sender-key", [keyId]);
      if (key) {
        return import_sender_key_record.SenderKeyRecord.deserialize(key);
      }
      return new import_sender_key_record.SenderKeyRecord();
    },
    storeSenderKey: async (senderKeyName, key) => {
      const keyId = senderKeyName.toString();
      const serialized = JSON.stringify(key.serialize());
      await keys.set({ "sender-key": { [keyId]: Buffer.from(serialized, "utf-8") } });
    },
    getOurRegistrationId: () => creds.registrationId,
    getOurIdentity: () => {
      const { signedIdentityKey } = creds;
      return {
        privKey: Buffer.from(signedIdentityKey.private),
        pubKey: Buffer.from((0, import_Utils.generateSignalPubKey)(signedIdentityKey.public))
      };
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  makeLibSignalRepository
});
