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
var validate_connection_exports = {};
__export(validate_connection_exports, {
  configureSuccessfulPairing: () => configureSuccessfulPairing,
  encodeSignedDeviceIdentity: () => encodeSignedDeviceIdentity,
  generateLoginNode: () => generateLoginNode,
  generateRegistrationNode: () => generateRegistrationNode
});
module.exports = __toCommonJS(validate_connection_exports);
var import_boom = require("@hapi/boom");
var import_crypto = require("crypto");
var import_WAProto = require("../../WAProto/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_crypto2 = require("./crypto.js");
var import_generics = require("./generics.js");
var import_signal = require("./signal.js");
const getUserAgent = (config) => {
  return {
    appVersion: {
      primary: config.version[0],
      secondary: config.version[1],
      tertiary: config.version[2]
    },
    platform: config.browser[1].toLocaleLowerCase().includes("android") ? import_WAProto.proto.ClientPayload.UserAgent.Platform.ANDROID : import_WAProto.proto.ClientPayload.UserAgent.Platform.WEB,
    releaseChannel: import_WAProto.proto.ClientPayload.UserAgent.ReleaseChannel.RELEASE,
    osVersion: "0.1",
    device: "Desktop",
    osBuildNumber: "0.1",
    localeLanguageIso6391: "en",
    mnc: "000",
    mcc: "000",
    localeCountryIso31661Alpha2: config.countryCode
  };
};
const PLATFORM_MAP = {
  "Mac OS": import_WAProto.proto.ClientPayload.WebInfo.WebSubPlatform.DARWIN,
  Windows: import_WAProto.proto.ClientPayload.WebInfo.WebSubPlatform.WIN32
};
const getWebInfo = (config) => {
  let webSubPlatform = import_WAProto.proto.ClientPayload.WebInfo.WebSubPlatform.WEB_BROWSER;
  if (config.syncFullHistory && PLATFORM_MAP[config.browser[0]] && config.browser[1] === "Desktop") {
    webSubPlatform = PLATFORM_MAP[config.browser[0]];
  }
  return { webSubPlatform };
};
const getClientPayload = (config) => {
  const payload = {
    connectType: import_WAProto.proto.ClientPayload.ConnectType.WIFI_UNKNOWN,
    connectReason: import_WAProto.proto.ClientPayload.ConnectReason.USER_ACTIVATED,
    userAgent: getUserAgent(config)
  };
  if (!config.browser[1].toLocaleLowerCase().includes("android")) {
    payload.webInfo = getWebInfo(config);
  }
  if (config.pushName) {
    payload.pushName = config.pushName;
  }
  return payload;
};
const generateLoginNode = (userJid, config) => {
  const { user, device } = (0, import_WABinary.jidDecode)(userJid);
  const payload = {
    ...getClientPayload(config),
    passive: true,
    pull: true,
    username: +user,
    device,
    // TODO: investigate (hard set as false atm)
    lidDbMigrated: false
  };
  return import_WAProto.proto.ClientPayload.fromObject(payload);
};
const getPlatformType = (platform) => {
  const platformType = platform.toUpperCase();
  if (platformType === "ANDROID") {
    return import_WAProto.proto.DeviceProps.PlatformType.ANDROID_PHONE;
  }
  return import_WAProto.proto.DeviceProps.PlatformType[platformType] || import_WAProto.proto.DeviceProps.PlatformType.CHROME;
};
const generateRegistrationNode = ({ registrationId, signedPreKey, signedIdentityKey }, config) => {
  const appVersionBuf = (0, import_crypto.createHash)("md5").update(config.version.join(".")).digest();
  const companion = {
    os: config.browser[0],
    platformType: getPlatformType(config.browser[1]),
    requireFullSync: config.syncFullHistory,
    historySyncConfig: {
      storageQuotaMb: 10240,
      inlineInitialPayloadInE2EeMsg: true,
      recentSyncDaysLimit: void 0,
      supportCallLogHistory: false,
      supportBotUserAgentChatHistory: true,
      supportCagReactionsAndPolls: true,
      supportBizHostedMsg: true,
      supportRecentSyncChunkMessageCountTuning: true,
      supportHostedGroupMsg: true,
      supportFbidBotChatHistory: true,
      supportAddOnHistorySyncMigration: void 0,
      supportMessageAssociation: true,
      supportGroupHistory: false,
      onDemandReady: void 0,
      supportGuestChat: void 0
    },
    version: {
      primary: 10,
      secondary: 15,
      tertiary: 7
    }
  };
  const companionProto = import_WAProto.proto.DeviceProps.encode(companion).finish();
  const registerPayload = {
    ...getClientPayload(config),
    passive: false,
    pull: false,
    devicePairingData: {
      buildHash: appVersionBuf,
      deviceProps: companionProto,
      eRegid: (0, import_generics.encodeBigEndian)(registrationId),
      eKeytype: import_Defaults.KEY_BUNDLE_TYPE,
      eIdent: signedIdentityKey.public,
      eSkeyId: (0, import_generics.encodeBigEndian)(signedPreKey.keyId, 3),
      eSkeyVal: signedPreKey.keyPair.public,
      eSkeySig: signedPreKey.signature
    }
  };
  return import_WAProto.proto.ClientPayload.fromObject(registerPayload);
};
const configureSuccessfulPairing = (stanza, { advSecretKey, signedIdentityKey, signalIdentities }) => {
  const msgId = stanza.attrs.id;
  const pairSuccessNode = (0, import_WABinary.getBinaryNodeChild)(stanza, "pair-success");
  const deviceIdentityNode = (0, import_WABinary.getBinaryNodeChild)(pairSuccessNode, "device-identity");
  const platformNode = (0, import_WABinary.getBinaryNodeChild)(pairSuccessNode, "platform");
  const deviceNode = (0, import_WABinary.getBinaryNodeChild)(pairSuccessNode, "device");
  const businessNode = (0, import_WABinary.getBinaryNodeChild)(pairSuccessNode, "biz");
  if (!deviceIdentityNode || !deviceNode) {
    throw new import_boom.Boom("Missing device-identity or device in pair success node", { data: stanza });
  }
  const bizName = businessNode?.attrs.name;
  const jid = deviceNode.attrs.jid;
  const lid = deviceNode.attrs.lid;
  const { details, hmac, accountType } = import_WAProto.proto.ADVSignedDeviceIdentityHMAC.decode(deviceIdentityNode.content);
  let hmacPrefix = Buffer.from([]);
  if (accountType !== void 0 && accountType === import_WAProto.proto.ADVEncryptionType.HOSTED) {
    hmacPrefix = import_Defaults.WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX;
  }
  const advSign = (0, import_crypto2.hmacSign)(Buffer.concat([hmacPrefix, details]), Buffer.from(advSecretKey, "base64"));
  if (Buffer.compare(hmac, advSign) !== 0) {
    throw new import_boom.Boom("Invalid account signature");
  }
  const account = import_WAProto.proto.ADVSignedDeviceIdentity.decode(details);
  const { accountSignatureKey, accountSignature, details: deviceDetails } = account;
  const deviceIdentity = import_WAProto.proto.ADVDeviceIdentity.decode(deviceDetails);
  const accountSignaturePrefix = deviceIdentity.deviceType === import_WAProto.proto.ADVEncryptionType.HOSTED ? import_Defaults.WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX : import_Defaults.WA_ADV_ACCOUNT_SIG_PREFIX;
  const accountMsg = Buffer.concat([accountSignaturePrefix, deviceDetails, signedIdentityKey.public]);
  if (!import_crypto2.Curve.verify(accountSignatureKey, accountMsg, accountSignature)) {
    throw new import_boom.Boom("Failed to verify account signature");
  }
  const deviceMsg = Buffer.concat([
    import_Defaults.WA_ADV_DEVICE_SIG_PREFIX,
    deviceDetails,
    signedIdentityKey.public,
    accountSignatureKey
  ]);
  account.deviceSignature = import_crypto2.Curve.sign(signedIdentityKey.private, deviceMsg);
  const identity = (0, import_signal.createSignalIdentity)(lid, accountSignatureKey);
  const accountEnc = encodeSignedDeviceIdentity(account, false);
  const reply = {
    tag: "iq",
    attrs: {
      to: import_WABinary.S_WHATSAPP_NET,
      type: "result",
      id: msgId
    },
    content: [
      {
        tag: "pair-device-sign",
        attrs: {},
        content: [
          {
            tag: "device-identity",
            attrs: { "key-index": deviceIdentity.keyIndex.toString() },
            content: accountEnc
          }
        ]
      }
    ]
  };
  const authUpdate = {
    account,
    me: { id: jid, name: bizName, lid },
    signalIdentities: [...signalIdentities || [], identity],
    platform: platformNode?.attrs.name
  };
  return {
    creds: authUpdate,
    reply
  };
};
const encodeSignedDeviceIdentity = (account, includeSignatureKey) => {
  account = { ...account };
  if (!includeSignatureKey || !account.accountSignatureKey?.length) {
    account.accountSignatureKey = null;
  }
  return import_WAProto.proto.ADVSignedDeviceIdentity.encode(account).finish();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  configureSuccessfulPairing,
  encodeSignedDeviceIdentity,
  generateLoginNode,
  generateRegistrationNode
});
